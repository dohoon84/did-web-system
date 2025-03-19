import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import appConfig from '../config';
import { log } from '../logger';

// 데이터베이스 디렉토리 생성
const dbDir = path.dirname(appConfig.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  log.info(`데이터베이스 디렉토리 생성: ${dbDir}`);
}

// 데이터베이스 파일 경로
const dbPath = appConfig.database.path;

// 데이터베이스 파일 존재 여부 확인
const dbExists = fs.existsSync(dbPath);

// 데이터베이스 연결
const db = new Database(dbPath);
log.debug(`SQLite 데이터베이스에 연결되었습니다: ${dbPath}`);

// 테이블 초기화
function initTables() {
  // 설정에 따라 초기화 여부 결정
  const shouldInitialize = appConfig.database.initialize;
  
  if (!shouldInitialize) {
    log.debug('데이터베이스 초기화가 비활성화되어 있습니다.');
    return;
  }

  // 데이터베이스 파일이 이미 존재하면 테이블 초기화 건너뛰기
  if (dbExists) {
    log.debug('데이터베이스 파일이 이미 존재합니다. 테이블 초기화를 건너뜁니다.');
    
    // 테이블 존재 여부 확인
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='verifiable_credentials'").get();
      if (!tableCheck) {
        log.debug('필수 테이블이 없습니다. 테이블을 생성합니다.');
      } else {
        // 테이블이 이미 존재하면 초기화 건너뛰기
        return;
      }
    } catch (err) {
      log.error(`테이블 확인 중 오류 발생: ${err}`);
    }
  } else {
    log.debug('새 데이터베이스 파일을 생성합니다. 테이블을 초기화합니다.');
  }
    
  // 사용자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      birth_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // DID 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS dids (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      did TEXT NOT NULL UNIQUE,
      did_document TEXT NOT NULL,
      private_key TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // VC 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS verifiable_credentials (
      id TEXT PRIMARY KEY,
      issuer_did TEXT NOT NULL,
      subject_did TEXT NOT NULL,
      credential_type TEXT NOT NULL,
      credential_data TEXT NOT NULL,
      issuance_date TEXT NOT NULL,
      expiration_date TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // VP 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS verifiable_presentations (
      id TEXT PRIMARY KEY,
      vp_id TEXT NOT NULL,
      holder_did TEXT NOT NULL,
      vp_hash TEXT NOT NULL,
      vp_data TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 발급자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS issuers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      did TEXT NOT NULL UNIQUE,
      organization TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (did) REFERENCES dids(did)
    )
  `);

  // 블록체인 트랜잭션 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS blockchain_transactions (
      id TEXT PRIMARY KEY,
      did TEXT NOT NULL,
      transaction_hash TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (did) REFERENCES dids(did)
    )
  `);

  // VC 블록체인 트랜잭션 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS vc_blockchain_transactions (
      id TEXT PRIMARY KEY,
      vc_id TEXT NOT NULL,
      transaction_hash TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (vc_id) REFERENCES verifiable_credentials(id)
    )
  `);

  log.info('데이터베이스 테이블이 초기화되었습니다.');
}

// 테이블 초기화 실행
initTables();

export default db;

// 데이터베이스 종료 함수
export function closeDatabase() {
  if (db) {
    db.close();
    log.debug('데이터베이스 연결이 종료되었습니다.');
  }
} 