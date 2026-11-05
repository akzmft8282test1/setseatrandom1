// 화면 그리기. 상태(app)를 받아 DOM을 다시 만들기만 해요. 상태를 바꾸는 일은 main.js가 맡아요.
import { $ } from './util.js';
import { partnerOf, isTogether, apartPairs } from './state.js';

const pairColor = (i) => `hsl(${(i * 53 + 12) % 360} 72% 52%)`;

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function defaultStatus(app) {
  const { students, state, layout, mode, sel } = app;
  if (mode === 'pair') {
    return sel
      ? `${sel} 선택됨 · 짝꿍으로 만들 학생을 누르세요. (같은 카드를 다시 누르면 취소)`
      : '짝꿍으로 만들 학생 두 명을 차례로 누르세요. 어디에 앉아 있든 상관없어요.';
  }
  if (mode === 'desk') {
    return sel !== null
      ? '자리를 바꿀 다른 책상을 누르세요.'
      : '책상(두 자리 한 쌍)을 눌러 다른 책상과 통째로 바꾸세요.';
  }
  const seated = state.seats.filter(Boolean).length;
  let t = `배치 ${seated}/${students.length}명`;
  if (students.length > layout.seats) t += ` · 자리가 ${layout.seats}개라 ${students.length - layout.seats}명은 앉을 수 없어요`;
  const apart = apartPairs(state.seats, state.pairs).length;
  if (apart) t += ` · 떨어져 앉은 짝꿍 ${apart}쌍 ('짝꿍 붙이기'로 모아요)`;
  return t;
}

export function render(app) {
  const { students, state, layout, mode, sel } = app;
  const { seats, pairs } = state;
  const seated = new Set(seats.filter(Boolean));
  const pairIndex = new Map();
  pairs.forEach(([a, b], i) => {
    pairIndex.set(a, i);
    pairIndex.set(b, i);
  });

  $('board').dataset.mode = mode;
  document.querySelectorAll('.mode').forEach((b) => {
    const on = b.dataset.mode === mode;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });

  const card = (name) => {
    const c = el('button', 'card', name);
    c.type = 'button';
    c.dataset.name = name;
    c.draggable = mode === 'seat';
    const partner = partnerOf(pairs, name);
    if (partner) {
      c.classList.add('paired');
      c.style.setProperty('--pc', pairColor(pairIndex.get(name)));
      c.title = `${name} ↔ ${partner}`;
      c.setAttribute('aria-label', `${name}, 짝꿍 ${partner}`);
    }
    if (mode !== 'desk' && sel === name) c.classList.add('sel');
    return c;
  };

  // 대기 카드
  const pool = students.filter((n) => !seated.has(n));
  const pe = $('pool');
  pe.innerHTML = '';
  if (pool.length) pool.forEach((n) => pe.appendChild(card(n)));
  else pe.appendChild(el('span', 'muted', '대기 중인 학생이 없어요. 자리의 카드를 여기로 끌어다 놓으면 대기로 돌아가요.'));
  $('poolCount').textContent = pool.length ? ` (${pool.length}명)` : '';

  // 짝꿍 목록
  const pl = $('pairList');
  pl.innerHTML = '';
  $('pairCount').textContent = pairs.length ? ` (${pairs.length}쌍)` : '';
  $('unpairAll').hidden = !pairs.length;
  if (!pairs.length) pl.appendChild(el('span', 'muted', '아직 없어요. 「짝꿍 지정」 모드에서 학생 두 명을 차례로 눌러 보세요.'));
  pairs.forEach(([a, b], i) => {
    const together = isTogether(seats, a, b);
    const chip = el('span', 'pchip' + (together ? '' : ' apart'));
    chip.style.setProperty('--pc', pairColor(i));
    chip.append(el('i'), el('span', '', `${a} ↔ ${b}`));
    if (!together) chip.append(el('em', '', '떨어져 있음'));
    const x = el('button', '', '✕');
    x.type = 'button';
    x.dataset.unpair = a;
    x.setAttribute('aria-label', `${a}, ${b} 짝꿍 해제`);
    chip.append(x);
    pl.appendChild(chip);
  });

  // 교실
  const cols = $('cols');
  cols.innerHTML = '';
  cols.style.setProperty('--cols', layout.cols.length);
  let ci = 0;
  layout.cols.forEach((col) => {
    const d = el('div', 'col');
    d.appendChild(el('div', 'colname', col.name));
    for (let k = 0; k < col.desks; k++) {
      const a = seats[ci * 2];
      const b = seats[ci * 2 + 1];
      const cell = el('div', 'cell' + (a && b && partnerOf(pairs, a) === b ? ' paired' : ''));
      cell.dataset.cell = ci;
      if (mode === 'desk') {
        cell.draggable = true;
        cell.tabIndex = 0;
        if (sel === ci) cell.classList.add('sel');
        cell.setAttribute('aria-label', `${a || '빈 자리'}, ${b || '빈 자리'} 책상`);
      }
      for (let s = 0; s < 2; s++) {
        const si = ci * 2 + s;
        const seat = el('div', 'seat');
        seat.dataset.seat = si;
        if (seats[si]) seat.appendChild(card(seats[si]));
        cell.appendChild(seat);
      }
      d.appendChild(cell);
      ci++;
    }
    cols.appendChild(d);
  });

  // 버튼 문구
  $('rand').textContent = mode === 'desk' ? '책상 단위로 섞기' : pairs.length ? '짝꿍 유지하고 섞기' : '랜덤 배치';
  $('status').textContent = app.msg || defaultStatus(app);
}
