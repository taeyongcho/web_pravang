const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDb } = require('./database/db');

const app = express();
const PORT = 3000;


// A05: 버전 정보 헤더 노출 (기본값 유지)
// app.disable('x-powered-by'); // 비활성화하지 않음

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// A07: 약한 세션 시크릿, 세션 설정 취약
app.use(session({
  secret: 'pravang-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: false,  // A03: HttpOnly 미설정 → XSS로 세션 탈취 가능
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// 라우터
app.use('/', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/notice', require('./routes/notice'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));
app.use('/challenges', require('./routes/challenges'));
app.use('/system', require('./routes/system'));
app.use('/trade', require('./routes/trade').router);
app.use('/wallet', require('./routes/wallet'));
app.use('/mypage', require('./routes/mypage'));

// 메인 페이지
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

// A05: 상세 에러 메시지 노출
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    message: err.message,
    stack: err.stack,  // 스택 트레이스 노출
    user: req.session.user || null
  });
});

app.use((req, res) => {
  res.status(404).render('error', {
    message: `경로를 찾을 수 없습니다: ${req.path}`,
    user: req.session.user || null
  });
});
 
initDb().then(() => {
  // PORT 변수(3000)를 사용하고, '0.0.0.0'으로 모든 네트워크 인터페이스 허용
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 프라방 취약점 훈련 거래소 시작!`);
    console.log(`📌 외부 접근 주소: http://192.168.11.3:${PORT}`);
    console.log(`\n⚠️  이 서버는 훈련용입니다. 절대 외부에 노출하지 마세요!\n`);
  });
}).catch(err => {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
});