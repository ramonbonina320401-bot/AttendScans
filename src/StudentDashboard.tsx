import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "./QrScanner";
import AttendanceReport from "./AttendanceReport";
import { markAttendance, type QRCodeData } from "./services/attendanceService";
import {
  CheckCircle,
  FileText,
  LogOut,
  Camera,
  Clock,
  ShieldCheck,
  Upload,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

// We need a non-visible element for the file scanner to mount to
const FILE_SCANNER_REGION_ID = "qr-file-scanner-region";

// --- Mock Data ---
// You would normally fetch this data from an API
const MOCK_STATS = {
  totalClasses: 20,
  present: 18,
  percentage: 90, // (18 / 20) * 100
};

const MOCK_HISTORY = [
  {
    id: "1",
    date: "October 26, 2025",
    subject: "Software Engineering",
    status: "Present" as const,
  },
  {
    id: "2",
    date: "October 25, 2025",
    subject: "Data Structures",
    status: "Present" as const,
  },
  {
    id: "3",
    date: "October 24, 2025",
    subject: "Software Engineering",
    status: "Absent" as const,
  },
  {
    id: "4",
    date: "October 23, 2025",
    subject: "Data Structures",
    status: "Present" as const,
  },
  {
    id: "5",
    date: "October 22, 2025",
    subject: "Software Engineering",
    status: "Present" as const,
  },
];

// This is the component that holds both pages
const StudentDashboard: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<"dashboard" | "report">("dashboard");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isAttendanceMarked, setIsAttendanceMarked] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // navigation
  const navigate = useNavigate();

  // --- Handlers ---

  const handleScanSuccess = async (decodedText: string) => {
    console.log("Scanned QR Code:", decodedText);
    
    try {
      // Parse the QR code data
      const qrData: QRCodeData = JSON.parse(decodedText);
      
      // Mark attendance using the service
      const result = await markAttendance(qrData);
      
      if (result.success) {
        setScanResult(`${qrData.className} - ${qrData.date}`);
        setIsAttendanceMarked(true);
        setIsCameraActive(false);
        setScanError(null);
        alert(`✅ ${result.message}\nClass: ${qrData.className}`);
      } else {
        setScanError(result.message);
        alert(`❌ ${result.message}`);
      }
    } catch (err: any) {
      console.error("Error processing QR code:", err);
      setScanError("Invalid QR code format. Please scan a valid attendance QR code.");
      alert("❌ Invalid QR code. Please scan the attendance QR code from your instructor.");
    }
  };

  const handleScanFailure = (error: any) => {
    const errorMessage = error.message || "Failed to scan QR code.";
    console.error("QR Scan Failed:", errorMessage);
    setScanError(`Scan Error: ${errorMessage}`);
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file = e.target.files[0];
    const fileScanner = new Html5Qrcode(FILE_SCANNER_REGION_ID, false);

    try {
      setScanError(null);
      setIsCameraActive(false);
      const decodedText = await fileScanner.scanFile(file, false);
      handleScanSuccess(decodedText);
    } catch (err: any) {
      handleScanFailure({
        name: "FileScanError",
        message: err.message || "Could not scan the selected file.",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // --- View Switching Logic ---

  if (view === "report") {
    return (
      <AttendanceReport
        onBack={() => setView("dashboard")}
        stats={MOCK_STATS}
        history={MOCK_HISTORY}
      />
    );
  }

  // --- Default View: Dashboard ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* --- Header --- */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-gray-800 text-white rounded-lg">
              <Camera size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Student Dashboard
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">Welcome, John A. Doe</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                  <ShieldCheck size={12} />
                  Verified
                </span>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            {/* THIS BUTTON NOW SWITCHES THE VIEW */}
            <button
              onClick={() => setView("report")}
              className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <FileText size={16} />
              View Report
            </button>
            <button
              onClick={() => {
                // stop camera if active and navigate to login
                setIsCameraActive(false);
                setScanError(null);
                navigate("/login");
              }}
              className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </nav>
        </header>

        {/* --- Main Dashboard Content --- */}
        <main className="space-y-6">
          {/* --- Attendance Status Card --- */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Clock size={20} className="text-gray-500" />
              Attendance Status
            </h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Today's Date</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 text-right">Status</p>
                {isAttendanceMarked ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">
                    <CheckCircle size={14} />
                    Marked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    <XCircle size={14} />
                    Not Marked
                  </span>
                )}
              </div>
            </div>
            {scanResult && isAttendanceMarked && (
              <div className="mt-4 p-3 rounded-lg bg-gray-100">
                <p className="text-xs text-gray-600 font-mono break-all">
                  <span className="font-bold text-gray-800">
                    Last Scan Result:
                  </span>{" "}
                  {scanResult}
                </p>
              </div>
            )}
          </div>

          {/* --- Scan QR Code Card --- */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Camera size={20} className="text-gray-500" />
              Scan Attendance QR Code
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Point your camera at the QR code displayed by your instructor
            </p>

            <div className="my-6">
              {isCameraActive ? (
                <QrScanner
                  onScanSuccess={(decodedText) => handleScanSuccess(decodedText)}
                  onScanFailure={handleScanFailure}
                />
              ) : (
                <div className="w-full aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500">
                  <Camera size={48} className="mb-2" />
                  <p className="font-medium">Camera not active</p>
                  <p className="text-sm">Click "Start Camera" to begin</p>
                </div>
              )}
            </div>

            {/* --- Error Message --- */}
            {scanError && (
              <div
                className="flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
                role="alert"
              >
                <AlertTriangle className="flex-shrink-0 inline w-4 h-4 mr-3" />
                <span className="sr-only">Error</span>
                <div>{scanError}</div>
              </div>
            )}

            {/* --- Action Buttons --- */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setIsCameraActive(!isCameraActive);
                  setScanError(null);
                }}
                className={`flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isCameraActive
                    ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                    : "bg-gray-900 text-white hover:bg-gray-700 focus:ring-gray-800"
                }`}
              >
                <Camera size={16} className="mr-2" />
                {isCameraActive ? "Stop Camera" : "Start Camera"}
              </button>
              <button
                onClick={handleUploadButtonClick}
                disabled={isCameraActive}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={16} className="mr-2" />
                Upload QR Image
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Hidden elements required by html5-qrcode */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        hidden
      />
      <div id={FILE_SCANNER_REGION_ID} style={{ display: "none" }}></div>
    </div>
  );
};

export default StudentDashboard;
