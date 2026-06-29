const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { initSql } = require('./init');

const DB_PATH = path.join(__dirname, 'pravang.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    db.run(initSql);
    saveDb();
  }

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 쿼리 래퍼들
function all(query, params = []) {
  const db = getDbSync();
  const stmt = db.prepare(query);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(query, params = []) {
  const rows = all(query, params);
  return rows[0] || null;
}

function run(query, params = []) {
  const db = getDbSync();
  db.run(query, params);
  saveDb();
}

// 취약한 raw SQL 실행 (SQL Injection용)
function rawQuery(query) {
  const db = getDbSync();
  try {
    const results = db.exec(query);
    saveDb();
    return { success: true, results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

let dbSync = null;

function getDbSync() {
  if (dbSync) return dbSync;
  throw new Error('DB not initialized. Call initDb() first.');
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbSync = new SQL.Database(fileBuffer);
  } else {
    dbSync = new SQL.Database();
    dbSync.run(initSql);
    const data = dbSync.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  return dbSync;
}

module.exports = { initDb, all, get, run, rawQuery, saveDb };
