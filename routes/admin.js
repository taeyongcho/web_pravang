const express = require('express');
const router = express.Router();
const { all, get, run, rawQuery, saveDb } = require('../database/db');
const { requireAdmin } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// A01: 관리자 페이지 - role 파라미터로 우회 가능 (middleware에서 취약하게 구현)
router.get('/', requireAdmin, (req, res) => {
  const users = all('SELECT * FROM users');
  const txs = all('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20');
  res.render('admin/index', { users, txs, user: req.session.user, result: null });
});

// A03: 관리자용 SQL 직접 실행 기능
router.post('/query', requireAdmin, (req, res) => {
  const { sql } = req.body;
  const result = rawQuery(sql);
  const users = all('SELECT * FROM users');
  const txs = all('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20');
  res.render('admin/index', { users, txs, user: req.session.user, result, executedSql: sql });
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
      error: null,
      fetchedUrl: url
    });
  } catch (e) {
    res.render('admin/price-fetch', {
      user: req.session.user,
      result: null,
      error: `요청 실패: ${e.message}`,
      fetchedUrl: url
    });
  }
});

// A05: 파일 다운로드 경로 조작 (Path Traversal)
router.get('/download', requireAdmin, (req, res) => {
  const filename = req.query.file;
  if (!filename) {
    return res.send('file 파라미터가 필요합니다.');
  }
  // Path Traversal 취약: 경로 검증 없음
  const filePath = path.join(__dirname, '../public/uploads/', filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send(`파일을 찾을 수 없습니다: ${filePath}`);
  }
});

// 유저 삭제
router.post('/user/delete', requireAdmin, (req, res) => {
  const { userId } = req.body;
  run('DELETE FROM users WHERE id = ?', [userId]);
  saveDb();
  res.redirect('/admin');
});

module.exports = router;
