import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllIssuers, 
  getIssuerById, 
  createIssuer, 
  updateIssuer, 
  deleteIssuer,
  IssuerInput
} from '@/lib/db/issuerRepository';
import { getDIDByDIDString } from '@/lib/db/didRepository';

/**
 * @swagger
 * /api/issuer:
 *   get:
 *     summary: 모든 발급자 목록을 가져옵니다.
 *     description: 시스템에 등록된 모든 발급자 목록을 반환합니다.
 *     responses:
 *       200:
 *         description: 발급자 목록
 *       500:
 *         description: 서버 오류
 */
export async function GET(request: NextRequest) {
  try {
    const issuers = getAllIssuers();
    return NextResponse.json(issuers);
  } catch (error) {
    console.error('발급자 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '발급자 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/issuer:
 *   post:
 *     summary: 새 발급자를 등록합니다.
 *     description: 새로운 발급자를 시스템에 등록합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - did
 *             properties:
 *               name:
 *                 type: string
 *                 description: 발급자 이름
 *               did:
 *                 type: string
 *                 description: 발급자 DID
 *               organization:
 *                 type: string
 *                 description: 발급자 소속 기관
 *               description:
 *                 type: string
 *                 description: 발급자 설명
 *     responses:
 *       201:
 *         description: 발급자가 성공적으로 생성됨
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: DID를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, did, organization, description } = body;
    
    // 필수 필드 검증
    if (!name || !did) {
      return NextResponse.json(
        { error: '이름과 DID는 필수 필드입니다.' },
        { status: 400 }
      );
    }
    
    // DID 존재 여부 확인
    const didRecord = getDIDByDIDString(did);
    if (!didRecord) {
      return NextResponse.json(
        { error: '유효한 DID가 아닙니다. 먼저 DID를 등록해주세요.' },
        { status: 404 }
      );
    }
    
    // 이미 등록된 발급자인지 확인
    const existingIssuer = getAllIssuers().find(issuer => issuer.did === did);
    if (existingIssuer) {
      return NextResponse.json(
        { error: '이미 등록된 발급자 DID입니다.' },
        { status: 400 }
      );
    }
    
    const issuerData: IssuerInput = {
      name,
      did,
      organization,
      description
    };
    
    const newIssuer = createIssuer(issuerData);
    
    return NextResponse.json(
      { success: true, issuer: newIssuer },
      { status: 201 }
    );
  } catch (error) {
    console.error('발급자 생성 오류:', error);
    return NextResponse.json(
      { error: '발급자를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/issuer/{id}:
 *   get:
 *     summary: 특정 발급자 정보를 가져옵니다.
 *     description: ID로 특정 발급자의 정보를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 발급자 ID
 *     responses:
 *       200:
 *         description: 발급자 정보
 *       404:
 *         description: 발급자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function getIssuerByIdHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const issuer = getIssuerById(params.id);
    
    if (!issuer) {
      return NextResponse.json(
        { error: '발급자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(issuer);
  } catch (error) {
    console.error(`발급자 조회 오류 (ID: ${params.id}):`, error);
    return NextResponse.json(
      { error: '발급자 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/issuer/{id}:
 *   put:
 *     summary: 발급자 정보를 업데이트합니다.
 *     description: 특정 발급자의 정보를 업데이트합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 발급자 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 발급자 이름
 *               did:
 *                 type: string
 *                 description: 발급자 DID
 *               organization:
 *                 type: string
 *                 description: 발급자 소속 기관
 *               description:
 *                 type: string
 *                 description: 발급자 설명
 *     responses:
 *       200:
 *         description: 발급자 정보가 성공적으로 업데이트됨
 *       404:
 *         description: 발급자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function updateIssuerHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, did, organization, description } = body;
    
    // DID가 변경된 경우 존재 여부 확인
    if (did) {
      const didRecord = getDIDByDIDString(did);
      if (!didRecord) {
        return NextResponse.json(
          { error: '유효한 DID가 아닙니다. 먼저 DID를 등록해주세요.' },
          { status: 404 }
        );
      }
    }
    
    const updatedIssuer = updateIssuer(params.id, { name, did, organization, description });
    
    if (!updatedIssuer) {
      return NextResponse.json(
        { error: '발급자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      issuer: updatedIssuer
    });
  } catch (error) {
    console.error(`발급자 업데이트 오류 (ID: ${params.id}):`, error);
    return NextResponse.json(
      { error: '발급자 정보를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/issuer/{id}:
 *   delete:
 *     summary: 발급자를 삭제합니다.
 *     description: 특정 발급자를 시스템에서 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 발급자 ID
 *     responses:
 *       200:
 *         description: 발급자가 성공적으로 삭제됨
 *       404:
 *         description: 발급자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export async function deleteIssuerHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = deleteIssuer(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: '발급자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '발급자가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error(`발급자 삭제 오류 (ID: ${params.id}):`, error);
    return NextResponse.json(
      { error: '발급자를 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 