import { useEffect, useRef, useState } from "react";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface ActivityMonitorProps {
  children: React.ReactNode;
  timeout?: number; // Timeout in milliseconds (default: 5 minutes)
  warningTime?: number; // Warning time before logout in milliseconds (default: 1 minute)
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ 
  children, 
  timeout = 5 * 60 * 1000, // 5 minutes
  warningTime = 1 * 60 * 1000 // 1 minute warning
}) => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    // Hide warning if showing
    if (showWarning) {
      setShowWarning(false);
    }

    // Set warning timer (4 minutes for 5-minute timeout)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.floor(warningTime / 1000));
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeout - warningTime);

    // Set logout timer (5 minutes)
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeout);
  };

  const handleLogout = async () => {
    try {
      // Clear all timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleStayActive = () => {
    resetTimer();
  };

  useEffect(() => {
    // Events to track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Handle visibility change (mobile switching apps)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away - start a stricter timeout
        const timeAway = Date.now() - lastActivityRef.current;
        if (timeAway > timeout) {
          handleLogout();
        }
      } else {
        // User came back - check if too much time has passed
        const timeAway = Date.now() - lastActivityRef.current;
        if (timeAway > timeout) {
          handleLogout();
        } else {
          resetTimer();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [timeout, warningTime]);

  return (
    <>
      {children}
      
      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Inactivity Warning
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                You will be logged out due to inactivity in{" "}
                <span className="font-bold text-red-600">{countdown}</span> seconds.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Click the button below to stay logged in.
              </p>
              <button
                onClick={handleStayActive}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                I'm Still Here
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActivityMonitor;
