// Starter injury library. Each injury lists the areas it affects and how much that changes training.
// Draft for clinical review: area names must match the body map's area names exactly.

export const TIERS = {
  primary: { label: 'Injury site', rank: 3, fill: '#dc2626' },
  affected: { label: 'Affected', rank: 2, fill: '#f59e0b' },
  watch: { label: 'Watch', rank: 1, fill: '#fde047' },
}

export const CENTRAL_AREAS = ['Head', 'Neck', 'Chest', 'Upper back', 'Abdomen', 'Lower back']

export const INJURIES = [
  {
    id: 'acl-hamstring-graft',
    group: 'Knee',
    name: 'ACL reconstruction (hamstring graft)',
    effects: [
      { area: 'Knee', tier: 'primary', note: 'Reconstructed joint. Limit deep loaded bending and pivoting until cleared.' },
      { area: 'Hamstring', tier: 'affected', note: 'The graft was taken from here, so it can stay weaker and cramp-prone.' },
      { area: 'Quad', tier: 'watch', note: 'Quad strength often lags after knee surgery.' },
      { area: 'Hip', tier: 'watch', note: "Hip strength helps control the knee's position." },
    ],
  },
  {
    id: 'acl-patellar-graft',
    group: 'Knee',
    name: 'ACL reconstruction (patellar tendon graft)',
    effects: [
      { area: 'Knee', tier: 'primary', note: 'Reconstructed joint. Limit deep loaded bending and pivoting until cleared.' },
      { area: 'Quad', tier: 'affected', note: 'The graft came from the patellar tendon, so kneeling and heavy quad work can irritate it.' },
      { area: 'Hamstring', tier: 'watch', note: 'Strong hamstrings help protect the new ligament.' },
      { area: 'Hip', tier: 'watch', note: "Hip strength helps control the knee's position." },
    ],
  },
  {
    id: 'meniscus',
    group: 'Knee',
    name: 'Meniscus injury',
    effects: [
      { area: 'Knee', tier: 'primary', note: 'Deep bending, twisting and kneeling can aggravate it.' },
      { area: 'Quad', tier: 'watch', note: 'Strong quads take load off the joint.' },
      { area: 'Hip', tier: 'watch', note: 'Hip control reduces twisting stress on the knee.' },
    ],
  },
  {
    id: 'kneecap-pain',
    group: 'Knee',
    name: 'Kneecap pain (patellofemoral)',
    effects: [
      { area: 'Knee', tier: 'primary', note: 'Stairs, deep squats and kneeling often aggravate it.' },
      { area: 'Quad', tier: 'affected', note: 'Quad load drives kneecap pressure, so build it gradually.' },
      { area: 'Hip', tier: 'watch', note: 'Weak hips let the knee drift inwards.' },
    ],
  },
  {
    id: 'hamstring-strain',
    group: 'Hamstring',
    name: 'Hamstring strain or cramping',
    effects: [
      { area: 'Hamstring', tier: 'primary', note: 'Build tolerance gradually before heavy or fast stretching loads.' },
      { area: 'Glute', tier: 'watch', note: "Strong glutes share the hamstrings' workload." },
      { area: 'Lower back', tier: 'watch', note: 'Back stiffness can make the hamstrings feel tight.' },
      { area: 'Knee', tier: 'watch', note: 'Loaded knee bending works the hamstring directly.' },
    ],
  },
  {
    id: 'hip-adductor',
    group: 'Hip and groin',
    name: 'Hip or adductor (groin) strain',
    effects: [
      { area: 'Hip', tier: 'primary', note: 'Wide stances, lunges and sudden direction changes load the groin.' },
      { area: 'Glute', tier: 'watch', note: 'Glute strength steadies the hip.' },
      { area: 'Lower back', tier: 'watch', note: 'Hip stiffness can shift load to the lower back.' },
      { area: 'Knee', tier: 'watch', note: 'The inner thigh muscles run down towards the knee.' },
    ],
  },
  {
    id: 'lower-back-pain',
    group: 'Back',
    name: 'Lower back pain',
    central: true,
    effects: [
      { area: 'Lower back', tier: 'primary', note: 'Build loaded bending gradually and brace well.' },
      { area: 'Glute', tier: 'affected', note: 'Weak glutes push more work onto the back.', bothSides: true },
      { area: 'Hamstring', tier: 'watch', note: 'Tight hamstrings change pelvis position.', bothSides: true },
      { area: 'Abdomen', tier: 'watch', note: 'Core strength supports the spine.' },
    ],
  },
  {
    id: 'scapular-instability',
    group: 'Shoulder',
    name: 'Scapular (shoulder blade) instability',
    effects: [
      { area: 'Shoulder', tier: 'primary', note: 'Avoid overhead pressing until shoulder blade control improves.' },
      { area: 'Upper back', tier: 'affected', note: 'The shoulder blade muscles sit here and are the rehab focus.' },
      { area: 'Upper arm', tier: 'watch', note: 'Pressing and pulling load passes through the arm.' },
      { area: 'Neck', tier: 'watch', note: 'The upper traps often overwork to compensate.' },
    ],
  },
  {
    id: 'rotator-cuff',
    group: 'Shoulder',
    name: 'Rotator cuff irritation',
    effects: [
      { area: 'Shoulder', tier: 'primary', note: 'Overhead and behind-the-back positions often aggravate it.' },
      { area: 'Upper arm', tier: 'affected', note: 'The cuff tendons attach at the top of the arm.' },
      { area: 'Upper back', tier: 'watch', note: 'Shoulder blade position affects space for the cuff.' },
    ],
  },
  {
    id: 'elbow-tendon',
    group: 'Arm',
    name: "Tennis or golfer's elbow",
    effects: [
      { area: 'Elbow', tier: 'primary', note: 'Grip-heavy work loads the irritated tendon.' },
      { area: 'Forearm', tier: 'affected', note: "The tendon's muscle runs through the forearm." },
      { area: 'Wrist and hand', tier: 'watch', note: 'Grip and wrist position change elbow load.' },
    ],
  },
  {
    id: 'wrist-pain',
    group: 'Arm',
    name: 'Wrist pain',
    effects: [
      { area: 'Wrist and hand', tier: 'primary', note: 'Neutral grips and dumbbells are usually kinder than a barbell.' },
      { area: 'Forearm', tier: 'affected', note: 'Grip muscles load the wrist.' },
      { area: 'Elbow', tier: 'watch', note: 'Forearm tendons attach at the elbow.' },
    ],
  },
  {
    id: 'ankle-sprain',
    group: 'Ankle and foot',
    name: 'Ankle sprain',
    effects: [
      { area: 'Ankle and foot', tier: 'primary', note: 'Balance and landing need rebuilding.' },
      { area: 'Calf', tier: 'affected', note: 'Calf strength protects the ankle.' },
      { area: 'Knee', tier: 'watch', note: 'Ankle stiffness shifts load up to the knee.' },
    ],
  },
  {
    id: 'big-toe-control',
    group: 'Ankle and foot',
    name: 'Big toe or foot control',
    effects: [
      { area: 'Ankle and foot', tier: 'primary', note: 'Push-off and balance depend on big-toe control.' },
      { area: 'Calf', tier: 'watch', note: 'Calf raises through the big toe rebuild push-off.' },
    ],
  },
]

export const INJURY_GROUPS = [...new Set(INJURIES.map((injury) => injury.group))]
