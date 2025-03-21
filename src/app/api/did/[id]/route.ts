import { NextRequest, NextResponse } from 'next/server';
import { deleteDID, getDIDById } from '@/lib/db/didRepository';
import { DIDService } from '@/lib/did/didService';
import { resolveDid } from '@/lib/did/didUtils';
import { log } from '@/lib/logger';


/**
 * @swagger
 * /api/did/{id}:
 *   get:
 *     summary: DID 조회
 *     description: 특정 ID의 DID를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 조회할 DID의 ID 또는 DID 문자열
 *     responses:
 *       200:
 *         description: DID 조회 성공
 *       404:
 *         description: DID를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 *   delete:
 *     summary: DID 삭제
 *     description: 특정 ID의 DID를 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 DID의 ID
 *     responses:
 *       200:
 *         description: DID가 성공적으로 삭제됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: DID가 성공적으로 삭제되었습니다.
 *       404:
 *         description: DID를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const id = params.id;
    
    // ID가 UUID 형식인지 확인
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidPattern.test(id)) {
      // ID로 DID 조회
      const did = await getDIDById(id);
      if (!did) {
        return NextResponse.json({ message: 'DID를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json(did);
    } else {
      // DID 문자열로 DID 문서 조회
      const didDocument = await resolveDid(id);
      if (!didDocument) {
        return NextResponse.json({ message: 'DID를 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ did: id, didDocument });
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const id = params.id;
    
    // DID가 존재하는지 확인
    const did = await getDIDById(id);
    if (!did) {
      return NextResponse.json(
        { success: false, message: 'DID를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // DID 삭제
    await deleteDID(id);
    
    return NextResponse.json({
      success: true,
      message: 'DID가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('DID 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, message: 'DID 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/did/[id]/revoke
 * DID 폐기 API
 * 
 * @swagger
 * /api/did/{did}/revoke:
 *   post:
 *     summary: DID를 폐기합니다.
 *     description: 지정된 DID를 폐기하고, 관련된 모든 VC도 함께 폐기합니다.
 *     parameters:
 *       - in: path
 *         name: did
 *         required: true
 *         schema:
 *           type: string
 *         description: 폐기할 DID
 *     responses:
 *       200:
 *         description: 성공적으로 폐기됨
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *       404:
 *         description: DID를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    log.info(`DID ${id} 폐기 요청`);
    
    const didService = new DIDService();
    const result = await didService.revokeDID(id);
    
    return NextResponse.json(result);
  } catch (error) {
    log.error('DID 폐기 오류:', error);
    
    if (error instanceof Error && error.message.includes('찾을 수 없습니다')) {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 404 });
    }
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : '내부 서버 오류';
      
    log.error(`DID ${id} 폐기 실패: ${errorMessage}`);
    
    return NextResponse.json({
      success: false,
      message: `DID 폐기 중 오류가 발생했습니다: ${errorMessage}`,
      did: id
    }, { status: 500 });
  }
} 