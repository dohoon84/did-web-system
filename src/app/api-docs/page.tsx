'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    fetch('/api/swagger')
      .then(response => response.json())
      .then(data => setSpec(data))
      .catch(error => console.error('API 문서 로드 오류:', error));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">DID 관리 시스템 API 문서</h1>
      {spec ? (
        <SwaggerUI spec={spec} />
      ) : (
        <p>API 문서를 로드 중입니다...</p>
      )}
    </div>
  );
} 