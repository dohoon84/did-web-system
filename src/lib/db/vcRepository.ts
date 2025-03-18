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
  status: 'active' | 'revoked' | 'suspended' | 'expired';
  created_at: string;
  updated_at: string;
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws?: string;
    proofValue?: string;
  };
}

export interface VCBlockchainTransaction {
  id: string;
  vc_id: string;
  transaction_hash: string;
  transaction_type: 'create_vc' | 'revoke_vc';
  status: 'confirmed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 새 VC를 생성합니다.
 */
export function createVC(vc: Omit<VerifiableCredential, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: VerifiableCredential['status'] }): VerifiableCredential {
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = vc.status || 'active';
  
  const stmt = db.prepare(`
    INSERT INTO verifiable_credentials (
      id, issuer_did, subject_did, credential_type, credential_data, 
      issuance_date, expiration_date, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // VC 데이터에 서명 정보(proof)가 포함된 경우, 이를 JSON으로 저장
  const credentialData = JSON.stringify({
    ...JSON.parse(vc.credential_data),
    proof: vc.proof
  });
  
  stmt.run(
    id,
    vc.issuer_did,
    vc.subject_did,
    vc.credential_type,
    credentialData,
    vc.issuance_date,
    vc.expiration_date || null,
    status,
    now,
    now
  );
  
  return {
    id,
    issuer_did: vc.issuer_did,
    subject_did: vc.subject_did,
    credential_type: vc.credential_type,
    credential_data: credentialData,
    issuance_date: vc.issuance_date,
    expiration_date: vc.expiration_date,
    status,
    created_at: now,
    updated_at: now,
    proof: vc.proof
  };
}

/**
 * VC 블록체인 트랜잭션 정보를 저장합니다.
 */
export function saveVCBlockchainTransaction(transaction: Omit<VCBlockchainTransaction, 'id' | 'created_at' | 'updated_at'>): VCBlockchainTransaction {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  try {
    // 테이블 존재 확인 및 생성
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='vc_blockchain_transactions'
    `).get();
    
    if (!tableExists) {
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
    }
    
    // 트랜잭션 저장
    const stmt = db.prepare(`
      INSERT INTO vc_blockchain_transactions (
        id, vc_id, transaction_hash, transaction_type, status, error_message, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      transaction.vc_id,
      transaction.transaction_hash,
      transaction.transaction_type,
      transaction.status,
      transaction.error_message || null,
      now,
      now
    );
    
    return {
      id,
      vc_id: transaction.vc_id,
      transaction_hash: transaction.transaction_hash,
      transaction_type: transaction.transaction_type,
      status: transaction.status,
      error_message: transaction.error_message,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('VC 블록체인 트랜잭션 저장 오류:', error);
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
export function getAllVCs(limit?: number, offset: number = 0): VerifiableCredential[] {
  let query = 'SELECT * FROM verifiable_credentials ORDER BY created_at DESC';
  
  if (limit) {
    query += ' LIMIT ? OFFSET ?';
    return db.prepare(query).all(limit, offset) as VerifiableCredential[];
  } else {
    return db.prepare(query).all() as VerifiableCredential[];
  }
}

/**
 * 발급자가 발급한 VC 목록을 조회합니다.
 */
export function getVCsByIssuer(issuerDid: string): VerifiableCredential[] {
  const stmt = db.prepare('SELECT * FROM verifiable_credentials WHERE issuer_did = ? ORDER BY created_at DESC');
  return stmt.all(issuerDid) as VerifiableCredential[];
}

/**
 * 주체(소유자)의 VC 목록을 조회합니다.
 */
export function getVCsBySubject(subjectDid: string): VerifiableCredential[] {
  const stmt = db.prepare('SELECT * FROM verifiable_credentials WHERE subject_did = ? ORDER BY created_at DESC');
  return stmt.all(subjectDid) as VerifiableCredential[];
}

/**
 * VC와 관련된 블록체인 트랜잭션을 조회합니다.
 */
export function getVCBlockchainTransactions(vcId: string): VCBlockchainTransaction[] {
  try {
    // 테이블 존재 확인
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='vc_blockchain_transactions'
    `).get();
    
    if (!tableExists) {
      return [];
    }
    
    const stmt = db.prepare(`
      SELECT * FROM vc_blockchain_transactions
      WHERE vc_id = ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(vcId) as VCBlockchainTransaction[];
  } catch (error) {
    console.error('VC 블록체인 트랜잭션 조회 오류:', error);
    return [];
  }
}

/**
 * VC 생성 날짜에 따라 만료 여부를 확인하고 필요시 상태를 업데이트합니다.
 */
export function checkVCExpiration(vc: VerifiableCredential): boolean {
  if (vc.status !== 'active' || !vc.expiration_date) {
    return false;
  }
  
  const now = new Date();
  const expirationDate = new Date(vc.expiration_date);
  
  if (now > expirationDate) {
    updateVCStatus(vc.id, 'expired');
    return true;
  }
  
  return false;
} 