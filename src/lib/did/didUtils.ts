import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { getDIDByDIDString } from '../db/didRepository';

export interface DIDDocument {
  '@context': string[];
  id: string;
  controller: string;
  verificationMethod: {
    id: string;
    type: string;
    controller: string;
    publicKeyHex: string;
  }[];
  authentication: string[];
  assertionMethod: string[];
  service: {
    id: string;
    type: string;
    serviceEndpoint: string;
  }[];
}

/**
 * 새로운 키 페어를 생성합니다.
 * ethers.Wallet.createRandom()은 RPC 노드에 의존하지 않고 
 * 로컬에서 암호학적으로 안전한 난수를 사용하여 키를 생성합니다.
 * 이 함수는 네트워크 연결 없이도 작동합니다.
 */
export const generateKeyPair = async () => {
  // ethers.js를 사용하여 키 생성 (RPC 노드에 의존하지 않음)
  const wallet = ethers.Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.address,
  };
};

export const createDIDDocument = async (publicKey: string): Promise<DIDDocument> => {
  const did = `did:web:${uuidv4()}`;
  
  const document: DIDDocument = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: `${did}#keys-1`,
        type: 'EcdsaSecp256k1VerificationKey2019',
        controller: did,
        publicKeyHex: publicKey.substring(2) // Remove '0x' prefix
      }
    ],
    authentication: [`${did}#keys-1`],
    assertionMethod: [`${did}#keys-1`],
    service: [
      {
        id: `${did}#service-1`,
        type: 'DIDWebService',
        serviceEndpoint: 'https://example.com/endpoint'
      }
    ]
  };

  return document;
};

export const hashDIDDocument = (document: DIDDocument): string => {
  const documentString = JSON.stringify(document);
  return '0x' + crypto.createHash('sha256').update(documentString).digest('hex');
};

export const validateDIDDocument = (document: DIDDocument): boolean => {
  try {
    // 기본 필드 검증
    if (!document['@context'] || !document.id || !document.controller) {
      return false;
    }

    // verificationMethod 검증
    if (!document.verificationMethod || document.verificationMethod.length === 0) {
      return false;
    }

    // authentication 검증
    if (!document.authentication || document.authentication.length === 0) {
      return false;
    }

    // assertionMethod 검증
    if (!document.assertionMethod || document.assertionMethod.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * DID 문자열로 DID 문서를 조회합니다.
 * @param didString DID 문자열
 * @returns DID 문서 또는 null
 */
export const resolveDid = async (didString: string): Promise<DIDDocument | null> => {
  try {
    // DB에서 DID 조회
    const didRecord = getDIDByDIDString(didString);
    if (!didRecord || !didRecord.did_document) {
      return null;
    }
    
    // 문서 파싱
    return JSON.parse(didRecord.did_document) as DIDDocument;
  } catch (error) {
    console.error('DID 조회 오류:', error);
    return null;
  }
}; 