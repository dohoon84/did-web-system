FROM node:20-alpine

# 필요한 시스템 패키지 설치
RUN apk add --no-cache python3 make g++ sqlite sqlite-dev

# cross-env 패키지 전역 설치
RUN npm install -g cross-env

# 작업 디렉토리 설정
WORKDIR /app

# 이미 빌드된 애플리케이션 복사 (로컬에서 빌드 후 복사하는 방식)
COPY .next /app/.next
COPY public /app/public
COPY package*.json /app/
COPY next.config.js /app/
COPY data /app/data
COPY config /app/config

# 런타임 의존성만 설치
ENV NODE_ENV=production
RUN npm install --legacy-peer-deps

# 데이터 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/data /app/logs && \
    chmod 777 /app/data /app/logs

# 초기화 스크립트 및 엔트리포인트 복사
COPY docker/init-db.js /app/init-db.js
COPY docker/entrypoint.sh /app/entrypoint.sh

# 엔트리포인트 실행 권한 부여
RUN chmod +x /app/entrypoint.sh

# 권한 설정
RUN chown -R node:node /app

# 사용자 변경
USER node

# 포트 설정
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production
ENV APP_ENV=production

# 애플리케이션 실행
CMD ["node", "/app/node_modules/.bin/next", "start"] 