const express = require('express');
const router = express.Router();
const { get, run, all, saveDb } = require('../database/db');
const { requireLogin } = require('../middleware/auth');

// 마이페이지
router.get('/', requireLogin, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const solves = all(
    'SELECT challenge_id, solved_at FROM solves WHERE user_id = ? ORDER BY solved_at DESC',
    [user.id]
  );
  const txs = all(
    'SELECT * FROM transactions WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC LIMIT 10',
    [user.id, user.id]
  );
  res.render('mypage/index', { user, solves, txs, success: null, error: null });
});

// A02: 비밀번호 변경 - 현재 비밀번호 확인 없이 변경 가능 (취약점)
router.post('/password', requireLogin, (req, res) => {
  const { new_password } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

  // A02 취약: 현재 비밀번호 확인 없이 변경, 평문 저장
  run('UPDATE users SET password = ? WHERE id = ?', [new_password, user.id]);
  run('INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (?,?,?,?)',
    [user.id, 'PASSWORD_CHANGE', '현재 비밀번호 확인 없이 변경됨', req.ip]);
  saveDb();

  const solves = all('SELECT challenge_id, solved_at FROM solves WHERE user_id = ?', [user.id]);
  const txs = all(
    'SELECT * FROM transactions WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC LIMIT 10',
    [user.id, user.id]
  );
  const updatedUser = get('SELECT * FROM users WHERE id = ?', [user.id]);
  res.render('mypage/index', { user: updatedUser, solves, txs, success: '비밀번호가 변경되었습니다.', error: null });
});

// A04: 프로필 수정 - role 필드도 함께 수정 가능 (Mass Assignment 취약점)
router.post('/profile', requireLogin, (req, res) => {
  const { email, username } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

  // A04 취약: req.body를 그대로 신뢰, role 같은 필드도 쿼리로 전달 가능
  // 예: username=hack&role=admin 형태로 전송 가능
  const role = req.body.role || user.role;  // role 파라미터 직접 받음 (Mass Assignment)

  run('UPDATE users SET email = ?, username = ?, role = ? WHERE id = ?',
    [email, username, role, user.id]);
  run('INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (?,?,?,?)',
    [user.id, 'PROFILE_UPDATE', `username=${username}, role=${role}`, req.ip]);
  saveDb();

  // 세션 동기화
  req.session.user.username = username;
  req.session.user.role = role;

  const solves = all('SELECT challenge_id, solved_at FROM solves WHERE user_id = ?', [user.id]);
  const txs = all(
    'SELECT * FROM transactions WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC LIMIT 10',
    [user.id, user.id]
  );
  const updatedUser = get('SELECT * FROM users WHERE id = ?', [user.id]);
  res.render('mypage/index', { user: updatedUser, solves, txs, success: '프로필이 수정되었습니다.', error: null });
});

module.exports = router;
