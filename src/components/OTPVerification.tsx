import React from 'react';

interface OTPVerificationProps {
  onSubmit: (otp: string) => void;
  onResend: () => void;
  error?: string;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ onSubmit, onResend, error }) => {
  const [otp, setOTP] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(otp);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Email Verification</h2>
      <p className="text-gray-600 mb-6 text-center">
        Please enter the verification code sent to your email
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOTP(e.target.value)}
            placeholder="Enter OTP"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={6}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        
        <div className="flex flex-col space-y-2">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Verify
          </button>
          <button
            type="button"
            onClick={onResend}
            className="text-blue-600 text-sm hover:underline"
          >
            Resend Code
          </button>
        </div>
      </form>
    </div>
  );
};

export default OTPVerification;