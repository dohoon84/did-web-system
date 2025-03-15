import DidManager from '@/components/DidManager';

export default function DidManagementPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">DID 관리</h1>
        <DidManager />
      </div>
    </main>
  );
} 