'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navbar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : '';
  };

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold">
            DID 관리 시스템
          </Link>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/"
            className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/')}`}
          >
            홈
          </Link>
          <Link
            href="/api-docs"
            className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/api-docs')}`}
          >
            API 문서
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 