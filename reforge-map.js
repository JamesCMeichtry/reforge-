// Reforge body map engine: levelling + injury states, saved in the browser.
// Mark each muscle shape in your map with data-muscle="some-id", then call Reforge.render().
(function () {
  const KEY = 'reforge.map.v1';
  const DAY = 86400000;

  // Total XP needed for each level: 0 untrained, 1 bronze, 2 silver, 3 gold
  const LEVELS = [0, 300, 1000, 3000];
  const LEVEL_NAMES = ['Untrained', 'Bronze', 'Silver', 'Gold'];
  const INJURY_NAMES = { red: 'Injured', amber: 'Recovering', yellow: 'Monitor' };

  const DECAY_AFTER_DAYS = 21;   // untrained this long before XP starts fading
  const DECAY_PER_DAY = 0.02;    // 2% of XP lost per day after that
  const CHECKIN_BONUS = 5;       // XP per trained muscle for a post-session check-in
  const STREAK_GAP_DAYS = 3;     // sessions within this many days keep a streak going

  let state = load();
  let pending = []; // muscles to animate a pop on next render

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.muscles) return s;
    } catch (e) {}
    return { muscles: {}, streak: 0, lastSession: null, lastSessionMuscles: [] };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function m(id) {
    if (!state.muscles[id]) state.muscles[id] = { xp: 0, injury: null, lastTrained: null, decayedTo: null };
    return state.muscles[id];
  }

  function levelFor(xp) {
    let l = 0;
    for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i;
    return l;
  }

  function applyDecay(now) {
    now = now || Date.now();
    Object.values(state.muscles).forEach(mu => {
      if (!mu.lastTrained || mu.xp <= 0) return;
      const start = mu.lastTrained + DECAY_AFTER_DAYS * DAY;
      const from = Math.max(start, mu.decayedTo || 0);
      const days = Math.floor((now - from) / DAY);
      if (days > 0) {
        mu.xp = Math.round(mu.xp * Math.pow(1 - DECAY_PER_DAY, days));
        mu.decayedTo = from + days * DAY;
      }
    });
  }

  // session = { date?: ms, exercises: [{ muscles: ['quads'], sets: 4, rpe: 8, rehab: false }] }
  // Returns a list of events, e.g. { type: 'levelup', muscle, level, name }
  function logSession(session) {
    const now = session.date || Date.now();
    applyDecay(now);
    const events = [];

    state.streak = state.lastSession && now - state.lastSession <= STREAK_GAP_DAYS * DAY ? state.streak + 1 : 1;
    state.lastSession = now;
    const streakBonus = 1 + Math.min(state.streak, 10) * 0.02; // up to +20%

    const gains = {};
    (session.exercises || []).forEach(ex => {
      const sets = Math.max(0, Number(ex.sets) || 0);
      const rpe = Math.min(10, Math.max(1, Number(ex.rpe) || 7));
      (ex.muscles || []).forEach(id => {
        const mu = m(id);
        let mult = 1;
        if (mu.injury === 'red') {
          if (!ex.rehab) {
            events.push({ type: 'blocked', muscle: id, message: 'No XP from normal training on a red area. Rehab work only.' });
            return;
          }
          mult = 0.5;
        } else if (mu.injury) {
          mult = 0.5;
        }
        gains[id] = (gains[id] || 0) + sets * rpe * mult * streakBonus;
      });
    });

    Object.keys(gains).forEach(id => {
      const mu = m(id);
      const before = levelFor(mu.xp);
      mu.xp = Math.round(mu.xp + gains[id]);
      mu.lastTrained = now;
      mu.decayedTo = null;
      const after = levelFor(mu.xp);
      if (after > before) {
        events.push({ type: 'levelup', muscle: id, level: after, name: LEVEL_NAMES[after] });
        if (!mu.injury) pending.push(id);
      }
    });

    state.lastSessionMuscles = Object.keys(gains);
    save();
    return events;
  }

  // checkIn = { painBefore: 0-10, painAfter: 0-10, flared: ['quads'] }
  // Gives a small XP bonus and nudges flared areas up one warning step.
  function checkIn(c) {
    const events = [];
    (state.lastSessionMuscles || []).forEach(id => {
      const mu = m(id);
      if (mu.injury !== 'red') mu.xp += CHECKIN_BONUS;
    });
    (c.flared || []).forEach(id => {
      const mu = m(id);
      const prev = mu.injury;
      if (!prev) mu.injury = 'yellow';
      else if (prev === 'yellow') mu.injury = 'amber';
      if (mu.injury !== prev) events.push({ type: 'flare', muscle: id, injury: mu.injury, name: INJURY_NAMES[mu.injury] });
    });
    state.lastSessionMuscles = [];
    save();
    return events;
  }

  function setInjury(id, level) {
    m(id).injury = level === 'red' || level === 'amber' || level === 'yellow' ? level : null;
    if (!m(id).injury) pending.push(id);
    save();
  }

  function stepRecovery(id) {
    const mu = m(id);
    const next = { red: 'amber', amber: 'yellow', yellow: null };
    if (!mu.injury) return null;
    mu.injury = next[mu.injury];
    if (!mu.injury) pending.push(id);
    save();
    return mu.injury;
  }

  function info(id) {
    applyDecay();
    const mu = m(id);
    const level = levelFor(mu.xp);
    const next = LEVELS[level + 1];
    return {
      id,
      xp: mu.xp,
      level,
      levelName: LEVEL_NAMES[level],
      injury: mu.injury,
      injuryName: mu.injury ? INJURY_NAMES[mu.injury] : null,
      nextLevelXp: next == null ? null : next,
      progress: next == null ? 1 : (mu.xp - LEVELS[level]) / (next - LEVELS[level])
    };
  }

  function render(root) {
    applyDecay();
    save();
    const els = (root || document).querySelectorAll('[data-muscle]');
    els.forEach(el => {
      const i = info(el.getAttribute('data-muscle'));
      el.classList.add('rf-muscle');
      el.classList.remove('rf-l0', 'rf-l1', 'rf-l2', 'rf-l3', 'rf-red', 'rf-amber', 'rf-yellow');
      el.classList.add(i.injury ? 'rf-' + i.injury : 'rf-l' + i.level);
      el.setAttribute('aria-label', i.id + ': ' + (i.injuryName || i.levelName));
      if (pending.includes(i.id)) {
        el.classList.remove('rf-pop');
        void el.getBoundingClientRect();
        el.classList.add('rf-pop');
        setTimeout(() => el.classList.remove('rf-pop'), 550);
      }
    });
    pending = [];
  }

  function reset() {
    state = { muscles: {}, streak: 0, lastSession: null, lastSessionMuscles: [] };
    save();
  }

  window.Reforge = { logSession, checkIn, setInjury, stepRecovery, info, render, reset, LEVELS, LEVEL_NAMES };
})();
