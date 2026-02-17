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

async function login() {
  const email = await question('Email: ')
  const password = await question('Password: ')

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password', password)

  if (!users || users.length === 0) {
    console.log('Login failed: wrong email or password')
    return null
  }

  console.log('Login successful!', email)
  return users[0]
}

async function bookSession(user: any) {
  const { data: coaches } = await supabase.from('coaches').select('*')
  console.log('\nSelect a coach:')
  coaches?.forEach((c, i) => console.log(`${i + 1}: ${c.name}`))
  const coachChoice = parseInt(await question('Choice number: ')) - 1
  const coach = coaches![coachChoice]

  const { data: trainings } = await supabase
    .from('trainings_options')
    .select('*')
    .order('sort_order', { ascending: true })

  console.log('\nSelect a training:')
  trainings?.forEach((t, i) => console.log(`${i + 1}: ${t.name}`))
  const trainingChoice = parseInt(await question('Choice number: ')) - 1
  const training = trainings![trainingChoice]

  const reservedAt = await question('Enter date & time (YYYY-MM-DD HH:MM): ')

  const { data, error } = await supabase.from('reservations').insert([
    {
      user_id: user.id,
      coach_id: coach.id,
      training_id: training.id,
      reserved_at: reservedAt
    }
  ]).select()

  if (error) {
    console.log('Error booking session:', error.message)
  } else {
    console.log('Session booked successfully!', data)
  }
}

async function main() {
  const user = await login()
  if (user) await bookSession(user)
  rl.close()
}

main()

