// Body shapes for the body map. Every figure shares the same muscles; the female figure is the
// detailed figure smoothly reshaped (narrower shoulders, a defined waist, wider hips, a fuller chest),
// so muscles, tendons and detail lines all stay lined up with each other.

const CENTRE = 100

// Smooth interpolation through [y, value] pairs
function profile(stops, y) {
  if (y <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [y1, v1] = stops[i]
    if (y <= y1) {
      const [y0, v0] = stops[i - 1]
      const t = (y - y0) / (y1 - y0)
      return v0 + (v1 - v0) * t * t * (3 - 2 * t)
    }
  }
  return stops.at(-1)[1]
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// How wide the torso and legs are at each height, compared with the male figure
const TORSO = [
  [0, 0.95],
  [34, 0.92],
  [50, 0.88],
  [64, 0.87],
  [100, 0.86],
  [118, 0.84],
  [138, 0.78],
  [160, 0.98],
  [180, 1.12],
  [205, 1.1],
  [240, 1.03],
  [265, 0.97],
  [400, 0.95],
]
// How far the arms move in towards the body at each height (they follow the narrower shoulders)
const ARM_SHIFT = [
  [60, 7],
  [150, 6.6],
  [205, 4],
  [250, 4],
]

export function femaleWarp([x, y]) {
  const side = x < CENTRE ? -1 : 1
  const out = Math.abs(x - CENTRE)
  const torso = out * profile(TORSO, y)
  const arm = out - profile(ARM_SHIFT, y)
  // Arms hang away from the body below the armpit; blend smoothly between the two
  const armWeight = smoothstep(31, 37, out) * smoothstep(64, 76, y) * (1 - smoothstep(240, 250, y))
  let wide = torso * (1 - armWeight) + arm * armWeight
  if (y < 76 && out > 37) wide = Math.min(torso, arm)
  // A fuller, rounder chest: the lower chest swells down and slightly out
  const dx = (out - 18) / 15
  const dy = (y - 92) / 13
  const bump = Math.exp(-(dx * dx + dy * dy))
  wide += bump * 2 * smoothstep(4, 14, out)
  const lift = bump * 4.5
  return [+(CENTRE + side * wide).toFixed(2), +(y + lift).toFixed(2)]
}

// Tied-back hair: a bun on top, and the back of the head covered on the back view
export const FEMALE_HAIR = {
  back:
    'M100,1.2 C108,0.6 115,4 117.6,11 C119.6,17 119.2,24 117,30.6 C114.4,37.4 108.6,40.6 100,40.8 C91.4,40.6 85.6,37.4 83,30.6 C80.8,24 80.4,17 82.4,11 C85,4 92,0.6 100,1.2Z',
  bun: 'M100,-6.4 C105.2,-6.4 108.4,-3.6 108.4,0.4 C108.4,4.2 105,6.4 100,6.4 C95,6.4 91.6,4.2 91.6,0.4 C91.6,-3.6 94.8,-6.4 100,-6.4Z',
}

export const BODY_TYPES = [
  { id: 'male', label: 'Male', warp: (point) => point },
  { id: 'female', label: 'Female', warp: femaleWarp },
]
