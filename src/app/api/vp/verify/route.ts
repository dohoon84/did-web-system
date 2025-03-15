import { NextRequest, NextResponse } from 'next/server';
import { verifyVP } from '@/lib/did/vpUtils';
import { createVP, updateVPVerificationResult } from '@/lib/db/vpRepository';

/**
 * @swagger
 * /api/vp/verify:
 *   post:
 *     summary: VP를 검증합니다.
 *     description: 제출된 VP의 유효성을 검증하고 연령 조건을 확인합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vp
 *               - verifier
 *               - requiredAge
 *             properties:
 *               vp:
 *                 type: object
 *                 description: 검증할 VP 객체
 *               verifier:
 *                 type: string
 *                 description: 검증자 식별자
 *               requiredAge:
 *                 type: number
 *                 description: 요구되는 최소 연령
 *     responses:
 *       200:
 *         description: VP 검증 결과
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vp, verifier, requiredAge } = body;
    
    // 필수 필드 검증
    if (!vp || !verifier || requiredAge === undefined) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // VP 형식 검증
    if (!vp.holder || !vp.verifiableCredential || !Array.isArray(vp.verifiableCredential)) {
      return NextResponse.json(
        { error: 'VP 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }
    
    // VP 저장
    const vpRecord = createVP({
      holder_did: vp.holder,
      verifier: verifier,
      presentation_data: JSON.stringify(vp)
    });
    
    // VP 검증 (로컬 개발 환경에서는 항상 성공)
    const verificationResult = await verifyVP(vp);
    
    // 연령 인증 VC 찾기
    const ageCredential = vp.verifiableCredential.find((vc: any) => 
      vc.type && Array.isArray(vc.type) && vc.type.includes('AgeVerificationCredential')
    );
    
    let ageVerified = false;
    let actualAge = null;
    
    if (ageCredential && ageCredential.credentialSubject) {
      actualAge = ageCredential.credentialSubject.age;
      ageVerified = actualAge >= requiredAge;
    }
    
    // 검증 결과 저장
    const result = {
      signatureValid: verificationResult.verified,
      ageVerified: ageVerified,
      actualAge: actualAge,
      requiredAge: requiredAge,
      timestamp: new Date().toISOString()
    };
    
    // DB에 검증 결과 업데이트
    updateVPVerificationResult(vpRecord.id, JSON.stringify(result));
    
    return NextResponse.json({
      success: true,
      vpId: vpRecord.id,
      verificationResult: result
    });
    
  } catch (error) {
    console.error('VP 검증 오류:', error);
    return NextResponse.json(
      { error: 'VP 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 