const express = require('express');
const router = express.Router();
const { get, all, run, saveDb } = require('../database/db');
const { requireLogin } = require('../middleware/auth');

// 지갑 목록
router.get('/', requireLogin, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  // A01: 전체 지갑 목록 노출 (user_id 필터 없음 - 취약점)
  const wallets = all('SELECT w.*, u.username FROM wallets w JOIN users u ON w.user_id = u.id');
  res.render('wallet/index', { user, wallets, success: null, error: null });
});

// 지갑 주소 추가
router.post('/add', requireLogin, (req, res) => {
  const { coin, address, label } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

  // A04: 주소 형식 검증 없음
  run('INSERT INTO wallets (user_id, coin, address, label) VALUES (?,?,?,?)',
    [req.session.user.id, coin.toUpperCase(), address, label]);
  saveDb();

  const wallets = all('SELECT w.*, u.username FROM wallets w JOIN users u ON w.user_id = u.id');
  res.render('wallet/index', { user, wallets, success: '지갑 주소가 등록되었습니다.', error: null });
});

// A01: 지갑 삭제 - 소유자 확인 없음 (IDOR)
router.post('/delete/:id', requireLogin, (req, res) => {
  const wallet = get('SELECT * FROM wallets WHERE id = ?', [req.params.id]);
  if (!wallet) {
    const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    const wallets = all('SELECT w.*, u.username FROM wallets w JOIN users u ON w.user_id = u.id');
    return res.render('wallet/index', { user, wallets, success: null, error: '지갑을 찾을 수 없습니다.' });
  }

  // IDOR 취약: wallet.user_id !== req.session.user.id 여도 삭제 가능
  run('DELETE FROM wallets WHERE id = ?', [req.params.id]);
  saveDb();

  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const wallets = all('SELECT w.*, u.username FROM wallets w JOIN users u ON w.user_id = u.id');
  res.render('wallet/index', { user, wallets, success: '삭제되었습니다.', error: null });
});

module.exports = router;
