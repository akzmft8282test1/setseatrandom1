import test from 'node:test';
import assert from 'node:assert/strict';
import {
  layoutOf, sanitize, setPair, removePair, partnerOf, placeStudent, unseat, swapDesks,
  shuffleAll, shuffleDesks, gatherPairs, apartPairs, isTogether, emptySeats,
} from '../public/js/state.js';

// 고정 시드 난수 (테스트 결과가 매번 같도록)
function seeded(seed = 7) {
  let s = seed;
  return (n) => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return Math.floor((s / 4294967296) * n);
  };
}
const names = (n) => Array.from({ length: n }, (_, i) => `학생${i + 1}`);
const sorted = (a) => a.filter(Boolean).sort();

test('layoutOf: 분단별 시작 책상과 전체 자리 수', () => {
  const l = layoutOf([{ name: 'A', desks: 5 }, { name: 'B', desks: 6 }, { name: 'C', desks: 5 }]);
  assert.equal(l.desks, 16);
  assert.equal(l.seats, 32);
  assert.deepEqual(l.cols.map((c) => c.start), [0, 5, 11]);
});

test('setPair: 기존 짝꿍은 해제되고 새 짝꿍만 남는다', () => {
  let p = setPair([], '학생1', '학생2');
  p = setPair(p, '학생2', '학생3');
  assert.deepEqual(p, [['학생2', '학생3']]);
  assert.equal(partnerOf(p, '학생1'), null);
  assert.equal(partnerOf(p, '학생3'), '학생2');
  assert.deepEqual(removePair(p, '학생3'), []);
  assert.deepEqual(setPair(p, '학생1', '학생1'), p); // 자기 자신과는 불가
});

test('placeStudent: 앉은 사람과는 자리 교환, 대기 카드는 상대를 대기로', () => {
  let s = emptySeats(4);
  s = placeStudent(s, '가', 0);
  s = placeStudent(s, '나', 3);
  s = placeStudent(s, '가', 3); // 교환
  assert.deepEqual(s, ['나', null, null, '가']);
  s = placeStudent(s, '다', 0); // 대기 카드가 '나' 자리로 → '나'는 대기
  assert.deepEqual(s, ['다', null, null, '가']);
  assert.deepEqual(unseat(s, '가'), ['다', null, null, null]);
});

test('swapDesks: 책상 통째로 교환', () => {
  assert.deepEqual(swapDesks(['a', 'b', 'c', 'd', 'e', 'f'], 0, 2), ['e', 'f', 'c', 'd', 'a', 'b']);
});

test('shuffleAll: 모두 한 번씩만 앉고, 짝꿍은 항상 같은 책상', () => {
  const students = names(32);
  // 서로 멀리 떨어진 학생끼리도 짝꿍 가능
  const pairs = [['학생1', '학생32'], ['학생5', '학생20'], ['학생9', '학생10']];
  for (let seed = 1; seed <= 50; seed++) {
    const seats = shuffleAll(pairs, students, 32, seeded(seed));
    assert.deepEqual(sorted(seats), sorted(students));
    for (const [a, b] of pairs) assert.ok(isTogether(seats, a, b), `seed ${seed}: ${a}-${b}`);
  }
});

test('shuffleAll: 학생 수가 홀수/부족/초과여도 안전', () => {
  const odd = shuffleAll([], names(5), 8, seeded());
  assert.equal(sorted(odd).length, 5);
  const over = shuffleAll([['학생1', '학생2']], names(10), 4, seeded());
  assert.equal(sorted(over).length, 4); // 자리 4개만 채움
  assert.equal(new Set(sorted(over)).size, 4);
});

test('shuffleDesks: 책상 안의 두 사람은 유지', () => {
  const seats = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const out = shuffleDesks(seats, seeded());
  assert.deepEqual(sorted(out), sorted(seats));
  for (let d = 0; d < 4; d++) {
    const pair = [out[d * 2], out[d * 2 + 1]].join('');
    assert.ok(['ab', 'cd', 'ef', 'gh'].includes(pair));
  }
});

test('gatherPairs: 멀리 앉은 짝꿍을 붙이고 다른 짝꿍은 건드리지 않는다', () => {
  const students = names(8);
  let seats = [...students]; // 학생1~8이 순서대로 앉은 상태 (책상 4개)
  const pairs = [['학생1', '학생8'], ['학생3', '학생4']]; // 3-4는 이미 같은 책상
  const r = gatherPairs(seats, pairs, seeded());
  assert.equal(r.failed, 0);
  assert.deepEqual(sorted(r.seats), sorted(students)); // 아무도 사라지지 않음
  assert.ok(isTogether(r.seats, '학생1', '학생8'));
  assert.ok(isTogether(r.seats, '학생3', '학생4'));
  assert.deepEqual(apartPairs(r.seats, pairs), []);
});

test('gatherPairs: 둘 다 대기 중이면 빈 책상에 앉힌다 / 자리가 없으면 failed', () => {
  const r = gatherPairs(emptySeats(4), [['가', '나']], seeded());
  assert.ok(isTogether(r.seats, '가', '나'));

  // 모든 책상이 서로 짝꿍인 학생들로 꽉 찬 경우: 밀어낼 곳이 없다
  const full = ['a', 'b', 'c', 'd'];
  const pairs = [['a', 'b'], ['c', 'd'], ['x', 'y']];
  const r2 = gatherPairs(full, pairs, seeded());
  assert.equal(r2.failed, 1);
  assert.deepEqual(r2.seats, full);
});

test('gatherPairs: 짝꿍 없는 학생은 밀려나도 대기로 빠지지 않고 빈 자리로 이동', () => {
  // 책상0: a(짝꿍 없음), p1 / 책상1: q, b(짝꿍 없음)... 짝꿍 (p1,q)를 붙여 본다
  const seats = ['a', 'p1', 'q', 'b'];
  const r = gatherPairs(seats, [['p1', 'q']], seeded());
  assert.equal(r.failed, 0);
  assert.ok(isTogether(r.seats, 'p1', 'q'));
  assert.deepEqual(sorted(r.seats), ['a', 'b', 'p1', 'q']);
});

test('sanitize: 없는 학생/중복/길이 불일치를 정리', () => {
  const raw = { seats: ['가', '가', '없는애', '나', '다'], pairs: [['가', '나'], ['나', '다'], ['가', '없는애'], ['다', '다']] };
  const s = sanitize(raw, ['가', '나', '다'], 4);
  assert.deepEqual(s.seats, ['가', null, null, '나']);
  assert.deepEqual(s.pairs, [['가', '나']]);
  assert.deepEqual(sanitize(null, ['가'], 2), { seats: [null, null], pairs: [] });
});
