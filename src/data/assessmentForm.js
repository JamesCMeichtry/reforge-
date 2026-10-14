// The professional assessment: every question in one place, so the form, the summary and (later) the AI
// all read the same structure. Field types: chips (one choice), multi (several), text, textarea, number,
// scale, date, yesno (a list of yes/no questions), tests (movement screen results).

export const RESULT = {
  pass: { label: 'Pass', colour: 'var(--color-gold)' },
  limited: { label: 'Limited', colour: 'var(--pain-moderate)' },
  painful: { label: 'Painful', colour: 'var(--pain-severe)' },
}

export const RED_FLAGS = [
  { id: 'chest', label: 'Chest pain, heart condition or palpitations' },
  { id: 'dizzy', label: 'Dizziness, fainting or blackouts' },
  { id: 'bp', label: 'High blood pressure (diagnosed or suspected)' },
  { id: 'nightPain', label: 'Pain at night or constant pain that rest doesn’t ease' },
  { id: 'weightLoss', label: 'Unexplained weight loss or feeling generally unwell' },
  { id: 'nerve', label: 'Numbness, pins and needles or weakness in arms or legs' },
  { id: 'bladder', label: 'Changes in bladder or bowel control' },
  { id: 'surgery', label: 'Surgery in the last 6 months' },
  { id: 'pregnant', label: 'Pregnant or given birth in the last 6 months' },
  { id: 'diabetes', label: 'Diabetes or another condition affected by exercise' },
]

export const SECTIONS = [
  {
    id: 'goals',
    title: 'Goals',
    intro: 'What they want, by when, and how you’ll both know it worked.',
    fields: [
      {
        id: 'primary',
        label: 'Main goal',
        type: 'chips',
        options: [
          'Return to sport',
          'Pain-free daily life',
          'Get stronger',
          'Build muscle',
          'Lose fat',
          'Performance',
          'Stay active',
        ],
      },
      {
        id: 'detail',
        label: 'In their own words',
        type: 'textarea',
        placeholder: 'e.g. Play 5-a-side again without my knee swelling',
      },
      { id: 'targetDate', label: 'Target date', type: 'date' },
      {
        id: 'measure',
        label: 'How will you measure it?',
        type: 'text',
        placeholder: 'e.g. Full 60-minute game, pain under 3/10',
      },
      { id: 'motivation', label: 'Motivation right now', type: 'scale', min: 1, max: 10 },
    ],
  },
  {
    id: 'screening',
    title: 'Health screen',
    intro: 'Any “yes” means checking with a GP or physio before loading up.',
    fields: [
      { id: 'flags', label: 'Do any of these apply?', type: 'yesno', items: RED_FLAGS },
      {
        id: 'medications',
        label: 'Medications that affect training',
        type: 'textarea',
        placeholder: 'e.g. Beta blockers, blood thinners, steroids',
      },
      {
        id: 'clearance',
        label: 'Medical clearance',
        type: 'chips',
        options: ['Not needed', 'Cleared by GP or physio', 'Waiting for clearance'],
      },
      {
        id: 'clearanceNote',
        label: 'Clearance details',
        type: 'text',
        placeholder: 'Who cleared them, when, any limits',
      },
    ],
  },
  {
    id: 'injuries',
    title: 'Injuries',
    intro: 'The detail behind each injury on their body map.',
    custom: 'injuries',
  },
  {
    id: 'movement',
    title: 'Movement screen',
    intro: 'Quick tests. Score each one as you watch.',
    fields: [
      {
        id: 'tests',
        type: 'tests',
        items: [
          { id: 'squat', label: 'Bodyweight squat', hint: 'Depth, knees tracking over toes, heels down' },
          { id: 'slSquat', label: 'Single-leg squat', sides: true, hint: 'Knee control, hip drop, trunk lean' },
          { id: 'stepDown', label: 'Step-down', sides: true, hint: 'Off a 20 cm step, slow and controlled' },
          { id: 'hinge', label: 'Hip hinge', hint: 'Dowel on the back: head, upper back and hips stay in contact' },
          { id: 'overhead', label: 'Overhead reach', hint: 'Back flat against a wall, both arms up' },
          { id: 'pushup', label: 'Push-up', hint: 'Body stays straight, shoulder blades move well' },
          { id: 'balance', label: 'Single-leg balance (30 s)', sides: true, hint: 'Eyes open, hands on hips' },
          { id: 'ankle', label: 'Knee-to-wall (ankle)', sides: true, hint: 'Under about 10 cm counts as limited' },
        ],
      },
      {
        id: 'notes',
        label: 'What you noticed',
        type: 'textarea',
        placeholder: 'e.g. Left knee caves on single-leg squat, pain at the bottom of the step-down',
      },
    ],
  },
  {
    id: 'training',
    title: 'Training',
    intro: 'Where they’re starting from, and what they can fit in.',
    fields: [
      {
        id: 'experience',
        label: 'Training experience',
        type: 'chips',
        options: ['New to it', 'Under a year', '1–3 years', '3+ years'],
      },
      {
        id: 'days',
        label: 'Days they can train',
        type: 'multi',
        options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      { id: 'length', label: 'Session length', type: 'chips', options: ['30 min', '45 min', '60 min', '75+ min'] },
      {
        id: 'equipment',
        label: 'Equipment',
        type: 'multi',
        options: ['Full gym', 'Machines', 'Dumbbells', 'Barbell', 'Kettlebells', 'Bands', 'Bodyweight only'],
      },
      {
        id: 'lifts',
        label: 'Current lifts',
        type: 'textarea',
        placeholder: 'e.g. Squat 60 kg × 5, bench 50 kg × 8, deadlift 80 kg × 5',
      },
      {
        id: 'activity',
        label: 'Other activity',
        type: 'text',
        placeholder: 'e.g. 5-a-side once a week, walks the dog daily',
      },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Life and preferences',
    intro: 'What happens outside the gym changes what they can recover from.',
    fields: [
      { id: 'job', label: 'Job', type: 'text', placeholder: 'e.g. Site carpenter' },
      {
        id: 'demands',
        label: 'Physical demands at work',
        type: 'multi',
        options: [
          'Kneeling',
          'Heavy lifting',
          'On feet all day',
          'Desk based',
          'Driving',
          'Shift work',
          'Overhead work',
        ],
      },
      { id: 'sleep', label: 'Sleep (hours a night)', type: 'number', min: 3, max: 12, step: 0.5 },
      { id: 'stress', label: 'Stress', type: 'scale', min: 1, max: 10 },
      { id: 'likes', label: 'Enjoys', type: 'text', placeholder: 'e.g. Heavy lower body, sled work' },
      { id: 'avoid', label: 'Avoid or dislikes', type: 'text', placeholder: 'e.g. Running, lunges, burpees' },
      { id: 'notes', label: 'Anything else', type: 'textarea' },
    ],
  },
]

export const INJURY_FIELDS = [
  {
    id: 'when',
    label: 'When it happened',
    type: 'chips',
    options: ['Under 6 weeks', '6 weeks–3 months', '3–12 months', 'Over a year'],
  },
  { id: 'how', label: 'How it happened', type: 'text', placeholder: 'e.g. Twisted landing playing football' },
  { id: 'surgery', label: 'Surgery', type: 'chips', options: ['No', 'Yes'] },
  {
    id: 'cleared',
    label: 'Cleared to train',
    type: 'chips',
    options: ['Fully cleared', 'Cleared with limits', 'Not yet', 'Never assessed'],
  },
  { id: 'pain', label: 'Pain on a normal day', type: 'scale', min: 0, max: 10 },
  {
    id: 'aggravating',
    label: 'Makes it worse',
    type: 'multi',
    options: [
      'Kneeling',
      'Stairs',
      'Squatting',
      'Running',
      'Jumping',
      'Twisting',
      'Overhead',
      'Lifting',
      'Sitting',
      'Mornings',
    ],
  },
  { id: 'easing', label: 'Makes it better', type: 'text', placeholder: 'e.g. Moving gently, ice, rest' },
  { id: 'irritability', label: 'How easily it flares', type: 'chips', options: ['Low', 'Moderate', 'High'] },
]

// What counts as answered, for the progress shown on each section
function hasValue(value) {
  if (value == null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export function sectionProgress(section, answers, injuryKeys = []) {
  const values = answers?.[section.id] ?? {}
  if (section.custom === 'injuries') {
    if (!injuryKeys.length) return { done: 1, total: 1 }
    const done = injuryKeys.filter((key) => hasValue(values[key]?.cleared) && hasValue(values[key]?.when)).length
    return { done, total: injuryKeys.length }
  }
  const fields = section.fields.filter((f) => f.type !== 'textarea')
  return { done: fields.filter((f) => hasValue(values[f.id])).length, total: fields.length }
}

const CLEARED_TEXT = { 'Not yet': 'not cleared to train yet', 'Never assessed': 'never assessed by a professional' }

// The headline points a coach should see first: warning signs, painful tests, things to avoid
export function keyFindings(answers, injuries = []) {
  const findings = []
  const flags = answers?.screening?.flags ?? {}
  const yes = RED_FLAGS.filter((f) => flags[f.id] === 'yes')
  if (yes.length) {
    const clearance = answers?.screening?.clearance
    findings.push({
      level: clearance === 'Cleared by GP or physio' ? 'amber' : 'red',
      text: `Health screen: ${yes.map((f) => f.label.toLowerCase()).join('; ')}`,
      detail: clearance ? `Clearance: ${clearance.toLowerCase()}` : 'Clearance not recorded yet',
    })
  }
  const tests = answers?.movement?.tests ?? {}
  const testSection = SECTIONS.find((s) => s.id === 'movement').fields[0]
  for (const test of testSection.items) {
    const sides = test.sides ? ['left', 'right'] : ['both']
    for (const side of sides) {
      const result = tests[`${test.id}${test.sides ? `-${side}` : ''}`]
      if (result === 'painful' || result === 'limited') {
        findings.push({
          level: result === 'painful' ? 'red' : 'amber',
          text: `${test.label}${test.sides ? ` (${side})` : ''}: ${RESULT[result].label.toLowerCase()}`,
        })
      }
    }
  }
  for (const injury of injuries) {
    const detail = answers?.injuries?.[injury.key]
    if (!detail) continue
    if (detail.cleared === 'Not yet' || detail.cleared === 'Never assessed' || detail.irritability === 'High') {
      findings.push({
        level: detail.cleared === 'Not yet' ? 'red' : 'amber',
        text: `${injury.label}: ${[CLEARED_TEXT[detail.cleared], detail.irritability === 'High' && 'flares easily']
          .filter(Boolean)
          .join(', ')}`,
      })
    }
  }
  if (answers?.lifestyle?.avoid) findings.push({ level: 'info', text: `Avoid: ${answers.lifestyle.avoid}` })
  if (answers?.lifestyle?.demands?.length) {
    findings.push({ level: 'info', text: `At work: ${answers.lifestyle.demands.join(', ').toLowerCase()}` })
  }
  return findings
}
