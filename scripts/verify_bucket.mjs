import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = './.env.local';
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

(async () => {
  console.log('Checking for "documents" bucket...');
  
  // List all buckets
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    process.exit(1);
  }
  
  console.log('\nAll buckets:');
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (public: ${bucket.public})`);
  });
  
  const documentsBucket = buckets.find(b => b.name === 'documents');
  
  if (documentsBucket) {
    console.log('\n✅ "documents" bucket exists!');
    console.log('   Public:', documentsBucket.public);
    console.log('   ID:', documentsBucket.id);
  } else {
    console.log('\n❌ "documents" bucket NOT FOUND');
  }
})();
