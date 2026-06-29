const express = require('express');
const router = express.Router();
const { get, all, run, saveDb } = require('../database/db');
const { requireLogin } = require('../middleware/auth');

// 공지사항 목록
router.get('/', (req, res) => {
  const notices = all('SELECT * FROM notices ORDER BY created_at DESC');
  res.render('notice/list', { notices, user: req.session.user || null });
});

// 공지사항 상세 + 댓글 (A03: XSS - content, 댓글 미필터링)
router.get('/:id', (req, res) => {
  run('UPDATE notices SET views = views + 1 WHERE id = ?', [req.params.id]);
  const notice = get('SELECT * FROM notices WHERE id = ?', [req.params.id]);
  if (!notice) {
    return res.status(404).render('error', { message: '공지사항을 찾을 수 없습니다.', user: req.session.user || null });
  }
  const comments = all('SELECT * FROM comments WHERE notice_id = ? ORDER BY created_at ASC', [req.params.id]);
  res.render('notice/detail', { notice, comments, user: req.session.user || null });
});

// A03: Stored XSS - 댓글 입력 시 필터링 없음
router.post('/:id/comment', requireLogin, (req, res) => {
  const { content } = req.body;
  const noticeId = req.params.id;

  // XSS 취약: content를 그대로 저장
  run(
    'INSERT INTO comments (notice_id, author, content) VALUES (?, ?, ?)',
    [noticeId, req.session.user.username, content]
  );
  saveDb();
  res.redirect(`/notice/${noticeId}`);
});

// 공지사항 작성 (관리자만 - 하지만 체크 허술)
router.get('/write', requireLogin, (req, res) => {
  res.render('notice/write', { user: req.session.user });
});

router.post('/write', requireLogin, (req, res) => {
  const { title, content } = req.body;
  // A01: 관리자 체크 없이 글쓰기 가능
  run(
    'INSERT INTO notices (title, content, author) VALUES (?, ?, ?)',
    [title, content, req.session.user.username]
  );
  saveDb();
  res.redirect('/notice');
});

module.exports = router;
