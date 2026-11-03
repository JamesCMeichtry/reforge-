import { supabase } from './supabase.js'
import { me } from './me.js'

// Demo clients for testers: 4 made-up people with weeks of training, check-ins and rehab.
// They're added to (and removed from) the signed-in professional's client list by the database.

export const DEMO_CLIENTS = [
  {
    id: 'strength',
    name: 'Tom Reid',
    age: 24,
    tag: 'Strength',
    about: 'Fit, no injuries. Squats, benches and deadlifts 4 days a week and climbing steadily.',
    tryThis: 'His strength charts and monthly report, the 2 solo sessions waiting for your review, and his targets.',
  },
  {
    id: 'hyrox',
    name: 'Maya Shah',
    age: 22,
    tag: 'Hyrox',
    about: 'Runs, sleds and wall balls, with a niggly right shoulder and left wrist.',
    tryThis: 'Her new message, the shoulder and wrist rehab stages, and how her check-ins colour the body map.',
  },
  {
    id: 'older',
    name: 'Margaret Ellis',
    age: 67,
    tag: 'Strong and steady',
    about: 'Keeping strong for everyday life, with a weak lower back and a sore right hip.',
    tryThis: 'The warning sign she reported 2 days ago in Needs you, then update her rehab stage and guidance.',
  },
  {
    id: 'acl',
    name: 'Dan Okafor',
    age: 35,
    tag: 'ACL reconstruction',
    about: '5 months after surgery on his left knee. Back in the gym, not running yet.',
    tryThis: 'His change request, the knee check-ins with one flare-up, his hop-test target, and a live session.',
  },
]

// Your demo clients, if you have any. Empty if the demo setup hasn't been added to the database.
export async function fetchDemoClients() {
  const { data, error } = await supabase.from('demo_clients').select('client_id, persona').eq('pro_id', me())
  if (error) return null
  return data
}

export async function addDemoClients() {
  const { data, error } = await supabase.rpc('add_demo_clients')
  if (error) throw error
  return data
}

export async function removeDemoClients() {
  const { data, error } = await supabase.rpc('remove_demo_clients')
  if (error) throw error
  return data
}
