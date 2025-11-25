import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { 
  isLockedOut, 
  recordFailedAttempt, 
  clearAttempts, 
  formatRemainingTime 
} from "./utils/bruteForceProtection";

// Define interfaces for form data and errors to ensure type safety
interface StudentFormData {
  firstName: string;
  lastName: string;
  middleInitial: string;
  email: string;
  studentId: string;
  password?: string;
  otp?: string;
}

interface InstructorFormData {
  firstName: string;
  lastName: string;
  middleInitial: string;
  email: string;
  password: string;
  accessKey: string;
  otp?: string;
}

interface Errors {
  [key: string]: string; // Allows for dynamic error keys
}

export default function Signup() {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const [selectedRole, setSelectedRole] = useState("student");
  
  const [studentFormData, setStudentFormData] = useState<StudentFormData>({
    firstName: "",
    lastName: "",
    middleInitial: "",
    email: "",
    studentId: "",
    password: "",
    otp: "",
  });
  const [instructorFormData, setInstructorFormData] =
    useState<InstructorFormData>({
      firstName: "",
      lastName: "",
      middleInitial: "",
      email: "",
      password: "",
      accessKey: "",
      otp: "",
    });

  const [errors, setErrors] = useState<Errors>({});
  
  // State for instructor access key lockout
  const [isAccessKeyLocked, setIsAccessKeyLocked] = useState(false);
  const [accessKeyLockoutTime, setAccessKeyLockoutTime] = useState(0);
  
  // State for email verification success modal
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (user && !loading) {
        try {
          // Don't auto-redirect unverified users. Some flows (signup) keep the
          // newly-created user signed in briefly which would otherwise cause
          // an immediate navigation and bypass the verification step shown in
          // the modal. Require email to be verified before redirecting.
          if (!user.emailVerified) {
            return;
          }

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
  const [isFormValid, setIsFormValid] = useState(false);

  // Effect to re-validate form
  useEffect(() => {
    if (selectedRole === "student") {
      setIsFormValid(
        !!studentFormData.firstName.trim() &&
          !!studentFormData.lastName.trim() &&
          !!studentFormData.email.trim() &&
          !!studentFormData.studentId.trim() &&
          /^\d{2}-\d{4}$/.test(studentFormData.studentId) &&
          !!studentFormData.password &&
          studentFormData.password.length >= 6
      );
    } else {
      setIsFormValid(
        !!instructorFormData.firstName.trim() &&
        !!instructorFormData.lastName.trim() &&
          !!instructorFormData.email.trim() &&
          !!instructorFormData.password &&
          instructorFormData.password.length >= 6 &&
          !!instructorFormData.accessKey.trim()
      );
    }
  }, [selectedRole, studentFormData, instructorFormData]);

  // Monitor access key lockout status
  useEffect(() => {
    if (selectedRole !== "instructor") return;
    
    const checkLockout = () => {
      const { locked, remainingTime } = isLockedOut('instructor-signup', 'instructor-access-key');
      setIsAccessKeyLocked(locked);
      setAccessKeyLockoutTime(remainingTime);
      
      if (!locked && errors.accessKey?.includes('locked')) {
        setErrors(prev => {
          const { accessKey, ...rest } = prev;
          return rest;
        });
      }
    };
    
    checkLockout();
    
    const interval = setInterval(() => {
      const { locked, remainingTime } = isLockedOut('instructor-signup', 'instructor-access-key');
      setIsAccessKeyLocked(locked);
      setAccessKeyLockoutTime(remainingTime);
      
      if (!locked && isAccessKeyLocked) {
        setErrors(prev => {
          const { accessKey, ...rest } = prev;
          return rest;
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [selectedRole, isAccessKeyLocked, errors.accessKey]);

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(event.target.value);
    setErrors({});
    setStudentFormData({
      firstName: "",
      lastName: "",
      middleInitial: "",
      email: "",
      studentId: "",
      password: "",
    });
    setInstructorFormData({ firstName: "", lastName: "", middleInitial: "", email: "", password: "", accessKey: "" });
  };

  const handleStudentInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    
    // Special handling for studentId to format as 00-0000
    if (name === "studentId") {
      // Remove all non-numeric characters
      const numericOnly = value.replace(/\D/g, "");
      
      // Format as 00-0000
      let formatted = numericOnly;
      if (numericOnly.length > 2) {
        formatted = `${numericOnly.slice(0, 2)}-${numericOnly.slice(2, 6)}`;
      }
      
      // Limit to 7 characters (00-0000)
      formatted = formatted.slice(0, 7);
      
      setStudentFormData((prevData: typeof studentFormData) => ({
        ...prevData,
        [name]: formatted,
      }));
    } else {
      setStudentFormData((prevData: typeof studentFormData) => ({
        ...prevData,
        [name]: value,
      }));
    }
    
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleInstructorInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
      setInstructorFormData((prevData: typeof instructorFormData) => ({
      ...prevData,
      [name]: value,
    }));
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[name];
      return newErrors;
    });
  };

  const validateForm = () => {
    const newErrors: Errors = {};
    if (selectedRole === "student") {
      if (!studentFormData.firstName.trim())
        newErrors.firstName = "First Name is required";
      if (!studentFormData.lastName.trim())
        newErrors.lastName = "Last Name is required";
      if (!studentFormData.email.trim())
        newErrors.email = "Email Address is required";
      else if (!/\S+@\S+\.\S+/.test(studentFormData.email))
        newErrors.email = "Email address is invalid";
      if (!studentFormData.studentId.trim())
        newErrors.studentId = "Student ID is required";
      else if (!/^\d{2}-\d{4}$/.test(studentFormData.studentId))
        newErrors.studentId = "Student ID must be in format: 00-0000";
      if (!studentFormData.password || studentFormData.password.length < 6)
        newErrors.password = "Password must be at least 6 characters";
    } else {
      if (!instructorFormData.firstName.trim())
        newErrors.firstName = "First Name is required";
      if (!instructorFormData.lastName.trim())
        newErrors.lastName = "Last Name is required";
      if (!instructorFormData.email.trim())
        newErrors.email = "Email Address is required";
      else if (!/\S+@\S+\.\S+/.test(instructorFormData.email))
        newErrors.email = "Email address is invalid";
      if (
        !instructorFormData.password ||
        instructorFormData.password.length < 6
      )
        newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      console.log("Form has errors. Please correct them.");
      return;
    }

    // Validate instructor access key if role is instructor
    if (selectedRole === "instructor") {
      // Check if locked out
      const lockoutCheck = isLockedOut('instructor-signup', 'instructor-access-key');
      if (lockoutCheck.locked) {
        setErrors(prev => ({ 
          ...prev, 
          accessKey: `Too many failed attempts. Please try again in ${formatRemainingTime(lockoutCheck.remainingTime)}.` 
        }));
        return;
      }

      // Fetch and validate the access key from Firestore
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
        
        if (!settingsDoc.exists()) {
          console.log('Settings document does not exist, using default key');
        }
        
        const instructorAccessKey = settingsDoc.exists() 
          ? (settingsDoc.data().instructorAccessKey || 'INSTRUCTOR2024').toString().trim()
          : 'INSTRUCTOR2024'; // Default fallback

        const enteredKey = instructorFormData.accessKey.trim();
        
        console.log('Entered key:', `"${enteredKey}"`);
        console.log('Expected key:', `"${instructorAccessKey}"`);
        console.log('Keys match:', enteredKey === instructorAccessKey);

        if (enteredKey !== instructorAccessKey) {
          // Record failed attempt
          const result = recordFailedAttempt('instructor-signup', 'instructor-access-key');
          
          if (result.locked) {
            setErrors(prev => ({ 
              ...prev, 
              accessKey: `Too many failed attempts. Access locked for 10 minutes.` 
            }));
            setIsAccessKeyLocked(true);
            setAccessKeyLockoutTime(600); // 10 minutes in seconds
          } else {
            setErrors(prev => ({ 
              ...prev, 
              accessKey: `Invalid instructor access key. (${result.attemptsLeft} attempts remaining)` 
            }));
          }
          return;
        }

        // Clear attempts on successful validation
        clearAttempts('instructor-signup', 'instructor-access-key');
        console.log('Access key validated successfully!');
      } catch (error) {
        console.error("Error validating access key:", error);
        setErrors(prev => ({ 
          ...prev, 
          accessKey: "Failed to validate access key. Please try again." 
        }));
        return;
      }
    }

    try {
      const email = selectedRole === "student" ? studentFormData.email : instructorFormData.email;
      const password = selectedRole === "student" ? studentFormData.password : instructorFormData.password;

      if (!email || !password) {
        setErrors(prev => ({ ...prev, general: "Email and password are required" }));
        return;
      }

      // Check for duplicate Student ID if signing up as student
      if (selectedRole === "student") {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const usersQuery = query(
          collection(db, 'users'),
          where('displayStudentId', '==', studentFormData.studentId.trim())
        );
        const existingStudents = await getDocs(usersQuery);
        
        if (!existingStudents.empty) {
          setErrors(prev => ({ 
            ...prev, 
            studentId: "This Student ID is already registered. Please use a different Student ID or contact support." 
          }));
          return;
        }
      }

      console.log("Starting signup process for:", email);

      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User created successfully:", user.uid);

      // Send verification email
      await sendEmailVerification(user);
      console.log("Verification email sent");

      // Store additional user data in Firestore
      const userData = selectedRole === "student" 
        ? { 
            role: "student",
            firstName: studentFormData.firstName,
            lastName: studentFormData.lastName,
            middleInitial: studentFormData.middleInitial,
            email: studentFormData.email,
            studentId: studentFormData.studentId,
            displayStudentId: studentFormData.studentId, // Store for matching with registeredStudents
            createdAt: new Date().toISOString()
          }
        : { 
            role: "instructor",
            firstName: instructorFormData.firstName,
            lastName: instructorFormData.lastName,
            middleInitial: instructorFormData.middleInitial,
            email: instructorFormData.email,
            createdAt: new Date().toISOString()
          };
      
      // Save to Firestore
      console.log("Saving user data to Firestore...");
      await setDoc(doc(db, "users", user.uid), userData);
      console.log("User data saved successfully");

      // Sign the user out so we don't auto-redirect them while they're
      // still unverified. The login page will enforce verification on sign-in.
      console.log("Signing out user to prevent auto-redirect...");
      await signOut(auth);
      console.log("User signed out successfully");
      
      // Small delay to ensure auth state fully propagates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Show verification modal instead of alert
      setSignupEmail(email);
      setShowVerificationModal(true);
    } catch (err: any) {
      console.error("Signup error details:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      let errorMessage = "Signup failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.code) {
        errorMessage = `Error: ${err.code} - ${err.message}`;
      }
      
      setErrors(prev => ({ ...prev, general: errorMessage }));
    }
  };

  // StudentInputs and InstructorInputs JSX (no changes needed)
  const StudentInputs = (
    <>
      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="Enter your first name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={studentFormData.firstName}
            onChange={handleStudentInputChange}
            required
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1 animate-shake">
              {errors.firstName}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            placeholder="Enter your last name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={studentFormData.lastName}
            onChange={handleStudentInputChange}
            required
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1 animate-shake">
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Middle Initial */}
      <div>
        <label
          htmlFor="middleInitial"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Middle Initial (Optional)
        </label>
        <input
          type="text"
          id="middleInitial"
          name="middleInitial"
          placeholder="M"
          maxLength={1}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow uppercase"
          value={studentFormData.middleInitial}
          onChange={handleStudentInputChange}
        />
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
          placeholder="your.email@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          value={studentFormData.email}
          onChange={handleStudentInputChange}
          required
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1 animate-shake">
            {errors.email}
          </p>
        )}
      </div>

      {/* Student ID */}
      <div>
        <label
          htmlFor="studentId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Student ID
        </label>
        <input
          type="text"
          id="studentId"
          name="studentId"
          placeholder="00-0000"
          maxLength={7}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          value={studentFormData.studentId}
          onChange={handleStudentInputChange}
          required
        />
        {errors.studentId && (
          <p className="text-red-500 text-sm mt-1 animate-shake">
            {errors.studentId}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
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
          placeholder="Enter a password (min. 6 characters)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          value={studentFormData.password}
          onChange={handleStudentInputChange}
          required
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1 animate-shake">
            {errors.password}
          </p>
        )}
      </div>
    </>
  );

  const InstructorInputs = (
    <>
      <div className="animate-fade-in space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              placeholder="Juan"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              value={instructorFormData.firstName}
              onChange={handleInstructorInputChange}
              required
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1 animate-shake">
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              placeholder="Dela Cruz"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              value={instructorFormData.lastName}
              onChange={handleInstructorInputChange}
              required
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1 animate-shake">
                {errors.lastName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="middleInitial"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Middle Initial (Optional)
          </label>
          <input
            type="text"
            id="middleInitial"
            name="middleInitial"
            placeholder="A."
            maxLength={2}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={instructorFormData.middleInitial}
            onChange={handleInstructorInputChange}
          />
        </div>

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
            placeholder="your.email@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={instructorFormData.email}
            onChange={handleInstructorInputChange}
            required
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1 animate-shake">
              {errors.email}
            </p>
          )}
        </div>

        <div>
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
            placeholder="Enter a password (min. 6 characters)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={instructorFormData.password}
            onChange={handleInstructorInputChange}
            required
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1 animate-shake">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="accessKey"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Instructor Access Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="accessKey"
            name="accessKey"
            placeholder="Enter instructor access key"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 transition-shadow ${
              isAccessKeyLocked
                ? 'border-red-300 bg-red-50'
                : errors.accessKey
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            value={instructorFormData.accessKey}
            onChange={handleInstructorInputChange}
            disabled={isAccessKeyLocked}
            required
          />
          {errors.accessKey && (
            <p className="text-red-500 text-sm mt-1 animate-shake">
              {errors.accessKey}
            </p>
          )}
          {isAccessKeyLocked && (
            <p className="text-red-600 text-xs mt-1 font-medium">
              🔒 Locked - Try again in {formatRemainingTime(accessKeyLockoutTime)}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Contact your administrator to obtain the instructor access key.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="bg-blue-50 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8 transform transition-all">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">
              📋 Create Account
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Select your role and enter your details to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector */}
            <div>
              <label
                htmlFor="role-selector"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Role
              </label>
              <select
                name="role-selector"
                id="role-selector"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                value={selectedRole}
                onChange={handleRoleChange}
              >
                <option value="student">🎓 Student</option>
                <option value="instructor">👤 Instructor</option>
              </select>
            </div>

            {selectedRole === "student" ? StudentInputs : InstructorInputs}

            {/* General Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={!isFormValid}
            >
              Register
            </button>
          </form>

          {/* This is now a <Link> component */}
          <p className="text-center text-sm text-gray-600 mt-4">
            I already have an account.{" "}
            <Link
              to="/login"
              className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>

      {/* Email Verification Success Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-fade-in">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <span className="text-4xl">✅</span>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Account Created Successfully!
              </h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  📧 Verification Email Sent
                </p>
                <p className="text-sm text-gray-700">
                  We've sent a verification email to:
                </p>
                <p className="text-sm font-semibold text-blue-600 mt-1">
                  {signupEmail}
                </p>
              </div>
              
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  ⚠️ Important: Verify Your Email Before Login
                </p>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the verification link in the email</li>
                  <li>Return to the login page</li>
                  <li>Sign in with your credentials</li>
                </ol>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  💡 <strong>Can't find the email?</strong> Check your spam/junk folder. If you still don't see it, you can request a new verification email from the login page.
                </p>
              </div>
              
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  navigate("/login");
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
              >
                Go to Login Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-adding the style tag here for animations, just in case */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </>
  );
}
