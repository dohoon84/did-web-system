import { v4 as uuidv4 } from 'uuid';
import db from './index';
import { log } from '../logger';

export interface Issuer {
  id: string;
  name: string;
  did: string;
  organization?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface IssuerInput {
  name: string;
  did: string;
  organization?: string;
  description?: string;
}

/**
 * 모든 발급자 목록을 가져옵니다.
 */
export function getAllIssuers(): Issuer[] {
  try {
    const stmt = db.prepare('SELECT * FROM issuers ORDER BY created_at DESC');
    return stmt.all();
  } catch (error) {
    log.error('발급자 목록 조회 오류:', error);
    return [];
  }
}

/**
 * ID로 발급자를 조회합니다.
 */
export function getIssuerById(id: string): Issuer | null {
  try {
    const stmt = db.prepare('SELECT * FROM issuers WHERE id = ?');
    return stmt.get(id) || null;
  } catch (error) {
    log.error(`발급자 조회 오류 (ID: ${id}):`, error);
    return null;
  }
}

/**
 * DID로 발급자를 조회합니다.
 */
export function getIssuerByDid(did: string): Issuer | null {
  try {
    const stmt = db.prepare('SELECT * FROM issuers WHERE did = ?');
    return stmt.get(did) || null;
  } catch (error) {
    log.error(`발급자 조회 오류 (DID: ${did}):`, error);
    return null;
  }
}

/**
 * 새 발급자를 생성합니다.
 */
export function createIssuer(issuerData: IssuerInput): Issuer {
  try {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    const issuer: Issuer = {
      id,
      name: issuerData.name,
      did: issuerData.did,
      organization: issuerData.organization || null,
      description: issuerData.description || null,
      created_at: now,
      updated_at: now
    };
    
    const stmt = db.prepare(`
      INSERT INTO issuers (id, name, did, organization, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      issuer.id,
      issuer.name,
      issuer.did,
      issuer.organization,
      issuer.description,
      issuer.created_at,
      issuer.updated_at
    );
    
    log.info(`발급자가 생성되었습니다: ${issuer.id}`);
    return issuer;
  } catch (error) {
    log.error('발급자 생성 오류:', error);
    throw new Error('발급자 생성 중 오류가 발생했습니다.');
  }
}

/**
 * 발급자 정보를 업데이트합니다.
 */
export function updateIssuer(id: string, issuerData: Partial<IssuerInput>): Issuer | null {
  try {
    const issuer = getIssuerById(id);
    if (!issuer) {
      log.warn(`업데이트할 발급자를 찾을 수 없습니다: ${id}`);
      return null;
    }
    
    const updatedIssuer: Issuer = {
      ...issuer,
      name: issuerData.name || issuer.name,
      did: issuerData.did || issuer.did,
      organization: issuerData.organization !== undefined ? issuerData.organization : issuer.organization,
      description: issuerData.description !== undefined ? issuerData.description : issuer.description,
      updated_at: new Date().toISOString()
    };
    
    const stmt = db.prepare(`
      UPDATE issuers
      SET name = ?, did = ?, organization = ?, description = ?, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updatedIssuer.name,
      updatedIssuer.did,
      updatedIssuer.organization,
      updatedIssuer.description,
      updatedIssuer.updated_at,
      id
    );
    
    log.info(`발급자가 업데이트되었습니다: ${id}`);
    return updatedIssuer;
  } catch (error) {
    log.error(`발급자 업데이트 오류 (ID: ${id}):`, error);
    return null;
  }
}

/**
 * 발급자를 삭제합니다.
 */
export function deleteIssuer(id: string): boolean {
  try {
    const stmt = db.prepare('DELETE FROM issuers WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes > 0) {
      log.info(`발급자가 삭제되었습니다: ${id}`);
      return true;
    } else {
      log.warn(`삭제할 발급자를 찾을 수 없습니다: ${id}`);
      return false;
    }
  } catch (error) {
    log.error(`발급자 삭제 오류 (ID: ${id}):`, error);
    return false;
  }
} 