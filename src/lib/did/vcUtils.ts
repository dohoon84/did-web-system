// import { v4 as uuidv4 } from 'uuid';
// import * as jose from 'jose';

// // 브라우저 환경인지 확인하는 함수
// const isBrowser = () => typeof window !== 'undefined';

// // 개발 목적의 간단한 JWS 생성 함수
// function createMockJws(payload: any, header: any = { alg: 'EdDSA' }): string {
//   try {
//     const headerBase64 = btoa(JSON.stringify(header));
//     const payloadBase64 = btoa(JSON.stringify(payload));
//     // 실제 서명 없이 더미 서명 사용 (개발 목적)
//     const signature = 'DUMMY_SIGNATURE_FOR_DEVELOPMENT_ONLY';
//     return `${headerBase64}.${payloadBase64}.${signature}`;
//   } catch (error) {
//     console.error('Mock JWS 생성 오류:', error);
//     return `eyJhbGciOiJFZERTQSJ9.${btoa(JSON.stringify(payload))}.DUMMY`;
//   }
// }

// // VC 생성 함수 - 로컬 개발 환경에서는 모의 서명 사용
// export async function createVC(
//   issuerDid: string,
//   issuerPrivateKey: any,
//   subjectDid: string,
//   claims: Record<string, any>,
//   expirationDate?: Date
// ) {
//   try {
//     // VC 기본 구조 생성
//     const vc = {
//       '@context': [
//         'https://www.w3.org/2018/credentials/v1',
//         'https://www.w3.org/2018/credentials/examples/v1'
//       ],
//       id: `urn:uuid:${uuidv4()}`,
//       type: ['VerifiableCredential'],
//       issuer: issuerDid,
//       issuanceDate: new Date().toISOString(),
//       expirationDate: expirationDate ? expirationDate.toISOString() : undefined,
//       credentialSubject: {
//         id: subjectDid,
//         ...claims
//       }
//     };

//     // 로컬 개발 환경에서는 모의 서명 사용
//     console.warn('로컬 개발 환경에서는 모의 서명을 사용합니다.');
//     const jws = createMockJws(vc);
    
//     return {
//       ...vc,
//       proof: {
//         type: 'Ed25519Signature2020',
//         created: new Date().toISOString(),
//         verificationMethod: `${issuerDid}#keys-1`,
//         proofPurpose: 'assertionMethod',
//         jws
//       }
//     };
//   } catch (error) {
//     console.error('VC 생성 오류:', error);
//     throw error;
//   }
// }

// // VC 검증 함수 - 로컬 개발 환경에서는 항상 유효하다고 가정
// export async function verifyVC(vc: any): Promise<{ verified: boolean; error?: string }> {
//   try {
//     // 로컬 개발 환경에서는 항상 유효하다고 가정
//     console.warn('로컬 개발 환경에서는 VC 검증을 건너뜁니다.');
//     return { verified: true };
//   } catch (error) {
//     console.error('VC 검증 오류:', error);
//     return { verified: false, error: (error as Error).message };
//   }
// }

// // 여러 VC를 검증하는 함수
// export async function verifyVCs(vcs: any[]): Promise<{ verified: boolean; results: any[] }> {
//   const results = await Promise.all(vcs.map(vc => verifyVC(vc)));
//   const verified = results.every(result => result.verified);
//   return { verified, results };
// }

// // 로컬 개발 환경에서 사용할 수 있는 간단한 VC 발급 함수
// export function issueSimpleVC(
//   issuerDid: string,
//   subjectDid: string,
//   claims: Record<string, any>,
//   types: string[] = []
// ) {
//   const vc = {
//     '@context': [
//       'https://www.w3.org/2018/credentials/v1',
//       'https://www.w3.org/2018/credentials/examples/v1'
//     ],
//     id: `urn:uuid:${uuidv4()}`,
//     type: ['VerifiableCredential', ...types],
//     issuer: issuerDid,
//     issuanceDate: new Date().toISOString(),
//     credentialSubject: {
//       id: subjectDid,
//       ...claims
//     },
//     proof: {
//       type: 'Ed25519Signature2020',
//       created: new Date().toISOString(),
//       verificationMethod: `${issuerDid}#keys-1`,
//       proofPurpose: 'assertionMethod',
//       jws: 'eyJhbGciOiJFZERTQSJ9.DUMMY_SIGNATURE_FOR_DEVELOPMENT.DUMMY'
//     }
//   };
  
//   return vc;
// }