/* ─── Toast 시스템 ─── */
window.toast = function(title, msg, type = 'info', duration = 5000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '🚨', warning: '⚠️', info: 'ℹ️', attack: '💥' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
  `;
  container.appendChild(t);
  if (duration > 0) {
    setTimeout(() => {
      t.style.animation = 'toastOut .25s ease forwards';
      setTimeout(() => t.remove(), 250);
    }, duration);
  }
  return t;
};

/* ─── 공격 성공 배너 ─── */
window.showAttackBanner = function(vulnId, title, desc) {
  const existing = document.getElementById('attack-banner');
  if (existing) existing.remove();

  const b = document.createElement('div');
  b.id = 'attack-banner';
  b.className = 'attack-banner';
  b.innerHTML = `
    <div class="ab-icon">💥</div>
    <div class="ab-body">
      <div class="ab-title">⚠️ 취약점 발동: ${title}</div>
      <div class="ab-desc">${desc}</div>
    </div>
    <a href="/vuln/${vulnId}" class="ab-link">상세 설명 →</a>
    <button class="ab-close" onclick="document.getElementById('attack-banner').remove()">×</button>
  `;
  // nav 아래에 삽입
  const nav = document.querySelector('nav');
  if (nav) nav.insertAdjacentElement('afterend', b);
  else document.body.prepend(b);

  toast('취약점 발동!', title, 'error', 8000);
};

/* ─── 햄버거 메뉴 ─── */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  // 링크 클릭 시 닫기
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => drawer.classList.remove('open'));
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !drawer.contains(e.target)) {
      drawer.classList.remove('open');
    }
  });
});

/* ─── 페이지별 공격 감지 자동 실행 ─── */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // IDOR 감지: /dashboard/account/:id 가 본인이 아닌 경우
  if (path.match(/^\/dashboard\/account\/\d+$/)) {
    const banner = document.querySelector('.alert-error');
    if (banner && banner.textContent.includes('타인')) {
      showAttackBanner('A01', 'A01 - IDOR (Broken Access Control)', '다른 유저의 계정 정보에 접근했습니다. ID 파라미터 검증이 없어 발생합니다.');
    }
  }

  // 관리자 페이지 ?role=admin 우회 감지
  if (path.startsWith('/admin') && params.get('role') === 'admin') {
    const user = document.querySelector('.badge');
    if (user && !user.classList.contains('admin')) {
      showAttackBanner('A01', 'A01 - Broken Access Control (관리자 우회)', '?role=admin 쿼리 파라미터로 관리자 권한 체크를 우회했습니다.');
    }
  }

  // SQL Injection 감지: 로그인 성공 후 debugQuery에 -- 포함
  const debugBox = document.querySelector('.alert-warning code');
  if (debugBox && debugBox.textContent.includes("'--")) {
    showAttackBanner('A03', 'A03 - SQL Injection (로그인 우회)', "username: admin'-- 으로 SQL 쿼리를 조작해 비밀번호 없이 로그인했습니다.");
  }

  // XSS 감지: URL에 xss 파라미터
  if (document.referrer.includes('/notice') && window.xssTriggered) {
    showAttackBanner('A03', 'A03 - Stored XSS', '악성 스크립트가 공지사항 댓글을 통해 실행되었습니다.');
  }
});
