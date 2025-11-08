import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "./QrScanner";
import AttendanceReport from "./AttendanceReport";
import {
  markAttendance,
  getStudentAttendance,
  type QRCodeData,
  type AttendanceRecord,
} from "./services/attendanceService";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  CheckCircle,
  FileText,
  LogOut,
  Camera,
  Clock,
  ShieldCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

// We need a non-visible element for the file scanner to mount to
const FILE_SCANNER_REGION_ID = "qr-file-scanner-region";

// This is the component that holds both pages
const StudentDashboard: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<"dashboard" | "report">("dashboard");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isAttendanceMarked, setIsAttendanceMarked] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("Student");
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Prevent multiple scans
  const [sessionId, setSessionId] = useState<string>(""); // Manual session ID entry
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // navigation
  const navigate = useNavigate();

  // --- Fetch student data and attendance records on mount ---
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        // Fetch student info
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (userData) {
          const fullName = `${userData.firstName || ""} ${
            userData.lastName || ""
          }`.trim();
          setStudentName(fullName || "Student");
        }

        // Fetch attendance records
        const records = await getStudentAttendance();
        setAttendanceRecords(records);

        // Check if attendance is already marked today
        const today = new Date().toLocaleDateString();
        const markedToday = records.some((record) => record.date === today);
        setIsAttendanceMarked(markedToday);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching student data:", error);
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [navigate]);

  // --- Inactivity Auto-Logout (Student) ---
  useEffect(() => {
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    let timer: number | undefined;

    const logoutForInactivity = async () => {
      try {
        sessionStorage.setItem("inactiveLogout", "1");
        await signOut(auth);
      } catch (e) {
        console.error("Error during inactivity sign out", e);
      } finally {
        navigate("/login?inactive=1", { replace: true });
      }
    };

    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(logoutForInactivity, TIMEOUT_MS);
    };

    const activityEvents: (keyof DocumentEventMap | keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "visibilitychange",
    ];

    const handleActivity = () => {
      // Don't reset if already processing sign out
      if (!isProcessing) resetTimer();
    };

    activityEvents.forEach((evt) => document.addEventListener(evt, handleActivity));
    resetTimer();

    return () => {
      if (timer) window.clearTimeout(timer);
      activityEvents.forEach((evt) =>
        document.removeEventListener(evt, handleActivity)
      );
    };
  }, [navigate, isProcessing]);

  // --- Handlers ---

  const handleScanSuccess = async (decodedText: string) => {
    // Prevent processing if already processing
    if (isProcessing) {
      console.log("Already processing a scan, ignoring...");
      return;
    }

    console.log("Scanned QR Code:", decodedText);
    setIsProcessing(true);
    setScanError(null); // Clear any previous errors

    try {
      // Parse the QR code data
      const qrData: QRCodeData = JSON.parse(decodedText);

      // Mark attendance using the service
      const result = await markAttendance(qrData);

      if (result.success) {
        setScanResult(`${qrData.className} - ${qrData.date}`);
        setIsAttendanceMarked(true);
        setIsCameraActive(false); // Stop camera on success
        setScanError(null);

        // Refresh attendance records
        const records = await getStudentAttendance();
        setAttendanceRecords(records);

        // Show success message in UI
        setScanError(`✅ Success! Attendance marked for ${qrData.className}`);

        // Clear success message after 5 seconds
        setTimeout(() => {
          setScanError(null);
        }, 5000);
      } else {
        // Failed validation (course/section mismatch, etc.)
        setIsCameraActive(false); // Stop camera on validation error
        setScanError(`❌ ${result.message}`);
        // Clear error after 5 seconds
        setTimeout(() => {
          setScanError(null);
        }, 5000);
      }
    } catch (err: any) {
      console.error("Error processing QR code:", err);
      setIsCameraActive(false); // Stop camera on invalid QR format
      setScanError(
        "❌ Invalid QR code format. Please scan a valid attendance QR code."
      );
      // Clear error after 5 seconds
      setTimeout(() => {
        setScanError(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEntry = async () => {
    if (!sessionId.trim()) {
      setScanError("❌ Please enter a valid Session ID");
      setTimeout(() => setScanError(null), 3000);
      return;
    }

    if (isProcessing) {
      console.log("Already processing, ignoring...");
      return;
    }

    setIsProcessing(true);

    try {
      // Fetch the QR data from Firestore using session ID
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );
      const { db } = await import("./firebase");

      // Try to find an active session with this sessionId (8-character code)
      const sessionsQuery = query(
        collection(db, "activeSessions"),
        where("sessionId", "==", sessionId.trim().toUpperCase())
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);

      if (sessionsSnapshot.empty) {
        setScanError(
          "❌ Invalid or expired Session ID. Please check with your instructor."
        );
        setTimeout(() => setScanError(null), 5000);
        setIsProcessing(false);
        return;
      }

      const sessionData = sessionsSnapshot.docs[0].data();
      const qrData: QRCodeData = {
        classId: sessionData.classId,
        className: sessionData.className,
        instructorId: sessionData.instructorId,
        instructorName: sessionData.instructorName,
        timestamp: sessionData.timestamp,
        expiresAt: sessionData.expiresAt,
        date: sessionData.date,
        sessionId: sessionData.sessionId,
        course: sessionData.course || "",
        section: sessionData.section || "",
      };

      // Mark attendance using the service
      const result = await markAttendance(qrData);

      if (result.success) {
        setScanResult(`${qrData.className} - ${qrData.date}`);
        setIsAttendanceMarked(true);
        setIsCameraActive(false);
        setScanError(`✅ Success! Attendance marked for ${qrData.className}`);
        setSessionId("");

        // Refresh attendance records
        const records = await getStudentAttendance();
        setAttendanceRecords(records);

        setTimeout(() => setScanError(null), 5000);
      } else {
        setScanError(`❌ ${result.message}`);
        setTimeout(() => setScanError(null), 5000);
      }
    } catch (error: any) {
      console.error("Error with manual entry:", error);
      setScanError(
        "❌ Failed to mark attendance. Please try scanning the QR code instead."
      );
      setTimeout(() => setScanError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanFailure = (error: any) => {
    const errorMessage = error.message || "Failed to scan QR code.";

    // Don't show "No MultiFormat Readers" errors - these are normal when camera doesn't see a QR code
    if (errorMessage.includes("No MultiFormat Readers")) {
      return;
    }

    console.error("QR Scan Failed:", errorMessage);

    // Only show meaningful errors
    if (!errorMessage.includes("NotFoundException")) {
      setScanError(`Scan Error: ${errorMessage}`);
    }
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
    // Calculate stats from real attendance records
    const totalClasses = attendanceRecords.length;
    const present = attendanceRecords.filter(
      (r) => r.status === "present"
    ).length;
    const percentage =
      totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0;

    // Format attendance records for the report - pass scannedAt for time display
    const formattedHistory = attendanceRecords.map((record, index) => ({
      id: index.toString(),
      date: record.date,
      subject: `${record.course} - ${record.section}`, // Show course and section
      status: record.status === "late" ? "Late" as const : "Present" as const,
      scannedAt: record.scannedAt, // Pass the scan timestamp
    }));

    return (
      <AttendanceReport
        onBack={() => setView("dashboard")}
        stats={{ totalClasses, present, percentage }}
        history={formattedHistory}
        studentName={studentName}
      />
    );
  }

  // --- Default View: Dashboard ---

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
                <p className="text-sm text-gray-600">Welcome, {studentName}</p>
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
                setShowLogoutConfirm(true);
              }}
              className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </nav>
        </header>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <LogOut className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Confirm Logout
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to log out? You will need to log in
                  again to mark attendance.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // stop camera if active
                        setIsCameraActive(false);
                        setScanError(null);
                        setShowLogoutConfirm(false);
                        // Sign out from Firebase
                        await signOut(auth);
                        // Navigate to login
                        navigate("/login", { replace: true });
                      } catch (error) {
                        console.error("Error signing out:", error);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  onScanSuccess={(decodedText) =>
                    handleScanSuccess(decodedText)
                  }
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

            {/* --- Status Message --- */}
            {scanError && (
              <div
                className={`flex items-center p-4 mb-4 text-sm rounded-lg ${
                  scanError.startsWith("✅")
                    ? "text-green-800 bg-green-50"
                    : "text-red-800 bg-red-50"
                }`}
                role="alert"
              >
                {scanError.startsWith("✅") ? (
                  <CheckCircle className="flex-shrink-0 inline w-4 h-4 mr-3" />
                ) : (
                  <AlertTriangle className="flex-shrink-0 inline w-4 h-4 mr-3" />
                )}
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
            </div>

            {/* --- Manual Session ID Entry --- */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                Can't Scan? Enter Session ID
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Ask your instructor for the 8-character Session ID displayed on
                screen
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC12345"
                  maxLength={8}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 font-mono tracking-wider uppercase"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleManualEntry}
                  disabled={!sessionId.trim() || isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : "Submit"}
                </button>
              </div>
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
