const selectedRanges = {};
let simulationWorker = null, simulationTimer = null, simulationRevision = 0;
function refreshShowdown(player, labels) {
  selectedRanges[player] = labels;
  const revision = ++simulationRevision;
  clearTimeout(simulationTimer);
  if (simulationWorker) { simulationWorker.terminate(); simulationWorker = null; }
  const panel = document.querySelector('.equity-status');
  const status = document.getElementById('simulation-status');
  const summary = document.getElementById('equity-summary');
  for (const name of ['win', 'tie', 'loss']) {
    document.getElementById(`${name}-value`).textContent = '—';
    document.getElementById(`${name}-gauge`).style.setProperty('--progress', '0%');
  }
  summary.textContent = '';
  panel.setAttribute('aria-busy', 'false');
  if (!selectedRanges.hero || !selectedRanges.villain) return;
  if (!selectedRanges.hero.length || !selectedRanges.villain.length) {
    status.textContent = 'Selecione pelo menos uma mão em cada range para calcular os resultados.';
    return;
  }
  status.textContent = 'Atualizando os resultados para os ranges selecionados…';
  panel.setAttribute('aria-busy', 'true');
  simulationTimer = setTimeout(() => {
    const fail = message => { if (revision !== simulationRevision) return; panel.setAttribute('aria-busy', 'false'); status.textContent = message; if (simulationWorker) simulationWorker.terminate(); simulationWorker = null; };
    try {
      simulationWorker = new Worker('equity.js?v=showdown-1');
      simulationWorker.onerror = () => fail('Não foi possível executar a simulação. Abra o site por um servidor HTTP ou pelo GitHub Pages e recarregue a página.');
      simulationWorker.onmessage = ({ data }) => {
        if (revision !== simulationRevision) return;
        if (data.type === 'error') { fail(data.message); return; }
        if (data.type === 'progress') { status.textContent = `Simulando boards: ${data.completed.toLocaleString('pt-BR')} de ${data.samples.toLocaleString('pt-BR')}…`; return; }
        const values = [data.wins, data.ties, data.losses];
        // Largest-remainder rounding keeps the three displayed percentages at 100.0%.
        const tenths = values.map(n => n * 1000 / data.samples);
        const rounded = tenths.map(Math.floor);
        const order = [0, 1, 2].sort((a, b) => (tenths[b] - rounded[b]) - (tenths[a] - rounded[a]));
        for (let i = 0, remaining = 1000 - rounded.reduce((a, b) => a + b, 0); i < remaining; i++) rounded[order[i]]++;
        ['win', 'tie', 'loss'].forEach((name, i) => {
          document.getElementById(`${name}-value`).textContent = `${(rounded[i] / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
          document.getElementById(`${name}-gauge`).style.setProperty('--progress', `${values[i] / data.samples * 100}%`);
        });
        panel.setAttribute('aria-busy', 'false');
        status.textContent = `Estimativa concluída · ${data.samples.toLocaleString('pt-BR')} simulações · margem aproximada de 95%: até ±0,4 ponto percentual por resultado.`;
        const equity = (data.wins + data.ties / 2) / data.samples * 100;
        summary.textContent = `Equidade estimada do Hero: ${equity.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% (vitória + metade dos empates). ${data.validPairs.toLocaleString('pt-BR')} confrontos de combinações compatíveis.`;
        simulationWorker.terminate(); simulationWorker = null;
      };
      let seed = 2166136261;
      const hero = [...selectedRanges.hero].sort(), villain = [...selectedRanges.villain].sort();
      for (const char of `${hero.join(',')}|${villain.join(',')}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
      simulationWorker.postMessage({ hero, villain, samples: 60000, seed: seed >>> 0 });
    } catch (_) { fail('A simulação não está disponível neste navegador. Use um navegador atualizado e abra a página por HTTP.'); }
  }, 300);
}

function createRangeEditor(root, prefix) {
  const resolve = selector => selector.replace(/#([\w-]+)/g, (_, id) => `#${prefix}-${id}`);
  const q = selector => selector === '#math-current' ? document.getElementById(`${prefix}-math-current`) : root.querySelector(resolve(selector));
  const qa = selector => root.querySelectorAll(resolve(selector));
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
const slider = q('#range'), direction = q('#direction');
let inspected = null;
function detail() {
  if (!inspected) return;
  const h = inspected;
  q('#detail').textContent = `${h.label} · ${h.type === 'pair' ? 'Par' : h.type === 'suited' ? 'Cartas do mesmo naipe' : 'Cartas de naipes diferentes'} · ${h.combos} combinações · ${h.group === 'best' ? 'Grupo das melhores mãos' : h.group === 'worst' ? 'Grupo das piores mãos' : h.selected ? 'Dentro do range' : 'Fora do range'}.`;
}
for (const hand of hands) {
  const cell = document.createElement('button');
  cell.type = 'button'; cell.className = `cell ${hand.type}`; cell.textContent = hand.label;
  const inspect = () => { inspected = hand; detail(); };
  cell.addEventListener('mouseenter', inspect); cell.addEventListener('focus', inspect); cell.addEventListener('click', inspect);
  hand.cell = cell; q('#grid').append(cell);
}
const bestSlider = q('#best-range');
const worstSlider = q('#worst-range');
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
  const percentage = polarized ? Number(bestSlider.value) + 100 - Number(worstSlider.value) : Number(slider.value);
  hands.forEach(h => { h.selected = false; h.group = null; });
  let combos = 0, bestCombos = 0, worstCombos = 0;
  if (polarized) {
    bestCombos = selectPrefix(ranking, Number(bestSlider.value), 'best');
    worstCombos = selectPrefix([...ranking].reverse(), 100 - Number(worstSlider.value), 'worst');
    combos = bestCombos + worstCombos;
  } else combos = selectPrefix(direction.value === 'best' ? ranking : [...ranking].reverse(), percentage, null);
  q('.controls').classList.toggle('polarized', polarized);
  q('#polar-controls').hidden = !polarized;
  q('.polar-legend').hidden = !polarized;
  q('.legend').hidden = polarized;
  hands.forEach(h => {
    h.cell.classList.toggle('selected', h.selected);
    h.cell.classList.toggle('best-group', h.group === 'best');
    h.cell.classList.toggle('worst-group', h.group === 'worst');
    h.cell.setAttribute('aria-label', `${h.label}, ${h.combos} combinações, ${h.group === 'best' ? 'melhores mãos' : h.group === 'worst' ? 'piores mãos' : h.selected ? 'dentro do range' : 'fora do range'}`);
  });
  q('#value').textContent = percentage;
  q('#best-value').textContent = bestSlider.value + '%';
  q('#worst-value').textContent = (100 - Number(worstSlider.value)) + '%';
  q('#count').textContent = hands.filter(h => h.selected).length;
  q('#combos').textContent = combos.toLocaleString('pt-BR');
  const format = n => (n / 1326 * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  q('#precision').textContent = `Range efetivo: ${format(combos)}%` + (polarized ? ` · melhores ${format(bestCombos)}% + piores ${format(worstCombos)}%.` : ' · mãos completas.');
  q('#description').textContent = polarized ? 'Dois extremos. Um único range.' : direction.value === 'worst' ? 'Explore as mãos mais fracas do ranking.' : percentage <= 15 ? 'Poucas mãos. Muita força.' : percentage <= 30 ? 'Um range seletivo para começar.' : percentage < 70 ? 'Mais possibilidades entram no jogo.' : 'Um range amplo para explorar.';
  paintSlider(slider, '#a6ed8b');
  q('.dual-track').style.background = `linear-gradient(to right,#a6ed8b 0%,#a6ed8b ${bestSlider.value}%,#34404b ${bestSlider.value}%,#34404b ${worstSlider.value}%,#f5ae78 ${worstSlider.value}%,#f5ae78 100%)`;
  bestSlider.setAttribute('aria-valuetext', `${bestSlider.value}% melhores mãos`);
  worstSlider.setAttribute('aria-valuetext', `${100 - Number(worstSlider.value)}% piores mãos`);
  qa('[data-value]').forEach(b => { const active = Number(b.dataset.value) === percentage; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  q('#math-current').textContent = `${hands.filter(h => h.selected).length} tipos selecionados → ${combos.toLocaleString('pt-BR')} / 1.326 combinações × 100 = ${format(combos)}% de chance de receber uma mão deste range.` + (polarized ? ` Melhores: ${bestCombos} combinações; piores: ${worstCombos} combinações; total: ${bestCombos} + ${worstCombos} = ${combos}.` : '');
  detail();
  refreshShowdown(prefix, hands.filter(h => h.selected).map(h => h.label));
}
slider.addEventListener('input', update);
direction.addEventListener('change', update);
bestSlider.addEventListener('input', () => {
  bestSlider.value = Math.min(Number(bestSlider.value), Number(worstSlider.value));
  update();
});
worstSlider.addEventListener('input', () => {
  worstSlider.value = Math.max(Number(worstSlider.value), Number(bestSlider.value));
  update();
});
// When handles meet, keep the handle that can move toward the pointer on top.
const dual = q('.dual-slider');
dual.addEventListener('pointermove', event => {
  if (event.buttons) return;
  const rect = dual.getBoundingClientRect();
  const position = (event.clientX - rect.left) / rect.width * 100;
  const middle = (Number(bestSlider.value) + Number(worstSlider.value)) / 2;
  bestSlider.style.zIndex = position <= middle ? '3' : '2';
  worstSlider.style.zIndex = position > middle ? '3' : '2';
});
qa('[data-value]').forEach(b => b.addEventListener('click', () => { slider.value = b.dataset.value; update(); }));
update();

}
createRangeEditor(document.getElementById("hero"), "hero");
createRangeEditor(document.getElementById("villain"), "villain");
