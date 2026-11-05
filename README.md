# 우리 반 자리 배치

학생 카드를 자리에 놓고, **짝꿍을 직접 골라서** 같은 책상에 앉히는 Node.js(Express) 웹앱이에요.

## 실행

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # 파일을 고치면 서버 자동 재시작
npm test         # 배치/짝꿍 로직 테스트
```

## 사용법

| 모드 | 하는 일 |
|---|---|
| **자리 배치** | 카드를 누른 뒤 자리를 누르거나 끌어다 놓기. 앉은 사람과는 자리 교환, 대기 영역으로 놓으면 자리 비우기 |
| **짝꿍 지정** | 학생 두 명을 차례로 누르면 한 쌍. 어디에 앉아 있든(또는 대기 중이든) 상관없고, 지정 즉시 같은 책상에 앉아요 |
| **책상 바꾸기** | 책상(두 자리)을 누르거나 끌어서 다른 책상과 통째로 교환 |

- **랜덤 배치**: 짝꿍은 항상 같은 책상에 앉고, 짝꿍이 없는 학생끼리는 무작위로 둘씩 앉아요.
- **짝꿍 붙이기**: 손으로 자리를 옮겨 떨어진 짝꿍을 다시 한 책상으로 모아요. 짝꿍이 있는 다른 학생은 건드리지 않아요.
- **짝꿍 목록**: ✕로 하나씩, 「모두 해제」로 전부 해제. 카드 왼쪽 색 띠가 같으면 같은 짝꿍이에요.
- **명단 편집**: 한 줄에 한 명씩. 이 브라우저에만 저장돼요. 배치와 짝꿍도 브라우저(localStorage)에 저장돼요.
- 예전 `message.html`에서 저장한 배치는 자동으로 이어받아요. (예전 "짝꿍 고정" 상태였다면 책상별 두 사람이 짝꿍으로 변환돼요)

## 학급 설정 바꾸기: `config.json`

```json
{
  "title": "우리 반 자리 배치",
  "columns": [
    { "name": "창가", "desks": 5 },
    { "name": "가운데", "desks": 6 },
    { "name": "복도", "desks": 5 }
  ],
  "students": ["고은유", "김가민", "..."]
}
```

- 분단 수·이름·책상 수는 `columns`만 고치면 돼요. (책상 1개 = 2자리)
- 서버가 매 요청마다 파일을 읽어 검증하니, 오타가 있으면 화면에 어디가 문제인지 알려 줘요.

## Render 배포

1. 이 폴더를 GitHub 저장소로 올려요.
2. Render → **New → Web Service** → 저장소 연결 (또는 **Blueprint**로 `render.yaml` 사용).
3. Build Command `npm install`, Start Command `npm start`. 포트는 Render가 `PORT`로 알려 줘서 따로 설정할 필요 없어요.
4. 헬스체크 경로는 `/healthz`.

`config.json`을 고쳐 push하면 자동으로 재배포돼요. 배치 데이터는 사용자 브라우저에 저장되고 서버에는 저장하지 않아서, 무료 플랜의 휴면/재시작과 상관없이 유지돼요.

## 구조

```
server.js            Express: 정적 파일, GET /api/config, GET /healthz
config.json          학급 설정 (이름, 분단)
public/
  index.html
  css/style.css
  js/state.js        순수 로직 (짝꿍 모델, 랜덤 배치, 짝꿍 붙이기)  ← 테스트 대상
  js/ui.js           화면 그리기
  js/main.js         클릭/드래그/버튼 처리 (컨트롤러)
  js/storage.js      localStorage 저장/불러오기, 예전 데이터 이전
  js/export.js       결과 복사 텍스트, PNG 그리기
test/state.test.mjs  node:test 단위 테스트
render.yaml          Render 배포 설정
```

## 기능을 더 붙이고 싶다면

- **새 규칙** (예: "이 둘은 떨어뜨리기"): `state.js`에 순수 함수로 추가하고 `test/`에 테스트를 붙인 뒤, `main.js`에서 연결해요.
- **서버 저장/공유** (예: 반별 배치 보관): `server.js`에 API를 추가하고 `storage.js`만 바꾸면 돼요. Render 무료 플랜은 디스크가 초기화되므로 DB(예: Render Postgres)가 필요해요.
