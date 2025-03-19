import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // API 경로에만 적용
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // OPTIONS 요청인 경우 CORS preflight 처리
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Max-Age', '86400'); // 24시간
      return response;
    }

    // 일반 요청인 경우
    const response = NextResponse.next();
    
    // CORS 헤더 설정
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    return response;
  }

  // API 경로가 아닌 경우 처리 없음
  return NextResponse.next();
}

// 미들웨어가 실행될 경로 지정
export const config = {
  matcher: '/api/:path*',
}; 