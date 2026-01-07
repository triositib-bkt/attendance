const bcrypt = require('bcryptjs');

async function createAdmin() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n=== Admin User Creation ===\n');
  console.log('Run this SQL in Supabase:');
  console.log('\n```sql');
  console.log(`INSERT INTO profiles (
  id,
  email,
  password_hash,
  full_name,
  role,
  employee_id,
  department,
  position,
  is_active
) VALUES (
  gen_random_uuid(),
  'admin@company.com',
  '${hash}',
  'System Administrator',
  'admin',
  'ADMIN001',
  'IT',
  'System Admin',
  true
);`);
  console.log('```\n');
  console.log('Login with:');
  console.log('Email: admin@company.com');
  console.log('Password: admin123');
  console.log('\n========================\n');
}

createAdmin();
