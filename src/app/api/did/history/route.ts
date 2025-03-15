import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { log } from '@/lib/logger';

/**
 * @swagger
 * /api/did/history:
 *   get:
 *     summary: DID 이력을 조회합니다.
 *     description: 날짜, 사용자, 발급자, 상태 등으로 필터링하여 DID 이력을 조회합니다.
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: 특정 날짜로 필터링 (YYYY-MM-DD 형식)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 특정 사용자 ID로 필터링
 *       - in: query
 *         name: issuerId
 *         schema:
 *           type: string
 *         description: 특정 발급자 ID로 필터링
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked, suspended]
 *         description: 특정 상태로 필터링
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 한 페이지에 표시할 항목 수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: 시작 항목 번호
 *     responses:
 *       200:
 *         description: DID 이력 목록
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const issuerId = searchParams.get('issuerId');
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    const limit = limitParam ? parseInt(limitParam) : undefined;
    const offset = offsetParam ? parseInt(offsetParam) : 0;
    
    // 기본 쿼리 구성
    let query = `
      SELECT d.id, d.did, d.status, d.created_at, d.updated_at, 
             u.id as user_id, u.name as user_name,
             i.id as issuer_id, i.name as issuer_name
      FROM dids d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN issuers i ON d.did = i.did
    `;
    
    // 필터 조건 추가
    const conditions = [];
    const params = [];
    
    if (date) {
      // SQLite에서 날짜 형식 변환 (YYYY-MM-DD 형식으로 필터링)
      conditions.push("date(d.created_at) = ?");
      params.push(date);
    }
    
    if (userId) {
      conditions.push("d.user_id = ?");
      params.push(userId);
    }
    
    if (issuerId) {
      conditions.push("i.id = ?");
      params.push(issuerId);
    }
    
    if (status) {
      conditions.push("d.status = ?");
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    // 정렬 추가
    query += " ORDER BY d.created_at DESC";
    
    // 카운트 쿼리 실행 (전체 레코드 수 계산)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM dids d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN issuers i ON d.did = i.did
    `;
    
    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
    }
    
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...params);
    const total = countResult ? countResult.total : 0;
    
    // 페이징 적용
    if (limit !== undefined) {
      query += " LIMIT ? OFFSET ?";
      params.push(limit, offset);
    }
    
    // 쿼리 실행
    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    
    // 결과 가공
    const didHistory = results.map((row: any) => {
      const isIssuer = row.issuer_id !== null;
      
      return {
        id: row.id,
        did: row.did,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        owner_name: isIssuer ? row.issuer_name : row.user_name,
        owner_type: isIssuer ? 'issuer' : 'user',
        owner_id: isIssuer ? row.issuer_id : row.user_id
      };
    });
    
    return NextResponse.json({
      items: didHistory,
      total: total
    });
  } catch (error) {
    log.error('DID 이력 조회 오류:', error);
    return NextResponse.json(
      { error: 'DID 이력을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 