'use client';

import React, { useState, useEffect } from 'react';
import { generateDid, storeDid, loadDid, deleteDid } from '../lib/did/didUtils';

const DidManager: React.FC = () => {
  const [didInfo, setDidInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // 컴포넌트 마운트 시 로컬 스토리지에서 DID 정보 로드
  useEffect(() => {
    setIsMounted(true);
    const loadedDid = loadDid();
    if (loadedDid) {
      setDidInfo(loadedDid);
    }
  }, []);

  // 클라이언트 사이드 렌더링 확인
  if (!isMounted) {
    return <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">DID 관리</h2>
      <p>로딩 중...</p>
    </div>;
  }

  // DID 생성 함수
  const handleGenerateDid = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newDidInfo = await generateDid();
      
      // 로컬 스토리지에 저장
      storeDid(newDidInfo.did, newDidInfo.didDocument, newDidInfo.privateKey);
      
      setDidInfo(newDidInfo);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('DID 생성 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // DID 삭제 함수
  const handleDeleteDid = () => {
    try {
      deleteDid();
      setDidInfo(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('DID 삭제 오류:', err);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">DID 관리</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {!didInfo ? (
        <div>
          <p className="mb-4">아직 DID가 생성되지 않았습니다. 새 DID를 생성하세요.</p>
          <button
            onClick={handleGenerateDid}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? '생성 중...' : 'DID 생성하기'}
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">내 DID</h3>
            <div className="bg-gray-100 p-3 rounded overflow-x-auto">
              <code className="text-sm break-all">{didInfo.did}</code>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">DID Document</h3>
            <div className="bg-gray-100 p-3 rounded overflow-x-auto max-h-60">
              <pre className="text-sm break-all">
                {JSON.stringify(didInfo.didDocument, null, 2)}
              </pre>
            </div>
          </div>
          
          <button
            onClick={handleDeleteDid}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            DID 삭제하기
          </button>
        </div>
      )}
    </div>
  );
};

export default DidManager; 