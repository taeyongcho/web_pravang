const express = require('express');
const router = express.Router();
const { all, get, run, rawQuery, saveDb } = require('../database/db');
const { requireAdmin } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// A01: 관리자 페이지 - role 파라미터로 우회 가능 (middleware에서 취약하게 구현)
router.get('/', requireAdmin, (req, res) => {
  const users = all('SELECT * FROM users');
  const txs = all('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20');

  // 대시보드 통계
  const stats = {
    totalUsers:   (get('SELECT COUNT(*) as c FROM users') || {}).c || 0,
    activeUsers:  (get("SELECT COUNT(DISTINCT user_id) as c FROM login_attempts WHERE success=1 AND attempted_at > datetime('now','-1 day')") || {}).c || 0,
    todaySolves:  (get("SELECT COUNT(*) as c FROM solves WHERE solved_at > datetime('now','start of day')") || {}).c || 0,
    totalSolves:  (get('SELECT COUNT(*) as c FROM solves') || {}).c || 0,
    totalOrders:  (get('SELECT COUNT(*) as c FROM shop_orders') || {}).c || 0,
    pendingOrders:(get("SELECT COUNT(*) as c FROM shop_orders WHERE status='pending'") || {}).c || 0,
    totalCodes:   (get('SELECT COUNT(*) as c FROM invite_codes') || {}).c || 0,
    usedCodes:    (get('SELECT SUM(used_count) as c FROM invite_codes') || {}).c || 0,
  };

  // 최근 챌린지 풀이 (5건)
  const recentSolves = all(`
    SELECT u.username, s.challenge_id, s.solved_at
    FROM solves s JOIN users u ON s.user_id = u.id
    ORDER BY s.solved_at DESC LIMIT 5
  `);

  res.render('admin/index', { users, txs, user: req.session.user, result: null, stats, recentSolves });
});

// A03: 관리자용 SQL 직접 실행 기능
router.post('/query', requireAdmin, (req, res) => {
  const { sql } = req.body;
  const result = rawQuery(sql);
  const users = all('SELECT * FROM users');
  const txs = all('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20');
  const stats = {
    totalUsers:   (get('SELECT COUNT(*) as c FROM users') || {}).c || 0,
    activeUsers:  (get("SELECT COUNT(DISTINCT user_id) as c FROM login_attempts WHERE success=1 AND attempted_at > datetime('now','-1 day')") || {}).c || 0,
    todaySolves:  (get("SELECT COUNT(*) as c FROM solves WHERE solved_at > datetime('now','start of day')") || {}).c || 0,
    totalSolves:  (get('SELECT COUNT(*) as c FROM solves') || {}).c || 0,
    totalOrders:  (get('SELECT COUNT(*) as c FROM shop_orders') || {}).c || 0,
    pendingOrders:(get("SELECT COUNT(*) as c FROM shop_orders WHERE status='pending'") || {}).c || 0,
    totalCodes:   (get('SELECT COUNT(*) as c FROM invite_codes') || {}).c || 0,
    usedCodes:    (get('SELECT SUM(used_count) as c FROM invite_codes') || {}).c || 0,
  };
  const recentSolves = all(`SELECT u.username, s.challenge_id, s.solved_at FROM solves s JOIN users u ON s.user_id = u.id ORDER BY s.solved_at DESC LIMIT 5`);
  res.render('admin/index', { users, txs, user: req.session.user, result, executedSql: sql, stats, recentSolves });
});

// 사용자 편집 (잔액 조정, 권한 변경, 활성화)
router.post('/user/edit', requireAdmin, (req, res) => {
  const { userId, role, balance_krw, balance_btc, balance_eth, is_active } = req.body;
  run(`UPDATE users SET role=?, balance_krw=?, balance_btc=?, balance_eth=?, is_active=? WHERE id=?`,
    [role, parseFloat(balance_krw)||0, parseFloat(balance_btc)||0, parseFloat(balance_eth)||0,
     is_active === '1' ? 1 : 0, userId]);
  saveDb();
  res.redirect('/admin?success=수정완료');
});

// 사용자 풀이 초기화
router.post('/user/reset-solves', requireAdmin, (req, res) => {
  run('DELETE FROM solves WHERE user_id = ?', [req.body.userId]);
  saveDb();
  res.redirect('/admin?success=풀이초기화완료');
});

// A10: SSRF - 외부 URL로 시세 정보 가져오기
router.get('/price-fetch', requireAdmin, (req, res) => {
  res.render('admin/price-fetch', { user: req.session.user, result: null, error: null });
});

router.post('/price-fetch', requireAdmin, async (req, res) => {
  const { url } = req.body;
  const axios = require('axios');
  try {
    // SSRF 취약: URL 검증 없이 요청 전송
    const response = await axios.get(url, { timeout: 5000 });
    res.render('admin/price-fetch', {
      user: req.session.user,
      result: JSON.stringify(response.data, null, 2),
      error: null, fetchedUrl: url
    });
  } catch (e) {
    res.render('admin/price-fetch', {
      user: req.session.user,
      result: null,
      error: `요청 실패: ${e.message}`, fetchedUrl: url
    });
  }
});

// A05: 파일 다운로드 경로 조작 (Path Traversal)
router.get('/download', requireAdmin, (req, res) => {
  const filename = req.query.file;
  if (!filename) return res.send('file 파라미터가 필요합니다.');
  // Path Traversal 취약: 경로 검증 없음
  const filePath = path.join(__dirname, '../', filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send(`파일을 찾을 수 없습니다: ${filePath}`);
  }
});

// A08: 웹셸 실행 - 업로드된 EJS 파일을 서버에서 렌더링 (RCE 취약점)
router.get('/shell-view', requireAdmin, (req, res) => {
  const file = req.query.file;
  const uploadDir = path.join(__dirname, '../public/uploads/');
  const files = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];

  if (!file) {
    return res.render('admin/shell-view', {
      user: req.session.user, file: null, output: null, error: null, files
    });
  }

  // A08: 경로 검증 없이 업로드 파일을 EJS로 렌더링 → RCE 가능
  const filePath = path.join(uploadDir, file);
  if (!fs.existsSync(filePath)) {
    return res.render('admin/shell-view', {
      user: req.session.user, file, output: null,
      error: '파일을 찾을 수 없습니다.', files
    });
  }

  try {
    const ejs = require('ejs');
    const template = fs.readFileSync(filePath, 'utf8');
    const output = ejs.render(template, {
      query: req.query,
      require,       // require 노출 → child_process 접근 가능
      process,       // 환경변수 접근 가능
      __dirname,
      fs
    });
    res.render('admin/shell-view', {
      user: req.session.user, file, output, error: null, files
    });
  } catch (e) {
    res.render('admin/shell-view', {
      user: req.session.user, file, output: null, error: e.message, files
    });
  }
});

// 초대 코드 관리
router.get('/invite-codes', requireAdmin, (req, res) => {
  const codes = all('SELECT * FROM invite_codes ORDER BY created_at DESC');
  res.render('admin/invite-codes', { user: req.session.user, codes, success: req.query.success, error: req.query.error });
});

router.post('/invite-codes/create', requireAdmin, (req, res) => {
  const { memo, max_uses, expires_at, custom_code } = req.body;
  const code = custom_code && custom_code.trim()
    ? custom_code.trim().toUpperCase()
    : 'AXIO-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  try {
    run('INSERT INTO invite_codes (code, memo, max_uses, expires_at) VALUES (?, ?, ?, ?)',
      [code, memo || '', parseInt(max_uses) || 1, expires_at || null]);
    saveDb();
    res.redirect('/admin/invite-codes?success=' + encodeURIComponent('코드 생성 완료: ' + code));
  } catch(e) {
    res.redirect('/admin/invite-codes?error=' + encodeURIComponent('코드 생성 실패: ' + e.message));
  }
});

router.post('/invite-codes/delete', requireAdmin, (req, res) => {
  run('DELETE FROM invite_codes WHERE id = ?', [req.body.id]);
  saveDb();
  res.redirect('/admin/invite-codes?success=삭제되었습니다');
});

// 유저 삭제
router.post('/user/delete', requireAdmin, (req, res) => {
  const { userId } = req.body;
  run('DELETE FROM users WHERE id = ?', [userId]);
  saveDb();
  res.redirect('/admin');
});

module.exports = router;
