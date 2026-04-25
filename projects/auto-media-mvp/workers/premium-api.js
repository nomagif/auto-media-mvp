const PRODUCTS = {
  'weekly-json-snapshot': {
    title: 'Weekly JSON Snapshot',
    gumroadProductIdEnv: 'GUMROAD_PRODUCT_ID_WEEKLY_JSON',
    gumroadLegacyPermalinkEnv: 'GUMROAD_PRODUCT_WEEKLY_JSON',
    files: {
      'premium/weekly/latest.json': {
        label: 'Latest weekly JSON snapshot',
        filename: 'ai-macro-observatory-weekly-json-snapshot.json',
        contentType: 'application/json; charset=utf-8'
      }
    }
  },
  'weekly-csv-pack': {
    title: 'Weekly CSV Pack',
    gumroadProductIdEnv: 'GUMROAD_PRODUCT_ID_WEEKLY_CSV',
    gumroadLegacyPermalinkEnv: 'GUMROAD_PRODUCT_WEEKLY_CSV',
    files: {
      'premium/weekly/latest-topics.csv': {
        label: 'Topics CSV',
        filename: 'ai-macro-observatory-topics.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-companies.csv': {
        label: 'Companies CSV',
        filename: 'ai-macro-observatory-companies.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-regions.csv': {
        label: 'Regions CSV',
        filename: 'ai-macro-observatory-regions.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-categories.csv': {
        label: 'Categories CSV',
        filename: 'ai-macro-observatory-categories.csv',
        contentType: 'text/csv; charset=utf-8'
      },
      'premium/weekly/latest-csv-pack-metadata.json': {
        label: 'CSV metadata',
        filename: 'ai-macro-observatory-weekly-csv-pack-metadata.json',
        contentType: 'application/json; charset=utf-8'
      }
    }
  }
};

function json(body, status = 200, origin = '*') {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status,
    headers: corsHeaders(origin, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    })
  });
}

function corsHeaders(origin, headers = {}) {
  return {
    ...headers,
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
}

function resolveAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || '').trim();
  if (!allowed) return '*';
  if (requestOrigin && requestOrigin === allowed) return requestOrigin;
  return allowed;
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

async function signDownload(secret, product, fileKey, expires) {
  return hmacHex(secret, `${product}:${fileKey}:${expires}`);
}

async function verifyGumroadLicense(env, product, licenseKey, email) {
  const productId = String(env[product.gumroadProductIdEnv] || '').trim();
  const legacyPermalink = String(env[product.gumroadLegacyPermalinkEnv] || '').trim();
  if (!productId && !legacyPermalink) {
    throw new Error(`Missing Worker secret: ${product.gumroadProductIdEnv} (preferred) or ${product.gumroadLegacyPermalinkEnv} (legacy)`);
  }

  const params = new URLSearchParams();
  if (productId) {
    params.set('product_id', productId);
  } else {
    params.set('product_permalink', legacyPermalink);
  }
  params.set('license_key', licenseKey);
  params.set('increment_uses_count', 'false');
  if (email) params.set('email', email);

  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: params.toString()
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success || !payload.purchase) {
    return { ok: false, reason: payload.message || 'license verification failed' };
  }

  const purchaseEmail = String(payload.purchase.email || '').trim().toLowerCase();
  if (email && purchaseEmail && purchaseEmail !== String(email).trim().toLowerCase()) {
    return { ok: false, reason: 'email does not match Gumroad purchase' };
  }

  return {
    ok: true,
    purchase: {
      email: payload.purchase.email || null,
      sale_id: payload.purchase.sale_id || null,
      created_at: payload.purchase.created_at || null
    }
  };
}

async function handleAuth(request, env) {
  const origin = resolveAllowedOrigin(request, env);
  const { product: productSlug, license_key: licenseKey, email } = await request.json();
  const product = PRODUCTS[productSlug];
  if (!product) return json({ ok: false, error: 'unknown product' }, 400, origin);
  if (!licenseKey) return json({ ok: false, error: 'license_key is required' }, 400, origin);
  if (!env.DOWNLOAD_SIGNING_SECRET) return json({ ok: false, error: 'DOWNLOAD_SIGNING_SECRET is not configured' }, 503, origin);

  const verification = await verifyGumroadLicense(env, product, licenseKey, email);
  if (!verification.ok) return json({ ok: false, error: verification.reason }, 403, origin);

  const expires = Math.floor(Date.now() / 1000) + 60 * 15;
  const baseUrl = String(env.PUBLIC_API_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
  const downloads = await Promise.all(Object.entries(product.files).map(async ([fileKey, file]) => {
    const sig = await signDownload(env.DOWNLOAD_SIGNING_SECRET, productSlug, fileKey, expires);
    const url = new URL('/api/premium/download', `${baseUrl}/`);
    url.searchParams.set('product', productSlug);
    url.searchParams.set('file', fileKey);
    url.searchParams.set('expires', String(expires));
    url.searchParams.set('sig', sig);
    url.searchParams.set('filename', file.filename);
    return { label: file.label, filename: file.filename, url: url.toString() };
  }));

  return json({
    ok: true,
    product: { slug: productSlug, title: product.title },
    purchase: verification.purchase,
    expires_at: new Date(expires * 1000).toISOString(),
    downloads
  }, 200, origin);
}

async function handleDownload(request, env) {
  const origin = resolveAllowedOrigin(request, env);
  if (!env.DOWNLOAD_SIGNING_SECRET) return json({ ok: false, error: 'DOWNLOAD_SIGNING_SECRET is not configured' }, 503, origin);
  if (!env.PREMIUM_BUCKET) return json({ ok: false, error: 'PREMIUM_BUCKET binding is not configured' }, 503, origin);

  const url = new URL(request.url);
  const product = url.searchParams.get('product') || '';
  const fileKey = url.searchParams.get('file') || '';
  const sig = url.searchParams.get('sig') || '';
  const filenameOverride = url.searchParams.get('filename') || '';
  const expires = Number(url.searchParams.get('expires') || '0');

  const productConfig = PRODUCTS[product];
  const fileConfig = productConfig?.files?.[fileKey];
  if (!productConfig || !fileConfig) return json({ ok: false, error: 'unknown product file' }, 400, origin);
  if (!expires || Number.isNaN(expires) || expires < Math.floor(Date.now() / 1000)) {
    return json({ ok: false, error: 'download link expired' }, 403, origin);
  }

  const expected = await signDownload(env.DOWNLOAD_SIGNING_SECRET, product, fileKey, expires);
  if (expected !== sig) return json({ ok: false, error: 'invalid signature' }, 403, origin);

  const object = await env.PREMIUM_BUCKET.get(fileKey);
  if (!object) return json({ ok: false, error: 'file not found in premium bucket' }, 404, origin);

  const headers = new Headers(corsHeaders(origin));
  object.writeHttpMetadata?.(headers);
  headers.set('etag', object.httpEtag || '');
  headers.set('cache-control', 'private, max-age=60');
  headers.set('content-type', headers.get('content-type') || fileConfig.contentType);
  headers.set('content-disposition', `attachment; filename="${filenameOverride || fileConfig.filename}"`);

  return new Response(object.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = resolveAllowedOrigin(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (url.pathname === '/api/premium/auth' && request.method === 'POST') {
        return await handleAuth(request, env);
      }
      if (url.pathname === '/api/premium/download' && request.method === 'GET') {
        return await handleDownload(request, env);
      }
      return json({ ok: false, error: 'not found' }, 404, origin);
    } catch (error) {
      return json({ ok: false, error: error.message || String(error) }, 500, origin);
    }
  }
};
