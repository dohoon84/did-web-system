import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { log } from '../logger';
import { hashPresentation } from '../vp/vpUtils';

export interface VPRecord {
  id: string;
  vp_id: string;
  holder_did: string;
  vp_hash: string;
  vp_data: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface VPInput {
  holder_did: string;
  vp_data: string;
  status?: string;
}

/**
 * VP를 생성하고 저장합니다.
 * @param vpData VP 데이터
 * @returns 생성된 VP 레코드
 */
export function createVP(vpData: VPInput): VPRecord {
  try {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    // VP 객체 파싱
    const vp = JSON.parse(vpData.vp_data);
    const vpId = vp.id || `urn:uuid:${uuidv4()}`;
    
    // VP 해시 생성
    const vpHash = hashPresentation(vp);
    
    // VP 상태 (기본값: active)
    const status = vpData.status || 'active';
    
    // VP 저장
    const stmt = db.prepare(`
      INSERT INTO verifiable_presentations (
        id, vp_id, holder_did, vp_hash, vp_data, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      vpId,
      vpData.holder_did,
      vpHash,
      vpData.vp_data,
      status,
      now,
      now
    );
    
    // 저장된 VP 레코드 반환
    return {
      id,
      vp_id: vpId,
      holder_did: vpData.holder_did,
      vp_hash: vpHash,
      vp_data: vpData.vp_data,
      status,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('VP 생성 오류:', error);
    throw error;
  }
}

/**
 * VP 상태를 업데이트합니다.
 * @param vpId VP ID
 * @param status 새로운 상태
 * @returns 업데이트 성공 여부
 */
export function updateVPStatus(vpId: string, status: string): boolean {
  try {
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE verifiable_presentations
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(status, now, vpId);
    return result.changes > 0;
  } catch (error) {
    console.error('VP 상태 업데이트 오류:', error);
    throw error;
  }
}

/**
 * VP를 ID로 조회합니다.
 * @param vpId VP ID
 * @returns 조회된 VP 레코드
 */
export function getVPById(vpId: string): VPRecord | undefined {
  try {
    const stmt = db.prepare(`
      SELECT * FROM verifiable_presentations
      WHERE id = ?
    `);
    
    return stmt.get(vpId) as VPRecord | undefined;
  } catch (error) {
    console.error('VP 조회 오류:', error);
    throw error;
  }
}

/**
 * VP를 VP ID(W3C 표준 ID)로 조회합니다.
 * @param vpStandardId W3C 표준 VP ID
 * @returns 조회된 VP 레코드
 */
export function getVPByStandardId(vpStandardId: string): VPRecord | undefined {
  try {
    const stmt = db.prepare(`
      SELECT * FROM verifiable_presentations
      WHERE vp_id = ?
    `);
    
    return stmt.get(vpStandardId) as VPRecord | undefined;
  } catch (error) {
    console.error('VP 조회 오류:', error);
    throw error;
  }
}

/**
 * 특정 소유자(holder)의 모든 VP를 조회합니다.
 * @param holderDid 소유자 DID
 * @returns 조회된 VP 레코드 배열
 */
export function getVPsByHolder(holderDid: string): VPRecord[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM verifiable_presentations
      WHERE holder_did = ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(holderDid) as VPRecord[];
  } catch (error) {
    console.error('VP 조회 오류:', error);
    throw error;
  }
}

/**
 * 모든 VP를 조회합니다.
 * @param limit 조회할 최대 항목 수
 * @param offset 건너뛸 항목 수
 * @returns 조회된 VP 레코드 배열
 */
export function getAllVPs(limit?: number, offset: number = 0): VPRecord[] {
  try {
    let query = `
      SELECT * FROM verifiable_presentations
      ORDER BY created_at DESC
    `;
    
    if (limit !== undefined) {
      query += ' LIMIT ? OFFSET ?';
      return db.prepare(query).all(limit, offset) as VPRecord[];
    } else {
      return db.prepare(query).all() as VPRecord[];
    }
  } catch (error) {
    console.error('VP 조회 오류:', error);
    throw error;
  }
}

/**
 * VP를 삭제합니다.
 * @param vpId VP ID
 * @returns 삭제 성공 여부
 */
export function deleteVP(vpId: string): boolean {
  try {
    const stmt = db.prepare(`
      DELETE FROM verifiable_presentations
      WHERE id = ?
    `);
    
    const result = stmt.run(vpId);
    return result.changes > 0;
  } catch (error) {
    console.error('VP 삭제 오류:', error);
    throw error;
  }
}

/**
 * 최근 VP를 조회합니다.
 * @param limit 조회할 최대 항목 수
 * @returns 조회된 VP 레코드 배열
 */
export function getRecentVPs(limit: number = 10): VPRecord[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM verifiable_presentations
      ORDER BY created_at DESC
      LIMIT ?
    `);
    
    return stmt.all(limit) as VPRecord[];
  } catch (error) {
    console.error('VP 조회 오류:', error);
    throw error;
  }
}

/**
 * 특정 타입의 VP를 조회합니다.
 * @param type VP 타입
 * @returns 조회된 VP 레코드 배열
 */
export function getVPsByType(type: string): VPRecord[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM verifiable_presentations
      WHERE vp_data LIKE ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(`%"type":%${type}%`) as VPRecord[];
  } catch (error) {
    console.error('VP 조회 오류:', error);
    throw error;
  }
}

/**
 * 연령 검증 VP를 조회합니다 (vp_data에 "AgeVerificationCredential" 포함).
 * @param holderDid 소유자 DID
 * @returns 조회된 VP 레코드 배열
 */
export function getAgeVerificationVPs(holderDid: string): VPRecord[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM verifiable_presentations
      WHERE holder_did = ? AND vp_data LIKE ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(holderDid, '%AgeVerificationCredential%') as VPRecord[];
  } catch (error) {
    console.error('VP 조회 오류:', error);
    throw error;
  }
} 