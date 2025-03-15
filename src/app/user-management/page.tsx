import UserManager from '@/components/UserManager';

export default function UserManagementPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">사용자 관리</h1>
        <UserManager />
      </div>
    </main>
  );
} 