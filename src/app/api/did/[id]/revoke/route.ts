import { NextRequest, NextResponse } from 'next/server';
import { revokeDID, getDIDById } from '@/lib/db/didRepository';
import { log } from '@/lib/logger';

/**
 * @swagger
 * /api/did/{id}/revoke:
 *   put:
 *     summary: DID를 폐기합니다.
 *     description: 특정 DID를 폐기 상태로 변경합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 폐기할 DID의 ID
 *     responses:
 *       200:
 *         description: DID가 성공적으로 폐기됨
 *       404:
 *         description: DID를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const didId = params.id;
    
    // DID 존재 여부 확인
    const did = getDIDById(didId);
    if (!did) {
      return NextResponse.json(
        { error: 'DID를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 이미 폐기된 DID인지 확인
    if (did.status === 'revoked') {
      return NextResponse.json(
        { error: '이미 폐기된 DID입니다.' },
        { status: 400 }
      );
    }
    
    // DID 폐기
    const revokedDid = revokeDID(didId);
    
    if (!revokedDid) {
      return NextResponse.json(
        { error: 'DID 폐기에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    log.info(`DID가 폐기되었습니다: ${didId}`);
    
    return NextResponse.json({
      success: true,
      message: 'DID가 성공적으로 폐기되었습니다.',
      did: revokedDid
    });
  } catch (error) {
    log.error('DID 폐기 오류:', error);
    return NextResponse.json(
      { error: 'DID를 폐기하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 