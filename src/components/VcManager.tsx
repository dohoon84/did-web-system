'use client';

import React, { useState, useEffect } from 'react';
import { loadDid } from '../lib/did/didUtils';
import { createVC, storeVC, loadVCList, deleteVC, verifyVC } from '../lib/did/vcUtils';

const VcManager: React.FC = () => {
  const [didInfo, setDidInfo] = useState<any>(null);
  const [vcList, setVcList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  // VC 발급 폼 상태
  const [subjectDid, setSubjectDid] = useState<string>('');
  const [claimType, setClaimType] = useState<string>('');
  const [claimValue, setClaimValue] = useState<string>('');
  
  // 검증 상태
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [vcToVerify, setVcToVerify] = useState<string>('');

  // 컴포넌트 마운트 시 로컬 스토리지에서 DID 및 VC 정보 로드
  useEffect(() => {
    setIsMounted(true);
    const loadedDid = loadDid();
    if (loadedDid) {
      setDidInfo(loadedDid);
    }
    
    const loadedVCs = loadVCList();
    setVcList(loadedVCs);
  }, []);

  // 클라이언트 사이드 렌더링 확인
  if (!isMounted) {
    return <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">VC(Verifiable Credential) 관리</h2>
      <p>로딩 중...</p>
    </div>;
  }

  // VC 발급 함수
  const handleIssueVC = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!didInfo) {
      setError('DID가 없습니다. 먼저 DID를 생성해주세요.');
      return;
    }
    
    if (!subjectDid || !claimType || !claimValue) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // 클레임 객체 생성
      const claims: Record<string, any> = {};
      claims[claimType] = claimValue;
      
      // VC 생성
      const { jws, vc } = await createVC(
        didInfo.did,
        didInfo.privateKey,
        subjectDid,
        claims
      );
      
      // 로컬 스토리지에 저장
      storeVC(jws, vc);
      
      // 상태 업데이트
      setVcList([...vcList, { id: vc.id, jws, vc }]);
      setSuccess('VC가 성공적으로 발급되었습니다.');
      
      // 폼 초기화
      setSubjectDid('');
      setClaimType('');
      setClaimValue('');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VC 발급 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // VC 삭제 함수
  const handleDeleteVC = (vcId: string) => {
    try {
      deleteVC(vcId);
      setVcList(vcList.filter(vc => vc.id !== vcId));
      setSuccess('VC가 삭제되었습니다.');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VC 삭제 오류:', err);
    }
  };

  // VC 검증 함수
  const handleVerifyVC = async () => {
    if (!vcToVerify) {
      setError('검증할 VC를 선택해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const selectedVC = vcList.find(vc => vc.id === vcToVerify);
      if (!selectedVC) {
        throw new Error('선택한 VC를 찾을 수 없습니다.');
      }
      
      // VC 검증
      const result = await verifyVC(selectedVC.jws, didInfo.didDocument);
      setVerifyResult(result);
      
      if (result.isValid) {
        setSuccess('VC가 성공적으로 검증되었습니다.');
      } else {
        setError(`VC 검증 실패: ${result.error}`);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VC 검증 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">VC(Verifiable Credential) 관리</h2>
      
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
      ) : (
        <>
          {/* VC 발급 폼 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">VC 발급</h3>
            <form onSubmit={handleIssueVC}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Subject DID
                </label>
                <input
                  type="text"
                  value={subjectDid}
                  onChange={(e) => setSubjectDid(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="did:key:..."
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  클레임 타입
                </label>
                <input
                  type="text"
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="예: name, age, email 등"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  클레임 값
                </label>
                <input
                  type="text"
                  value={claimValue}
                  onChange={(e) => setClaimValue(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="클레임 값 입력"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {loading ? '발급 중...' : 'VC 발급하기'}
              </button>
            </form>
          </div>
          
          {/* VC 목록 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">VC 목록</h3>
            {vcList.length === 0 ? (
              <p>발급된 VC가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {vcList.map((vc) => (
                  <div key={vc.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">ID: {vc.id}</h4>
                      <button
                        onClick={() => handleDeleteVC(vc.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                    <p className="mb-2">
                      <span className="font-medium">발급자:</span> {vc.vc.issuer}
                    </p>
                    <p className="mb-2">
                      <span className="font-medium">대상자:</span> {vc.vc.credentialSubject.id}
                    </p>
                    <p className="mb-2">
                      <span className="font-medium">발급일:</span> {new Date(vc.vc.issuanceDate).toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <p className="font-medium">클레임:</p>
                      <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                        {JSON.stringify(vc.vc.credentialSubject, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* VC 검증 */}
          {vcList.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">VC 검증</h3>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  검증할 VC 선택
                </label>
                <select
                  value={vcToVerify}
                  onChange={(e) => setVcToVerify(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">선택하세요</option>
                  {vcList.map((vc) => (
                    <option key={vc.id} value={vc.id}>
                      {vc.id} - {vc.vc.credentialSubject.id}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleVerifyVC}
                disabled={loading || !vcToVerify}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {loading ? '검증 중...' : 'VC 검증하기'}
              </button>
              
              {verifyResult && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">검증 결과:</h4>
                  <div className={`p-3 rounded ${verifyResult.isValid ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p>{verifyResult.isValid ? '유효한 VC입니다.' : `유효하지 않은 VC: ${verifyResult.error}`}</p>
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

export default VcManager; 