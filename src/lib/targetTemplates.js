import { supabase } from './supabase.js'
import { INJURIES } from '../data/injuries.js'

// Ready-made return-to-sport targets a physio or PT can start from, grouped like the injury list.
// They're common milestones, not medical advice: the professional edits each one to suit their client.
// Later, AI suggestions will pick from this list rather than inventing clinical criteria.

export const TARGET_TEMPLATES = {
  Knee: [
    ['Full knee straightening', 'Straightens as fully as the other knee, pain 2/10 or less.', 4],
    [
      'Single-leg squat to a box',
      '5 controlled reps each leg to a knee-height box, knee in line with the foot, pain 2/10 or less.',
      6,
    ],
    ['Kneel for 2 minutes', 'On a cushioned mat, pain 2/10 or less during and the next morning.', 6],
    [
      'Quad strength at 80%',
      'Operated or injured leg at least 80% of the good leg on a single-leg press or leg extension.',
      8,
    ],
    [
      'Back to running',
      '10 minutes of easy continuous jogging, no swelling and pain 2/10 or less the next morning.',
      8,
    ],
    [
      'Hop test at 90%',
      'Single-leg hop for distance at least 90% of the good leg, best of three, controlled landings.',
      12,
    ],
    ['Quad strength at 90%', 'At least 90% of the good leg on the same test as before.', 16],
  ],
  Hamstring: [
    ['Full stretch, pain-free', 'Straight-leg raise within 10% of the other side, no pulling pain.', 2],
    ['Single-leg bridge × 20', '20 controlled reps each side, no cramping or pain.', 3],
    ['Running at 80% pace', '6 × 60 m at 80% effort, pain-free, no tightness the next day.', 4],
    ['Nordic curls 3 × 5', 'Controlled lowering on all reps, pain 2/10 or less.', 6],
    ['Full-speed sprints', '3 × 30 m flat out with no pain or apprehension.', 8],
  ],
  'Ankle and foot': [
    ['Single-leg balance 30 s', 'Matches the other side, eyes open, no wobble-outs.', 3],
    ['25 single-leg calf raises', 'Each side, full height, pain 2/10 or less.', 6],
    ['Hop on the spot × 20', 'Single leg, pain-free and steady.', 6],
    ['Back to running', '15 minutes easy, no swelling the next morning.', 6],
    ['Change of direction', 'Figure-of-eight and side-step runs at full speed with no pain or giving way.', 8],
  ],
  'Hip and groin': [
    ['Squeeze test pain-free', 'Squeezing a ball between the knees, pain 2/10 or less.', 3],
    ['Copenhagen side plank', '30 seconds each side, pain 2/10 or less.', 6],
    ['Change of direction', 'Cutting and side-steps at full speed, pain-free.', 8],
    ['Back to kicking', 'Full-power kicks pain-free (if the sport needs it).', 10],
  ],
  Back: [
    ['Walk 30 minutes', 'Continuous, pain 3/10 or less.', 2],
    ['Sit for 45 minutes', 'Without needing to get up because of pain.', 4],
    ['Plank 60 s, side plank 30 s', 'Each side, good position, pain 2/10 or less.', 6],
    ['Romanian deadlift 3 × 8', 'Good hinge form with a weight you choose, pain 2/10 or less the next morning.', 6],
    ['Lift a box floor to waist', 'A realistic weight for work or daily life, 10 times, with good form.', 8],
  ],
  Shoulder: [
    ['Full overhead reach', 'Matches the other side, pain 2/10 or less.', 4],
    ['Sleep on that side', 'A full night without being woken by pain.', 6],
    ['Rotation strength at 90%', 'Band external rotation within 10% of the other side.', 8],
    ['10 controlled press-ups', 'Full range, pain 2/10 or less.', 8],
    ['Overhead pressing', '3 × 10 with a weight you choose, pain 2/10 or less the next morning.', 10],
  ],
  Arm: [
    ['Full elbow straightening', 'Matches the other arm, pain-free.', 4],
    ['Grip strength at 90%', 'Within 10% of the other hand.', 6],
    ['Back to pulling', 'Rows or pull-ups 3 × 8, pain 2/10 or less.', 8],
  ],
  'Any injury': [
    ['A full session, pain in check', 'Complete a full planned session with pain 3/10 or less.', 4],
    ['Next mornings settled', 'Next-morning pain 2/10 or less for 2 weeks in a row.', 4],
    ['3 sessions a week for 4 weeks', 'Consistent training, no flare-ups that stop a session.', 4],
    ['Back to full training', 'Training or playing without changes for the injury.', 12],
  ],
}

// Which template groups match the injuries on a client's body map, e.g. ['Knee']
export async function fetchInjuryGroups(clientId) {
  const { data, error } = await supabase.from('injuries').select('injury_key').eq('user_id', clientId)
  if (error) throw error
  const groups = data.map((row) => INJURIES.find((injury) => injury.id === row.injury_key)?.group).filter(Boolean)
  return [...new Set(groups)].filter((group) => TARGET_TEMPLATES[group])
}
