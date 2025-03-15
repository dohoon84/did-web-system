import { v4 as uuidv4 } from 'uuid';
import db from './index';
import { log } from '../logger';

export interface VerifiableCredential {
  id: string;
  issuer_did: string;
  subject_did: string;
  credential_type: string;
  credential_data: string; // JSON 문자열
  issuance_date: string;
  expiration_date?: string;
  status?: 'active' | 'revoked' | 'expired';
  created_at?: string;
  updated_at?: string;
}

/**
 * 새 VC를 생성합니다.
 */
export function createVC(vc: Omit<VerifiableCredential, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: VerifiableCredential['status'] }): VerifiableCredential {
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = vc.status || 'active';
  
  try {
    // 테이블에 status 컬럼이 있는지 확인
    const tableInfo = db.prepare("PRAGMA table_info(verifiable_credentials)").all();
    const hasStatusColumn = tableInfo.some((column: any) => column.name === 'status');
    
    let stmt;
    
    if (hasStatusColumn) {
      // status 컬럼이 있는 경우
      stmt = db.prepare(`
        INSERT INTO verifiable_credentials (
          id, issuer_did, subject_did, credential_type, credential_data,
          issuance_date, expiration_date, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        vc.issuer_did,
        vc.subject_did,
        vc.credential_type,
        vc.credential_data,
        vc.issuance_date,
        vc.expiration_date || null,
        status,
        now,
        now
      );
    } else {
      // status 컬럼이 없는 경우
      log.info('verifiable_credentials 테이블에 status 컬럼이 없습니다. status 컬럼 없이 VC를 생성합니다.');
      stmt = db.prepare(`
        INSERT INTO verifiable_credentials (
          id, issuer_did, subject_did, credential_type, credential_data,
          issuance_date, expiration_date, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        vc.issuer_did,
        vc.subject_did,
        vc.credential_type,
        vc.credential_data,
        vc.issuance_date,
        vc.expiration_date || null,
        now,
        now
      );
    }
    
    return {
      id,
      issuer_did: vc.issuer_did,
      subject_did: vc.subject_did,
      credential_type: vc.credential_type,
      credential_data: vc.credential_data,
      issuance_date: vc.issuance_date,
      expiration_date: vc.expiration_date,
      status,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    log.error(`VC 생성 중 오류 발생: ${error}`);
    throw error;
  }
}

/**
 * ID로 VC를 조회합니다.
 */
export function getVCById(id: string): VerifiableCredential | null {
  const stmt = db.prepare('SELECT * FROM verifiable_credentials WHERE id = ?');
  return stmt.get(id) as VerifiableCredential | null;
}

/**
 * 주체(Subject) DID로 VC를 조회합니다.
 */
export function getVCsBySubjectDID(subjectDid: string): VerifiableCredential[] {
  const stmt = db.prepare('SELECT * FROM verifiable_credentials WHERE subject_did = ? ORDER BY created_at DESC');
  return stmt.all(subjectDid) as VerifiableCredential[];
}

/**
 * 발급자(Issuer) DID로 VC를 조회합니다.
 */
export function getVCsByIssuerDID(issuerDid: string): VerifiableCredential[] {
  const stmt = db.prepare('SELECT * FROM verifiable_credentials WHERE issuer_did = ? ORDER BY created_at DESC');
  return stmt.all(issuerDid) as VerifiableCredential[];
}

/**
 * 주체 DID와 자격 증명 유형으로 활성 VC를 조회합니다.
 */
export function getActiveVCsBySubjectAndType(subjectDid: string, credentialType: string): VerifiableCredential[] {
  const stmt = db.prepare(`
    SELECT * FROM verifiable_credentials 
    WHERE subject_did = ? AND credential_type = ? AND status = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(subjectDid, credentialType, 'active') as VerifiableCredential[];
}

/**
 * 연령 인증 VC를 조회합니다.
 */
export function getAgeVerificationVCs(subjectDid: string): VerifiableCredential[] {
  return getActiveVCsBySubjectAndType(subjectDid, 'AgeVerificationCredential');
}

/**
 * VC 상태를 업데이트합니다.
 */
export function updateVCStatus(id: string, status: VerifiableCredential['status']): VerifiableCredential | null {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE verifiable_credentials
    SET status = ?, updated_at = ?
    WHERE id = ?
  `);
  
  stmt.run(status, now, id);
  
  return getVCById(id);
}

/**
 * VC를 폐기합니다.
 */
export function revokeVC(id: string): VerifiableCredential | null {
  return updateVCStatus(id, 'revoked');
}

/**
 * 만료된 VC를 확인하고 상태를 업데이트합니다.
 */
export function checkAndUpdateExpiredVCs(): number {
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    UPDATE verifiable_credentials
    SET status = 'expired', updated_at = ?
    WHERE status = 'active' AND expiration_date IS NOT NULL AND expiration_date < ?
  `);
  
  const result = stmt.run(now, now);
  return result.changes;
}

/**
 * 모든 VC를 조회합니다.
 */
export function getAllVCs(): VerifiableCredential[] {
  const stmt = db.prepare('SELECT * FROM verifiable_credentials ORDER BY created_at DESC');
  return stmt.all() as VerifiableCredential[];
} 