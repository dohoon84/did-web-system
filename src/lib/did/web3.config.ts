import Web3 from 'web3';
import path from 'path';
import fs from 'fs';

interface BlockchainConfig {
  rpcUrl: string;
  didRegistryAddress: string;
}

// 설정 파일 경로
const configPath = process.env.BLOCKCHAIN_CONFIG_PATH || path.join(process.cwd(), 'config', 'blockchain.json');

// 기본 설정 값
const defaultConfig: BlockchainConfig = {
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://3.36.91.35:9650/ext/bc/C/rpc',
  didRegistryAddress: process.env.DID_REGISTRY_ADDRESS || '0xe191b8988e2a18a86a847142915dd4240c67d710'
};

// 설정 파일에서 설정 값 로드
let config: BlockchainConfig;
try {
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
    console.log(`블록체인 설정을 파일에서 로드: ${configPath}`);
  } else {
    config = defaultConfig;
    console.log(`설정 파일이 없어 기본 설정 사용: ${configPath}`);
  }
} catch (error) {
  console.error(`설정 파일 로드 중 오류 발생: ${error}`);
  config = defaultConfig;
}

// 설정 값 내보내기
export const RPC_URL_CONFIG = config.rpcUrl;
export const DID_REGISTRY_ADDRESS_CONFIG = config.didRegistryAddress;

// DID Registry ABI
const DID_REGISTRY_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_did",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_documentHash",
        "type": "string"
      }
    ],
    "name": "createDID",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_did",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_newDocumentHash",
        "type": "string"
      }
    ],
    "name": "updateDID",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_did",
        "type": "string"
      }
    ],
    "name": "getDID",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_issuerDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_subjectDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_vcHash",
        "type": "string"
      }
    ],
    "name": "registerVC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_issuerDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_vcHash",
        "type": "string"
      }
    ],
    "name": "revokeVC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_issuerDid",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_vcHash",
        "type": "string"
      }
    ],
    "name": "getVCStatus",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Web3 인스턴스 생성
const web3 = new Web3(RPC_URL_CONFIG);

// DID Registry 컨트랙트 인스턴스 생성
const didRegistryContract = new web3.eth.Contract(DID_REGISTRY_ABI as any, DID_REGISTRY_ADDRESS_CONFIG);

export { web3, didRegistryContract, DID_REGISTRY_ABI }; 