import { generateDid, resolveDid } from '@/lib/did/didUtils';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/did:
 *   get:
 *     summary: DID 목록 조회
 *     tags: [DID]
 *     description: 저장된 DID 목록을 조회합니다.
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
 *     summary: 새 DID 생성
 *     tags: [DID]
 *     description: 새로운 DID를 생성합니다.
 *     responses:
 *       201:
 *         description: 성공적으로 DID를 생성함
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DID'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// DID 목록 조회 또는 새 DID 생성
export async function GET() {
  try {
    // 서버 측에서는 DID 목록을 데이터베이스에서 가져와야 하지만,
    // 현재는 클라이언트 측 로컬 스토리지에 저장하므로 빈 배열 반환
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const didInfo = await generateDid();
    return NextResponse.json(didInfo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
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