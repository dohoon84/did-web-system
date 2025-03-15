import { v4 as uuidv4 } from 'uuid';
import db from './index';
import { log } from '../logger';

export interface VerifiablePresentation {
  id: string;
  holder_did: string;
  verifier?: string;
  presentation_data: string; // JSON 문자열
  created_at?: string;
  verification_result?: string; // JSON 문자열 (검증 결과)
  verification_date?: string;
}

/**
 * 새 VP를 생성합니다.
 */
export function createVP(vp: Omit<VerifiablePresentation, 'id' | 'created_at' | 'verification_result' | 'verification_date'>): VerifiablePresentation {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO verifiable_presentations (
      id, holder_did, verifier, presentation_data, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    vp.holder_did,
    vp.verifier || null,
    vp.presentation_data,
    now,
    now
  );
  
  return {
    id,
    holder_did: vp.holder_did,
    verifier: vp.verifier,
    presentation_data: vp.presentation_data,
    created_at: now
  };
}

/**
 * ID로 VP를 조회합니다.
 */
export function getVPById(id: string): VerifiablePresentation | null {
  const stmt = db.prepare('SELECT * FROM verifiable_presentations WHERE id = ?');
  return stmt.get(id) as VerifiablePresentation | null;
}

/**
 * 소유자(Holder) DID로 VP를 조회합니다.
 */
export function getVPsByHolderDID(holderDid: string): VerifiablePresentation[] {
  const stmt = db.prepare('SELECT * FROM verifiable_presentations WHERE holder_did = ? ORDER BY created_at DESC');
  return stmt.all(holderDid) as VerifiablePresentation[];
}

/**
 * 검증자(Verifier)로 VP를 조회합니다.
 */
export function getVPsByVerifier(verifier: string): VerifiablePresentation[] {
  const stmt = db.prepare('SELECT * FROM verifiable_presentations WHERE verifier = ? ORDER BY created_at DESC');
  return stmt.all(verifier) as VerifiablePresentation[];
}

/**
 * VP 검증 결과를 업데이트합니다.
 */
export function updateVPVerificationResult(id: string, verificationResult: string): VerifiablePresentation | null {
  const now = new Date().toISOString();
  
  try {
    // verification_date 컬럼이 있는지 확인
    const columnCheckStmt = db.prepare(`
      PRAGMA table_info(verifiable_presentations)
    `);
    const columns = columnCheckStmt.all();
    const hasVerificationDateColumn = columns.some((col: any) => col.name === 'verification_date');
    
    let stmt;
    if (hasVerificationDateColumn) {
      // verification_date 컬럼이 있는 경우
      stmt = db.prepare(`
        UPDATE verifiable_presentations
        SET verification_result = ?, verification_date = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(verificationResult, now, now, id);
    } else {
      // verification_date 컬럼이 없는 경우
      stmt = db.prepare(`
        UPDATE verifiable_presentations
        SET verification_result = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(verificationResult, now, id);
      
      // 컬럼 추가 시도
      try {
        db.exec(`ALTER TABLE verifiable_presentations ADD COLUMN verification_date TEXT`);
        log.info('verification_date 컬럼이 추가되었습니다.');
      } catch (alterError) {
        log.error('verification_date 컬럼 추가 실패:', alterError);
      }
    }
  } catch (error) {
    log.error('VP 검증 결과 업데이트 오류:', error);
    
    // 기본 업데이트 시도 (verification_result만 업데이트)
    try {
      const fallbackStmt = db.prepare(`
        UPDATE verifiable_presentations
        SET verification_result = ?, updated_at = ?
        WHERE id = ?
      `);
      fallbackStmt.run(verificationResult, now, id);
    } catch (fallbackError) {
      log.error('VP 검증 결과 기본 업데이트 실패:', fallbackError);
    }
  }
  
  return getVPById(id);
}

/**
 * 최근 VP를 조회합니다.
 */
export function getRecentVPs(limit: number = 10): VerifiablePresentation[] {
  const stmt = db.prepare(`
    SELECT * FROM verifiable_presentations
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  return stmt.all(limit) as VerifiablePresentation[];
}

/**
 * 검증된 VP를 조회합니다.
 */
export function getVerifiedVPs(): VerifiablePresentation[] {
  const stmt = db.prepare(`
    SELECT * FROM verifiable_presentations
    WHERE verification_result IS NOT NULL
    ORDER BY verification_date DESC
  `);
  
  return stmt.all() as VerifiablePresentation[];
}

/**
 * 연령 검증 VP를 조회합니다 (presentation_data에 "AgeVerificationCredential" 포함).
 */
export function getAgeVerificationVPs(holderDid: string): VerifiablePresentation[] {
  const stmt = db.prepare(`
    SELECT * FROM verifiable_presentations
    WHERE holder_did = ? AND presentation_data LIKE ?
    ORDER BY created_at DESC
  `);
  
  return stmt.all(holderDid, '%AgeVerificationCredential%') as VerifiablePresentation[];
}

/**
 * 모든 VP를 조회합니다.
 */
export function getAllVPs(): VerifiablePresentation[] {
  const stmt = db.prepare('SELECT * FROM verifiable_presentations ORDER BY created_at DESC');
  return stmt.all() as VerifiablePresentation[];
} 