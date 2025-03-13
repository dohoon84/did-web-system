import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/vp/{id}:
 *   get:
 *     summary: VP 조회
 *     tags: [VP]
 *     description: 특정 VP를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 조회할 VP 식별자
 *     responses:
 *       200:
 *         description: 성공적으로 VP를 조회함
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VP'
 *       404:
 *         description: VP를 찾을 수 없음
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
 *   delete:
 *     summary: VP 삭제
 *     tags: [VP]
 *     description: 특정 VP를 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 VP 식별자
 *     responses:
 *       200:
 *         description: 성공적으로 VP를 삭제함
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: VP를 찾을 수 없음
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

// VP 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // 서버 측에서는 데이터베이스에서 VP를 조회해야 하지만,
    // 현재는 클라이언트 측 로컬 스토리지에 저장하므로 404 반환
    return NextResponse.json({ message: 'VP를 찾을 수 없습니다.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
}

// VP 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // 서버 측에서는 데이터베이스에서 VP를 삭제해야 하지만,
    // 현재는 클라이언트 측 로컬 스토리지에 저장하므로 성공 응답만 반환
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
} 