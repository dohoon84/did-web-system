# DID Web System Docker 설정

## 개요

이 디렉토리는 DID Web System을 Docker 컨테이너로 실행하기 위한 설정 파일을 포함하고 있습니다.

## 주요 파일

- `docker-compose.yml`: 컨테이너 구성 및 설정
- `Dockerfile`: 애플리케이션 이미지 빌드 명세
- `.dockerignore`: Docker 빌드 과정에서 제외할 파일 목록
- `.env.production`: 프로덕션 환경 변수 설정

## 볼륨 구성

Docker Compose에서는 다음과 같은 볼륨을 사용합니다:

- `./data`: 데이터베이스 파일을 저장하는 볼륨
- `./config`: 설정 파일 디렉토리
- `./logs`: 로그 파일 디렉토리

## 사용 방법

### 빌드 및 실행

```bash
# 프로젝트 루트 디렉토리에서 실행
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

### 상태 확인

```bash
docker compose -f docker/docker-compose.yml ps
```

### 로그 확인

```bash
docker compose -f docker/docker-compose.yml logs -f
```

### 중지

```bash
docker compose -f docker/docker-compose.yml down
```

## 웹 애플리케이션 접속

컨테이너가 성공적으로 실행되면 브라우저에서 다음 URL로 접속할 수 있습니다:

```
http://localhost:8080
```

## 주의사항

- 초기 실행 시 데이터베이스가 자동으로 초기화됩니다.
- 실제 프로덕션 환경에서는 적절한 보안 설정을 추가해야 합니다. 