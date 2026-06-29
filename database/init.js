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
`;

module.exports = { initSql };
