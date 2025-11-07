import React, { useState, useRef, useEffect } from "react";
import { Html5Qrcode, type Html5QrcodeResult } from "html5-qrcode";

type Html5QrcodeError = {
  name: string;
  message: string;
};
import { ScanLine, XCircle, AlertTriangle } from "lucide-react";

interface QrScannerProps {
  onScanSuccess: (decodedText: string, result: Html5QrcodeResult) => void;
  onScanFailure?: (error: Html5QrcodeError) => void;
  shouldStopAfterScan?: boolean; // New prop to control auto-stop behavior
}

const QrScanner: React.FC<QrScannerProps> = ({
  onScanSuccess,
  onScanFailure,
  shouldStopAfterScan = true, // Default to true
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = "qr-code-full-region";
  const lastErrorRef = useRef<string>("");
  const errorCountRef = useRef<number>(0);

  useEffect(() => {
    // Initialize the scanner
    scannerRef.current = new Html5Qrcode(scannerRegionId);

    return () => {
      // Cleanup on unmount
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (scannerRef.current && !scannerRef.current.isScanning) {
      setErrorMessage(null);
      lastErrorRef.current = "";
      errorCountRef.current = 0;
      
      try {
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText, result) => {
            // Stop scanner immediately on successful scan if shouldStopAfterScan is true
            if (shouldStopAfterScan) {
              stopScanner();
            }
            onScanSuccess(decodedText, result);
          },
          (errorMsg) => {
            // Filter out repetitive "No MultiFormat Readers" errors
            // These are normal - they happen when the camera doesn't see a valid QR code
            if (errorMsg.includes("No MultiFormat Readers")) {
              // Don't show this error to user, it's expected
              return;
            }
            
            // Only report other types of errors, and avoid spam
            if (errorMsg !== lastErrorRef.current) {
              lastErrorRef.current = errorMsg;
              errorCountRef.current = 1;
              
              if (onScanFailure) {
                onScanFailure({ name: "ScanError", message: errorMsg });
              }
            } else {
              errorCountRef.current++;
              // Only show error if it persists
              if (errorCountRef.current > 3 && onScanFailure) {
                onScanFailure({ name: "ScanError", message: errorMsg });
              }
            }
          }
        );
        setIsScanning(true);
      } catch (err: any) {
        setErrorMessage(
          "Failed to start scanner. Please ensure camera permissions are granted."
        );
        console.error("Scanner start error:", err);
      }
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current
        .stop()
        .then(() => {
          setIsScanning(false);
        })
        .catch((err) => {
          console.error("Scanner stop error:", err);
        });
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div
        id={scannerRegionId}
        className="w-full aspect-square bg-gray-100 rounded-md mb-4"
      />

      {errorMessage && (
        <div
          className="flex items-center p-2 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
          role="alert"
        >
          <AlertTriangle className="flex-shrink-0 inline w-4 h-4 mr-3" />
          <span className="sr-only">Info</span>
          <div>
            <span className="font-medium">Error!</span> {errorMessage}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ScanLine className="mr-2" size={16} />
            Start Scan
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <XCircle className="mr-2" size={16} />
            Stop Scan
          </button>
        )}
      </div>
    </div>
  );
};

export default QrScanner;
