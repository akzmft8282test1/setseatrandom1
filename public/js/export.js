import { partnerOf } from './state.js';

const FONT = 'Jua,"Noto Sans KR",sans-serif';

/** 붙여넣기용 텍스트: 분단별 열, 책상은 "A+B" */
export function buildText(layout, seats) {
  const rows = Math.max(...layout.cols.map((c) => c.desks));
  const out = ['[교탁]', layout.cols.map((c) => c.name).join('\t')];
  for (let r = 0; r < rows; r++) {
    out.push(
      layout.cols
        .map((c) =>
          r < c.desks
            ? `${seats[(c.start + r) * 2] || '-'}+${seats[(c.start + r) * 2 + 1] || '-'}`
            : ''
        )
        .join('\t')
    );
  }
  return out.join('\n');
}

function roundRect(x, left, top, w, h, r) {
  x.beginPath();
  x.moveTo(left + r, top);
  x.arcTo(left + w, top, left + w, top + h, r);
  x.arcTo(left + w, top + h, left, top + h, r);
  x.arcTo(left, top + h, left, top, r);
  x.arcTo(left, top, left + w, top, r);
  x.closePath();
}

function fitText(x, text, maxW, size) {
  x.font = `${size}px ${FONT}`;
  while (x.measureText(text).width > maxW && size > 11) {
    size--;
    x.font = `${size}px ${FONT}`;
  }
}

/** 자리 배치를 PNG로 그려요. → { dataUrl, blob } */
export async function renderPng(title, layout, { seats, pairs }) {
  const n = layout.cols.length;
  const rows = Math.max(...layout.cols.map((c) => c.desks));
  const W = Math.max(900, n * 300);
  const pad = 30;
  const gap = 30;
  const colW = (W - pad * 2 - gap * (n - 1)) / n;
  const cellH = 64;
  const step = cellH + 10;
  const top = 170;
  const H = top + rows * step + pad;
  const S = 2; // 선명하게 2배 해상도

  const cv = document.createElement('canvas');
  cv.width = W * S;
  cv.height = H * S;
  const x = cv.getContext('2d');
  x.scale(S, S);
  x.fillStyle = '#fffdf6';
  x.fillRect(0, 0, W, H);
  x.textAlign = 'center';
  x.textBaseline = 'middle';

  x.fillStyle = '#2b2418';
  x.font = `34px ${FONT}`;
  x.fillText(title, W / 2, 42);
  roundRect(x, W / 2 - 120, 72, 240, 38, 8);
  x.fillStyle = '#d3ab72';
  x.fill();
  x.fillStyle = '#2b2418';
  x.font = `20px ${FONT}`;
  x.fillText('교탁', W / 2, 91);

  layout.cols.forEach((col, k) => {
    const cx = pad + k * (colW + gap);
    x.fillStyle = '#6b7d74';
    x.font = `20px ${FONT}`;
    x.fillText(col.name, cx + colW / 2, 142);
    for (let r = 0; r < col.desks; r++) {
      const y = top + r * step;
      const d = col.start + r;
      const a = seats[d * 2];
      const b = seats[d * 2 + 1];
      const isPair = a && b && partnerOf(pairs, a) === b; // 지정된 짝꿍 책상은 주황색
      roundRect(x, cx, y, colW, cellH, 10);
      x.fillStyle = isPair ? '#ff8a5c' : '#9b7440';
      x.fill();
      const sw = (colW - 12) / 2;
      [a, b].forEach((name, s) => {
        const sx = cx + 4 + s * (sw + 4);
        roundRect(x, sx, y + 4, sw, cellH - 8, 7);
        x.fillStyle = '#fffaf0';
        x.fill();
        if (name) {
          fitText(x, name, sw - 10, 22);
          x.fillStyle = '#2b2418';
          x.fillText(name, sx + sw / 2, y + cellH / 2);
        }
      });
    }
  });

  const blob = await new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
  return { dataUrl: cv.toDataURL('image/png'), blob };
}
