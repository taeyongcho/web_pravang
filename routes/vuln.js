const express = require('express');
const router = express.Router();
const vulns = require('../data/vulns');

// 취약점 목록
router.get('/', (req, res) => {
  res.render('vuln/list', { vulns, user: req.session.user || null });
});

// 취약점 상세
router.get('/:id', (req, res) => {
  const vuln = vulns.find(v => v.id === req.params.id.toUpperCase());
  if (!vuln) {
    return res.status(404).render('error', {
      message: '취약점 정보를 찾을 수 없습니다.',
      user: req.session.user || null
    });
  }
  const idx = vulns.indexOf(vuln);
  const prev = vulns[idx - 1] || null;
  const next = vulns[idx + 1] || null;
  res.render('vuln/detail', { vuln, prev, next, user: req.session.user || null });
});

module.exports = router;
