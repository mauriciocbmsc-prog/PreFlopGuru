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
  document.querySelector('#detail').textContent = `${h.label} · ${h.type === 'pair' ? 'Par' : h.type === 'suited' ? 'Cartas do mesmo naipe' : 'Cartas de naipes diferentes'} · ${h.combos} combinações · ${h.group === 'best' ? 'Grupo das melhores mãos' : h.group === 'worst' ? 'Grupo das piores mãos' : h.selected ? 'Dentro do range' : 'Fora do range'}.`;
}
for (const hand of hands) {
  const cell = document.createElement('button');
  cell.type = 'button'; cell.className = `cell ${hand.type}`; cell.textContent = hand.label;
  const inspect = () => { inspected = hand; detail(); };
  cell.addEventListener('mouseenter', inspect); cell.addEventListener('focus', inspect); cell.addEventListener('click', inspect);
  hand.cell = cell; document.querySelector('#grid').append(cell);
}
const bestSlider = document.querySelector('#best-range');
const worstSlider = document.querySelector('#worst-range');
function selectPrefix(ordered, percentage, group) {
  const target = percentage * 1326 / 100;
  let combos = 0;
  for (const hand of ordered) {
    if (hand.selected || Math.abs(combos + hand.combos - target) > Math.abs(combos - target)) break;
    combos += hand.combos; hand.selected = true; hand.group = group;
  }
  return combos;
}
function paintSlider(element, color) {
  element.style.background = `linear-gradient(to right,${color} ${element.value}%,#34404b ${element.value}%)`;
}
function update() {
  const polarized = direction.value === 'polarized';
  const percentage = polarized ? Number(bestSlider.value) + Number(worstSlider.value) : Number(slider.value);
  hands.forEach(h => { h.selected = false; h.group = null; });
  let combos = 0, bestCombos = 0, worstCombos = 0;
  if (polarized) {
    bestCombos = selectPrefix(ranking, Number(bestSlider.value), 'best');
    worstCombos = selectPrefix([...ranking].reverse(), Number(worstSlider.value), 'worst');
    combos = bestCombos + worstCombos;
  } else combos = selectPrefix(direction.value === 'best' ? ranking : [...ranking].reverse(), percentage, null);
  document.querySelector('.controls').classList.toggle('polarized', polarized);
  document.querySelector('#polar-controls').hidden = !polarized;
  document.querySelector('.polar-legend').hidden = !polarized;
  document.querySelector('.legend').hidden = polarized;
  hands.forEach(h => {
    h.cell.classList.toggle('selected', h.selected);
    h.cell.classList.toggle('best-group', h.group === 'best');
    h.cell.classList.toggle('worst-group', h.group === 'worst');
    h.cell.setAttribute('aria-label', `${h.label}, ${h.combos} combinações, ${h.group === 'best' ? 'melhores mãos' : h.group === 'worst' ? 'piores mãos' : h.selected ? 'dentro do range' : 'fora do range'}`);
  });
  document.querySelector('#value').textContent = percentage;
  document.querySelector('#best-value').textContent = bestSlider.value + '%';
  document.querySelector('#worst-value').textContent = worstSlider.value + '%';
  document.querySelector('#count').textContent = hands.filter(h => h.selected).length;
  document.querySelector('#combos').textContent = combos.toLocaleString('pt-BR');
  const format = n => (n / 1326 * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  document.querySelector('#precision').textContent = `Range efetivo: ${format(combos)}%` + (polarized ? ` · melhores ${format(bestCombos)}% + piores ${format(worstCombos)}%.` : ' · mãos completas.');
  document.querySelector('#description').textContent = polarized ? 'Dois extremos. Um único range.' : direction.value === 'worst' ? 'Explore as mãos mais fracas do ranking.' : percentage <= 15 ? 'Poucas mãos. Muita força.' : percentage <= 30 ? 'Um range seletivo para começar.' : percentage < 70 ? 'Mais possibilidades entram no jogo.' : 'Um range amplo para explorar.';
  paintSlider(slider, '#a6ed8b'); paintSlider(bestSlider, '#a6ed8b'); paintSlider(worstSlider, '#f5ae78');
  document.querySelectorAll('[data-value]').forEach(b => { const active = Number(b.dataset.value) === percentage; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  detail();
}
slider.addEventListener('input', update);
direction.addEventListener('change', update);
for (const [changed, other] of [[bestSlider, worstSlider], [worstSlider, bestSlider]]) changed.addEventListener('input', () => {
  other.value = Math.min(Number(other.value), 100 - Number(changed.value));
  update();
});
document.querySelectorAll('[data-value]').forEach(b => b.addEventListener('click', () => { slider.value = b.dataset.value; update(); }));
update();
