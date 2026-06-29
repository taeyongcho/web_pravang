const express = require('express');
const router = express.Router();
const { get, all, run, saveDb } = require('../database/db');
const { requireLogin } = require('../middleware/auth');
const challenges = require('../challenges/hints');

// 챌린지 목록 + 진행 현황
router.get('/', (req, res) => {
  let solvedIds = [];
  if (req.session.user) {
    const rows = all('SELECT challenge_id FROM solves WHERE user_id = ?', [req.session.user.id]);
    solvedIds = rows.map(r => r.challenge_id);
  }
  res.render('challenges', {
    challenges,
    solvedIds,
    user: req.session.user || null,
    submitResult: null
  });
});

// FLAG 제출
router.post('/submit', requireLogin, (req, res) => {
  const { challenge_id, flag } = req.body;
  const challenge = challenges.find(c => c.id === challenge_id);

  let submitResult = { challenge_id, success: false, message: '' };

  if (!challenge) {
    submitResult.message = '존재하지 않는 챌린지입니다.';
  } else {
    const alreadySolved = get(
      'SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?',
      [req.session.user.id, challenge_id]
    );

    if (alreadySolved) {
      submitResult.message = '이미 풀었습니다!';
      submitResult.success = true;
      submitResult.alreadySolved = true;
    } else if (flag.trim() === challenge.flag) {
      run(
        'INSERT OR IGNORE INTO solves (user_id, challenge_id) VALUES (?, ?)',
        [req.session.user.id, challenge_id]
      );
      run(
        'INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (?, ?, ?, ?)',
        [req.session.user.id, 'CHALLENGE_SOLVED', challenge_id, req.ip]
      );
      saveDb();
      submitResult.success = true;
      submitResult.message = `정답입니다! "${challenge.title}" 챌린지 클리어!`;
    } else {
      submitResult.message = '틀렸습니다. 다시 시도해보세요.';
    }
  }

  const solvedRows = all('SELECT challenge_id FROM solves WHERE user_id = ?', [req.session.user.id]);
  const solvedIds = solvedRows.map(r => r.challenge_id);

  res.render('challenges', {
    challenges,
    solvedIds,
    user: req.session.user,
    submitResult
  });
});

// 내 풀이 현황 API
router.get('/progress', requireLogin, (req, res) => {
  const solvedRows = all(
    'SELECT s.challenge_id, s.solved_at FROM solves s WHERE s.user_id = ?',
    [req.session.user.id]
  );
  const solvedIds = solvedRows.map(r => r.challenge_id);
  const total = challenges.length;
  const solved = solvedIds.length;

  res.json({
    total,
    solved,
    percent: Math.round((solved / total) * 100),
    solvedIds,
    solvedAt: solvedRows
  });
});

// 전체 랭킹
router.get('/ranking', (req, res) => {
  const ranking = all(`
    SELECT u.username, COUNT(s.id) as solved_count, MAX(s.solved_at) as last_solved
    FROM users u
    LEFT JOIN solves s ON u.id = s.user_id
    GROUP BY u.id
    HAVING solved_count > 0
    ORDER BY solved_count DESC, last_solved ASC
    LIMIT 20
  `);
  res.render('ranking', { ranking, user: req.session.user || null, total: challenges.length });
});

module.exports = router;
