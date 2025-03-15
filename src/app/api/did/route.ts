import { NextRequest, NextResponse } from 'next/server';
import { generateSimpleDid } from '@/lib/did/didUtils';
import { createDID, getAllActiveDIDs } from '@/lib/db/didRepository';
import db from '@/lib/db';

/**
 * @swagger
 * /api/did:
 *   get:
 *     summary: DID 목록 조회
 *     tags: [DID]
 *     description: 저장된 DID 목록을 조회합니다.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 반환할 최대 DID 수
 *     responses:
 *       200:
 *         description: 성공적으로 DID 목록을 조회함
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DID'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: DID를 생성합니다.
 *     description: 새로운 DID와 DID Document를 생성합니다.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID (선택 사항)
 *     responses:
 *       200:
 *         description: DID가 성공적으로 생성됨
 *       500:
 *         description: 서버 오류
 */

// DID 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? parseInt(limitParam) : undefined;
    const offset = offsetParam ? parseInt(offsetParam) : 0;
    
    if (limit) {
      // 제한된 수의 DID 목록 가져오기
      const stmt = db.prepare(`
        SELECT * FROM dids
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      const dids = stmt.all(limit, offset);
      return NextResponse.json(dids);
    } else {
      // 모든 활성 DID 목록 가져오기
      const dids = getAllActiveDIDs();
      return NextResponse.json(dids);
    }
  } catch (error: any) {
    console.error('DID 목록 조회 오류:', error);
    return NextResponse.json(
      { error: error.message || 'DID 목록 조회 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;
    
    // 간단한 DID 생성 (로컬 개발 환경용)
    const { did, didDocument, keys } = generateSimpleDid();
    
    // DB에 DID 저장
    const didRecord = createDID({
      user_id: userId || undefined,
      did: did,
      did_document: JSON.stringify(didDocument),
      private_key: JSON.stringify(keys)
    });
    
    return NextResponse.json({
      success: true,
      did: did,
      didDocument: didDocument,
      didId: didRecord.id
    });
    
  } catch (error) {
    console.error('DID 생성 오류:', error);
    return NextResponse.json(
      { error: 'DID 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/did/{did}:
 *   get:
 *     summary: DID 조회
 *     tags: [DID]
 *     description: 특정 DID를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: did
 *         required: true
 *         schema:
 *           type: string
 *         description: 조회할 DID 식별자
 *     responses:
 *       200:
 *         description: 성공적으로 DID를 조회함
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DID'
 *       404:
 *         description: DID를 찾을 수 없음
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
 *   delete:
 *     summary: DID 삭제
 *     tags: [DID]
 *     description: 특정 DID를 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: did
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 DID 식별자
 *     responses:
 *       200:
 *         description: 성공적으로 DID를 삭제함
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: DID를 찾을 수 없음
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