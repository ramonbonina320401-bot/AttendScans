import { Navigate } from "react-router-dom";
import { useState } from "react";

// --- SVG Icon ---
// A simple check icon to make lists look cleaner
const CheckIcon = () => (
  <svg
    className="w-5 h-5 inline-block mr-2 flex-shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

// --- Menu Page Component (Redesigned) ---
// Your redesigned Menu component
function Menu() {
  const [goToLogin, setGoToLogin] = useState(false);

  if (goToLogin) {
    return <Navigate to="/login" />;
  }

  return (
    // Set a background color for the whole page
    <div className="flex flex-col bg-slate-50 min-h-screen font-sans text-slate-800">
      <main className="flex-grow">
        {/* Header Section */}
        <section className="py-16 sm:py-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="text-center bg-white p-10 sm:p-14 rounded-2xl shadow-xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
                Daily Attendance QR System
              </h1>
              <p className="mt-6 text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto">
                Streamline attendance tracking with secure QR code technology.
                Simple, fast, and reliable for students and instructors.
              </p>
            </div>
          </div>
        </section>

        {/* Student & Instructor Section */}
        <section className="pb-16 sm:pb-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row gap-8">
            {/* Students Card */}
            <div className="flex-1 bg-emerald-50 rounded-2xl shadow-lg overflow-hidden p-8 sm:p-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-center text-emerald-900">
                For Students
              </h2>
              <h3 className="mt-4 text-xl sm:text-2xl font-semibold text-center text-emerald-800">
                Quick and easy attendance
              </h3>
              <ul className="mt-8 space-y-4 text-lg text-emerald-700">
                <li className="flex items-center">
                  <CheckIcon />
                  <span>Scan QR codes instantly</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon />
                  <span>View attendance history</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon />
                  <span>Email verification security</span>
                </li>
              </ul>
            </div>

            {/* Instructors Card */}
            <div className="flex-1 bg-blue-50 rounded-2xl shadow-lg overflow-hidden p-8 sm:p-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-center text-blue-900">
                For Instructors
              </h2>
              <h3 className="mt-4 text-xl sm:text-2xl font-semibold text-center text-blue-800">
                Powerful management
              </h3>
              <ul className="mt-8 space-y-4 text-lg text-blue-700">
                <li className="flex items-center">
                  <CheckIcon />
                  <span>Generate daily QR codes</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon />
                  <span>Real-time attendance tracking</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon />
                  <span>Export attendance as CSV</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="pb-16 sm:pb-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-10 sm:p-14">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-center text-slate-900 mb-12">
                How It Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {/* Step 1 */}
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-slate-200 text-slate-800 rounded-full mx-auto text-2xl font-bold">
                    1
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                    Sign In
                  </h3>
                  <p className="mt-2 text-base text-slate-600">
                    Students and instructors log in with their credentials and
                    verify their email.
                  </p>
                </div>
                {/* Step 2 */}
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-slate-200 text-slate-800 rounded-full mx-auto text-2xl font-bold">
                    2
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                    Generate or Scan
                  </h3>
                  <p className="mt-2 text-base text-slate-600">
                    Instructors create daily QR codes while students scan them
                    for attendance.
                  </p>
                </div>
                {/* Step 3 */}
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-slate-200 text-slate-800 rounded-full mx-auto text-2xl font-bold">
                    3
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                    Track
                  </h3>
                  <p className="mt-2 text-base text-slate-600">
                    View real-time attendance data and export reports for
                    record-keeping.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Get Started Button Section */}
        <section className="py-16">
          <div className="text-center">
            <button
              onClick={() => setGoToLogin(true)}
              className="px-10 py-5 sm:px-12 sm:py-6 text-2xl sm:text-3xl font-bold text-white bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              Get Started
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-slate-200 text-center">
        <p className="text-slate-600">
          © {new Date().getFullYear()} Daily Attendance QR System. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}

export default Menu;
