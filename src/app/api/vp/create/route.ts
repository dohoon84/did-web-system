import { NextRequest, NextResponse } from 'next/server';
import { getDIDByDIDString } from '@/lib/db/didRepository';
import { getVCById } from '@/lib/db/vcRepository';
import { createVP } from '@/lib/db/vpRepository';
import { createVerifiablePresentation } from '@/lib/vp/vpUtils';
import { ethers } from 'ethers';
import { log } from '@/lib/logger';

/**
 * @swagger
 * /api/vp/create:
 *   post:
 *     summary: VP를 생성합니다.
 *     description: 선택한 VC를 포함하는 VP를 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - holderDid
 *               - vcIds
 *               - privateKey
 *             properties:
 *               holderDid:
 *                 type: string
 *                 description: 소유자 DID
 *               vcIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 포함할 VC ID 배열
 *               privateKey:
 *                 type: string
 *                 description: 소유자의 개인키 (서명용)
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: VP 타입 배열
 *     responses:
 *       200:
 *         description: VP가 성공적으로 생성됨
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: DID 또는 VC를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { holderDid, vcIds, privateKey, types = [] } = body;
    
    // 필수 필드 검증
    if (!holderDid || !vcIds || !vcIds.length || !privateKey) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // DID 존재 확인
    const holderDidRecord = getDIDByDIDString(holderDid);
    if (!holderDidRecord) {
      return NextResponse.json(
        { success: false, error: '소유자 DID를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 개인키 유효성 검증 시도
    try {
      new ethers.Wallet(privateKey);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 개인키입니다.' },
        { status: 400 }
      );
    }
    
    // 지정된 VC들 조회
    const vcs = [];
    for (const vcId of vcIds) {
      const vcRecord = getVCById(vcId);
      if (!vcRecord) {
        return NextResponse.json(
          { success: false, error: `VC ID ${vcId}를 찾을 수 없습니다.` },
          { status: 404 }
        );
      }
      
      // VC 상태 확인
      if (vcRecord.status !== 'active') {
        return NextResponse.json(
          { success: false, error: `VC ID ${vcId}가 활성 상태가 아닙니다. 현재 상태: ${vcRecord.status}` },
          { status: 400 }
        );
      }
      
      // VC 소유자 확인
      if (vcRecord.subject_did !== holderDid) {
        return NextResponse.json(
          { success: false, error: `VC ID ${vcId}의 소유자가 아닙니다.` },
          { status: 400 }
        );
      }
      
      try {
        // VC 데이터 파싱
        const vcData = JSON.parse(vcRecord.credential_data);
        vcs.push(vcData);
      } catch (parseError) {
        log.error(`VC ID ${vcId} 데이터 파싱 오류:`, parseError);
        return NextResponse.json(
          { success: false, error: `VC ID ${vcId} 데이터 파싱 오류` },
          { status: 500 }
        );
      }
    }
    
    // VP 생성
    const vp = await createVerifiablePresentation(
      holderDid,
      vcs,
      privateKey,
      types
    );
    
    // DB에 VP 저장
    const vpRecord = createVP({
      holder_did: holderDid,
      vp_data: JSON.stringify(vp)
    });
    
    return NextResponse.json({
      success: true,
      vp: vp,
      vpId: vpRecord.id
    });
    
  } catch (error) {
    log.error('VP 생성 오류:', error);
    return NextResponse.json(
      { success: false, error: 'VP 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 