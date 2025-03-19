import { NextRequest, NextResponse } from 'next/server';
import { getVPById, deleteVP } from '@/lib/db/vpRepository';
import { log } from '@/lib/logger';

/**
 * @swagger
 * /api/vp/{id}:
 *   get:
 *     summary: VP 정보를 조회합니다.
 *     description: 지정된 ID의 VP 정보를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: VP ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: VP 정보
 *       404:
 *         description: VP를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vpId = params.id;
    
    // VP 조회
    const vpRecord = getVPById(vpId);
    if (!vpRecord) {
      return NextResponse.json(
        { success: false, error: 'VP를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // VP 데이터 파싱
    let vpData;
    try {
      vpData = JSON.parse(vpRecord.vp_data);
    } catch (parseError) {
      log.error(`VP ID ${vpId} 데이터 파싱 오류:`, parseError);
      return NextResponse.json(
        { success: false, error: 'VP 데이터 파싱 오류' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      id: vpRecord.id,
      vp_id: vpRecord.vp_id,
      holder_did: vpRecord.holder_did,
      status: vpRecord.status,
      created_at: vpRecord.created_at,
      updated_at: vpRecord.updated_at,
      vp: vpData
    });
    
  } catch (error) {
    log.error('VP 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: 'VP 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/vp/{id}:
 *   delete:
 *     summary: VP를 삭제합니다.
 *     description: 지정된 ID의 VP를 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: VP ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: VP 삭제 성공
 *       404:
 *         description: VP를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vpId = params.id;
    
    // VP 존재 확인
    const vpRecord = getVPById(vpId);
    if (!vpRecord) {
      return NextResponse.json(
        { success: false, error: 'VP를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // VP 삭제
    const deleted = deleteVP(vpId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'VP 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'VP가 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    log.error('VP 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: 'VP 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 