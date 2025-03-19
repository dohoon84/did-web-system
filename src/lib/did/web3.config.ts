import Web3 from 'web3';

// Avalanche 테스트넷 RPC URL
const RPC_URL = 'http://3.36.91.35:9650/ext/bc/C/rpc';

// DID Registry 컨트랙트 주소
// const DID_REGISTRY_ADDRESS = '0xec5dfb09d8122df1a000ef9174403028a79d3802';
const DID_REGISTRY_ADDRESS = '0xe191b8988e2a18a86a847142915dd4240c67d710'

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
const web3 = new Web3(RPC_URL);

// DID Registry 컨트랙트 인스턴스 생성
const didRegistryContract = new web3.eth.Contract(DID_REGISTRY_ABI as any, DID_REGISTRY_ADDRESS);

export { web3, didRegistryContract, DID_REGISTRY_ADDRESS, DID_REGISTRY_ABI, RPC_URL }; 