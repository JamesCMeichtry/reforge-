// Figure outline, joints, tendons and ligaments for the living body map.
// Points are drawn for the side on the viewer's left and mirrored for the other side,
// on a 200-wide canvas with the centre line at x = 100.
export const WIDTH = 200

const mirrorX = (points) => points.map(([x, y]) => [WIDTH - x, y])

// Hand with the thumb out to the side (palms facing forward)
const HAND = [
  [44, 199], [41, 204], [37.5, 209], [35.5, 215], [37.5, 217.5], [41, 214], [41, 222], [42, 230],
  [45, 235], [50.5, 235.5], [53.5, 230], [54.5, 219], [55, 207], [54, 200],
]

// Seen from the front the foot is short and wide, toes turned slightly out
const FOOT = {
  front: [[78, 364], [76.5, 371], [73.5, 379], [71.5, 387], [74.5, 393], [84, 395], [94, 394], [97, 389], [95, 379], [93.5, 370], [93, 365]],
  back: [[78, 364], [77, 373], [77.5, 383], [80.5, 391], [87, 394], [92.5, 390], [94.5, 381], [94, 372], [93, 365]],
}

function halfOutline(view) {
  return [
    [92.5, 42], [92, 53], [86, 59], [68, 64.5], [56, 69], [49.5, 79], [47.5, 96], [46, 118], [45, 138], [41.5, 160],
    [40, 180], [41.5, 196],
    ...HAND.slice(1, -1),
    [54.5, 196], [57, 175], [59, 148], [63, 120], [66, 101], [70, 112], [72, 140], [70, 160], [68, 180], [69, 220],
    [72, 262], [73, 285], [72, 310], [75, 345], [78, 362],
    ...FOOT[view].slice(1, -1),
    [93.5, 360], [94, 340], [95, 300], [96, 286], [97, 262], [99, 212], [100, 178],
  ]
}

const outlineFor = (view) => {
  const half = halfOutline(view)
  return [...half, ...mirrorX(half.slice(0, -1).reverse())]
}
export const OUTLINES = { front: outlineFor('front'), back: outlineFor('back') }

// Head with ears and a jaw that narrows to the chin
const HEAD = [
  [100, 6], [108.5, 7.5], [114, 13], [116, 21], [118.5, 22.5], [119, 28], [117, 33.5], [115, 34.5],
  [112.5, 41], [107, 46.5], [100, 49], [93, 46.5], [87.5, 41], [85, 34.5], [83, 33.5], [81, 28],
  [81.5, 22.5], [84, 21], [86, 13], [91.5, 7.5],
]

const NECK = [[92.5, 42], [107.5, 42], [108, 53], [113, 59], [100, 63.5], [87, 59], [92, 53]]

const JOINT_BASE = [
  { id: 'head', name: 'Head', central: true, points: HEAD },
  { id: 'neck', name: 'Neck', central: true, points: NECK },
  { id: 'elbow', name: 'Elbow', points: [[46, 136], [45, 144], [50, 148], [57, 146], [59, 138], [52, 134]] },
  { id: 'wrist-and-hand', name: 'Wrist and hand', points: HAND },
  { id: 'knee', name: 'Knee', points: [[76, 263], [74, 273], [78, 285], [86, 287], [94, 283], [96, 271], [92, 264], [84, 262]] },
]
export const JOINTS = {
  front: [...JOINT_BASE, { id: 'ankle-and-foot', name: 'Ankle and foot', points: FOOT.front }],
  back: [...JOINT_BASE, { id: 'ankle-and-foot', name: 'Ankle and foot', points: FOOT.back }],
}

// Fine anatomical lines that sit on top of the figure: not tappable, purely for shape
export const DETAILS = {
  front: {
    central: [
      [[89, 37], [94, 50], [98.5, 61]], // neck muscles (sternocleidomastoid)
      [[111, 37], [106, 50], [101.5, 61]],
    ],
    sided: [
      [[97, 63.5], [86, 63], [72, 66]], // collarbone
      [[45, 223], [45.2, 233.5]], // fingers
      [[48, 223], [48, 234.5]],
      [[51, 223], [51.2, 233.5]],
      [[78, 389], [79, 393.5]], // toes
      [[83, 390], [83.5, 394.5]],
      [[88.5, 390], [89, 394.5]],
    ],
  },
  back: {
    central: [[[100, 40], [100, 52]]],
    sided: [
      [[45, 223], [45.2, 233.5]],
      [[48, 223], [48, 234.5]],
      [[51, 223], [51.2, 233.5]],
    ],
  },
}

// Tendons and ligaments. "shape" is the figure shape whose injury colour they take when involved.
// Internal ones sit inside a joint, so they're listed in the panel rather than drawn.
export const STRUCTURES = {
  'quad-tendon': {
    name: 'Quadriceps tendon', kind: 'Tendon', shape: 'knee',
    about: 'Joins the quads to the top of the kneecap.',
    view: 'front', lines: [[[85, 249], [85.4, 262.5]]],
  },
  patella: {
    name: 'Kneecap', kind: 'Bone and cartilage', shape: 'knee',
    about: 'Glides in a groove at the front of the knee and gives the quads leverage.',
    view: 'front', closed: [[85.5, 263], [90.5, 266], [91, 272], [87.5, 277.5], [83.5, 277.5], [80.5, 272], [81, 266]],
  },
  'patellar-tendon': {
    name: 'Patellar tendon', kind: 'Tendon', shape: 'knee',
    about: 'Runs from the kneecap to the shin. Takes a big load when kneeling, squatting and jumping.',
    view: 'front', lines: [[[85.5, 278], [85.7, 292]]],
  },
  mcl: {
    name: 'MCL (medial collateral ligament)', kind: 'Ligament', shape: 'knee',
    about: 'On the inner knee. Stops it buckling inwards.',
    view: 'front', lines: [[[94.5, 261], [96.2, 276], [95, 291]]],
  },
  lcl: {
    name: 'LCL (lateral collateral ligament)', kind: 'Ligament', shape: 'knee',
    about: 'On the outer knee. Stops it bowing outwards.',
    view: 'front', lines: [[[75.8, 265], [74.6, 277], [76.5, 289]]],
  },
  'it-band': {
    name: 'IT band', kind: 'Fascia', shape: 'quad-outer', width: 0.8,
    about: 'A thick band down the outside of the thigh to just below the knee.',
    view: 'front', lines: [[[70.5, 176], [69.5, 212], [72.5, 248], [75.5, 266]]],
  },
  'adductor-tendon': {
    name: 'Adductor tendons', kind: 'Tendon', shape: 'adductors',
    about: 'Where the groin muscles attach to the pelvis.',
    view: 'front', lines: [[[93.5, 178], [97.5, 171]]],
  },
  'biceps-tendon': {
    name: 'Distal biceps tendon', kind: 'Tendon', shape: 'elbow',
    about: 'Attaches the biceps to the forearm in the elbow crease.',
    view: 'front', lines: [[[55.5, 131], [53.5, 142]]],
  },
  'common-flexor-tendon': {
    name: "Common flexor tendon (golfer's elbow)", kind: 'Tendon', shape: 'elbow',
    about: 'On the inner elbow, where the wrist and finger flexors start.',
    view: 'front', lines: [[[58.5, 140], [57, 152]]],
  },
  'wrist-flexor-tendons': {
    name: 'Wrist flexor tendons', kind: 'Tendon', shape: 'wrist-and-hand',
    about: 'Run through the palm side of the wrist to the fingers.',
    view: 'front', lines: [[[46.5, 191], [46.5, 204]], [[49.2, 191], [49.2, 205]], [[52, 191], [52, 204]]],
  },
  'tibialis-tendon': {
    name: 'Tibialis anterior tendon', kind: 'Tendon', shape: 'ankle-and-foot',
    about: 'Crosses the front of the ankle and lifts the foot.',
    view: 'front', lines: [[[82, 352], [84.5, 364], [90.5, 376]]],
  },
  atfl: {
    name: 'ATFL (anterior talofibular ligament)', kind: 'Ligament', shape: 'ankle-and-foot',
    about: 'On the outer ankle. The most commonly sprained ligament: it stops the ankle rolling outwards.',
    view: 'front', lines: [[[77.5, 369], [82.5, 373.5]]],
  },
  'deltoid-ligament': {
    name: 'Deltoid ligament', kind: 'Ligament', shape: 'ankle-and-foot',
    about: 'A strong fan of ligament on the inner ankle.',
    view: 'front', lines: [[[93, 366], [93.8, 374]]],
  },
  achilles: {
    name: 'Achilles tendon', kind: 'Tendon', shape: 'ankle-and-foot',
    about: 'Joins the calves to the heel. The thickest tendon in the body.',
    view: 'back', lines: [[[86.3, 361], [86.3, 373], [86.6, 384]]], width: 2.2,
  },
  'hamstring-tendon-medial': {
    name: 'Inner hamstring tendons', kind: 'Tendon', shape: 'hamstring-inner',
    about: 'Semitendinosus and gracilis. These are the tendons usually taken for a hamstring ACL graft.',
    view: 'back', lines: [[[94, 258], [95, 271], [93, 283]]],
  },
  'hamstring-tendon-lateral': {
    name: 'Outer hamstring tendon', kind: 'Tendon', shape: 'hamstring-outer',
    about: 'Biceps femoris. The most common spot for a hamstring strain.',
    view: 'back', lines: [[[80, 258], [77.5, 271], [77.5, 284]]],
  },
  'triceps-tendon': {
    name: 'Triceps tendon', kind: 'Tendon', shape: 'elbow',
    about: 'Attaches the triceps to the point of the elbow.',
    view: 'back', lines: [[[57, 130], [55, 141]]],
  },
  'common-extensor-tendon': {
    name: "Common extensor tendon (tennis elbow)", kind: 'Tendon', shape: 'elbow',
    about: 'On the outer elbow, where the wrist and finger extensors start.',
    view: 'back', lines: [[[46.5, 140], [46, 152]]],
  },
  'wrist-extensor-tendons': {
    name: 'Wrist extensor tendons', kind: 'Tendon', shape: 'wrist-and-hand',
    about: 'Run over the back of the wrist to the fingers.',
    view: 'back', lines: [[[46.5, 191], [46.5, 204]], [[49.2, 191], [49.2, 205]], [[52, 191], [52, 204]]],
  },
  'rotator-cuff-tendon': {
    name: 'Rotator cuff tendons', kind: 'Tendon', shape: 'infraspinatus',
    about: 'Run under the shoulder muscles to the top of the arm and keep the ball centred in the socket.',
    view: 'back', lines: [[[73, 86], [64, 83.5], [57, 81]]],
  },
  acl: {
    name: 'ACL (anterior cruciate ligament)', kind: 'Ligament', shape: 'knee', internal: true,
    about: 'Inside the knee. Stops the shin sliding forwards and controls twisting.',
  },
  pcl: {
    name: 'PCL (posterior cruciate ligament)', kind: 'Ligament', shape: 'knee', internal: true,
    about: 'Inside the knee. Stops the shin sliding backwards.',
  },
  meniscus: {
    name: 'Meniscus', kind: 'Cartilage', shape: 'knee', internal: true,
    about: 'Two C-shaped cushions between the thigh and shin bones.',
  },
}

// Which structures each injury involves, with a note specific to that injury
export const INJURY_STRUCTURES = {
  'acl-hamstring-graft': [
    ['acl', 'Reconstructed using a graft from your hamstring tendons.'],
    ['hamstring-tendon-medial', 'Graft donor site. These tendons were used to rebuild your ACL, so this area can stay weaker and cramp-prone for a while.'],
  ],
  'acl-patellar-graft': [
    ['acl', 'Reconstructed using a graft from your patellar tendon.'],
    ['patellar-tendon', 'Graft donor site. Part of this tendon was used to rebuild your ACL, which is why kneeling can be sore.'],
  ],
  meniscus: [['meniscus', 'Deep, loaded bending and twisting are what aggravate it most.']],
  'kneecap-pain': [
    ['patella', 'Pain around or behind the kneecap. Building quad and hip strength helps it track well.'],
    ['patellar-tendon', 'Often sore alongside kneecap pain, especially after kneeling or stairs.'],
  ],
  'hamstring-strain': [
    ['hamstring-tendon-lateral', 'The most common spot for a hamstring strain.'],
    ['hamstring-tendon-medial', 'Can be involved too, especially with cramping.'],
  ],
  'hip-adductor': [['adductor-tendon', 'Groin strains usually sit where these tendons meet the pelvis.']],
  'rotator-cuff': [['rotator-cuff-tendon', 'Overhead work loads these tendons most.']],
  'elbow-tendon': [
    ['common-extensor-tendon', 'Outer elbow pain. Gripping with the palm down loads it.'],
    ['common-flexor-tendon', 'Inner elbow pain. Gripping with the palm up loads it.'],
  ],
  'wrist-pain': [
    ['wrist-flexor-tendons', 'Load through the palm side of the wrist.'],
    ['wrist-extensor-tendons', 'Load through the back of the wrist.'],
  ],
  'ankle-sprain': [['atfl', 'The ligament most rolled ankles stretch or tear.']],
}
