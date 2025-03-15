import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">DID 시스템 대시보드</h1>
        <Dashboard />
      </div>
    </main>
  );
}
