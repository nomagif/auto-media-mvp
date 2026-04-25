const PRODUCTS = {
  'weekly-json-snapshot': {
    files: {
      'premium/weekly/latest.json': {
        filename: 'ai-macro-observatory-weekly-json-snapshot.json',
        contentType: 'application/json; charset=utf-8'
      }
    }
  },
  'weekly-csv-pack': {
    files: {
      'premium/weekly/latest-topics.csv': {
        filename: 'ai-macro-observatory-topics.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-companies.csv': {
        filename: 'ai-macro-observatory-companies.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-regions.csv': {
        filename: 'ai-macro-observatory-regions.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-categories.csv': {
        filename: 'ai-macro-observatory-categories.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-csv-pack-metadata.json': {
        filename: 'ai-macro-observatory-weekly-csv-pack-metadata.json',
        contentType: 'application/json; charset=utf-8'
      }
    }
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function isValidSignature(secret, product, fileKey, expires, sig) {
  const expected = await hmacHex(secret, `${product}:${fileKey}:${expires}`);
  return expected === sig;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    if (!env.DOWNLOAD_SIGNING_SECRET) return json({ ok: false, error: 'DOWNLOAD_SIGNING_SECRET is not configured' }, 503);
    if (!env.PREMIUM_BUCKET) return json({ ok: false, error: 'PREMIUM_BUCKET binding is not configured' }, 503);

    const url = new URL(request.url);
    const product = url.searchParams.get('product') || '';
    const fileKey = url.searchParams.get('file') || '';
    const sig = url.searchParams.get('sig') || '';
    const filenameOverride = url.searchParams.get('filename') || '';
    const expires = Number(url.searchParams.get('expires') || '0');

    const productConfig = PRODUCTS[product];
    const fileConfig = productConfig?.files?.[fileKey];
    if (!productConfig || !fileConfig) return json({ ok: false, error: 'unknown product file' }, 400);
    if (!expires || Number.isNaN(expires) || expires < Math.floor(Date.now() / 1000)) {
      return json({ ok: false, error: 'download link expired' }, 403);
    }

    const valid = await isValidSignature(env.DOWNLOAD_SIGNING_SECRET, product, fileKey, expires, sig);
    if (!valid) return json({ ok: false, error: 'invalid signature' }, 403);

    const object = await env.PREMIUM_BUCKET.get(fileKey);
    if (!object) return json({ ok: false, error: 'file not found in premium bucket' }, 404);

    const headers = new Headers();
    object.writeHttpMetadata?.(headers);
    headers.set('etag', object.httpEtag || '');
    headers.set('cache-control', 'private, max-age=60');
    headers.set('content-type', headers.get('content-type') || fileConfig.contentType);
    headers.set('content-disposition', `attachment; filename="${filenameOverride || fileConfig.filename}"`);

    return new Response(object.body, {
      status: 200,
      headers
    });
  } catch (error) {
    return json({ ok: false, error: error.message || String(error) }, 500);
  }
}
