const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 데이터베이스 파일 경로
const dbPath = process.env.DB_PATH || '/app/data/did-system-prod.db';

// 데이터베이스 디렉토리 확인 및 생성
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`데이터베이스 디렉토리 생성: ${dbDir}`);
}

// 데이터베이스 연결
let db;
try {
  db = new Database(dbPath, { verbose: console.log });
  console.log(`데이터베이스 연결 성공: ${dbPath}`);
} catch (error) {
  console.error(`데이터베이스 연결 실패: ${error.message}`);
  process.exit(1);
}

// 필요한 테이블 생성
try {
  // users 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // dids 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS dids (
      id TEXT PRIMARY KEY,
      did TEXT NOT NULL,
      document TEXT,
      user_id TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // blockchain_transactions 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS blockchain_transactions (
      id TEXT PRIMARY KEY,
      did_id TEXT NOT NULL,
      tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (did_id) REFERENCES dids(id)
    );
  `);

  // verifiable_credentials 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS verifiable_credentials (
      id TEXT PRIMARY KEY,
      issuer_did TEXT NOT NULL,
      subject_did TEXT NOT NULL,
      credential TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issuer_did) REFERENCES dids(did),
      FOREIGN KEY (subject_did) REFERENCES dids(did)
    );
  `);

  // verifiable_presentations 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS verifiable_presentations (
      id TEXT PRIMARY KEY,
      holder_did TEXT NOT NULL,
      presentation TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (holder_did) REFERENCES dids(did)
    );
  `);

  // issuers 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS issuers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      did_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (did_id) REFERENCES dids(id)
    );
  `);

  console.log('데이터베이스 테이블 생성 완료');
} catch (error) {
  console.error(`테이블 생성 실패: ${error.message}`);
} finally {
  // 데이터베이스 연결 종료
  if (db) {
    db.close();
    console.log('데이터베이스 연결 종료');
  }
} 