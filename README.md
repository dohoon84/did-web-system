# DID 기반 연령 인증 시스템

이 프로젝트는 DID(Decentralized Identifier)를 활용한 연령 인증 시스템의 MVP(Minimum Viable Product)입니다. 사용자는 자신의 DID를 생성하고, 연령 정보가 포함된 VC(Verifiable Credential)를 발급받아 VP(Verifiable Presentation)를 통해 성인 인증을 수행할 수 있습니다.

## 구현된 기능
- DID, VC, VP 관련 기능은 모두 블록체인에 기록되고 관리됩니다.

### 1. DID 관리
- DID 생성 및 조회
- DID Document 확인
- 사용자 연결 DID 관리

### 2. VC(Verifiable Credential) 관리
- 연령 인증 VC 발급
- VC 목록 조회 및 상세 정보 확인
- VC 유효성 검증

### 3. VP(Verifiable Presentation) 관리
- VP 생성 및 검증
- VP 목록 조회 및 상세 정보 확인
- 검증 결과 확인

### 4. 연령 인증 데모
- 단계별 연령 인증 프로세스 체험
- VC 발급부터 VP 검증까지 전체 흐름 시연
- 직관적인 UI로 인증 결과 확인

## 사용 방법

1. **DID 생성**
   - DID 관리 페이지에서 "새 DID 생성하기" 버튼을 클릭하여 DID 생성

2. **VC 발급**
   - VC 관리 페이지에서 발급자 DID, 대상자 DID, 사용자, 최소 연령 요구사항을 입력하고 "VC 발급하기" 버튼 클릭

3. **VP 생성 및 검증**
   - VP 관리 페이지에서 홀더 DID, 포함할 VC, 검증자, 요구 연령을 입력하고 "VP 생성 및 검증하기" 버튼 클릭

4. **연령 인증 데모**
   - 연령 인증 데모 페이지에서 단계별로 연령 인증 과정을 체험

## 기술 스택

- **프론트엔드**: Next.js, React, TypeScript, TailwindCSS
- **백엔드**: Next.js API Routes
- **데이터베이스**: SQLite (Prisma ORM)
- **DID/VC/VP**: 자체 구현 (개발 환경용 간소화된 구현)

## 환경 설정

이 프로젝트는 다양한 환경(로컬, 개발, 프로덕션)에서 실행할 수 있도록 환경 설정 기능을 제공합니다.

### 환경 설정 파일

- `.env`: 기본 환경 변수 설정
- `config/default.yml`: 기본 설정 (모든 환경에서 공통으로 사용)
- `config/local.yml`: 로컬 환경 설정
- `config/development.yml`: 개발 환경 설정
- `config/production.yml`: 프로덕션 환경 설정

### 환경별 실행 방법

```bash
# 패키지 설치
npm install --legacy-peer-deps

# 로컬 환경에서 서버 실행
npm run dev:local

# 개발 환경에서 서버 실행
npm run dev:development

# 프로덕션 환경에서 서버 실행
npm run dev:production

# 로컬 환경에서 빌드
npm run build:local

# 개발 환경에서 빌드
npm run build:development

# 프로덕션 환경에서 빌드
npm run build:production

# 로컬 환경에서 서버 실행
npm run start:local

# 개발 환경에서 서버 실행
npm run start:development

# 프로덕션 환경에서 서버 실행
npm run start:production
```

### 환경 설정 커스터마이징

1. `.env.example`을 복사하여 `.env` 파일을 생성합니다.
2. 필요에 따라 환경 변수를 수정합니다.
3. `config` 디렉토리의 YAML 파일을 수정하여 환경별 설정을 변경할 수 있습니다.