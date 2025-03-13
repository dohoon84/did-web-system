import { resolveDid } from '@/lib/did/didUtils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { did: string } }
) {
  try {
    const did = params.did;
    const didDocument = await resolveDid(did);
    
    if (!didDocument) {
      return NextResponse.json({ message: 'DID를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ did, didDocument });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { did: string } }
) {
  try {
    const did = params.did;
    
    // 실제 구현에서는 데이터베이스에서 DID를 삭제해야 함
    // 현재는 클라이언트 측 로컬 스토리지에 저장하므로 성공 응답만 반환
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || '알 수 없는 오류' }, { status: 500 });
  }
} 