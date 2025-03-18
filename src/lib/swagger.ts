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

// API 정의 시작
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

// 태그 정의
export const tags = [
  { name: 'Info', description: '시스템 정보 관련 API' },
  { name: 'DID', description: 'DID(Decentralized Identifier) 관련 API' },
  { name: 'VC', description: 'VC(Verifiable Credential) 관련 API' },
  { name: 'VP', description: 'VP(Verifiable Presentation) 관련 API' },
  { name: 'User', description: '사용자 관리 API' },
  { name: 'Issuer', description: '발급기관 관리 API' },
  { name: 'Demo', description: '시연 및 데모용 API' }
];

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