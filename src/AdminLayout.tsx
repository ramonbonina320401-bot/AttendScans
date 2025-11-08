import React, {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useRef,
} from "react";
import ReactDOM from "react-dom"; // FIXED: Added missing import for ReactDOM
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import {
  isLockedOut,
  recordFailedAttempt,
  clearAttempts,
  formatRemainingTime,
} from "./utils/bruteForceProtection";
// --- react-icons imports ARE NOW INCLUDED ---
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiSettings,
  FiMenu,
  FiSearch,
  FiBell,
  FiChevronDown,
  FiX,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMoreVertical,
  FiDownload,
  FiUpload,
  FiRefreshCw,
  FiAlertTriangle,
  FiArrowUp,
} from "react-icons/fi";
import { FaQrcode } from "react-icons/fa";
// Date formatting is done inline with native JS, no import needed

// --- TYPE DEFINITIONS ---
export interface Student {
  id: string;
  name: string;
  email: string;
  course: string;
  section: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  status: "PRESENT" | "LATE" | "ABSENT";
  course: string; // Course name
  section: string; // Section identifier
  className?: string; // Optional class name for display
}

// --- REACT CONTEXT FOR STATE MANAGEMENT ---
interface DashboardContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  records: AttendanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  stats: { total: number; present: number; absent: number; late: number };
  // Modal functions
  openAddModal: () => void;
  openEditModal: (student: Student) => void;
  openDeleteModal: (student: Student) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

// Custom hook to use the context
const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

// --- NAVIGATION ITEMS ---
interface NavItem {
  label: string;
  icon: React.ElementType; // Use ElementType for the component itself
  to: string;
}
const navItems: NavItem[] = [
  // --- Icons restored ---
  { label: "Dashboard", icon: FiHome, to: "/dashboard" },
  { label: "Generate QR Code", icon: FaQrcode, to: "/dashboard/generate-qr" },
  { label: "Attendance Records", icon: FiFileText, to: "/dashboard/records" },
  { label: "Student Management", icon: FiUsers, to: "/dashboard/students" },
  { label: "Settings", icon: FiSettings, to: "/dashboard/settings" },
];

// --- CUSTOM STYLED COMPONENTS (No shadcn) ---

// Base Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    const baseStyle =
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary: "bg-gray-800 text-white hover:bg-gray-700",
      outline:
        "border border-gray-300 bg-white hover:bg-gray-100 text-gray-800",
      ghost: "hover:bg-gray-100 text-gray-800",
      danger: "bg-red-600 text-white hover:bg-red-500",
    };

    const sizes = {
      default: "px-4 py-2 text-sm",
      sm: "px-3 py-1.5 text-xs",
      icon: "h-9 w-9",
    };

    return (
      <button
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Base Card
const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div
    className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
  >
    {children}
  </div>
);
const CardHeader: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <div className={`p-4 sm:p-6 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);
const CardTitle: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);
const CardDescription: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
);
const CardContent: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <div className={`p-4 sm:p-6 ${className}`}>{children}</div>
);

// Base Input
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 ${className}`}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

// Base Label
const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  className,
  ...props
}) => (
  <label
    className={`block text-sm font-medium text-gray-700 mb-1.5 ${className}`}
    {...props}
  />
);
Label.displayName = "Label";

// Custom Modal
const CustomModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md p-6 bg-white rounded-lg shadow-xl m-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:bg-gray-100"
        >
          <FiX className="w-5 h-5" /> {/* ICON RESTORED */}
          <span className="sr-only">Close modal</span>
        </button>
        {children}
      </div>
    </div>
  );
};

// Custom Select (Styled Native)
const CustomSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className="relative">
    <select
      className={`w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 pr-12 text-base font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-500 whitespace-nowrap overflow-hidden text-ellipsis ${className}`}
      style={{ minHeight: "44px" }}
      {...props}
    >
      {children}
    </select>
    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />{" "}
    {/* ICON RESTORED */}
  </div>
);

// Custom Date Picker (Styled Native)
const CustomDatePicker: React.FC<
  React.InputHTMLAttributes<HTMLInputElement>
> = ({ className, ...props }) => (
  <Input type="date" className={`relative ${className}`} {...props} />
);

// A Portal component to render dropdowns at the top level of the DOM
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Renders children into the body only on the client-side
  return mounted ? ReactDOM.createPortal(children, document.body) : null;
};

// Custom Dropdown (for action menus) - Modified to use Portal
const CustomDropdown: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate the position of the dropdown content relative to the trigger button
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Position below the trigger, aligning its right edge with the trigger's right edge
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX,
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition(); // Recalculate position just before opening
    }
    setIsOpen((prev) => !prev);
  };

  // Close the dropdown if a click occurs outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={triggerRef}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Clone the trigger to add the onClick handler
          if ((child.type as any).displayName === "DropdownTrigger") {
            return React.cloneElement(child, {
              onClick: handleToggle,
            } as any);
          }
          // If open, render the content inside a Portal
          if ((child.type as any).displayName === "DropdownContent") {
            return isOpen ? (
              <Portal>
                {React.cloneElement(child, {
                  ref: contentRef, // Forward ref to the content
                  style: {
                    position: "absolute", // Use absolute because it's relative to the document
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    transform: "translateX(-100%)", // Align right edge
                  },
                } as any)}
              </Portal>
            ) : null;
          }
        }
        return null;
      })}
    </div>
  );
};
const DropdownTrigger: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = (props) => <Button variant="ghost" size="icon" {...props} />;
DropdownTrigger.displayName = "DropdownTrigger";

const DropdownContent = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    align?: "right" | "left";
    style?: React.CSSProperties;
  }
>(({ children, style }, ref) => (
  <div
    ref={ref}
    style={style} // Apply dynamic styles for positioning
    className={`fixed z-50 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5`}
  >
    {children}
  </div>
));
DropdownContent.displayName = "DropdownContent";

const DropdownMenuItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, ...props }) => (
  <button
    className={`w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${className}`}
    {...props}
  />
);
DropdownMenuItem.displayName = "DropdownMenuItem";

// Custom Tabs
const CustomTabs: React.FC<{
  defaultValue: string;
  children: React.ReactNode;
}> = ({ defaultValue, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if ((child.type as any).displayName === "TabsList") {
            return React.cloneElement(child, {
              activeTab,
              setActiveTab,
            } as any);
          }
          if ((child.type as any).displayName === "TabsContent") {
            return (child.props as any).value === activeTab ? child : null;
          }
        }
        return null;
      })}
    </div>
  );
};
const TabsList: React.FC<{
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}> = ({ children, activeTab, setActiveTab }) => (
  <div className="flex border-b border-gray-200 overflow-x-auto">
    {React.Children.map(children, (child) => {
      if (
        React.isValidElement(child) &&
        (child.type as any).displayName === "TabsTrigger"
      ) {
        const childProps = child.props as any;
        return React.cloneElement(child, {
          isActive: childProps.value === activeTab,
          onClick: () => setActiveTab && setActiveTab(childProps.value),
        } as any);
      }
      return null;
    })}
  </div>
);
TabsList.displayName = "TabsList";

const TabsTrigger: React.FC<{
  value: string;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}> = ({ children, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap
      ${
        isActive
          ? "border-gray-800 text-gray-900"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
  >
    {children}
  </button>
);
TabsTrigger.displayName = "TabsTrigger";

const TabsContent: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={`pt-6 ${className}`}>{children}</div>
);
TabsContent.displayName = "TabsContent";

// --- LAYOUT COMPONENTS (Sidebar, Topbar) ---

const Topbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { students, records } = useDashboard();

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Track recent attendance (last 5 minutes)
  useEffect(() => {
    const checkRecentAttendance = () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recent = records
        .filter((record) => {
          const scannedDate = new Date(record.date + " " + record.time);
          return scannedDate > fiveMinutesAgo;
        })
        .sort((a, b) => {
          const dateA = new Date(a.date + " " + a.time);
          const dateB = new Date(b.date + " " + b.time);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10); // Get last 10

      setRecentAttendance(recent);
      setUnreadCount(recent.length);
    };

    checkRecentAttendance();
    // Check every 30 seconds for new attendance
    const interval = setInterval(checkRecentAttendance, 30000);
    return () => clearInterval(interval);
  }, [records]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const results: any[] = [];

      // Search students
      students.forEach((student) => {
        if (
          student.name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query) ||
          student.id.toLowerCase().includes(query) ||
          student.course.toLowerCase().includes(query) ||
          student.section.toLowerCase().includes(query)
        ) {
          results.push({
            type: "student",
            data: student,
            label: student.name,
            sublabel: `${student.email} - ${student.course} - Section ${student.section}`,
          });
        }
      });

      // Search attendance records
      records.forEach((record) => {
        if (
          record.name.toLowerCase().includes(query) ||
          record.studentId.toLowerCase().includes(query) ||
          record.course.toLowerCase().includes(query) ||
          record.section.toLowerCase().includes(query) ||
          (record.className && record.className.toLowerCase().includes(query))
        ) {
          results.push({
            type: "attendance",
            data: record,
            label: `${record.name} - ${record.className || "Attendance"}`,
            sublabel: `${record.date} - ${record.course} - Section ${record.section}`,
          });
        }
      });

      setSearchResults(results.slice(0, 10)); // Limit to 10 results
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, students, records]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center">
          <Button
            onClick={onMenuClick}
            variant="ghost"
            size="icon"
            className="p-2 -ml-2 rounded-md text-gray-500 lg:hidden"
            aria-label="Open sidebar"
          >
            <FiMenu className="w-6 h-6" /> {/* ICON RESTORED */}
          </Button>
          <h1 className="text-xl font-semibold text-gray-800 ml-2 lg:ml-0">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="relative hidden sm:block" ref={searchRef}>
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />{" "}
            {/* ICON RESTORED */}
            <Input
              type="text"
              placeholder="Search students, attendance..."
              className="pl-10 pr-4 py-2 w-32 sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() =>
                searchQuery.length > 0 && setShowSearchResults(true)
              }
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full sm:w-96 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 px-2 py-1">
                    SEARCH RESULTS ({searchResults.length})
                  </p>
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.type}-${index}`}
                      className="px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer"
                      onClick={() => {
                        setSearchQuery("");
                        setShowSearchResults(false);
                      }}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          {result.type === "student" ? (
                            <FiUsers className="w-4 h-4 text-blue-500" />
                          ) : (
                            <FiFileText className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {result.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {result.sublabel}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          {result.type === "student" ? "Student" : "Attendance"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showSearchResults &&
              searchResults.length === 0 &&
              searchQuery.length > 0 && (
                <div className="absolute top-full mt-2 w-full sm:w-96 bg-white rounded-md shadow-lg border border-gray-200 p-4 z-50">
                  <p className="text-sm text-gray-500 text-center">
                    No results found for "{searchQuery}"
                  </p>
                </div>
              )}
          </div>
          <div className="relative" ref={notificationRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  setUnreadCount(0); // Mark as read when opened
                }
              }}
            >
              <FiBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-2 right-2 block w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </>
              )}
              <span className="sr-only">View notifications</span>
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg border border-gray-200 max-h-[32rem] overflow-y-auto z-50">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Recent Attendance
                    </h3>
                    {recentAttendance.length > 0 && (
                      <span className="text-xs text-gray-500">
                        Last 5 minutes
                      </span>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {recentAttendance.length > 0 ? (
                    recentAttendance.map((record, index) => (
                      <div
                        key={`notification-${record.id}-${index}`}
                        className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <FiUsers className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {record.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {record.course} - Section {record.section}
                            </p>
                            {record.className && (
                              <p className="text-xs text-gray-600 mt-1">
                                {record.className}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {record.time} - {record.date}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {record.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <FiBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        No recent attendance
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        New attendance scans will appear here
                      </p>
                    </div>
                  )}
                </div>

                {recentAttendance.length > 0 && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        // Could navigate to attendance records page
                      }}
                      className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View All Attendance Records
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100"
            >
              <img
                className="w-8 h-8 rounded-full"
                src="https://ui-avatars.com/api/?name=Admin&background=333&color=fff&rounded=true&size=32"
                alt="Admin"
              />
              <span className="hidden md:block font-medium text-gray-700 text-sm">
                Admin
              </span>
              <FiChevronDown className="hidden md:block w-4 h-4 text-gray-500" />{" "}
              {/* ICON RESTORED */}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                <Link
                  to="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </Link>
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirm Sign Out
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to sign out? You will need to log in again
                to access your dashboard.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    handleLogout();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const Sidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed top-0 left-0 h-screen z-40">
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <img
          src="/attendscan_logo.png"
          alt="AttendScan Logo"
          className="w-8 h-8"
        />
        <span className="ml-3 text-lg font-bold text-gray-800 tracking-wide">
          ATTENDSCAN
        </span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon as React.ElementType; // Assert type now
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium
                 ${isActive ? "bg-gray-100 text-gray-900" : ""}`
              }
            >
              {/* --- RENDER ICON CORRECTLY --- */}
              <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

const MobileSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white z-50 transform transition-transform duration-300 lg:hidden flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <img
              src="/attendscan_logo.png"
              alt="AttendScan Logo"
              className="w-8 h-8"
            />
            <span className="ml-3 text-lg font-bold text-gray-800">
              ATTENDSCAN
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <FiX className="w-6 h-6" /> {/* ICON RESTORED */}
          </Button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon as React.ElementType; // Assert type now
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium
                   ${isActive ? "bg-gray-100 text-gray-900" : ""}`
                }
              >
                {/* --- RENDER ICON CORRECTLY --- */}
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

// --- PAGE COMPONENTS ---

/**
 * 1. DASHBOARD PAGE
 */
export const DashboardPage: React.FC = () => {
  const { stats, setRecords } = useDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { getInstructorAttendanceRecords } = await import(
        "./services/adminService"
      );
      const recordsData = await getInstructorAttendanceRecords();

      const mappedRecords: AttendanceRecord[] = recordsData.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        name: r.studentName,
        date: r.date,
        time: new Date(r.scannedAt).toLocaleTimeString(),
        status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT",
        course: r.course || "N/A",
        section: r.section || "N/A",
        className: r.className,
      }));

      setRecords(mappedRecords);
      console.log("Dashboard refreshed:", mappedRecords.length, "records");
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Calculate today's stats from total records
    // For now showing proportional values based on total stats
    setTodayStats({
      present: Math.round(stats.present * 0.7), // Mock today percentage
      late: Math.round(stats.late * 0.8),
      absent: Math.round(stats.absent * 0.5),
    });
  }, [stats]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Today's attendance statistics</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <FiRefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="TOTAL ATTENDANCE"
              value={stats.total}
              percentage={100}
              description="All attendance records"
            />
            <StatCard
              title="PRESENT TODAY"
              value={todayStats.present}
              percentage={
                stats.total > 0
                  ? Math.round((todayStats.present / stats.total) * 100)
                  : 0
              }
              description="Marked as present"
            />
            <StatCard
              title="LATE TODAY"
              value={todayStats.late}
              percentage={
                stats.total > 0
                  ? Math.round((todayStats.late / stats.total) * 100)
                  : 0
              }
              description="Arrived after schedule"
            />
            <StatCard
              title="ABSENT TODAY"
              value={todayStats.absent}
              percentage={
                stats.total > 0
                  ? Math.round((todayStats.absent / stats.total) * 100)
                  : 0
              }
              description="No attendance recorded"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Link to="/dashboard/generate-qr" className="flex-1">
            <Button size="default" variant="primary" className="w-full">
              <FaQrcode className="mr-2 h-5 w-5" /> {/* ICON RESTORED */}
              Generate Today's QR Code
            </Button>
          </Link>
          <Link to="/dashboard/records" className="flex-1">
            <Button size="default" variant="outline" className="w-full">
              <FiFileText className="mr-2 h-5 w-5" /> {/* ICON RESTORED */}
              View Attendance Records
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper component for StatCard
interface StatCardProps {
  title: string;
  value: string | number;
  percentage: number;
  description: string;
}
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  percentage,
  description,
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-500">
        {title}
      </CardTitle>
      <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
        {percentage}%
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-bold">{value}</div>
      <p className="text-xs text-gray-500 pt-1">{description}</p>
    </CardContent>
  </Card>
);

/**
 * 2. GENERATE QR CODE PAGE
 */
export const GenerateQrPage: React.FC = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [sessionData, setSessionData] = useState<any>(null);
  const [selectedCourseSection, setSelectedCourseSection] =
    useState<string>("");
  const [className, setClassName] = useState<string>("");
  const [duration, setDuration] = useState<number>(60); // Default 1 hour in minutes
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [deployedAt, setDeployedAt] = useState<Date | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endVerificationCode, setEndVerificationCode] = useState("");
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Fetch instructor's courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { db, auth } = await import("./firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        const user = auth.currentUser;

        if (user) {
          const courseDoc = await getDoc(
            doc(db, "instructorCourses", user.uid)
          );
          if (courseDoc.exists()) {
            const fetchedCourseSections = courseDoc.data().courseSections || [];
            setCourseSections(fetchedCourseSections);
            // Set first course-section as default if available
            if (fetchedCourseSections.length > 0) {
              setSelectedCourseSection(
                `${fetchedCourseSections[0].course} - Section ${fetchedCourseSections[0].section}`
              );
            }
          }
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const generateQRCode = async () => {
    if (!selectedCourseSection) {
      alert("Please select a course-section first");
      return;
    }
    if (!className.trim()) {
      alert("Please enter a class name");
      return;
    }

    setIsGenerating(true);
    try {
      // Import the service dynamically to avoid import issues
      const { generateQRCodeData } = await import(
        "./services/attendanceService"
      );

      // Extract course and section from selectedCourseSection (format: "CS101 - Section A")
      const match = selectedCourseSection.match(/^(.+?)\s*-\s*Section\s*(.+)$/);
      const course = match ? match[1].trim() : selectedCourseSection;
      const section = match ? match[2].trim() : "A";

      // Combine course-section and class name for the full class identifier
      const fullClassName = `${selectedCourseSection} - ${className}`;

      // Generate QR code data with course and section
      const qrData = await generateQRCodeData(
        fullClassName,
        duration,
        course,
        section
      );
      setSessionData(qrData);

      // Generate QR code image
      const qrString = JSON.stringify(qrData);
      const qrImageUrl = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeUrl(qrImageUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
      alert("Failed to generate QR code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedCourseSection) {
      alert("Please select a course-section first");
      return;
    }
    if (!className.trim()) {
      alert("Please enter a class name");
      return;
    }

    // Generate new QR code with current settings first
    setIsGenerating(true);
    try {
      console.log(
        "Starting deployment with course-section:",
        selectedCourseSection,
        "className:",
        className,
        "duration:",
        duration
      );

      const { generateQRCodeData } = await import(
        "./services/attendanceService"
      );

      // Extract course and section from selectedCourseSection (format: "CS101 - Section A")
      const match = selectedCourseSection.match(/^(.+?)\s*-\s*Section\s*(.+)$/);
      const course = match ? match[1].trim() : selectedCourseSection;
      const section = match ? match[2].trim() : "A";

      // Combine course-section and class name
      const fullClassName = `${selectedCourseSection} - ${className}`;
      const qrData = await generateQRCodeData(
        fullClassName,
        duration,
        course,
        section
      );
      console.log("Generated QR data:", qrData);
      setSessionData(qrData);

      // Generate QR code image
      const qrString = JSON.stringify(qrData);
      const qrImageUrl = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      console.log("QR code image generated");
      setQrCodeUrl(qrImageUrl);

      // Save active session to Firestore with sessionId
      const { collection, addDoc } = await import("firebase/firestore");
      const { db, auth } = await import("./firebase");
      const user = auth.currentUser;

      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!qrData) {
        throw new Error("QR data not generated");
      }

      console.log("Saving to Firestore...");
      await addDoc(collection(db, "activeSessions"), {
        sessionId: qrData.sessionId, // Store the unique session ID
        classId: qrData.classId,
        className: qrData.className,
        instructorId: user.uid,
        instructorName: qrData.instructorName,
        timestamp: qrData.timestamp,
        expiresAt: qrData.expiresAt,
        date: qrData.date,
        course: qrData.course,
        section: qrData.section,
        deployedAt: new Date().toISOString(),
      });
      console.log(
        "Active session saved to Firestore with sessionId:",
        qrData.sessionId
      );

      setIsDeployed(true);
      setDeployedAt(new Date());
      console.log("Deployment successful!");
    } catch (error: any) {
      console.error("Error deploying QR code:", error);
      console.error("Error details:", error.message, error.stack);
      alert(
        `Failed to deploy QR code: ${
          error.message || "Unknown error"
        }. Please try again.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEndDeployment = () => {
    if (endVerificationCode.toLowerCase() === "redeploy") {
      setIsDeployed(false);
      setDeployedAt(null);
      setShowEndModal(false);
      setEndVerificationCode("");
    } else {
      alert("Incorrect verification code. Please type 'redeploy' to confirm.");
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `attendance-qr-${sessionData.date}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Deployed View - Full Screen QR Display
  if (isDeployed) {
    return (
      <>
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold">{sessionData?.className}</h1>
              <p className="text-sm text-gray-300">Scan to mark attendance</p>
            </div>
            <Button variant="danger" onClick={() => setShowEndModal(true)}>
              <FiX className="mr-2 h-4 w-4" />
              End Deployment
            </Button>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center justify-start p-4 md:p-8 min-h-full">
              {qrCodeUrl && (
                <>
                  {/* QR Code */}
                  <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl mb-6">
                    <img
                      src={qrCodeUrl}
                      alt="Attendance QR Code"
                      className="w-full max-w-lg md:max-w-xl"
                      style={{ maxWidth: "500px", height: "auto" }}
                    />
                  </div>

                  {/* Session ID Display */}
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl px-6 py-5 w-full max-w-lg mb-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        📱 Can't scan? Use this Session ID:
                      </p>
                      <div className="bg-white rounded-lg px-6 py-4 border-2 border-blue-200">
                        <p className="text-3xl md:text-4xl font-bold font-mono text-blue-900 tracking-wider">
                          {sessionData?.sessionId || "N/A"}
                        </p>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Students can enter this 8-character code manually if
                        scanning fails
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="bg-gray-50 rounded-xl px-6 py-5 w-full max-w-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Deployed At
                        </p>
                        <p className="font-semibold text-gray-900">
                          {deployedAt?.toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Valid Until
                        </p>
                        <p className="font-semibold text-gray-900">
                          {sessionData &&
                            new Date(
                              sessionData.expiresAt
                            ).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                        <p className="font-semibold text-gray-900">
                          {duration >= 60
                            ? `${duration / 60} hour${duration > 60 ? "s" : ""}`
                            : `${duration} min`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Date</p>
                        <p className="font-semibold text-gray-900">
                          {sessionData?.date}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* End Deployment Modal */}
        <CustomModal
          isOpen={showEndModal}
          onClose={() => setShowEndModal(false)}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-3 bg-red-100 rounded-full">
                <FiAlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  End QR Code Deployment?
                </h3>
                <p className="text-sm text-gray-500">
                  This will stop students from scanning this QR code
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                To confirm, please type{" "}
                <span className="font-mono font-bold">redeploy</span> below:
              </p>
            </div>

            <div>
              <Label htmlFor="verify-code">Verification Code</Label>
              <Input
                id="verify-code"
                type="text"
                placeholder="Type 'redeploy' to confirm"
                value={endVerificationCode}
                onChange={(e) => setEndVerificationCode(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEndModal(false);
                  setEndVerificationCode("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleEndDeployment}
                disabled={endVerificationCode.toLowerCase() !== "redeploy"}
              >
                End Deployment
              </Button>
            </div>
          </div>
        </CustomModal>
      </>
    );
  }

  // Normal View - Configuration & Preview
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <FaQrcode className="mx-auto h-12 w-12 text-gray-700" />
        <CardTitle className="text-2xl pt-2">Attendance QR Code</CardTitle>
        <CardDescription>
          Configure and deploy your attendance QR code
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {/* QR Code Preview */}
        {qrCodeUrl ? (
          <div className="p-4 bg-white border rounded-lg shadow-sm">
            <img
              src={qrCodeUrl}
              alt="Attendance QR Code Preview"
              width={300}
              height={300}
            />
            <p className="text-xs text-center text-gray-500 mt-2">Preview</p>
          </div>
        ) : (
          <div className="p-4 bg-gray-100 border border-dashed border-gray-300 rounded-lg w-[300px] h-[300px] flex flex-col items-center justify-center">
            <FaQrcode className="h-20 w-20 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              Select course and class name
            </p>
            <p className="text-gray-400 text-xs">
              Then click Generate or Deploy
            </p>
          </div>
        )}

        {/* Configuration Inputs */}
        <div className="w-full space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="course-input">Course & Section</Label>
            {isLoadingCourses ? (
              <Input value="Loading..." disabled className="w-full" />
            ) : courseSections.length > 0 ? (
              <CustomSelect
                id="course-input"
                value={selectedCourseSection}
                onChange={(e) => setSelectedCourseSection(e.target.value)}
                className="w-full"
                required
              >
                {courseSections.map((cs) => {
                  const displayValue = `${cs.course} - Section ${cs.section}`;
                  return (
                    <option key={displayValue} value={displayValue}>
                      {displayValue}
                    </option>
                  );
                })}
              </CustomSelect>
            ) : (
              <div className="w-full">
                <Input value="No courses available" disabled />
                <p className="text-xs text-gray-500 mt-1">
                  Add course-sections in Settings → Courses
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-input">Class Name</Label>
            <Input
              id="class-input"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full"
              placeholder="e.g., Lecture 1, Midterm Review"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration-input">Duration</Label>
            {/* QR Code validity duration */}
            <CustomSelect
              id="duration-input"
              value={duration.toString()}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="360">6 hours</option>
              <option value="720">12 hours</option>
              <option value="1440">24 hours</option>
            </CustomSelect>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleDeploy}
            disabled={
              isGenerating ||
              !className ||
              !selectedCourseSection ||
              courseSections.length === 0
            }
          >
            <FiRefreshCw className="mr-2 h-5 w-5" />
            Deploy QR Code (Full Screen)
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={generateQRCode}
              disabled={
                isGenerating ||
                !className ||
                !selectedCourseSection ||
                courseSections.length === 0
              }
            >
              <FiRefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={!qrCodeUrl}
            >
              <FiDownload className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-800">
            <strong>💡 Tip:</strong> Click "Deploy QR Code" to show a large,
            full-screen QR code that students can easily scan. The validity
            timer starts when you deploy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 3. ATTENDANCE RECORDS PAGE
 */
export const AttendanceRecordsPage: React.FC = () => {
  const { records, setRecords } = useDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get current year's January 1st
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];
  const [dateTo, setDateTo] = useState(today);

  // Filter states
  const [selectedCourse, setSelectedCourse] = useState("All Courses");
  const [selectedSection, setSelectedSection] = useState("All Sections");

  // Sorting state
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Get unique courses and sections from records
  const uniqueCourseSections = useMemo(() => {
    const coursesSet = new Set<string>();
    const sectionsSet = new Set<string>();

    records.forEach((record) => {
      if (record.course && record.course !== "N/A")
        coursesSet.add(record.course);
      if (record.section && record.section !== "N/A")
        sectionsSet.add(record.section);
    });

    return {
      courses: ["All Courses", ...Array.from(coursesSet).sort()],
      sections: ["All Sections", ...Array.from(sectionsSet).sort()],
    };
  }, [records]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { getInstructorAttendanceRecords } = await import(
        "./services/adminService"
      );
      const recordsData = await getInstructorAttendanceRecords();

      const mappedRecords: AttendanceRecord[] = recordsData.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        name: r.studentName,
        date: r.date,
        time: new Date(r.scannedAt).toLocaleTimeString(),
        status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT",
        course: r.course || "N/A",
        section: r.section || "N/A",
        className: r.className,
      }));

      setRecords(mappedRecords);
      console.log("Attendance records refreshed:", mappedRecords.length);
    } catch (error) {
      console.error("Error refreshing attendance records:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReset = () => {
    setDateFrom(`${currentYear}-01-01`);
    setDateTo(today);
    setSelectedCourse("All Courses");
    setSelectedSection("All Sections");
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const filteredRecords = useMemo(() => {
    let filtered = records.filter((record) => {
      // Date filtering
      const recordDate = new Date(record.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      const withinDateRange = recordDate >= fromDate && recordDate <= toDate;

      // Course filtering
      const courseMatch =
        selectedCourse === "All Courses" || record.course === selectedCourse;

      // Section filtering
      const sectionMatch =
        selectedSection === "All Sections" ||
        record.section === selectedSection;

      return withinDateRange && courseMatch && sectionMatch;
    });

    // Sort by name
    filtered.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortOrder === "asc") {
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      } else {
        return nameA > nameB ? -1 : nameA < nameB ? 1 : 0;
      }
    });

    return filtered;
  }, [records, dateFrom, dateTo, selectedCourse, selectedSection, sortOrder]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              View and filter student attendance records
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-4 sm:mt-0"
          >
            <FiRefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Date From</Label>
              <CustomDatePicker
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <CustomDatePicker
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Course</Label>
              <CustomSelect
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {uniqueCourseSections.courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div>
              <Label>Section</Label>
              <CustomSelect
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                {uniqueCourseSections.sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:col-span-2 lg:col-span-4">
              <Button
                type="button"
                className="flex-1"
                onClick={(e) => e.preventDefault()}
              >
                Apply Filters
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <CardTitle>Attendance List</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="mt-4 sm:mt-0"
          >
            <FiArrowUp
              className={`mr-2 h-4 w-4 transition-transform ${
                sortOrder === "desc" ? "rotate-180" : ""
              }`}
            />
            Sort by Name ({sortOrder === "asc" ? "A-Z" : "Z-A"})
          </Button>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border relative">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    STUDENT ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    NAME
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    COURSE & SECTION
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    DATE
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    TIME
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 font-medium">
                        {record.studentId}
                      </td>
                      <td className="px-4 py-3">{record.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center">
                          {record.course} - Section {record.section}
                        </span>
                      </td>
                      <td className="px-4 py-3">{record.date}</td>
                      <td className="px-4 py-3">{record.time}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center px-4 py-4">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-white p-4 rounded-lg border shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">{record.name}</p>
                      <p className="text-xs text-gray-500">
                        {record.studentId}
                      </p>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>
                  <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Course:</span>
                      <span className="font-medium text-gray-800">
                        {record.course} - Section {record.section}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span className="font-medium text-gray-800">
                        {record.date}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span className="font-medium text-gray-800">
                        {record.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No records found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper for Status Badge
const StatusBadge: React.FC<{ status: AttendanceRecord["status"] }> = ({
  status,
}) => {
  const colors = {
    PRESENT: "bg-green-100 text-green-800",
    LATE: "bg-yellow-100 text-yellow-800",
    ABSENT: "bg-red-100 text-red-800",
  };
  const S = status.toUpperCase() as keyof typeof colors;
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        colors[S] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
};

/**
 * 4. STUDENT MANAGEMENT PAGE
 */
export const StudentManagementPage: React.FC = () => {
  const { students, openAddModal, openEditModal, openDeleteModal } =
    useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const handleDownloadTemplate = async () => {
    try {
      // Dynamically import xlsx
      const XLSX = await import('xlsx');
      
      // Create template data with headers and example rows
      const templateData = [
        {
          'STUDENT ID': '2021-00001',
          'LAST NAME': 'Doe',
          'FIRST NAME': 'John',
          'MIDDLE INITIAL': 'A',
          'EMAIL': 'john.doe@example.com',
          'PROGRAM': 'BSIT',
          'COURSE': 'IM101',
          'SECTION': '1-4'
        },
        {
          'STUDENT ID': '2021-00002',
          'LAST NAME': 'Smith',
          'FIRST NAME': 'Jane',
          'MIDDLE INITIAL': 'B',
          'EMAIL': 'jane.smith@example.com',
          'PROGRAM': 'BSCS',
          'COURSE': 'CS201',
          'SECTION': 'A'
        },
        {
          'STUDENT ID': '',
          'LAST NAME': '',
          'FIRST NAME': '',
          'MIDDLE INITIAL': '',
          'EMAIL': '',
          'PROGRAM': '',
          'COURSE': '',
          'SECTION': ''
        }
      ];

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 },  // STUDENT ID
        { wch: 20 },  // LAST NAME
        { wch: 20 },  // FIRST NAME
        { wch: 15 },  // MIDDLE INITIAL
        { wch: 30 },  // EMAIL
        { wch: 12 },  // PROGRAM
        { wch: 12 },  // COURSE
        { wch: 10 }   // SECTION
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, 'Student_Import_Template.xlsx');
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      // Dynamically import xlsx
      const XLSX = await import('xlsx');
      
      // Read the file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        alert('The Excel file is empty. Please add student data and try again.');
        setIsImporting(false);
        return;
      }

      // Validate and process the imported data
      const { addStudentToClass } = await import('./services/adminService');
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const row of jsonData) {
        // Skip empty rows or example rows
        if (!row['STUDENT ID'] || !row['EMAIL'] || !row['FIRST NAME'] || !row['LAST NAME']) {
          continue;
        }

        try {
          // Format the name: "LAST NAME, FIRST NAME MIDDLE INITIAL"
          const middleInitial = row['MIDDLE INITIAL'] ? ` ${row['MIDDLE INITIAL']}.` : '';
          const fullName = `${row['LAST NAME']}, ${row['FIRST NAME']}${middleInitial}`;

          // Format course: "PROGRAM - COURSE - Section SECTION"
          const program = row['PROGRAM']?.trim() || '';
          const course = row['COURSE']?.trim() || '';
          const section = row['SECTION']?.trim() || '';

          if (!program || !course || !section) {
            errors.push(`Row with Student ID ${row['STUDENT ID']}: Missing PROGRAM, COURSE, or SECTION`);
            failCount++;
            continue;
          }

          const studentData = {
            name: fullName.trim(),
            email: row['EMAIL']?.toString().trim().toLowerCase() || '',
            course: course,
            section: section,
          };

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(studentData.email)) {
            errors.push(`Row with Student ID ${row['STUDENT ID']}: Invalid email format`);
            failCount++;
            continue;
          }

          const result = await addStudentToClass(studentData);
          
          if (result.success) {
            successCount++;
          } else {
            errors.push(`${row['STUDENT ID']} - ${row['FIRST NAME']} ${row['LAST NAME']}: ${result.message}`);
            failCount++;
          }
        } catch (err: any) {
          errors.push(`${row['STUDENT ID']}: ${err.message}`);
          failCount++;
        }
      }

      // Show results
      let message = `Import completed!\n✅ Successfully imported: ${successCount} students`;
      if (failCount > 0) {
        message += `\n❌ Failed: ${failCount} students`;
        if (errors.length > 0 && errors.length <= 5) {
          message += '\n\nErrors:\n' + errors.join('\n');
        } else if (errors.length > 5) {
          message += '\n\nShowing first 5 errors:\n' + errors.slice(0, 5).join('\n');
          message += `\n... and ${errors.length - 5} more errors`;
        }
      }

      alert(message);

      // Reload students list
      if (successCount > 0) {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      alert(`Failed to import Excel file: ${error.message}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Management</CardTitle>
        <CardDescription>Add, edit, or remove student records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-6">
          {/* Search and Add Button Row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search students..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button className="w-full sm:w-auto" onClick={openAddModal}>
              <FiPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </div>

          {/* Excel Import/Export Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              📊 Bulk Import via Excel
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Save time by importing multiple students at once using our Excel template
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadTemplate}
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Download Excel Template
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={triggerFileInput}
                disabled={isImporting}
              >
                <FiUpload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing...' : 'Import Excel File'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                style={{ display: 'none' }}
              />
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>💡 How to use:</strong> Download the template, fill in your student data (STUDENT ID, NAME, EMAIL, PROGRAM, COURSE, SECTION), save it, and then import it back. All students will be added automatically!
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-lg border relative">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  STUDENT ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  NAME
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  EMAIL
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  COURSE & SECTION
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-medium">{student.id}</td>
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3">{student.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center">
                        {student.course} - Section {student.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CustomDropdown>
                        <DropdownTrigger>
                          <FiMoreVertical className="h-4 w-4" />{" "}
                          {/* ICON RESTORED */}
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownMenuItem
                            onClick={() => openEditModal(student)}
                          >
                            <FiEdit2 className="mr-2 h-4 w-4" />{" "}
                            {/* ICON RESTORED */}
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteModal(student)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <FiTrash2 className="mr-2 h-4 w-4" />{" "}
                            {/* ICON RESTORED */}
                            Delete
                          </DropdownMenuItem>
                        </DropdownContent>
                      </CustomDropdown>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center px-4 py-4">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white p-4 rounded-lg border shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.id}</p>
                  </div>
                  <CustomDropdown>
                    <DropdownTrigger>
                      <FiMoreVertical className="h-5 w-5 text-gray-500" />
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownMenuItem onClick={() => openEditModal(student)}>
                        <FiEdit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteModal(student)}
                        className="text-red-600"
                      >
                        <FiTrash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownContent>
                  </CustomDropdown>
                </div>
                <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-gray-800 truncate">
                      {student.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Course:</span>
                    <span className="font-medium text-gray-800">
                      {student.course} - Section {student.section}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No students found.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 5. SETTINGS PAGE
 */

interface CourseSection {
  course: string;
  section: string;
}

export const SettingsPage: React.FC = () => {
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [newCourse, setNewCourse] = useState("");
  const [newSection, setNewSection] = useState("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [lateThreshold, setLateThreshold] = useState<number>(15); // Late threshold in minutes
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [universityName, setUniversityName] = useState("University Name");

  // Admin account state
  const [adminEmail, setAdminEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordLocked, setIsPasswordLocked] = useState(false);
  const [passwordLockoutTime, setPasswordLockoutTime] = useState(0);

  // Fetch courses and settings on mount
  useEffect(() => {
    const fetchCoursesAndSettings = async () => {
      try {
        const { db, auth } = await import("./firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        const user = auth.currentUser;

        if (user) {
          // Set admin email from current user
          setAdminEmail(user.email || "");

          // Fetch courses
          const courseDoc = await getDoc(
            doc(db, "instructorCourses", user.uid)
          );
          if (courseDoc.exists()) {
            setCourseSections(courseDoc.data().courseSections || []);
          }

          // Fetch settings
          const settingsDoc = await getDoc(doc(db, "settings", user.uid));
          if (settingsDoc.exists()) {
            const settingsData = settingsDoc.data();
            setLateThreshold(settingsData.lateThreshold || 15);
            setUniversityName(settingsData.universityName || "University Name");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingCourses(false);
        setIsLoadingSettings(false);
      }
    };

    fetchCoursesAndSettings();
  }, []);

  // Monitor password change lockout status
  useEffect(() => {
    if (!adminEmail) return;

    const checkLockout = () => {
      const { locked, remainingTime } = isLockedOut(
        adminEmail,
        "password-change"
      );
      setIsPasswordLocked(locked);
      setPasswordLockoutTime(remainingTime);

      if (!locked && passwordError?.includes("locked")) {
        setPasswordError(null);
      }
    };

    checkLockout();

    const interval = setInterval(() => {
      const { locked, remainingTime } = isLockedOut(
        adminEmail,
        "password-change"
      );
      setIsPasswordLocked(locked);
      setPasswordLockoutTime(remainingTime);

      if (!locked && isPasswordLocked) {
        setPasswordError(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [adminEmail, isPasswordLocked, passwordError]);

  const handleAddCourseSection = async () => {
    if (!newCourse.trim() || !newSection.trim()) {
      alert("Please enter both course and section");
      return;
    }

    // Check if this course-section combination already exists
    const exists = courseSections.some(
      (cs) => cs.course === newCourse.trim() && cs.section === newSection.trim()
    );

    if (exists) {
      alert("This course-section combination already exists");
      return;
    }

    try {
      const { db, auth } = await import("./firebase");
      const { doc, setDoc } = await import("firebase/firestore");
      const user = auth.currentUser;

      if (user) {
        const updatedCourseSections = [
          ...courseSections,
          {
            course: newCourse.trim(),
            section: newSection.trim(),
          },
        ];
        await setDoc(doc(db, "instructorCourses", user.uid), {
          courseSections: updatedCourseSections,
          updatedAt: new Date().toISOString(),
        });
        setCourseSections(updatedCourseSections);
        setNewCourse("");
        setNewSection("");
      }
    } catch (error) {
      console.error("Error adding course-section:", error);
      alert("Failed to add course-section. Please try again.");
    }
  };

  const handleDeleteCourseSection = async (courseSection: CourseSection) => {
    try {
      const { db, auth } = await import("./firebase");
      const { doc, setDoc } = await import("firebase/firestore");
      const user = auth.currentUser;

      if (user) {
        const updatedCourseSections = courseSections.filter(
          (cs) =>
            !(
              cs.course === courseSection.course &&
              cs.section === courseSection.section
            )
        );
        await setDoc(doc(db, "instructorCourses", user.uid), {
          courseSections: updatedCourseSections,
          updatedAt: new Date().toISOString(),
        });
        setCourseSections(updatedCourseSections);
      }
    } catch (error) {
      console.error("Error deleting course-section:", error);
      alert("Failed to delete course-section. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { db, auth } = await import("./firebase");
      const { doc, setDoc } = await import("firebase/firestore");
      const user = auth.currentUser;

      if (user) {
        // Get form data
        const form = e.target as HTMLFormElement;
        const universityNameInput = form.querySelector('#university-name') as HTMLInputElement;
        const lateThresholdInput = form.querySelector('#late-threshold') as HTMLInputElement;

        // Determine which form was submitted based on which fields exist
        const isGeneralForm = universityNameInput !== null;
        const isAttendanceForm = lateThresholdInput !== null;

        if (isGeneralForm) {
          // Save general settings (university name)
          const newUniversityName = universityNameInput.value.trim();
          await setDoc(
            doc(db, "settings", user.uid),
            {
              universityName: newUniversityName,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          setUniversityName(newUniversityName);
          alert("General settings saved successfully!");
        } else if (isAttendanceForm) {
          // Save attendance settings (late threshold)
          await setDoc(
            doc(db, "settings", user.uid),
            {
              lateThreshold,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          alert("Attendance settings saved successfully!");
        }
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Check if locked out
    const lockoutCheck = isLockedOut(adminEmail, "password-change");
    if (lockoutCheck.locked) {
      setPasswordError(
        `Too many failed attempts. Please try again in ${formatRemainingTime(
          lockoutCheck.remainingTime
        )}.`
      );
      return;
    }

    // Validation
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { auth } = await import("./firebase");
      const {
        EmailAuthProvider,
        reauthenticateWithCredential,
        updatePassword,
      } = await import("firebase/auth");
      const user = auth.currentUser;

      if (!user || !user.email) {
        setPasswordError("No user logged in");
        setIsUpdatingPassword(false);
        return;
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      try {
        await reauthenticateWithCredential(user, credential);
      } catch (error: any) {
        // Record failed attempt
        const result = recordFailedAttempt(adminEmail, "password-change");

        if (error.code === "auth/wrong-password") {
          if (result.locked) {
            setPasswordError(
              `Too many failed attempts. Account locked for 3 minutes.`
            );
            setIsPasswordLocked(true);
            setPasswordLockoutTime(180);
          } else {
            setPasswordError(
              `Current password is incorrect. (${result.attemptsLeft} attempts remaining)`
            );
          }
        } else if (error.code === "auth/too-many-requests") {
          setPasswordError("Too many failed attempts. Please try again later.");
        } else {
          if (result.locked) {
            setPasswordError(
              `Too many failed attempts. Account locked for 3 minutes.`
            );
            setIsPasswordLocked(true);
            setPasswordLockoutTime(180);
          } else {
            setPasswordError(
              `Failed to verify current password. (${result.attemptsLeft} attempts remaining)`
            );
          }
        }
        setIsUpdatingPassword(false);
        return;
      }

      // Update password
      await updatePassword(user, newPassword);

      // Clear attempts on success
      clearAttempts(adminEmail, "password-change");

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      alert("Password updated successfully!");
    } catch (error: any) {
      console.error("Error updating password:", error);
      setPasswordError(
        error.message || "Failed to update password. Please try again."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Manage system settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CustomTabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="admin">Instructor Account</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="system-name">
                  System Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="system-name"
                  defaultValue="AttendScan"
                  required
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">
                  System name is locked and cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="university-name">
                  University Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="university-name"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="courses" className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Your Courses & Sections
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Add courses and sections that you teach. These will be
                  available when adding students and generating QR codes.
                </p>

                {/* Add Course-Section Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  <Input
                    placeholder="Course (e.g., CS101)"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="md:col-span-1"
                  />
                  <Input
                    placeholder="Section (e.g., A, B, 1)"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="md:col-span-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCourseSection}
                    disabled={!newCourse.trim() || !newSection.trim()}
                    className="md:col-span-1"
                  >
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add Course-Section
                  </Button>
                </div>

                {/* Course-Sections List */}
                {isLoadingCourses ? (
                  <p className="text-sm text-gray-500">Loading courses...</p>
                ) : courseSections.length > 0 ? (
                  <div className="space-y-2">
                    {courseSections.map((cs, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900">
                            {cs.course}
                          </span>
                          <span className="text-xs text-gray-500">-</span>
                          <span className="text-sm text-gray-700">
                            Section {cs.section}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteCourseSection(cs)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Delete course-section"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">
                      No courses added yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Add your first course-section above
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
                {isLoadingSettings ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <>
                    <Input
                      id="late-threshold"
                      type="number"
                      min="1"
                      max="60"
                      value={lateThreshold}
                      onChange={(e) =>
                        setLateThreshold(parseInt(e.target.value) || 15)
                      }
                    />
                    <p className="text-sm text-gray-500">
                      Mark student as LATE if they scan after this time.
                      (Current: {lateThreshold} minutes)
                    </p>
                  </>
                )}
              </div>
              <Button type="submit" disabled={isSaving || isLoadingSettings}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="admin" className="pt-6">
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500">
                  This is your current email address used for login.
                </p>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Change Password</h3>

                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{passwordError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      disabled={isUpdatingPassword || isPasswordLocked}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      disabled={isUpdatingPassword || isPasswordLocked}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      disabled={isUpdatingPassword || isPasswordLocked}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  isUpdatingPassword ||
                  isPasswordLocked ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {isPasswordLocked
                  ? `Locked - Try again in ${formatRemainingTime(
                      passwordLockoutTime
                    )}`
                  : isUpdatingPassword
                  ? "Updating Password..."
                  : "Update Password"}
              </Button>
            </form>
          </TabsContent>
        </CustomTabs>
      </CardContent>
    </Card>
  );
};

// --- STUDENT MODALS (Custom) ---

interface StudentFormModalProps {
  student?: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const { setStudents } = useDashboard();
  const [formData, setFormData] = useState<Omit<Student, "id">>({
    name: "",
    email: "",
    course: "",
    section: "",
  });
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const isEditMode = !!student;

  // Fetch instructor's course-sections
  useEffect(() => {
    const fetchCourseSections = async () => {
      try {
        const { db, auth } = await import("./firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        const user = auth.currentUser;

        if (user) {
          const courseDoc = await getDoc(
            doc(db, "instructorCourses", user.uid)
          );
          if (courseDoc.exists()) {
            // Try to get courseSections first, fallback to courses for backward compatibility
            const data = courseDoc.data();
            const fetchedCourseSections = data.courseSections || [];
            setCourseSections(fetchedCourseSections);
          }
        }
      } catch (error) {
        console.error("Error fetching course-sections:", error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    if (isOpen) {
      fetchCourseSections();
    }
  }, [isOpen]);

  useEffect(() => {
    if (student && isOpen) {
      setFormData(student);
    } else {
      setFormData({ name: "", email: "", course: "", section: "" });
    }
  }, [student, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditMode && student) {
        // Edit logic - update in Firestore
        const { updateStudent } = await import("./services/adminService");
        const result = await updateStudent(student.id, formData);

        if (result.success) {
          // Update local state
          setStudents((prev) =>
            prev.map((s) =>
              s.id === student.id ? { ...student, ...formData } : s
            )
          );
          onClose();
        } else {
          alert(result.message);
        }
      } else {
        // Add logic - save to Firestore
        const { addStudentToClass } = await import("./services/adminService");
        const result = await addStudentToClass(formData);

        if (result.success) {
          // Add to local state with the generated ID
          const newStudent: Student = {
            id: result.studentId || `STU${Date.now()}`,
            ...formData,
          };
          setStudents((prev) => [...prev, newStudent]);
          onClose();
        } else {
          alert(result.message);
        }
      }
    } catch (error: any) {
      console.error("Error saving student:", error);
      alert(error.message || "Failed to save student");
    }
  };

  return (
    <CustomModal isOpen={isOpen} onClose={onClose}>
      <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
        {isEditMode ? "Edit Student" : "Add New Student"}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        {isEditMode
          ? "Make changes to the student record."
          : "Fill in the details for the new student."}
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4 mt-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="course">Course</Label>
          {isLoadingCourses ? (
            <Input value="Loading courses..." disabled />
          ) : courseSections.length > 0 ? (
            <CustomSelect
              id="course"
              value={formData.course}
              onChange={handleChange}
              required
            >
              <option value="">Select a course</option>
              {/* Get unique courses from courseSections */}
              {Array.from(new Set(courseSections.map((cs) => cs.course))).map(
                (course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                )
              )}
            </CustomSelect>
          ) : (
            <div>
              <Input value="No courses available" disabled />
              <p className="text-xs text-gray-500 mt-1">
                Please add course-sections in Settings → Courses first
              </p>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="section">Section</Label>
          {isLoadingCourses ? (
            <Input value="Loading sections..." disabled />
          ) : courseSections.length > 0 && formData.course ? (
            <CustomSelect
              id="section"
              value={formData.section}
              onChange={handleChange}
              required
            >
              <option value="">Select a section</option>
              {/* Filter sections based on selected course */}
              {courseSections
                .filter((cs) => cs.course === formData.course)
                .map((cs) => (
                  <option key={cs.section} value={cs.section}>
                    Section {cs.section}
                  </option>
                ))}
            </CustomSelect>
          ) : (
            <CustomSelect
              id="section"
              value={formData.section}
              onChange={handleChange}
              required
              disabled
            >
              <option value="">Select a course first</option>
            </CustomSelect>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditMode ? "Save Changes" : "Add Student"}
          </Button>
        </div>
      </form>
    </CustomModal>
  );
};

interface DeleteConfirmModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  const { setStudents } = useDashboard();

  const handleDelete = async () => {
    if (!student) return;

    try {
      const { removeStudent } = await import("./services/adminService");
      const result = await removeStudent(student.id);

      if (result.success) {
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        onClose();
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error("Error deleting student:", error);
      alert(error.message || "Failed to delete student");
    }
  };

  return (
    <CustomModal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-start">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
          <FiAlertTriangle
            className="h-6 w-6 text-red-600"
            aria-hidden="true"
          />{" "}
          {/* ICON RESTORED */}
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
            Delete Student
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete <strong>{student?.name}</strong>?
              This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
        <Button type="button" variant="danger" onClick={handleDelete}>
          Delete
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </CustomModal>
  );
};

// --- MAIN ADMIN LAYOUT COMPONENT ---
// This component now holds all the state and provides it to the pages.
export const AdminLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // --- CENTRALIZED STATE ---
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch data from Firebase on mount
  useEffect(() => {
    let unsubscribe: () => void;

    const initAuthAndFetchData = async () => {
      try {
        const { auth } = await import("./firebase");
        const { onAuthStateChanged } = await import("firebase/auth");

        // Wait for auth state to be ready
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log("Auth state changed:", user ? user.uid : "No user");

          if (!user) {
            console.log("No user authenticated, skipping data fetch");
            setIsLoading(false);
            return;
          }

          // User is authenticated, fetch data
          const { getRegisteredStudents, getInstructorAttendanceRecords } =
            await import("./services/adminService");

          console.log("Fetching dashboard data for user:", user.uid);

          try {
            // Fetch registered students and attendance records
            const [studentsData, recordsData] = await Promise.all([
              getRegisteredStudents(),
              getInstructorAttendanceRecords(),
            ]);

            console.log("Registered students fetched:", studentsData.length);
            console.log("Attendance records fetched:", recordsData.length);
            console.log("Sample attendance record:", recordsData[0]);

            // Map to the Student interface format
            const mappedStudents: Student[] = studentsData.map((s) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              course: s.course || "N/A",
              section: s.section || "N/A",
            }));

            // Map to the AttendanceRecord interface format
            const mappedRecords: AttendanceRecord[] = recordsData.map((r) => ({
              id: r.id,
              studentId: r.studentId,
              name: r.studentName,
              date: r.date,
              time: new Date(r.scannedAt).toLocaleTimeString(),
              status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT",
              course: r.course || "N/A",
              section: r.section || "N/A",
              className: r.className,
            }));

            console.log("Mapped records:", mappedRecords);

            setStudents(mappedStudents);
            setRecords(mappedRecords);
          } catch (error) {
            console.error("Error fetching dashboard data:", error);
          } finally {
            setIsLoading(false);
          }
        });
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsLoading(false);
      }
    };

    initAuthAndFetchData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    return {
      total: records.length,
      present: records.filter((r) => r.status === "PRESENT").length,
      absent: records.filter((r) => r.status === "ABSENT").length,
      late: records.filter((r) => r.status === "LATE").length,
    };
  }, [records]);

  // --- MODAL CONTROL FUNCTIONS ---
  const openAddModal = () => {
    setSelectedStudent(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedStudent(null);
  };

  // Refresh data after student operations
  const refreshData = async () => {
    try {
      const { getRegisteredStudents, getInstructorAttendanceRecords } =
        await import("./services/adminService");

      const [studentsData, recordsData] = await Promise.all([
        getRegisteredStudents(),
        getInstructorAttendanceRecords(),
      ]);

      const mappedStudents: Student[] = studentsData.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        course: s.course || "N/A",
        section: s.section || "N/A",
      }));

      const mappedRecords: AttendanceRecord[] = recordsData.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        name: r.studentName,
        date: r.date,
        time: new Date(r.scannedAt).toLocaleTimeString(),
        status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT",
        course: r.course || "N/A",
        section: r.section || "N/A",
        className: r.className,
      }));

      setStudents(mappedStudents);
      setRecords(mappedRecords);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  // Context value
  const contextValue: DashboardContextType = {
    students,
    setStudents,
    records,
    setRecords,
    stats,
    openAddModal,
    openEditModal,
    openDeleteModal,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col lg:pl-64">
          <Topbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
          <main className="flex-1 p-4 lg:p-6">
            {/* Router renders the matching page component here */}
            <Outlet />
          </main>
        </div>

        {/* --- MODALS --- */}
        {/* Modals are rendered here, but controlled by context */}
        <StudentFormModal
          isOpen={isAddModalOpen}
          onClose={() => {
            closeModals();
            refreshData();
          }}
        />
        <StudentFormModal
          student={selectedStudent}
          isOpen={isEditModalOpen}
          onClose={() => {
            closeModals();
            refreshData();
          }}
        />
        <DeleteConfirmModal
          student={selectedStudent}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            closeModals();
            refreshData();
          }}
        />
      </div>
    </DashboardContext.Provider>
  );
};

export default AdminLayout;
