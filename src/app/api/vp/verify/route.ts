import { verifyVP } from '@/lib/did/vpUtils';
import { resolveDid } from '@/lib/did/didUtils';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/vp/verify:
 *   post:
 *     summary: VP 검증
 *     tags: [VP]
 *     description: VP의 유효성을 검증합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vpJws
 *               - holderDid
 *             properties:
 *               vpJws:
 *                 type: string
 *                 description: 검증할 VP의 JWS
 *               holderDid:
 *                 type: string
 *                 description: 소유자 DID
 *     responses:
 *       200:
 *         description: 검증 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 vp:
 *                   type: object
 *                   description: 검증된 VP 내용 (유효한 경우)
 *                 error:
 *                   type: string
 *                   description: 오류 메시지 (유효하지 않은 경우)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vpJws, holderDid } = body;
    
    if (!vpJws || !holderDid) {
      return NextResponse.json({ message: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 소유자의 DID Document 조회
    const holderDidDocument = await resolveDid(holderDid);
    
    if (!holderDidDocument) {
      return NextResponse.json({ message: '소유자 DID를 찾을 수 없습니다.' }, { status: 400 });
    }
    
    // VP 검증
    const result = await verifyVP(vpJws, holderDidDocument);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
} 