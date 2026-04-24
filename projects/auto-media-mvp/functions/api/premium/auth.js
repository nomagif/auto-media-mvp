const PRODUCTS = {
  'weekly-json-snapshot': {
    title: 'Weekly JSON Snapshot',
    gumroadEnv: 'GUMROAD_PRODUCT_WEEKLY_JSON',
    files: [
      {
        key: 'premium/weekly/latest.json',
        label: 'Latest weekly JSON snapshot',
        filename: 'ai-macro-observatory-weekly-json-snapshot.json'
      }
    ]
  },
  'weekly-csv-pack': {
    title: 'Weekly CSV Pack',
    gumroadEnv: 'GUMROAD_PRODUCT_WEEKLY_CSV',
    files: [
      {
        key: 'premium/weekly/latest-topics.csv',
        label: 'Topics CSV',
        filename: 'ai-macro-observatory-topics.csv'
      },
      {
        key: 'premium/weekly/latest-companies.csv',
        label: 'Companies CSV',
        filename: 'ai-macro-observatory-companies.csv'
      },
      {
        key: 'premium/weekly/latest-regions.csv',
        label: 'Regions CSV',
        filename: 'ai-macro-observatory-regions.csv'
      },
      {
        key: 'premium/weekly/latest-categories.csv',
        label: 'Categories CSV',
        filename: 'ai-macro-observatory-categories.csv'
      },
      {
        key: 'premium/weekly/latest-csv-pack-metadata.json',
        label: 'CSV metadata',
        filename: 'ai-macro-observatory-weekly-csv-pack-metadata.json'
      }
    ]
  },
  '30-day-archive-pack': {
    title: '30-Day Archive Pack',
    gumroadEnv: 'GUMROAD_PRODUCT_30_DAY_ARCHIVE',
    files: [
      {
        key: 'premium/archive/30-day/latest-manifest.json',
        label: '30-day archive manifest',
        filename: 'ai-macro-observatory-30-day-archive-manifest.json'
      }
    ]
  },
  'full-ranking-dataset-pack': {
    title: 'Full Ranking Dataset Pack',
    gumroadEnv: 'GUMROAD_PRODUCT_FULL_DATASET',
    files: [
      {
        key: 'premium/full-dataset/latest.json',
        label: 'Full ranking dataset',
        filename: 'ai-macro-observatory-full-ranking-dataset.json'
      },
      {
        key: 'premium/full-dataset/latest-manifest.json',
        label: 'Dataset manifest',
        filename: 'ai-macro-observatory-full-ranking-dataset-manifest.json'
      }
    ]
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

async function signDownload({ secret, product, fileKey, expires }) {
  return hmacHex(secret, `${product}:${fileKey}:${expires}`);
}

async function verifyGumroadLicense({ env, product, licenseKey, email }) {
  const productPermalink = env[product.gumroadEnv];
  if (!productPermalink) {
    throw new Error(`Missing Cloudflare secret/binding: ${product.gumroadEnv}`);
  }

  const params = new URLSearchParams();
  params.set('product_permalink', productPermalink);
  params.set('license_key', licenseKey);
  params.set('increment_uses_count', 'false');
  if (email) params.set('email', email);

  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
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

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { product: productSlug, license_key: licenseKey, email } = await request.json();
    const product = PRODUCTS[productSlug];

    if (!product) return json({ ok: false, error: 'unknown product' }, 400);
    if (!licenseKey) return json({ ok: false, error: 'license_key is required' }, 400);
    if (!env.DOWNLOAD_SIGNING_SECRET) return json({ ok: false, error: 'DOWNLOAD_SIGNING_SECRET is not configured' }, 503);

    const verification = await verifyGumroadLicense({
      env,
      product,
      licenseKey,
      email
    });

    if (!verification.ok) {
      return json({ ok: false, error: verification.reason }, 403);
    }

    const expires = Math.floor(Date.now() / 1000) + (60 * 15);
    const baseUrl = new URL(request.url).origin;
    const downloads = await Promise.all(product.files.map(async (file) => {
      const sig = await signDownload({
        secret: env.DOWNLOAD_SIGNING_SECRET,
        product: productSlug,
        fileKey: file.key,
        expires
      });
      const url = new URL('/api/premium/download', baseUrl);
      url.searchParams.set('product', productSlug);
      url.searchParams.set('file', file.key);
      url.searchParams.set('expires', String(expires));
      url.searchParams.set('sig', sig);
      url.searchParams.set('filename', file.filename);
      return {
        label: file.label,
        filename: file.filename,
        url: url.toString()
      };
    }));

    return json({
      ok: true,
      product: {
        slug: productSlug,
        title: product.title
      },
      purchase: verification.purchase,
      expires_at: new Date(expires * 1000).toISOString(),
      downloads
    });
  } catch (error) {
    return json({ ok: false, error: error.message || String(error) }, 500);
  }
}
