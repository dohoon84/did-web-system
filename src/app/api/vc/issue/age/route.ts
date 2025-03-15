import { NextRequest, NextResponse } from 'next/server';
import { issueSimpleVC } from '@/lib/did/vcUtils';
import { getDIDByDIDString } from '@/lib/db/didRepository';
import { createVC as createVCRecord } from '@/lib/db/vcRepository';
import { getUserById, calculateAge } from '@/lib/db/userRepository';

/**
 * @swagger
 * /api/vc/issue/age:
 *   post:
 *     summary: 연령 인증 VC를 발급합니다.
 *     description: 사용자의 연령 정보를 검증하고 연령 인증 VC를 발급합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issuerDid
 *               - subjectDid
 *               - userId
 *               - minAge
 *             properties:
 *               issuerDid:
 *                 type: string
 *                 description: 발급자 DID
 *               subjectDid:
 *                 type: string
 *                 description: 주체(사용자) DID
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *               minAge:
 *                 type: number
 *                 description: 최소 연령 요구사항
 *     responses:
 *       200:
 *         description: VC가 성공적으로 발급됨
 *       400:
 *         description: 잘못된 요청 또는 연령 조건 불충족
 *       404:
 *         description: 사용자 또는 DID를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issuerDid, subjectDid, userId, minAge } = body;
    
    // 필수 필드 검증
    if (!issuerDid || !subjectDid || !userId || minAge === undefined) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 사용자 정보 조회
    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 발급자 DID 조회
    const issuerDidRecord = getDIDByDIDString(issuerDid);
    if (!issuerDidRecord) {
      return NextResponse.json(
        { error: '발급자 DID를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 주체 DID 조회
    const subjectDidRecord = getDIDByDIDString(subjectDid);
    if (!subjectDidRecord) {
      return NextResponse.json(
        { error: '주체 DID를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 사용자 연령 계산
    const age = calculateAge(user.birth_date);
    
    // 연령 조건 확인
    const isOverMinAge = age >= minAge;
    
    // 간단한 VC 생성 (로컬 개발 환경용)
    const vc = issueSimpleVC(
      issuerDid,
      subjectDid,
      {
        name: user.name,
        birthDate: user.birth_date,
        age: age,
        isOverMinAge: isOverMinAge,
        minAgeRequirement: minAge
      },
      ['AgeVerificationCredential']
    );
    
    // 만료일 설정 (1년 후)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    
    // DB에 VC 저장
    const vcRecord = createVCRecord({
      issuer_did: issuerDid,
      subject_did: subjectDid,
      credential_type: 'AgeVerificationCredential',
      credential_data: JSON.stringify(vc),
      issuance_date: new Date().toISOString(),
      expiration_date: expirationDate.toISOString()
    });
    
    return NextResponse.json({
      success: true,
      vc: vc,
      vcId: vcRecord.id,
      isOverMinAge: isOverMinAge
    });
    
  } catch (error) {
    console.error('연령 인증 VC 발급 오류:', error);
    return NextResponse.json(
      { error: '연령 인증 VC 발급 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 