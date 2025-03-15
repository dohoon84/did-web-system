'use client';

import { useState } from 'react';

interface AgeVerificationProps {
  requiredAge: number;
  serviceName: string;
}

export default function AgeVerification({ requiredAge, serviceName }: AgeVerificationProps) {
  const [step, setStep] = useState<'initial' | 'verifying' | 'success' | 'failure'>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // VP 제출 및 검증
  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setStep('verifying');

    try {
      // 사용자의 DID 및 VP를 가져오는 로직 (실제 구현에서는 지갑 연동 등으로 대체)
      const userDid = localStorage.getItem('userDid') || '';
      
      // 예시 VP 데이터 (실제 구현에서는 사용자의 실제 VP로 대체)
      const mockVp = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1"
        ],
        "type": "VerifiablePresentation",
        "holder": userDid,
        "verifiableCredential": [
          {
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://www.w3.org/2018/credentials/examples/v1"
            ],
            "id": "http://example.com/credentials/1872",
            "type": ["VerifiableCredential", "AgeVerificationCredential"],
            "issuer": "did:example:issuer",
            "issuanceDate": "2023-01-01T19:23:24Z",
            "credentialSubject": {
              "id": userDid,
              "name": "홍길동",
              "birthDate": "1990-01-01",
              "age": 33,
              "isOverMinAge": true,
              "minAgeRequirement": 19
            }
          }
        ]
      };

      // VP 검증 API 호출
      const response = await fetch('/api/vp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vp: mockVp,
          verifier: serviceName,
          requiredAge: requiredAge
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '검증 중 오류가 발생했습니다.');
      }

      setVerificationResult(data.verificationResult);
      
      if (data.verificationResult.signatureValid && data.verificationResult.ageVerified) {
        setStep('success');
      } else {
        setStep('failure');
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      setStep('failure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">연령 인증</h2>
      
      {step === 'initial' && (
        <div className="text-center">
          <p className="mb-4">
            <strong>{serviceName}</strong>을(를) 이용하기 위해서는 {requiredAge}세 이상임을 인증해야 합니다.
          </p>
          <button
            onClick={handleVerify}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            연령 인증하기
          </button>
        </div>
      )}

      {step === 'verifying' && (
        <div className="text-center">
          <p className="mb-4">연령을 확인하고 있습니다...</p>
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-green-600 mb-2">인증 성공</h3>
          <p className="mb-4">
            {requiredAge}세 이상임이 확인되었습니다. {serviceName}을(를) 이용하실 수 있습니다.
          </p>
          {verificationResult && (
            <div className="text-left text-sm bg-gray-50 p-3 rounded">
              <p><strong>실제 나이:</strong> {verificationResult.actualAge}세</p>
              <p><strong>요구 나이:</strong> {verificationResult.requiredAge}세</p>
              <p><strong>인증 시간:</strong> {new Date(verificationResult.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {step === 'failure' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">인증 실패</h3>
          <p className="mb-4">
            {error || `${requiredAge}세 이상임을 확인할 수 없습니다.`}
          </p>
          <button
            onClick={() => setStep('initial')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}