import { NextRequest, NextResponse } from 'next/server';
import { VCService } from '@/lib/vc/vcService';
import { log } from '@/lib/logger';

// VC 서비스 인스턴스 생성
const vcService = new VCService();

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
 *               - vcId
 *             properties:
 *               vcId:
 *                 type: string
 *                 description: VC의 ID
 *     responses:
 *       200:
 *         description: 검증 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 vc:
 *                   type: object
 *                   description: 검증된 VC 내용 (유효한 경우)
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

/**
 * POST /api/vc/verify
 * VC 검증
 */
export async function POST(req: NextRequest) {
  try {
    const { vcId } = await req.json();
    
    if (!vcId) {
      return NextResponse.json({
        success: false,
        message: 'VC ID가 필요합니다.'
      }, { status: 400 });
    }
    
    // VC 조회
    const vc = vcService.getVCById(vcId);
    
    if (!vc) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: `ID가 ${vcId}인 VC를 찾을 수 없습니다.`
      }, { status: 404 });
    }
    
    // VC 검증
    const verificationResult = await vcService.verifyVC(vc);
    
    return NextResponse.json({
      success: true,
      valid: verificationResult.valid,
      message: verificationResult.message,
      vc
    });
  } catch (error) {
    log.error('VC 검증 오류:', error);
    
    return NextResponse.json({ 
      success: false,
      valid: false,
      message: error instanceof Error ? error.message : '내부 서버 오류'
    }, { status: 500 });
  }
} 