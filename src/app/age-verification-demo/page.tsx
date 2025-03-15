import AgeVerificationDemo from '@/components/AgeVerificationDemo';

export default function AgeVerificationDemoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">연령 인증 데모</h1>
        <AgeVerificationDemo />
      </div>
    </main>
  );
} 