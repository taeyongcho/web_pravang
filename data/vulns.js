const vulns = [
  {
    id: 'A01',
    title: 'A01 - Broken Access Control',
    cvss: 9.8, severity: 'critical',
    summary: '사용자가 허가되지 않은 기능이나 데이터에 접근할 수 있는 취약점입니다. 인가(Authorization) 로직이 없거나 잘못 구현된 경우 발생합니다.',
    impact: ['다른 유저의 개인정보·잔액·거래내역 열람', '관리자 페이지 무단 접근', '타인의 데이터 수정·삭제'],
    scenarios: [
      { title: 'IDOR - 계좌 조회', path: '/dashboard/account/1', desc: 'URL의 ID만 바꿔 타인 계좌 열람' },
      { title: '관리자 페이지 우회', path: '/admin?role=admin', desc: '쿼리 파라미터로 권한 체크 우회' },
      { title: '지갑 IDOR', path: '/wallet', desc: '타인의 지갑 주소 삭제 가능' },
    ],
    badCode: `// ❌ 취약: user_id 검증 없음
router.get('/account/:id', requireLogin, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?',
    [req.params.id]); // 누구 ID든 조회
  res.render('account', { user });
});`,
    goodCode: `// ✅ 안전: 본인 데이터만 접근
router.get('/account/:id', requireLogin, (req, res) => {
  if (req.params.id != req.session.user.id) {
    return res.status(403).render('error',
      { message: '접근 권한이 없습니다.' });
  }
  const user = get('SELECT * FROM users WHERE id = ?',
    [req.session.user.id]);
  res.render('account', { user });
});`,
    remediation: ['모든 요청에서 세션의 사용자 ID와 요청 ID를 비교 검증', '권한별 미들웨어를 적용하고 role 확인은 서버 세션 기반으로만', 'URL 파라미터, 쿼리스트링, 바디 모두 신뢰하지 않기'],
    references: ['OWASP A01:2021', 'CWE-284: Improper Access Control']
  },
  {
    id: 'A02',
    title: 'A02 - Cryptographic Failures',
    cvss: 7.5, severity: 'high',
    summary: '민감한 데이터가 암호화 없이 저장·전송되거나, 약한 알고리즘(MD5, SHA1)을 사용하는 취약점입니다.',
    impact: ['비밀번호 평문 저장 → DB 유출 시 즉시 노출', 'MD5 해시 → 레인보우 테이블로 수 초 만에 크래킹', '현재 비밀번호 확인 없이 변경 가능'],
    scenarios: [
      { title: '평문 비밀번호', path: '/admin/query', desc: 'SELECT * FROM users 실행 후 password 열 확인' },
      { title: '비밀번호 변경', path: '/mypage', desc: '현재 비밀번호 없이 새 비밀번호 설정 가능' },
    ],
    badCode: `// ❌ 취약: 평문 저장
run('INSERT INTO users (username, password) VALUES (?, ?)',
  [username, password]); // password = "test1234"

// ❌ 취약: MD5 사용 (alice의 password)
// 5f4dcc3b5aa765d61d8327deb882cf99 → "password"`,
    goodCode: `// ✅ 안전: bcrypt 해싱
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12);
run('INSERT INTO users (username, password) VALUES (?, ?)',
  [username, hash]);

// ✅ 비밀번호 변경 시 현재 비밀번호 확인
const valid = await bcrypt.compare(currentPw, user.password);
if (!valid) return res.status(400).json({ error: '현재 비밀번호 불일치' });`,
    remediation: ['bcrypt, Argon2 등 Password Hashing 알고리즘 사용 (비용 인자 12 이상)', 'MD5, SHA1은 비밀번호 해싱에 절대 사용 금지', '비밀번호 변경 전 현재 비밀번호 재확인 필수', 'HTTPS 강제 적용 (전송 중 암호화)'],
    references: ['OWASP A02:2021', 'CWE-256: Plaintext Storage of Password', 'NIST SP 800-63B']
  },
  {
    id: 'A03',
    title: 'A03 - Injection',
    cvss: 9.8, severity: 'critical',
    summary: '사용자 입력이 쿼리·명령어에 그대로 삽입돼 의도치 않은 동작을 유발합니다. SQL Injection, Stored XSS 등이 해당됩니다.',
    impact: ['SQL Injection: 비밀번호 없이 로그인, DB 전체 조회·삭제', 'Stored XSS: 세션 쿠키 탈취, 피싱 페이지 삽입', '관리자 계정 탈취 시 전체 서비스 장악'],
    scenarios: [
      { title: 'SQL Injection 로그인 우회', path: '/login', desc: "username: admin'--  입력" },
      { title: 'Stored XSS', path: '/notice/1', desc: "<script>alert(document.cookie)</script> 댓글 작성" },
    ],
    badCode: `// ❌ 취약: 문자열 연결 SQL
const query = \`SELECT * FROM users
  WHERE username = '\${username}'
  AND password = '\${password}'\`;
// 입력: admin'--  → WHERE username='admin'--' AND...
// 주석 이후 조건 무시 → admin으로 로그인

// ❌ 취약: XSS - 미이스케이프 출력
<div><%- comment.content %></div>
// <script>alert(1)</script> 그대로 실행`,
    goodCode: `// ✅ 안전: Parameterized Query
const user = get(
  'SELECT * FROM users WHERE username=? AND password=?',
  [username, password]
);

// ✅ 안전: HTML 이스케이프 출력
<div><%= comment.content %></div>
// EJS에서 <%=  %> 는 자동 이스케이프 (<%- %> 는 raw HTML)`,
    remediation: ['모든 DB 쿼리에 Parameterized Query / Prepared Statement 사용', '출력 시 HTML 이스케이프 필수 (EJS: <%- %> 금지)', 'Content Security Policy(CSP) 헤더 설정', 'WAF(Web Application Firewall) 적용 검토'],
    references: ['OWASP A03:2021', 'CWE-89: SQL Injection', 'CWE-79: XSS']
  },
  {
    id: 'A04',
    title: 'A04 - Insecure Design',
    cvss: 8.1, severity: 'high',
    summary: '보안을 설계 단계에서 고려하지 않아 발생하는 근본적인 로직 결함입니다. 코드 수정만으로는 해결되지 않고 재설계가 필요합니다.',
    impact: ['음수 송금으로 잔액 무한 증가', 'Mass Assignment로 role=admin 권한 상승', '바우처 레이스 컨디션으로 무제한 사용'],
    scenarios: [
      { title: '음수 금액 송금', path: '/dashboard/transfer', desc: 'amount=-1000000 입력 → 잔액 증가' },
      { title: 'Mass Assignment', path: '/mypage', desc: 'role=admin 파라미터 추가 후 제출' },
    ],
    badCode: `// ❌ 취약: 금액 검증 없음
const amt = parseFloat(amount); // 음수 가능
run('UPDATE users SET balance_krw = balance_krw - ? WHERE id=?',
  [amt, user.id]); // -(-1000000) = +1000000

// ❌ 취약: Mass Assignment
const role = req.body.role || user.role; // 클라이언트 입력 신뢰
run('UPDATE users SET role=? WHERE id=?', [role, user.id]);`,
    goodCode: `// ✅ 안전: 양수 검증 + 잔액 확인
if (amt <= 0) return res.status(400).json({ error: '금액은 0보다 커야 합니다' });
if (user.balance_krw < amt) return res.status(400).json({ error: '잔액 부족' });

// ✅ 안전: 허용 필드만 업데이트
const { email, username } = req.body; // role 제외
run('UPDATE users SET email=?, username=? WHERE id=?',
  [email, username, user.id]);`,
    remediation: ['모든 수치 입력에 범위·부호 검증 적용', '업데이트 가능한 필드를 화이트리스트로 명시', '중요 로직에 트랜잭션(ACID) 적용', '설계 단계에서 위협 모델링(Threat Modeling) 수행'],
    references: ['OWASP A04:2021', 'CWE-20: Improper Input Validation', 'CWE-915: Improperly Controlled Modification']
  },
  {
    id: 'A05',
    title: 'A05 - Security Misconfiguration',
    cvss: 7.2, severity: 'high',
    summary: '불필요한 기능 활성화, 기본 계정·비밀번호 사용, 상세 에러 메시지 노출 등 잘못된 보안 설정으로 인한 취약점입니다.',
    impact: ['스택 트레이스로 내부 구조·파일 경로 노출', 'X-Powered-By 헤더로 서버 기술 스택 노출', 'Path Traversal로 서버 소스코드 열람'],
    scenarios: [
      { title: 'Path Traversal', path: '/admin/download?file=../../app.js', desc: '서버 소스코드 다운로드' },
      { title: '에러 스택 노출', path: '/없는경로', desc: '상세 스택 트레이스 노출' },
    ],
    badCode: `// ❌ 취약: 경로 검증 없는 파일 다운로드
const filePath = path.join(__dirname,
  '../public/uploads/', filename);
// ?file=../../app.js → 소스코드 노출

// ❌ 취약: 스택 트레이스 노출
res.status(500).render('error', {
  stack: err.stack // 내부 경로, 코드 구조 노출
});`,
    goodCode: `// ✅ 안전: 경로 정규화 후 허용 디렉토리 검증
const safePath = path.resolve(__dirname, '../public/uploads/', filename);
const uploadDir = path.resolve(__dirname, '../public/uploads/');
if (!safePath.startsWith(uploadDir)) {
  return res.status(403).send('접근 금지');
}

// ✅ 안전: 프로덕션에서 에러 상세 숨김
if (process.env.NODE_ENV === 'production') {
  res.status(500).render('error', { message: '서버 오류가 발생했습니다.' });
} else {
  res.status(500).render('error', { message: err.message, stack: err.stack });
}`,
    remediation: ['프로덕션 환경에서 NODE_ENV=production 설정', 'X-Powered-By 헤더 비활성화 (app.disable("x-powered-by"))', 'Path Traversal: path.resolve() 후 기준 디렉토리 포함 여부 확인', '불필요한 관리 엔드포인트 제거, 기본 계정 변경'],
    references: ['OWASP A05:2021', 'CWE-200: Exposure of Sensitive Information', 'CWE-22: Path Traversal']
  },
  {
    id: 'A06',
    title: 'A06 - Vulnerable & Outdated Components',
    cvss: 7.5, severity: 'high',
    summary: '알려진 취약점이 있는 라이브러리·프레임워크를 사용하는 경우입니다. 패치 없이 방치된 컴포넌트는 공격자에게 쉬운 진입점이 됩니다.',
    impact: ['jsonwebtoken 8.5.1 (CVE-2022-23529): JWT 검증 우회', 'multer path traversal 가능', '공급망 공격(Supply Chain Attack) 위험'],
    scenarios: [
      { title: '취약 컴포넌트 확인', path: '/system/components', desc: 'CVE 목록이 포함된 패키지 버전 확인' },
    ],
    badCode: `// package.json - 취약한 버전 사용
{
  "jsonwebtoken": "^8.5.1", // CVE-2022-23529
  "multer": "^1.4.5-lts.1"  // Path Traversal 가능
}

// CVE-2022-23529: secretOrPublicKey가 falsy면 검증 스킵
jwt.verify(token, ''); // 빈 시크릿으로도 검증 통과`,
    goodCode: `// ✅ 안전: 최신 버전 + 버전 고정
{
  "jsonwebtoken": "9.0.2",   // 취약점 패치됨
  "multer": "1.4.5-lts.1"   // + 업로드 경로 검증 추가
}

// 시크릿 존재 여부 명시적 확인
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET 미설정');
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });`,
    remediation: ['npm audit 정기 실행, 취약점 즉시 패치', 'npm audit fix 또는 수동 버전 업그레이드', 'Dependabot / Snyk 등 자동 취약점 모니터링 도입', 'package-lock.json으로 버전 고정'],
    references: ['OWASP A06:2021', 'CVE-2022-23529 (jsonwebtoken)', 'NVD National Vulnerability Database']
  },
  {
    id: 'A07',
    title: 'A07 - Identification & Authentication Failures',
    cvss: 8.8, severity: 'high',
    summary: '인증 관련 취약점으로, 세션 고정·약한 JWT 시크릿·브루트포스 허용 등이 포함됩니다.',
    impact: ['약한 JWT 시크릿 크래킹 → 토큰 위조', '브루트포스로 비밀번호 추측', '세션 고정 공격(Session Fixation)'],
    scenarios: [
      { title: 'JWT 크래킹', path: '/api/token', desc: '토큰 발급 후 hashcat으로 시크릿 크래킹' },
      { title: '브루트포스', path: '/login', desc: '계정 잠금 없이 무한 시도 가능' },
    ],
    badCode: `// ❌ 취약: 약한 JWT 시크릿
const JWT_SECRET = 'secret'; // 1초 만에 크래킹

// ❌ 취약: algorithm 미지정 (none 공격)
jwt.verify(token, JWT_SECRET); // alg:none 허용 가능

// ❌ 취약: 로그인 시도 제한 없음
router.post('/login', (req, res) => {
  // 횟수 체크 없이 바로 쿼리
});`,
    goodCode: `// ✅ 안전: 강력한 랜덤 시크릿 + 알고리즘 명시
const JWT_SECRET = process.env.JWT_SECRET; // 최소 256bit 랜덤
jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

// ✅ 안전: Rate Limiting
const rateLimit = require('express-rate-limit');
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: '로그인 시도 횟수 초과. 15분 후 재시도하세요.'
});
app.use('/login', loginLimit);`,
    remediation: ['JWT 시크릿: 최소 256비트 암호학적 랜덤 값 (crypto.randomBytes)', 'algorithms 옵션 명시적 지정 (["HS256"])', '로그인 실패 5회 이상 시 CAPTCHA 또는 계정 잠금', '세션 로그인 후 session.regenerate() 호출'],
    references: ['OWASP A07:2021', 'CWE-307: Brute Force', 'CWE-384: Session Fixation']
  },
  {
    id: 'A08',
    title: 'A08 - Software & Data Integrity Failures',
    cvss: 7.2, severity: 'high',
    summary: '무결성 검증 없이 소프트웨어 업데이트를 적용하거나, 서명되지 않은 데이터를 신뢰하는 취약점입니다. CSRF, 안전하지 않은 파일 업로드 포함.',
    impact: ['CSRF: 피해자 세션으로 송금·정보변경 자동 실행', '파일 업로드: 서버에 악성 스크립트 업로드 가능', '역직렬화 공격으로 원격 코드 실행'],
    scenarios: [
      { title: 'CSRF 송금', path: '/dashboard/transfer', desc: 'CSRF 토큰 없는 폼 → 외부 사이트에서 자동 요청' },
      { title: '파일 업로드', path: '/api/upload', desc: '확장자 검증 없이 .js, .ejs 업로드 가능' },
    ],
    badCode: `// ❌ 취약: CSRF 토큰 없음
<form method="POST" action="/dashboard/transfer">
  <input name="to_username" value="attacker">
  <input name="amount" value="1000000">
  <!-- 어느 사이트에서도 이 폼 전송 가능 -->
</form>

// ❌ 취약: 파일 확장자 검증 없음
upload.single('file') // .js, .ejs, .html 모두 허용`,
    goodCode: `// ✅ 안전: CSRF 토큰 검증
const csrf = require('csurf');
app.use(csrf());
// 폼에 토큰 포함
<input type="hidden" name="_csrf" value="<%= csrfToken() %>">

// ✅ 안전: 파일 타입 + 확장자 검증
const allowedExt = ['.jpg', '.png', '.pdf'];
const ext = path.extname(file.originalname).toLowerCase();
if (!allowedExt.includes(ext)) cb(new Error('허용되지 않는 파일'));`,
    remediation: ['csurf 미들웨어로 CSRF 토큰 검증', '파일 업로드: 확장자·MIME 타입·Magic Bytes 검증', '업로드 파일을 웹 루트 외부에 저장', 'SameSite=Strict 쿠키 속성 설정'],
    references: ['OWASP A08:2021', 'CWE-352: CSRF', 'CWE-434: Unrestricted File Upload']
  },
  {
    id: 'A09',
    title: 'A09 - Security Logging & Monitoring Failures',
    cvss: 6.5, severity: 'medium',
    summary: '보안 관련 이벤트가 기록되지 않거나, 로그를 모니터링하지 않아 침해 탐지가 불가능한 상태입니다.',
    impact: ['출금·로그인 등 중요 이벤트 미기록 → 사후 추적 불가', '침해 사고 발생 후 원인 분석 불가', '규정(PCI-DSS, GDPR) 위반'],
    scenarios: [
      { title: 'API 출금 로그 없음', path: '/api/withdraw', desc: '출금 후 transactions 테이블 미기록' },
      { title: '감사 로그', path: '/system/audit', desc: '기록된 로그 확인 (인증 없이 접근 가능 - 이중 취약점)' },
    ],
    badCode: `// ❌ 취약: 출금 후 로그 없음
router.post('/withdraw', verifyToken, (req, res) => {
  run('UPDATE users SET balance_btc = balance_btc - ?',
    [amount, user.id]);
  // 트랜잭션 로그 기록 없음!
  res.json({ success: true });
});`,
    goodCode: `// ✅ 안전: 모든 중요 이벤트 기록
router.post('/withdraw', verifyToken, async (req, res) => {
  run('UPDATE users SET balance_btc = balance_btc - ?',
    [amount, user.id]);
  // 감사 로그 기록
  run('INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (?,?,?,?)',
    [user.id, 'WITHDRAW', \`\${amount} BTC to \${address}\`, req.ip]);
  // 거래 내역 기록
  run('INSERT INTO transactions (...) VALUES (...)', [...]);
  res.json({ success: true });
});`,
    remediation: ['로그인 성공/실패, 출금, 권한 변경 등 모든 중요 이벤트 기록', '로그에 타임스탬프, IP, 사용자 ID, 액션 상세 포함', 'ELK Stack, Splunk 등 SIEM 도입 검토', '로그 파일 접근 제한 (관리자만 조회 가능)'],
    references: ['OWASP A09:2021', 'CWE-778: Insufficient Logging', 'PCI-DSS Requirement 10']
  },
  {
    id: 'A10',
    title: 'A10 - Server-Side Request Forgery (SSRF)',
    cvss: 8.6, severity: 'high',
    summary: '서버가 공격자가 제어하는 URL로 요청을 보내도록 유도해, 내부 네트워크나 클라우드 메타데이터에 접근하는 취약점입니다.',
    impact: ['내부 서비스(localhost, 192.168.x.x) 접근', 'AWS/GCP 메타데이터 서버에서 IAM 자격증명 탈취', '내부 관리 API, Redis, DB 등 접근'],
    scenarios: [
      { title: 'SSRF - 내부 API 접근', path: '/admin/price-fetch', desc: 'http://127.0.0.1:3000/api/users 입력' },
    ],
    badCode: `// ❌ 취약: URL 검증 없는 외부 요청
router.post('/price-fetch', async (req, res) => {
  const { url } = req.body;
  const response = await axios.get(url); // 어떤 URL이든 요청
  res.json(response.data);
  // http://169.254.169.254/ → AWS 메타데이터 접근
});`,
    goodCode: `// ✅ 안전: 허용 도메인 화이트리스트
const ALLOWED = ['api.coindesk.com', 'api.bithumb.com'];
const { hostname } = new URL(url);
if (!ALLOWED.includes(hostname)) {
  return res.status(403).json({ error: '허용되지 않는 도메인' });
}

// ✅ Private IP 차단
const ip = await dns.resolve(hostname);
if (isPrivateIP(ip)) {
  return res.status(403).json({ error: '내부 IP 접근 차단' });
}`,
    remediation: ['URL 파싱 후 hostname을 화이트리스트와 비교', 'Private/Loopback IP(127.x, 10.x, 172.16-31.x, 192.168.x) 차단', 'DNS Rebinding 방어: IP 재확인 후 요청', '클라우드: IMDSv2 강제 적용 (AWS)'],
    references: ['OWASP A10:2021', 'CWE-918: SSRF', 'PortSwigger SSRF Labs']
  }
];

module.exports = vulns;
