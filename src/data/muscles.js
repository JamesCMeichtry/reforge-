// Reforge muscle figure. Shapes are outlines drawn for the side on the viewer's left
// and mirrored for the other side. Coordinates sit in a 200 × 400 box.

export const WIDTH = 200

// Half of the body outline (viewer's left), from the neck down the outside and back up the inner leg
const HALF_OUTLINE = [
  [93, 48], [92, 58], [84, 62], [66, 66], [54, 72], [49, 84], [47, 100], [46, 120], [45, 138], [41, 160],
  [40, 180], [42, 200], [40, 212], [42, 226], [48, 229], [52, 214], [54, 200], [57, 175], [59, 148],
  [63, 120], [66, 101], [70, 112], [72, 140], [70, 160], [68, 180], [69, 220], [72, 262], [73, 285],
  [72, 310], [75, 345], [78, 366], [74, 383], [80, 391], [94, 391], [93, 372], [94, 340], [95, 300],
  [96, 286], [97, 262], [99, 212], [100, 178],
]

export const OUTLINE = [...HALF_OUTLINE, ...HALF_OUTLINE.slice(0, -1).reverse().map(([x, y]) => [WIDTH - x, y])]

// Joints and areas without muscles: used for injuries, shown on both views
export const JOINTS = [
  { id: 'head', name: 'Head', central: true, ellipse: { cx: 100, cy: 28, rx: 15, ry: 19 } },
  { id: 'neck', name: 'Neck', central: true, points: [[93, 47], [107, 47], [108, 58], [100, 62], [92, 58]] },
  { id: 'elbow', name: 'Elbow', points: [[46, 136], [45, 144], [50, 148], [57, 146], [59, 138], [52, 134]] },
  { id: 'wrist-and-hand', name: 'Wrist and hand', points: [[42, 202], [40, 214], [42, 226], [48, 229], [52, 214], [53, 202]] },
  { id: 'knee', name: 'Knee', points: [[76, 263], [74, 273], [78, 285], [86, 287], [94, 283], [96, 271], [92, 264], [84, 262]] },
  { id: 'ankle-and-foot', name: 'Ankle and foot', points: [[78, 366], [74, 382], [80, 390], [94, 390], [93, 374], [90, 366]] },
]

export const MUSCLES = {
  front: [
    { id: 'upper-trap', name: 'Upper traps', group: 'Upper back', points: [[93, 57], [86, 61], [74, 66], [81, 68], [90, 64], [94, 61]] },
    { id: 'front-delt', name: 'Front delt', group: 'Shoulders', points: [[73, 68], [65, 70], [61, 78], [62, 90], [66, 97], [70, 87], [75, 75]] },
    { id: 'side-delt', name: 'Side delt', group: 'Shoulders', points: [[63, 68], [55, 72], [50, 82], [50, 94], [55, 97], [60, 87], [61, 76]] },
    { id: 'upper-chest', name: 'Upper chest', group: 'Chest', points: [[99, 66], [88, 66], [77, 69], [74, 76], [82, 78], [91, 78], [99, 77]] },
    { id: 'mid-chest', name: 'Mid chest', group: 'Chest', points: [[99, 79], [91, 80], [81, 80], [73, 78], [72, 86], [79, 90], [90, 91], [99, 91]] },
    { id: 'lower-chest', name: 'Lower chest', group: 'Chest', points: [[99, 93], [90, 93], [79, 92], [72, 89], [75, 98], [85, 103], [99, 103]] },
    { id: 'serratus', name: 'Serratus', group: 'Core', points: [[71, 97], [68, 105], [69, 115], [73, 113], [75, 104]] },
    { id: 'biceps-long', name: 'Biceps long head', group: 'Arms', points: [[55, 99], [51, 107], [50, 122], [53, 133], [57, 131], [57, 114], [58, 101]] },
    { id: 'biceps-short', name: 'Biceps short head', group: 'Arms', points: [[59, 101], [58, 114], [58, 131], [62, 129], [64, 116], [63, 103]] },
    { id: 'forearm-flexors', name: 'Forearm flexors', group: 'Arms', points: [[46, 149], [43, 162], [43, 181], [47, 198], [53, 198], [56, 180], [58, 162], [57, 150]] },
    { id: 'obliques', name: 'Obliques', group: 'Core', points: [[74, 112], [72, 127], [73, 144], [77, 154], [82, 152], [83, 130], [82, 111]] },
    {
      id: 'abs',
      name: 'Abs',
      group: 'Core',
      central: true,
      points: [[86, 106], [114, 106], [116, 130], [115, 150], [108, 158], [92, 158], [85, 150], [84, 130]],
      lines: [[[100, 107], [100, 157]], [[86, 119], [114, 119]], [[85, 132], [115, 132]], [[86, 145], [114, 145]]],
    },
    { id: 'hip-flexor', name: 'Hip flexors', group: 'Hips', points: [[85, 156], [80, 161], [86, 172], [94, 174], [96, 166], [90, 159]] },
    { id: 'adductors', name: 'Adductors', group: 'Hips', points: [[94, 177], [90, 182], [90, 206], [93, 224], [98, 225], [99, 200], [99, 180]] },
    { id: 'quad-outer', name: 'Outer quad', group: 'Quads', points: [[71, 179], [69, 200], [70, 228], [73, 252], [77, 257], [78, 230], [77, 201], [75, 183]] },
    { id: 'quad-front', name: 'Front quad', group: 'Quads', points: [[81, 171], [77, 185], [78, 214], [81, 243], [85, 250], [89, 240], [90, 210], [88, 182], [86, 172]] },
    { id: 'quad-inner', name: 'Inner quad (teardrop)', group: 'Quads', points: [[91, 224], [87, 243], [87, 255], [91, 262], [96, 260], [97, 247], [95, 231]] },
    { id: 'tibialis', name: 'Tibialis anterior', group: 'Lower legs', points: [[77, 292], [75, 310], [77, 338], [80, 356], [84, 352], [84, 320], [83, 295]] },
    { id: 'calf-inner', name: 'Inner calf', group: 'Lower legs', points: [[88, 292], [86, 310], [88, 327], [92, 330], [95, 313], [94, 296]] },
  ],
  back: [
    { id: 'upper-trap', name: 'Upper traps', group: 'Upper back', points: [[99, 50], [93, 53], [87, 60], [73, 66], [81, 71], [92, 70], [99, 72]] },
    { id: 'mid-traps', name: 'Mid traps and rhomboids', group: 'Upper back', points: [[99, 74], [92, 73], [84, 75], [82, 84], [87, 96], [94, 104], [99, 106]] },
    { id: 'rear-delt', name: 'Rear delt', group: 'Shoulders', points: [[71, 68], [62, 70], [57, 78], [58, 88], [63, 91], [69, 83], [73, 74]] },
    { id: 'side-delt', name: 'Side delt', group: 'Shoulders', points: [[60, 69], [53, 73], [49, 82], [50, 93], [54, 95], [56, 84], [57, 75]] },
    { id: 'infraspinatus', name: 'Rotator cuff', group: 'Shoulders', points: [[81, 78], [74, 80], [71, 91], [76, 98], [84, 96]] },
    { id: 'lats', name: 'Lats', group: 'Upper back', points: [[71, 97], [69, 113], [72, 132], [80, 146], [90, 148], [93, 130], [88, 112], [80, 101]] },
    { id: 'lower-back', name: 'Lower back', group: 'Lower back', points: [[99, 110], [95, 112], [93, 134], [93, 156], [99, 160]] },
    { id: 'triceps-long', name: 'Triceps long head', group: 'Arms', points: [[60, 93], [58, 105], [59, 126], [63, 130], [65, 116], [65, 101]] },
    { id: 'triceps-lateral', name: 'Triceps lateral head', group: 'Arms', points: [[54, 96], [50, 107], [50, 123], [54, 127], [57, 112], [58, 97]] },
    { id: 'triceps-medial', name: 'Triceps medial head', group: 'Arms', points: [[52, 127], [52, 134], [58, 136], [62, 132], [58, 129]] },
    { id: 'forearm-extensors', name: 'Forearm extensors', group: 'Arms', points: [[46, 149], [43, 162], [43, 181], [47, 198], [53, 198], [56, 180], [58, 162], [57, 150]] },
    { id: 'glute-med', name: 'Glute med', group: 'Glutes', points: [[73, 157], [71, 168], [77, 172], [88, 168], [92, 161], [84, 155]] },
    { id: 'glute-max', name: 'Glute max', group: 'Glutes', points: [[74, 172], [72, 188], [77, 201], [90, 205], [99, 199], [99, 174], [90, 170]] },
    { id: 'hamstring-outer', name: 'Outer hamstring', group: 'Hamstrings', points: [[73, 207], [71, 226], [74, 249], [79, 260], [84, 256], [84, 231], [82, 209]] },
    { id: 'hamstring-inner', name: 'Inner hamstring', group: 'Hamstrings', points: [[85, 209], [86, 232], [87, 255], [92, 260], [97, 249], [98, 225], [98, 209]] },
    { id: 'calf-outer', name: 'Outer calf', group: 'Lower legs', points: [[75, 291], [73, 307], [76, 326], [81, 333], [85, 325], [85, 300], [82, 290]] },
    { id: 'calf-inner', name: 'Inner calf', group: 'Lower legs', points: [[87, 290], [87, 311], [89, 329], [93, 331], [96, 315], [95, 296], [91, 288]] },
    { id: 'soleus', name: 'Soleus', group: 'Lower legs', points: [[77, 332], [78, 348], [82, 362], [91, 362], [94, 348], [93, 333], [85, 334]] },
  ],
}

// Which muscles each exercise trains, matched from its name. First matching rule wins.
const RULES = [
  [/scapular push/, ['serratus'], ['front-delt']],
  [/prone t\b|t raise/, ['mid-traps'], ['rear-delt', 'infraspinatus']],
  [/face pull/, ['rear-delt', 'infraspinatus'], ['mid-traps', 'upper-trap']],
  [/pull-?apart/, ['rear-delt', 'mid-traps'], ['infraspinatus']],
  [/external rotation/, ['infraspinatus'], ['rear-delt']],
  [/incline.*press/, ['upper-chest', 'front-delt'], ['mid-chest', 'triceps-lateral', 'triceps-medial']],
  [/floor press|bench press|push-?up|chest press|dip/, ['mid-chest', 'lower-chest'], ['upper-chest', 'front-delt', 'triceps-lateral', 'triceps-medial']],
  [/overhead press|shoulder press|military/, ['front-delt'], ['side-delt', 'triceps-long', 'upper-trap']],
  [/lateral raise/, ['side-delt'], ['upper-trap']],
  [/rear delt|reverse fly/, ['rear-delt'], ['mid-traps']],
  [/pull-?up|chin-?up|pulldown/, ['lats'], ['biceps-long', 'biceps-short', 'mid-traps']],
  [/row/, ['lats', 'mid-traps'], ['rear-delt', 'biceps-long', 'biceps-short']],
  [/overhead (triceps )?extension|skull/, ['triceps-long'], ['triceps-lateral', 'triceps-medial']],
  [/pushdown|triceps/, ['triceps-lateral', 'triceps-medial'], ['triceps-long']],
  [/reverse.*curl|hammer/, ['forearm-extensors'], ['biceps-long', 'biceps-short']],
  [/leg curl|hamstring curl|lying.*curl/, ['hamstring-outer', 'hamstring-inner'], ['calf-inner', 'calf-outer']],
  [/incline.*curl/, ['biceps-long'], ['biceps-short']],
  [/preacher|spider/, ['biceps-short'], ['biceps-long']],
  [/curl/, ['biceps-long', 'biceps-short'], ['forearm-flexors']],
  [/quad set/, ['quad-front', 'quad-inner', 'quad-outer'], []],
  [/straight leg raise/, ['quad-front', 'hip-flexor'], ['abs']],
  [/terminal knee|\btke\b/, ['quad-inner'], ['quad-outer', 'quad-front']],
  [/leg extension/, ['quad-front'], ['quad-inner', 'quad-outer']],
  [/step-?up|lunge|split squat/, ['quad-front', 'quad-outer', 'quad-inner', 'glute-max'], ['glute-med', 'adductors', 'hamstring-inner']],
  [/sit-to-stand|squat|leg press/, ['quad-front', 'quad-outer', 'quad-inner', 'glute-max'], ['adductors', 'lower-back']],
  [/romanian|\brdl\b|deadlift|good morning/, ['hamstring-outer', 'hamstring-inner', 'glute-max'], ['lower-back', 'adductors']],
  [/hamstring/, ['hamstring-outer', 'hamstring-inner'], []],
  [/bridge|hip thrust/, ['glute-max'], ['hamstring-inner', 'hamstring-outer']],
  [/lateral walk|abduction|clam/, ['glute-med'], ['glute-max']],
  [/calf raise/, ['calf-inner', 'calf-outer'], ['soleus']],
  [/seated calf|soleus/, ['soleus'], ['calf-inner', 'calf-outer']],
  [/tibialis/, ['tibialis'], []],
  [/copenhagen|adductor/, ['adductors'], ['obliques']],
  [/hanging leg raise|leg raise|crunch|dead bug|sit-?up/, ['abs'], ['hip-flexor', 'obliques']],
  [/plank|pallof|anti-rotation/, ['abs', 'obliques'], []],
  [/back extension|superman/, ['lower-back'], ['glute-max', 'hamstring-inner']],
  [/shrug/, ['upper-trap'], []],
  [/wrist curl/, ['forearm-flexors'], []],
]

export function musclesForExercise(name) {
  const lower = name.toLowerCase()
  for (const [pattern, primary, secondary] of RULES) {
    if (pattern.test(lower)) return { primary, secondary }
  }
  return { primary: [], secondary: [] }
}

export const allMuscles = () => {
  const byId = new Map()
  for (const view of ['front', 'back']) for (const m of MUSCLES[view]) if (!byId.has(m.id)) byId.set(m.id, m)
  return byId
}
