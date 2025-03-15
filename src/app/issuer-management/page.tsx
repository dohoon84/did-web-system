import IssuerManager from '@/components/IssuerManager';

export default function IssuerManagementPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">발급자 관리</h1>
        <IssuerManager />
      </div>
    </main>
  );
} 