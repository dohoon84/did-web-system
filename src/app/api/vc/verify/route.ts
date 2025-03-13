import { verifyVC } from '@/lib/did/vcUtils';
import { resolveDid } from '@/lib/did/didUtils';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/vc/verify:
 *   post:
 *     summary: VC 검증
 *     tags: [VC]
 *     description: VC의 유효성을 검증합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vcJws
 *               - issuerDid
 *             properties:
 *               vcJws:
 *                 type: string
 *                 description: 검증할 VC의 JWS
 *               issuerDid:
 *                 type: string
 *                 description: 발급자 DID
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
 *                 vc:
 *                   type: object
 *                   description: 검증된 VC 내용 (유효한 경우)
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
    const { vcJws, issuerDid } = body;
    
    if (!vcJws || !issuerDid) {
      return NextResponse.json({ message: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 발급자의 DID Document 조회
    const issuerDidDocument = await resolveDid(issuerDid);
    
    if (!issuerDidDocument) {
      return NextResponse.json({ message: '발급자 DID를 찾을 수 없습니다.' }, { status: 400 });
    }
    
    // VC 검증
    const result = await verifyVC(vcJws, issuerDidDocument);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
} 