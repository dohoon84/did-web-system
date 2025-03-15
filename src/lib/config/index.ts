import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : process.env.NODE_ENV === 'development' 
      ? '.env.development' 
      : '.env.local'
});

const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'development';

// 설정 인터페이스
export interface ServerConfig {
  port: number;
  host: string;
}

export interface DatabaseConfig {
  type: string;
  path: string;
  initialize: boolean;
}

export interface ApiConfig {
  prefix: string;
  version: string;
}

export interface LoggingConfig {
  level: string;
  format: string;
}

export interface AppConfig {
  env: string;
  server: ServerConfig;
  database: DatabaseConfig;
  api: ApiConfig;
  logging: LoggingConfig;
}

// 앱 설정
export const appConfig: AppConfig = {
  env: APP_ENV,
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
  },
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    path: process.env.DB_PATH || './data/database.sqlite',
    initialize: process.env.DB_INITIALIZE !== 'false',
  },
  api: {
    prefix: process.env.API_PREFIX || '/api',
    version: process.env.API_VERSION || 'v1',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
};

// 설정 로그 출력
console.log(`애플리케이션 환경: ${appConfig.env}`);
console.log(`서버 설정: ${appConfig.server.host}:${appConfig.server.port}`);
console.log(`데이터베이스 설정: ${appConfig.database.type} (${appConfig.database.path})`);
console.log(`데이터베이스 초기화: ${appConfig.database.initialize ? '활성화' : '비활성화'}`);
console.log(`로깅 레벨: ${appConfig.logging.level}`);

export default appConfig; 