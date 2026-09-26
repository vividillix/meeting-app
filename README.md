# 약속 잡기 (meeting-app)

방을 만들고 링크를 공유하면, 참가자들이 가능한 날짜에 투표하고 가장 많이 겹치는 날을 추천받는 웹 앱.

- 화면: React + Vite, Vercel 배포
- 데이터: Firebase Firestore (실시간 반영)
- 로그인: Firebase 익명 로그인 — 회원가입 없이 브라우저마다 보이지 않는 계정이 자동으로 생김
- 서버: Vercel 서버 함수(`api/`) — 방 생성·입장·강퇴·나가기, 비밀번호 확인

## 구조

```
src/pages            화면
src/features/room    화면별 상태 관리 훅
src/services         화면에서 쓰는 방 기능 (서버 호출·투표 저장·결과 계산)
src/repositories     Firestore 읽기 / 내 투표 저장
src/shared           브라우저와 서버가 같이 쓰는 입력 검사 규칙
src/lib              Firebase 초기화, 익명 로그인, 서버 호출
api/rooms/*.js       서버 함수: create, join, kick, leave
api/_lib             서버 공통 코드 (Admin SDK, 비밀번호 해시, 방 변경 계산)
firestore.rules      Firestore 보안 규칙 (Firebase 콘솔에 붙여 넣음)
scripts/             예전 데이터 이전 스크립트
```

## 보안 모델

- **링크 = 접근 권한.** 방 ID를 아는 사람만 그 방을 볼 수 있음. 방 ID는 추측하기 어려운 무작위 10자리.
- 참가자 정보는 방마다 따로 (닉네임 + 비밀번호). 같은 브라우저에서는 비밀번호 없이 다시 들어옴.
- 비밀번호는 서버에서만 해시(scrypt)로 저장·확인 (`roomSecrets` 컬렉션, 브라우저에서 접근 불가).
  같은 닉네임으로 10번 틀리면 10분 잠금.
- 브라우저가 Firestore에 직접 할 수 있는 일은 **방 하나 읽기**와 **내 투표 날짜 수정**뿐 (보안 규칙으로 강제).
  나머지는 서버가 로그인 토큰으로 본인·방장 여부를 확인한 뒤 처리.

## 처음 설정 / 배포 순서

1. **익명 로그인 켜기** — Firebase 콘솔 → Authentication → 시작하기 → Sign-in method → "익명" 사용 설정
2. **서비스 계정 키 만들기** — Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"
   → JSON 파일 다운로드. **이 파일은 비밀번호와 같으니 절대 커밋·공유하지 말 것**
3. **Vercel 환경변수** — Vercel 프로젝트 → Settings → Environment Variables
   - 이름 `FIREBASE_SERVICE_ACCOUNT`, 값: 받은 JSON 파일 내용 전체를 그대로 붙여 넣기
4. **로컬 설정** — 받은 JSON을 프로젝트 폴더에 `service-account.json`으로 저장하고 `.env.local` 파일 생성:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   ```
   (`.gitignore`에 이미 등록돼 있음)
5. `npm install` → `npm test` → `npm run lint` → 배포 (git push)
6. **보안 규칙 게시** — Firebase 콘솔 → Firestore → 규칙 탭에 `firestore.rules` 내용을 붙여 넣고 게시
7. **예전 방 데이터 이전** (1회) — 평문 비밀번호를 해시로 옮기고 방 문서에서 지움
   ```
   npm run migrate:legacy -- --dry-run   # 바뀔 내용만 확인
   npm run migrate:legacy                # 실제 반영
   ```
   이전 후 예전 방 참가자는 입장 화면에서 "기존"으로 한 번 다시 로그인하면 됨.

> 5 → 6 → 7 순서를 지킬 것. 새 코드 배포 전에 규칙을 바꾸면 예전 코드가 동작하지 않고,
> 규칙을 바꾼 뒤 이전을 미루면 예전 방에서 투표가 막힘.

## 로컬 개발

```
npm run dev      # 화면 + 서버 함수(/api) 함께 실행 (.env.local 필요)
npm test
npm run lint
```
