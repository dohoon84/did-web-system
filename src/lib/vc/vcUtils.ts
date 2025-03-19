import { v4 as uuidv4 } from 'uuid';

/**
 * 간단한 Verifiable Credential(VC)을 발급합니다.
 * @param issuerDid 발급자 DID
 * @param subjectDid 주체 DID
 * @param claims VC에 포함될 클레임 데이터
 * @param types VC 타입 배열
 * @returns 생성된 VC 객체
 */
export function issueSimpleVC(
  issuerDid: string,
  subjectDid: string,
  claims: Record<string, any>,
  types: string[]
) {
  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(now.getFullYear() + 1);
  
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1'
    ],
    id: `urn:uuid:${uuidv4()}`,
    type: ['VerifiableCredential', ...types],
    issuer: issuerDid,
    issuanceDate: now.toISOString(),
    expirationDate: oneYearLater.toISOString(),
    credentialSubject: {
      id: subjectDid,
      ...claims
    }
  };
}

/**
 * VC를 검증합니다.
 * @param vc 검증할 VC 객체
 * @returns 검증 결과 (유효성 및 이유)
 */
export function verifyVC(vc: any) {
  // 필수 필드 확인
  if (!vc['@context'] || !vc.id || !vc.type || !vc.issuer || 
      !vc.issuanceDate || !vc.credentialSubject) {
    return { 
      valid: false, 
      reason: '필수 필드가 누락되었습니다.' 
    };
  }

  // 타입 확인
  if (!vc.type.includes('VerifiableCredential')) {
    return { 
      valid: false, 
      reason: 'VC 타입이 올바르지 않습니다.' 
    };
  }

  // 만료일 확인
  if (vc.expirationDate) {
    const expirationDate = new Date(vc.expirationDate);
    if (expirationDate < new Date()) {
      return { 
        valid: false, 
        reason: 'VC가 만료되었습니다.' 
      };
    }
  }

  // 모든 검증 통과
  return { valid: true };
}