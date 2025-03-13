'use client';

import React, { useState, useEffect } from 'react';
import { loadDid } from '../lib/did/didUtils';
import { loadVCList } from '../lib/did/vcUtils';
import { createVP, storeVP, loadVPList, deleteVP, verifyVP } from '../lib/did/vpUtils';

const VpManager: React.FC = () => {
  const [didInfo, setDidInfo] = useState<any>(null);
  const [vcList, setVcList] = useState<any[]>([]);
  const [vpList, setVpList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  // VP 생성 폼 상태
  const [selectedVCs, setSelectedVCs] = useState<string[]>([]);
  const [challenge, setChallenge] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  
  // 검증 상태
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [vpToVerify, setVpToVerify] = useState<string>('');

  // 컴포넌트 마운트 시 로컬 스토리지에서 DID, VC, VP 정보 로드
  useEffect(() => {
    setIsMounted(true);
    const loadedDid = loadDid();
    if (loadedDid) {
      setDidInfo(loadedDid);
    }
    
    const loadedVCs = loadVCList();
    setVcList(loadedVCs);
    
    const loadedVPs = loadVPList();
    setVpList(loadedVPs);
  }, []);

  // 클라이언트 사이드 렌더링 확인
  if (!isMounted) {
    return <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">VP(Verifiable Presentation) 관리</h2>
      <p>로딩 중...</p>
    </div>;
  }

  // VP 생성 함수
  const handleCreateVP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!didInfo) {
      setError('DID가 없습니다. 먼저 DID를 생성해주세요.');
      return;
    }
    
    if (selectedVCs.length === 0) {
      setError('하나 이상의 VC를 선택해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // 선택된 VC의 JWS 목록 가져오기
      const vcJwsList = selectedVCs.map(vcId => {
        const vc = vcList.find(vc => vc.id === vcId);
        return vc.jws;
      });
      
      // VP 생성
      const { jws, vp } = await createVP(
        didInfo.did,
        didInfo.privateKey,
        vcJwsList,
        challenge || undefined,
        domain || undefined
      );
      
      // 로컬 스토리지에 저장
      storeVP(jws, vp);
      
      // 상태 업데이트
      setVpList([...vpList, { id: vp.id, jws, vp }]);
      setSuccess('VP가 성공적으로 생성되었습니다.');
      
      // 폼 초기화
      setSelectedVCs([]);
      setChallenge('');
      setDomain('');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 생성 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // VP 삭제 함수
  const handleDeleteVP = (vpId: string) => {
    try {
      deleteVP(vpId);
      setVpList(vpList.filter(vp => vp.id !== vpId));
      setSuccess('VP가 삭제되었습니다.');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 삭제 오류:', err);
    }
  };

  // VP 검증 함수
  const handleVerifyVP = async () => {
    if (!vpToVerify) {
      setError('검증할 VP를 선택해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const selectedVP = vpList.find(vp => vp.id === vpToVerify);
      if (!selectedVP) {
        throw new Error('선택한 VP를 찾을 수 없습니다.');
      }
      
      // VP 검증
      const result = await verifyVP(
        selectedVP.jws, 
        didInfo.didDocument
      );
      
      setVerifyResult(result);
      
      if (result.isValid) {
        setSuccess('VP가 성공적으로 검증되었습니다.');
      } else {
        setError(`VP 검증 실패: ${result.error}`);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 검증 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // VC 선택 핸들러
  const handleVCSelection = (vcId: string) => {
    setSelectedVCs(prev => {
      if (prev.includes(vcId)) {
        return prev.filter(id => id !== vcId);
      } else {
        return [...prev, vcId];
      }
    });
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
      
      {!didInfo ? (
        <div className="mb-4">
          <p>DID가 없습니다. 먼저 DID를 생성해주세요.</p>
        </div>
      ) : vcList.length === 0 ? (
        <div className="mb-4">
          <p>VC가 없습니다. 먼저 VC를 발급해주세요.</p>
        </div>
      ) : (
        <>
          {/* VP 생성 폼 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">VP 생성</h3>
            <form onSubmit={handleCreateVP}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  포함할 VC 선택
                </label>
                <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
                  {vcList.map((vc) => (
                    <div key={vc.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`vc-${vc.id}`}
                        checked={selectedVCs.includes(vc.id)}
                        onChange={() => handleVCSelection(vc.id)}
                        className="mr-2"
                      />
                      <label htmlFor={`vc-${vc.id}`} className="text-sm">
                        {vc.id} - {vc.vc.credentialSubject[Object.keys(vc.vc.credentialSubject).find(key => key !== 'id') || '']}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  챌린지 (선택사항)
                </label>
                <input
                  type="text"
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="검증자가 제공한 챌린지 값"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  도메인 (선택사항)
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="검증자의 도메인"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || selectedVCs.length === 0}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {loading ? '생성 중...' : 'VP 생성하기'}
              </button>
            </form>
          </div>
          
          {/* VP 목록 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">VP 목록</h3>
            {vpList.length === 0 ? (
              <p>생성된 VP가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {vpList.map((vp) => (
                  <div key={vp.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">ID: {vp.id}</h4>
                      <button
                        onClick={() => handleDeleteVP(vp.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                    <p className="mb-2">
                      <span className="font-medium">소유자:</span> {vp.vp.holder}
                    </p>
                    <p className="mb-2">
                      <span className="font-medium">포함된 VC 수:</span> {vp.vp.verifiableCredential.length}
                    </p>
                    <div className="mt-2">
                      <p className="font-medium">VP 내용:</p>
                      <pre className="bg-gray-100 p-2 rounded text-sm mt-1 max-h-40 overflow-y-auto">
                        {JSON.stringify(vp.vp, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* VP 검증 */}
          {vpList.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">VP 검증</h3>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  검증할 VP 선택
                </label>
                <select
                  value={vpToVerify}
                  onChange={(e) => setVpToVerify(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">선택하세요</option>
                  {vpList.map((vp) => (
                    <option key={vp.id} value={vp.id}>
                      {vp.id} - VC {vp.vp.verifiableCredential.length}개 포함
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleVerifyVP}
                disabled={loading || !vpToVerify}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {loading ? '검증 중...' : 'VP 검증하기'}
              </button>
              
              {verifyResult && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">검증 결과:</h4>
                  <div className={`p-3 rounded ${verifyResult.isValid ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p>{verifyResult.isValid ? '유효한 VP입니다.' : `유효하지 않은 VP: ${verifyResult.error}`}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VpManager; 