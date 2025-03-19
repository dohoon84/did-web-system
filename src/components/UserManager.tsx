'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email?: string;
  birth_date: string;
  created_at: string;
  updated_at: string;
}

interface DID {
  id: string;
  did: string;
  did_document: string;
  user_id?: string;
  status: 'active' | 'revoked' | 'suspended' | 'error';
  created_at: string;
  updated_at: string;
  transaction_hash?: string;
  error_message?: string;
}

interface APIResponse {
  success: boolean;
  message?: string;
  dids?: DID[];
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDids, setUserDids] = useState<DID[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 새 유저 폼 상태
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserBirthDate, setNewUserBirthDate] = useState<string>('');
  
  // 유저 목록 불러오기
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error('사용자 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.message || '사용자 목록을 불러오는데 실패했습니다.');
      }
      
      const userList = data.users || data; // 호환성을 위해 양쪽 형식 모두 지원
      setUsers(userList);
      
      if (userList.length > 0 && !selectedUser) {
        setSelectedUser(userList[0]);
        fetchUserDids(userList[0].id);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('사용자 목록 불러오기 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 유저의 DID 목록 불러오기
  const fetchUserDids = async (userId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/user/${userId}/dids`);
      if (!response.ok) {
        throw new Error('사용자의 DID 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json() as DID[] | APIResponse;
      
      // API 응답 구조 확인 - 배열이거나 {success, dids} 형태
      if (Array.isArray(data)) {
        setUserDids(data);
      } else if (data.success === false) {
        throw new Error(data.message || '사용자의 DID 목록을 불러오는데 실패했습니다.');
      } else {
        setUserDids(data.dids || []);
      }
    } catch (err: any) {
      console.error('사용자 DID 목록 불러오기 오류:', err);
      setUserDids([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchUsers();
  }, []);

  // 유저 선택 함수
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    fetchUserDids(user.id);
  };

  // 새 유저 생성 함수
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserName || !newUserBirthDate) {
      setError('이름과 생년월일은 필수 항목입니다.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail || undefined,
          birth_date: newUserBirthDate
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || '사용자 생성에 실패했습니다.');
      }
      
      if (responseData.success === false) {
        throw new Error(responseData.message || '사용자 생성에 실패했습니다.');
      }
      
      // 폼 초기화
      setNewUserName('');
      setNewUserEmail('');
      setNewUserBirthDate('');
      
      // 유저 목록 다시 불러오기
      fetchUsers();
      
      setSuccess('사용자가 성공적으로 생성되었습니다.');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('사용자 생성 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 유저 삭제 함수
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/user/${userId}`, {
        method: 'DELETE',
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || '사용자 삭제에 실패했습니다.');
      }
      
      if (responseData.success === false) {
        throw new Error(responseData.message || '사용자 삭제에 실패했습니다.');
      }
      
      // 유저 목록 다시 불러오기
      fetchUsers();
      
      // 선택된 유저가 삭제된 경우 선택 해제
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(null);
        setUserDids([]);
      }
      
      setSuccess('사용자가 성공적으로 삭제되었습니다.');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('사용자 삭제 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 유저를 위한 새 DID 생성 함수
  const handleCreateDidForUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/did', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'DID 생성에 실패했습니다.');
      }
      
      if (responseData.success === false) {
        throw new Error(responseData.message || 'DID 생성에 실패했습니다.');
      }
      
      // 유저의 DID 목록 다시 불러오기
      fetchUserDids(userId);
      
      setSuccess('DID가 성공적으로 생성되었습니다.');
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('DID 생성 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // DID 폐기 함수
  const handleRevokeDid = async (did: string) => {
    if (!confirm('정말로 이 DID를 폐기하시겠습니까?\n\n폐기된 DID는 더 이상 사용할 수 없으며, 이 DID로 발급된 모든 VC도 함께 폐기됩니다. 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/did/${did}/revoke`, {
        method: 'POST',
      });
      
      // 응답 본문이 비어있는지 확인
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('서버 응답이 비어있습니다.');
      }
      
      // JSON 파싱 시도
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON 파싱 오류:', jsonError, '원본 텍스트:', responseText);
        throw new Error(`JSON 파싱 오류: ${jsonError instanceof Error ? jsonError.message : '알 수 없는 오류'}`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'DID 폐기에 실패했습니다.');
      }
      
      if (!data.success) {
        throw new Error(data.message || 'DID 폐기에 실패했습니다.');
      }
      
      // 경고 표시 (블록체인 오류가 있지만 DB 폐기는 성공한 경우)
      if (data.error) {
        setError(`경고: ${data.error}`);
        setSuccess(data.message || 'DID가 부분적으로 폐기되었습니다. 블록체인 연동 중 오류가 발생했습니다.');
      } else {
        setSuccess(data.message || 'DID가 성공적으로 폐기되었습니다.');
      }
      
      // 현재 선택된 사용자의 DID 목록 다시 불러오기
      if (selectedUser) {
        fetchUserDids(selectedUser.id);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('DID 폐기 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // 나이 계산 함수
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // DID 상태에 따른 배지 스타일
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'revoked':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // DID 상태 한글 표시
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'revoked':
        return '폐기됨';
      case 'suspended':
        return '정지됨';
      case 'error':
        return '오류';
      default:
        return '알 수 없음';
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">사용자 관리</h2>
      
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
      
      {/* 새 유저 생성 폼 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">새 사용자 등록</h3>
        <form onSubmit={handleCreateUser} className="bg-gray-50 p-4 rounded">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              이름 *
            </label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              이메일
            </label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              생년월일 * (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={newUserBirthDate}
              onChange={(e) => setNewUserBirthDate(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? '처리 중...' : '사용자 등록하기'}
          </button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold mb-2">사용자 목록</h3>
          {users.length === 0 ? (
            <p className="text-gray-500">등록된 사용자가 없습니다.</p>
          ) : (
            <div className="bg-gray-100 p-3 rounded overflow-y-auto max-h-96">
              <ul>
                {users.map((user) => (
                  <li 
                    key={user.id} 
                    className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 ${selectedUser?.id === user.id ? 'bg-gray-200' : ''}`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.birth_date} ({calculateAge(user.birth_date)}세)</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(user.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
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
          {selectedUser ? (
            <>
              <h3 className="text-lg font-semibold mb-2">사용자 상세 정보</h3>
              <div className="bg-gray-100 p-3 rounded mb-4">
                <div className="mb-2">
                  <span className="font-semibold">이름:</span>
                  <div className="text-sm">{selectedUser.name}</div>
                </div>
                {selectedUser.email && (
                  <div className="mb-2">
                    <span className="font-semibold">이메일:</span>
                    <div className="text-sm">{selectedUser.email}</div>
                  </div>
                )}
                <div className="mb-2">
                  <span className="font-semibold">생년월일:</span>
                  <div className="text-sm">{selectedUser.birth_date} ({calculateAge(selectedUser.birth_date)}세)</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">등록일:</span>
                  <div className="text-sm">{formatDate(selectedUser.created_at)}</div>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">ID:</span>
                  <div className="text-sm break-all">{selectedUser.id}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">사용자의 DID 목록</h3>
                <button
                  onClick={() => handleCreateDidForUser(selectedUser.id)}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-700 text-white text-sm py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                >
                  새 DID 생성
                </button>
              </div>
              
              {userDids.length === 0 ? (
                <p className="text-gray-500 bg-gray-100 p-3 rounded">이 사용자에게 연결된 DID가 없습니다.</p>
              ) : (
                <div className="bg-gray-100 p-3 rounded overflow-y-auto max-h-96">
                  <ul>
                    {userDids.map((did) => (
                      <li key={did.id} className="p-2 mb-1 border-b border-gray-200 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium break-all">{did.did}</div>
                            <div className="text-xs text-gray-500 mt-1">생성일: {formatDate(did.created_at)}</div>
                            <div className="mt-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(did.status)}`}>
                                {getStatusText(did.status)}
                              </span>
                            </div>
                            {did.transaction_hash && (
                              <div className="text-xs text-gray-500 mt-1 break-all">
                                트랜잭션: {did.transaction_hash.substring(0, 15)}...
                              </div>
                            )}
                            {did.error_message && (
                              <div className="text-xs text-red-500 mt-1">
                                오류: {did.error_message}
                              </div>
                            )}
                          </div>
                          {did.status === 'active' && (
                            <button
                              onClick={() => handleRevokeDid(did.did)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              폐기
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">사용자를 선택하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManager; 