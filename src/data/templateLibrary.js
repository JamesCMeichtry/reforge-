// Ready-made programmes from Reforge. A professional can give one to a client as it is, or copy it into their own
// templates and change it. Weights are left for the professional to set, since they depend on the client.

const kg = (value = 0) => ({ kind: 'kg', value })
const band = (value = 'Light') => ({ kind: 'band', value })
const bw = { kind: 'bodyweight' }

let count = 0
const ex = (section, name, sets, reps, load, extra = {}) => ({
  id: `rf-${++count}`,
  section,
  name,
  sets,
  reps,
  load,
  ...extra,
})
const day = (id, name, focus, exercises) => ({ id, name, focus, exercises })

const fullBody = {
  id: 'rf-full-body',
  name: 'Full body foundations',
  description:
    'Three full-body days for someone new to training or coming back after time off. Simple lifts, room to learn technique.',
  days: [
    day('rf-fb-a', 'Day A', 'Squat, push and pull', [
      ex('Warm-up', 'Bike', 1, '5 min', bw),
      ex('Warm-up', '90/90 hip switch', 1, '8 each side', bw),
      ex('Main', 'Goblet squat', 3, '10', kg(), { rest: 90, note: 'Sit between the heels, chest tall.' }),
      ex('Main', 'Dumbbell bench press', 3, '10', kg(), { rest: 90 }),
      ex('Main', 'Seated cable row', 3, '12', kg(), { rest: 75 }),
      ex('Main', 'Glute bridge', 3, '12', bw, { rest: 60 }),
      ex('Main', 'Dead bug', 3, '8 each side', bw, { rest: 45 }),
    ]),
    day('rf-fb-b', 'Day B', 'Hinge, press and carry', [
      ex('Warm-up', 'Rower', 1, '5 min', bw),
      ex('Warm-up', 'Band pull-apart', 2, '15', band()),
      ex('Main', 'Romanian deadlift', 3, '10', kg(), { rest: 90, note: 'Soft knees, push the hips back.' }),
      ex('Main', 'Seated dumbbell press', 3, '10', kg(), { rest: 90 }),
      ex('Main', 'Lat pulldown', 3, '12', kg(), { rest: 75 }),
      ex('Main', 'Step-up', 3, '8 each leg', kg(), { rest: 60 }),
      ex('Main', 'Farmer carry', 3, '30 m', kg(), { rest: 60 }),
    ]),
    day('rf-fb-c', 'Day C', 'Single leg and upper back', [
      ex('Warm-up', 'Bike', 1, '5 min', bw),
      ex('Warm-up', 'Wall slide', 2, '10', bw),
      ex('Main', 'Split squat', 3, '8 each leg', kg(), { rest: 75 }),
      ex('Main', 'Push-up', 3, '8–12', bw, { rest: 75, note: 'Hands on a bench if needed to keep the body straight.' }),
      ex('Main', 'Chest-supported row', 3, '12', kg(), { rest: 75 }),
      ex('Main', 'Hip thrust', 3, '10', kg(), { rest: 75 }),
      ex('Main', 'Side plank', 3, '20 s each side', bw, { rest: 45 }),
    ]),
  ],
}

const upperLower = {
  id: 'rf-upper-lower',
  name: 'Upper / lower strength',
  description: 'Four days for someone with a year or more of training. Heavy main lift first, then accessories.',
  days: [
    day('rf-ul-1', 'Lower A', 'Squat focus', [
      ex('Warm-up', 'Bike', 1, '5 min', bw),
      ex('Warm-up', 'Banded crab walk', 2, '10 each way', band()),
      ex('Main', 'Back squat', 4, '5', kg(), { rest: 180 }),
      ex('Main', 'Romanian deadlift', 3, '8', kg(), { rest: 120 }),
      ex('Main', 'Bulgarian split squat', 3, '8 each leg', kg(), { rest: 90 }),
      ex('Main', 'Seated leg curl', 3, '12', kg(), { rest: 60 }),
      ex('Main', 'Standing calf raise', 3, '12', kg(), { rest: 60 }),
    ]),
    day('rf-ul-2', 'Upper A', 'Horizontal push and pull', [
      ex('Warm-up', 'Band pull-apart', 2, '15', band()),
      ex('Warm-up', 'Band external rotation', 2, '12', band()),
      ex('Main', 'Bench press', 4, '5', kg(), { rest: 180 }),
      ex('Main', 'Barbell row', 4, '8', kg(), { rest: 120 }),
      ex('Main', 'Incline dumbbell press', 3, '10', kg(), { rest: 90 }),
      ex('Main', 'Face pull', 3, '15', kg(), { rest: 60 }),
      ex('Main', 'Biceps curl', 3, '12', kg(), { rest: 60 }),
    ]),
    day('rf-ul-3', 'Lower B', 'Hinge focus', [
      ex('Warm-up', 'Rower', 1, '5 min', bw),
      ex('Warm-up', 'Glute bridge', 2, '12', bw),
      ex('Main', 'Deadlift', 4, '4', kg(), { rest: 180 }),
      ex('Main', 'Front squat', 3, '6', kg(), { rest: 150 }),
      ex('Main', 'Walking lunge', 3, '10 each leg', kg(), { rest: 90 }),
      ex('Main', 'Back extension', 3, '12', bw, { rest: 60 }),
      ex('Main', 'Hanging knee raise', 3, '12', bw, { rest: 60 }),
    ]),
    day('rf-ul-4', 'Upper B', 'Vertical push and pull', [
      ex('Warm-up', 'Wall slide', 2, '10', bw),
      ex('Warm-up', 'Scapular push-up', 2, '10', bw),
      ex('Main', 'Overhead press', 4, '5', kg(), { rest: 180 }),
      ex('Main', 'Pull-up', 4, '6–8', bw, { rest: 120 }),
      ex('Main', 'Dumbbell bench press', 3, '10', kg(), { rest: 90 }),
      ex('Main', 'Single-arm dumbbell row', 3, '10 each arm', kg(), { rest: 75 }),
      ex('Main', 'Lateral raise', 3, '15', kg(), { rest: 60 }),
      ex('Main', 'Triceps pushdown', 3, '12', kg(), { rest: 60 }),
    ]),
  ],
}

const kneeFriendly = {
  id: 'rf-knee-strength',
  name: 'Knee-friendly strength',
  description:
    'Three days for a client cleared to train after a knee injury or surgery. Rehab work every day, depth and load built up gradually.',
  days: [
    day('rf-kn-1', 'Day 1', 'Lower body with knee rehab', [
      ex('Warm-up', 'Bike', 1, '8 min', bw, { note: 'Easy pace to warm the knee up.' }),
      ex('Rehab', 'Terminal knee extension', 3, '15', band(), { rest: 45 }),
      ex('Rehab', 'Spanish squat', 3, '45 s hold', band(), {
        rest: 60,
        note: 'Shins vertical, sit back into the band.',
      }),
      ex('Main', 'Box squat', 3, '8', kg(), { rest: 120, note: 'Box at a depth that stays pain-free.' }),
      ex('Main', 'Romanian deadlift', 3, '8', kg(), { rest: 120 }),
      ex('Main', 'Step-up', 3, '8 each leg', kg(), {
        rest: 75,
        note: 'Start on a low box. Knee tracks over the toes.',
      }),
      ex('Main', 'Single-leg calf raise', 3, '12 each leg', bw, { rest: 45 }),
    ]),
    day('rf-kn-2', 'Day 2', 'Upper body and trunk', [
      ex('Warm-up', 'Band pull-apart', 2, '15', band()),
      ex('Main', 'Dumbbell bench press', 3, '10', kg(), { rest: 90 }),
      ex('Main', 'Chest-supported row', 3, '10', kg(), { rest: 90 }),
      ex('Main', 'Seated dumbbell press', 3, '10', kg(), { rest: 90 }),
      ex('Main', 'Lat pulldown', 3, '12', kg(), { rest: 75 }),
      ex('Main', 'Pallof press', 3, '10 each side', band(), { rest: 45 }),
      ex('Main', 'Side plank', 3, '30 s each side', bw, { rest: 45 }),
    ]),
    day('rf-kn-3', 'Day 3', 'Single leg and hamstrings', [
      ex('Warm-up', 'Bike', 1, '8 min', bw),
      ex('Rehab', 'Wall sit', 3, '30 s', bw, { rest: 60, note: 'Only as deep as stays pain-free.' }),
      ex('Rehab', 'Isometric hamstring bridge', 3, '20 s each leg', bw, { rest: 45 }),
      ex('Main', 'Leg press', 3, '10', kg(), { rest: 120, note: 'Limit depth if the knee complains.' }),
      ex('Main', 'Single-leg Romanian deadlift', 3, '8 each leg', kg(), { rest: 90 }),
      ex('Main', 'Hamstring slider curl', 3, '8', bw, { rest: 60 }),
      ex('Main', 'Copenhagen plank', 3, '15 s each side', bw, { rest: 45 }),
    ]),
  ],
}

export const REFORGE_TEMPLATES = [fullBody, upperLower, kneeFriendly].map((t) => ({ ...t, builtIn: true }))
