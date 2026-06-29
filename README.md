# 🛡️ AXIO VULN LAB

OWASP Top 10 기반 **웹 취약점 모의훈련 플랫폼**. 가상 암호화폐 거래소 + 쇼핑몰을 통해 실제로 취약점을 공격해보며 학습하는 CTF 스타일 교육용 환경입니다.

> ⚠️ **교육 목적 전용** — 이 프로젝트는 의도적으로 취약점을 포함하고 있습니다. 실제 서비스에 동일 기법을 사용하는 것은 불법(정보통신망법 위반)입니다. 절대 외부에 공개된 운영 환경으로 노출하지 마세요.

---

## ✨ 주요 기능

- **두 개의 훈련 시스템** — 거래소(Exchange) + 쇼핑몰(Shop), `/` 허브에서 선택
- **OWASP Top 10 시나리오** — A01~A10 취약점을 실제 공격 가능한 형태로 구현
- **CTF FLAG 시스템** — `AXIO{...}` 형식, 난이도별 점수 (EASY 100 / MEDIUM 300 / HARD 500)
- **단계별 힌트** — 힌트 1개당 -10pt 감점
- **수료증 발급** — 점수 기반 S/A/B/C 등급, 인쇄/PDF 저장 가능
- **랭킹 시스템** — 점수 기준 정렬, 모바일 카드 UI
- **초대 코드 가입** — 관리자가 발급한 코드로만 회원가입 (사용 이력 추적)
- **관리자 대시보드** — 통계, 사용자 관리, SQL 콘솔
- **가이드/FAQ 페이지** — 첫 접속자용 튜토리얼 (`/guide`)
- **취약점 학습 자료** — 취약 코드 vs 안전 코드 비교 (`/vuln`)

---

## 🎯 구현된 취약점 (챌린지)

| OWASP | 챌린지 | 난이도 |
|-------|--------|--------|
| **A01** Broken Access Control | IDOR 계좌 조회, 관리자 페이지 우회, 쇼핑몰 주문 IDOR | easy |
| **A02** Cryptographic Failures | 평문/MD5 비밀번호, 현재 비밀번호 검증 누락 | easy~medium |
| **A03** Injection | SQLi 로그인 우회, Stored XSS, 쇼핑몰 검색 SQLi/리뷰 XSS | easy~medium |
| **A04** Insecure Design | 음수 송금, Mass Assignment 권한상승, 쇼핑몰 가격 조작 | easy~medium |
| **A05** Security Misconfiguration | Path Traversal 파일 다운로드 | medium |
| **A06** Vulnerable Components | 오래된 라이브러리 버전 탐지 (CVE) | easy |
| **A07** Auth Failures | JWT 약한 시크릿 크래킹, 로그인 브루트포스 | medium~hard |
| **A08** Data Integrity Failures | 파일 업로드 웹셸 RCE (서버사이드 EJS 렌더) | hard |
| **A09** Logging Failures | 출금 감사 로그 누락 | medium |
| **A10** SSRF | 시세 조회 기능으로 내부 서비스 접근 | hard |

---

## 🧱 기술 스택

- **Backend** — Node.js, Express.js
- **View** — EJS 템플릿
- **DB** — [sql.js](https://github.com/sql-js/sql.js) (WASM 기반 SQLite, 네이티브 빌드 불필요)
- **기타** — express-session, multer, jsonwebtoken, axios

> 의도적 SQL Injection을 위해 `rawQuery()` 래퍼를 사용하고, 안전한 경로에는 파라미터라이즈드 쿼리를 사용합니다.

---

## 🚀 실행 방법

### 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 서버 실행
npm start

# 3. 브라우저에서 접속
# http://localhost:3000
```

### Docker 실행

```bash
docker compose up -d --build
```

> 기본 `docker-compose.yml`은 리버스 프록시 환경(외부 nginx 공유 네트워크)에 맞춰져 있습니다. 단독 실행 시에는 `ports: ["3000:3000"]`로 변경하고 `networks` 섹션을 제거하세요.

---

## 🔑 기본 계정 / 데모 데이터

| 항목 | 값 |
|------|-----|
| 관리자 계정 | `admin` / `admin1234` |
| 데모 초대 코드 | `AXIO-TRAIN-2024` |

---

## 📂 디렉터리 구조

```
web_pravang/
├── app.js                # Express 진입점
├── database/             # sql.js 초기화 + DB 래퍼
├── routes/               # 라우터 (auth, challenges, admin, shop, trade, ...)
├── views/                # EJS 템플릿
├── challenges/hints.js   # 챌린지 정의 + FLAG + 힌트
├── data/vulns.js         # 취약점 학습 자료 데이터
├── middleware/           # 인증 미들웨어
├── public/               # 정적 파일 (CSS, JS, 업로드)
├── Dockerfile
└── docker-compose.yml
```

---

## 📖 학습 흐름

1. 초대 코드로 회원가입 → 2. 거래소/쇼핑몰 선택 → 3. `/vuln`에서 취약점 개념 학습 → 4. `/challenges`에서 공격 & FLAG 제출 → 5. 수료증 발급 & 랭킹 확인

자세한 내용은 사이트 내 `/guide` 페이지를 참고하세요.

---

## ⚖️ 라이선스 / 면책

본 프로젝트는 보안 교육 및 모의훈련 목적으로만 제공됩니다. 사용자가 본 소프트웨어로 학습한 기법을 권한 없는 시스템에 사용하여 발생하는 모든 법적 책임은 사용자 본인에게 있습니다.
