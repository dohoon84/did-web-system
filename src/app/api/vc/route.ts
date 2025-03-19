import { NextRequest, NextResponse } from 'next/server';
import { VCService, VCCreateParams } from '@/lib/vc/vcService';
import { VerifiableCredential } from '@/lib/db/vcRepository';
import { log } from '@/lib/logger';

// VC 서비스 인스턴스 생성
const vcService = new VCService();

/**
 * @swagger
 * /api/vc:
 *   get:
 *     summary: VC 목록 조회
 *     tags: [VC]
 *     description: 저장된 VC 목록을 조회합니다.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 반환할 최대 VC 수
 *     responses:
 *       200:
 *         description: 성공적으로 VC 목록을 조회함
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VC'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 새 VC 발급
 *     tags: [VC]
 *     description: 새로운 VC를 발급합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issuerDid
 *               - issuerPrivateKey
 *               - subjectDid
 *               - claims
 *             properties:
 *               issuerDid:
 *                 type: string
 *                 description: 발급자 DID
 *               issuerPrivateKey:
 *                 type: object
 *                 description: 발급자 개인키
 *               subjectDid:
 *                 type: string
 *                 description: 대상자 DID
 *               claims:
 *                 type: object
 *                 description: VC에 포함될 클레임 정보
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *                 description: 만료일 (선택사항)
 *     responses:
 *       201:
 *         description: 성공적으로 VC를 발급함
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VC'
 *       400:
 *         description: 잘못된 요청
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

/**
 * GET /api/vc
 * VC 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const issuerDid = searchParams.get('issuer');
    const subjectDid = searchParams.get('subject');
    const vcId = searchParams.get('id');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const includeTransactions = searchParams.get('transactions') === 'true';
    
    let vcs: VerifiableCredential[] = [];
    
    if (vcId) {
      // 특정 VC 조회
      const vc = vcService.getVCById(vcId);
      if (vc) {
        vcs = [vc];
      }
    } else if (issuerDid) {
      // 발급자별 VC 조회
      vcs = vcService.getVCsByIssuer(issuerDid);
    } else if (subjectDid) {
      // 대상자별 VC 조회
      vcs = vcService.getVCsBySubject(subjectDid);
    } else {
      // 모든 VC 조회
      vcs = vcService.getAllVCs(limit, offset);
    }
    
    // 트랜잭션 정보 포함
    if (includeTransactions && vcs.length > 0) {
      const vcsWithTx = vcs.map(vc => {
        const transactions = vcService.getVCBlockchainTransactions(vc.id);
        return {
          ...vc,
          transactions
        };
      });
      
      return NextResponse.json({ 
        success: true,
        vcs: vcsWithTx
      });
    }
    
    return NextResponse.json({ 
      success: true,
      vcs
    });
  } catch (error) {
    log.error('VC 조회 오류:', error);
    return NextResponse.json({ 
      success: false,
      message: error instanceof Error ? error.message : '내부 서버 오류',
      vcs: []
    }, { status: 500 });
  }
}

/**
 * POST /api/vc
 * VC 생성
 */
export async function POST(req: NextRequest) {
  try {
    const { issuerDid, subjectDid, credentialType, claims, expirationDate } = await req.json();
    
    // 필수 필드 검증
    if (!issuerDid || !subjectDid || !credentialType || !claims) {
      return NextResponse.json({
        success: false,
        message: '필수 필드가 누락되었습니다: issuerDid, subjectDid, credentialType, claims'
      }, { status: 400 });
    }
    
    // VC 생성 파라미터
    const vcParams: VCCreateParams = {
      issuerDid,
      subjectDid,
      credentialType,
      claims,
      expirationDate
    };
    
    // VC 생성
    const vc = await vcService.createVC(vcParams);
    
    return NextResponse.json({
      success: true,
      vc
    });
  } catch (error) {
    log.error('VC 생성 오류:', error);
    
    // 블록체인 관련 오류인 경우
    if (error instanceof Error && 'vc' in error) {
      return NextResponse.json({
        success: false,
        message: error.message,
        vc: (error as any).vc
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: false,
      message: error instanceof Error ? error.message : '내부 서버 오류'
    }, { status: 500 });
  }
}

/**
 * PUT /api/vc/:id/revoke
 * VC 폐기
 */
export async function PUT(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'VC ID가 필요합니다.'
      }, { status: 400 });
    }
    
    // VC 폐기
    const vc = await vcService.revokeVC(id);
    
    if (!vc) {
      return NextResponse.json({
        success: false,
        message: `ID가 ${id}인 VC를 찾을 수 없습니다.`
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      vc
    });
  } catch (error) {
    log.error('VC 폐기 오류:', error);
    
    // 블록체인 관련 오류인 경우
    if (error instanceof Error && 'vc' in error) {
      return NextResponse.json({
        success: false,
        message: error.message,
        vc: (error as any).vc
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: false,
      message: error instanceof Error ? error.message : '내부 서버 오류'
    }, { status: 500 });
  }
} 