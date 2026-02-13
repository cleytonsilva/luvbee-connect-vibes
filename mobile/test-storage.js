
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testBucket() {
    console.log('Testing connection to Supabase...');

    // 1. List buckets to see if it exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
    } else {
        console.log('Buckets found:', buckets.map(b => b.name));
        const exists = buckets.find(b => b.name === 'verification-documents');
        console.log('verification-documents exists?', !!exists);
    }

    // 2. Try to upload a dummy file
    const { data, error } = await supabase.storage
        .from('verification-documents')
        .upload('test_check.txt', 'test content', {
            upsert: true
        });

    if (error) {
        console.error('Upload failed:', error);
    } else {
        console.log('Upload successful:', data);
    }
}

testBucket();
