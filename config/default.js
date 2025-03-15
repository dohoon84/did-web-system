// NODE_CONFIG_ENV 환경 변수를 APP_ENV로 설정
process.env.NODE_CONFIG_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'development';

// 기본 설정 파일 내용을 그대로 유지
module.exports = require('./default.yml'); 