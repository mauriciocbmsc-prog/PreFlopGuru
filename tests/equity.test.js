const { test } = require('node:test');
const assert = require('node:assert/strict');
const { expandRange, evaluate7, simulate } = require('../equity.js');
const card = text => '23456789TJQKA'.indexOf(text[0]) * 4 + 'cdhs'.indexOf(text[1]);
const cards = text => text.split(' ').map(card);
function referenceFive(hand) {
  const ranks = hand.map(c => (c >> 2) + 2).sort((a, b) => b - a);
  const unique = [...new Set(ranks)];
  const flush = hand.every(c => c % 4 === hand[0] % 4);
  const straight = unique.length === 5 && (unique[0] - unique[4] === 4 ? unique[0] : unique.join(',') === '14,5,4,3,2' ? 5 : 0);
  const groups = unique.map(r => [ranks.filter(x => x === r).length, r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let category, values;
  if (flush && straight) { category = 8; values = [straight]; }
  else if (groups[0][0] === 4) { category = 7; values = groups.map(g => g[1]); }
  else if (groups[0][0] === 3 && groups[1][0] === 2) { category = 6; values = groups.map(g => g[1]); }
  else if (flush) { category = 5; values = ranks; }
  else if (straight) { category = 4; values = [straight]; }
  else if (groups[0][0] === 3) { category = 3; values = groups.map(g => g[1]); }
  else if (groups[0][0] === 2 && groups[1][0] === 2) { category = 2; values = groups.map(g => g[1]); }
  else if (groups[0][0] === 2) { category = 1; values = groups.map(g => g[1]); }
  else { category = 0; values = ranks; }
  return String(category) + values.map(v => v.toString(16)).join('').padEnd(5, '0');
}
function referenceSeven(hand) {
  let best = '';
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const value = referenceFive(hand.filter((_, i) => i !== a && i !== b));
    if (value > best) best = value;
  }
  return best;
}
function asReference(score) {
  const values = [];
  for (let i = 0; i < 5; i++) { values.unshift((score % 15).toString(16)); score = Math.floor(score / 15); }
  return String(score) + values.join('');
}
test('range expansion contains exactly 1,326 distinct unordered combinations', () => {
  const labels = [], ranks = 'AKQJT98765432';
  for (let a = 0; a < 13; a++) for (let b = a; b < 13; b++) {
    if (a === b) labels.push(ranks[a] + ranks[b]); else for (const type of ['s', 'o']) labels.push(ranks[a] + ranks[b] + type);
  }
  const expanded = expandRange(labels);
  assert.equal(expanded.length, 1326);
  assert.equal(new Set(expanded.map(h => h.sort((a, b) => a - b).join(','))).size, 1326);
  for (const [label, count] of [['AA', 6], ['AKs', 4], ['AKo', 12]]) assert.equal(expandRange([label]).length, count);
});
test('showdown handles wheel, board ties, two trips, three pairs and flush kickers', () => {
  for (const text of ['As 2s 3s 4s 5s Kd Qh', 'As Ah Ad Ks Kh Kd 2c', 'As Ah Ks Kh Qs Qh 2d', 'As Js 9s 7s 4s 2s Kh', 'As 2d 3c 4h 5s 6s 7d']) {
    const hand = cards(text);
    assert.equal(asReference(evaluate7(hand)), referenceSeven(hand));
  }
  assert.equal(evaluate7(cards('2c 3d As Ks Qs Js Ts')), evaluate7(cards('4h 5h As Ks Qs Js Ts')));
  assert(evaluate7(cards('As Ks Qs Js Ts 2d 3c')) > evaluate7(cards('Ac Ad Ah As Kd 2s 3s')));
});
test('seven-card evaluator agrees with independent best-of-21 five-card reference', () => {
  let seed = 17;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let n = 0; n < 2000; n++) {
    const hand = [];
    while (hand.length < 7) { const c = Math.floor(random() * 52); if (!hand.includes(c)) hand.push(c); }
    assert.equal(asReference(evaluate7(hand)), referenceSeven(hand));
  }
});
test('all 2,598,960 five-card hands match known category frequencies', () => {
  const histogram = new Array(9).fill(0), hand = new Array(5);
  for (let a = 0; a < 48; a++) for (let b = a + 1; b < 49; b++) for (let c = b + 1; c < 50; c++) for (let d = c + 1; d < 51; d++) for (let e = d + 1; e < 52; e++) {
    hand[0] = a; hand[1] = b; hand[2] = c; hand[3] = d; hand[4] = e;
    histogram[Math.floor(evaluate7(hand) / 15 ** 5)]++;
  }
  assert.deepEqual(histogram, [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
});
test('simulation weights valid combinations and produces reproducible known matchups', () => {
  const aces = simulate({ hero: ['AA'], villain: ['KK'], samples: 40000, seed: 42 });
  assert.equal(aces.validPairs, 36);
  assert(Math.abs((aces.wins + aces.ties / 2) / aces.samples - 0.8195) < 0.012);
  assert.equal(aces.wins + aces.ties + aces.losses, aces.samples);
  const mirrored = simulate({ hero: ['AA'], villain: ['AA'], samples: 1000, seed: 2 });
  assert.equal(mirrored.validPairs, 6);
  // AA vs AA usually ties, but one player can still make a flush.
  assert(mirrored.ties > 900);
  assert(Math.abs(mirrored.wins - mirrored.losses) < 35);
  const input = { hero: ['AKs', 'AA'], villain: ['AKo', 'KK'], samples: 3000, seed: 31 };
  assert.deepEqual(simulate(input), simulate(input));
  assert.throws(() => simulate({ hero: [], villain: ['AA'] }), /Selecione/);
});
test('identical wide ranges have symmetric outcomes within sampling uncertainty', () => {
  const labels = ['AA', 'AKs', 'AKo', '22', '72o', '54s'];
  const result = simulate({ hero: labels, villain: labels, samples: 40000, seed: 19 });
  assert(Math.abs((result.wins - result.losses) / result.samples) < 0.018);
});
