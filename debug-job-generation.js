// Debug script to check job template day_of_week values and test generation
// Run with: node debug-job-generation.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

async function debugJobTemplates() {
  console.log('\n📋 Checking Job Templates with Weekly Frequency\n')
  console.log('=' .repeat(80))
  
  const { data: templates, error } = await supabase
    .from('job_templates')
    .select(`
      id,
      title,
      frequency,
      day_of_week,
      day_of_month,
      is_active,
      office_area:office_areas (
        name,
        location:work_locations (
          name
        )
      )
    `)
    .eq('frequency', 'weekly')
    .order('day_of_week')

  if (error) {
    console.error('❌ Error fetching templates:', error)
    return
  }

  if (!templates || templates.length === 0) {
    console.log('⚠️  No weekly job templates found')
    return
  }

  console.log(`Found ${templates.length} weekly job template(s):\n`)
  
  templates.forEach(template => {
    const dayNum = template.day_of_week
    const dayName = dayNum !== null ? dayNames[dayNum] : 'UNKNOWN'
    const status = template.is_active ? '✅ Active' : '❌ Inactive'
    const location = template.office_area?.location?.name || 'N/A'
    const area = template.office_area?.name || 'N/A'
    
    console.log(`${status} | ${template.title}`)
    console.log(`   Location: ${location} → ${area}`)
    console.log(`   Scheduled: ${dayName} (day_of_week = ${dayNum})`)
    console.log(`   Template ID: ${template.id}`)
    console.log('')
  })
  
  console.log('=' .repeat(80))
}

async function testGeneration(testDate) {
  console.log(`\n🧪 Testing Generation for: ${testDate}\n`)
  console.log('=' .repeat(80))
  
  const date = new Date(testDate)
  const dayOfWeek = date.getDay() // JavaScript getDay(): 0=Sunday, 6=Saturday
  const dayName = dayNames[dayOfWeek]
  
  console.log(`Date: ${testDate}`)
  console.log(`Day of Week: ${dayName} (${dayOfWeek})`)
  console.log('')
  
  // Find templates that should match
  const { data: matchingTemplates, error } = await supabase
    .from('job_templates')
    .select(`
      id,
      title,
      frequency,
      day_of_week,
      is_active,
      office_area:office_areas (
        name,
        location:work_locations (name)
      )
    `)
    .eq('frequency', 'weekly')
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`Templates that should be generated for ${dayName}:`)
  if (matchingTemplates && matchingTemplates.length > 0) {
    matchingTemplates.forEach(t => {
      console.log(`   ✓ ${t.title} (${t.office_area?.location?.name} → ${t.office_area?.name})`)
    })
  } else {
    console.log('   (none)')
  }
  
  console.log('\n' + '='.repeat(80))
}

async function main() {
  console.log('\n🔍 Job Generation Debug Tool')
  console.log('Day of Week Mapping: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday\n')
  
  await debugJobTemplates()
  
  // Test specific dates
  const today = new Date().toISOString().split('T')[0]
  await testGeneration(today)
  
  // Test Friday specifically (since user mentioned Friday issue)
  const nextFriday = getNextDayOfWeek(5) // 5 = Friday
  console.log(`\n📅 Testing specifically for next Friday: ${nextFriday}`)
  await testGeneration(nextFriday)
  
  const nextThursday = getNextDayOfWeek(4) // 4 = Thursday
  console.log(`\n📅 Testing specifically for next Thursday: ${nextThursday}`)
  await testGeneration(nextThursday)
}

function getNextDayOfWeek(targetDay) {
  const today = new Date()
  const currentDay = today.getDay()
  let daysToAdd = targetDay - currentDay
  
  if (daysToAdd <= 0) {
    daysToAdd += 7
  }
  
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + daysToAdd)
  return targetDate.toISOString().split('T')[0]
}

main().catch(console.error)
