import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = './.env.local';
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found at project root; looking in parent folder.');
}
const raw = fs.readFileSync(envPath, 'utf8');
const vars = Object.fromEntries(
  raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx), l.slice(idx + 1)];
    })
);

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = 'documents';

(async () => {
  try {
    console.log(`Ensuring bucket "${BUCKET}" exists...`);
    const { data, error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error && error.status !== 409) {
      console.error('Could not create bucket:', error);
      process.exit(1);
    }

    if (error && error.status === 409) {
      console.log('Bucket already exists (status 409).');
    } else {
      console.log('Bucket created:', data);
    }

    // Try to get bucket metadata as verification
    try {
      const { data: meta, error: metaErr } = await supabase.storage.getBucket(BUCKET);
      if (metaErr) {
        console.warn('Could not fetch bucket metadata:', metaErr);
      } else {
        console.log('Bucket metadata:', meta);
      }
    } catch (e) {
      console.log('Skipped metadata fetch:', e.message || e);
    }

    console.log('Done.');
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
