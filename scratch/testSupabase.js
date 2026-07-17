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

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles in Supabase:');
    profiles.forEach(p => {
      console.log(`- ID: ${p.id}, Name: ${p.name}, Email: ${p.email}, Designation: ${p.designation}`);
    });
  }
}

run();
