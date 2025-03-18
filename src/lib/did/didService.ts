import { DIDDocument, createDIDDocument, generateKeyPair, hashDIDDocument, validateDIDDocument } from './didUtils';
import db from '../db';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { DID_REGISTRY_ADDRESS, DID_REGISTRY_ABI, RPC_URL } from './web3.config';
import { getUserById } from '../db/userRepository';


interface DIDBlockchainInfo {
  0: string;  // documentHash
  1: string;  // owner
}

interface DIDRecord {
  id: string;
  did: string;
  did_document: string;
  private_key: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

interface TransactionRecord {
  id: string;
  did: string;
  transaction_hash: string;
  transaction_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BlockchainError extends Error {
  did?: string;
  document?: DIDDocument;
}

// 컨트랙트 타입 확장
interface DIDRegistryContract extends ethers.Contract {
  registerVC(issuerDid: string, subjectDid: string, vcHash: string): Promise<ethers.ContractTransaction>;
  revokeVC(issuerDid: string, vcHash: string): Promise<ethers.ContractTransaction>;
  getVCStatus(issuerDid: string, vcHash: string): Promise<number>;
}

// error_message 컬럼이 존재하는지 확인
let hasErrorMessageColumn = false;
try {
  const tableInfo = db.prepare("PRAGMA table_info(blockchain_transactions)").all();
  hasErrorMessageColumn = tableInfo.some((column: any) => column.name === 'error_message');
} catch (err) {
  console.error('테이블 정보 확인 중 오류:', err);
}

export class DIDService {
  private provider: ethers.JsonRpcProvider;
  private didRegistryContract: DIDRegistryContract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.didRegistryContract = new ethers.Contract(
      DID_REGISTRY_ADDRESS,
      DID_REGISTRY_ABI,
      this.provider
    ) as DIDRegistryContract;
  }
  async createDID(): Promise<{ did: string; document: DIDDocument; privateKey: string; transactionHash?: string }> {
    // 트랜잭션 시작
    const dbTransaction = db.transaction(async () => {
      try {
        // 키 페어 생성
        const { privateKey, publicKey } = await generateKeyPair();

        // DID Document 생성
        const document = await createDIDDocument(publicKey);

        // DID Document 검증
        if (!validateDIDDocument(document)) {
          throw new Error('Invalid DID Document');
        }

        // DID Document 해시 생성
        const documentHash = hashDIDDocument(document);

        // 현재 시간
        const now = new Date().toISOString();
        const id = uuidv4();

        // 기존 dids 테이블에 DID Document 저장
        const stmt = db.prepare(`
          INSERT INTO dids (
            id, did, did_document, private_key, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          id,
          document.id,
          JSON.stringify(document),
          privateKey,
          'active',
          now,
          now
        );

        return { privateKey, publicKey, document, documentHash, id, now };
      } catch (error) {
        console.error('DID 생성 오류:', error);
        throw error;
      }
    });

    try {
      // 트랜잭션 실행
      const { privateKey, document, documentHash, now } = await dbTransaction();
      let transactionHash = undefined;

      try {
        // RPC URL 설정 (환경 변수 또는 기본값 사용)
        const rpcUrl = process.env.RPC_URL || 'http://3.36.91.35:9650/ext/bc/C/rpc';
        
        // ethers.js를 사용하여 블록체인에 DID Document 해시 저장
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        // zero fee 설정을 했음에도 불구하고 아발란체의 경우 gas fee가 발생하여 트랜잭션 실패
        // 따라서 관리자 키를 사용하여 트랜잭션 발생
        // 아발란체의 네트워크 경우 서브넷 구성보단 c-chain 연결이라고 봐야 할듯
        const adminPrivateKey = '4f3edf983ac636a65a842ce7c78d9aa706d3b113b37b3bb29d38c9d6a5e5bdb0'
        const wallet = new ethers.Wallet(adminPrivateKey, provider);
        const contractWithSigner = this.didRegistryContract.connect(wallet) as DIDRegistryContract;
        // 트랜잭션 전송
        const tx = await contractWithSigner.createDID(document.id, documentHash);
        const receipt = await tx.wait(); // 트랜잭션 확인 대기
        
        // 트랜잭션 해시 저장
        transactionHash = receipt.hash;
        
        // 블록체인 트랜잭션 정보 저장
        let txStmt;
        if (hasErrorMessageColumn) {
          txStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
          `);
        } else {
          txStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
        }
        
        txStmt.run(
          uuidv4(),
          document.id,
          transactionHash,
          'create_did',
          'confirmed',
          now,
          now
        );
        
        console.log(`DID Document 해시가 블록체인에 저장되었습니다. 트랜잭션 해시: ${transactionHash}`);
      } catch (blockchainError: unknown) {
        console.error('블록체인 저장 오류:', blockchainError);
        
        // 블록체인 저장 실패 시 DID 상태를 'error'로 업데이트
        const updateStmt = db.prepare(`
          UPDATE dids SET status = ?, updated_at = ? WHERE did = ?
        `);
        
        updateStmt.run(
          'error',
          new Date().toISOString(),
          document.id
        );
        
        // 에러 정보 저장
        const errorMessage = blockchainError instanceof Error ? blockchainError.message : '블록체인 저장 오류';
        
        // 에러 메시지 저장 (error_message 컬럼이 있는 경우에만)
        let errorStmt;
        if (hasErrorMessageColumn) {
          errorStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          errorStmt.run(
            uuidv4(),
            document.id,
            '',
            'create_did',
            'failed',
            now,
            now,
            errorMessage
          );
        } else {
          errorStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          errorStmt.run(
            uuidv4(),
            document.id,
            '',
            'create_did',
            'failed',
            now,
            now
          );
        }
        
        // 에러 객체에 DID 정보 추가하여 전달
        const error = new Error('블록체인 저장 오류: ' + errorMessage) as BlockchainError;
        error.did = document.id;
        error.document = document;
        throw error;
      }

      return {
        did: document.id,
        document: document,
        privateKey: privateKey,
        transactionHash: transactionHash
      };
    } catch (error) {
      console.error('Error creating DID:', error);
      throw error;
    }
  }

  /**
   * 사용자를 위한 DID를 생성합니다.
   * @param userId 사용자 ID
   * @returns 생성된 DID 정보
   */
  async createDIDForUser(userId: string): Promise<{ did: string; document: DIDDocument; privateKey: string; transactionHash?: string; user_id: string }> {
    // 사용자가 존재하는지 확인
    const user = await getUserById(userId);
    if (!user) {
      throw new Error(`사용자 ID ${userId}를 찾을 수 없습니다.`);
    }

    // 트랜잭션 시작
    const dbTransaction = db.transaction(async () => {
      try {
        // 키 페어 생성
        const { privateKey, publicKey } = await generateKeyPair();

        // DID Document 생성
        const document = await createDIDDocument(publicKey);

        // DID Document 검증
        if (!validateDIDDocument(document)) {
          throw new Error('Invalid DID Document');
        }

        // DID Document 해시 생성
        const documentHash = hashDIDDocument(document);

        // 현재 시간
        const now = new Date().toISOString();
        const id = uuidv4();

        // 기존 dids 테이블에 DID Document 저장 (사용자 ID 포함)
        const stmt = db.prepare(`
          INSERT INTO dids (
            id, did, did_document, private_key, status, created_at, updated_at, user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          id,
          document.id,
          JSON.stringify(document),
          privateKey,
          'active',
          now,
          now,
          userId
        );

        return { privateKey, publicKey, document, documentHash, id, now, userId };
      } catch (error) {
        console.error('DID 생성 오류:', error);
        throw error;
      }
    });

    try {
      // 트랜잭션 실행
      const { privateKey, document, documentHash, now, userId } = await dbTransaction();
      let transactionHash = undefined;

      try {
        // RPC URL 설정 (환경 변수 또는 기본값 사용)
        const rpcUrl = process.env.RPC_URL || 'http://3.36.91.35:9650/ext/bc/C/rpc';
        
        // ethers.js를 사용하여 블록체인에 DID Document 해시 저장
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        // zero fee 설정을 했음에도 불구하고 아발란체의 경우 gas fee가 발생하여 트랜잭션 실패
        // 따라서 관리자 키를 사용하여 트랜잭션 발생
        // 아발란체의 네트워크 경우 서브넷 구성보단 c-chain 연결이라고 봐야 할듯
        const adminPrivateKey = '4f3edf983ac636a65a842ce7c78d9aa706d3b113b37b3bb29d38c9d6a5e5bdb0'
        const wallet = new ethers.Wallet(adminPrivateKey, provider);
        const contractWithSigner = this.didRegistryContract.connect(wallet) as DIDRegistryContract;
        
        // 트랜잭션 전송
        const tx = await contractWithSigner.createDID(document.id, documentHash);
        const receipt = await tx.wait(); // 트랜잭션 확인 대기
        
        // 트랜잭션 해시 저장
        transactionHash = receipt.hash;
        
        // 블록체인 트랜잭션 정보 저장
        let txStmt;
        if (hasErrorMessageColumn) {
          txStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
          `);
        } else {
          txStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
        }
        
        txStmt.run(
          uuidv4(),
          document.id,
          transactionHash,
          'create_did',
          'confirmed',
          now,
          now
        );
        
        console.log(`사용자(${userId})를 위한 DID Document 해시가 블록체인에 저장되었습니다. 트랜잭션 해시: ${transactionHash}`);
      } catch (blockchainError: unknown) {
        console.error('블록체인 저장 오류:', blockchainError);
        
        // 블록체인 저장 실패 시 DID 상태를 'error'로 업데이트
        const updateStmt = db.prepare(`
          UPDATE dids SET status = ?, updated_at = ? WHERE did = ?
        `);
        
        updateStmt.run(
          'error',
          new Date().toISOString(),
          document.id
        );
        
        // 에러 정보 저장
        const errorMessage = blockchainError instanceof Error ? blockchainError.message : '블록체인 저장 오류';
        
        // 에러 메시지 저장 (error_message 컬럼이 있는 경우에만)
        let errorStmt;
        if (hasErrorMessageColumn) {
          errorStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          errorStmt.run(
            uuidv4(),
            document.id,
            '',
            'create_did',
            'failed',
            now,
            now,
            errorMessage
          );
        } else {
          errorStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          errorStmt.run(
            uuidv4(),
            document.id,
            '',
            'create_did',
            'failed',
            now,
            now
          );
        }
        
        // 에러 객체에 DID 정보 추가하여 전달
        const error = new Error('블록체인 저장 오류: ' + errorMessage) as BlockchainError;
        error.did = document.id;
        error.document = document;
        throw error;
      }

      return {
        did: document.id,
        document: document,
        privateKey: privateKey,
        transactionHash: transactionHash,
        user_id: userId
      };
    } catch (error) {
      console.error('Error creating DID for user:', error);
      throw error;
    }
  }

  async getDIDDocument(did: string): Promise<{ document: DIDDocument; transactionHash?: string; status?: string; errorMessage?: string } | null> {
    try {
      // 기존 dids 테이블에서 DID Document 조회
      const stmt = db.prepare('SELECT did_document, status FROM dids WHERE did = ?');
      const result = stmt.get(did) as DIDRecord | undefined;

      if (!result) {
        return null;
      }

      const document = JSON.parse(result.did_document) as DIDDocument;
      
      // 블록체인 트랜잭션 정보 조회
      let txStmt;
      if (hasErrorMessageColumn) {
        txStmt = db.prepare(`
          SELECT transaction_hash, status, error_message FROM blockchain_transactions 
          WHERE did = ? AND transaction_type = ?
          ORDER BY created_at DESC LIMIT 1
        `);
      } else {
        txStmt = db.prepare(`
          SELECT transaction_hash, status FROM blockchain_transactions 
          WHERE did = ? AND transaction_type = ?
          ORDER BY created_at DESC LIMIT 1
        `);
      }
      
      const txResult = txStmt.get(did, 'create_did') as (TransactionRecord & { error_message?: string }) | undefined;
      const transactionHash = txResult && txResult.status === 'confirmed' ? txResult.transaction_hash : undefined;
      const errorMessage = hasErrorMessageColumn ? txResult?.error_message : undefined;

      return {
        document,
        transactionHash,
        status: result.status,
        errorMessage
      };
    } catch (error) {
      console.error('Error getting DID Document:', error);
      throw error;
    }
  }

  async getAllDIDs(limit?: number, offset: number = 0): Promise<(DIDRecord & { transaction_hash?: string; error_message?: string })[]> {
    try {
      let query;
      if (hasErrorMessageColumn) {
        query = `
          SELECT d.id, d.did, d.status, d.created_at, d.updated_at, 
                bt.transaction_hash, bt.status as tx_status, bt.error_message
          FROM dids d
          LEFT JOIN (
            SELECT did, transaction_hash, status, error_message
            FROM blockchain_transactions
            WHERE transaction_type = 'create_did'
            GROUP BY did
            ORDER BY created_at DESC
          ) bt ON d.did = bt.did
          ORDER BY d.created_at DESC
        `;
      } else {
        query = `
          SELECT d.id, d.did, d.status, d.created_at, d.updated_at, 
                bt.transaction_hash, bt.status as tx_status
          FROM dids d
          LEFT JOIN (
            SELECT did, transaction_hash, status
            FROM blockchain_transactions
            WHERE transaction_type = 'create_did'
            GROUP BY did
            ORDER BY created_at DESC
          ) bt ON d.did = bt.did
          ORDER BY d.created_at DESC
        `;
      }
      
      if (limit) {
        query += ' LIMIT ? OFFSET ?';
        return db.prepare(query).all(limit, offset) as (DIDRecord & { transaction_hash?: string; error_message?: string })[];
      } else {
        return db.prepare(query).all() as (DIDRecord & { transaction_hash?: string; error_message?: string })[];
      }
    } catch (error) {
      console.error('Error getting all DIDs:', error);
      throw error;
    }
  }

  async getTransactionsByDID(did: string): Promise<(TransactionRecord & { error_message?: string })[]> {
    try {
      let stmt;
      if (hasErrorMessageColumn) {
        stmt = db.prepare(`
          SELECT id, transaction_hash, transaction_type, status, created_at, updated_at, error_message
          FROM blockchain_transactions
          WHERE did = ?
          ORDER BY created_at DESC
        `);
      } else {
        stmt = db.prepare(`
          SELECT id, transaction_hash, transaction_type, status, created_at, updated_at
          FROM blockchain_transactions
          WHERE did = ?
          ORDER BY created_at DESC
        `);
      }
      
      return stmt.all(did) as (TransactionRecord & { error_message?: string })[];
    } catch (error) {
      console.error('Error getting transactions by DID:', error);
      throw error;
    }
  }

  /**
   * DID를 폐기합니다. DID 상태를 'revoked'로 변경하고 블록체인에 폐기 상태를 기록합니다.
   * 해당 DID로 발급된 모든 VC도 함께 폐기됩니다.
   * @param did 폐기할 DID
   * @returns 폐기된 DID 정보
   */
  async revokeDID(did: string): Promise<{ success: boolean; message?: string; status?: string; error?: string }> {
    try {
        // DID가 존재하는지 확인
      const didStmt = db.prepare('SELECT * FROM dids WHERE did = ?');
      const didRecord = didStmt.get(did) as DIDRecord | undefined;
      
      if (!didRecord) {
        throw new Error(`DID ${did}를 찾을 수 없습니다.`);
      }
      
      // 이미 폐기된 DID인지 확인
      if (didRecord.status === 'revoked') {
        throw new Error(`이미 폐기된 DID입니다.`);
      }
      
      const now = new Date().toISOString();
      
      // 1. DID 상태를 'revoked'로 업데이트
      const updateStmt = db.prepare('UPDATE dids SET status = ?, updated_at = ? WHERE did = ?');
      updateStmt.run('revoked', now, did);
      
      // 2. VC 폐기 및 블록체인 처리를 위한 변수
      let blockchainSuccess = true;
      let blockchainErrorMessage = '';
      let vcErrorMessage = '';
      let failedVCs = 0;
      let succeededVCs = 0;
      
      try {
        // 3. 소유자(subject)로 발급받은 모든 VC 폐기
        const updateVCStmt = db.prepare(`
          UPDATE verifiable_credentials
          SET status = 'revoked', updated_at = ?
          WHERE id = ?
        `);
        
        const subjectVCsStmt = db.prepare(`
          SELECT id FROM verifiable_credentials 
          WHERE subject_did = ? AND status = 'active'
        `);
        const subjectVCs = subjectVCsStmt.all(did) as { id: string }[];
        
        for (const vc of subjectVCs) {
          try {
            updateVCStmt.run(now, vc.id);
            console.log(`소유자 DID ${did}의 폐기로 인해 VC ${vc.id}가 폐기되었습니다.`);
            succeededVCs++;
          } catch (vcUpdateError) {
            console.error(`VC ${vc.id} 폐기 중 오류:`, vcUpdateError);
            failedVCs++;
            
            // FOREIGN KEY 제약 조건 오류인 경우 개별 VC 폐기는 건너뛰지만 DID 폐기는 계속 진행
            const errorMsg = vcUpdateError instanceof Error ? vcUpdateError.message : '알 수 없는 오류';
            if (vcErrorMessage === '') {
              vcErrorMessage = errorMsg;
            }
          }
        }
        
        // 4. 블록체인 트랜잭션 처리
        const totalRevokedVCs = succeededVCs;
        
        try {
          // 블록체인에 폐기 상태 기록
          const adminPrivateKey = '4f3edf983ac636a65a842ce7c78d9aa706d3b113b37b3bb29d38c9d6a5e5bdb0'
        const wallet = new ethers.Wallet(adminPrivateKey, this.provider);
        const contractWithSigner = this.didRegistryContract.connect(wallet) as DIDRegistryContract;
                
        // DID Document 해시 계산
        const document = JSON.parse(didRecord.did_document) as DIDDocument;
        const documentHash = hashDIDDocument(document);
        
        // 트랜잭션 전송 (폐기 함수 호출)
        const tx = await contractWithSigner.updateDID(did, `${documentHash}:revoked`);
        const receipt = await tx.wait(); // 트랜잭션 확인 대기
        // 트랜잭션 정보 저장
        let txStmt;
        if (hasErrorMessageColumn) {
          txStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
          `);
        } else {
          txStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
        }
        
        txStmt.run(
          uuidv4(),
          did,
          receipt.hash,
          'revoke_did',
          'confirmed',
          now,
          now
        );
        
        console.log(`DID ${did}가 폐기되었습니다. 트랜잭션 해시: ${receipt.hash}`);
      } catch(blockchainError) {
        console.error('블록체인 폐기 오류:', blockchainError);
        blockchainSuccess = false;
        
        // 상세 오류 정보 저장
        blockchainErrorMessage = blockchainError instanceof Error 
          ? blockchainError.message 
          : '블록체인 연동 중 알 수 없는 오류 발생';
        
        // 에러 정보 저장
        const errorMessage = blockchainError instanceof Error ? blockchainError.message : '블록체인 폐기 오류';
        
        // 에러 메시지 저장 (error_message 컬럼이 있는 경우에만)
        let errorStmt;
        if (hasErrorMessageColumn) {
          errorStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          errorStmt.run(
            uuidv4(),
            did,
            '',
            'revoke_did',
            'failed',
            now,
            now,
            errorMessage
          );
        } else {
          errorStmt = db.prepare(`
            INSERT INTO blockchain_transactions (
              id, did, transaction_hash, transaction_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          errorStmt.run(
            uuidv4(),
            did,
            '',
            'revoke_did',
            'failed',
            now,
            now
          );
        }
        
        console.warn(`DID ${did}의 블록체인 폐기는 실패했으나, 로컬 DB에서는 폐기 처리되었습니다.`);
      }
    
    // 블록체인 응답을 기다리지 않고 바로 결과 반환 (논블로킹)
    return { 
      success: true, 
      message: `DID가 폐기되었습니다. 연관된 ${totalRevokedVCs}개의 VC가 함께 폐기되었습니다.`, 
      status: 'revoked' 
    };
  } catch (blockchainSetupError) {
    console.error('블록체인 설정 오류:', blockchainSetupError);
    
    // 블록체인 설정 오류가 발생해도 DID 폐기는 성공으로 간주
    return { 
      success: true, 
      message: `DID가 폐기되었으나 블록체인 연동 중 오류가 발생했습니다. 연관된 ${totalRevokedVCs}개의 VC가 함께 폐기되었습니다.`, 
      status: 'revoked',
      error: blockchainSetupError instanceof Error ? blockchainSetupError.message : '블록체인 설정 오류'
    };
  }
  } catch (vcError) {
  console.error('VC 처리 중 전체 오류:', vcError);
  const vcErrorMsg = vcError instanceof Error ? vcError.message : '알 수 없는 오류';

  // VC 처리 중 오류가 발생했으나 DID 폐기는 완료됨
  return { 
    success: true, 
    message: `DID는 폐기되었으나 VC 폐기 과정에서 오류가 발생했습니다. ${succeededVCs}개의 VC가 성공적으로 폐기되었습니다.`, 
    status: 'revoked',
    error: vcErrorMsg
  }
}
}
}