import { NextRequest, NextResponse } from 'next/server';
import { getUserById, deleteUser } from '@/lib/db/userRepository';

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: 사용자 조회
 *     description: 특정 ID의 사용자를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자 정보
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 *   delete:
 *     summary: 사용자 삭제
 *     description: 특정 ID의 사용자를 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 사용자의 ID
 *     responses:
 *       200:
 *         description: 사용자가 성공적으로 삭제됨
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
 *                   example: 사용자가 성공적으로 삭제되었습니다.
 *       404:
 *         description: 사용자를 찾을 수 없음
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
    
    // 사용자 조회
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('사용자 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, message: '사용자 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const id = params.id;
    
    // 사용자가 존재하는지 확인
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 사용자 삭제
    const result = await deleteUser(id);
    if (!result) {
      return NextResponse.json(
        { success: false, message: '사용자 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '사용자가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('사용자 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, message: '사용자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 