'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// 클라이언트 사이드에서만 렌더링되도록 동적 임포트
const DidManager = dynamic(() => import('../components/DidManager'), { ssr: false });
const VcManager = dynamic(() => import('../components/VcManager'), { ssr: false });
const VpManager = dynamic(() => import('../components/VpManager'), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState<'did' | 'vc' | 'vp'>('did');

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">DID 기반 신원 관리 시스템</h1>
          <p className="text-gray-600">
            DID, VC, VP의 생성 및 관리를 위한 데모 애플리케이션
          </p>
        </header>

        {/* 탭 네비게이션 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('did')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm md:text-base ${
                activeTab === 'did'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              DID 관리
            </button>
            <button
              onClick={() => setActiveTab('vc')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm md:text-base ${
                activeTab === 'vc'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              VC 관리
            </button>
            <button
              onClick={() => setActiveTab('vp')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm md:text-base ${
                activeTab === 'vp'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              VP 관리
            </button>
          </nav>
        </div>

        {/* 컴포넌트 렌더링 */}
        <div>
          {activeTab === 'did' && <DidManager />}
          {activeTab === 'vc' && <VcManager />}
          {activeTab === 'vp' && <VpManager />}
        </div>

        {/* 설명 섹션 */}
        <div className="mt-12 bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">DID, VC, VP 개념 설명</h2>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">DID (Decentralized Identifier)</h3>
            <p className="text-gray-700">
              분산형 신원의 기본 식별자로, 사용자가 중앙 기관 없이 자신의 디지털 ID를 생성하고 제어할 수 있게 해주는 고유 식별자입니다.
              DID는 "did:method:specific-id" 형식으로 구성됩니다.
            </p>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">DID Document</h3>
            <p className="text-gray-700">
              DID와 1:1로 연결된 문서로, 해당 DID에 대한 메타데이터를 포함합니다. 이 문서에는 공개키, 서비스 엔드포인트, 인증 방법 등이 포함됩니다.
            </p>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">VC (Verifiable Credential)</h3>
            <p className="text-gray-700">
              발급자(Issuer)가 소유자(Holder)에게 발급하는 검증 가능한 디지털 자격 증명입니다. 
              VC는 발급자의 DID로 서명되며, 소유자의 DID를 참조하고, 특정 주장(claims)을 포함합니다.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">VP (Verifiable Presentation)</h3>
            <p className="text-gray-700">
              소유자가 검증자(Verifier)에게 제시하는 VC의 모음입니다. 
              VP는 소유자의 DID로 서명되며, 하나 이상의 VC를 포함할 수 있고, 소유자가 자신의 정보를 선택적으로 공개할 수 있게 합니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
