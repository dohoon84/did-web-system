import { v4 as uuidv4 } from 'uuid';
import db from './index';

export interface DIDRecord {
  id: string;
  user_id?: string;
  did: string;
  did_document: string;
  private_key?: string;
  status: 'active' | 'revoked' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

/**
 * 새 DID 레코드를 생성합니다.
 */
export function createDID(didRecord: Omit<DIDRecord, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: DIDRecord['status'] }): DIDRecord {
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = didRecord.status || 'active';
  
  const stmt = db.prepare(`
    INSERT INTO dids (id, user_id, did, did_document, private_key, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    didRecord.user_id || null,
    didRecord.did,
    didRecord.did_document,
    didRecord.private_key || null,
    status,
    now,
    now
  );
  
  return {
    id,
    user_id: didRecord.user_id,
    did: didRecord.did,
    did_document: didRecord.did_document,
    private_key: didRecord.private_key,
    status,
    created_at: now,
    updated_at: now
  };
}

/**
 * ID로 DID 레코드를 조회합니다.
 */
export function getDIDById(id: string): DIDRecord | null {
  const stmt = db.prepare('SELECT * FROM dids WHERE id = ?');
  return stmt.get(id) as DIDRecord | null;
}

/**
 * DID 문자열로 DID 레코드를 조회합니다.
 */
export function getDIDByDIDString(did: string): DIDRecord | null {
  const stmt = db.prepare('SELECT * FROM dids WHERE did = ?');
  return stmt.get(did) as DIDRecord | null;
}

/**
 * 사용자 ID로 DID 레코드를 조회합니다.
 */
export function getDIDsByUserId(userId: string): DIDRecord[] {
  const stmt = db.prepare('SELECT * FROM dids WHERE user_id = ? ORDER BY created_at DESC');
  return stmt.all(userId) as DIDRecord[];
}

/**
 * 사용자의 활성 DID를 조회합니다.
 */
export function getActiveDIDByUserId(userId: string): DIDRecord | null {
  const stmt = db.prepare('SELECT * FROM dids WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1');
  return stmt.get(userId, 'active') as DIDRecord | null;
}

/**
 * DID 상태를 업데이트합니다.
 */
export function updateDIDStatus(id: string, status: DIDRecord['status']): DIDRecord | null {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE dids
    SET status = ?, updated_at = ?
    WHERE id = ?
  `);
  
  stmt.run(status, now, id);
  
  return getDIDById(id);
}

/**
 * DID를 폐기합니다.
 */
export function revokeDID(id: string): DIDRecord | null {
  return updateDIDStatus(id, 'revoked');
}

/**
 * 모든 활성 DID를 조회합니다.
 */
export function getAllActiveDIDs(): DIDRecord[] {
  const stmt = db.prepare('SELECT * FROM dids WHERE status = ? ORDER BY created_at DESC');
  return stmt.all('active') as DIDRecord[];
}

/**
 * DID 문서를 업데이트합니다.
 */
export function updateDIDDocument(id: string, didDocument: string): DIDRecord | null {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE dids
    SET did_document = ?, updated_at = ?
    WHERE id = ?
  `);
  
  stmt.run(didDocument, now, id);
  
  return getDIDById(id);
}

/**
 * 특정 ID의 DID를 삭제합니다.
 * @param id 삭제할 DID의 ID
 * @returns 삭제 성공 여부
 */
export function deleteDID(id: string): boolean {
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE dids 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);
    stmt.run('revoked', now, id);
    return true;
  } catch (error) {
    console.error('DID 삭제 중 오류 발생:', error);
    throw error;
  }
} 