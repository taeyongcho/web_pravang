const express = require('express');
const router = express.Router();
const { get, run, rawQuery, saveDb } = require('../database/db');
const md5 = require('md5');

// 로그인 페이지
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null, user: null });
});

// A03: SQL Injection - 로그인 쿼리를 문자열 연결로 구성
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 취약한 쿼리 (SQL Injection 가능)
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  const result = rawQuery(query);

  if (!result.success) {
    return res.render('login', {
      error: `DB 오류: ${result.error}`,
      user: null,
      debugQuery: query
    });
  }

  const rows = result.results[0];
  if (rows && rows.values && rows.values.length > 0) {
    const cols = rows.columns;
    const vals = rows.values[0];
    const user = {};
    cols.forEach((c, i) => { user[c] = vals[i]; });

    // A07: 세션 재생성 없이 로그인 (세션 고정 취약점)
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email
    };
    return res.redirect('/dashboard');
  }

  res.render('login', {
    error: '아이디 또는 비밀번호가 올바르지 않습니다.',
    user: null,
    debugQuery: query  // A05: 디버그 정보 노출
  });
});

// 회원가입 페이지
router.get('/register', (req, res) => {
  res.render('register', { error: null, user: null });
});

// A02: 비밀번호 평문 저장 (취약점)
router.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  const existing = get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    return res.render('register', { error: '이미 사용 중인 아이디입니다.', user: null });
  }

  // 비밀번호를 평문으로 저장 (취약점)
  run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, password, email]
  );

  res.redirect('/login');
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
