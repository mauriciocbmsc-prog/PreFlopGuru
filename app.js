const selectedRanges = {};
let simulationWorker = null, simulationTimer = null, simulationRevision = 0;
function renderParticipation(entry, showdown = null) {
  const format = value => value > 0 && value < 0.0001 ? '<0,01%' : `${(value * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  for (const [id, value] of Object.entries({ both: entry.both, 'hero-only': entry.heroOnly, 'villain-only': entry.villainOnly, neither: entry.neither })) document.getElementById(`entry-${id}`).textContent = format(value);
  const outcomes = PokerMath.overallOutcomes(entry, showdown);
  for (const name of ['hero', 'tie', 'villain', 'neither']) document.getElementById(`overall-${name}`).textContent = outcomes ? format(outcomes[name]) : name === 'neither' ? format(entry.neither) : '—';
  document.getElementById('participation-status').textContent = outcomes ? (entry.both ? 'Cenários de entrada calculados exatamente; resultados gerais usam a estimativa do showdown. Percentuais podem somar ligeiramente diferente de 100% por arredondamento.' : 'Sem confrontos entre os ranges: resultados gerais calculados exatamente, sem simular showdown.') : 'Cenários de entrada calculados. Aguardando a simulação para os resultados gerais…';
  document.getElementById('pot-share').textContent = outcomes ? `Fração média do pote distribuída por rodada: Hero ${format(outcomes.hero + outcomes.tie / 2)} · Villain ${format(outcomes.villain + outcomes.tie / 2)} · não atribuído ${format(outcomes.neither)}. Não é lucro ou retorno financeiro.` : '';
}
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
  const entry = PokerMath.participation(selectedRanges.hero, selectedRanges.villain);
  renderParticipation(entry);
  if (!selectedRanges.hero.length || !selectedRanges.villain.length) {
    status.textContent = 'Selecione pelo menos uma mão em cada range para calcular os resultados.';
    return;
  }
  status.textContent = 'Atualizando os resultados para os ranges selecionados…';
  panel.setAttribute('aria-busy', 'true');
  simulationTimer = setTimeout(() => {
    const fail = message => { if (revision !== simulationRevision) return; panel.setAttribute('aria-busy', 'false'); status.textContent = message; document.getElementById('participation-status').textContent = 'Cenários de participação calculados. Os resultados gerais que dependem do showdown estão indisponíveis porque a simulação falhou.'; if (simulationWorker) simulationWorker.terminate(); simulationWorker = null; };
    try {
      simulationWorker = new Worker('equity.js?v=participation-1');
      simulationWorker.onerror = () => fail('Não foi possível executar a simulação. Abra o site por um servidor HTTP ou pelo GitHub Pages e recarregue a página.');
      simulationWorker.onmessage = ({ data }) => {
        if (revision !== simulationRevision) return;
        if (data.type === 'error') { fail(data.message); return; }
        if (data.type === 'progress') { status.textContent = `Simulando boards: ${data.completed.toLocaleString('pt-BR')} de ${data.samples.toLocaleString('pt-BR')}…`; return; }
        renderParticipation(entry, data);
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

function createRangeEditor(root, prefix, onChange = refreshShowdown) {
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
let lastAutomaticMode = 'best';
function detail() {
  if (!inspected) return;
  const h = inspected;
  q('#detail').textContent = `${h.label} · ${h.type === 'pair' ? 'Par' : h.type === 'suited' ? 'Cartas do mesmo naipe' : 'Cartas de naipes diferentes'} · ${h.combos} combinações · ${h.group === 'best' ? 'Grupo das melhores mãos' : h.group === 'worst' ? 'Grupo das piores mãos' : h.selected ? 'Dentro do range' : 'Fora do range'}.`;
}
for (const hand of hands) {
  const cell = document.createElement('button');
  cell.type = 'button'; cell.className = `cell ${hand.type}`; cell.textContent = hand.label;
  const inspect = () => { inspected = hand; detail(); };
  cell.addEventListener('mouseenter', inspect); cell.addEventListener('focus', inspect);
  cell.addEventListener('click', () => {
    if (direction.value !== 'manual') lastAutomaticMode = direction.value;
    direction.value = 'manual';
    hand.selected = !hand.selected;
    inspected = hand;
    update();
  });
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
  const manual = direction.value === 'manual';
  const polarized = direction.value === 'polarized';
  if (!manual) lastAutomaticMode = direction.value;
  const manualCombos = hands.filter(h => h.selected).reduce((sum, h) => sum + h.combos, 0);
  const percentage = manual ? manualCombos / 1326 * 100 : polarized ? Number(bestSlider.value) + 100 - Number(worstSlider.value) : Number(slider.value);
  hands.forEach(h => { if (!manual) h.selected = false; h.group = null; });
  let combos = 0, bestCombos = 0, worstCombos = 0;
  if (manual) combos = manualCombos;
  else if (polarized) {
    bestCombos = selectPrefix(ranking, Number(bestSlider.value), 'best');
    worstCombos = selectPrefix([...ranking].reverse(), 100 - Number(worstSlider.value), 'worst');
    combos = bestCombos + worstCombos;
  } else combos = selectPrefix(direction.value === 'best' ? ranking : [...ranking].reverse(), percentage, null);
  q('.controls').classList.toggle('polarized', polarized);
  q('.controls').classList.toggle('manual', manual);
  q('#manual-help').hidden = !manual;
  q('#polar-controls').hidden = !polarized;
  q('.polar-legend').hidden = !polarized;
  q('.legend').hidden = polarized;
  hands.forEach(h => {
    h.cell.classList.toggle('selected', h.selected);
    h.cell.setAttribute('aria-pressed', String(h.selected));
    h.cell.title = `${h.selected ? 'Remover' : 'Adicionar'} ${h.label} ${h.selected ? 'do' : 'ao'} range`;
    h.cell.classList.toggle('best-group', h.group === 'best');
    h.cell.classList.toggle('worst-group', h.group === 'worst');
    h.cell.setAttribute('aria-label', `${h.label}, ${h.combos} combinações, ${h.group === 'best' ? 'melhores mãos' : h.group === 'worst' ? 'piores mãos' : h.selected ? 'dentro do range' : 'fora do range'}`);
  });
  q('#value').textContent = manual ? percentage.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : percentage;
  q('#best-value').textContent = bestSlider.value + '%';
  q('#worst-value').textContent = (100 - Number(worstSlider.value)) + '%';
  q('#count').textContent = hands.filter(h => h.selected).length;
  q('#combos').textContent = combos.toLocaleString('pt-BR');
  const format = n => (n / 1326 * 100).toLocaleString('pt-BR', { maximumFractionDigits: manual ? 2 : 1 });
  q('#precision').textContent = `Range efetivo: ${format(combos)}%` + (manual ? ' · seleção manual.' : '') + (polarized ? ` · melhores ${format(bestCombos)}% + piores ${format(worstCombos)}%.` : ' · mãos completas.');
  q('#description').textContent = manual ? 'Seu range personalizado, mão por mão.' : polarized ? 'Dois extremos. Um único range.' : direction.value === 'worst' ? 'Explore as mãos mais fracas do ranking.' : percentage <= 15 ? 'Poucas mãos. Muita força.' : percentage <= 30 ? 'Um range seletivo para começar.' : percentage < 70 ? 'Mais possibilidades entram no jogo.' : 'Um range amplo para explorar.';
  paintSlider(slider, '#a6ed8b');
  q('.dual-track').style.background = `linear-gradient(to right,#a6ed8b 0%,#a6ed8b ${bestSlider.value}%,#34404b ${bestSlider.value}%,#34404b ${worstSlider.value}%,#f5ae78 ${worstSlider.value}%,#f5ae78 100%)`;
  bestSlider.setAttribute('aria-valuetext', `${bestSlider.value}% melhores mãos`);
  worstSlider.setAttribute('aria-valuetext', `${100 - Number(worstSlider.value)}% piores mãos`);
  qa('[data-value]').forEach(b => { const active = !manual && Number(b.dataset.value) === percentage; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  q('#math-current').textContent = `${hands.filter(h => h.selected).length} tipos selecionados → ${combos.toLocaleString('pt-BR')} / 1.326 combinações × 100 = ${format(combos)}% de chance de receber uma mão deste range.` + (polarized ? ` Melhores: ${bestCombos} combinações; piores: ${worstCombos} combinações; total: ${bestCombos} + ${worstCombos} = ${combos}.` : '');
  detail();
  onChange(prefix, hands.filter(h => h.selected).map(h => h.label));
}
slider.addEventListener('input', update);
direction.addEventListener('change', update);
q('#restore-sliders').addEventListener('click', () => {
  direction.value = lastAutomaticMode;
  update();
  direction.focus();
});
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

const tablePositions = [
  { key: 'utg', label: 'UTG', name: 'Under the gun' },
  { key: 'hj', label: 'HJ', name: 'Hijack' },
  { key: 'co', label: 'CO', name: 'Cutoff' },
  { key: 'btn', label: 'BTN', name: 'Botão' },
  { key: 'sb', label: 'SB', name: 'Small blind' },
  { key: 'bb', label: 'BB', name: 'Big blind' }
];
let activeSeat = 'utg', tableInitialized = false;
const tableRanges = new Map();
function updateSeatRange(key, labels) {
  tableRanges.set(key, labels);
  const count = labels.reduce((sum, label) => sum + (label.length === 2 ? 6 : label[2] === 's' ? 4 : 12), 0);
  const percent = (count / 1326 * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  document.getElementById(`seat-percent-${key}`).textContent = `${percent}%`;
  document.getElementById(`seat-combos-${key}`).textContent = `${labels.length} mãos · ${count} combos`;
  const position = tablePositions.find(p => p.key === key);
  document.getElementById(`seat-${key}`).setAttribute('aria-label', `${position.label}, ${position.name}: ${percent}%, ${labels.length} tipos de mãos e ${count} combinações. Clique para editar.`);
  if (activeSeat === key) document.getElementById('seat-edit-status').textContent = `${position.label}: ${labels.length} tipos de mãos, ${count} combinações, ${percent}% das mãos iniciais.`;
}
function selectSeat(key) {
  activeSeat = key;
  const index = tablePositions.findIndex(p => p.key === key), position = tablePositions[index];
  for (const seat of tablePositions) {
    document.getElementById(`seat-${seat.key}`).setAttribute('aria-pressed', String(seat.key === key));
    document.getElementById(`editor-${seat.key}`).hidden = seat.key !== key;
  }
  document.getElementById('active-seat-title').textContent = `${position.label} · ${position.name}`;
  document.getElementById('active-seat-number').textContent = `Jogador ${index + 1} de 6`;
  updateSeatRange(key, tableRanges.get(key));
}
function initializeTable() {
  if (tableInitialized) return;
  const template = document.getElementById('seat-editor-template');
  for (const seat of tablePositions) {
    const editor = document.createElement('div');
    editor.className = 'player-panel table-range-editor';
    editor.id = `editor-${seat.key}`;
    editor.hidden = seat.key !== activeSeat;
    editor.setAttribute('role', 'group');
    editor.setAttribute('aria-label', `Range da posição ${seat.label}`);
    editor.append(template.content.cloneNode(true));
    for (const element of editor.querySelectorAll('[id], [for]')) {
      for (const attribute of ['id', 'for']) if (element.hasAttribute(attribute)) element.setAttribute(attribute, element.getAttribute(attribute).replace(/^seat-/, `${seat.key}-`));
    }
    editor.querySelector('[data-role="grid"]').setAttribute('aria-label', `Mãos iniciais da posição ${seat.label}`);
    document.getElementById('seat-editors').append(editor);
    createRangeEditor(editor, seat.key, updateSeatRange);
    document.getElementById(`seat-${seat.key}`).addEventListener('click', () => selectSeat(seat.key));
  }
  tableInitialized = true;
  selectSeat(activeSeat);
}
const viewTabs = [...document.querySelectorAll('.view-tabs [role="tab"]')];
function selectView(tab) {
  if (tab.id === 'tab-six') initializeTable();
  document.querySelector('.math-live').hidden = tab.id === 'tab-six';
  for (const current of viewTabs) {
    const active = current === tab;
    current.setAttribute('aria-selected', String(active)); current.tabIndex = active ? 0 : -1;
    document.getElementById(current.getAttribute('aria-controls')).hidden = !active;
  }
}
for (const tab of viewTabs) {
  tab.addEventListener('click', () => selectView(tab));
  tab.addEventListener('keydown', event => {
    const index = viewTabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? viewTabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % viewTabs.length : event.key === 'ArrowLeft' ? (index + viewTabs.length - 1) % viewTabs.length : -1;
    if (next >= 0) { event.preventDefault(); selectView(viewTabs[next]); viewTabs[next].focus(); }
  });
}
