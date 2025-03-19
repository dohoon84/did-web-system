#!/bin/bash
set -e

# 프로젝트 루트 디렉토리로 이동
cd ..

# 로컬에서 애플리케이션 빌드
echo "로컬에서 애플리케이션 빌드 중..."
npm run build:production

# Docker 이미지 빌드
echo "Docker 이미지 빌드 중..."
docker build -f docker/Dockerfile -t did-web-system:latest .

echo "빌드 완료! 다음 명령어로 실행 가능:"
echo "docker compose -f docker/docker-compose.yml up -d" 
