const express = require('express');
const router = express.Router();
const { get, all, run, saveDb } = require('../database/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// A02: 약한 JWT 시크릿
const JWT_SECRET = 'secret';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname)  // A05: 원본 파일명 그대로 사용
});
const upload = multer({ storage });

// A07: JWT 발급 (알고리즘 명시 없음, 약한 시크릿)
router.post('/token', (req, res) => {
  const { username, password } = req.body;
  const user = get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);

  if (!user) {
    return res.json({ error: '인증 실패' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token });
});

// A07: JWT 검증 - algorithm 미지정 (none 알고리즘 공격 가능)
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '토큰 없음' });

  try {
    // 취약: algorithms 옵션 미지정
    const decoded = jwt.verify(token, JWT_SECRET);
    req.apiUser = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: '유효하지 않은 토큰', detail: e.message });
  }
}

// A01: API Key 인증 - 헤더 또는 쿼리스트링으로 전달 (노출 위험)
function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) return res.status(401).json({ error: 'API Key 없음' });

  const user = get('SELECT * FROM users WHERE api_key = ?', [apiKey]);
  if (!user) return res.status(401).json({ error: '유효하지 않은 API Key' });

  req.apiUser = user;
  next();
}

// 잔액 조회 API
router.get('/balance/:userId', verifyApiKey, (req, res) => {
  // A01: IDOR - 자신의 정보만 조회해야 하지만 다른 유저 ID로 조회 가능
  const user = get('SELECT id, username, balance_krw, balance_btc, balance_eth FROM users WHERE id = ?', [req.params.userId]);
  if (!user) return res.status(404).json({ error: '유저 없음' });
  res.json(user);
});

// 전체 유저 목록 API (A01: 인증 없이 접근 가능)
router.get('/users', (req, res) => {
  const users = all('SELECT id, username, email, role, balance_krw, balance_btc, api_key FROM users');
  res.json(users);
});

// A05: 파일 업로드 - 확장자 검증 없음
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ error: '파일 없음' });
  res.json({
    success: true,
    filename: req.file.originalname,
    path: `/public/uploads/${req.file.originalname}`
  });
});

// A09: 중요 액션에 로그 없음
router.post('/withdraw', verifyToken, (req, res) => {
  const { coin, amount, address } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.apiUser.id]);
  const balanceField = coin === 'BTC' ? 'balance_btc' : coin === 'ETH' ? 'balance_eth' : 'balance_krw';

  // 출금 로그 없음 (A09)
  run(`UPDATE users SET ${balanceField} = ${balanceField} - ? WHERE id = ?`, [parseFloat(amount), user.id]);
  saveDb();
  res.json({ success: true, message: `${amount} ${coin} 출금 처리됨` });
});

module.exports = router;
