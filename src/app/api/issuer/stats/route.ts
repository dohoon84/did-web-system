import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { log } from '@/lib/logger';

/**
 * @swagger
 * /api/issuer/stats:
 *   get:
 *     summary: 발급자 통계 데이터를 가져옵니다.
 *     description: 발급자 상태 정보 및 각 발급자가 발급한 VC 수를 제공합니다.
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *         description: 소속 기관으로 필터링
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
 *         description: 발급자 통계 데이터
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organization = searchParams.get('organization');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    const limit = limitParam ? parseInt(limitParam) : 5;
    const offset = offsetParam ? parseInt(offsetParam) : 0;
    
    // 기본 응답 객체 초기화
    const response = {
      issuerStatusData: [],
      topIssuers: [],
      totalTopIssuers: 0,
      organizations: [],
      issuerVcStats: [],
      activeIssuers: 0,
      inactiveIssuers: 0
    };
    
    // 발급자 상태 정보 (활성, 비활성)
    try {
      try {
        const issuerStatusStmt = db.prepare(`
          SELECT i.id, i.name, i.organization, d.status, 
                 COALESCE((SELECT COUNT(*) FROM issuers WHERE id = i.id), 0) as vc_count
          FROM issuers i
          LEFT JOIN dids d ON i.did = d.did
          GROUP BY i.id
        `);
        response.issuerStatusData = issuerStatusStmt.all();
      } catch (joinError) {
        log.error('발급자 상태 정보 JOIN 쿼리 오류:', joinError);
        
        // 대체 쿼리: 기본 발급자 정보만 가져오기
        const fallbackStmt = db.prepare(`
          SELECT id, name, organization, 'unknown' as status, 0 as vc_count
          FROM issuers
        `);
        response.issuerStatusData = fallbackStmt.all();
      }
    } catch (error) {
      log.error('발급자 상태 정보 조회 오류:', error);
      response.issuerStatusData = [];
    }
    
    // 발급자별 VC 발급 수 쿼리 구성
    try {
      // 테이블 존재 여부 확인
      const tableExistsStmt = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='verifiable_credentials'
      `);
      const tableExists = tableExistsStmt.get();
      
      if (tableExists) {
        let topIssuersQuery = `
          SELECT i.id, i.name, i.organization, 
                 COALESCE((SELECT COUNT(*) FROM verifiable_credentials WHERE issuer_did = i.did), 0) as vc_count
          FROM issuers i
        `;
        
        const queryParams = [];
        
        // 소속 기관 필터 적용
        if (organization) {
          topIssuersQuery += ` WHERE i.organization = ?`;
          queryParams.push(organization);
        }
        
        // 그룹화 및 정렬
        topIssuersQuery += `
          ORDER BY vc_count DESC
        `;
        
        // 전체 발급자 수 계산
        let countQuery = `
          SELECT COUNT(*) as total FROM (
            SELECT i.id
            FROM issuers i
        `;
        
        if (organization) {
          countQuery += ` WHERE i.organization = ?`;
        }
        
        countQuery += `) as subquery`;
        
        try {
          // 전체 발급자 수 조회
          const countStmt = db.prepare(countQuery);
          const countResult = organization 
            ? countStmt.get(organization) 
            : countStmt.get();
          response.totalTopIssuers = countResult ? countResult.total : 0;
          
          // 페이지네이션 적용
          topIssuersQuery += ` LIMIT ? OFFSET ?`;
          queryParams.push(limit, offset);
          
          // 발급자별 VC 발급 수 조회
          const topIssuersStmt = db.prepare(topIssuersQuery);
          response.topIssuers = topIssuersStmt.all(...queryParams);
        } catch (queryError) {
          log.error('발급자별 VC 발급 수 쿼리 오류:', queryError);
          
          // 대체 쿼리: 기본 발급자 정보만 가져오기
          let fallbackQuery = `
            SELECT id, name, organization, 0 as vc_count
            FROM issuers
          `;
          
          const fallbackParams = [];
          
          if (organization) {
            fallbackQuery += ` WHERE organization = ?`;
            fallbackParams.push(organization);
          }
          
          fallbackQuery += ` ORDER BY name LIMIT ? OFFSET ?`;
          fallbackParams.push(limit, offset);
          
          const fallbackStmt = db.prepare(fallbackQuery);
          response.topIssuers = fallbackStmt.all(...fallbackParams);
          
          // 전체 발급자 수 대체 조회
          if (response.totalTopIssuers === 0) {
            const countFallbackStmt = db.prepare(`
              SELECT COUNT(*) as total FROM issuers
              ${organization ? 'WHERE organization = ?' : ''}
            `);
            const countFallbackResult = organization 
              ? countFallbackStmt.get(organization) 
              : countFallbackStmt.get();
            response.totalTopIssuers = countFallbackResult ? countFallbackResult.total : 0;
          }
        }
      } else {
        response.topIssuers = [];
        response.totalTopIssuers = 0;
      }
    } catch (error) {
      log.error('상위 발급자 조회 오류:', error);
      response.topIssuers = [];
      response.totalTopIssuers = 0;
    }
    
    // 소속 기관 목록 조회
    try {
      const organizationsStmt = db.prepare(`
        SELECT DISTINCT organization 
        FROM issuers 
        WHERE organization IS NOT NULL 
        ORDER BY organization
      `);
      response.organizations = organizationsStmt.all().map((row: any) => row.organization);
    } catch (error) {
      log.error('소속 기관 목록 조회 오류:', error);
      response.organizations = [];
    }
    
    // 발급자별 VC 발급 수 (차트용 상위 10개)
    try {
      // 테이블 존재 여부 확인
      const tableExistsStmt = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='verifiable_credentials'
      `);
      const tableExists = tableExistsStmt.get();
      
      if (tableExists) {
        try {
          // LEFT JOIN을 사용하여 VC가 없는 발급자도 포함
          const issuerVcStatsStmt = db.prepare(`
            SELECT i.organization, COUNT(vc.id) as count
            FROM issuers i
            LEFT JOIN verifiable_credentials vc ON i.did = vc.issuer_did
            WHERE i.organization IS NOT NULL
            GROUP BY i.organization
            ORDER BY count DESC
            LIMIT 10
          `);
          response.issuerVcStats = issuerVcStatsStmt.all();
        } catch (joinError) {
          log.error('발급자별 VC 발급 수 JOIN 쿼리 오류:', joinError);
          
          // 대체 쿼리: 발급자 정보만 가져오기
          const fallbackStmt = db.prepare(`
            SELECT organization, 0 as count
            FROM issuers
            WHERE organization IS NOT NULL
            GROUP BY organization
            LIMIT 10
          `);
          response.issuerVcStats = fallbackStmt.all();
        }
      } else {
        response.issuerVcStats = [];
      }
    } catch (error) {
      log.error('발급자별 VC 발급 수 조회 오류:', error);
      response.issuerVcStats = [];
    }
    
    // 활성 및 비활성 발급자 수
    try {
      try {
        const activeIssuersStmt = db.prepare(`
          SELECT COUNT(DISTINCT i.id) as count
          FROM issuers i
          LEFT JOIN dids d ON i.did = d.did
          WHERE d.status = 'active'
        `);
        const activeResult = activeIssuersStmt.get();
        response.activeIssuers = activeResult ? activeResult.count : 0;
        
        const inactiveIssuersStmt = db.prepare(`
          SELECT COUNT(DISTINCT i.id) as count
          FROM issuers i
          LEFT JOIN dids d ON i.did = d.did
          WHERE d.status != 'active' OR d.status IS NULL
        `);
        const inactiveResult = inactiveIssuersStmt.get();
        response.inactiveIssuers = inactiveResult ? inactiveResult.count : 0;
      } catch (joinError) {
        log.error('활성/비활성 발급자 수 JOIN 쿼리 오류:', joinError);
        
        // 대체 쿼리: 전체 발급자 수만 가져오기
        const totalIssuersStmt = db.prepare('SELECT COUNT(*) as count FROM issuers');
        const totalResult = totalIssuersStmt.get();
        const total = totalResult ? totalResult.count : 0;
        
        // 모든 발급자를 활성 상태로 간주
        response.activeIssuers = total;
        response.inactiveIssuers = 0;
      }
    } catch (error) {
      log.error('활성/비활성 발급자 수 조회 오류:', error);
      response.activeIssuers = 0;
      response.inactiveIssuers = 0;
    }
    
    return NextResponse.json(response);
  } catch (error) {
    log.error('발급자 통계 데이터 조회 오류:', error);
    return NextResponse.json(
      { 
        issuerStatusData: [],
        topIssuers: [],
        totalTopIssuers: 0,
        organizations: [],
        issuerVcStats: [],
        activeIssuers: 0,
        inactiveIssuers: 0,
        error: '발급자 통계 데이터를 가져오는 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
} 