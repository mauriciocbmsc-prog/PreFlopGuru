/* Card IDs: 0..51; rank = floor(id / 4) + 2; suit = id % 4. */
(function () {
  const ranks = 'AKQJT98765432';
  function expandRange(labels) {
    const combinations = [];
    for (const label of new Set(labels)) {
      const high = ranks.indexOf(label[0]), low = ranks.indexOf(label[1]);
      if (high < 0 || low < 0 || high > low || (high !== low && !['s', 'o'].includes(label[2]))) throw new Error('Range inválido.');
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        if (high === low ? a >= b : label[2] === 's' ? a !== b : a === b) continue;
        combinations.push([(12 - high) * 4 + a, (12 - low) * 4 + b]);
      }
    }
    return combinations;
  }
  function straightHigh(mask) {
    for (let high = 14; high >= 6; high--) if ((mask & (31 << (high - 4))) === (31 << (high - 4))) return high;
    return (mask & 16444) === 16444 ? 5 : 0; // A, 5, 4, 3, 2
  }
  function pack(category, values) {
    let score = category;
    for (let i = 0; i < 5; i++) score = score * 15 + (values[i] || 0);
    return score;
  }
  function evaluate7(cards) {
    const counts = new Uint8Array(15), suits = new Uint8Array(4), masks = new Uint16Array(4);
    let mask = 0;
    for (const card of cards) {
      const rank = (card >> 2) + 2, suit = card & 3;
      counts[rank]++; suits[suit]++; masks[suit] |= 1 << rank; mask |= 1 << rank;
    }
    let flush = -1;
    for (let s = 0; s < 4; s++) if (suits[s] >= 5) flush = s;
    if (flush >= 0) { const high = straightHigh(masks[flush]); if (high) return pack(8, [high]); }
    const quads = [], trips = [], pairs = [], all = [];
    for (let r = 14; r >= 2; r--) {
      if (counts[r]) all.push(r);
      if (counts[r] === 4) quads.push(r);
      if (counts[r] === 3) trips.push(r);
      if (counts[r] === 2) pairs.push(r);
    }
    if (quads.length) return pack(7, [quads[0], all.find(r => r !== quads[0])]);
    if (trips.length && (pairs.length || trips.length > 1)) return pack(6, [trips[0], Math.max(pairs[0] || 0, trips[1] || 0)]);
    if (flush >= 0) return pack(5, all.filter(r => masks[flush] & (1 << r)).slice(0, 5));
    const straight = straightHigh(mask);
    if (straight) return pack(4, [straight]);
    if (trips.length) return pack(3, [trips[0], ...all.filter(r => r !== trips[0]).slice(0, 2)]);
    if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1], all.find(r => r !== pairs[0] && r !== pairs[1])]);
    if (pairs.length) return pack(1, [pairs[0], ...all.filter(r => r !== pairs[0]).slice(0, 3)]);
    return pack(0, all.slice(0, 5));
  }
  function simulate({ hero, villain, samples = 60000, seed = 123456789 }, progress = () => {}) {
    if (!Number.isInteger(samples) || samples < 1) throw new Error('Número de simulações inválido.');
    const h = expandRange(hero), v = expandRange(villain);
    if (!h.length || !v.length) throw new Error('Selecione pelo menos uma mão em cada range.');
    const valid = new Uint32Array(h.length * v.length);
    let size = 0;
    for (let i = 0; i < h.length; i++) for (let j = 0; j < v.length; j++) {
      const [a, b] = h[i], [c, d] = v[j];
      if (a !== c && a !== d && b !== c && b !== d) valid[size++] = i * v.length + j;
    }
    if (!size) throw new Error('Não há confrontos sem cartas repetidas entre esses ranges.');
    // Mulberry32 gives repeatable samples for an unchanged pair of ranges.
    let state = seed >>> 0;
    const random = () => {
      let t = state += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    let wins = 0, ties = 0, losses = 0;
    const heroCards = new Array(7), villainCards = new Array(7);
    for (let n = 1; n <= samples; n++) {
      const encoded = valid[Math.floor(random() * size)];
      const hc = h[Math.floor(encoded / v.length)], vc = v[encoded % v.length];
      const used = [hc[0], hc[1], vc[0], vc[1]];
      heroCards[0] = hc[0]; heroCards[1] = hc[1]; villainCards[0] = vc[0]; villainCards[1] = vc[1];
      for (let i = 2; i < 7; i++) {
        let card;
        do { card = Math.floor(random() * 52); } while (used.includes(card));
        used.push(card); heroCards[i] = card; villainCards[i] = card;
      }
      const result = evaluate7(heroCards) - evaluate7(villainCards);
      if (result > 0) wins++; else if (result < 0) losses++; else ties++;
      if (n % 10000 === 0 && n < samples) progress({ completed: n, samples });
    }
    return { wins, ties, losses, samples, validPairs: size };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { expandRange, evaluate7, simulate };
  else self.onmessage = ({ data }) => {
    try { self.postMessage({ type: 'result', ...simulate(data, p => self.postMessage({ type: 'progress', ...p })) }); }
    catch (error) { self.postMessage({ type: 'error', message: error.message }); }
  };
})();
