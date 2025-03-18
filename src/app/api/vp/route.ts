import { createVerifiablePresentation } from '@/lib/vp/vpUtils';
import { NextRequest, NextResponse } from 'next/server';
import { getAllVPs } from '@/lib/db/vpRepository';

/**
 * @swagger
 * /api/vp:
 *   get:
 *     summary: VP 목록 조회
 *     tags: [VP]
 *     description: 저장된 VP 목록을 조회합니다.
 *     responses:
 *       200:
 *         description: 성공적으로 VP 목록을 조회함
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VP'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 새 VP 생성
 *     tags: [VP]
 *     description: 새로운 VP를 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - holderDid
 *               - holderPrivateKey
 *               - vcs
 *             properties:
 *               holderDid:
 *                 type: string
 *                 description: 소유자 DID
 *               holderPrivateKey:
 *                 type: object
 *                 description: 소유자 개인키
 *               vcs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: VP에 포함될 VC 목록 (JWS 형식)
 *               challenge:
 *                 type: string
 *                 description: 챌린지 값 (선택사항)
 *               domain:
 *                 type: string
 *                 description: 도메인 (선택사항)
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *                 description: 만료일 (선택사항)
 *     responses:
 *       201:
 *         description: 성공적으로 VP를 생성함
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VP'
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

// VP 목록 조회
export async function GET() {
  try {
    // 데이터베이스에서 모든 VP 목록 가져오기
    const vps = getAllVPs();
    return NextResponse.json(vps);
  } catch (error: any) {
    console.error('VP 목록 조회 오류:', error);
    return NextResponse.json(
      { error: error.message || 'VP 목록 조회 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}

// 새 VP 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { holderDid, holderPrivateKey, vcs, challenge, domain, expirationDate } = body;
    
    if (!holderDid || !holderPrivateKey || !vcs || !Array.isArray(vcs) || vcs.length === 0) {
      return NextResponse.json({ message: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    let expDate = undefined;
    if (expirationDate) {
      expDate = new Date(expirationDate);
    }
    
    const result = await createVerifiablePresentation(
      holderDid, 
      vcs,
      holderPrivateKey, 
      ['VerifiablePresentation']
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
} 