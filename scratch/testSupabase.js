const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  'profiles',
  'departments',
  'teams',
  'projects',
  'tasks',
  'chat_rooms',
  'messages',
  'meeting_rooms',
  'attendance',
  'leave_requests',
  'documents',
  'announcements',
  'audit_logs',
  'activity_logs'
];

async function run() {
  console.log('Testing individual Supabase table queries:');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`❌ Table "${table}" failed:`, error.message);
    } else {
      console.log(`✅ Table "${table}" succeeded, row count: ${data ? data.length : 0}`);
    }
  }
}

run();
