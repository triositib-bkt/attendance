require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRoles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('employee_id, email, role, full_name')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('\n=== Users in Database ===\n')
    data.forEach(user => {
      console.log(`Employee ID: ${user.employee_id}`)
      console.log(`Email: ${user.email}`)
      console.log(`Name: ${user.full_name}`)
      console.log(`Role: ${user.role}`)
      console.log('---')
    })
  }
}

checkRoles()
