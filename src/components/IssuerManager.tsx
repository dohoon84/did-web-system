'use client';

import React, { useState, useEffect } from 'react';

interface Issuer {
  id: string;
  name: string;
  did: string;
  organization?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface DID {
  id: string;
  did: string;
  user_id?: string;
  status: 'active' | 'revoked' | 'suspended' | 'error';
  created_at: string;
  updated_at: string;
  transaction_hash?: string;
  error_message?: string;
}

interface APIResponse {
  success: boolean;
  dids: DID[];
  message?: string;
}

const IssuerManager: React.FC = () => {
  // 상태 관리
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [dids, setDids] = useState<DID[]>([]);
  const [didMap, setDidMap] = useState<Record<string, DID>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 폼 상태
  const [name, setName] = useState<string>('');
  const [selectedDid, setSelectedDid] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingIssuerId, setEditingIssuerId] = useState<string | null>(null);
  
  // 데이터 불러오기
  useEffect(() => {
    fetchIssuers();
    fetchDids();
  }, []);
  
  const fetchIssuers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/issuer');
      if (!response.ok) throw new Error('발급자 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setIssuers(data);
    } catch (err: any) {
      setError(err.message || '발급자 목록을 불러오는데 실패했습니다.');
      console.error('발급자 목록 불러오기 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDids = async () => {
    try {
      const response = await fetch('/api/did');
      if (!response.ok) throw new Error('DID 목록을 불러오는데 실패했습니다.');
      const data = await response.json() as APIResponse;
      
      if (!data.success) {
        throw new Error(data.message || 'DID 목록을 불러오는데 실패했습니다.');
      }
      
      const didList = data.dids || [];
      
      // 사용자와 연결되지 않은 DID만 필터링 (발급자용 DID)
      const issuerDids = didList.filter((did) => !did.user_id);
      setDids(issuerDids);
      
      // DID 맵 생성 (did 문자열 -> DID 객체)
      const didMapping: Record<string, DID> = {};
      didList.forEach((did) => {
        didMapping[did.did] = did;
      });
      setDidMap(didMapping);
      
      if (issuerDids.length > 0 && !selectedDid) {
        setSelectedDid(issuerDids[0].did);
      }
    } catch (err: any) {
      console.error('DID 목록 불러오기 오류:', err);
    }
  };
  
  const resetForm = () => {
    setName('');
    setSelectedDid('');
    setOrganization('');
    setDescription('');
    setIsEditing(false);
    setEditingIssuerId(null);
    
    // DID 선택 초기화
    if (dids.length > 0) {
      setSelectedDid(dids[0].did);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !selectedDid) {
      setError('이름과 DID는 필수 입력 항목입니다.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const issuerData = {
        name,
        did: selectedDid,
        organization: organization || undefined,
        description: description || undefined
      };
      
      let response;
      
      if (isEditing && editingIssuerId) {
        // 발급자 정보 업데이트
        response = await fetch(`/api/issuer/${editingIssuerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(issuerData),
        });
      } else {
        // 새 발급자 생성
        response = await fetch('/api/issuer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(issuerData),
        });
      }
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || '발급자 저장에 실패했습니다.');
      }
      
      if (responseData.success === false) {
        throw new Error(responseData.message || '발급자 저장에 실패했습니다.');
      }
      
      setSuccess(isEditing ? '발급자 정보가 업데이트되었습니다.' : '새 발급자가 등록되었습니다.');
      resetForm();
      fetchIssuers();
    } catch (err: any) {
      setError(err.message || '발급자 저장 중 오류가 발생했습니다.');
      console.error('발급자 저장 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (issuer: Issuer) => {
    setName(issuer.name);
    setSelectedDid(issuer.did);
    setOrganization(issuer.organization || '');
    setDescription(issuer.description || '');
    setIsEditing(true);
    setEditingIssuerId(issuer.id);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 발급자를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/issuer/${id}`, {
        method: 'DELETE',
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || '발급자 삭제에 실패했습니다.');
      }
      
      if (responseData.success === false) {
        throw new Error(responseData.message || '발급자 삭제에 실패했습니다.');
      }
      
      setSuccess('발급자가 삭제되었습니다.');
      fetchIssuers();
    } catch (err: any) {
      setError(err.message || '발급자 삭제 중 오류가 발생했습니다.');
      console.error('발급자 삭제 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRevokeDid = async (didString: string) => {
    const did = didMap[didString];
    if (!did) {
      setError('DID 정보를 찾을 수 없습니다.');
      return;
    }
    
    if (!confirm('정말로 이 DID를 폐기하시겠습니까? 이 작업은 되돌릴 수 없으며, 발급자가 더 이상 이 DID를 사용할 수 없게 됩니다.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/did/${did.id}/revoke`, {
        method: 'PUT',
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'DID 폐기에 실패했습니다.');
      }
      
      if (responseData.success === false) {
        throw new Error(responseData.message || 'DID 폐기에 실패했습니다.');
      }
      
      setSuccess('DID가 성공적으로 폐기되었습니다.');
      fetchDids();
      fetchIssuers();
    } catch (err: any) {
      setError(err.message || 'DID 폐기 중 오류가 발생했습니다.');
      console.error('DID 폐기 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // DID 상태 확인
  const getDidStatus = (didString: string) => {
    return didMap[didString]?.status || 'unknown';
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
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <div className="space-y-8">
      {/* 알림 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{success}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setSuccess(null)}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      
      {/* 발급자 등록/수정 폼 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? '발급자 정보 수정' : '새 발급자 등록'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              발급자 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="발급자 이름"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              발급자 DID *
            </label>
            <select
              value={selectedDid}
              onChange={(e) => setSelectedDid(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isEditing}
            >
              <option value="">DID 선택</option>
              {dids
                .filter(did => did.status === 'active')
                .map((did) => (
                <option key={did.id} value={did.did}>
                  {did.did}
                </option>
              ))}
            </select>
            {dids.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                사용 가능한 DID가 없습니다. 먼저 DID를 생성해주세요.
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              소속 기관
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="소속 기관 (선택사항)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="발급자에 대한 설명 (선택사항)"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                취소
              </button>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading || (!selectedDid && dids.length > 0)}
            >
              {loading ? '처리 중...' : isEditing ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
      
      {/* 발급자 목록 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">발급자 목록</h2>
        
        {loading && <p className="text-gray-500">로딩 중...</p>}
        
        {!loading && issuers.length === 0 && (
          <p className="text-gray-500">등록된 발급자가 없습니다.</p>
        )}
        
        {!loading && issuers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    소속 기관
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuers.map((issuer) => {
                  const didStatus = getDidStatus(issuer.did);
                  return (
                    <tr key={issuer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {issuer.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {issuer.did}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(didStatus)}`}>
                          {getStatusText(didStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {issuer.organization || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(issuer.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(issuer)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          disabled={didStatus !== 'active'}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(issuer.id)}
                          className="text-red-600 hover:text-red-900 mr-4"
                        >
                          삭제
                        </button>
                        {didStatus === 'active' && (
                          <button
                            onClick={() => handleRevokeDid(issuer.did)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            DID 폐기
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuerManager; 