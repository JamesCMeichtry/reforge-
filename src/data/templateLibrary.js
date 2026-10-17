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

const hyrox = {
  id: 'rf-hyrox-prep',
  name: 'HYROX prep',
  description:
    'Four days building towards a HYROX race: running engine, station strength, running on tired legs and a half-race simulation. Distances are race standard; scale the sled and wall ball weights to the client.',
  days: [
    day('rf-hx-1', 'Day 1', 'Running engine', [
      ex('Warm-up', 'Rowing erg', 1, '5 min', bw, { note: 'Easy pace.' }),
      ex('Warm-up', 'Skipping', 2, '45 s', bw, { rest: 30 }),
      ex('Main', 'Run', 6, '800 m', bw, { rest: 90, note: 'At goal race pace or a touch quicker.' }),
      ex('Main', 'SkiErg', 4, '500 m', bw, { rest: 90 }),
      ex('Main', 'Plank', 3, '45 s', bw, { rest: 45 }),
    ]),
    day('rf-hx-2', 'Day 2', 'Station strength', [
      ex('Warm-up', 'Bike', 1, '5 min', bw),
      ex('Warm-up', '90/90 hip switch', 1, '8 each side', bw),
      ex('Main', 'Sled push', 5, '25 m', kg(), { rest: 120, note: 'Low hips, drive through the balls of the feet.' }),
      ex('Main', 'Sled pull', 5, '25 m', kg(), { rest: 120, note: 'Hand over hand, sit back into it.' }),
      ex('Main', 'Sandbag lunge', 3, '25 m', kg(), { rest: 90 }),
      ex('Main', 'Farmer carry', 4, '50 m', kg(), { rest: 60 }),
      ex('Main', 'Wall ball', 4, '20', kg(), { rest: 60, note: 'Full depth squat, hit the target every rep.' }),
    ]),
    day('rf-hx-3', 'Day 3', 'Running on tired legs', [
      ex('Warm-up', 'Bike', 1, '5 min', bw),
      ex('Main', 'Run', 4, '1 km', bw, { rest: 15, note: 'Go straight from each run into the next station.' }),
      ex('Main', 'Burpee broad jump', 4, '20 m', bw, { rest: 15 }),
      ex('Main', 'Rowing erg', 4, '500 m', bw, { rest: 15 }),
      ex('Main', 'Farmer carry', 4, '100 m', kg(), {
        rest: 120,
        note: 'Rest after the carry, then start the next round.',
      }),
    ]),
    day('rf-hx-4', 'Day 4', 'Half-race simulation', [
      ex('Warm-up', 'Run', 1, '1 km', bw, { note: 'Easy, then mobilise.' }),
      ex('Main', 'SkiErg', 1, '1000 m', bw, { rest: 15, note: 'Run 1 km before each station.' }),
      ex('Main', 'Sled push', 1, '50 m', kg(), { rest: 15 }),
      ex('Main', 'Sled pull', 1, '50 m', kg(), { rest: 15 }),
      ex('Main', 'Burpee broad jump', 1, '80 m', bw, { rest: 15 }),
      ex('Main', 'Wall ball', 1, '50', kg(), { rest: 15, note: 'Half the race total. Note the finish time.' }),
    ]),
  ],
}

const hiit = {
  id: 'rf-hiit',
  name: 'HIIT conditioning',
  description:
    'Three short, hard sessions for fitness and fat loss: timed intervals, machine sprints and a strength circuit. Work hard in the work periods and take the full rest.',
  days: [
    day('rf-hi-1', 'Day A', 'Full-body intervals', [
      ex('Warm-up', 'Bike', 1, '5 min', bw),
      ex('Warm-up', 'Skipping', 2, '30 s', bw, { rest: 30 }),
      ex('Main', 'Kettlebell swing', 5, '40 s', kg(), { rest: 20, note: 'Hips drive the bell, not the arms.' }),
      ex('Main', 'Burpee', 5, '40 s', bw, { rest: 20 }),
      ex('Main', 'Jump squat', 5, '30 s', bw, { rest: 30, note: 'Land soft and quiet.' }),
      ex('Main', 'Mountain climber', 5, '40 s', bw, { rest: 20 }),
      ex('Main', 'Plank', 3, '45 s', bw, { rest: 30 }),
    ]),
    day('rf-hi-2', 'Day B', 'Machine sprints', [
      ex('Warm-up', 'Rowing erg', 1, '5 min', bw),
      ex('Main', 'Assault bike', 8, '20 s', bw, { rest: 40, note: 'All-out every sprint.' }),
      ex('Main', 'Rowing erg', 6, '250 m', bw, { rest: 60 }),
      ex('Main', 'Battle ropes', 5, '30 s', bw, { rest: 30 }),
      ex('Main', 'Farmer carry', 4, '40 m', kg(), { rest: 45 }),
    ]),
    day('rf-hi-3', 'Day C', 'Strength circuit', [
      ex('Warm-up', 'Skipping', 2, '45 s', bw, { rest: 30 }),
      ex('Main', 'Thruster', 4, '12', kg(), { rest: 30 }),
      ex('Main', 'Push-up', 4, '15', bw, { rest: 30 }),
      ex('Main', 'Kettlebell swing', 4, '15', kg(), { rest: 30 }),
      ex('Main', 'Box jump', 4, '8', bw, { rest: 30, note: 'Step down, don’t jump down.' }),
      ex('Main', 'Devil press', 3, '10', kg(), { rest: 60 }),
      ex('Main', 'Dead bug', 3, '10 each side', bw, { rest: 30 }),
    ]),
  ],
}

export const REFORGE_TEMPLATES = [fullBody, upperLower, kneeFriendly, hyrox, hiit].map((t) => ({ ...t, builtIn: true }))
