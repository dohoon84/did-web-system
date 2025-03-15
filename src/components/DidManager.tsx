'use client';

import React, { useState, useEffect } from 'react';

interface DID {
  id: string;
  did: string;
  did_document: string;
  user_id?: string;
  created_at: string;
}

const DidManager: React.FC = () => {
  const [dids, setDids] = useState<DID[]>([]);
  const [selectedDid, setSelectedDid] = useState<DID | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // DID 목록 불러오기
  const fetchDids = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/did');
      if (!response.ok) {
        throw new Error('DID 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setDids(data);
      
      if (data.length > 0 && !selectedDid) {
        setSelectedDid(data[0]);
      } else if (selectedDid && !data.find((d: DID) => d.id === selectedDid.id)) {
        // 선택된 DID가 삭제된 경우 선택 초기화
        setSelectedDid(data.length > 0 ? data[0] : null);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('DID 목록 불러오기 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 DID 목록 불러오기
  useEffect(() => {
    fetchDids();
  }, []);

  // 성공 메시지 타이머 설정
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // DID 생성 함수
  const handleCreateDid = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/did', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('DID 생성에 실패했습니다.');
      }
      
      const data = await response.json();
      setSuccess('DID가 성공적으로 생성되었습니다.');
      
      // DID 목록 다시 불러오기
      fetchDids();
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('DID 생성 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // DID 삭제 함수
  const handleDeleteDid = async (id: string) => {
    if (!confirm('정말로 이 DID를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/did/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('DID 삭제에 실패했습니다.');
      }
      
      const data = await response.json();
      setSuccess('DID가 성공적으로 삭제되었습니다.');
      
      // DID 목록 다시 불러오기
      fetchDids();
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('DID 삭제 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // DID 선택 함수
  const handleSelectDid = (did: DID) => {
    setSelectedDid(did);
  };

  // DID Document 파싱 함수
  const parseDidDocument = (didDocumentStr: string) => {
    try {
      return JSON.parse(didDocumentStr);
    } catch (err) {
      console.error('DID Document 파싱 오류:', err);
      return { error: 'DID Document 파싱 오류' };
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
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{success}</p>
        </div>
      )}
      
      <div className="mb-4">
        <button
          onClick={handleCreateDid}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {loading ? '생성 중...' : '새 DID 생성하기'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold mb-2">DID 목록</h3>
          {dids.length === 0 ? (
            <p className="text-gray-500">DID가 없습니다.</p>
          ) : (
            <div className="bg-gray-100 p-3 rounded overflow-y-auto max-h-96">
              <ul>
                {dids.map((did) => (
                  <li 
                    key={did.id} 
                    className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 ${selectedDid?.id === did.id ? 'bg-gray-200' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div 
                        className="flex-grow"
                        onClick={() => handleSelectDid(did)}
                      >
                        <div className="text-sm font-medium truncate">{did.did}</div>
                        <div className="text-xs text-gray-500">{new Date(did.created_at).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDid(did.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm ml-2"
                        title="DID 삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          {selectedDid ? (
            <>
              <h3 className="text-lg font-semibold mb-2">DID 상세 정보</h3>
              <div className="bg-gray-100 p-3 rounded mb-4">
                <div className="mb-2">
                  <span className="font-semibold">DID:</span>
                  <div className="text-sm break-all">{selectedDid.did}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">생성일:</span>
                  <div className="text-sm">{new Date(selectedDid.created_at).toLocaleString()}</div>
                </div>
                {selectedDid.user_id && (
                  <div className="mb-2">
                    <span className="font-semibold">사용자 ID:</span>
                    <div className="text-sm">{selectedDid.user_id}</div>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-semibold mb-2">DID Document</h3>
              <div className="bg-gray-100 p-3 rounded overflow-x-auto max-h-96">
                <pre className="text-sm break-all">
                  {JSON.stringify(parseDidDocument(selectedDid.did_document), null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">DID를 선택하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DidManager; 