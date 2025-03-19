import VCManager from '../components/VCManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VC 관리 | DID 관리 시스템',
  description: 'Verifiable Credential 발급, 조회, 폐기 및 검증을 관리합니다.',
};

export default function VCManagementPage() {
  return (
    <div>
      <VCManager />
    </div>
  );
} 