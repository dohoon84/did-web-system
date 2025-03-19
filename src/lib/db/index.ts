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
        // 기존 테이블이 있으면 마이그레이션 실행
        migrateDatabase();
        return; // 테이블이 이미 존재하면 초기화 건너뛰기
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

// 데이터베이스 마이그레이션 함수
function migrateDatabase() {
  log.debug('데이터베이스 마이그레이션 시작...');
  
  try {
    // 트랜잭션 시작
    db.exec('BEGIN TRANSACTION');
    
    // blockchain_transactions 테이블이 존재하는지 확인
    const btTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='blockchain_transactions'
    `).get();
    
    if (btTableExists) {
      log.debug('blockchain_transactions 테이블이 존재합니다. 컬럼 확인 중...');
      
      // error_message 컬럼이 존재하는지 확인
      const columns = db.prepare("PRAGMA table_info(blockchain_transactions)").all();
      const hasErrorMessageColumn = columns.some((column: any) => column.name === 'error_message');
      
      if (!hasErrorMessageColumn) {
        log.debug('error_message 컬럼이 없습니다. 추가합니다...');
        
        // error_message 컬럼 추가
        db.prepare(`
          ALTER TABLE blockchain_transactions 
          ADD COLUMN error_message TEXT
        `).run();
        
        log.debug('error_message 컬럼이 추가되었습니다.');
      } else {
        log.debug('error_message 컬럼이 이미 존재합니다.');
      }
    } else {
      log.debug('blockchain_transactions 테이블이 존재하지 않습니다. 테이블 초기화 시 생성됩니다.');
    }
    
    // vc_blockchain_transactions 테이블이 존재하는지 확인
    const vcTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='vc_blockchain_transactions'
    `).get();
    
    if (!vcTableExists) {
      log.debug('vc_blockchain_transactions 테이블이 존재하지 않습니다. 테이블을 생성합니다...');
      
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
      
      log.debug('vc_blockchain_transactions 테이블이 생성되었습니다.');
    } else {
      log.debug('vc_blockchain_transactions 테이블이 이미 존재합니다.');
    }
    
    // VP 테이블 스키마 검사 및 업데이트
    const vpTableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='verifiable_presentations'
    `).get();

    if (vpTableCheck) {
      // VP 테이블이 존재하면 컬럼 검사
      log.debug('VP 테이블이 존재합니다. 스키마 업데이트 검사 중...');
      
      const vpColumns = db.prepare("PRAGMA table_info(verifiable_presentations)").all();
      const columnNames = vpColumns.map((col: any) => col.name);
      
      // vp_id, vp_hash, status 컬럼 확인
      const hasVpIdColumn = columnNames.includes('vp_id');
      const hasVpHashColumn = columnNames.includes('vp_hash');
      const hasStatusColumn = columnNames.includes('status');
      
      if (!hasVpIdColumn || !hasVpHashColumn || !hasStatusColumn) {
        log.debug('VP 테이블 스키마가 일치하지 않습니다. 테이블을 재생성합니다...');
        
        // 기존 데이터 백업
        db.exec(`
          CREATE TABLE IF NOT EXISTS verifiable_presentations_backup AS
          SELECT * FROM verifiable_presentations
        `);
        log.debug('VP 테이블 데이터를 백업했습니다.');
        
        // 기존 테이블 삭제
        db.exec(`DROP TABLE verifiable_presentations`);
        
        // 새 스키마로 테이블 생성
        db.exec(`
          CREATE TABLE verifiable_presentations (
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
        log.debug('VP 테이블을 새 스키마로 재생성했습니다.');
        
        try {
          // 백업에서 복원 시도 (새 컬럼은 null 또는 기본값으로 설정)
          // 백업 테이블에서 필요한 데이터만 가져옴
          db.exec(`
            INSERT INTO verifiable_presentations (
              id, vp_id, holder_did, vp_hash, vp_data, status, created_at, updated_at
            )
            SELECT
              id,
              id as vp_id, /* 임시로 ID를 VP ID로 사용 */
              holder_did,
              '' as vp_hash, /* 빈 해시 값 */
              presentation_data as vp_data,
              'active' as status, /* 기본 상태 값 */
              created_at,
              updated_at
            FROM verifiable_presentations_backup
          `);
          log.debug('VP 테이블 데이터를 복원했습니다.');
        } catch (restoreError) {
          log.error(`VP 테이블 데이터 복원 중 오류 발생: ${restoreError}`);
          log.debug('데이터 복원 실패, 신규 테이블을 사용합니다.');
        }
        
        // 백업 테이블 삭제 (선택 사항)
        db.exec(`DROP TABLE IF EXISTS verifiable_presentations_backup`);
      } else {
        log.debug('VP 테이블 스키마가 이미 최신 상태입니다.');
      }
    }
    
    // 트랜잭션 커밋
    db.exec('COMMIT');
    log.debug('데이터베이스 마이그레이션 완료');
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
    log.debug('데이터베이스 연결이 종료되었습니다.');
  }
} 