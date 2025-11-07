import React from "react";
import { type Html5QrcodeResult } from "html5-qrcode";
type Html5QrcodeError = {
    name: string;
    message: string;
};
interface QrScannerProps {
    onScanSuccess: (decodedText: string, result: Html5QrcodeResult) => void;
    onScanFailure?: (error: Html5QrcodeError) => void;
    shouldStopAfterScan?: boolean;
}
declare const QrScanner: React.FC<QrScannerProps>;
export default QrScanner;
