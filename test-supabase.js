const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('\n=== Testing Supabase Connection ===\n');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!');
    console.log('Make sure .env.local has:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }
  
  console.log('✅ Environment variables found');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 API Key: ${supabaseKey.substring(0, 20)}...`);
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Check profiles table
    console.log('\n📋 Test 1: Checking profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profileError) {
      console.error('❌ Profiles table error:', profileError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }
    
    // Test 2: Check attendance table
    console.log('\n📋 Test 2: Checking attendance table...');
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('count')
      .limit(1);
    
    if (attendanceError) {
      console.error('❌ Attendance table error:', attendanceError.message);
    } else {
      console.log('✅ Attendance table accessible');
    }
    
    // Test 3: Check work_locations table
    console.log('\n📋 Test 3: Checking work_locations table...');
    const { data: locations, error: locationsError } = await supabase
      .from('work_locations')
      .select('count')
      .limit(1);
    
    if (locationsError) {
      console.error('❌ Work locations table error:', locationsError.message);
    } else {
      console.log('✅ Work locations table accessible');
    }
    
    // Test 4: Check if admin user exists
    console.log('\n👤 Test 4: Checking for admin users...');
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .eq('role', 'admin');
    
    if (adminError) {
      console.error('❌ Admin query error:', adminError.message);
    } else if (admins && admins.length > 0) {
      console.log(`✅ Found ${admins.length} admin user(s):`);
      admins.forEach(admin => {
        console.log(`   - ${admin.full_name} (${admin.email})`);
      });
    } else {
      console.log('⚠️  No admin users found. You need to create one!');
      console.log('   Run: node create-admin.js');
    }
    
    console.log('\n🎉 Supabase connection test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
  }
}

testSupabaseConnection();
