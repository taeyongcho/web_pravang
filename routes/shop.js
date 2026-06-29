const express = require('express');
const router = express.Router();
const { all, get, run, rawQuery } = require('../database/db');

function shopUser(req) { return req.session.user || null; }

// GET /shop - 상품 목록 (SQLi 취약: keyword 검색)
router.get('/', async (req, res) => {
  const keyword = req.query.q || '';
  const category = req.query.category || '';
  let products;
  try {
    // A03: SQL Injection - 검색어 직접 삽입
    let query = `SELECT * FROM shop_products WHERE 1=1`;
    if (keyword) query += ` AND (name LIKE '%${keyword}%' OR description LIKE '%${keyword}%')`;
    if (category) query += ` AND category = '${category}'`;
    const raw = rawQuery(query);
    if (raw.success && raw.results.length > 0) {
      const { columns, values } = raw.results[0];
      products = values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
    } else {
      products = [];
    }
  } catch(e) {
    products = [];
  }
  const categories = await all('SELECT DISTINCT category FROM shop_products');
  res.render('shop/index', {
    user: shopUser(req), products, keyword, category,
    categories: categories.map(c => c.category),
    debugQuery: keyword ? `SELECT * FROM shop_products WHERE name LIKE '%${keyword}%'` : null
  });
});

// GET /shop/product/:id - 상품 상세 + 리뷰 (XSS 취약)
router.get('/product/:id', async (req, res) => {
  const product = await get('SELECT * FROM shop_products WHERE id = ?', [req.params.id]);
  if (!product) return res.redirect('/shop');
  // A03: XSS - 리뷰 내용 비이스케이프 출력
  const reviews = await all('SELECT * FROM shop_reviews WHERE product_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.render('shop/product', { user: shopUser(req), product, reviews, success: req.query.success, error: req.query.error });
});

// POST /shop/product/:id/review - 리뷰 작성 (Stored XSS)
router.post('/product/:id/review', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  const { rating, content } = req.body;
  // A03: content를 sanitize 없이 저장
  await run('INSERT INTO shop_reviews (product_id, user_id, username, rating, content) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, u.id, u.username, rating || 5, content]);
  res.redirect(`/shop/product/${req.params.id}?success=리뷰가 등록되었습니다`);
});

// POST /shop/cart/add - 장바구니 추가 (A04: 가격 클라이언트에서 받음)
router.post('/cart/add', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  const { product_id, quantity, unit_price } = req.body;
  // A04: 서버에서 DB 가격 검증하지 않고 클라이언트 전송값 사용
  const qty = parseInt(quantity) || 1;
  const price = parseFloat(unit_price);
  await run('INSERT INTO shop_cart (user_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
    [u.id, product_id, qty, price]);
  res.redirect('/shop/cart');
});

// GET /shop/cart - 장바구니
router.get('/cart', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  const items = await all(`
    SELECT c.*, p.name, p.image_url, p.price as real_price
    FROM shop_cart c JOIN shop_products p ON c.product_id = p.id
    WHERE c.user_id = ?`, [u.id]);
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  res.render('shop/cart', { user: u, items, total, success: req.query.success, error: req.query.error });
});

// POST /shop/cart/remove - 장바구니 삭제
router.post('/cart/remove', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  await run('DELETE FROM shop_cart WHERE id = ? AND user_id = ?', [req.body.cart_id, u.id]);
  res.redirect('/shop/cart');
});

// POST /shop/checkout - 주문 생성 (A08: CSRF 토큰 없음)
router.post('/checkout', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  const { shipping_name, shipping_addr, shipping_phone } = req.body;
  const items = await all(`
    SELECT c.*, p.name FROM shop_cart c
    JOIN shop_products p ON c.product_id = p.id
    WHERE c.user_id = ?`, [u.id]);
  if (!items.length) return res.redirect('/shop/cart?error=장바구니가 비어있습니다');
  // A04: 클라이언트가 보낸 unit_price로 합산 (조작 가능)
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const order = await run('INSERT INTO shop_orders (user_id, total, shipping_name, shipping_addr, shipping_phone) VALUES (?, ?, ?, ?, ?)',
    [u.id, total, shipping_name, shipping_addr, shipping_phone]);
  for (const item of items) {
    await run('INSERT INTO shop_order_items (order_id, product_id, product_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
      [order.lastID, item.product_id, item.name, item.quantity, item.unit_price, item.unit_price * item.quantity]);
  }
  await run('DELETE FROM shop_cart WHERE user_id = ?', [u.id]);
  res.redirect(`/shop/orders/${order.lastID}?success=주문이 완료되었습니다`);
});

// GET /shop/orders - 내 주문 목록
router.get('/orders', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  const orders = await all('SELECT * FROM shop_orders WHERE user_id = ? ORDER BY created_at DESC', [u.id]);
  res.render('shop/orders', { user: u, orders });
});

// GET /shop/orders/:id - 주문 상세 (A01: IDOR - 다른 유저 주문 열람)
router.get('/orders/:id', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  // A01: user_id 검증 없음 → 타인 주문 조회 가능
  const order = await get('SELECT o.*, u.username FROM shop_orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?', [req.params.id]);
  if (!order) return res.render('error', { user: u, message: '주문을 찾을 수 없습니다.', stack: null });
  const items = await all('SELECT * FROM shop_order_items WHERE order_id = ?', [req.params.id]);
  const isOwner = order.user_id === u.id;
  res.render('shop/order-detail', { user: u, order, items, isOwner, success: req.query.success });
});

// POST /shop/orders/:id/cancel - 주문 취소 (CSRF 취약)
router.post('/orders/:id/cancel', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  // A08: CSRF 토큰 없음
  await run("UPDATE shop_orders SET status = 'cancelled' WHERE id = ?", [req.params.id]);
  res.redirect(`/shop/orders/${req.params.id}?success=주문이 취소되었습니다`);
});

// POST /shop/orders/:id/address - 배송지 변경 (CSRF 취약)
router.post('/orders/:id/address', async (req, res) => {
  const u = shopUser(req);
  if (!u) return res.redirect('/login');
  // A08: CSRF 토큰 없음 + IDOR (order_id 소유권 미검증)
  const { shipping_addr, shipping_phone } = req.body;
  await run('UPDATE shop_orders SET shipping_addr = ?, shipping_phone = ? WHERE id = ?',
    [shipping_addr, shipping_phone, req.params.id]);
  res.redirect(`/shop/orders/${req.params.id}?success=배송지가 변경되었습니다`);
});

module.exports = router;
