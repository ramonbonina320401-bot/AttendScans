import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role and metadata from Firestore first
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // If there's no user profile, sign out and show an error
        await signOut(auth);
        setError("User data not found. Please contact support.");
        setSubmitting(false);
        return;
      }

      const userData = userDoc.data();
      const userRole = userData.role;

      // Ensure the role the user selected in the login form matches the role in Firestore.
      // This prevents someone from selecting "student" and logging in with an instructor/admin account.
      if (role !== userRole) {
        await signOut(auth);
        setError(`Account role mismatch. This account is registered as '${userRole}'. Please select the correct role.`);
        setSubmitting(false);
        return;
      }

      // Check if email is verified (after role check so we get the correct error first)
      if (!user.emailVerified) {
        await signOut(auth);
        setError("Please verify your email before logging in.");
        setSubmitting(false);
        return;
      }

      // If logging in as a student, verify the entered student ID matches the stored record
      if (userRole === "student") {
        const storedStudentId = (userData.studentId ?? "").toString().trim();
        if (!studentNum || studentNum.toString().trim() !== storedStudentId) {
          await signOut(auth);
          setError("Student ID does not match our records. Please use the Student ID you registered with.");
          setSubmitting(false);
          return;
        }
      }

      // Success! Store user info if needed
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
      
      // Handle Firebase errors
      let errorMessage = "Login failed. Please check your credentials.";
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  // Handle role change
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value);
    setError(null); // Clear error on role change
    setPassword(""); // Clear password on role change
    setStudentNum(""); // Clear student num on role change
  };

  return (
    <div className="bg-blue-50 min-h-screen flex items-center justify-center p-4 font-sans">
      {successMsg && <SuccessPopup message={successMsg} />}

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
                onChange={(e) => setStudentNum(e.target.value)}
                placeholder="Enter your student ID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                required={role === "student"}
              />
            </div>
          )}

          {/* Password Field (for both roles) */}
          <div className="animate-fade-in">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
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
            disabled={submitting}
            className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Continue"}
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
