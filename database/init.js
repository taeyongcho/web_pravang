const initSql = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user',
  balance_krw REAL DEFAULT 1000000,
  balance_btc REAL DEFAULT 0.1,
  balance_eth REAL DEFAULT 1.0,
  api_key TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER,
  to_user_id INTEGER,
  coin TEXT,
  amount REAL,
  tx_type TEXT,
  memo TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'admin',
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notice_id INTEGER,
  author TEXT,
  content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  address TEXT,
  coin TEXT,
  label TEXT
);

CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  amount REAL,
  used INTEGER DEFAULT 0
);

INSERT OR IGNORE INTO users (username, password, email, role, balance_krw, balance_btc, api_key)
VALUES
  ('admin', 'admin1234', 'admin@pravang.com', 'admin', 99999999, 100.0, 'sk-admin-secret-api-key-9f3k2'),
  ('alice', '5f4dcc3b5aa765d61d8327deb882cf99', 'alice@example.com', 'user', 5000000, 0.5, 'sk-alice-key-abc123'),
  ('bob', 'password123', 'bob@example.com', 'user', 2000000, 0.2, 'sk-bob-key-xyz789'),
  ('charlie', 'qwerty', 'charlie@example.com', 'user', 800000, 0.05, 'sk-charlie-key-def456'),
  ('testuser', 'test1234', 'test@example.com', 'user', 100000, 0.01, 'sk-test-key-ghi012');

INSERT OR IGNORE INTO notices (title, content, author)
VALUES
  ('프라방 거래소 오픈 안내', '<p>안녕하세요. 프라방 거래소가 정식 오픈했습니다.<br>비트코인, 이더리움 거래를 시작해보세요!</p>', 'admin'),
  ('점검 안내 (6월 30일)', '<p>6월 30일 새벽 2시~4시 서버 점검이 있을 예정입니다.<br>이용에 참고 부탁드립니다.</p>', 'admin'),
  ('출금 정책 변경 안내', '<p>출금 최소금액이 10,000 KRW로 변경됩니다.<br>자세한 내용은 고객센터를 이용해주세요.</p>', 'admin');

INSERT OR IGNORE INTO transactions (from_user_id, to_user_id, coin, amount, tx_type, memo)
VALUES
  (2, 3, 'BTC', 0.1, 'transfer', '테스트 송금'),
  (3, 2, 'ETH', 0.5, 'transfer', '이더리움 전송'),
  (2, NULL, 'KRW', 500000, 'withdraw', '출금'),
  (3, NULL, 'BTC', 0.05, 'withdraw', 'BTC 출금');

INSERT OR IGNORE INTO wallets (user_id, address, coin, label)
VALUES
  (2, '1A2B3C4D5E6F7G8H9I0J', 'BTC', 'Alice BTC 지갑'),
  (3, '0xABCDEF1234567890', 'ETH', 'Bob ETH 지갑');

INSERT OR IGNORE INTO vouchers (code, amount)
VALUES
  ('PROMO2024', 50000),
  ('VIP-SECRET-777', 500000);

CREATE TABLE IF NOT EXISTS solves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  challenge_id TEXT NOT NULL,
  solved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  username TEXT,
  success INTEGER DEFAULT 0,
  attempted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  coin TEXT NOT NULL,
  order_type TEXT NOT NULL,
  side TEXT NOT NULL,
  price REAL NOT NULL,
  amount REAL NOT NULL,
  filled REAL DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  buyer_id INTEGER,
  seller_id INTEGER,
  coin TEXT NOT NULL,
  price REAL NOT NULL,
  amount REAL NOT NULL,
  total REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coin TEXT NOT NULL,
  price REAL NOT NULL,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 100,
  category TEXT,
  image_url TEXT,
  seller TEXT DEFAULT 'AXIO Mall',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT,
  rating INTEGER DEFAULT 5,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_cart (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price REAL NOT NULL,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_name TEXT,
  shipping_addr TEXT,
  shipping_phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT,
  quantity INTEGER,
  unit_price REAL,
  total REAL
);

INSERT OR IGNORE INTO shop_products (id, name, description, price, stock, category, image_url) VALUES
  (1, 'USB 보안키 Pro', '하드웨어 기반 2FA 인증 기기. FIDO2/WebAuthn 지원.', 89000, 50, '보안장비', '/img/usb-key.svg'),
  (2, '웹해킹 입문서', 'OWASP Top 10 기반 실전 웹 해킹 & 보안 가이드북', 32000, 200, '도서', '/img/book.svg'),
  (3, '버프스위트 Pro 라이선스', 'Burp Suite Professional 1년 라이선스 코드', 450000, 20, '소프트웨어', '/img/burp.svg'),
  (4, '리눅스 서버 보안 강화 패키지', 'SELinux, fail2ban, UFW 설정 컨설팅 서비스', 250000, 10, '서비스', '/img/linux.svg'),
  (5, '취약점 스캐너 USB', '오프라인 네트워크 취약점 스캐너 휴대용 기기', 180000, 30, '보안장비', '/img/scanner.svg'),
  (6, '모의해킹 보고서 템플릿', '전문가급 모의해킹 결과 보고서 워드/PDF 템플릿', 15000, 999, '디지털', '/img/report.svg');

INSERT OR IGNORE INTO price_history (coin, price, recorded_at) VALUES
  ('BTC', 84000000, datetime('now', '-60 minutes')),
  ('BTC', 84200000, datetime('now', '-50 minutes')),
  ('BTC', 83800000, datetime('now', '-40 minutes')),
  ('BTC', 85100000, datetime('now', '-30 minutes')),
  ('BTC', 84700000, datetime('now', '-20 minutes')),
  ('BTC', 85500000, datetime('now', '-10 minutes')),
  ('BTC', 85200000, datetime('now')),
  ('ETH', 4150000, datetime('now', '-60 minutes')),
  ('ETH', 4200000, datetime('now', '-40 minutes')),
  ('ETH', 4180000, datetime('now', '-20 minutes')),
  ('ETH', 4220000, datetime('now'));
`;

module.exports = { initSql };
