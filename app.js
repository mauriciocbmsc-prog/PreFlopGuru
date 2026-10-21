const ranks = 'AKQJT98765432';
const points = [10, 8, 7, 6, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];
const hands = [];
for (let row = 0; row < 13; row++) for (let col = 0; col < 13; col++) {
  const high = Math.min(row, col), low = Math.max(row, col);
  const type = row === col ? 'pair' : row < col ? 'suited' : 'offsuit';
  const gap = low - high - 1;
  let score = type === 'pair' ? Math.max(5, points[high] * 2) : points[high] + (type === 'suited' ? 2 : 0) - ([0, 1, 2, 4][gap] ?? 5);
  if (type !== 'pair' && gap <= 1 && points[high] < 7) score++;
  hands.push({ high, low, type, score, label: ranks[high] + ranks[low] + (type === 'pair' ? '' : type === 'suited' ? 's' : 'o'), combos: type === 'pair' ? 6 : type === 'suited' ? 4 : 12 });
}
const ranking = [...hands].sort((a, b) => b.score - a.score || a.high - b.high || a.low - b.low || a.label.localeCompare(b.label));
const slider = document.querySelector('#range'), direction = document.querySelector('#direction');
let inspected = null;
function detail() {
  if (!inspected) return;
  const h = inspected;
  document.querySelector('#detail').textContent = `${h.label} · ${h.type === 'pair' ? 'Par' : h.type === 'suited' ? 'Cartas do mesmo naipe' : 'Cartas de naipes diferentes'} · ${h.combos} combinações · ${h.selected ? 'Dentro' : 'Fora'} do range.`;
}
for (const hand of hands) {
  const cell = document.createElement('button');
  cell.type = 'button'; cell.className = `cell ${hand.type}`; cell.textContent = hand.label;
  const inspect = () => { inspected = hand; detail(); };
  cell.addEventListener('mouseenter', inspect); cell.addEventListener('focus', inspect); cell.addEventListener('click', inspect);
  hand.cell = cell; document.querySelector('#grid').append(cell);
}
function update() {
  const percentage = Number(slider.value), target = percentage * 1326 / 100;
  const ordered = direction.value === 'best' ? ranking : [...ranking].reverse();
  let combos = 0, count = 0;
  hands.forEach(h => { h.selected = false; });
  for (const hand of ordered) {
    if (Math.abs(combos + hand.combos - target) > Math.abs(combos - target)) break;
    combos += hand.combos; count++; hand.selected = true;
  }
  hands.forEach(h => { h.cell.classList.toggle('selected', h.selected); h.cell.setAttribute('aria-label', `${h.label}, ${h.combos} combinações, ${h.selected ? 'dentro' : 'fora'} do range`); });
  document.querySelector('#value').textContent = percentage;
  document.querySelector('#count').textContent = count;
  document.querySelector('#combos').textContent = combos.toLocaleString('pt-BR');
  document.querySelector('#precision').textContent = `Range efetivo: ${(combos / 1326 * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% · mãos completas.`;
  document.querySelector('#description').textContent = direction.value === 'worst' ? 'Explore as mãos mais fracas do ranking.' : percentage <= 15 ? 'Poucas mãos. Muita força.' : percentage <= 30 ? 'Um range seletivo para começar.' : percentage < 70 ? 'Mais possibilidades entram no jogo.' : 'Um range amplo para explorar.';
  slider.style.background = `linear-gradient(to right,#a6ed8b ${percentage}%,#34404b ${percentage}%)`;
  document.querySelectorAll('[data-value]').forEach(b => { const active = Number(b.dataset.value) === percentage; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  detail();
}
slider.addEventListener('input', update); direction.addEventListener('change', update);
document.querySelectorAll('[data-value]').forEach(b => b.addEventListener('click', () => { slider.value = b.dataset.value; update(); }));
update();
