import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { 
  isLockedOut, 
  recordFailedAttempt, 
  clearAttempts, 
  formatRemainingTime 
} from "./utils/bruteForceProtection";

// --- Success Popup Component ---
const SuccessPopup = ({ message }: { message: string }) => (
  <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-down">
    {message}
  </div>
);

// --- Login Component ---
export default function LoginComponent() {
  const navigate = useNavigate(); // Initialize the navigation hook
  const [user, loading] = useAuthState(auth);

  // State for form fields
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentNum, setStudentNum] = useState(""); // Added Student ID state

  // State for submission and feedback
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [studentIdError, setStudentIdError] = useState<string | null>(null);

  // State for lockout
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // State for forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // State for email verification
  const [showVerificationNeeded, setShowVerificationNeeded] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (user && !loading) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userRole = userDoc.data().role;
            if (userRole === "student") {
              navigate("/StudentDashboard", { replace: true });
            } else if (userRole === "instructor" || userRole === "admin") {
              navigate("/dashboard", { replace: true });
            }
          }
        } catch (error) {
          console.error("Error checking auth:", error);
        }
      }
    };
    checkAuth();
  }, [user, loading, navigate]);

  // Check lockout status and update countdown
  useEffect(() => {
    const checkLockout = () => {
      if (!email) return;
      
      const { locked, remainingTime } = isLockedOut(email, 'login');
      setIsLocked(locked);
      setLockoutTime(remainingTime);
      
      if (!locked) {
        setError(null);
      }
    };
    
    checkLockout();
    
    // Update countdown every second if locked
    const interval = setInterval(() => {
      if (email) {
        const { locked, remainingTime } = isLockedOut(email, 'login');
        setIsLocked(locked);
        setLockoutTime(remainingTime);
        
        if (!locked && isLocked) {
          setError(null);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [email, isLocked]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if locked out
    const { locked, remainingTime } = isLockedOut(email, 'login');
    if (locked) {
      setError(`Too many failed attempts. Please try again in ${formatRemainingTime(remainingTime)}.`);
      return;
    }

    setSubmitting(true);

    // Validate student ID format if role is student
    if (role === "student") {
      if (!studentNum || studentNum.trim().length === 0) {
        setError("Please enter your Student ID.");
        setStudentIdError("Student ID is required");
        setSubmitting(false);
        return;
      }
      
      if (!/^\d{2}-\d{4}$/.test(studentNum)) {
        setError("Please enter a valid Student ID in format 00-0000.");
        setStudentIdError("Invalid format. Must be 00-0000");
        setSubmitting(false);
        return;
      }
    }

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role and metadata from Firestore first
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // If there's no user profile, sign out and show an error
        await signOut(auth);
        
        // Record failed attempt
        const result = recordFailedAttempt(email, 'login');
        if (result.locked) {
          setError(`Too many failed attempts. Account locked for 3 minutes.`);
          setIsLocked(true);
          setLockoutTime(180);
        } else {
          setError(`User data not found. Please contact support. (${result.attemptsLeft} attempts remaining)`);
        }
        setSubmitting(false);
        return;
      }

      const userData = userDoc.data();
      const userRole = userData.role;

      // Ensure the role the user selected in the login form matches the role in Firestore.
      // This prevents someone from selecting "student" and logging in with an instructor/admin account.
      if (role !== userRole) {
        await signOut(auth);
        
        // Record failed attempt
        const result = recordFailedAttempt(email, 'login');
        if (result.locked) {
          setError(`Too many failed attempts. Account locked for 3 minutes.`);
          setIsLocked(true);
          setLockoutTime(180);
        } else {
          setError(`Login failed. Please check your credentials and role. (${result.attemptsLeft} attempts remaining)`);
        }
        setSubmitting(false);
        return;
      }

      // Check if email is verified (after role check so we get the correct error first)
      if (!user.emailVerified) {
        console.log("❌ Email not verified for:", email);
        console.log("Signing out and showing verification modal...");
        await signOut(auth);
        setVerificationEmail(email);
        setShowVerificationNeeded(true);
        setError("Email verification required. Please check your inbox and verify your email address.");
        console.log("Verification modal state set to:", true);
        setSubmitting(false);
        return;
      }
      
      console.log("✅ Email verified for:", email);

      // If logging in as a student, verify the entered student ID matches the stored record
      if (userRole === "student") {
        const storedStudentId = (userData.studentId ?? "").toString().trim();
        if (!studentNum || studentNum.toString().trim() !== storedStudentId) {
          await signOut(auth);
          
          // Record failed attempt
          const result = recordFailedAttempt(email, 'login');
          if (result.locked) {
            setError(`Too many failed attempts. Account locked for 3 minutes.`);
            setIsLocked(true);
            setLockoutTime(180);
          } else {
            setError(`Student ID does not match our records. (${result.attemptsLeft} attempts remaining)`);
          }
          setSubmitting(false);
          return;
        }
      }

      // Success! Clear any failed attempts
      clearAttempts(email, 'login');
      
      console.log("Logged in user:", user);
      setSuccessMsg("Login successful! Redirecting...");
      
      // Navigate based on actual role from database
      setTimeout(() => {
        if (userRole === "student") {
          navigate("/StudentDashboard");
        } else if (userRole === "instructor" || userRole === "admin") {
          navigate("/dashboard");
        } else {
          setError("Invalid user role. Please contact support.");
          setSubmitting(false);
        }
      }, 1200);
      
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Record failed attempt for authentication errors
      const result = recordFailedAttempt(email, 'login');
      
      // Handle Firebase errors
      let errorMessage = "Login failed. Please check your credentials.";
      if (err.code === "auth/user-not-found") {
        errorMessage = `No account found with this email.`;
      } else if (err.code === "auth/wrong-password") {
        errorMessage = `Incorrect password.`;
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      // Add attempts remaining to error message if not locked
      if (result.locked) {
        setError(`Too many failed attempts. Account locked for 3 minutes.`);
        setIsLocked(true);
        setLockoutTime(180);
      } else if (err.code !== "auth/invalid-email" && err.code !== "auth/too-many-requests") {
        setError(`${errorMessage} (${result.attemptsLeft} attempts remaining)`);
      } else {
        setError(errorMessage);
      }
      
      setSubmitting(false);
    }
  };

  // Handle role change
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value);
    setError(null); // Clear error on role change
    setStudentIdError(null); // Clear student ID error
    setPassword(""); // Clear password on role change
    setStudentNum(""); // Clear student num on role change
  };

  // Handle student ID input with auto-formatting
  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Remove all non-numeric characters
    const numericOnly = value.replace(/\D/g, "");
    
    // Format as 00-0000
    let formatted = numericOnly;
    if (numericOnly.length > 2) {
      formatted = `${numericOnly.slice(0, 2)}-${numericOnly.slice(2, 6)}`;
    }
    
    // Limit to 7 characters (00-0000)
    formatted = formatted.slice(0, 7);
    
    setStudentNum(formatted);
    setError(null); // Clear general error on input change
    
    // Validate format and show specific error
    if (formatted.length === 0) {
      setStudentIdError(null); // No error if empty (required validation will handle)
    } else if (formatted.length < 7) {
      setStudentIdError("Student ID must be 6 digits (00-0000)");
    } else if (!/^\d{2}-\d{4}$/.test(formatted)) {
      setStudentIdError("Invalid format. Use 00-0000");
    } else {
      setStudentIdError(null); // Valid format
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    setResetLoading(true);

    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      setResetLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError("Please enter a valid email address.");
      setResetLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess("Password reset email sent! Check your inbox.");
      setResetEmail("");
      
      // Close modal after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      
      let errorMessage = "Failed to send reset email. Please try again.";
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      }
      
      setResetError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    setVerificationMessage(null);
    setIsResendingVerification(true);

    try {
      // Sign in temporarily to get the user object
      const { sendEmailVerification } = await import("firebase/auth");
      const userCredential = await signInWithEmailAndPassword(auth, verificationEmail, password);
      const user = userCredential.user;

      if (user.emailVerified) {
        // Email is already verified
        setVerificationMessage("✅ Your email is already verified! Please try logging in again.");
        setShowVerificationNeeded(false);
        await signOut(auth);
        setIsResendingVerification(false);
        return;
      }

      // Send verification email
      await sendEmailVerification(user);
      await signOut(auth);
      
      setVerificationMessage("✅ Verification email sent! Please check your inbox (and spam folder).");
      
      setTimeout(() => {
        setVerificationMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Resend verification error:", err);
      
      let errorMessage = "Failed to resend verification email.";
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errorMessage = "Unable to resend. Please check your password and try again.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      }
      
      setVerificationMessage(`❌ ${errorMessage}`);
      
      setTimeout(() => {
        setVerificationMessage(null);
      }, 5000);
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="bg-blue-50 min-h-screen flex items-center justify-center p-4 font-sans">
      {successMsg && <SuccessPopup message={successMsg} />}

      {/* Email Verification Modal - Render at top level for visibility */}
      {showVerificationNeeded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-fade-in-down">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">📧</span>
                Email Verification Required
              </h2>
              <button
                onClick={() => {
                  setShowVerificationNeeded(false);
                  setVerificationMessage(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Your account needs email verification before you can log in.</strong>
                </p>
                <p className="text-sm text-gray-600">
                  A verification email was sent to:
                </p>
                <p className="text-sm font-semibold text-blue-600 mt-1 break-all">
                  {verificationEmail}
                </p>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium">Steps to verify:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the verification link in the email</li>
                  <li>Return here and log in again</li>
                </ol>
              </div>

              {verificationMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  verificationMessage.startsWith('✅')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {verificationMessage}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isResendingVerification ? "Sending..." : "Resend Verification Email"}
                </button>
                <button
                  onClick={() => {
                    setShowVerificationNeeded(false);
                    setVerificationMessage(null);
                  }}
                  className="w-full bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                💡 Tip: Check your spam folder if you don't see the email
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8 transform transition-all">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            📋 Welcome To AttendScan
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Select your role and enter your details to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selector */}
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Role
            </label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={handleRoleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            >
              <option value="student">🎓 Student</option>
              <option value="instructor">👤 Instructor</option>
            </select>
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              required
            />
          </div>

          {/* Student ID (Conditional) */}
          {role === "student" && (
            <div className="animate-fade-in">
              <label
                htmlFor="student_num"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Student ID
              </label>
              <input
                type="text"
                id="student_num"
                name="student_num"
                value={studentNum}
                onChange={handleStudentIdChange}
                placeholder="00-0000"
                maxLength={7}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 transition-shadow ${
                  studentIdError
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                }`}
                required={role === "student"}
              />
              {studentIdError && (
                <p className="text-red-500 text-xs mt-1 animate-shake">
                  {studentIdError}
                </p>
              )}
            </div>
          )}

          {/* Password Field (for both roles) */}
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm text-center animate-shake">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || isLocked}
            className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLocked 
              ? `Locked - Try again in ${formatRemainingTime(lockoutTime)}`
              : submitting 
                ? "Submitting..." 
                : "Continue"
            }
          </button>

          {/* Register Link now uses <Link> */}
          <p className="text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            >
              Register here
            </Link>
          </p>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-fade-in-down">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="reset-email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  required
                />
              </div>

              {resetError && (
                <p className="text-red-500 text-sm animate-shake">
                  {resetError}
                </p>
              )}

              {resetSuccess && (
                <p className="text-green-600 text-sm">
                  {resetSuccess}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adding simple animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }

        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.5s ease-out; }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}
