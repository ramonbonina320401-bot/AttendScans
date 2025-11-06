import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

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
  fullName: string;
  email: string;
  password: string;
  otp?: string;
}

interface Errors {
  [key: string]: string; // Allows for dynamic error keys
}

export default function Signup() {
  const navigate = useNavigate();
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
      fullName: "",
      email: "",
      password: "",
      otp: "",
    });

  const [errors, setErrors] = useState<Errors>({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Effect to re-validate form
  useEffect(() => {
    if (selectedRole === "student") {
      setIsFormValid(
        !!studentFormData.firstName.trim() &&
          !!studentFormData.lastName.trim() &&
          !!studentFormData.email.trim() &&
          !!studentFormData.studentId.trim() &&
          !!studentFormData.password &&
          studentFormData.password.length >= 6
      );
    } else {
      setIsFormValid(
        !!instructorFormData.fullName.trim() &&
          !!instructorFormData.email.trim() &&
          !!instructorFormData.password &&
          instructorFormData.password.length >= 6
      );
    }
  }, [selectedRole, studentFormData, instructorFormData]);

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
    setInstructorFormData({ fullName: "", email: "", password: "" });
  };

  const handleStudentInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
      setStudentFormData((prevData: typeof studentFormData) => ({
      ...prevData,
      [name]: value,
    }));
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
      if (!studentFormData.password || studentFormData.password.length < 6)
        newErrors.password = "Password must be at least 6 characters";
    } else {
      if (!instructorFormData.fullName.trim())
        newErrors.fullName = "Full Name is required";
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

    try {
      const email = selectedRole === "student" ? studentFormData.email : instructorFormData.email;
      const password = selectedRole === "student" ? studentFormData.password : instructorFormData.password;

      if (!email || !password) {
        setErrors(prev => ({ ...prev, general: "Email and password are required" }));
        return;
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
            createdAt: new Date().toISOString()
          }
        : { 
            role: "instructor",
            fullName: instructorFormData.fullName,
            email: instructorFormData.email,
            createdAt: new Date().toISOString()
          };
      
      // Save to Firestore
      console.log("Saving user data to Firestore...");
      await setDoc(doc(db, "users", user.uid), userData);
      console.log("User data saved successfully");

      alert("Signup successful! Please check your email to verify your account before logging in.");
      navigate("/login");
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
          placeholder="12345678"
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
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            placeholder="Enter your full name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={instructorFormData.fullName}
            onChange={handleInstructorInputChange}
            required
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1 animate-shake">
              {errors.fullName}
            </p>
          )}
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
