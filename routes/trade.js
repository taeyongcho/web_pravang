const express = require('express');
const router = express.Router();
const { get, all, run, rawQuery, saveDb } = require('../database/db');
const { requireLogin } = require('../middleware/auth');

// 현재 모의 시세 (메모리)
const mockPrices = { BTC: 85200000, ETH: 4220000, XRP: 730 };

// 시세 소폭 변동 (±0.3%)
function tickPrice() {
  Object.keys(mockPrices).forEach(coin => {
    const change = (Math.random() - 0.5) * 0.006;
    mockPrices[coin] = Math.round(mockPrices[coin] * (1 + change));
  });
}
setInterval(() => {
  tickPrice();
  Object.keys(mockPrices).forEach(coin => {
    run('INSERT INTO price_history (coin, price) VALUES (?, ?)', [coin, mockPrices[coin]]);
  });
  saveDb();
}, 10000); // 10초마다 가격 기록

// 거래소 메인 (BTC 기본)
router.get('/', (req, res) => {
  const coin = (req.query.coin || 'BTC').toUpperCase();
  const user = req.session.user ? get('SELECT * FROM users WHERE id = ?', [req.session.user.id]) : null;

  const openOrders = all(
    "SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id WHERE o.coin = ? AND o.status = 'open' ORDER BY o.price DESC LIMIT 20",
    [coin]
  );
  const buyOrders  = openOrders.filter(o => o.side === 'buy').sort((a, b) => b.price - a.price).slice(0, 10);
  const sellOrders = openOrders.filter(o => o.side === 'sell').sort((a, b) => a.price - b.price).slice(0, 10);

  const recentTrades = all(
    'SELECT * FROM order_history WHERE coin = ? ORDER BY created_at DESC LIMIT 20',
    [coin]
  );

  const myOrders = user
    ? all("SELECT * FROM orders WHERE user_id = ? AND coin = ? ORDER BY created_at DESC LIMIT 10", [user.id, coin])
    : [];

  res.render('trade/index', {
    user,
    coin,
    price: mockPrices[coin] || 0,
    prices: mockPrices,
    buyOrders,
    sellOrders,
    recentTrades,
    myOrders
  });
});

// 주문 등록 (A04: 가격/수량 서버 검증 미흡)
router.post('/order', requireLogin, (req, res) => {
  let { coin, side, order_type, price, amount } = req.body;
  coin = coin.toUpperCase();
  price  = parseFloat(price);
  amount = parseFloat(amount);

  const user = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const currentPrice = mockPrices[coin] || price;

  // 시장가 주문이면 현재가 사용
  if (order_type === 'market') price = currentPrice;

  const total = price * amount;
  const balanceField = coin === 'BTC' ? 'balance_btc' : coin === 'ETH' ? 'balance_eth' : 'balance_krw';

  // A04: 음수 수량/가격 체크 없음
  if (side === 'buy') {
    if (user.balance_krw < total) {
      return res.json({ success: false, message: 'KRW 잔액 부족' });
    }
    run('UPDATE users SET balance_krw = balance_krw - ? WHERE id = ?', [total, user.id]);
  } else {
    if (user[balanceField] < amount) {
      return res.json({ success: false, message: `${coin} 잔액 부족` });
    }
    run(`UPDATE users SET ${balanceField} = ${balanceField} - ? WHERE id = ?`, [amount, user.id]);
  }

  run(
    'INSERT INTO orders (user_id, coin, order_type, side, price, amount) VALUES (?,?,?,?,?,?)',
    [user.id, coin, order_type, side, price, amount]
  );
  const orderId = get('SELECT last_insert_rowid() as id').id;

  // 즉시 체결 시뮬레이션 (시장가 or 유리한 지정가)
  const shouldFill = order_type === 'market' ||
    (side === 'buy' && price >= currentPrice * 0.98) ||
    (side === 'sell' && price <= currentPrice * 1.02);

  if (shouldFill) {
    const fillPrice = order_type === 'market' ? currentPrice : price;
    const fillTotal = fillPrice * amount;

    run("UPDATE orders SET status = 'filled', filled = amount WHERE id = ?", [orderId]);

    if (side === 'buy') {
      run(`UPDATE users SET ${balanceField} = ${balanceField} + ? WHERE id = ?`, [amount, user.id]);
    } else {
      run('UPDATE users SET balance_krw = balance_krw + ? WHERE id = ?', [fillTotal, user.id]);
    }

    run(
      'INSERT INTO order_history (order_id, buyer_id, seller_id, coin, price, amount, total) VALUES (?,?,?,?,?,?,?)',
      [orderId, side === 'buy' ? user.id : null, side === 'sell' ? user.id : null, coin, fillPrice, amount, fillTotal]
    );

    run('INSERT INTO audit_logs (user_id, action, detail, ip) VALUES (?,?,?,?)',
      [user.id, 'ORDER_FILLED', `${side} ${amount} ${coin} @ ${fillPrice}`, req.ip]);
  }

  saveDb();
  res.json({ success: true, message: shouldFill ? '주문 체결 완료' : '주문 등록 완료', orderId });
});

// 주문 취소 (A01: 자신의 주문인지 확인 안 함)
router.post('/order/:id/cancel', requireLogin, (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.json({ success: false, message: '주문 없음' });

  // A01 IDOR: order.user_id === req.session.user.id 검증 없음
  if (order.status !== 'open') {
    return res.json({ success: false, message: '취소할 수 없는 주문 상태' });
  }

  const balanceField = order.coin === 'BTC' ? 'balance_btc' : order.coin === 'ETH' ? 'balance_eth' : 'balance_krw';
  const refundField  = order.side === 'buy' ? 'balance_krw' : balanceField;
  const refundAmt    = order.side === 'buy' ? order.price * (order.amount - order.filled) : (order.amount - order.filled);

  run(`UPDATE users SET ${refundField} = ${refundField} + ? WHERE id = ?`, [refundAmt, order.user_id]);
  run("UPDATE orders SET status = 'cancelled' WHERE id = ?", [order.id]);
  saveDb();

  res.json({ success: true, message: '주문 취소 완료' });
});

// 시세 API (폴링용)
router.get('/api/price', (req, res) => {
  res.json(mockPrices);
});

// 차트 데이터 API
router.get('/api/chart/:coin', (req, res) => {
  const coin = req.params.coin.toUpperCase();
  const rows = all(
    'SELECT price, recorded_at FROM price_history WHERE coin = ? ORDER BY recorded_at ASC',
    [coin]
  );
  res.json(rows);
});

module.exports = { router, mockPrices };
