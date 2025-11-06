import React from 'react';
interface VerificationStepProps {
    onVerify: (otp: string) => void;
    onResend: () => void;
    error?: string;
}
declare const VerificationStep: React.FC<VerificationStepProps>;
export default VerificationStep;
