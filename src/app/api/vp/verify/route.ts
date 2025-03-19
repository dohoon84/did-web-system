import { NextRequest, NextResponse } from 'next/server';
import { getDIDByDIDString } from '@/lib/db/didRepository';
import { getVPById, getVPByStandardId, updateVPStatus } from '@/lib/db/vpRepository';
import { verifyVP } from '@/lib/vp/vpUtils';
import { log } from '@/lib/logger';

/**
 * @swagger
 * /api/vp/verify:
 *   post:
 *     summary: VP를 검증합니다.
 *     description: VP의 서명과 내용을 검증합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vpData
 *             properties:
 *               vpId:
 *                 type: string
 *                 description: 검증할 VP ID (DB 내부 ID)
 *               vpStandardId:
 *                 type: string
 *                 description: 검증할 VP의 표준 ID
 *               vpData:
 *                 type: object
 *                 description: 검증할 VP 데이터 (JSON 객체)
 *     responses:
 *       200:
 *         description: VP 검증 결과
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: VP를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vpId, vpStandardId, vpData } = body;
    
    let vp;
    let vpRecord;
    
    // VP 데이터 확인 (직접 제공된 데이터 또는 DB에서 조회)
    if (vpData) {
      // 직접 제공된 VP 데이터 사용
      vp = typeof vpData === 'string' ? JSON.parse(vpData) : vpData;
    } else if (vpId) {
      // DB에서 VP ID로 조회
      vpRecord = getVPById(vpId);
      if (!vpRecord) {
        return NextResponse.json(
          { success: false, error: 'VP를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      vp = JSON.parse(vpRecord.vp_data);
    } else if (vpStandardId) {
      // DB에서 표준 ID로 조회
      vpRecord = getVPByStandardId(vpStandardId);
      if (!vpRecord) {
        return NextResponse.json(
          { success: false, error: 'VP를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      vp = JSON.parse(vpRecord.vp_data);
    } else {
      return NextResponse.json(
        { success: false, error: 'VP 데이터 또는 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 소유자 DID 추출
    const holderDid = vp.holder;
    if (!holderDid) {
      return NextResponse.json(
        { success: false, error: 'VP에 소유자(holder) 정보가 없습니다.' },
        { status: 400 }
      );
    }
    
    // 소유자 DID 레코드 조회
    const holderDidRecord = getDIDByDIDString(holderDid);
    if (!holderDidRecord) {
      return NextResponse.json(
        { success: false, error: '소유자 DID를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // DID Document에서 공개키 추출
    const didDocument = JSON.parse(holderDidRecord.did_document);
    
    // verificationMethod에서 publicKeyHex 찾기
    let publicKeyHex;
    
    if (didDocument.verificationMethod && Array.isArray(didDocument.verificationMethod)) {
      for (const method of didDocument.verificationMethod) {
        if (method.id === `${holderDid}#keys-1` && method.publicKeyHex) {
          publicKeyHex = method.publicKeyHex;
          break;
        }
      }
    }
    
    if (!publicKeyHex) {
      return NextResponse.json(
        { success: false, error: 'DID Document에서 공개키를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // VP 검증
    const verificationResult = await verifyVP(vp, publicKeyHex);
    
    // DB에 VP 상태 업데이트 (DB에 있는 VP인 경우)
    if (vpRecord && verificationResult.valid) {
      updateVPStatus(vpRecord.id, 'verified');
    } else if (vpRecord && !verificationResult.valid) {
      updateVPStatus(vpRecord.id, 'invalid');
    }
    
    // 검증 결과 반환
    return NextResponse.json({
      success: true,
      valid: verificationResult.valid,
      reason: verificationResult.reason,
      vpId: vpRecord?.id,
      holder: holderDid
    });
    
  } catch (error) {
    log.error('VP 검증 오류:', error);
    return NextResponse.json(
      { success: false, error: 'VP 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 