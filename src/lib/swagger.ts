import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'DID 관리 시스템 API',
        version: '1.0.0',
        description: 'DID, VC, VP 관리를 위한 REST API',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: '개발 서버',
        },
      ],
      tags: [
        {
          name: 'DID',
          description: 'DID 관리 API',
        },
        {
          name: 'VC',
          description: 'Verifiable Credential 관리 API',
        },
        {
          name: 'VP',
          description: 'Verifiable Presentation 관리 API',
        },
      ],
      components: {
        schemas: {
          DID: {
            type: 'object',
            properties: {
              did: {
                type: 'string',
                description: 'DID 식별자',
              },
              didDocument: {
                type: 'object',
                description: 'DID Document',
              },
              privateKey: {
                type: 'object',
                description: '개인키 정보 (민감 정보)',
              },
            },
          },
          VC: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VC 식별자',
              },
              jws: {
                type: 'string',
                description: 'JWS 형식의 서명된 VC',
              },
              vc: {
                type: 'object',
                description: 'VC 내용',
              },
            },
          },
          VP: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'VP 식별자',
              },
              jws: {
                type: 'string',
                description: 'JWS 형식의 서명된 VP',
              },
              vp: {
                type: 'object',
                description: 'VP 내용',
              },
            },
          },
          Error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  });
  return spec;
}; 