// 이 브라우저(localStorage)에 저장해요. 서버에는 아무것도 보내지 않아요.
const KEY = 'seatcards.v2';
const OLD_KEY = 'seatcards'; // message.html 시절 저장 형식 {s:[...], f:boolean}
const ROSTER_KEY = 'seatcards.roster';

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null');
  } catch {
    return null;
  }
};

export function loadState() {
  const cur = read(KEY);
  if (cur) return cur;

  // 예전 저장본이 있으면 이어받기. 예전 "짝꿍 고정" 상태였다면 책상별 두 사람을 짝꿍으로 변환
  const old = read(OLD_KEY);
  if (old && Array.isArray(old.s)) {
    const pairs = [];
    if (old.f) {
      for (let d = 0; d < old.s.length / 2; d++) {
        const a = old.s[d * 2];
        const b = old.s[d * 2 + 1];
        if (a && b) pairs.push([a, b]);
      }
    }
    return { seats: old.s, pairs };
  }
  return null;
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ seats: state.seats, pairs: state.pairs }));
  } catch {
    /* 저장 공간이 없거나 비공개 모드면 조용히 넘어가요 */
  }
}

export function loadRoster() {
  const r = read(ROSTER_KEY);
  return Array.isArray(r) && r.length && r.every((n) => typeof n === 'string') ? r : null;
}

export function saveRoster(list) {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function clearRoster() {
  try {
    localStorage.removeItem(ROSTER_KEY);
  } catch {
    /* ignore */
  }
}
