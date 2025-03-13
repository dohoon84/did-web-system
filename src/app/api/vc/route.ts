import { createVC } from '@/lib/did/vcUtils';
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/vc:
 *   get:
 *     summary: VC 목록 조회
 *     tags: [VC]
 *     description: 저장된 VC 목록을 조회합니다.
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
export async function GET() {
  try {
    // 서버 측에서는 VC 목록을 데이터베이스에서 가져와야 하지만,
    // 현재는 클라이언트 측 로컬 스토리지에 저장하므로 빈 배열 반환
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
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