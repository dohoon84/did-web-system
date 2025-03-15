'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// 인터페이스 정의
interface DIDRecord {
  id: string;
  user_id?: string;
  did: string;
  status: 'active' | 'revoked' | 'suspended';
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email?: string;
  birth_date: string;
  created_at: string;
}

interface Issuer {
  id: string;
  name: string;
  did: string;
  organization?: string;
  created_at: string;
}

interface VC {
  id: string;
  issuer_did: string;
  subject_did: string;
  credential_type: string;
  issuance_date: string;
}

interface VP {
  id: string;
  holder_did: string;
  verifier: string;
  created_at: string;
}

interface StatsSummary {
  totalUsers: number;
  totalDids: number;
  activeDids: number;
  revokedDids: number;
  totalIssuers: number;
  totalVcs: number;
  totalVps: number;
}

interface IssuerStats {
  issuerStatusData: IssuerStatusItem[];
  topIssuers: TopIssuer[];
  totalTopIssuers: number;
  organizations: string[];
  issuerVcStats: IssuerVcStat[];
  activeIssuers: number;
  inactiveIssuers: number;
}

interface IssuerStatusItem {
  id: string;
  name: string;
  organization: string | null;
  status: string;
  vc_count: number;
}

interface TopIssuer {
  id: string;
  name: string;
  organization: string | null;
  vc_count: number;
}

interface VcTypeStat {
  credential_type: string;
  count: number;
}

interface IssuerVcStat {
  organization: string;
  count: number;
}

interface DIDHistoryItem {
  id: string;
  did: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_type: 'user' | 'issuer';
}

const Dashboard: React.FC = () => {
  // 상태 관리
  const [stats, setStats] = useState<StatsSummary>({
    totalUsers: 0,
    totalDids: 0,
    activeDids: 0,
    revokedDids: 0,
    totalIssuers: 0,
    totalVcs: 0,
    totalVps: 0
  });
  
  const [issuerStats, setIssuerStats] = useState<IssuerStats>({
    issuerStatusData: [],
    topIssuers: [],
    totalTopIssuers: 0,
    organizations: [],
    issuerVcStats: [],
    activeIssuers: 0,
    inactiveIssuers: 0
  });
  
  const [recentDids, setRecentDids] = useState<DIDRecord[]>([]);
  const [recentVcs, setRecentVcs] = useState<VC[]>([]);
  const [didHistory, setDidHistory] = useState<DIDHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 페이징 상태
  const [didPageSize, setDidPageSize] = useState<number>(5);
  const [didCurrentPage, setDidCurrentPage] = useState<number>(1);
  const [vcPageSize, setVcPageSize] = useState<number>(5);
  const [vcCurrentPage, setVcCurrentPage] = useState<number>(1);
  const [totalDids, setTotalDids] = useState<number>(0);
  const [totalVcs, setTotalVcs] = useState<number>(0);
  
  // DID 이력 페이징 상태
  const [historyPageSize, setHistoryPageSize] = useState<number>(10);
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  const [totalHistory, setTotalHistory] = useState<number>(0);
  
  // 필터 상태
  const [dateFilter, setDateFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [issuerFilter, setIssuerFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  
  // 상세 정보 상태
  const [selectedDid, setSelectedDid] = useState<DIDHistoryItem | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  
  // 상위 발급자 페이징 상태
  const [issuerPageSize, setIssuerPageSize] = useState<number>(5);
  const [issuerCurrentPage, setIssuerCurrentPage] = useState<number>(1);
  const [organizationFilter, setOrganizationFilter] = useState<string>('');
  
  // 데이터 로딩
  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
    fetchIssuers();
    fetchIssuerStats();
  }, []);
  
  // 필터 적용 시 DID 이력 다시 로드
  useEffect(() => {
    fetchDidHistory();
  }, [dateFilter, userFilter, issuerFilter, statusFilter, historyCurrentPage, historyPageSize]);
  
  // 발급자 필터 또는 페이지 변경 시 데이터 다시 로드
  useEffect(() => {
    if (!loading) {
      fetchIssuerStats();
    }
  }, [organizationFilter, issuerCurrentPage, issuerPageSize]);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 통계 데이터 가져오기
      try {
        const statsResponse = await fetch('/api/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
          setTotalDids(statsData.totalDids);
          setTotalVcs(statsData.totalVcs);
        } else {
          console.error('통계 데이터를 불러오는데 실패했습니다.');
          // 기본값 설정
          setStats({
            totalUsers: 0,
            totalDids: 0,
            activeDids: 0,
            revokedDids: 0,
            totalIssuers: 0,
            totalVcs: 0,
            totalVps: 0
          });
        }
      } catch (err) {
        console.error('통계 데이터 로딩 오류:', err);
        // 기본값 설정
        setStats({
          totalUsers: 0,
          totalDids: 0,
          activeDids: 0,
          revokedDids: 0,
          totalIssuers: 0,
          totalVcs: 0,
          totalVps: 0
        });
      }
      
      // 최근 DID 목록 가져오기
      try {
        await fetchRecentDids();
      } catch (err) {
        console.error('최근 DID 목록 로딩 오류:', err);
        setRecentDids([]);
      }
      
      // 최근 VC 목록 가져오기
      try {
        await fetchRecentVcs();
      } catch (err) {
        console.error('최근 VC 목록 로딩 오류:', err);
        setRecentVcs([]);
      }
      
      // DID 이력 가져오기
      try {
        await fetchDidHistory();
      } catch (err) {
        console.error('DID 이력 로딩 오류:', err);
        setDidHistory([]);
        setTotalHistory(0);
      }
      
    } catch (err: any) {
      console.error('대시보드 데이터 로딩 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다. 일부 데이터가 표시되지 않을 수 있습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRecentDids = async () => {
    try {
      const offset = (didCurrentPage - 1) * didPageSize;
      const didsResponse = await fetch(`/api/did?limit=${didPageSize}&offset=${offset}`);
      if (didsResponse.ok) {
        const didsData = await didsResponse.json();
        setRecentDids(didsData);
      } else {
        console.error('최근 DID 목록을 불러오는데 실패했습니다.');
        setRecentDids([]);
      }
    } catch (err: any) {
      console.error('최근 DID 목록 로딩 오류:', err);
      setRecentDids([]);
    }
  };
  
  const fetchRecentVcs = async () => {
    try {
      const offset = (vcCurrentPage - 1) * vcPageSize;
      const vcsResponse = await fetch(`/api/vc?limit=${vcPageSize}&offset=${offset}`);
      if (vcsResponse.ok) {
        const vcsData = await vcsResponse.json();
        setRecentVcs(vcsData);
      } else {
        console.error('최근 VC 목록을 불러오는데 실패했습니다.');
        setRecentVcs([]);
      }
    } catch (err: any) {
      console.error('최근 VC 목록 로딩 오류:', err);
      setRecentVcs([]);
    }
  };
  
  // DID 페이지 변경 시 데이터 다시 로드
  useEffect(() => {
    if (!loading) {
      fetchRecentDids();
    }
  }, [didCurrentPage, didPageSize]);
  
  // VC 페이지 변경 시 데이터 다시 로드
  useEffect(() => {
    if (!loading) {
      fetchRecentVcs();
    }
  }, [vcCurrentPage, vcPageSize]);
  
  const fetchDidHistory = async () => {
    try {
      // 필터 파라미터 구성
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (userFilter) params.append('userId', userFilter);
      if (issuerFilter) params.append('issuerId', issuerFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      // 페이징 파라미터 추가
      const offset = (historyCurrentPage - 1) * historyPageSize;
      params.append('limit', historyPageSize.toString());
      params.append('offset', offset.toString());
      
      const response = await fetch(`/api/did/history?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDidHistory(data.items);
        setTotalHistory(data.total);
      } else {
        console.error('DID 이력을 불러오는데 실패했습니다.');
        setDidHistory([]);
        setTotalHistory(0);
      }
    } catch (err: any) {
      console.error('DID 이력 로딩 오류:', err);
      setDidHistory([]);
      setTotalHistory(0);
    }
  };
  
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('사용자 목록을 불러오는데 실패했습니다.');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('사용자 목록 로딩 오류:', err);
      setUsers([]);
    }
  };
  
  const fetchIssuers = async () => {
    try {
      const response = await fetch('/api/issuer');
      if (response.ok) {
        const data = await response.json();
        setIssuers(data);
      } else {
        console.error('발급자 목록을 불러오는데 실패했습니다.');
        setIssuers([]);
      }
    } catch (err: any) {
      console.error('발급자 목록 로딩 오류:', err);
      setIssuers([]);
    }
  };
  
  const fetchIssuerStats = async () => {
    try {
      // 필터 파라미터 구성
      const params = new URLSearchParams();
      if (organizationFilter) params.append('organization', organizationFilter);
      
      // 페이징 파라미터 추가
      const offset = (issuerCurrentPage - 1) * issuerPageSize;
      params.append('limit', issuerPageSize.toString());
      params.append('offset', offset.toString());
      
      const response = await fetch(`/api/issuer/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setIssuerStats(data);
      } else {
        console.error('발급자 통계 데이터를 불러오는데 실패했습니다.');
        // 기본 빈 데이터 설정
        setIssuerStats({
          issuerStatusData: [],
          topIssuers: [],
          totalTopIssuers: 0,
          organizations: [],
          issuerVcStats: [],
          activeIssuers: 0,
          inactiveIssuers: 0
        });
      }
    } catch (err: any) {
      console.error('발급자 통계 데이터 로딩 오류:', err);
      // 기본 빈 데이터 설정
      setIssuerStats({
        issuerStatusData: [],
        topIssuers: [],
        totalTopIssuers: 0,
        organizations: [],
        issuerVcStats: [],
        activeIssuers: 0,
        inactiveIssuers: 0
      });
    }
  };
  
  const handleDidClick = (did: DIDHistoryItem) => {
    setSelectedDid(did);
    setShowDetails(true);
  };
  
  const closeDetails = () => {
    setShowDetails(false);
    setSelectedDid(null);
  };
  
  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // 차트 데이터
  const statusChartData = [
    { name: '활성', value: stats.activeDids },
    { name: '폐기', value: stats.revokedDids }
  ];
  
  const issuerStatusChartData = [
    { name: '활성', value: issuerStats.activeIssuers },
    { name: '비활성', value: issuerStats.inactiveIssuers }
  ];
  
  const COLORS = ['#0088FE', '#FF8042'];
  const VC_COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];
  
  // 페이지 이동 함수
  const handleDidPageChange = (newPage: number) => {
    setDidCurrentPage(newPage);
  };
  
  const handleVcPageChange = (newPage: number) => {
    setVcCurrentPage(newPage);
  };
  
  const handleHistoryPageChange = (newPage: number) => {
    setHistoryCurrentPage(newPage);
  };
  
  // 페이지 크기 변경 함수
  const handleDidPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDidPageSize(Number(e.target.value));
    setDidCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
  };
  
  const handleVcPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVcPageSize(Number(e.target.value));
    setVcCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
  };
  
  const handleHistoryPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHistoryPageSize(Number(e.target.value));
    setHistoryCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
  };
  
  const handleIssuerPageChange = (newPage: number) => {
    setIssuerCurrentPage(newPage);
  };
  
  // 페이지 크기 변경 함수
  const handleIssuerPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIssuerPageSize(Number(e.target.value));
    setIssuerCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 이동
  };
  
  // 소속 기관 필터 변경 함수
  const handleOrganizationFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrganizationFilter(e.target.value);
    setIssuerCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };
  
  // 페이지네이션 컴포넌트
  const Pagination = ({ 
    currentPage, 
    totalItems, 
    pageSize, 
    onPageChange 
  }: { 
    currentPage: number; 
    totalItems: number; 
    pageSize: number; 
    onPageChange: (page: number) => void;
  }) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`px-2 py-1 text-xs rounded ${
            currentPage === 1 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          이전
        </button>
        
        <span className="text-xs text-gray-500">
          {currentPage} / {totalPages} 페이지
        </span>
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`px-2 py-1 text-xs rounded ${
            currentPage === totalPages 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          다음
        </button>
      </div>
    );
  };
  
  // 로딩 중 표시
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">로딩 중...</span>
            </div>
            <p className="mt-2">데이터를 불러오는 중입니다...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // 에러 표시는 전체 화면을 차단하지 않고 알림으로만 표시
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">데이터 로딩 중 오류가 발생했습니다</p>
          <p>{error}</p>
          <p className="text-sm mt-2">일부 데이터가 표시되지 않을 수 있습니다. 새로고침을 시도하거나 관리자에게 문의하세요.</p>
        </div>
      )}
      
      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">사용자</h3>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
          <p className="text-sm text-gray-500">등록된 사용자 수</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">DID</h3>
          <p className="text-3xl font-bold">{stats.totalDids}</p>
          <p className="text-sm text-gray-500">
            활성: {stats.activeDids} | 폐기: {stats.revokedDids}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">발급자</h3>
          <p className="text-3xl font-bold">{stats.totalIssuers}</p>
          <p className="text-sm text-gray-500">등록된 발급자 수</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">인증서</h3>
          <p className="text-3xl font-bold">{stats.totalVcs}</p>
          <p className="text-sm text-gray-500">
            VC: {stats.totalVcs} | VP: {stats.totalVps}
          </p>
        </div>
      </div>

      {/* 상위 발급자 */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">상위 발급자</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <label className="text-sm text-gray-500 mr-2">소속 기관:</label>
              <select 
                value={organizationFilter} 
                onChange={handleOrganizationFilterChange}
                className="text-sm border rounded p-1"
              >
                <option value="">모든 기관</option>
                {issuerStats.organizations.map((org, index) => (
                  <option key={index} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="text-sm text-gray-500 mr-2">표시 개수:</label>
              <select 
                value={issuerPageSize} 
                onChange={handleIssuerPageSizeChange}
                className="text-sm border rounded p-1"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  발급자 이름
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소속 기관
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  발급한 VC 수
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {issuerStats.topIssuers.length > 0 ? (
                issuerStats.topIssuers.map((issuer) => (
                  <tr key={issuer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {issuer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issuer.organization || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issuer.vc_count}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      <p className="text-base">발급자 데이터가 없거나 VC 테이블이 아직 생성되지 않았습니다.</p>
                      <p className="text-sm mt-2">발급자를 등록하고 VC를 발급하면 여기에 표시됩니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* 페이지네이션 */}
          <div className="mt-4">
            <Pagination 
              currentPage={issuerCurrentPage}
              totalItems={issuerStats.totalTopIssuers}
              pageSize={issuerPageSize}
              onPageChange={handleIssuerPageChange}
            />
          </div>
        </div>
      </div>
      
      {/* 차트 및 최근 활동 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DID 상태 차트 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">DID 상태 분포</h3>
          <div className="h-64">
            {stats.totalDids > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p>DID 데이터가 없습니다.</p>
                  <p className="text-sm mt-2">DID를 생성하면 여기에 상태 분포가 표시됩니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 최근 활동 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">최근 생성된 DID</h4>
                <div className="flex items-center">
                  <label className="text-xs text-gray-500 mr-2">표시 개수:</label>
                  <select 
                    value={didPageSize} 
                    onChange={handleDidPageSizeChange}
                    className="text-xs border rounded p-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>
              
              {recentDids.length > 0 ? (
                <>
                  <ul className="text-sm">
                    {recentDids.map((did) => (
                      <li key={did.id} className="mb-1 pb-1 border-b border-gray-100 last:border-b-0">
                        <div className="truncate">{did.did}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(did.created_at)} | 상태: {did.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination 
                    currentPage={didCurrentPage}
                    totalItems={totalDids}
                    pageSize={didPageSize}
                    onPageChange={handleDidPageChange}
                  />
                </>
              ) : (
                <div className="py-4 text-center text-sm text-gray-500 bg-gray-50 rounded">
                  <p>최근 생성된 DID가 없습니다.</p>
                  <p className="text-xs mt-1">DID를 생성하면 여기에 표시됩니다.</p>
                </div>
              )}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">최근 발급된 VC</h4>
                <div className="flex items-center">
                  <label className="text-xs text-gray-500 mr-2">표시 개수:</label>
                  <select 
                    value={vcPageSize} 
                    onChange={handleVcPageSizeChange}
                    className="text-xs border rounded p-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>
              
              {recentVcs.length > 0 ? (
                <>
                  <ul className="text-sm">
                    {recentVcs.map((vc) => (
                      <li key={vc.id} className="mb-1 pb-1 border-b border-gray-100 last:border-b-0">
                        <div>{vc.credential_type}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(vc.issuance_date)}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination 
                    currentPage={vcCurrentPage}
                    totalItems={totalVcs}
                    pageSize={vcPageSize}
                    onPageChange={handleVcPageChange}
                  />
                </>
              ) : (
                <div className="py-4 text-center text-sm text-gray-500 bg-gray-50 rounded">
                  <p>최근 발급된 VC가 없거나 VC 테이블이 아직 생성되지 않았습니다.</p>
                  <p className="text-xs mt-1">VC를 발급하면 여기에 표시됩니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 발급자 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 발급자 상태 분포 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">발급자 상태 분포</h3>
          <div className="h-64">
            {issuerStats.activeIssuers > 0 || issuerStats.inactiveIssuers > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={issuerStatusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {issuerStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p>발급자 데이터가 없거나 VC 테이블이 아직 생성되지 않았습니다.</p>
                  <p className="text-sm mt-2">발급자를 등록하고 VC를 발급하면 여기에 상태 분포가 표시됩니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 발급자별 VC 발급 수 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">소속 기관별 VC 발급 수</h3>
          <div className="h-96">
            {issuerStats.issuerVcStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={issuerStats.issuerVcStats}
                  margin={{ top: 20, right: 100, left: 10, bottom: 30 }}
                  layout="vertical"
                  barSize={30}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 20)]}
                    tickCount={5}
                    label={{ value: '발급 수', position: 'insideBottom', offset: -5 }}
                    fontSize={12}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="organization" 
                    width={120} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value ? value : '미지정'}
                  />
                  <Tooltip formatter={(value) => [`${value} 건`, '발급 수']} labelFormatter={(label) => `소속 기관: ${label || '미지정'}`} />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 10 }} />
                  <Bar 
                    dataKey="count" 
                    name="발급 수" 
                    fill="#8884d8" 
                    radius={[0, 4, 4, 0]}
                    animationDuration={1500}
                  >
                    {issuerStats.issuerVcStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={VC_COLORS[index % VC_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <p>소속 기관별 VC 발급 데이터가 없거나 VC 테이블이 아직 생성되지 않았습니다.</p>
                  <p className="text-sm mt-2">발급자를 등록하고 VC를 발급하면 여기에 표시됩니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* DID 이력 조회 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">DID 이력 조회</h3>
        
        {/* 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜별 조회</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사용자별 조회</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 사용자</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발급자별 조회</label>
            <select
              value={issuerFilter}
              onChange={(e) => setIssuerFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 발급자</option>
              {issuers.map((issuer) => (
                <option key={issuer.id} value={issuer.id}>
                  {issuer.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태별 조회</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="active">활성</option>
              <option value="revoked">폐기</option>
              <option value="suspended">정지</option>
            </select>
          </div>
        </div>
        
        {/* 테이블 */}
        <div className="overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">DID 이력</h4>
            <div className="flex items-center">
              <label className="text-sm text-gray-500 mr-2">표시 개수:</label>
              <select 
                value={historyPageSize} 
                onChange={handleHistoryPageSizeChange}
                className="text-sm border rounded p-1"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소유자
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  최종 수정일
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {didHistory.length > 0 ? (
                didHistory.map((did) => (
                  <tr 
                    key={did.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleDidClick(did)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs">
                      {did.did}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {did.owner_name || '알 수 없음'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {did.owner_type === 'user' ? '사용자' : '발급자'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${did.status === 'active' ? 'bg-green-100 text-green-800' : 
                          did.status === 'revoked' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {did.status === 'active' ? '활성' : 
                         did.status === 'revoked' ? '폐기' : '정지'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(did.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(did.updated_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      <p className="text-base">조회된 DID 이력이 없습니다.</p>
                      <p className="text-sm mt-2">다른 필터 조건을 선택하거나 DID를 생성해보세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* 페이지네이션 */}
          <div className="mt-4">
            <Pagination 
              currentPage={historyCurrentPage}
              totalItems={totalHistory}
              pageSize={historyPageSize}
              onPageChange={handleHistoryPageChange}
            />
          </div>
        </div>
      </div>
      
      {/* DID 상세 정보 모달 */}
      {showDetails && selectedDid && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">DID 상세 정보</h3>
              <button 
                onClick={closeDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">DID</h4>
                <p className="text-sm break-all">{selectedDid.did}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">소유자</h4>
                <p className="text-sm">{selectedDid.owner_name || '알 수 없음'} ({selectedDid.owner_type === 'user' ? '사용자' : '발급자'})</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">상태</h4>
                <p className="text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${selectedDid.status === 'active' ? 'bg-green-100 text-green-800' : 
                      selectedDid.status === 'revoked' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {selectedDid.status === 'active' ? '활성' : 
                     selectedDid.status === 'revoked' ? '폐기' : '정지'}
                  </span>
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">생성일</h4>
                <p className="text-sm">{formatDate(selectedDid.created_at)}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">최종 수정일</h4>
                <p className="text-sm">{formatDate(selectedDid.updated_at)}</p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <Link 
                  href={selectedDid.owner_type === 'user' ? `/user-management` : `/issuer-management`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {selectedDid.owner_type === 'user' ? '사용자 관리로 이동' : '발급자 관리로 이동'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 바로가기 링크 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/user-management" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">사용자 관리</h3>
          <p className="text-sm text-gray-600">사용자 등록 및 DID 관리</p>
        </Link>
        
        <Link href="/issuer-management" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">발급자 관리</h3>
          <p className="text-sm text-gray-600">발급자 등록 및 DID 관리</p>
        </Link>
        
        <Link href="/age-verification-demo" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">연령 인증 데모</h3>
          <p className="text-sm text-gray-600">DID 기반 연령 인증 체험</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard; 