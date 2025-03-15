import winston from 'winston';
import appConfig from '../config';

// 로그 레벨 설정
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 로그 레벨 색상 설정
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 색상 추가
winston.addColors(colors);

// 로그 포맷 설정
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 로거 생성
const logger = winston.createLogger({
  level: appConfig.logging.level,
  levels,
  format,
  transports: [
    // 콘솔 출력
    new winston.transports.Console(),
    // 파일 출력 (에러 로그)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // 파일 출력 (모든 로그)
    new winston.transports.File({ filename: 'logs/all.log' }),
  ],
});

// 개발 환경에서는 더 자세한 로그 출력
if (appConfig.env === 'development' || appConfig.env === 'local') {
  logger.level = 'debug';
}

// 로그 함수 정의
export const log = {
  error: (message: string, meta?: any) => logger.error(message, { meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { meta }),
  info: (message: string, meta?: any) => logger.info(message, { meta }),
  http: (message: string, meta?: any) => logger.http(message, { meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { meta }),
};

export default logger; 