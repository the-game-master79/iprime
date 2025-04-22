const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_TRADERMADE_API_KEY'
];

function checkEnvVars() {
  const missing = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('Error: Missing required environment variables:');
    console.error(missing.join(', '));
    process.exit(1);
  }

  console.log('✓ All required environment variables are present');
}

checkEnvVars();
