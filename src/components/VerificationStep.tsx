import React, { useState } from 'react';

interface VerificationStepProps {
  onVerify: (otp: string) => void;
  onResend: () => void;
  error?: string;
}

const VerificationStep: React.FC<VerificationStepProps> = ({
  onVerify,
  onResend,
  error
}) => {
  const [otp, setOtp] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerify(otp);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Email Verification</h2>
            <p className="mt-2 text-sm text-gray-600">
              Please enter the verification code sent to your email
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter verification code"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Verify
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={onResend}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Resend verification code
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerificationStep;