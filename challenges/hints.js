const challenges = [
  {
    id: 'A01-1',
    category: 'A01 - Broken Access Control',
    title: '다른 유저 계좌 조회 (IDOR)',
    description: '자신의 계좌 정보가 아닌 다른 유저의 계좌 정보를 조회해보세요.',
    target: '/dashboard/account/:id',
    difficulty: 'easy',
    hints: [
      'URL의 :id 파라미터를 변경해보세요.',
      '/dashboard/account/1 에 접근해보면 어떨까요?',
      '서버에서 현재 로그인한 사용자와 요청한 ID를 비교하는 코드가 없습니다.'
    ],
    flag: 'PRAVANG{IDOR_account_access_1337}'
  },
  {
    id: 'A01-2',
    category: 'A01 - Broken Access Control',
    title: '관리자 페이지 접근',
    description: '일반 유저로 관리자 페이지에 접근해보세요.',
    target: '/admin',
    difficulty: 'easy',
    hints: [
      '관리자 권한 체크 미들웨어를 살펴보세요.',
      'URL에 쿼리 파라미터를 추가해보세요.',
      '/admin?role=admin 으로 접근해보세요.'
    ],
    flag: 'PRAVANG{broken_access_control_admin_bypass}'
  },
  {
    id: 'A02-1',
    category: 'A02 - Cryptographic Failures',
    title: '비밀번호 저장 방식 확인',
    description: '데이터베이스에서 비밀번호가 어떻게 저장되어 있는지 확인하세요.',
    target: '/admin/query',
    difficulty: 'medium',
    hints: [
      '관리자 페이지의 SQL 실행 기능을 이용하세요.',
      'SELECT * FROM users 쿼리를 실행해보세요.',
      '일부 비밀번호는 평문, 일부는 MD5 해시로 저장되어 있습니다.'
    ],
    flag: 'PRAVANG{weak_crypto_md5_plaintext}'
  },
  {
    id: 'A03-1',
    category: 'A03 - Injection (SQL)',
    title: 'SQL Injection으로 로그인 우회',
    description: '비밀번호 없이 admin 계정으로 로그인해보세요.',
    target: '/login',
    difficulty: 'easy',
    hints: [
      '로그인 쿼리가 문자열 연결로 구성됩니다.',
      "username 필드에 SQL 주석을 활용해보세요.",
      "username: admin'-- 또는 admin'/*"
    ],
    flag: 'PRAVANG{sqli_login_bypass_success}'
  },
  {
    id: 'A03-2',
    category: 'A03 - Injection (XSS)',
    title: 'Stored XSS',
    description: '공지사항 댓글에 XSS 페이로드를 삽입해보세요.',
    target: '/notice',
    difficulty: 'easy',
    hints: [
      '댓글 내용이 HTML 이스케이프 없이 렌더링됩니다.',
      '<script>alert(1)</script> 를 댓글로 작성해보세요.',
      'img 태그의 onerror 속성도 활용 가능합니다.'
    ],
    flag: 'PRAVANG{stored_xss_in_comments}'
  },
  {
    id: 'A04-1',
    category: 'A04 - Insecure Design',
    title: '음수 송금으로 잔액 증가',
    description: '송금 금액을 음수로 입력하여 자신의 잔액을 늘려보세요.',
    target: '/dashboard/transfer',
    difficulty: 'medium',
    hints: [
      '송금 금액에 서버 측 검증이 없습니다.',
      'amount 파라미터에 음수 값을 전송해보세요.',
      'Burp Suite로 요청을 가로채 amount=-1000000 으로 변조해보세요.'
    ],
    flag: 'PRAVANG{insecure_design_negative_transfer}'
  },
  {
    id: 'A05-1',
    category: 'A05 - Security Misconfiguration',
    title: 'Path Traversal',
    description: '파일 다운로드 기능을 이용해 서버의 설정 파일을 읽어보세요.',
    target: '/admin/download',
    difficulty: 'medium',
    hints: [
      'file 파라미터에 디렉토리 트래버설 문자열을 사용해보세요.',
      '?file=../../app.js 로 접근해보세요.',
      'package.json에서 사용 중인 라이브러리 버전을 확인할 수 있습니다.'
    ],
    flag: 'PRAVANG{path_traversal_config_leak}'
  },
  {
    id: 'A07-1',
    category: 'A07 - Auth Failures',
    title: 'JWT 약한 시크릿 크래킹',
    description: 'API 토큰의 JWT 시크릿을 크래킹하고 admin 권한 토큰을 생성해보세요.',
    target: '/api/token',
    difficulty: 'hard',
    hints: [
      '/api/token으로 토큰을 발급받아보세요.',
      'jwt.io 또는 hashcat으로 시크릿을 크래킹해보세요.',
      '시크릿은 매우 간단한 단어입니다.',
      '크래킹 후 role: admin 으로 토큰을 재서명하세요.'
    ],
    flag: 'PRAVANG{jwt_weak_secret_cracked}'
  },
  {
    id: 'A08-1',
    category: 'A08 - Data Integrity Failures',
    title: '파일 업로드 취약점',
    description: '파일 업로드 기능을 통해 웹셸을 업로드해보세요.',
    target: '/api/upload',
    difficulty: 'hard',
    hints: [
      '파일 업로드 시 확장자 검증이 없습니다.',
      'JWT 토큰이 필요합니다. /api/token에서 발급받으세요.',
      '.js 또는 .ejs 파일을 업로드해보세요.'
    ],
    flag: 'PRAVANG{file_upload_webshell}'
  },
  {
    id: 'A09-1',
    category: 'A09 - Logging Failures',
    title: '출금 로그 미존재 확인',
    description: 'API를 통해 출금 후 로그가 기록되지 않음을 확인하세요.',
    target: '/api/withdraw',
    difficulty: 'medium',
    hints: [
      '/api/withdraw 엔드포인트로 출금을 요청하세요.',
      '출금 후 거래 내역 DB에 로그가 없음을 확인하세요.',
      'transactions 테이블을 조회해보세요.'
    ],
    flag: 'PRAVANG{no_audit_log_for_withdrawal}'
  },
  {
    id: 'A10-1',
    category: 'A10 - SSRF',
    title: 'SSRF로 내부 서비스 접근',
    description: '시세 정보 가져오기 기능으로 내부 서버에 접근해보세요.',
    target: '/admin/price-fetch',
    difficulty: 'hard',
    hints: [
      '외부 URL 요청 시 URL 검증이 없습니다.',
      'http://localhost:3000 또는 http://127.0.0.1:3000 을 입력해보세요.',
      '내부 관리 API에도 접근해볼 수 있습니다.'
    ],
    flag: 'PRAVANG{ssrf_internal_access}'
  }
];

module.exports = challenges;
