'use client';

import React, { useState, useEffect } from 'react';

interface VP {
  id: string;
  vp_id: string;
  holder_did: string;
  vp_data: string;
  vp_hash?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface VC {
  id: string;
  issuer_did: string;
  subject_did: string;
  credential_type: string;
  credential_data: string;
  issuance_date: string;
  expiration_date?: string;
}

interface DID {
  id: string;
  did: string;
  did_document: string;
  private_key?: string;
  user_id?: string;
  created_at: string;
}

const VpManager: React.FC = () => {
  const [vps, setVps] = useState<VP[]>([]);
  const [vcs, setVcs] = useState<any[]>([]);
  const [dids, setDids] = useState<any[]>([]);
  const [selectedVp, setSelectedVp] = useState<VP | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // VP 생성 폼 상태
  const [holderDid, setHolderDid] = useState<string>('');
  const [selectedVcIds, setSelectedVcIds] = useState<string[]>([]);
  const [privateKey, setPrivateKey] = useState<string>('');
  
  // VP 목록 불러오기
  const fetchVps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/vp');
      if (!response.ok) {
        throw new Error('VP 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      // API 응답 구조 처리
      const vpsArray = data.success ? data.items || [] : Array.isArray(data) ? data : [];
      setVps(vpsArray);
      
      if (vpsArray.length > 0 && !selectedVp) {
        setSelectedVp(vpsArray[0]);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 목록 불러오기 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // VC 목록 불러오기
  const fetchVcs = async () => {
    try {
      const response = await fetch('/api/vc');
      const data = await response.json();
      
      if (response.ok) {
        // 응답 구조 확인 후 적절히 처리
        const vcsArray = data.success ? data.vcs || [] : Array.isArray(data) ? data : [];
        setVcs(vcsArray);
      } else {
        console.error('VC 목록을 불러오는데 실패했습니다:', data.message || '알 수 없는 오류');
      }
    } catch (err) {
      console.error('VC 목록 불러오기 오류:', err);
    }
  };

  // DID 목록 불러오기
  const fetchDids = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/did');
      const data = await response.json();
      
      if (response.ok) {
        // 응답 구조 확인 후 적절히 처리
        const didArray = data.success ? data.dids || [] : Array.isArray(data) ? data : [];
        setDids(didArray);
      } else {
        setError(data.message || 'DID 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || 'DID 목록을 불러오는데 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchVps();
    fetchVcs();
    fetchDids();
  }, []);

  // VP 선택 함수
  const handleSelectVp = (vp: VP) => {
    setSelectedVp(vp);
  };

  // VC 선택 핸들러
  const handleVcSelection = (vcId: string) => {
    setSelectedVcIds(prev => {
      if (prev.includes(vcId)) {
        return prev.filter(id => id !== vcId);
      } else {
        return [...prev, vcId];
      }
    });
  };

  // 선택된 DID의 Private Key 가져오기
  const getDidPrivateKey = (selectedDid: string) => {
    const didObj = dids.find(d => d.did === selectedDid);
    if (didObj && didObj.private_key) {
      setPrivateKey(didObj.private_key);
    } else {
      setPrivateKey('');
    }
  };

  // VP 생성 함수
  const handleCreateVp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!holderDid || selectedVcIds.length === 0 || !privateKey) {
      setError('모든 필드를 입력해주세요. DID 개인키가 필요합니다.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // VP 생성 API 호출
      const response = await fetch('/api/vp/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holderDid,
          vcIds: selectedVcIds,
          privateKey,
          types: ['IdentityPresentation']
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'VP 생성에 실패했습니다.');
      }
      
      const data = await response.json();
      
      // VP 생성 성공
      setSuccess('VP가 성공적으로 생성되었습니다.');
      
      // VP 검증 진행
      await verifyVp(data.vp, data.vpId);
      
      // VP 목록 다시 불러오기
      fetchVps();
      
      // 폼 초기화
      setSelectedVcIds([]);
      setPrivateKey('');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 생성 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // VP 검증 함수
  const verifyVp = async (vp: any, vpId?: string) => {
    try {
      const verifyResponse = await fetch('/api/vp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vpData: vp,
          vpId
        }),
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'VP 검증에 실패했습니다.');
      }
      
      const verifyData = await verifyResponse.json();
      
      if (verifyData.valid) {
        setSuccess(prev => (prev || '') + ' VP가 성공적으로 검증되었습니다.');
      } else {
        setError(`VP 검증 실패: ${verifyData.reason}`);
      }
      
      return verifyData;
    } catch (err: any) {
      console.error('VP 검증 오류:', err);
      return { valid: false, reason: err.message };
    }
  };

  // VP 데이터 파싱 함수
  const parseVpData = (vpDataStr: string) => {
    try {
      return JSON.parse(vpDataStr);
    } catch (err) {
      console.error('VP 데이터 파싱 오류:', err);
      return { error: 'VP 데이터 파싱 오류' };
    }
  };

  // VP 삭제 함수
  const handleDeleteVp = async (vpId: string) => {
    if (!confirm('정말로 이 VP를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/vp/${vpId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'VP 삭제에 실패했습니다.');
      }
      
      setSuccess('VP가 성공적으로 삭제되었습니다.');
      
      // 삭제된 VP가 현재 선택된 VP인 경우 선택 해제
      if (selectedVp?.id === vpId) {
        setSelectedVp(null);
      }
      
      // VP 목록 다시 불러오기
      fetchVps();
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 삭제 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">VP(Verifiable Presentation) 관리</h2>
      
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
      
      {/* VP 생성 폼 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">VP 생성</h3>
        <form onSubmit={handleCreateVp} className="bg-gray-50 p-4 rounded">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              홀더 DID
            </label>
            <select
              value={holderDid}
              onChange={(e) => {
                setHolderDid(e.target.value);
                getDidPrivateKey(e.target.value);
              }}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">홀더 DID 선택</option>
              {Array.isArray(dids) ? dids.map((did) => (
                <option key={did.id} value={did.did}>
                  {did.did}
                </option>
              )) : (
                <option value="" disabled>DID 목록을 불러올 수 없습니다</option>
              )}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              포함할 VC 선택
            </label>
            <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
              {vcs.length === 0 ? (
                <p className="text-gray-500">발급된 VC가 없습니다.</p>
              ) : (
                Array.isArray(vcs) ? vcs.map((vc) => (
                  <div key={vc.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`vc-${vc.id}`}
                      checked={selectedVcIds.includes(vc.id)}
                      onChange={() => handleVcSelection(vc.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`vc-${vc.id}`} className="text-sm">
                      {vc.credential_type} - {new Date(vc.issuance_date).toLocaleDateString()}
                    </label>
                  </div>
                )) : <p className="text-gray-500">VC 데이터를 불러올 수 없습니다.</p>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              개인키 (자동 입력 또는 직접 입력)
            </label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
              placeholder="DID 선택 시 자동 입력되거나 직접 입력하세요"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !holderDid || selectedVcIds.length === 0 || !privateKey}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? '처리 중...' : 'VP 생성하기'}
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold mb-2">VP 목록</h3>
          {vps.length === 0 ? (
            <p className="text-gray-500">생성된 VP가 없습니다.</p>
          ) : (
            <div className="bg-gray-100 p-3 rounded overflow-y-auto max-h-96">
              <ul>
                {vps.map((vp) => (
                  <li 
                    key={vp.id} 
                    className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 ${selectedVp?.id === vp.id ? 'bg-gray-200' : ''}`}
                    onClick={() => handleSelectVp(vp)}
                  >
                    <div className="text-sm font-medium truncate">홀더: {vp.holder_did}</div>
                    <div className="text-xs">상태: {vp.status}</div>
                    <div className="text-xs text-gray-500">{new Date(vp.created_at).toLocaleString()}</div>
                    <div className="flex mt-1 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVp(vp.id);
                        }}
                        className="text-xs bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          {selectedVp ? (
            <>
              <h3 className="text-lg font-semibold mb-2">VP 상세 정보</h3>
              <div className="bg-gray-100 p-3 rounded mb-4">
                <div className="mb-2">
                  <span className="font-semibold">홀더:</span>
                  <div className="text-sm break-all">{selectedVp.holder_did}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">VP ID:</span>
                  <div className="text-sm">{selectedVp.vp_id}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">상태:</span>
                  <div className="text-sm">{selectedVp.status}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">생성일:</span>
                  <div className="text-sm">{new Date(selectedVp.created_at).toLocaleString()}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">해시:</span>
                  <div className="text-xs break-all">{selectedVp.vp_hash || '해시 정보 없음'}</div>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">VP 데이터</h3>
              <div className="bg-gray-100 p-3 rounded overflow-x-auto max-h-96">
                <pre className="text-sm break-all">
                  {JSON.stringify(parseVpData(selectedVp.vp_data), null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">VP를 선택하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VpManager; 