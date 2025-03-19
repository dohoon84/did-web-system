import { ethers } from 'ethers';
import { 
  VerifiableCredential, 
  createVC, 
  getVCById, 
  getAllVCs, 
  getVCsByIssuer,
  getVCsBySubject,
  revokeVC,
  updateVCStatus,
  saveVCBlockchainTransaction,
  getVCBlockchainTransactions,
  VCBlockchainTransaction
} from '../db/vcRepository';
import { DID_REGISTRY_ABI, DID_REGISTRY_ADDRESS_CONFIG, RPC_URL_CONFIG } from '../did/web3.config';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../logger';

export interface VCCreateParams {
  issuerDid: string;
  subjectDid: string;
  credentialType: string;
  claims: Record<string, any>;
  expirationDate?: string;
}

export interface VCBlockchainError extends Error {
  did?: string;
  vc?: Partial<VerifiableCredential>;
}

// 컨트랙트 타입 확장
interface DIDRegistryContract extends ethers.Contract {
  registerVC(issuerDid: string, subjectDid: string, vcHash: string): Promise<ethers.ContractTransaction>;
  revokeVC(issuerDid: string, vcHash: string): Promise<ethers.ContractTransaction>;
  getVCStatus(issuerDid: string, vcHash: string): Promise<number>;
}

export class VCService {
  private provider: ethers.JsonRpcProvider;
  private didRegistryContract: DIDRegistryContract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL_CONFIG);
    this.didRegistryContract = new ethers.Contract(
      DID_REGISTRY_ADDRESS_CONFIG,
      DID_REGISTRY_ABI,
      this.provider
    ) as DIDRegistryContract;
  }

  /**
   * VC를 생성합니다.
   */
  async createVC(params: VCCreateParams): Promise<VerifiableCredential> {
    try {
      const { issuerDid, subjectDid, credentialType, claims, expirationDate } = params;
      
      // 발급일 설정
      const issuanceDate = new Date().toISOString();
      
      // VC 데이터 구성
      const vcData = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        type: ['VerifiableCredential', credentialType],
        issuer: issuerDid,
        issuanceDate,
        credentialSubject: {
          id: subjectDid,
          ...claims
        }
      };

      // VC 생성
      const vcObj = createVC({
        issuer_did: issuerDid,
        subject_did: subjectDid,
        credential_type: credentialType,
        credential_data: JSON.stringify(vcData),
        issuance_date: issuanceDate,
        expiration_date: expirationDate
      });

      // 블록체인에 VC 해시 기록
      await this.recordVCOnBlockchain(vcObj);

      return vcObj;
    } catch (error) {
      log.error('VC 생성 오류:', error);
      
      const blockchainError: VCBlockchainError = new Error(
        error instanceof Error ? error.message : 'VC 생성 중 오류가 발생했습니다.'
      );
      
      throw blockchainError;
    }
  }

  /**
   * 블록체인에 VC를 기록합니다.
   */
  private async recordVCOnBlockchain(vc: VerifiableCredential): Promise<string> {
    try {
      // 개인키 가져오기 (실제 구현에서는 환경변수나 키 관리 솔루션 사용 권장)
      // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001', this.provider);
      // zero fee 설정을 했음에도 불구하고 아발란체의 경우 gas fee가 발생하여 트랜잭션 실패
      // 따라서 관리자 키를 사용하여 트랜잭션 발생
      // 아발란체의 네트워크 경우 서브넷 구성보단 c-chain 연결이라고 봐야 할듯
      const adminPrivateKey = '4f3edf983ac636a65a842ce7c78d9aa706d3b113b37b3bb29d38c9d6a5e5bdb0'
      const wallet = new ethers.Wallet(adminPrivateKey, this.provider);
      const contractWithSigner = this.didRegistryContract.connect(wallet) as DIDRegistryContract;
      
      // VC의 해시값 계산
      const vcHash = ethers.keccak256(ethers.toUtf8Bytes(vc.credential_data));
      log.info(`VC 발급자: ${vc.issuer_did}, VC 주체: ${vc.subject_did}, VC 해시값: ${vcHash}`);
      
      // 블록체인에 해시값 저장
      const tx = await contractWithSigner.registerVC(vc.issuer_did, vc.subject_did, vcHash);
      const receipt = await tx.wait(); // 트랜잭션 확인 대기
      
      // 트랜잭션 정보 저장
      const txInfo: Omit<VCBlockchainTransaction, 'id' | 'created_at' | 'updated_at'> = {
        vc_id: vc.id,
        transaction_hash: receipt.hash,
        transaction_type: 'create_vc',
        status: 'confirmed'
      };
      
      saveVCBlockchainTransaction(txInfo);
      
      return receipt.hash;
    } catch (error) {
      log.error('블록체인 VC 기록 오류:', error);
      
      // 오류 발생 시 실패 상태로 트랜잭션 정보 저장
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const txInfo: Omit<VCBlockchainTransaction, 'id' | 'created_at' | 'updated_at'> = {
        vc_id: vc.id,
        transaction_hash: uuidv4(), // 실패한 트랜잭션은 임시 ID 부여
        transaction_type: 'create_vc',
        status: 'failed',
        error_message: errorMessage
      };
      
      saveVCBlockchainTransaction(txInfo);
      
      // VC 상태 업데이트 (선택적)
      // updateVCStatus(vc.id, 'error');
      
      const blockchainError: VCBlockchainError = new Error(`블록체인에 VC 기록 중 오류 발생: ${errorMessage}`);
      blockchainError.vc = vc;
      throw blockchainError;
    }
  }

  /**
   * ID로 VC를 조회합니다.
   */
  getVCById(id: string): VerifiableCredential | null {
    return getVCById(id);
  }

  /**
   * 모든 VC를 조회합니다.
   */
  getAllVCs(limit?: number, offset?: number): VerifiableCredential[] {
    return getAllVCs(limit, offset);
  }

  /**
   * 발급자가 발급한 VC 목록을 조회합니다.
   */
  getVCsByIssuer(issuerDid: string): VerifiableCredential[] {
    return getVCsByIssuer(issuerDid);
  }

  /**
   * 주체(소유자)의 VC 목록을 조회합니다.
   */
  getVCsBySubject(subjectDid: string): VerifiableCredential[] {
    return getVCsBySubject(subjectDid);
  }

  /**
   * VC를 폐기합니다.
   */
  async revokeVC(id: string): Promise<VerifiableCredential | null> {
    try {
      const vc = getVCById(id);
      if (!vc) {
        throw new Error(`VC ${id}를 찾을 수 없습니다.`);
      }
      
      // 이미 폐기된 VC인 경우
      if (vc.status === 'revoked') {
        return vc;
      }
      
      // 블록체인에 폐기 상태 기록
      const adminPrivateKey = '4f3edf983ac636a65a842ce7c78d9aa706d3b113b37b3bb29d38c9d6a5e5bdb0'
      const wallet = new ethers.Wallet(adminPrivateKey, this.provider);
      const contractWithSigner = this.didRegistryContract.connect(wallet) as DIDRegistryContract;
      
      // VC의 해시값 계산
      const vcHash = ethers.keccak256(ethers.toUtf8Bytes(vc.credential_data));
      
      // 블록체인에 폐기 상태 저장
      const tx = await contractWithSigner.revokeVC(vc.issuer_did, vcHash);
      const receipt = await tx.wait(); // 트랜잭션 확인 대기
      
      // 트랜잭션 정보 저장
      const txInfo: Omit<VCBlockchainTransaction, 'id' | 'created_at' | 'updated_at'> = {
        vc_id: vc.id,
        transaction_hash: receipt.hash,
        transaction_type: 'revoke_vc',
        status: 'confirmed'
      };
      
      saveVCBlockchainTransaction(txInfo);
      
      // DB에서 VC 상태 업데이트
      return revokeVC(id);
    } catch (error) {
      log.error('VC 폐기 오류:', error);
      
      const vc = getVCById(id);
      if (!vc) {
        throw new Error(`VC ${id}를 찾을 수 없습니다.`);
      }
      
      // 오류 발생 시 실패 상태로 트랜잭션 정보 저장
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const txInfo: Omit<VCBlockchainTransaction, 'id' | 'created_at' | 'updated_at'> = {
        vc_id: id,
        transaction_hash: uuidv4(), // 실패한 트랜잭션은 임시 ID 부여
        transaction_type: 'revoke_vc',
        status: 'failed',
        error_message: errorMessage
      };
      
      saveVCBlockchainTransaction(txInfo);
      
      const blockchainError: VCBlockchainError = new Error(`VC 폐기 중 오류 발생: ${errorMessage}`);
      blockchainError.vc = vc;
      throw blockchainError;
    }
  }

  /**
   * VC의 블록체인 트랜잭션 정보를 조회합니다.
   */
  getVCBlockchainTransactions(vcId: string): VCBlockchainTransaction[] {
    return getVCBlockchainTransactions(vcId);
  }

  /**
   * VC를 검증합니다. (간단한 구현)
   */
  async verifyVC(vc: VerifiableCredential): Promise<{ valid: boolean; message?: string }> {
    try {
      // 1. VC가 유효한 상태인지 확인
      if (vc.status !== 'active') {
        return { 
          valid: false, 
          message: `VC가 유효하지 않은 상태입니다: ${vc.status}` 
        };
      }
      
      // 2. 만료일이 지났는지 확인
      if (vc.expiration_date) {
        const now = new Date();
        const expirationDate = new Date(vc.expiration_date);
        
        if (now > expirationDate) {
          // 만료된 VC 상태 업데이트
          updateVCStatus(vc.id, 'expired');
          
          return { 
            valid: false, 
            message: '만료된 VC입니다.'
          };
        }
      }
      
      // 3. 블록체인에서 VC 상태 확인
      const vcHash = ethers.keccak256(ethers.toUtf8Bytes(vc.credential_data));
      
      // VC 상태 조회
      const status = await this.didRegistryContract.getVCStatus(vc.issuer_did, vcHash);
      
      // VC 상태가 0이면 등록되지 않음, 1이면 활성, 2이면 폐기됨
      if (status === 0) {
        return { 
          valid: false, 
          message: '블록체인에 등록되지 않은 VC입니다.' 
        };
      } else if (status === 2) {
        // 블록체인 상태와 DB 상태가 다르면 DB 상태 업데이트
        if (vc.status !== 'revoked') {
          updateVCStatus(vc.id, 'revoked');
        }
        
        return { 
          valid: false, 
          message: '폐기된 VC입니다.' 
        };
      }
      
      // 모든 검증 통과
      return { valid: true };
    } catch (error) {
      log.error('VC 검증 오류:', error);
      return { 
        valid: false, 
        message: `VC 검증 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      };
    }
  }
} 