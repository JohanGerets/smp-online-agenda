import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// laad de .env.local variabelen
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.from('users').select('*')
  console.log('Supabase test:', { data, error })
}

test()

