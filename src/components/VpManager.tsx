'use client';

import React, { useState, useEffect } from 'react';

interface VP {
  id: string;
  holder_did: string;
  verifier: string;
  presentation_data: string;
  verification_result?: string;
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
  user_id?: string;
  created_at: string;
}

const VpManager: React.FC = () => {
  const [vps, setVps] = useState<VP[]>([]);
  const [vcs, setVcs] = useState<VC[]>([]);
  const [dids, setDids] = useState<DID[]>([]);
  const [selectedVp, setSelectedVp] = useState<VP | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // VP 생성 폼 상태
  const [holderDid, setHolderDid] = useState<string>('');
  const [selectedVcIds, setSelectedVcIds] = useState<string[]>([]);
  const [verifier, setVerifier] = useState<string>('성인 인증 서비스');
  const [requiredAge, setRequiredAge] = useState<number>(19);
  
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
      setVps(data);
      
      if (data.length > 0 && !selectedVp) {
        setSelectedVp(data[0]);
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
      if (!response.ok) {
        throw new Error('VC 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setVcs(data);
    } catch (err: any) {
      console.error('VC 목록 불러오기 오류:', err);
    }
  };

  // DID 목록 불러오기
  const fetchDids = async () => {
    try {
      const response = await fetch('/api/did');
      if (!response.ok) {
        throw new Error('DID 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setDids(data);
      
      if (data.length > 0) {
        setHolderDid(data[0].did);
      }
    } catch (err: any) {
      console.error('DID 목록 불러오기 오류:', err);
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

  // VP 생성 및 검증 함수
  const handleVerifyVp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!holderDid || selectedVcIds.length === 0) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // 선택된 VC 데이터 가져오기
      const selectedVcs = vcs.filter(vc => selectedVcIds.includes(vc.id));
      
      // VP 생성 및 검증 API 호출
      const vpData = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        'type': ['VerifiablePresentation'],
        'holder': holderDid,
        'verifiableCredential': selectedVcs.map(vc => JSON.parse(vc.credential_data)),
        'proof': {
          'type': 'Ed25519Signature2020',
          'created': new Date().toISOString(),
          'verificationMethod': `${holderDid}#keys-1`,
          'proofPurpose': 'authentication',
          'challenge': '123456',
          'domain': 'example.com',
          'jws': 'eyJhbGciOiJFZERTQSJ9.DUMMY_SIGNATURE_FOR_DEVELOPMENT.DUMMY'
        }
      };
      
      const response = await fetch('/api/vp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vp: vpData,
          verifier: verifier,
          requiredAge: requiredAge
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'VP 검증에 실패했습니다.');
      }
      
      const data = await response.json();
      
      // VP 목록 다시 불러오기
      fetchVps();
      
      setSuccess('VP가 성공적으로 생성되고 검증되었습니다.');
      
      // 폼 초기화
      setSelectedVcIds([]);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 생성/검증 오류:', err);
    } finally {
      setLoading(false);
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

  // 검증 결과 파싱 함수
  const parseVerificationResult = (resultStr?: string) => {
    if (!resultStr) return null;
    
    try {
      return JSON.parse(resultStr);
    } catch (err) {
      console.error('검증 결과 파싱 오류:', err);
      return { error: '검증 결과 파싱 오류' };
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
      
      {/* VP 생성 및 검증 폼 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">VP 생성 및 검증</h3>
        <form onSubmit={handleVerifyVp} className="bg-gray-50 p-4 rounded">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              홀더 DID
            </label>
            <select
              value={holderDid}
              onChange={(e) => setHolderDid(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">홀더 DID 선택</option>
              {dids.map((did) => (
                <option key={did.id} value={did.did}>
                  {did.did}
                </option>
              ))}
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
                vcs.map((vc) => (
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
                ))
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              검증자
            </label>
            <input
              type="text"
              value={verifier}
              onChange={(e) => setVerifier(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              요구 연령
            </label>
            <input
              type="number"
              value={requiredAge}
              onChange={(e) => setRequiredAge(parseInt(e.target.value))}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              min="1"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !holderDid || selectedVcIds.length === 0}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? '처리 중...' : 'VP 생성 및 검증하기'}
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
                    <div className="text-xs">검증자: {vp.verifier}</div>
                    <div className="text-xs text-gray-500">{new Date(vp.created_at).toLocaleString()}</div>
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
                  <span className="font-semibold">검증자:</span>
                  <div className="text-sm">{selectedVp.verifier}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">생성일:</span>
                  <div className="text-sm">{new Date(selectedVp.created_at).toLocaleString()}</div>
                </div>
              </div>
              
              {selectedVp.verification_result && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">검증 결과</h3>
                  <div className="bg-gray-100 p-3 rounded">
                    {(() => {
                      const result = parseVerificationResult(selectedVp.verification_result);
                      if (!result) return <p>검증 결과가 없습니다.</p>;
                      
                      return (
                        <div>
                          <div className={`p-2 mb-2 rounded ${result.signatureValid && result.ageVerified ? 'bg-green-100' : 'bg-red-100'}`}>
                            <p className="font-medium">
                              {result.signatureValid && result.ageVerified 
                                ? '✅ 검증 성공' 
                                : '❌ 검증 실패'}
                            </p>
                          </div>
                          <div className="text-sm">
                            <p><span className="font-medium">서명 유효성:</span> {result.signatureValid ? '유효함' : '유효하지 않음'}</p>
                            <p><span className="font-medium">연령 검증:</span> {result.ageVerified ? '통과' : '실패'}</p>
                            <p><span className="font-medium">실제 연령:</span> {result.actualAge}세</p>
                            <p><span className="font-medium">요구 연령:</span> {result.requiredAge}세</p>
                            <p><span className="font-medium">검증 시간:</span> {new Date(result.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              <h3 className="text-lg font-semibold mb-2">VP 데이터</h3>
              <div className="bg-gray-100 p-3 rounded overflow-x-auto max-h-96">
                <pre className="text-sm break-all">
                  {JSON.stringify(parseVpData(selectedVp.presentation_data), null, 2)}
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