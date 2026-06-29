const express = require('express');
const router = express.Router();
const { get, run, rawQuery, saveDb } = require('../database/db');

// 로그인 페이지
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null, user: null, attemptCount: 0 });
});

// A03: SQL Injection - 로그인 쿼리를 문자열 연결로 구성
// A07: 브루트포스 카운터 (잠금은 없음 - 훈련용으로 횟수만 기록)
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  // 취약한 쿼리 (SQL Injection 가능)
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  const result = rawQuery(query);

  if (!result.success) {
    run('INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, 0)', [ip, username]);
    saveDb();
    return res.render('login', {
      error: `DB 오류: ${result.error}`,
      user: null,
      debugQuery: query,
      attemptCount: getAttemptCount(ip)
    });
  }

  const rows = result.results[0];
  if (rows && rows.values && rows.values.length > 0) {
    const cols = rows.columns;
    const vals = rows.values[0];
    const user = {};
    cols.forEach((c, i) => { user[c] = vals[i]; });

    run('INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, 1)', [ip, username]);
    run('INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (?, ?, ?, ?)',
      [user.id, 'LOGIN_SUCCESS', username, ip]);
    saveDb();

    // A07: 세션 재생성 없이 로그인 (세션 고정 취약점)
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email
    };
    return res.redirect('/dashboard');
  }

  // 실패 기록
  run('INSERT INTO login_attempts (ip, username, success) VALUES (?, ?, 0)', [ip, username]);
  saveDb();

  const attemptCount = getAttemptCount(ip);

  res.render('login', {
    error: '아이디 또는 비밀번호가 올바르지 않습니다.',
    user: null,
    debugQuery: query,  // A05: 디버그 정보 노출
    attemptCount
  });
});

function getAttemptCount(ip) {
  try {
    const row = get(
      "SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND success = 0 AND attempted_at > datetime('now', '-10 minutes')",
      [ip]
    );
    return row ? row.cnt : 0;
  } catch (e) {
    return 0;
  }
}

// 회원가입 페이지
router.get('/register', (req, res) => {
  res.render('register', { error: null, success: null, user: null });
});

// A02: 비밀번호 평문 저장 + 초대 코드 검증
router.post('/register', (req, res) => {
  const { username, password, email, invite_code } = req.body;

  // 초대 코드 검증
  if (!invite_code) {
    return res.render('register', { error: '초대 코드가 필요합니다.', success: null, user: null });
  }
  const code = get('SELECT * FROM invite_codes WHERE code = ?', [invite_code]);
  if (!code) {
    return res.render('register', { error: '유효하지 않은 초대 코드입니다.', success: null, user: null });
  }
  if (code.used_count >= code.max_uses) {
    return res.render('register', { error: '이미 사용 횟수가 초과된 코드입니다.', success: null, user: null });
  }
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    return res.render('register', { error: '만료된 초대 코드입니다.', success: null, user: null });
  }

  const existing = get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    return res.render('register', { error: '이미 사용 중인 아이디입니다.', success: null, user: null });
  }

  // 비밀번호를 평문으로 저장 (취약점)
  run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, email]);
  run('UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ?', [code.id]);
  run('INSERT INTO invite_code_uses (code_id, code, username) VALUES (?, ?, ?)', [code.id, invite_code, username]);
  saveDb();

  res.redirect('/login');
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
