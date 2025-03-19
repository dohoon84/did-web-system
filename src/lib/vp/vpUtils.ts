import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { verifyVC } from '@/lib/vc/vcUtils';

/**
 * Verifiable Presentation(VP)을 생성합니다.
 * @param holderDid 소유자 DID
 * @param vcs 포함할 VC 배열
 * @param privateKey 소유자의 개인키 (서명용)
 * @param types VP 타입 배열
 * @returns 생성된 VP 객체
 */
export async function createVerifiablePresentation(
    holderDid: string,
    vcs: any[],
    privateKey: string,
    types: string[] = []
  ) {
    const now = new Date();
    
    // VP 기본 구조 생성
    const vpBase = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1'
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiablePresentation', ...types],
      holder: holderDid,
      verifiableCredential: vcs,
      created: now.toISOString()
    };
    
    // VP 데이터 해시 생성
    const vpHash = hashPresentation(vpBase);
    
    // 서명 생성
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(vpHash);
    
    // 서명이 포함된 최종 VP 반환
    return {
      ...vpBase,
      proof: {
        type: 'EcdsaSecp256k1Signature2019',
        created: now.toISOString(),
        proofPurpose: 'authentication',
        verificationMethod: `${holderDid}#keys-1`,
        signature: signature
      }
    };
  }
  
  /**
   * VP 객체의 해시값을 생성합니다.
   * @param presentation VP 객체
   * @returns 해시값
   */
  export function hashPresentation(presentation: any): string {
    // proof 필드 제외하고 JSON으로 변환
    const { proof, ...vpWithoutProof } = presentation;
    const vpJson = JSON.stringify(vpWithoutProof);
    
    // SHA-256 해시 생성
    return ethers.keccak256(ethers.toUtf8Bytes(vpJson));
  }
  
  /**
   * VP를 검증합니다.
   * @param vp 검증할 VP 객체
   * @param publicKey 검증에 사용할 공개키
   * @returns 검증 결과 (유효성 및 이유)
   */
  export async function verifyVP(vp: any, publicKeyHex: string) {
    try {
      // 필수 필드 확인
      if (!vp['@context'] || !vp.id || !vp.type || !vp.holder || 
          !vp.verifiableCredential || !vp.proof) {
        return { 
          valid: false, 
          reason: '필수 필드가 누락되었습니다.' 
        };
      }
      
      // 타입 확인
      if (!vp.type.includes('VerifiablePresentation')) {
        return { 
          valid: false, 
          reason: 'VP 타입이 올바르지 않습니다.' 
        };
      }
      
      // VP 해시 생성
      const { proof, ...vpWithoutProof } = vp;
      const vpHash = hashPresentation(vpWithoutProof);
      
      // 서명 검증
      const signature = vp.proof.signature;
      const recoveredAddress = ethers.verifyMessage(vpHash, signature);
      const publicKey = `0x${publicKeyHex}`;
      
      // 공개키로부터 주소 계산
      const computedAddress = ethers.computeAddress(publicKey);
      
      if (computedAddress.toLowerCase() !== recoveredAddress.toLowerCase()) {
        return { 
          valid: false, 
          reason: '서명이 유효하지 않습니다. 소유자의 서명이 아니거나 변조되었습니다.' 
        };
      }
      
      // 포함된 모든 VC 검증
      for (let i = 0; i < vp.verifiableCredential.length; i++) {
        const vcResult = verifyVC(vp.verifiableCredential[i]);
        if (!vcResult.valid) {
          return { 
            valid: false, 
            reason: `포함된 VC(${i+1})가 유효하지 않습니다: ${vcResult.reason}` 
          };
        }
      }
      
      // 모든 검증 통과
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        reason: `VP 검증 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      };
    }
  } 