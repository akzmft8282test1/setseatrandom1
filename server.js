import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');
const PORT = process.env.PORT || 3000; // Render는 PORT 환경변수를 지정해 줘요

/** config.json 검증 + 정리. 잘못된 값이 있으면 어디가 문제인지 알려 줘요. */
export function validateConfig(c) {
  if (!c || typeof c !== 'object') throw new Error('최상위는 객체여야 해요');

  const title = String(c.title || '우리 반 자리 배치');

  if (!Array.isArray(c.students) || c.students.length === 0) {
    throw new Error('students에 학생 이름을 한 명 이상 적어 주세요');
  }
  const students = [...new Set(c.students.map((s) => String(s).trim()).filter(Boolean))];

  if (!Array.isArray(c.columns) || c.columns.length === 0) {
    throw new Error('columns에 분단(열)을 한 개 이상 적어 주세요');
  }
  const columns = c.columns.map((col, i) => {
    const desks = Number(col && col.desks);
    if (!Number.isInteger(desks) || desks < 1) {
      throw new Error(`columns[${i}].desks는 1 이상의 정수여야 해요`);
    }
    return { name: String((col && col.name) || `${i + 1}분단`), desks };
  });

  return { title, students, columns };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // Render 헬스체크용
  app.get('/healthz', (_req, res) => res.type('text').send('ok'));

  // 학급 설정 (이름, 분단 구성). 파일을 매번 읽어서 재시작 없이도 반영돼요.
  app.get('/api/config', async (_req, res) => {
    try {
      const raw = await fs.readFile(CONFIG_PATH, 'utf8');
      res.set('Cache-Control', 'no-store').json(validateConfig(JSON.parse(raw)));
    } catch (e) {
      res.status(500).json({ error: `config.json 오류: ${e.message}` });
    }
  });

  app.use(express.static(path.join(__dirname, 'public')));
  return app;
}

// 직접 실행했을 때만 서버를 열어요 (테스트에서 import해도 안전)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp().listen(PORT, () => console.log(`자리 배치 서버 실행 중: http://localhost:${PORT}`));
}
