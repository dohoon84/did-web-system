import { NextRequest, NextResponse } from 'next/server';
import { createUser, getAllUsers } from '@/lib/db/userRepository';

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: 사용자 목록을 조회합니다.
 *     description: 모든 사용자 목록을 조회합니다.
 *     responses:
 *       200:
 *         description: 사용자 목록이 성공적으로 조회됨
 *       500:
 *         description: 서버 오류
 *   post:
 *     summary: 사용자를 생성합니다.
 *     description: 새로운 사용자를 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - birth_date
 *             properties:
 *               name:
 *                 type: string
 *                 description: 사용자 이름
 *               email:
 *                 type: string
 *                 description: 이메일 주소 (선택 사항)
 *               birth_date:
 *                 type: string
 *                 description: 생년월일 (YYYY-MM-DD 형식)
 *     responses:
 *       200:
 *         description: 사용자가 성공적으로 생성됨
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */

// 사용자 목록 조회
export async function GET() {
  try {
    const users = getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, birth_date } = body;
    
    // 필수 필드 검증
    if (!name || !birth_date) {
      return NextResponse.json(
        { error: '이름과 생년월일은 필수 항목입니다.' },
        { status: 400 }
      );
    }
    
    // 생년월일 형식 검증
    const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthDateRegex.test(birth_date)) {
      return NextResponse.json(
        { error: '생년월일은 YYYY-MM-DD 형식이어야 합니다.' },
        { status: 400 }
      );
    }
    
    // 사용자 생성
    const user = createUser({
      name,
      email,
      birth_date
    });
    
    return NextResponse.json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    return NextResponse.json(
      { error: '사용자 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 