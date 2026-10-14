import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
  const { error } = await supabase.auth.signUp({
    email: 'admin@example.com',
    password: 'REPLACE_WITH_A_UNIQUE_DEMO_PASSWORD',
    options: {
      data: {
        display_name: 'Demo Admin',
        username: 'demo_admin'
      }
    }
  })

  if (error) {
    if (error.message.includes('User already registered')) {
      console.log('✅ Admin account already exists.')
    } else {
      console.error('❌ Error creating admin:', error.message)
    }
  } else {
    console.log('✅ Admin account created successfully!')
  }
}

createAdmin()

