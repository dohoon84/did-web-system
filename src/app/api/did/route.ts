import { NextRequest, NextResponse } from 'next/server';
import { DIDService } from '@/lib/did/didService';

/**
 * @swagger
 * /api/did:
 *   get:
 *     summary: DID Document 조회 또는 DID 목록 조회
 *     tags: [DID]
 *     description: DID Document를 조회하거나 DID 목록을 조회합니다.
 *     parameters:
 *       - in: query
 *         name: did
 *         schema:
 *           type: string
 *         required: false
 *         description: 조회할 DID (없으면 목록 조회)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: 목록 조회 시 반환할 최대 항목 수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         required: false
 *         description: 목록 조회 시 건너뛸 항목 수
 *       - in: query
 *         name: transactions
 *         schema:
 *           type: boolean
 *         required: false
 *         description: DID의 트랜잭션 정보도 함께 조회할지 여부
 *     responses:
 *       200:
 *         description: 성공적으로 DID Document 또는 목록을 조회함
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: DID를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 *   post:
 *     summary: DID 생성
 *     tags: [DID]
 *     description: 새로운 DID와 DID Document를 생성하고 블록체인에 기록합니다.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID (사용자와 DID를 연결하는 경우)
 *     responses:
 *       201:
 *         description: DID가 성공적으로 생성됨
 *       500:
 *         description: 서버 오류
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const did = searchParams.get('did');
    const transactions = searchParams.get('transactions');
    const didService = new DIDService();

    if (did) {
      if (transactions === 'true') {
        // 특정 DID의 트랜잭션 목록 조회
        const transactionList = await didService.getTransactionsByDID(did);
        return NextResponse.json({ success: true, transactions: transactionList });
      } else {
        // 특정 DID 문서 조회
        const result = await didService.getDIDDocument(did);
        if (!result) {
          return NextResponse.json({ success: false, message: 'DID not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, ...result });
      }
    } else {
      // 모든 DID 목록 조회
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
      const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
      const dids = await didService.getAllDIDs(limit, offset);
      return NextResponse.json({ success: true, dids });
    }
  } catch (error) {
    console.error('Error in DID API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 요청 데이터 파싱
    const requestData = await request.json().catch(() => ({}));
    const userId = requestData.userId;
    
    const didService = new DIDService();
    
    // userId가 제공된 경우 사용자와 연결된 DID 생성
    const result = userId 
      ? await didService.createDIDForUser(userId)
      : await didService.createDID();
      
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error creating DID:', error);
    
    // 블록체인 에러인 경우 DID 정보 포함
    if (error.did && error.document) {
      return NextResponse.json({
        success: false,
        message: error.message || 'Error creating DID on blockchain',
        did: error.did,
        document: error.document,
        error: true
      }, { status: 500 });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
} 