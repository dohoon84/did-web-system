import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// OpenAPI 확장 적용
extendZodWithOpenApi(z);

// OpenAPI 레지스트리 생성
const registry = new OpenAPIRegistry();

// 공통 스키마 정의
registry.register('Error', z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
  message: z.string().optional()
}));

// 기본 응답 스키마
registry.register('SuccessResponse', z.object({
  success: z.boolean(),
  message: z.string().optional()
}));

// DID 관련 스키마
registry.register('DID', z.object({
  id: z.string(),
  did: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  user_id: z.string().optional(),
  did_document: z.string().optional(),
  private_key: z.string().optional()
}));

// VC 관련 스키마
registry.register('VC', z.object({
  id: z.string(),
  issuer_did: z.string(),
  subject_did: z.string(),
  credential_type: z.string(),
  credential_data: z.string(),
  status: z.string(),
  issuance_date: z.string(),
  expiration_date: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
}));

// VP 관련 스키마
registry.register('VP', z.object({
  id: z.string(),
  vp_id: z.string(),
  holder_did: z.string(),
  vp_data: z.string(),
  vp_hash: z.string().optional(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string()
}));

// 사용자 관련 스키마
registry.register('User', z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  birth_date: z.string(),
  created_at: z.string(),
  updated_at: z.string()
}));

// Issuer 관련 스키마
registry.register('Issuer', z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  did: z.string(),
  created_at: z.string(),
  updated_at: z.string()
}));

// 태그 정의
export const tags = [
  { name: 'Info', description: '시스템 정보 관련 API' },
  { name: 'DID', description: 'DID(Decentralized Identifier) 관련 API' },
  { name: 'VC', description: 'VC(Verifiable Credential) 관련 API' },
  { name: 'VP', description: 'VP(Verifiable Presentation) 관련 API' },
  { name: 'User', description: '사용자 관리 API' },
  { name: 'Issuer', description: '발급기관 관리 API' },
  { name: 'Demo', description: '시연 및 데모용 API' },
  { name: 'Stats', description: '통계 관련 API' }
];

// API 정의 시작 - 기본 API 정보
registry.registerPath({
  method: 'get',
  path: '/api',
  tags: ['Info'],
  summary: 'API 정보',
  responses: {
    200: {
      description: 'API 정보',
    },
  },
});

// DID 관련 API 경로 등록
registry.registerPath({
  method: 'get',
  path: '/api/did',
  tags: ['DID'],
  summary: 'DID Document 조회 또는 DID 목록 조회',
  description: 'DID Document를 조회하거나 DID 목록을 조회합니다.',
  parameters: [
    {
      in: 'query',
      name: 'did',
      schema: { type: 'string' },
      required: false,
      description: '조회할 DID (없으면 목록 조회)'
    },
    {
      in: 'query',
      name: 'limit',
      schema: { type: 'integer' },
      required: false,
      description: '목록 조회 시 반환할 최대 항목 수'
    },
    {
      in: 'query',
      name: 'offset',
      schema: { type: 'integer' },
      required: false,
      description: '목록 조회 시 건너뛸 항목 수'
    },
    {
      in: 'query',
      name: 'transactions',
      schema: { type: 'boolean' },
      required: false,
      description: 'DID의 트랜잭션 정보도 함께 조회할지 여부'
    }
  ],
  responses: {
    200: {
      description: '성공적으로 DID Document 또는 목록을 조회함'
    },
    404: {
      description: 'DID를 찾을 수 없음'
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/did',
  tags: ['DID'],
  summary: 'DID 생성',
  description: '새로운 DID와 DID Document를 생성하고 블록체인에 기록합니다.',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: '사용자 ID (사용자와 DID를 연결하는 경우)'
            }
          }
        }
      }
    }
  },
  responses: {
    201: {
      description: 'DID가 성공적으로 생성됨'
    },
    500: {
      description: '서버 오류'
    }
  }
});

// 사용자 관련 API 경로 등록
registry.registerPath({
  method: 'get',
  path: '/api/user',
  tags: ['User'],
  summary: '사용자 목록을 조회합니다.',
  description: '모든 사용자 목록을 조회합니다.',
  responses: {
    200: {
      description: '사용자 목록이 성공적으로 조회됨'
    },
    500: {
      description: '서버 오류'
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/user',
  tags: ['User'],
  summary: '사용자를 생성합니다.',
  description: '새로운 사용자를 생성합니다.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name', 'birth_date'],
          properties: {
            name: {
              type: 'string',
              description: '사용자 이름'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '이메일 주소 (선택 사항)'
            },
            birth_date: {
              type: 'string',
              description: '생년월일 (YYYY-MM-DD 형식)'
            }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: '사용자가 성공적으로 생성됨'
    },
    400: {
      description: '잘못된 요청'
    }
  }
});

// VC 관련 API 경로 등록
registry.registerPath({
  method: 'get',
  path: '/api/vc',
  tags: ['VC'],
  summary: 'VC 목록 조회',
  description: '저장된 VC 목록을 조회합니다.',
  parameters: [
    {
      in: 'query',
      name: 'issuer',
      schema: { type: 'string' },
      required: false,
      description: '발급자 DID로 필터링'
    },
    {
      in: 'query',
      name: 'subject',
      schema: { type: 'string' },
      required: false,
      description: '대상자 DID로 필터링'
    },
    {
      in: 'query',
      name: 'limit',
      schema: { type: 'integer' },
      required: false,
      description: '반환할 최대 VC 수'
    },
    {
      in: 'query',
      name: 'offset',
      schema: { type: 'integer' },
      required: false,
      description: '시작 항목 번호'
    }
  ],
  responses: {
    200: {
      description: '성공적으로 VC 목록을 조회함'
    },
    500: {
      description: '서버 오류'
    }
  }
});

// 데모용 API 등록
registry.registerPath({
  method: 'post',
  path: '/api/vc/issue/age',
  tags: ['Demo', 'VC'],
  summary: '연령 인증 VC를 발급합니다.',
  description: '사용자의 연령 정보를 검증하고 연령 인증 VC를 발급합니다.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['issuerDid', 'subjectDid', 'userId', 'minAge'],
          properties: {
            issuerDid: {
              type: 'string',
              description: '발급자 DID'
            },
            subjectDid: {
              type: 'string',
              description: '주체(사용자) DID'
            },
            userId: {
              type: 'string',
              description: '사용자 ID'
            },
            minAge: {
              type: 'number',
              description: '최소 연령 요구사항'
            }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: 'VC가 성공적으로 발급됨'
    }
  }
});

// VP 관련 API 경로 등록
registry.registerPath({
  method: 'post',
  path: '/api/vp/create',
  tags: ['VP'],
  summary: 'VP를 생성합니다.',
  description: '선택한 VC를 포함하는 VP를 생성합니다.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['holderDid', 'vcIds', 'privateKey'],
          properties: {
            holderDid: {
              type: 'string',
              description: '소유자 DID'
            },
            vcIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '포함할 VC ID 배열'
            },
            privateKey: {
              type: 'string',
              description: '소유자의 개인키 (서명용)'
            },
            types: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'VP 타입 배열'
            }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: 'VP가 성공적으로 생성됨'
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/vp/verify',
  tags: ['VP'],
  summary: 'VP를 검증합니다.',
  description: 'VP의 서명과 내용을 검증합니다.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['vpData'],
          properties: {
            vpId: {
              type: 'string',
              description: '검증할 VP ID (DB 내부 ID)'
            },
            vpStandardId: {
              type: 'string',
              description: '검증할 VP의 표준 ID'
            },
            vpData: {
              type: 'object',
              description: '검증할 VP 데이터 (JSON 객체)'
            }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: 'VP 검증 결과'
    }
  }
});

// OpenAPI 생성기 인스턴스 생성
const generator = new OpenApiGeneratorV3(registry.definitions);

// OpenAPI 문서 생성
export const apiDefinition = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'DID 웹시스템 API',
    version: '1.0.0',
    description: 'DID, VC, VP 관리를 위한 API',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: '개발 서버',
    }
  ],
  tags: tags
});

// API 문서 가져오기 함수
export function getApiDocs() {
  return apiDefinition;
}

export default apiDefinition; 