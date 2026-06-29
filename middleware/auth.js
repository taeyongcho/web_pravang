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

module.exports = { requireLogin, requireAdmin };
