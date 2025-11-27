
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('--- Starting Debug Script ---');

// Manually load env vars from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');

    envConfig.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
} else {
    console.error('File not found at:', envPath);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing configuration. Exiting.');
    process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function debugShare() {
    console.log('\n--- Listing All Shares ---');
    const { data: shares, error: listError } = await adminSupabase
        .from('folder_shares')
        .select('share_id, folder_id, created_at');

    if (listError) {
        console.error('Error listing shares:', listError);
        return;
    }

    if (!shares || shares.length === 0) {
        console.log('No shares found.');
    } else {
        console.log(`Found ${shares.length} shares:`);
        shares.forEach(s => {
            console.log(`- ID: ${s.share_id} (Folder: ${s.folder_id})`);
            console.log(`  URL: http://localhost:3000/shared/${s.share_id}`);
        });
    }
}

debugShare().catch(console.error);
