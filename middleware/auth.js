function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  // A01: role 체크를 쿼리 파라미터로도 우회 가능하게 (취약점)
  if (req.session.user.role !== 'admin' && req.query.role !== 'admin') {
    return res.status(403).render('error', {
      message: '관리자 권한이 필요합니다.',
      user: req.session.user
    });
  }
  next();
}

// 엄격한 관리자 체크 - 세션 role만 신뢰 (쿼리 우회 불가). 파괴적/민감 기능 전용.
function requireRealAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      message: '관리자 전용 기능입니다.',
      user: req.session.user
    });
  }
  next();
}

module.exports = { requireLogin, requireAdmin, requireRealAdmin };
