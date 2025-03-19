#!/bin/sh
set -e

# 데이터베이스 디렉토리 확인
if [ ! -d "/app/data" ]; then
  echo "데이터 디렉토리 생성: /app/data"
  mkdir -p /app/data
  chmod 777 /app/data
fi

# 로그 디렉토리 확인
if [ ! -d "/app/logs" ]; then
  echo "로그 디렉토리 생성: /app/logs"
  mkdir -p /app/logs
  chmod 777 /app/logs
fi

# 데이터베이스 초기화
echo "데이터베이스 초기화 시작..."
node /app/init-db.js

# 애플리케이션 실행
echo "애플리케이션 실행 시작..."
export NODE_ENV=production
export APP_ENV=production
exec node /app/node_modules/.bin/next start 