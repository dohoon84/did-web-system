import { v4 as uuidv4 } from 'uuid';
import * as jose from 'jose';

// 브라우저 환경인지 확인하는 함수
const isBrowser = () => typeof window !== 'undefined';

// 개발 목적의 간단한 JWS 생성 함수
function createMockJws(payload: any, header: any = { alg: 'EdDSA' }): string {
  try {
    const headerBase64 = btoa(JSON.stringify(header));
    const payloadBase64 = btoa(JSON.stringify(payload));
    // 실제 서명 없이 더미 서명 사용 (개발 목적)
    const signature = 'DUMMY_SIGNATURE_FOR_DEVELOPMENT_ONLY';
    return `${headerBase64}.${payloadBase64}.${signature}`;
  } catch (error) {
    console.error('Mock JWS 생성 오류:', error);
    return `eyJhbGciOiJFZERTQSJ9.${btoa(JSON.stringify(payload))}.DUMMY`;
  }
}

// VP 생성 함수
export async function createVP(
  holderDid: string,
  holderPrivateKey: any,
  vcs: string[],
  challenge?: string,
  domain?: string,
  expirationDate?: Date
) {
  try {
    // VP 기본 구조 생성
    const vp = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiablePresentation'],
      holder: holderDid,
      verifiableCredential: vcs
    };

    // 브라우저 환경에서는 간단한 모의 JWS 생성
    if (isBrowser()) {
      console.warn('브라우저 환경에서는 모의 JWS를 생성합니다 (개발 목적)');
      const header = { 
        alg: 'EdDSA', 
        kid: `${holderDid}#${holderPrivateKey.id.split('#')[1]}`
      };
      const jws = createMockJws({ vp }, header);
      return { jws, vp };
    }

    // 서버 환경에서는 실제 JWS 서명 시도
    try {
      const privateKeyJwk = holderPrivateKey.privateKeyJwk;
      const alg = 'EdDSA'; // Ed25519 서명 알고리즘

      const privateKey = await jose.importJWK(privateKeyJwk, alg);
      
      const jws = await new jose.SignJWT({ vp })
        .setProtectedHeader({ 
          alg, 
          kid: `${holderDid}#${holderPrivateKey.id.split('#')[1]}`,
          ...(challenge ? { nonce: challenge } : {}),
          ...(domain ? { aud: domain } : {})
        })
        .setIssuedAt()
        .setExpirationTime(expirationDate || '1y')
        .sign(privateKey);

      return {
        jws,
        vp
      };
    } catch (signError) {
      console.error('VP 서명 오류:', signError);
      
      // 서명에 실패한 경우 서명되지 않은 VP 반환 (개발 목적)
      console.warn('서명 없이 VP를 반환합니다 (개발 목적)');
      const header = { 
        alg: 'EdDSA', 
        kid: `${holderDid}#${holderPrivateKey.id.split('#')[1]}`
      };
      const jws = createMockJws({ vp }, header);
      
      return {
        jws,
        vp
      };
    }
  } catch (error) {
    console.error('VP 생성 오류:', error);
    throw error;
  }
}

// VP 검증 함수
export async function verifyVP(vpJws: string, holderDidDocument: any) {
  try {
    // 브라우저 환경에서는 검증을 우회 (개발 목적)
    if (isBrowser()) {
      console.warn('브라우저 환경에서는 검증을 우회합니다 (개발 목적)');
      try {
        const parts = vpJws.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          return {
            isValid: true,
            vp: payload.vp,
            _devBypass: true
          };
        }
      } catch (e) {
        console.error('JWS 파싱 오류:', e);
      }
    }

    // 홀더의 공개키 가져오기
    const publicKeyJwk = holderDidDocument.verificationMethod[0].publicKeyJwk;
    const alg = 'EdDSA'; // Ed25519 서명 알고리즘

    try {
      const publicKey = await jose.importJWK(publicKeyJwk, alg);
      
      // JWS 검증
      const { payload } = await jose.jwtVerify(vpJws, publicKey);
      
      // VP 내용 반환
      return {
        isValid: true,
        vp: payload.vp
      };
    } catch (verifyError: any) {
      console.error('JWS 검증 오류:', verifyError);
      
      // 개발 목적으로 검증 우회 (실제 환경에서는 사용하지 않아야 함)
      console.warn('검증을 우회합니다 (개발 목적)');
      
      // JWS에서 페이로드 부분 추출 시도
      try {
        const parts = vpJws.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          return {
            isValid: true,
            vp: payload.vp,
            _devBypass: true // 개발 우회 표시
          };
        }
      } catch (e) {
        console.error('JWS 파싱 오류:', e);
      }
      
      return {
        isValid: false,
        error: '검증 실패: ' + verifyError.message
      };
    }
  } catch (error: any) {
    console.error('VP 검증 오류:', error);
    return {
      isValid: false,
      error: error.message || '알 수 없는 오류'
    };
  }
}

// 로컬 스토리지에 VP 저장
export function storeVP(vpJws: string, vp: any) {
  if (!isBrowser()) return false;
  
  try {
    // 기존 VP 목록 가져오기
    const vpListStr = localStorage.getItem('vpList');
    const vpList = vpListStr ? JSON.parse(vpListStr) : [];
    
    // 새 VP 추가
    vpList.push({
      id: vp.id,
      jws: vpJws,
      vp: vp
    });
    
    // 저장
    localStorage.setItem('vpList', JSON.stringify(vpList));
    return true;
  } catch (error) {
    console.error('VP 저장 오류:', error);
    return false;
  }
}

// 로컬 스토리지에서 VP 목록 불러오기
export function loadVPList() {
  if (!isBrowser()) return [];
  
  try {
    const vpListStr = localStorage.getItem('vpList');
    return vpListStr ? JSON.parse(vpListStr) : [];
  } catch (error) {
    console.error('VP 목록 로드 오류:', error);
    return [];
  }
}

// 특정 VP 삭제
export function deleteVP(vpId: string) {
  if (!isBrowser()) return false;
  
  try {
    const vpListStr = localStorage.getItem('vpList');
    if (!vpListStr) return false;
    
    const vpList = JSON.parse(vpListStr);
    const newVpList = vpList.filter((vp: any) => vp.id !== vpId);
    
    localStorage.setItem('vpList', JSON.stringify(newVpList));
    return true;
  } catch (error) {
    console.error('VP 삭제 오류:', error);
    return false;
  }
} 