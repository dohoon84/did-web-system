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
log.info(`SQLite 데이터베이스에 연결되었습니다: ${dbPath}`);

// 테이블 초기화
function initTables() {
  // 설정에 따라 초기화 여부 결정
  const shouldInitialize = appConfig.database.initialize;
  
  if (!shouldInitialize) {
    log.info('데이터베이스 초기화가 비활성화되어 있습니다.');
    return;
  }

  // 데이터베이스 파일이 이미 존재하면 테이블 초기화 건너뛰기
  if (dbExists) {
    log.info('데이터베이스 파일이 이미 존재합니다. 테이블 초기화를 건너뜁니다.');
    
    // 테이블 존재 여부 확인
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='verifiable_credentials'").get();
      if (!tableCheck) {
        log.info('필수 테이블이 없습니다. 테이블을 생성합니다.');
      } else {
        // 기존 테이블이 있으면 마이그레이션 실행
        migrateDatabase();
        return; // 테이블이 이미 존재하면 초기화 건너뛰기
      }
    } catch (err) {
      log.error(`테이블 확인 중 오류 발생: ${err}`);
    }
  } else {
    log.info('새 데이터베이스 파일을 생성합니다. 테이블을 초기화합니다.');
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
      holder_did TEXT NOT NULL,
      verifier TEXT NOT NULL,
      presentation_data TEXT NOT NULL,
      verification_result TEXT,
      verification_date TEXT,
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

// 데이터베이스 마이그레이션 함수
function migrateDatabase() {
  log.info('데이터베이스 마이그레이션 시작...');
  
  try {
    // 트랜잭션 시작
    db.exec('BEGIN TRANSACTION');
    
    // blockchain_transactions 테이블이 존재하는지 확인
    const btTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='blockchain_transactions'
    `).get();
    
    if (btTableExists) {
      log.info('blockchain_transactions 테이블이 존재합니다. 컬럼 확인 중...');
      
      // error_message 컬럼이 존재하는지 확인
      const columns = db.prepare("PRAGMA table_info(blockchain_transactions)").all();
      const hasErrorMessageColumn = columns.some((column: any) => column.name === 'error_message');
      
      if (!hasErrorMessageColumn) {
        log.info('error_message 컬럼이 없습니다. 추가합니다...');
        
        // error_message 컬럼 추가
        db.prepare(`
          ALTER TABLE blockchain_transactions 
          ADD COLUMN error_message TEXT
        `).run();
        
        log.info('error_message 컬럼이 추가되었습니다.');
      } else {
        log.info('error_message 컬럼이 이미 존재합니다.');
      }
    } else {
      log.info('blockchain_transactions 테이블이 존재하지 않습니다. 테이블 초기화 시 생성됩니다.');
    }
    
    // vc_blockchain_transactions 테이블이 존재하는지 확인
    const vcTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='vc_blockchain_transactions'
    `).get();
    
    if (!vcTableExists) {
      log.info('vc_blockchain_transactions 테이블이 존재하지 않습니다. 테이블을 생성합니다...');
      
      // vc_blockchain_transactions 테이블 생성
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
      
      log.info('vc_blockchain_transactions 테이블이 생성되었습니다.');
    } else {
      log.info('vc_blockchain_transactions 테이블이 이미 존재합니다.');
    }
    
    // 트랜잭션 커밋
    db.exec('COMMIT');
    log.info('데이터베이스 마이그레이션 완료');
  } catch (error) {
    // 오류 발생 시 롤백
    db.exec('ROLLBACK');
    log.error(`데이터베이스 마이그레이션 오류: ${error}`);
  }
}

// 테이블 초기화 실행
initTables();

export default db;

// 데이터베이스 종료 함수
export function closeDatabase() {
  if (db) {
    db.close();
    log.info('데이터베이스 연결이 종료되었습니다.');
  }
} 