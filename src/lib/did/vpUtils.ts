import { v4 as uuidv4 } from 'uuid';
import { verifyVC } from './vcUtils';

// 브라우저 환경인지 확인하는 함수
const isBrowser = () => typeof window !== 'undefined';

// VP 생성 함수 - 로컬 개발 환경에서는 모의 서명 사용
export async function createVP(
  holderDid: string,
  holderPrivateKey: any,
  vcs: any[],
  challenge?: string,
  domain?: string
) {
  try {
    // VP 기본 구조 생성
    const vp = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiablePresentation'],
      holder: holderDid,
      verifiableCredential: vcs,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${holderDid}#keys-1`,
        proofPurpose: 'authentication',
        challenge: challenge || uuidv4(),
        domain: domain || 'example.com',
        jws: 'eyJhbGciOiJFZERTQSJ9.DUMMY_SIGNATURE_FOR_DEVELOPMENT.DUMMY'
      }
    };

    console.warn('로컬 개발 환경에서는 모의 서명을 사용합니다.');
    return vp;
  } catch (error) {
    console.error('VP 생성 오류:', error);
    throw error;
  }
}

// VP 검증 함수 - 로컬 개발 환경에서는 단순화된 검증
export async function verifyVP(vp: any): Promise<{ verified: boolean; error?: string }> {
  try {
    // VP 형식 검증
    if (!vp || !vp.holder || !vp.verifiableCredential || !Array.isArray(vp.verifiableCredential)) {
      return { verified: false, error: 'VP 형식이 올바르지 않습니다.' };
    }

    // 로컬 개발 환경에서는 단순화된 검증
    console.warn('로컬 개발 환경에서는 VP 서명 검증을 건너뜁니다.');
    
    // 포함된 VC 검증
    const vcResults = await Promise.all(vp.verifiableCredential.map((vc: any) => verifyVC(vc)));
    const allVCsValid = vcResults.every(result => result.verified);
    
    if (!allVCsValid) {
      return { verified: false, error: '하나 이상의 VC가 유효하지 않습니다.' };
    }
    
    return { verified: true };
  } catch (error) {
    console.error('VP 검증 오류:', error);
    return { verified: false, error: (error as Error).message };
  }
}

// 간단한 VP 생성 함수 (개발 목적)
export function createSimpleVP(holderDid: string, vcs: any[], challenge?: string, domain?: string) {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1'
    ],
    id: `urn:uuid:${uuidv4()}`,
    type: ['VerifiablePresentation'],
    holder: holderDid,
    verifiableCredential: vcs,
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${holderDid}#keys-1`,
      proofPurpose: 'authentication',
      challenge: challenge || uuidv4(),
      domain: domain || 'example.com',
      jws: 'eyJhbGciOiJFZERTQSJ9.DUMMY_SIGNATURE_FOR_DEVELOPMENT.DUMMY'
    }
  };
}

// // 로컬 스토리지에 VP 저장
// export function storeVP(vpJws: string, vp: any) {
//   if (!isBrowser()) return false;
  
//   try {
//     // 기존 VP 목록 가져오기
//     const vpListStr = localStorage.getItem('vpList');
//     const vpList = vpListStr ? JSON.parse(vpListStr) : [];
    
//     // 새 VP 추가
//     vpList.push({
//       id: vp.id,
//       jws: vpJws,
//       vp: vp
//     });
    
//     // 저장
//     localStorage.setItem('vpList', JSON.stringify(vpList));
//     return true;
//   } catch (error) {
//     console.error('VP 저장 오류:', error);
//     return false;
//   }
// }

// // 로컬 스토리지에서 VP 목록 불러오기
// export function loadVPList() {
//   if (!isBrowser()) return [];
  
//   try {
//     const vpListStr = localStorage.getItem('vpList');
//     return vpListStr ? JSON.parse(vpListStr) : [];
//   } catch (error) {
//     console.error('VP 목록 로드 오류:', error);
//     return [];
//   }
// }

// // 특정 VP 삭제
// export function deleteVP(vpId: string) {
//   if (!isBrowser()) return false;
  
//   try {
//     const vpListStr = localStorage.getItem('vpList');
//     if (!vpListStr) return false;
    
//     const vpList = JSON.parse(vpListStr);
//     const newVpList = vpList.filter((vp: any) => vp.id !== vpId);
    
//     localStorage.setItem('vpList', JSON.stringify(newVpList));
//     return true;
//   } catch (error) {
//     console.error('VP 삭제 오류:', error);
//     return false;
//   }
// } 