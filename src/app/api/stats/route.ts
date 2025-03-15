import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { log } from '@/lib/logger';

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: 시스템 통계 데이터를 가져옵니다.
 *     description: 사용자, DID, 발급자, VC, VP 등의 통계 정보를 제공합니다.
 *     responses:
 *       200:
 *         description: 통계 데이터
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    // 기본 응답 객체 초기화
    const stats = {
      totalUsers: 0,
      totalDids: 0,
      activeDids: 0,
      revokedDids: 0,
      totalIssuers: 0,
      totalVcs: 0,
      totalVps: 0
    };
    
    // 사용자 수
    try {
      const totalUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
      const result = totalUsersStmt.get();
      stats.totalUsers = result ? result.count : 0;
    } catch (error) {
      log.error('사용자 수 조회 오류:', error);
    }
    
    // 전체 DID 수
    try {
      const totalDidsStmt = db.prepare('SELECT COUNT(*) as count FROM dids');
      const result = totalDidsStmt.get();
      stats.totalDids = result ? result.count : 0;
    } catch (error) {
      log.error('전체 DID 수 조회 오류:', error);
    }
    
    // 활성 DID 수
    try {
      const activeDidsStmt = db.prepare('SELECT COUNT(*) as count FROM dids WHERE status = ?');
      const result = activeDidsStmt.get('active');
      stats.activeDids = result ? result.count : 0;
    } catch (error) {
      log.error('활성 DID 수 조회 오류:', error);
    }
    
    // 폐기 DID 수
    try {
      const revokedDidsStmt = db.prepare('SELECT COUNT(*) as count FROM dids WHERE status = ?');
      const result = revokedDidsStmt.get('revoked');
      stats.revokedDids = result ? result.count : 0;
    } catch (error) {
      log.error('폐기 DID 수 조회 오류:', error);
    }
    
    // 발급자 수
    try {
      const totalIssuersStmt = db.prepare('SELECT COUNT(*) as count FROM issuers');
      const result = totalIssuersStmt.get();
      stats.totalIssuers = result ? result.count : 0;
    } catch (error) {
      log.error('발급자 수 조회 오류:', error);
    }
    
    // VC 수
    try {
      // 테이블 존재 여부 확인
      const tableExistsStmt = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='verifiable_credentials'
      `);
      const tableExists = tableExistsStmt.get();
      
      if (tableExists) {
        const totalVcsStmt = db.prepare('SELECT COUNT(*) as count FROM verifiable_credentials');
        const result = totalVcsStmt.get();
        stats.totalVcs = result ? result.count : 0;
      }
    } catch (error) {
      log.error('VC 수 조회 오류:', error);
    }
    
    // VP 수
    try {
      // 테이블 존재 여부 확인
      const tableExistsStmt = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='verifiable_presentations'
      `);
      const tableExists = tableExistsStmt.get();
      
      if (tableExists) {
        const totalVpsStmt = db.prepare('SELECT COUNT(*) as count FROM verifiable_presentations');
        const result = totalVpsStmt.get();
        stats.totalVps = result ? result.count : 0;
      }
    } catch (error) {
      log.error('VP 수 조회 오류:', error);
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    log.error('통계 데이터 조회 오류:', error);
    return NextResponse.json(
      { 
        totalUsers: 0,
        totalDids: 0,
        activeDids: 0,
        revokedDids: 0,
        totalIssuers: 0,
        totalVcs: 0,
        totalVps: 0,
        error: '통계 데이터를 가져오는 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
} 