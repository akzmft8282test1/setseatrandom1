// 컨트롤러: 설정을 불러오고, 클릭/드래그/버튼을 받아 상태를 바꾼 뒤 화면을 다시 그려요.
import { $, rnd } from './util.js';
import * as S from './state.js';
import { render } from './ui.js';
import { loadState, saveState, loadRoster, saveRoster, clearRoster } from './storage.js';
import { buildText, renderPng } from './export.js';

const app = {
  cfg: null,
  layout: null,
  students: [],
  state: { seats: [], pairs: [] },
  mode: 'seat', // 'seat' 학생 이동 | 'pair' 짝꿍 지정 | 'desk' 책상 통째로 바꾸기
  sel: null, // seat/pair 모드: 학생 이름, desk 모드: 책상 번호
  msg: '',
};
let msgTimer = 0;
let pngBlob = null;

const draw = () => render(app);
const commit = () => {
  saveState(app.state);
  draw();
};
function flash(text, ms = 3200) {
  app.msg = text;
  draw();
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => {
    app.msg = '';
    draw();
  }, ms);
}

// ---------- 상태 변경 ----------
function place(name, seatIdx) {
  app.state.seats = S.placeStudent(app.state.seats, name, seatIdx);
  app.sel = null;
  commit();
}
function unseat(name) {
  app.state.seats = S.unseat(app.state.seats, name);
  app.sel = null;
  commit();
}
function swapDesk(a, b) {
  if (a !== b) app.state.seats = S.swapDesks(app.state.seats, a, b);
  app.sel = null;
  commit();
}

function makePair(a, b) {
  const { pairs } = app.state;
  const dropped = [S.partnerOf(pairs, a), S.partnerOf(pairs, b)].filter((n) => n && n !== a && n !== b);
  app.state.pairs = S.setPair(pairs, a, b);
  // 같은 책상에 바로 앉혀 줘요 (옆자리 빈 곳 → 빈 책상 → 짝꿍 없는 학생과 맞교환 순서)
  const r = S.gatherPairs(app.state.seats, app.state.pairs, rnd, [[a, b]]);
  app.state.seats = r.seats;
  app.sel = null;
  saveState(app.state);

  let text = `${a} ↔ ${b} 짝꿍이 됐어요.`;
  if (r.failed) text += ' 빈 책상이 없어 아직 떨어져 있어요. 자리를 비운 뒤 「짝꿍 붙이기」를 눌러 주세요.';
  else if (r.toPool) text += ` 자리 때문에 ${r.toPool}명이 대기로 이동했어요.`;
  if (dropped.length) text += ` (${dropped.join(', ')} 쪽 짝꿍 관계는 해제됐어요)`;
  flash(text, 4500);
}

// ---------- 클릭 ----------
function onSeatModeClick(t) {
  const card = t.closest('.card');
  const seat = t.closest('.seat');
  const poolBox = t.closest('#poolBox');
  if (card) {
    const name = card.dataset.name;
    if (seat && app.sel && app.sel !== name) return place(app.sel, +seat.dataset.seat); // 선택한 카드와 자리 교환
    app.sel = app.sel === name ? null : name;
    return draw();
  }
  if (seat && app.sel) return place(app.sel, +seat.dataset.seat);
  if (poolBox && app.sel && app.state.seats.includes(app.sel)) unseat(app.sel);
}

function onPairModeClick(t) {
  const card = t.closest('.card');
  if (!card) return;
  const name = card.dataset.name;
  if (!app.sel) {
    app.sel = name;
    return draw();
  }
  if (app.sel === name) {
    app.sel = null;
    return draw();
  }
  makePair(app.sel, name);
}

function onDeskModeClick(t) {
  const cell = t.closest('.cell');
  if (!cell) return;
  const ci = +cell.dataset.cell;
  if (app.sel === null) {
    app.sel = ci;
    return draw();
  }
  if (app.sel === ci) {
    app.sel = null;
    return draw();
  }
  swapDesk(app.sel, ci);
}

function bindBoard() {
  const board = $('board');
  board.addEventListener('click', (e) => {
    const t = e.target;
    const un = t.closest('[data-unpair]');
    if (un) {
      app.state.pairs = S.removePair(app.state.pairs, un.dataset.unpair);
      return commit();
    }
    if (t.closest('#unpairAll')) {
      app.state.pairs = [];
      return commit();
    }
    if (app.mode === 'pair') return onPairModeClick(t);
    if (app.mode === 'desk') return onDeskModeClick(t);
    onSeatModeClick(t);
  });

  // 드래그 앤 드롭 (자리 배치: 카드 → 자리/대기, 책상 바꾸기: 책상 → 책상)
  let drag = null;
  const clearOver = () => document.querySelectorAll('.over').forEach((x) => x.classList.remove('over'));
  board.addEventListener('dragstart', (e) => {
    let d = null;
    if (app.mode === 'seat') {
      const c = e.target.closest && e.target.closest('.card');
      if (c) d = { kind: 'card', v: c.dataset.name };
    } else if (app.mode === 'desk') {
      const c = e.target.closest && e.target.closest('.cell');
      if (c) d = { kind: 'desk', v: +c.dataset.cell };
    }
    if (!d) return;
    drag = d;
    try {
      e.dataTransfer.setData('text/plain', String(d.v));
      e.dataTransfer.effectAllowed = 'move';
    } catch {
      /* 일부 브라우저는 setData가 막혀 있어요 */
    }
  });
  board.addEventListener('dragover', (e) => {
    if (!drag) return;
    const target =
      drag.kind === 'desk' ? e.target.closest('.cell') : e.target.closest('.seat') || e.target.closest('#poolBox');
    if (!target) return;
    e.preventDefault();
    clearOver();
    if (target.id !== 'poolBox') target.classList.add('over');
  });
  board.addEventListener('drop', (e) => {
    if (!drag) return;
    e.preventDefault();
    const d = drag;
    drag = null;
    clearOver();
    if (d.kind === 'desk') {
      const cell = e.target.closest('.cell');
      if (cell) swapDesk(d.v, +cell.dataset.cell);
      return;
    }
    const seat = e.target.closest('.seat');
    if (seat) place(d.v, +seat.dataset.seat);
    else if (e.target.closest('#poolBox')) unseat(d.v);
  });
  document.addEventListener('dragend', () => {
    drag = null;
    clearOver();
  });

  // 키보드: 책상 모드에서 Enter/Space로 선택
  board.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('cell')) {
      e.preventDefault();
      e.target.click();
    }
  });
}

// ---------- 버튼 ----------
function bindButtons() {
  document.querySelectorAll('.mode').forEach((b) =>
    b.addEventListener('click', () => {
      app.mode = b.dataset.mode;
      app.sel = null;
      draw();
    })
  );

  $('rand').addEventListener('click', () => {
    app.sel = null;
    app.state.seats =
      app.mode === 'desk'
        ? S.shuffleDesks(app.state.seats, rnd)
        : S.shuffleAll(app.state.pairs, app.students, app.layout.seats, rnd);
    commit();
  });

  $('gather').addEventListener('click', () => {
    const { seats, pairs } = app.state;
    if (!pairs.length) return flash('짝꿍이 아직 없어요. 「짝꿍 지정」 모드에서 먼저 만들어 보세요.');
    const before = S.apartPairs(seats, pairs).length;
    if (!before) return flash('모든 짝꿍이 이미 같은 책상에 앉아 있어요.');
    const r = S.gatherPairs(seats, pairs, rnd);
    app.state.seats = r.seats;
    app.sel = null;
    saveState(app.state);
    const moved = before - S.apartPairs(r.seats, pairs).length;
    let text = `${moved}쌍을 같은 책상으로 모았어요.`;
    if (r.failed) text += ` ${r.failed}쌍은 빈 책상이 없어 못 붙였어요. 자리를 조금 비워 주세요.`;
    if (r.toPool) text += ` ${r.toPool}명이 대기로 이동했어요.`;
    flash(text, 4500);
  });

  $('clear').addEventListener('click', () => {
    app.state.seats = S.emptySeats(app.layout.seats); // 짝꿍 관계는 유지해요
    app.sel = null;
    commit();
  });

  $('copy').addEventListener('click', () => {
    const txt = buildText(app.layout, app.state.seats);
    const fail = () => flash('복사하지 못했어요. 화면을 캡처해 주세요.');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => flash('복사했어요.', 1800), fail);
    } else fail();
  });

  // PNG
  $('png').addEventListener('click', async () => {
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([document.fonts.load('20px Jua'), document.fonts.load('20px "Noto Sans KR"')]);
      }
    } catch {
      /* 폰트를 못 받아도 기본 글꼴로 그려요 */
    }
    const { dataUrl, blob } = await renderPng(app.cfg.title, app.layout, app.state);
    pngBlob = blob;
    $('pngImg').src = dataUrl;
    $('pngModal').hidden = false;
    $('pngSave').focus();
  });
  $('pngClose').addEventListener('click', () => ($('pngModal').hidden = true));
  $('pngSave').addEventListener('click', () => {
    if (!pngBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pngBlob);
    a.download = '자리배치.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // 명단 편집
  const applyRoster = (list, text) => {
    app.students = list;
    app.state = S.sanitize(app.state, list, app.layout.seats);
    app.sel = null;
    $('rosterModal').hidden = true;
    saveState(app.state);
    flash(text);
  };
  $('roster').addEventListener('click', () => {
    $('rosterText').value = app.students.join('\n');
    $('rosterModal').hidden = false;
    $('rosterText').focus();
  });
  $('rosterClose').addEventListener('click', () => ($('rosterModal').hidden = true));
  $('rosterSave').addEventListener('click', () => {
    const list = [...new Set($('rosterText').value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean))];
    if (!list.length) return flash('학생을 한 명 이상 적어 주세요.');
    saveRoster(list);
    applyRoster(list, `명단을 ${list.length}명으로 바꿨어요.`);
  });
  $('rosterReset').addEventListener('click', () => {
    clearRoster();
    applyRoster(app.cfg.students, `기본 명단(${app.cfg.students.length}명)으로 되돌렸어요.`);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('pngModal').hidden = true;
      $('rosterModal').hidden = true;
    }
  });
}

// ---------- 시작 ----------
async function loadConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function boot() {
  try {
    app.cfg = await loadConfig();
  } catch (e) {
    $('status').textContent = `설정을 불러오지 못했어요: ${e.message}`;
    return;
  }
  app.layout = S.layoutOf(app.cfg.columns);
  app.students = loadRoster() || app.cfg.students;
  app.state = S.sanitize(loadState(), app.students, app.layout.seats);
  document.title = app.cfg.title;
  $('title').textContent = app.cfg.title;
  bindBoard();
  bindButtons();
  draw();
}

boot();
