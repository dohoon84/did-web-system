import { createVC } from '@/lib/did/vcUtils';
import { NextRequest, NextResponse } from 'next/server';
import { getAllVCs } from '@/lib/db/vcRepository';
import db from '@/lib/db';

/**
 * @swagger
 * /api/vc:
 *   get:
 *     summary: VC 목록 조회
 *     tags: [VC]
 *     description: 저장된 VC 목록을 조회합니다.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 반환할 최대 VC 수
 *     responses:
 *       200:
 *         description: 성공적으로 VC 목록을 조회함
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VC'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 새 VC 발급
 *     tags: [VC]
 *     description: 새로운 VC를 발급합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issuerDid
 *               - issuerPrivateKey
 *               - subjectDid
 *               - claims
 *             properties:
 *               issuerDid:
 *                 type: string
 *                 description: 발급자 DID
 *               issuerPrivateKey:
 *                 type: object
 *                 description: 발급자 개인키
 *               subjectDid:
 *                 type: string
 *                 description: 대상자 DID
 *               claims:
 *                 type: object
 *                 description: VC에 포함될 클레임 정보
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *                 description: 만료일 (선택사항)
 *     responses:
 *       201:
 *         description: 성공적으로 VC를 발급함
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VC'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// VC 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? parseInt(limitParam) : undefined;
    const offset = offsetParam ? parseInt(offsetParam) : 0;
    
    // 테이블 존재 여부 확인
    const tableExistsStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='verifiable_credentials'
    `);
    const tableExists = tableExistsStmt.get();
    
    if (!tableExists) {
      console.log('verifiable_credentials 테이블이 존재하지 않습니다.');
      return NextResponse.json([]);
    }
    
    if (limit) {
      // 제한된 수의 VC 목록 가져오기
      const stmt = db.prepare(`
        SELECT * FROM verifiable_credentials
        ORDER BY issuance_date DESC
        LIMIT ? OFFSET ?
      `);
      const vcs = stmt.all(limit, offset);
      return NextResponse.json(vcs);
    } else {
      // 모든 VC 목록 가져오기
      const vcs = getAllVCs();
      return NextResponse.json(vcs);
    }
  } catch (error: any) {
    console.error('VC 목록 조회 오류:', error);
    return NextResponse.json(
      { error: error.message || 'VC 목록 조회 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}

// 새 VC 발급
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issuerDid, issuerPrivateKey, subjectDid, claims, expirationDate } = body;
    
    if (!issuerDid || !issuerPrivateKey || !subjectDid || !claims) {
      return NextResponse.json({ message: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    let expDate = undefined;
    if (expirationDate) {
      expDate = new Date(expirationDate);
    }
    
    const result = await createVC(issuerDid, issuerPrivateKey, subjectDid, claims, expDate);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
} 