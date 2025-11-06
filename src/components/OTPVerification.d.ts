import React from 'react';
interface OTPVerificationProps {
    onSubmit: (otp: string) => void;
    onResend: () => void;
    error?: string;
}
declare const OTPVerification: React.FC<OTPVerificationProps>;
export default OTPVerification;
