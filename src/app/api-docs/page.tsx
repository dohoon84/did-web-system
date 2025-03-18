'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/swagger')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP 오류: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('API 문서 로드 오류:', error);
        setError(error.message || '알 수 없는 오류가 발생했습니다.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">DID 관리 시스템 API 문서</h1>
      <p className="mb-4 text-gray-600">
        이 문서는 DID, VC, VP 관리를 위한 모든 API 목록을 제공합니다.
      </p>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">오류 발생! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : spec ? (
        <div className="border rounded-lg shadow-lg overflow-hidden">
          <SwaggerUI spec={spec} />
        </div>
      ) : (
        <p>API 문서를 불러올 수 없습니다.</p>
      )}
    </div>
  );
} 