import { NextRequest, NextResponse } from 'next/server';
import { getDIDsByUserId } from '@/lib/db/didRepository';
import { getUserById } from '@/lib/db/userRepository';

/**
 * @swagger
 * /api/user/{id}/dids:
 *   get:
 *     summary: 사용자의 DID 목록 조회
 *     description: 특정 사용자의 DID 목록을 조회합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 사용자의 DID 목록
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
    const userId = params.id;
    
    // 사용자가 존재하는지 확인
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 사용자의 DID 목록 조회
    const dids = await getDIDsByUserId(userId);
    
    return NextResponse.json(dids);
  } catch (error) {
    console.error('사용자 DID 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, message: '사용자 DID 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 