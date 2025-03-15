'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : '';
  };

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <Link className="text-xl font-bold" href="/">
            DID 관리 시스템
          </Link>
        </div>

        <div className="flex space-x-4">
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/')}`} href="/">
            홈
          </Link>
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/issuer-management')}`} href="/issuer-management">
            발급자 관리
          </Link>
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/user-management')}`} href="/user-management">
            사용자 관리
          </Link>
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/did-management')}`} href="/did-management">
            DID 관리
          </Link>
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/vc-management')}`} href="/vc-management">
            VC 관리
          </Link>
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/vp-management')}`} href="/vp-management">
            VP 관리
          </Link>
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/age-verification-demo')}`} href="/age-verification-demo">
            연령 인증 데모
          </Link>
          <Link className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/api-docs')}`} href="/api-docs">
            API 문서
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 