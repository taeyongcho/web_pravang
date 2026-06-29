const express = require('express');
const router = express.Router();
const { get, all, run, rawQuery, saveDb } = require('../database/db');
const { requireLogin } = require('../middleware/auth');

// 대시보드
router.get('/', requireLogin, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const txs = all(
    'SELECT * FROM transactions WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC LIMIT 5',
    [user.id, user.id]
  );
  res.render('dashboard', { user, txs, prices: getMockPrices() });
});

// A01: IDOR - 다른 유저 정보 조회 (id 파라미터 검증 없음)
router.get('/account/:id', requireLogin, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) {
    return res.status(404).render('error', { message: '유저를 찾을 수 없습니다.', user: req.session.user });
  }
  const txs = all(
    'SELECT * FROM transactions WHERE from_user_id = ? OR to_user_id = ? ORDER BY created_at DESC',
    [user.id, user.id]
  );
  res.render('account', { targetUser: user, user: req.session.user, txs });
});

// 송금 페이지
router.get('/transfer', requireLogin, (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  res.render('transfer', { user, error: null, success: null });
});

// A08: CSRF - csrf 토큰 없음, A04: amount 음수 입력 가능 (잔액 증가)
router.post('/transfer', requireLogin, (req, res) => {
  const { to_username, coin, amount, memo } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const toUser = get('SELECT * FROM users WHERE username = ?', [to_username]);
  const amt = parseFloat(amount);

  if (!toUser) {
    return res.render('transfer', { user, error: '존재하지 않는 사용자입니다.', success: null });
  }

  const balanceField = coin === 'BTC' ? 'balance_btc' : coin === 'ETH' ? 'balance_eth' : 'balance_krw';

  // A04: 음수 amount 체크 없음 → 음수 송금으로 잔액 증가 가능
  run(`UPDATE users SET ${balanceField} = ${balanceField} - ${amt} WHERE id = ?`, [user.id]);
  run(`UPDATE users SET ${balanceField} = ${balanceField} + ${amt} WHERE id = ?`, [toUser.id]);
  run(
    'INSERT INTO transactions (from_user_id, to_user_id, coin, amount, tx_type, memo) VALUES (?,?,?,?,?,?)',
    [user.id, toUser.id, coin, amt, 'transfer', memo || '']
  );
  saveDb();

  const updatedUser = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  res.render('transfer', { user: updatedUser, error: null, success: `${to_username}에게 ${amount} ${coin} 전송 완료` });
});

// 바우처 사용 (A04: 로직 결함)
router.post('/voucher', requireLogin, (req, res) => {
  const { code } = req.body;
  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

  const voucher = get('SELECT * FROM vouchers WHERE code = ?', [code]);
  if (!voucher) {
    return res.render('dashboard', { user, txs: [], prices: getMockPrices(), voucherError: '유효하지 않은 쿠폰입니다.' });
  }

  // A04: used 플래그 체크 후 업데이트 사이에 레이스 컨디션 가능
  if (voucher.used) {
    return res.render('dashboard', { user, txs: [], prices: getMockPrices(), voucherError: '이미 사용된 쿠폰입니다.' });
  }

  run('UPDATE users SET balance_krw = balance_krw + ? WHERE id = ?', [voucher.amount, user.id]);
  run('UPDATE vouchers SET used = 1 WHERE code = ?', [code]);
  saveDb();

  res.redirect('/dashboard');
});

function getMockPrices() {
  return {
    BTC: 85000000 + Math.floor(Math.random() * 1000000),
    ETH: 4200000 + Math.floor(Math.random() * 100000),
    XRP: 720 + Math.floor(Math.random() * 50)
  };
}

module.exports = router;
