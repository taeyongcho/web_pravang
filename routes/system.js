const express = require('express');
const router = express.Router();
const { all } = require('../database/db');
const fs = require('fs');
const path = require('path');

// A06: 컴포넌트 버전 정보 노출 (취약점 시나리오)
router.get('/components', (req, res) => {
  const pkgPath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const knownCves = {
    'jsonwebtoken': {
      version: pkg.dependencies['jsonwebtoken'],
      cve: 'CVE-2022-23529',
      severity: 'HIGH',
      description: '8.5.1 이하 버전에서 시크릿 검증 우회 가능. jwt.verify()의 secretOrPublicKey 인자가 빈 문자열일 때 검증 스킵.'
    },
    'axios': {
      version: pkg.dependencies['axios'],
      cve: 'CVE-2023-45857',
      severity: 'MEDIUM',
      description: '1.5.1 이하 버전에서 XSRF-TOKEN 헤더가 크로스 도메인 요청에 포함될 수 있음.'
    },
    'express-session': {
      version: pkg.dependencies['express-session'],
      cve: null,
      severity: 'LOW',
      description: '설정에 따라 세션 고정 공격(Session Fixation)에 취약할 수 있음.'
    },
    'multer': {
      version: pkg.dependencies['multer'],
      cve: 'CVE-2024-7003',
      severity: 'HIGH',
      description: '파일명 검증 없이 업로드 허용 시 경로 조작(Path Traversal) 가능.'
    }
  };

  const allDeps = Object.entries(pkg.dependencies).map(([name, version]) => ({
    name,
    version,
    cve: knownCves[name]?.cve || null,
    severity: knownCves[name]?.severity || null,
    description: knownCves[name]?.description || null
  }));

  res.render('system/components', {
    user: req.session.user || null,
    deps: allDeps,
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || 'development'  // A05: 환경 정보 노출
  });
});

// A07: 로그인 시도 로그 조회 (누구나 접근 가능 - 취약점)
router.get('/login-log', (req, res) => {
  const logs = all(
    'SELECT * FROM login_attempts ORDER BY attempted_at DESC LIMIT 50'
  );
  res.render('system/login-log', {
    user: req.session.user || null,
    logs
  });
});

// A09: 감사 로그 (관리자만 봐야 하지만 인증 없음 - 취약점)
router.get('/audit', (req, res) => {
  const logs = all(
    'SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 100'
  );
  res.render('system/audit', {
    user: req.session.user || null,
    logs
  });
});

module.exports = router;
