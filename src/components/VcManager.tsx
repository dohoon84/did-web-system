'use client';

import React, { useState, useEffect } from 'react';

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

interface User {
  id: string;
  name: string;
  email?: string;
  birth_date: string;
  created_at?: string;
}

interface Issuer {
  id: string;
  name: string;
  did: string;
  organization?: string;
  created_at?: string;
}

// DID와 소유자 정보를 연결하는 인터페이스
interface DidWithOwner extends DID {
  owner_name?: string;
  owner_type?: 'user' | 'issuer';
  organization?: string;
}

const VcManager: React.FC = () => {
  const [vcs, setVcs] = useState<VC[]>([]);
  const [dids, setDids] = useState<DidWithOwner[]>([]);
  const [selectedVc, setSelectedVc] = useState<VC | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // VC 발급 폼 상태
  const [issuerDid, setIssuerDid] = useState<string>('');
  const [subjectDid, setSubjectDid] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [minAge, setMinAge] = useState<number>(19);
  
  // 발급자와 사용자 정보
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // 발급자와 대상자 정보 매핑
  const [issuerMap, setIssuerMap] = useState<Record<string, Issuer>>({});
  const [userDidMap, setUserDidMap] = useState<Record<string, User>>({});
  
  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    loadAllData();
  }, []);

  // 모든 데이터 로드 함수
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('데이터 로딩 시작...');
      
      // 1. 사용자 목록 로드
      const userData = await loadUsers();
      console.log('사용자 목록 로드 완료:', userData.length);
      
      // 2. 발급자 목록 로드
      const issuerData = await loadIssuers();
      console.log('발급자 목록 로드 완료:', issuerData.length);
      
      // 3. DID 목록 로드 (사용자와 발급자 정보 직접 전달)
      const didData = await loadDids(userData, issuerData);
      console.log('DID 목록 로드 완료:', didData.length);
      
      // 4. 매핑 생성
      createMappings(userData, issuerData, didData);
      console.log('매핑 생성 완료');
      
      // 5. VC 목록 로드
      const vcData = await loadVcs();
      console.log('VC 목록 로드 완료:', vcData.length);
      
      console.log('모든 데이터 로딩 완료');
    } catch (err: any) {
      console.error('데이터 로딩 오류:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 목록 로드
  const loadUsers = async (): Promise<User[]> => {
    try {
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error('사용자 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log('사용자 데이터:', data);
      setUsers(data);
      
      if (data.length > 0) {
        setUserId(data[0].id);
      }
      
      return data;
    } catch (err: any) {
      console.error('사용자 목록 불러오기 오류:', err);
      return [];
    }
  };

  // 발급자 목록 로드
  const loadIssuers = async (): Promise<Issuer[]> => {
    try {
      const response = await fetch('/api/issuer');
      if (!response.ok) {
        throw new Error('발급자 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log('발급자 데이터:', data);
      setIssuers(data);
      return data;
    } catch (err: any) {
      console.error('발급자 목록 불러오기 오류:', err);
      return [];
    }
  };

  // DID 목록 로드 - 사용자와 발급자 데이터를 직접 매개변수로 받음
  const loadDids = async (users: User[], issuers: Issuer[]): Promise<DidWithOwner[]> => {
    try {
      const response = await fetch('/api/did');
      if (!response.ok) {
        throw new Error('DID 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log('DID 원본 데이터:', data);
      
      // DID 정보에 소유자 정보 추가 (users와 issuers 매개변수 사용)
      const enhancedDids: DidWithOwner[] = data.map((did: DID) => {
        // 사용자 DID인지 확인 (user_id 필드가 있으면 사용자 DID)
        if (did.user_id) {
          const user = users.find(user => user.id === did.user_id);
          if (user) {
            console.log(`사용자 DID 매핑: ${did.did} -> ${user.name}`);
            return {
              ...did,
              owner_name: user.name,
              owner_type: 'user'
            };
          }
        }
        
        // 발급자 DID인지 확인
        const issuer = issuers.find(issuer => issuer.did === did.did);
        if (issuer) {
          console.log(`발급자 DID 매핑: ${did.did} -> ${issuer.name} (${issuer.organization || '소속 없음'})`);
          return {
            ...did,
            owner_name: issuer.name,
            owner_type: 'issuer',
            organization: issuer.organization
          };
        }
        
        // 소유자를 찾지 못한 경우
        console.log(`소유자 정보 없는 DID: ${did.did}`);
        return {
          ...did,
          owner_name: '알 수 없음',
          owner_type: 'user'
        };
      });
      
      console.log('향상된 DID 목록:', enhancedDids);
      setDids(enhancedDids);
      
      if (enhancedDids.length > 0) {
        // 발급자 DID 기본값 설정 (발급자 타입의 DID 중 첫 번째)
        const firstIssuerDid = enhancedDids.find(did => did.owner_type === 'issuer');
        if (firstIssuerDid) {
          console.log(`기본 발급자 DID 설정: ${firstIssuerDid.did}`);
          setIssuerDid(firstIssuerDid.did);
        } else {
          setIssuerDid(enhancedDids[0].did);
        }
        
        // 대상자 DID 기본값 설정 (사용자 타입의 DID 중 첫 번째)
        const firstUserDid = enhancedDids.find(did => did.owner_type === 'user');
        if (firstUserDid) {
          console.log(`기본 대상자 DID 설정: ${firstUserDid.did}`);
          setSubjectDid(firstUserDid.did);
        } else {
          setSubjectDid(enhancedDids[0].did);
        }
      }
      
      return enhancedDids;
    } catch (err: any) {
      console.error('DID 목록 불러오기 오류:', err);
      return [];
    }
  };

  // VC 목록 로드
  const loadVcs = async (): Promise<VC[]> => {
    try {
      setError(null);
      
      const response = await fetch('/api/vc');
      if (!response.ok) {
        throw new Error('VC 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log('VC 데이터:', data);
      setVcs(data);
      
      if (data.length > 0 && !selectedVc) {
        setSelectedVc(data[0]);
      }
      
      return data;
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VC 목록 불러오기 오류:', err);
      return [];
    }
  };

  // 매핑 생성 함수
  const createMappings = (users: User[], issuers: Issuer[], dids: DidWithOwner[]) => {
    // 발급자 매핑 생성
    const issuerMapping: Record<string, Issuer> = {};
    issuers.forEach(issuer => {
      if (issuer.did) {
        issuerMapping[issuer.did] = issuer;
        console.log(`발급자 매핑 추가: ${issuer.did} -> ${issuer.name}`);
      }
    });
    
    // 사용자 DID 매핑 생성
    const userDidMapping: Record<string, User> = {};
    dids.forEach(did => {
      if (did.user_id) {
        const user = users.find(user => user.id === did.user_id);
        if (user) {
          userDidMapping[did.did] = user;
          console.log(`사용자 DID 매핑 추가: ${did.did} -> ${user.name}`);
        }
      }
    });
    
    console.log('최종 발급자 매핑:', issuerMapping);
    console.log('최종 사용자 매핑:', userDidMapping);
    
    setIssuerMap(issuerMapping);
    setUserDidMap(userDidMapping);
  };

  // VC 선택 함수
  const handleSelectVc = (vc: VC) => {
    setSelectedVc(vc);
  };

  // VC 발급 함수
  const handleIssueVC = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issuerDid || !subjectDid || !userId) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // VC 발급 API 호출
      const response = await fetch('/api/vc/issue/age', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerDid,
          subjectDid,
          userId,
          minAge
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'VC 발급에 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 데이터 다시 불러오기
      await loadAllData();
      
      setSuccess('VC가 성공적으로 발급되었습니다.');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('VC 발급 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // VC 데이터 파싱 함수
  const parseVcData = (vcDataStr: string) => {
    try {
      return JSON.parse(vcDataStr);
    } catch (err) {
      console.error('VC 데이터 파싱 오류:', err);
      return { error: 'VC 데이터 파싱 오류' };
    }
  };

  // DID에 해당하는 소유자 정보 표시 함수
  const getOwnerDisplayName = (did: string) => {
    console.log(`getOwnerDisplayName 호출: ${did}`);
    
    // 1. 발급자인 경우
    const issuer = issuerMap[did];
    if (issuer) {
      console.log(`발급자 정보 찾음: ${issuer.name} (${issuer.organization || '소속 없음'})`);
      return `${issuer.name}${issuer.organization ? ` (${issuer.organization})` : ''}`;
    }
    
    // 2. 사용자인 경우
    const user = userDidMap[did];
    if (user) {
      console.log(`사용자 정보 찾음: ${user.name}`);
      return user.name;
    }
    
    // 3. DID 목록에서 직접 찾기
    const didInfo = dids.find(d => d.did === did);
    if (didInfo) {
      if (didInfo.owner_type === 'issuer') {
        console.log(`DID 목록에서 발급자 정보 찾음: ${didInfo.owner_name}`);
        return `${didInfo.owner_name || '알 수 없음'}${didInfo.organization ? ` (${didInfo.organization})` : ''}`;
      } else if (didInfo.owner_name) {
        console.log(`DID 목록에서 사용자 정보 찾음: ${didInfo.owner_name}`);
        return didInfo.owner_name;
      }
    }
    
    // 4. 발급자 목록에서 직접 찾기
    const issuerDirect = issuers.find(i => i.did === did);
    if (issuerDirect) {
      console.log(`발급자 목록에서 직접 찾음: ${issuerDirect.name}`);
      return `${issuerDirect.name}${issuerDirect.organization ? ` (${issuerDirect.organization})` : ''}`;
    }
    
    // 5. 사용자 목록에서 직접 찾기 (DID를 통해)
    const didWithUser = dids.find(d => d.did === did && d.user_id);
    if (didWithUser && didWithUser.user_id) {
      const userDirect = users.find(u => u.id === didWithUser.user_id);
      if (userDirect) {
        console.log(`사용자 목록에서 직접 찾음: ${userDirect.name}`);
        return userDirect.name;
      }
    }
    
    // 6. 아무 정보도 찾지 못한 경우 DID의 일부 표시
    console.log(`소유자 정보를 찾지 못함: ${did}`);
    return did.substring(0, 16) + '...';
  };

  // 사용자 DID 찾기 함수
  const getUserDids = () => {
    // 사용자 ID와 DID 매핑 생성
    const userDids: { did: string; name: string; userId: string }[] = [];
    
    // 1. DID 목록에서 사용자 DID 찾기
    dids.forEach(did => {
      if (did.user_id && did.owner_type === 'user') {
        const user = users.find(user => user.id === did.user_id);
        if (user) {
          userDids.push({
            did: did.did,
            name: user.name,
            userId: user.id
          });
        }
      }
    });
    
    console.log('사용자 DID 목록:', userDids);
    return userDids;
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
      
      {/* VC 발급 폼 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">연령 인증 VC 발급</h3>
        <form onSubmit={handleIssueVC} className="bg-gray-50 p-4 rounded">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              발급자
            </label>
            <select
              value={issuerDid}
              onChange={(e) => setIssuerDid(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">발급자 선택</option>
              {issuers.map((issuer) => (
                <option key={issuer.id} value={issuer.did}>
                  {issuer.name} {issuer.organization ? `(${issuer.organization})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              대상자
            </label>
            <select
              value={subjectDid}
              onChange={(e) => setSubjectDid(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">대상자 선택</option>
              {getUserDids().map((userDid) => (
                <option key={userDid.did} value={userDid.did}>
                  {userDid.name} (DID 발급 완료)
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              사용자
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">사용자 선택</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.birth_date})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              최소 연령 요구사항
            </label>
            <input
              type="number"
              value={minAge}
              onChange={(e) => setMinAge(parseInt(e.target.value))}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              min="1"
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold mb-2">VC 목록</h3>
          {vcs.length === 0 ? (
            <p className="text-gray-500">발급된 VC가 없습니다.</p>
          ) : (
            <div className="bg-gray-100 p-3 rounded overflow-y-auto max-h-96">
              <ul>
                {vcs.map((vc) => (
                  <li 
                    key={vc.id} 
                    className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 ${selectedVc?.id === vc.id ? 'bg-gray-200' : ''}`}
                    onClick={() => handleSelectVc(vc)}
                  >
                    <div className="text-sm font-medium">{vc.credential_type}</div>
                    <div className="text-xs truncate">발급자: {getOwnerDisplayName(vc.issuer_did)}</div>
                    <div className="text-xs text-gray-500">{new Date(vc.issuance_date).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          {selectedVc ? (
            <>
              <h3 className="text-lg font-semibold mb-2">VC 상세 정보</h3>
              <div className="bg-gray-100 p-3 rounded mb-4">
                <div className="mb-2">
                  <span className="font-semibold">VC 타입:</span>
                  <div className="text-sm">{selectedVc.credential_type}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">발급자:</span>
                  <div className="text-sm">{getOwnerDisplayName(selectedVc.issuer_did)}</div>
                  <div className="text-xs text-gray-500 break-all">{selectedVc.issuer_did}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">대상자:</span>
                  <div className="text-sm">{getOwnerDisplayName(selectedVc.subject_did)}</div>
                  <div className="text-xs text-gray-500 break-all">{selectedVc.subject_did}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">발급일:</span>
                  <div className="text-sm">{new Date(selectedVc.issuance_date).toLocaleString()}</div>
                </div>
                {selectedVc.expiration_date && (
                  <div className="mb-2">
                    <span className="font-semibold">만료일:</span>
                    <div className="text-sm">{new Date(selectedVc.expiration_date).toLocaleString()}</div>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-semibold mb-2">VC 데이터</h3>
              <div className="bg-gray-100 p-3 rounded overflow-x-auto max-h-96">
                <pre className="text-sm break-all">
                  {JSON.stringify(parseVcData(selectedVc.credential_data), null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">VC를 선택하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VcManager; 