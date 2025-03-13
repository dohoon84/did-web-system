import * as didKeyLib from '@transmute/did-key.js';
import { v4 as uuidv4 } from 'uuid';

// 브라우저 환경인지 확인하는 함수
const isBrowser = () => typeof window !== 'undefined';

// 브라우저 환경에서 사용할 수 있는 안전한 난수 생성 함수
function getSecureRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (isBrowser() && window.crypto) {
    // 브라우저 환경에서는 Web Crypto API 사용
    window.crypto.getRandomValues(array);
  } else {
    // 폴백: 안전하지 않은 난수 생성 (개발용)
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
}

// 개발 목적의 고정 DID 및 키 (실제 환경에서는 사용하지 말 것)
const DEV_DID = {
  did: "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
  didDocument: {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
    "verificationMethod": [
      {
        "id": "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
        "type": "Ed25519VerificationKey2020",
        "controller": "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
        "publicKeyMultibase": "z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp"
      }
    ],
    "authentication": [
      "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp"
    ],
    "assertionMethod": [
      "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp"
    ],
    "capabilityDelegation": [
      "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp"
    ],
    "capabilityInvocation": [
      "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp"
    ],
    "keyAgreement": [
      "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6LSrdqo4M24WRDJj1h2hXxgtDTyzjjKCiyapYVgrhwZAySn"
    ]
  },
  privateKey: {
    id: "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
    type: "Ed25519VerificationKey2020",
    controller: "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
    publicKeyMultibase: "z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
    privateKeyJwk: {
      kty: "OKP",
      crv: "Ed25519",
      x: "CV-aGlld3nVdgnhoZK0D36Wk-9aIMlZjZOK2XhPMnkQ",
      d: "S5WYVU1MyNMKpF5yKUGdpNFUlCveCcQJAJeUc0S4Bvg"
    }
  }
};

// DID 생성 함수
export async function generateDid() {
  try {
    if (isBrowser()) {
      // 브라우저 환경에서는 개발용 고정 DID 반환 (데모 목적)
      console.warn('브라우저 환경에서는 개발용 고정 DID를 사용합니다.');
      return { ...DEV_DID };
    }
    
    // 서버 환경에서는 실제 DID 생성 시도
    const didGeneration = await didKeyLib.key.generate({
      type: 'ed25519',
      seed: getSecureRandomBytes(32)
    });
    
    const { didDocument } = didGeneration;
    const did = didDocument.id;
    
    // 개인키 정보 (실제 구현에서는 안전하게 저장해야 함)
    const privateKey = didGeneration.keys[0];
    
    return {
      did,
      didDocument,
      privateKey,
    };
  } catch (error) {
    console.error('DID 생성 오류:', error);
    console.warn('오류 발생으로 인해 개발용 고정 DID를 사용합니다.');
    return { ...DEV_DID };
  }
}

// DID 해석 함수
export async function resolveDid(did: string) {
  try {
    const resolution = await didKeyLib.key.resolve(did);
    return resolution.didDocument;
  } catch (error) {
    console.error('DID 해석 오류:', error);
    throw error;
  }
}

// DID Document 검증 함수
export async function verifyDidDocument(didDocument: any) {
  try {
    // 간단한 구조 검증
    if (!didDocument.id || !didDocument.verificationMethod || !didDocument.authentication) {
      return false;
    }
    
    // 더 복잡한 검증 로직은 실제 구현에서 추가할 수 있음
    return true;
  } catch (error) {
    console.error('DID Document 검증 오류:', error);
    return false;
  }
}

// DID Document에서 공개키 추출
export function getPublicKeyFromDidDocument(didDocument: any) {
  if (!didDocument || !didDocument.verificationMethod || !didDocument.verificationMethod[0]) {
    throw new Error('유효하지 않은 DID Document');
  }
  
  return didDocument.verificationMethod[0].publicKeyJwk || didDocument.verificationMethod[0].publicKeyBase58;
}

// 로컬 스토리지에 DID 정보 저장
export function storeDid(did: string, didDocument: any, privateKey: any) {
  if (!isBrowser()) return false;
  
  try {
    const didInfo = {
      did,
      didDocument,
      privateKey,
    };
    
    localStorage.setItem('didInfo', JSON.stringify(didInfo));
    return true;
  } catch (error) {
    console.error('DID 저장 오류:', error);
    return false;
  }
}

// 로컬 스토리지에서 DID 정보 불러오기
export function loadDid() {
  if (!isBrowser()) return null;
  
  try {
    const didInfoStr = localStorage.getItem('didInfo');
    if (didInfoStr) {
      return JSON.parse(didInfoStr);
    }
  } catch (error) {
    console.error('DID 로드 오류:', error);
  }
  return null;
}

// DID 정보 삭제
export function deleteDid() {
  if (!isBrowser()) return false;
  
  try {
    localStorage.removeItem('didInfo');
    return true;
  } catch (error) {
    console.error('DID 삭제 오류:', error);
    return false;
  }
} 