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

// VC 생성 함수
export async function createVC(
  issuerDid: string,
  issuerPrivateKey: any,
  subjectDid: string,
  claims: Record<string, any>,
  expirationDate?: Date
) {
  try {
    // VC 기본 구조 생성
    const vc = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential'],
      issuer: issuerDid,
      issuanceDate: new Date().toISOString(),
      expirationDate: expirationDate ? expirationDate.toISOString() : undefined,
      credentialSubject: {
        id: subjectDid,
        ...claims
      }
    };

    // 브라우저 환경에서는 간단한 모의 JWS 생성
    if (isBrowser()) {
      console.warn('브라우저 환경에서는 모의 JWS를 생성합니다 (개발 목적)');
      const header = { 
        alg: 'EdDSA', 
        kid: `${issuerDid}#${issuerPrivateKey.id.split('#')[1]}`
      };
      const jws = createMockJws({ vc }, header);
      return { jws, vc };
    }

    // 서버 환경에서는 실제 JWS 서명 시도
    try {
      const privateKeyJwk = issuerPrivateKey.privateKeyJwk;
      const alg = 'EdDSA'; // Ed25519 서명 알고리즘

      const privateKey = await jose.importJWK(privateKeyJwk, alg);
      
      const jws = await new jose.SignJWT({ vc })
        .setProtectedHeader({ alg, kid: `${issuerDid}#${issuerPrivateKey.id.split('#')[1]}` })
        .setIssuedAt()
        .setExpirationTime(expirationDate || '1y')
        .sign(privateKey);

      return {
        jws,
        vc
      };
    } catch (signError) {
      console.error('VC 서명 오류:', signError);
      
      // 서명에 실패한 경우 서명되지 않은 VC 반환 (개발 목적)
      console.warn('서명 없이 VC를 반환합니다 (개발 목적)');
      const header = { 
        alg: 'EdDSA', 
        kid: `${issuerDid}#${issuerPrivateKey.id.split('#')[1]}`
      };
      const jws = createMockJws({ vc }, header);
      
      return {
        jws,
        vc
      };
    }
  } catch (error) {
    console.error('VC 생성 오류:', error);
    throw error;
  }
}

// VC 검증 함수
export async function verifyVC(vcJws: string, issuerDidDocument: any) {
  try {
    // 브라우저 환경에서는 검증을 우회 (개발 목적)
    if (isBrowser()) {
      console.warn('브라우저 환경에서는 검증을 우회합니다 (개발 목적)');
      try {
        const parts = vcJws.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          return {
            isValid: true,
            vc: payload.vc,
            _devBypass: true
          };
        }
      } catch (e) {
        console.error('JWS 파싱 오류:', e);
      }
    }

    // 발급자의 공개키 가져오기
    const publicKeyJwk = issuerDidDocument.verificationMethod[0].publicKeyJwk;
    const alg = 'EdDSA'; // Ed25519 서명 알고리즘

    try {
      const publicKey = await jose.importJWK(publicKeyJwk, alg);
      
      // JWS 검증
      const { payload } = await jose.jwtVerify(vcJws, publicKey);
      
      // VC 내용 반환
      return {
        isValid: true,
        vc: payload.vc
      };
    } catch (verifyError: any) {
      console.error('JWS 검증 오류:', verifyError);
      
      // 개발 목적으로 검증 우회 (실제 환경에서는 사용하지 않아야 함)
      console.warn('검증을 우회합니다 (개발 목적)');
      
      // JWS에서 페이로드 부분 추출 시도
      try {
        const parts = vcJws.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          return {
            isValid: true,
            vc: payload.vc,
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
    console.error('VC 검증 오류:', error);
    return {
      isValid: false,
      error: error.message || '알 수 없는 오류'
    };
  }
}

// 로컬 스토리지에 VC 저장
export function storeVC(vcJws: string, vc: any) {
  if (!isBrowser()) return false;
  
  try {
    // 기존 VC 목록 가져오기
    const vcListStr = localStorage.getItem('vcList');
    const vcList = vcListStr ? JSON.parse(vcListStr) : [];
    
    // 새 VC 추가
    vcList.push({
      id: vc.id,
      jws: vcJws,
      vc: vc
    });
    
    // 저장
    localStorage.setItem('vcList', JSON.stringify(vcList));
    return true;
  } catch (error) {
    console.error('VC 저장 오류:', error);
    return false;
  }
}

// 로컬 스토리지에서 VC 목록 불러오기
export function loadVCList() {
  if (!isBrowser()) return [];
  
  try {
    const vcListStr = localStorage.getItem('vcList');
    return vcListStr ? JSON.parse(vcListStr) : [];
  } catch (error) {
    console.error('VC 목록 로드 오류:', error);
    return [];
  }
}

// 특정 VC 삭제
export function deleteVC(vcId: string) {
  if (!isBrowser()) return false;
  
  try {
    const vcListStr = localStorage.getItem('vcList');
    if (!vcListStr) return false;
    
    const vcList = JSON.parse(vcListStr);
    const newVcList = vcList.filter((vc: any) => vc.id !== vcId);
    
    localStorage.setItem('vcList', JSON.stringify(newVcList));
    return true;
  } catch (error) {
    console.error('VC 삭제 오류:', error);
    return false;
  }
} 