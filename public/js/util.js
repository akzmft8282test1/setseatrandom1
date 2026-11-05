export const $ = (id) => document.getElementById(id);

/** 0 이상 n 미만의 정수 (가능하면 crypto 난수) */
export function rnd(n) {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}
