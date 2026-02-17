import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import readline from 'readline'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string) {
  return new Promise<string>(resolve => rl.question(query, resolve))
}

async function register() {
  const email = await question('Email: ')
  const password = await question('Password: ')
  
const { data, error } = await supabase
  .from('users')
  .insert([{ email, password, role: 'klant' }])
  .select() // ← deze regel toevoegen

  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('User registered:', data)
  }
}

async function login() {
  const email = await question('Email: ')
  const password = await question('Password: ')
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password', password)

  if (error) {
    console.log('Error:', error.message)
  } else if (data && data.length > 0) {
    console.log('Login successful! Welcome', email)
  } else {
    console.log('Login failed: wrong email or password')
  }
}

async function main() {
  const choice = await question('Type "r" to register, "l" to login: ')
  if (choice.toLowerCase() === 'r') {
    await register()
  } else if (choice.toLowerCase() === 'l') {
    await login()
  } else {
    console.log('Invalid choice')
  }
  rl.close()
}

main()

