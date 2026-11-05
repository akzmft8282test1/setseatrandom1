// 순수 로직 모음: DOM/브라우저 API를 쓰지 않아서 Node에서 바로 테스트할 수 있어요.
//
// 데이터 모델
//   seats : 길이 = 책상 수 × 2. 값은 학생 이름 또는 null.
//           책상 d의 두 자리는 seats[2d], seats[2d+1]
//   pairs : [[이름A, 이름B], ...]  "같은 책상에 앉을 짝꿍" 목록.
//           앉은 위치와 무관하게 이름으로만 정의해서, 어느 학생이든 골라서 짝지을 수 있어요.
//   rnd   : rnd(n) → 0 이상 n 미만의 정수 (테스트에서 고정값으로 바꿔 끼울 수 있어요)

export const emptySeats = (n) => new Array(n).fill(null);

/** config.columns → { cols:[{name,desks,start}], desks, seats } */
export function layoutOf(columns) {
  let start = 0;
  const cols = columns.map((c) => {
    const col = { name: c.name, desks: c.desks, start };
    start += c.desks;
    return col;
  });
  return { cols, desks: start, seats: start * 2 };
}

/** 저장된 데이터나 명단이 바뀐 뒤에도 앞뒤가 맞도록 정리 (없는 학생, 중복, 길이 불일치 제거) */
export function sanitize(raw, students, seatCount) {
  const known = new Set(students);
  const used = new Set();
  const seats = emptySeats(seatCount);
  const src = Array.isArray(raw && raw.seats) ? raw.seats : [];
  for (let i = 0; i < seatCount; i++) {
    const n = src[i];
    if (typeof n === 'string' && known.has(n) && !used.has(n)) {
      seats[i] = n;
      used.add(n);
    }
  }
  const pairs = [];
  const inPair = new Set();
  for (const p of Array.isArray(raw && raw.pairs) ? raw.pairs : []) {
    if (!Array.isArray(p) || p.length !== 2) continue;
    const [a, b] = p;
    if (a !== b && known.has(a) && known.has(b) && !inPair.has(a) && !inPair.has(b)) {
      pairs.push([a, b]);
      inPair.add(a);
      inPair.add(b);
    }
  }
  return { seats, pairs };
}

// ---------- 짝꿍 ----------
export function partnerOf(pairs, name) {
  for (const [a, b] of pairs) {
    if (a === name) return b;
    if (b === name) return a;
  }
  return null;
}

/** a와 b를 짝꿍으로. 둘 중 누구든 기존 짝꿍이 있으면 그 관계는 해제돼요. */
export function setPair(pairs, a, b) {
  if (!a || !b || a === b) return pairs;
  return [...pairs.filter((p) => !p.includes(a) && !p.includes(b)), [a, b]];
}

export const removePair = (pairs, name) => pairs.filter((p) => !p.includes(name));

export const deskOf = (seats, name) => {
  const i = seats.indexOf(name);
  return i < 0 ? -1 : i >> 1;
};

export const isTogether = (seats, a, b) => {
  const i = seats.indexOf(a);
  const j = seats.indexOf(b);
  return i >= 0 && j >= 0 && i >> 1 === j >> 1;
};

export const apartPairs = (seats, pairs) => pairs.filter(([a, b]) => !isTogether(seats, a, b));

// ---------- 자리 이동 ----------
export const poolOf = (seats, students) => students.filter((n) => !seats.includes(n));

/** name을 to번 자리로. 이미 앉은 사람이 있으면 서로 자리를 바꾸고(대기 중이던 카드면 상대는 대기로). */
export function placeStudent(seats, name, to) {
  const s = seats.slice();
  const from = s.indexOf(name);
  if (from === to) return s;
  const occupant = s[to];
  if (from >= 0) s[from] = occupant === undefined ? null : occupant;
  s[to] = name;
  return s;
}

export function unseat(seats, name) {
  const s = seats.slice();
  const i = s.indexOf(name);
  if (i >= 0) s[i] = null;
  return s;
}

export function swapDesks(seats, a, b) {
  const s = seats.slice();
  for (let k = 0; k < 2; k++) {
    const t = s[a * 2 + k];
    s[a * 2 + k] = s[b * 2 + k];
    s[b * 2 + k] = t;
  }
  return s;
}

// ---------- 랜덤 ----------
export function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 전체 랜덤 배치. 짝꿍은 항상 같은 책상에 함께 앉고(왼/오른쪽은 무작위),
 * 짝꿍이 없는 학생들은 무작위로 둘씩 묶여 앉아요.
 * 자리가 모자라면 남는 학생은 대기 상태로 둬요.
 */
export function shuffleAll(pairs, students, seatCount, rnd) {
  const inPair = new Set(pairs.flat());
  const singles = shuffle(students.filter((n) => !inPair.has(n)), rnd);
  const units = pairs
    .filter(([a, b]) => students.includes(a) && students.includes(b))
    .map((p) => p.slice());
  for (let i = 0; i < singles.length; i += 2) units.push(singles.slice(i, i + 2));

  const seats = emptySeats(seatCount);
  shuffle(units, rnd)
    .slice(0, seatCount / 2)
    .forEach((u, d) => {
      const v = u.length === 2 && rnd(2) ? [u[1], u[0]] : u;
      seats[d * 2] = v[0];
      seats[d * 2 + 1] = v[1] === undefined ? null : v[1];
    });
  return seats;
}

/** 책상 단위로만 섞기 (책상 안의 두 사람은 그대로) */
export function shuffleDesks(seats, rnd) {
  const D = seats.length / 2;
  const order = shuffle(Array.from({ length: D }, (_, i) => i), rnd);
  const out = seats.slice();
  order.forEach((from, to) => {
    out[to * 2] = seats[from * 2];
    out[to * 2 + 1] = seats[from * 2 + 1];
  });
  return out;
}

// ---------- 짝꿍 붙이기 ----------
// a, b를 같은 책상에 앉힌 새 seats를 만들어 봐요. 자리가 없으면 null.
function tryGather(seats, a, b, inPair, rnd) {
  const s = seats.slice();
  const freed = [];
  for (const n of [a, b]) {
    const i = s.indexOf(n);
    if (i >= 0) {
      s[i] = null;
      freed.push(i);
    }
  }
  const free = []; // 완전히 빈 책상
  const evict = []; // 짝꿍이 없는 학생만 앉은 책상 (그 학생들을 밀어내도 되는 곳)
  for (let d = 0; d < s.length / 2; d++) {
    const occupants = [s[2 * d], s[2 * d + 1]].filter(Boolean);
    if (!occupants.length) free.push(d);
    else if (occupants.every((n) => !inPair.has(n))) evict.push(d);
  }
  const candidates = free.length ? free : evict;
  if (!candidates.length) return null;

  const d = candidates[rnd(candidates.length)];
  const displaced = [s[2 * d], s[2 * d + 1]].filter(Boolean);
  const spots = freed.filter((i) => i >> 1 !== d); // a, b가 비운 자리로 밀려난 학생을 보내요
  s[2 * d] = a;
  s[2 * d + 1] = b;
  let toPool = 0;
  for (const n of displaced) {
    const spot = spots.shift();
    if (spot === undefined) toPool++;
    else s[spot] = n;
  }
  return { seats: s, toPool };
}

/**
 * 떨어져 있는 짝꿍을 같은 책상으로 모아요. (only: 이 쌍들만 처리, 기본은 전부)
 * 1) 한쪽 옆자리가 비어 있으면 거기로 → 2) 빈 책상으로 → 3) 짝꿍 없는 학생 책상을 맞바꿔서.
 * 짝꿍이 있는 다른 학생은 절대 건드리지 않아요.
 */
export function gatherPairs(seats0, pairs, rnd, only = pairs) {
  let seats = seats0.slice();
  const inPair = new Set(pairs.flat());
  let toPool = 0;
  let failed = 0;
  for (const [a, b] of only) {
    const ia = seats.indexOf(a);
    const ib = seats.indexOf(b);
    if (ia >= 0 && ib >= 0 && ia >> 1 === ib >> 1) continue;
    if (ia >= 0 && seats[ia ^ 1] === null) {
      if (ib >= 0) seats[ib] = null;
      seats[ia ^ 1] = b;
      continue;
    }
    if (ib >= 0 && seats[ib ^ 1] === null) {
      if (ia >= 0) seats[ia] = null;
      seats[ib ^ 1] = a;
      continue;
    }
    const r = tryGather(seats, a, b, inPair, rnd);
    if (r) {
      seats = r.seats;
      toPool += r.toPool;
    } else failed++;
  }
  return { seats, toPool, failed };
}
