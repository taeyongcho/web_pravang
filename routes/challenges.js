const express = require('express');
const router = express.Router();
const { get, all, run, saveDb } = require('../database/db');
const { requireLogin } = require('../middleware/auth');
const challenges = require('../challenges/hints');

const SCORE = { easy: 100, medium: 300, hard: 500 };

function calcScore(solvedIds) {
  return solvedIds.reduce((total, id) => {
    const ch = challenges.find(c => c.id === id);
    return total + (ch ? (SCORE[ch.difficulty] || 100) : 0);
  }, 0);
}

// 챌린지 목록 + 진행 현황
router.get('/', (req, res) => {
  let solvedIds = [];
  if (req.session.user) {
    const rows = all('SELECT challenge_id FROM solves WHERE user_id = ?', [req.session.user.id]);
    solvedIds = rows.map(r => r.challenge_id);
  }
  const myScore = calcScore(solvedIds);
  const maxScore = challenges.reduce((t, c) => t + (SCORE[c.difficulty] || 100), 0);
  res.render('challenges', {
    challenges, solvedIds, user: req.session.user || null,
    submitResult: null, myScore, maxScore, SCORE
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
      run('INSERT OR IGNORE INTO solves (user_id, challenge_id) VALUES (?, ?)',
        [req.session.user.id, challenge_id]);
      run('INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (?, ?, ?, ?)',
        [req.session.user.id, 'CHALLENGE_SOLVED', challenge_id, req.ip]);
      saveDb();
      submitResult.success = true;
      submitResult.score = SCORE[challenge.difficulty] || 100;
      submitResult.message = `정답! "${challenge.title}" +${submitResult.score}점 획득!`;
    } else {
      submitResult.message = '틀렸습니다. 다시 시도해보세요.';
    }
  }

  const solvedRows = all('SELECT challenge_id FROM solves WHERE user_id = ?', [req.session.user.id]);
  const solvedIds = solvedRows.map(r => r.challenge_id);
  const myScore = calcScore(solvedIds);
  const maxScore = challenges.reduce((t, c) => t + (SCORE[c.difficulty] || 100), 0);

  res.render('challenges', {
    challenges, solvedIds, user: req.session.user,
    submitResult, myScore, maxScore, SCORE
  });
});

// 내 풀이 현황 API
router.get('/progress', requireLogin, (req, res) => {
  const solvedRows = all('SELECT s.challenge_id, s.solved_at FROM solves s WHERE s.user_id = ?',
    [req.session.user.id]);
  const solvedIds = solvedRows.map(r => r.challenge_id);
  res.json({
    total: challenges.length,
    solved: solvedIds.length,
    percent: Math.round((solvedIds.length / challenges.length) * 100),
    score: calcScore(solvedIds),
    maxScore: challenges.reduce((t, c) => t + (SCORE[c.difficulty] || 100), 0),
    solvedIds,
    solvedAt: solvedRows
  });
});

// 전체 랭킹 (점수 기준)
router.get('/ranking', (req, res) => {
  const solveData = all(`
    SELECT u.id, u.username, s.challenge_id, s.solved_at
    FROM users u
    JOIN solves s ON u.id = s.user_id
    ORDER BY s.solved_at ASC
  `);

  // 유저별로 집계
  const userMap = {};
  solveData.forEach(row => {
    if (!userMap[row.id]) userMap[row.id] = { username: row.username, solvedIds: [], last_solved: null };
    userMap[row.id].solvedIds.push(row.challenge_id);
    userMap[row.id].last_solved = row.solved_at;
  });

  const ranking = Object.values(userMap).map(u => ({
    username: u.username,
    solved_count: u.solvedIds.length,
    score: calcScore(u.solvedIds),
    last_solved: u.last_solved
  })).sort((a, b) => b.score - a.score || a.last_solved.localeCompare(b.last_solved));

  const maxScore = challenges.reduce((t, c) => t + (SCORE[c.difficulty] || 100), 0);
  res.render('ranking', { ranking, user: req.session.user || null, total: challenges.length, maxScore });
});

// 힌트 사용 API (단계별 공개 + 감점)
router.post('/hint', requireLogin, (req, res) => {
  const { challenge_id, hint_index } = req.body;
  const ch = challenges.find(c => c.id === challenge_id);
  if (!ch) return res.json({ error: '챌린지 없음' });

  const idx = parseInt(hint_index);
  if (idx < 0 || idx >= ch.hints.length) return res.json({ error: '잘못된 힌트 인덱스' });

  // 이미 이 힌트를 본 적 있는지 확인
  const already = get('SELECT id FROM hint_uses WHERE user_id=? AND challenge_id=? AND hint_index=?',
    [req.session.user.id, challenge_id, idx]);

  if (!already) {
    run('INSERT OR IGNORE INTO hint_uses (user_id, challenge_id, hint_index) VALUES (?,?,?)',
      [req.session.user.id, challenge_id, idx]);
    saveDb();
  }

  // 현재까지 사용한 힌트 수
  const usedCount = (get('SELECT COUNT(*) as c FROM hint_uses WHERE user_id=? AND challenge_id=?',
    [req.session.user.id, challenge_id]) || {}).c || 0;

  res.json({
    hint: ch.hints[idx],
    hint_index: idx,
    total_hints: ch.hints.length,
    used_count: usedCount,
    penalty: already ? 0 : 10,
    already_seen: !!already
  });
});

// 내가 사용한 힌트 목록 API
router.get('/hints-used', requireLogin, (req, res) => {
  const rows = all('SELECT challenge_id, hint_index FROM hint_uses WHERE user_id=?', [req.session.user.id]);
  const map = {};
  rows.forEach(r => {
    if (!map[r.challenge_id]) map[r.challenge_id] = [];
    map[r.challenge_id].push(r.hint_index);
  });
  res.json(map);
});

// 수료증 페이지
router.get('/certificate', requireLogin, (req, res) => {
  const solvedRows = all('SELECT challenge_id, solved_at FROM solves WHERE user_id=? ORDER BY solved_at ASC',
    [req.session.user.id]);
  const solvedIds = solvedRows.map(r => r.challenge_id);

  // 힌트 감점 계산
  const hintPenalty = ((get('SELECT COUNT(*) as c FROM hint_uses WHERE user_id=?',
    [req.session.user.id]) || {}).c || 0) * 10;

  const baseScore = calcScore(solvedIds);
  const finalScore = Math.max(0, baseScore - hintPenalty);
  const maxScore = challenges.reduce((t, c) => t + (SCORE[c.difficulty] || 100), 0);
  const pct = Math.round(solvedIds.length / challenges.length * 100);
  const lastSolved = solvedRows.length ? solvedRows[solvedRows.length - 1].solved_at : null;

  res.render('challenges/certificate', {
    user: req.session.user,
    solvedCount: solvedIds.length,
    totalCount: challenges.length,
    baseScore, finalScore, maxScore, hintPenalty, pct,
    lastSolved,
    isComplete: solvedIds.length === challenges.length
  });
});

module.exports = router;
