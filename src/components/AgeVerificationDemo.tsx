'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  birth_date: string;
}

interface DID {
  id: string;
  did: string;
  user_id?: string;
}

interface VC {
  id: string;
  issuer_did: string;
  subject_did: string;
  credential_type: string;
  credential_data: string;
  issuance_date: string;
}

interface Issuer {
  id: string;
  name: string;
  did: string;
  organization?: string;
  description?: string;
}

const AgeVerificationDemo: React.FC = () => {
  // 상태 관리
  const [step, setStep] = useState<number>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [dids, setDids] = useState<DID[]>([]);
  const [vcs, setVcs] = useState<VC[]>([]);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 선택된 값들
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [userDid, setUserDid] = useState<string>('');
  const [selectedVc, setSelectedVc] = useState<string>('');
  const [requiredAge, setRequiredAge] = useState<number>(19);
  const [verifier, setVerifier] = useState<string>('성인 인증 서비스');
  
  // 결과
  const [vcResult, setVcResult] = useState<any>(null);
  const [vpResult, setVpResult] = useState<any>(null);
  
  // 데이터 불러오기
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        console.log('데이터 로딩 시작...');
        
        // 1. 사용자 목록 로드
        await fetchUsers();
        console.log('사용자 목록 로드 완료');
        
        // 2. 발급자 목록 로드
        await fetchIssuers();
        console.log('발급자 목록 로드 완료');
        
        // 3. DID 목록 로드
        await fetchDids();
        console.log('DID 목록 로드 완료');
        
        // 4. VC 목록 로드
        await fetchVcs();
        console.log('VC 목록 로드 완료');
        
        console.log('모든 데이터 로딩 완료');
      } catch (err: any) {
        console.error('데이터 로딩 오류:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/user');
      if (!response.ok) throw new Error('사용자 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setUsers(data);
      if (data.length > 0) {
        setSelectedUser(data[0].id);
        // 사용자가 로드되면 해당 사용자의 DID를 찾아 설정
        if (dids.length > 0) {
          updateUserDid(data[0].id);
        }
      }
    } catch (err: any) {
      console.error('사용자 목록 불러오기 오류:', err);
    }
  };
  
  // 사용자 DID 설정
  const updateUserDid = (userId: string) => {
    if (dids.length > 0) {
      const userDidObj = dids.find((did: DID) => did.user_id === userId);
      if (userDidObj) {
        console.log('사용자 DID 찾음:', userDidObj);
        setUserDid(userDidObj.did);
      } else {
        console.log('사용자 DID를 찾지 못함');
        setUserDid('');
      }
    }
  };

  const fetchDids = async () => {
    try {
      const response = await fetch('/api/did');
      if (!response.ok) throw new Error('DID 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      console.log('DID 목록:', data);
      setDids(data);
      
      // 사용자 DID 설정
      if (selectedUser) {
        updateUserDid(selectedUser);
      }
    } catch (err: any) {
      console.error('DID 목록 불러오기 오류:', err);
    }
  };
  
  const fetchVcs = async () => {
    try {
      const response = await fetch('/api/vc');
      if (!response.ok) throw new Error('VC 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setVcs(data);
      if (data.length > 0) setSelectedVc(data[0].id);
    } catch (err: any) {
      console.error('VC 목록 불러오기 오류:', err);
    }
  };
  
  const fetchIssuers = async () => {
    try {
      const response = await fetch('/api/issuer');
      if (!response.ok) throw new Error('발급자 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setIssuers(data);
      if (data.length > 0) setSelectedIssuer(data[0].id);
    } catch (err: any) {
      console.error('발급자 목록 불러오기 오류:', err);
    }
  };
  
  // 사용자 선택 변경 핸들러
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    updateUserDid(userId);
  };
  
  // VC 발급 처리
  const handleIssueVC = async () => {
    if (!selectedIssuer || !userDid || !selectedUser) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    // 선택된 발급자의 DID 가져오기
    const issuer = issuers.find(issuer => issuer.id === selectedIssuer);
    if (!issuer) {
      setError('유효한 발급자를 선택해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/vc/issue/age', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerDid: issuer.did,
          subjectDid: userDid,
          userId: selectedUser,
          minAge: requiredAge
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'VC 발급에 실패했습니다.');
      }
      
      const data = await response.json();
      setVcResult(data);
      setSuccess('VC가 성공적으로 발급되었습니다.');
      
      // 데이터 다시 불러오기
      await fetchUsers();
      await fetchIssuers();
      await fetchDids();
      await fetchVcs();
      
      // 다음 단계로 이동
      setTimeout(() => {
        setStep(2);
      }, 1500);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VC 발급 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // VP 생성 및 검증 처리
  const handleVerifyVP = async () => {
    if (!userDid || !selectedVc) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // 선택된 VC 데이터 가져오기
      const selectedVcObj = vcs.find(vc => vc.id === selectedVc);
      if (!selectedVcObj) throw new Error('선택된 VC를 찾을 수 없습니다.');
      
      // VP 생성 및 검증 API 호출
      const vpData = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        'type': ['VerifiablePresentation'],
        'holder': userDid,
        'verifiableCredential': [JSON.parse(selectedVcObj.credential_data)],
        'proof': {
          'type': 'Ed25519Signature2020',
          'created': new Date().toISOString(),
          'verificationMethod': `${userDid}#keys-1`,
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
      setVpResult(data);
      
      // 검증 결과에 따라 메시지 설정
      if (data.verificationResult && data.verificationResult.ageVerified) {
        setSuccess('성인 인증에 성공했습니다!');
      } else {
        setError('성인 인증에 실패했습니다.');
      }
      
      // 다음 단계로 이동
      setTimeout(() => {
        setStep(3);
      }, 1500);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VP 생성/검증 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // 결과 파싱 함수
  const parseVerificationResult = (result: any) => {
    if (!result) return null;
    
    // 이미 객체인 경우 그대로 반환
    if (typeof result === 'object') return result;
    
    // 문자열인 경우 파싱 시도
    if (typeof result === 'string') {
      try {
        return JSON.parse(result);
      } catch (err) {
        console.error('검증 결과 파싱 오류:', err);
        return { error: '검증 결과 파싱 오류' };
      }
    }
    
    return null;
  };
  
  // 단계별 렌더링
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">1단계: 연령 인증 VC 발급</h2>
            <p className="mb-4 text-gray-600">
              연령 인증을 위한 Verifiable Credential(VC)을 발급합니다. 이 VC는 사용자의 연령 정보를 포함하며, 
              나중에 성인 인증이 필요한 서비스에서 사용됩니다.
            </p>
            
            <div className="bg-gray-50 p-4 rounded mb-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  사용자 선택
                </label>
                <select
                  value={selectedUser}
                  onChange={handleUserChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">사용자 선택</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({new Date(user.birth_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  발급자 선택
                </label>
                <select
                  value={selectedIssuer}
                  onChange={(e) => setSelectedIssuer(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">발급자 선택</option>
                  {issuers.map((issuer) => (
                    <option key={issuer.id} value={issuer.id}>
                      {issuer.name} ({issuer.organization || '소속 없음'})
                    </option>
                  ))}
                </select>
                {issuers.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    등록된 발급자가 없습니다. 먼저 발급자를 등록해주세요.
                  </p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  사용자 DID
                </label>
                <input
                  type="text"
                  value={userDid}
                  onChange={(e) => setUserDid(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="사용자 DID"
                  readOnly
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  최소 연령 요구사항
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
                onClick={handleIssueVC}
                disabled={loading || !selectedUser || !selectedIssuer || !userDid}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {loading ? '처리 중...' : 'VC 발급'}
              </button>
            </div>
            
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
            
            {vcResult && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">발급된 VC</h3>
                <div className="bg-gray-100 p-3 rounded overflow-x-auto max-h-60">
                  <pre className="text-sm break-all">
                    {JSON.stringify(vcResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
        
      case 2:
        return (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">2단계: 성인 인증 서비스 이용</h2>
            <p className="mb-4 text-gray-600">
              성인 인증이 필요한 서비스를 이용하기 위해 발급받은 VC를 제출하고 검증합니다.
              이 과정에서 Verifiable Presentation(VP)이 생성되고 검증됩니다.
            </p>
            
            <div className="bg-gray-50 p-4 rounded mb-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  사용자 DID (홀더)
                </label>
                <select
                  value={userDid}
                  onChange={(e) => setUserDid(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">사용자 DID 선택</option>
                  {dids.map((did) => (
                    <option key={did.id} value={did.did}>
                      {did.did}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  제출할 VC
                </label>
                <select
                  value={selectedVc}
                  onChange={(e) => setSelectedVc(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">VC 선택</option>
                  {vcs.map((vc) => (
                    <option key={vc.id} value={vc.id}>
                      {vc.credential_type} - {new Date(vc.issuance_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
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
                onClick={handleVerifyVP}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {loading ? '검증 중...' : '성인 인증하기'}
              </button>
            </div>
            
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
            
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                이전 단계
              </button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">3단계: 인증 결과</h2>
            
            {vpResult && vpResult.verificationResult && (
              <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded mb-4">
                  {(() => {
                    const result = parseVerificationResult(vpResult.verificationResult);
                    if (!result) return <p>검증 결과가 없습니다.</p>;
                    
                    return (
                      <div>
                        <div className={`p-4 mb-4 rounded text-center ${result.ageVerified ? 'bg-green-100' : 'bg-red-100'}`}>
                          <h3 className="text-xl font-bold mb-2">
                            {result.ageVerified 
                              ? '✅ 성인 인증 성공' 
                              : '❌ 성인 인증 실패'}
                          </h3>
                          <p className="text-lg">
                            {result.ageVerified 
                              ? '요청하신 서비스를 이용하실 수 있습니다.' 
                              : '연령 제한으로 인해 서비스를 이용하실 수 없습니다.'}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded border">
                            <h4 className="font-semibold mb-2">인증 정보</h4>
                            <div className="text-sm">
                              <p><span className="font-medium">서명 유효성:</span> {result.signatureValid ? '유효함' : '유효하지 않음'}</p>
                              <p><span className="font-medium">연령 검증:</span> {result.ageVerified ? '통과' : '실패'}</p>
                              <p><span className="font-medium">실제 연령:</span> {result.actualAge}세</p>
                              <p><span className="font-medium">요구 연령:</span> {result.requiredAge}세</p>
                              <p><span className="font-medium">검증 시간:</span> {new Date(result.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded border">
                            <h4 className="font-semibold mb-2">검증자 정보</h4>
                            <div className="text-sm">
                              <p><span className="font-medium">검증자:</span> {vpResult.verifier}</p>
                              <p><span className="font-medium">VP ID:</span> {vpResult.vpId}</p>
                              <p><span className="font-medium">생성 시간:</span> {vpResult.timestamp ? new Date(vpResult.timestamp).toLocaleString() : '정보 없음'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setStep(2)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                이전 단계
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setVcResult(null);
                  setVpResult(null);
                  setError(null);
                  setSuccess(null);
                }}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                처음부터 다시 시작
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // 진행 상태 표시
  const renderProgress = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
            1
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
            2
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
            3
          </div>
        </div>
        <div className="flex justify-between mt-1 text-sm text-gray-600">
          <div className="w-8 text-center">VC 발급</div>
          <div className="w-8 text-center">VP 검증</div>
          <div className="w-8 text-center">결과</div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">DID 기반 연령 인증 데모</h2>
      <p className="mb-6 text-gray-600">
        이 데모는 DID(Decentralized Identifier)와 VC(Verifiable Credential), VP(Verifiable Presentation)를 
        활용한 연령 인증 과정을 보여줍니다. 사용자는 자신의 연령 정보가 담긴 VC를 발급받고, 
        이를 VP로 제출하여 성인 인증을 수행할 수 있습니다.
      </p>
      
      {renderProgress()}
      {renderStep()}
    </div>
  );
};

export default AgeVerificationDemo; 