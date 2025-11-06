import React, {
  useState,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import QRCode from 'qrcode';
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
  FiRefreshCw,
  FiAlertTriangle,
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
      className={`w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-500 ${className}`}
      {...props}
    >
      {children}
    </select>
    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />{" "}
    {/* ICON RESTORED */}
  </div>
);

// Custom Date Picker (Styled Native)
const CustomDatePicker: React.FC<
  React.InputHTMLAttributes<HTMLInputElement>
> = ({ className, ...props }) => (
  <Input type="date" className={`relative ${className}`} {...props} />
);

// Custom Dropdown (for action menus)
const CustomDropdown: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Find the trigger
          if ((child.type as any).displayName === "DropdownTrigger") {
            return React.cloneElement(child, {
              onClick: () => setIsOpen(!isOpen),
            } as any);
          }
          // Find the content
          if ((child.type as any).displayName === "DropdownContent") {
            return isOpen ? child : null;
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

const DropdownContent: React.FC<{
  children: React.ReactNode;
  align?: "right" | "left";
}> = ({ children, align = "right" }) => (
  <div
    className={`absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5
      ${align === "right" ? "right-0" : "left-0"}`}
  >
    {children}
  </div>
);
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
  <div className="flex border-b border-gray-200">
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
    className={`px-4 py-2 text-sm font-medium border-b-2
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <div className="relative hidden sm:block">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />{" "}
            {/* ICON RESTORED */}
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-32 sm:w-64"
            />
          </div>
          <Button variant="ghost" size="icon" className="relative rounded-full">
            <FiBell className="w-5 h-5" /> {/* ICON RESTORED */}
            <span className="absolute top-2 right-2 block w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            <span className="sr-only">View notifications</span>
          </Button>
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
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Your Profile
                </Link>
                <Link
                  to="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </Link>
                <hr className="my-1 border-gray-200" />
                <Link
                  to="/login"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const Sidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed top-0 left-0 h-screen z-40">
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <span className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-md text-white font-bold text-lg">
          A
        </span>
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
            <span className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-md text-white font-bold text-lg">
              A
            </span>
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
    absent: 0
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { getInstructorAttendanceRecords } = await import('./services/adminService');
      const recordsData = await getInstructorAttendanceRecords();
      
      const mappedRecords: AttendanceRecord[] = recordsData.map(r => ({
        id: r.id,
        studentId: r.studentId,
        name: r.studentName,
        date: r.date,
        time: new Date(r.scannedAt).toLocaleTimeString(),
        status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT"
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
      absent: Math.round(stats.absent * 0.5)
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
            <FiRefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
              percentage={stats.total > 0 ? Math.round((todayStats.present / stats.total) * 100) : 0}
              description="Marked as present"
            />
            <StatCard
              title="LATE TODAY"
              value={todayStats.late}
              percentage={stats.total > 0 ? Math.round((todayStats.late / stats.total) * 100) : 0}
              description="Arrived after schedule"
            />
            <StatCard
              title="ABSENT TODAY"
              value={todayStats.absent}
              percentage={stats.total > 0 ? Math.round((todayStats.absent / stats.total) * 100) : 0}
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
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [className, setClassName] = useState<string>("");
  const [duration, setDuration] = useState<number>(60); // Default 1 hour in minutes
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [deployedAt, setDeployedAt] = useState<Date | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endVerificationCode, setEndVerificationCode] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Fetch instructor's courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { db, auth } = await import('./firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const user = auth.currentUser;
        
        if (user) {
          const courseDoc = await getDoc(doc(db, 'instructorCourses', user.uid));
          if (courseDoc.exists()) {
            const fetchedCourses = courseDoc.data().courses || [];
            setCourses(fetchedCourses);
            // Set first course as default if available
            if (fetchedCourses.length > 0) {
              setSelectedCourse(fetchedCourses[0]);
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
    if (!selectedCourse) {
      alert("Please select a course first");
      return;
    }
    if (!className.trim()) {
      alert("Please enter a class name");
      return;
    }

    setIsGenerating(true);
    try {
      // Import the service dynamically to avoid import issues
      const { generateQRCodeData } = await import('./services/attendanceService');
      
      // Combine course and class name for the full class identifier
      const fullClassName = `${selectedCourse} - ${className}`;
      
      // Generate QR code data
      const qrData = await generateQRCodeData(fullClassName, duration);
      setSessionData(qrData);

      // Generate QR code image
      const qrString = JSON.stringify(qrData);
      const qrImageUrl = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
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
    if (!selectedCourse) {
      alert("Please select a course first");
      return;
    }
    if (!className.trim()) {
      alert("Please enter a class name");
      return;
    }

    // Generate new QR code with current settings first
    setIsGenerating(true);
    try {
      console.log("Starting deployment with course:", selectedCourse, "className:", className, "duration:", duration);
      
      const { generateQRCodeData } = await import('./services/attendanceService');
      
      // Combine course and class name
      const fullClassName = `${selectedCourse} - ${className}`;
      const qrData = await generateQRCodeData(fullClassName, duration);
      console.log("Generated QR data:", qrData);
      setSessionData(qrData);

      // Generate QR code image
      const qrString = JSON.stringify(qrData);
      const qrImageUrl = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      console.log("QR code image generated");
      setQrCodeUrl(qrImageUrl);
    
      // Save active session to Firestore with sessionId
      const { collection, addDoc } = await import('firebase/firestore');
      const { db, auth } = await import('./firebase');
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      if (!qrData) {
        throw new Error("QR data not generated");
      }
      
      console.log("Saving to Firestore...");
      await addDoc(collection(db, 'activeSessions'), {
        sessionId: qrData.sessionId, // Store the unique session ID
        classId: qrData.classId,
        className: qrData.className,
        instructorId: user.uid,
        instructorName: qrData.instructorName,
        timestamp: qrData.timestamp,
        expiresAt: qrData.expiresAt,
        date: qrData.date,
        deployedAt: new Date().toISOString()
      });
      console.log("Active session saved to Firestore with sessionId:", qrData.sessionId);
      
      setIsDeployed(true);
      setDeployedAt(new Date());
      console.log("Deployment successful!");
    } catch (error: any) {
      console.error("Error deploying QR code:", error);
      console.error("Error details:", error.message, error.stack);
      alert(`Failed to deploy QR code: ${error.message || 'Unknown error'}. Please try again.`);
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
            <Button 
              variant="danger"
              onClick={() => setShowEndModal(true)}
            >
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
                      style={{ maxWidth: '500px', height: 'auto' }}
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
                          {sessionData?.sessionId || 'N/A'}
                        </p>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Students can enter this 8-character code manually if scanning fails
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="bg-gray-50 rounded-xl px-6 py-5 w-full max-w-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Deployed At</p>
                        <p className="font-semibold text-gray-900">
                          {deployedAt?.toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Valid Until</p>
                        <p className="font-semibold text-gray-900">
                          {sessionData && new Date(sessionData.expiresAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                        <p className="font-semibold text-gray-900">
                          {duration >= 60 ? `${duration / 60} hour${duration > 60 ? 's' : ''}` : `${duration} min`}
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
        <CustomModal isOpen={showEndModal} onClose={() => setShowEndModal(false)}>
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
                To confirm, please type <span className="font-mono font-bold">redeploy</span> below:
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
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <FaQrcode className="mx-auto h-12 w-12 text-gray-700" />
        <CardTitle className="text-2xl pt-2">
          Attendance QR Code
        </CardTitle>
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
            <p className="text-gray-500 text-sm font-medium">Select course and class name</p>
            <p className="text-gray-400 text-xs">Then click Generate or Deploy</p>
          </div>
        )}

        {/* Configuration Inputs */}
        <div className="w-full space-y-4 border-t pt-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="course-input" className="text-right">
              Course:
            </Label>
            {isLoadingCourses ? (
              <Input value="Loading..." disabled className="col-span-2" />
            ) : courses.length > 0 ? (
              <CustomSelect
                id="course-input"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="col-span-2"
                required
              >
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </CustomSelect>
            ) : (
              <div className="col-span-2">
                <Input value="No courses available" disabled />
                <p className="text-xs text-gray-500 mt-1">
                  Add courses in Settings → Courses
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="class-input" className="text-right">
              Class Name:
            </Label>
            <Input
              id="class-input"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="col-span-2"
              placeholder="e.g., Lecture 1, Midterm Review"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="duration-input" className="text-right">
              Duration:
            </Label>
            <CustomSelect
              id="duration-input"
              value={duration.toString()}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="col-span-2"
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
            disabled={isGenerating || !className || !selectedCourse || courses.length === 0}
          >
            <FiRefreshCw className="mr-2 h-5 w-5" />
            Deploy QR Code (Full Screen)
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="flex-1" 
              onClick={generateQRCode}
              disabled={isGenerating || !className || !selectedCourse || courses.length === 0}
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
            <strong>💡 Tip:</strong> Click "Deploy QR Code" to show a large, full-screen QR code that students can easily scan. The validity timer starts when you deploy.
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
  // We must use YYYY-MM-DD format for <input type="date">
  const [dateFrom, setDateFrom] = useState("2025-10-01");
  const [dateTo, setDateTo] = useState("2025-10-25");

  const courses = ["All Courses", "Computer Science", "Mathematics"];
  const sections = ["All Sections", "A", "B"];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { getInstructorAttendanceRecords } = await import('./services/adminService');
      const recordsData = await getInstructorAttendanceRecords();
      
      const mappedRecords: AttendanceRecord[] = recordsData.map(r => ({
        id: r.id,
        studentId: r.studentId,
        name: r.studentName,
        date: r.date,
        time: new Date(r.scannedAt).toLocaleTimeString(),
        status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT"
      }));
      
      setRecords(mappedRecords);
      console.log("Attendance records refreshed:", mappedRecords.length);
    } catch (error) {
      console.error("Error refreshing attendance records:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredRecords = useMemo(() => {
    // Add real filtering logic here based on state
    return records;
  }, [records, dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
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
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
              <CustomSelect defaultValue={courses[0]}>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div>
              <Label>Section</Label>
              <CustomSelect defaultValue={sections[0]}>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div className="flex gap-4 sm:col-span-2 lg:col-span-4">
              <Button
                type="submit"
                className="flex-1"
                onClick={(e) => e.preventDefault()}
              >
                Apply Filters
              </Button>
              <Button type="reset" variant="outline" className="flex-1">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
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
                      <td className="px-4 py-3">{record.date}</td>
                      <td className="px-4 py-3">{record.time}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center px-4 py-4">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

  const filteredStudents = useMemo(() => {
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Management</CardTitle>
        <CardDescription>Add, edit, or remove student records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />{" "}
            {/* ICON RESTORED */}
            <Input
              placeholder="Search students..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="w-full sm:w-auto" onClick={openAddModal}>
            <FiPlus className="mr-2 h-4 w-4" /> {/* ICON RESTORED */}
            Add Student
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
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
                  COURSE
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  SECTION
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
                    <td className="px-4 py-3">{student.course}</td>
                    <td className="px-4 py-3">{student.section}</td>
                    <td className="px-4 py-3 text-right">
                      <CustomDropdown>
                        <DropdownTrigger>
                          <FiMoreVertical className="h-4 w-4" />{" "}
                          {/* ICON RESTORED */}
                        </DropdownTrigger>
                        <DropdownContent align="right">
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
                  <td colSpan={6} className="text-center px-4 py-4">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 5. SETTINGS PAGE
 */
export const SettingsPage: React.FC = () => {
  const [courses, setCourses] = useState<string[]>([]);
  const [newCourse, setNewCourse] = useState("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { db, auth } = await import('./firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const user = auth.currentUser;
        
        if (user) {
          const courseDoc = await getDoc(doc(db, 'instructorCourses', user.uid));
          if (courseDoc.exists()) {
            setCourses(courseDoc.data().courses || []);
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

  const handleAddCourse = async () => {
    if (!newCourse.trim()) return;
    
    try {
      const { db, auth } = await import('./firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      const user = auth.currentUser;
      
      if (user) {
        const updatedCourses = [...courses, newCourse.trim()];
        await setDoc(doc(db, 'instructorCourses', user.uid), {
          courses: updatedCourses,
          updatedAt: new Date().toISOString()
        });
        setCourses(updatedCourses);
        setNewCourse("");
      }
    } catch (error) {
      console.error("Error adding course:", error);
      alert("Failed to add course. Please try again.");
    }
  };

  const handleDeleteCourse = async (courseToDelete: string) => {
    try {
      const { db, auth } = await import('./firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      const user = auth.currentUser;
      
      if (user) {
        const updatedCourses = courses.filter(c => c !== courseToDelete);
        await setDoc(doc(db, 'instructorCourses', user.uid), {
          courses: updatedCourses,
          updatedAt: new Date().toISOString()
        });
        setCourses(updatedCourses);
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save logic here
    alert("Settings Saved!"); // Using alert for simplicity
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
            <TabsTrigger value="admin">Admin Account</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="system-name">
                  System Name <span className="text-red-500">*</span>
                </Label>
                <Input id="system-name" defaultValue="AttendScan" required disabled className="bg-gray-100" />
                <p className="text-xs text-gray-500">System name is locked and cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="university-name">
                  University Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="university-name"
                  defaultValue="University Name"
                  required
                />
              </div>
              <Button type="submit">Save Changes</Button>
            </form>
          </TabsContent>

          <TabsContent value="courses" className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Your Courses
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Add courses that you teach. These will be available when adding students.
                </p>
                
                {/* Add Course Form */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="e.g., Computer Science 101"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCourse())}
                  />
                  <Button type="button" onClick={handleAddCourse} disabled={!newCourse.trim()}>
                    <FiPlus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                {/* Courses List */}
                {isLoadingCourses ? (
                  <p className="text-sm text-gray-500">Loading courses...</p>
                ) : courses.length > 0 ? (
                  <div className="space-y-2">
                    {courses.map((course, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <span className="text-sm font-medium text-gray-900">{course}</span>
                        <button
                          onClick={() => handleDeleteCourse(course)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Delete course"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">No courses added yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add your first course above</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
                <Input id="late-threshold" type="number" defaultValue="15" />
                <p className="text-sm text-gray-500">
                  Mark student as LATE if they scan after this time.
                </p>
              </div>
              <Button type="submit">Save Changes</Button>
            </form>
          </TabsContent>

          <TabsContent value="admin" className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  defaultValue="admin@university.edu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">New Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit">Update Account</Button>
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
  const [courses, setCourses] = useState<string[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const isEditMode = !!student;

  // Fetch instructor's courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { db, auth } = await import('./firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const user = auth.currentUser;
        
        if (user) {
          const courseDoc = await getDoc(doc(db, 'instructorCourses', user.uid));
          if (courseDoc.exists()) {
            setCourses(courseDoc.data().courses || []);
          }
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    if (isOpen) {
      fetchCourses();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && student) {
      // Edit logic
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...student, ...formData } : s))
      );
    } else {
      // Add logic
      const newStudent: Student = {
        id: `STU${String(Math.floor(Math.random() * 900) + 100)}`, // Simple random ID
        ...formData,
      };
      setStudents((prev) => [...prev, newStudent]);
    }
    onClose();
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
          ) : courses.length > 0 ? (
            <CustomSelect
              id="course"
              value={formData.course}
              onChange={handleChange}
              required
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </CustomSelect>
          ) : (
            <div>
              <Input value="No courses available" disabled />
              <p className="text-xs text-gray-500 mt-1">
                Please add courses in Settings → Courses first
              </p>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="section">Section</Label>
          <CustomSelect
            id="section"
            value={formData.section}
            onChange={handleChange}
            required
          >
            <option value="">Select a section</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </CustomSelect>
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

  const handleDelete = () => {
    if (!student) return;
    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    onClose();
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
        const { auth } = await import('./firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        // Wait for auth state to be ready
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log("Auth state changed:", user ? user.uid : "No user");
          
          if (!user) {
            console.log("No user authenticated, skipping data fetch");
            setIsLoading(false);
            return;
          }
          
          // User is authenticated, fetch data
          const { getAllStudents, getInstructorAttendanceRecords } = await import('./services/adminService');
          
          console.log("Fetching dashboard data for user:", user.uid);
          
          try {
            // Fetch students and attendance records
            const [studentsData, recordsData] = await Promise.all([
              getAllStudents(),
              getInstructorAttendanceRecords()
            ]);

            console.log("Students fetched:", studentsData.length);
            console.log("Attendance records fetched:", recordsData.length);
            console.log("Sample attendance record:", recordsData[0]);

            // Map to the Student interface format
            const mappedStudents: Student[] = studentsData.map(s => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              email: s.email,
              course: s.course || 'N/A',
              section: s.section || 'N/A'
            }));

            // Map to the AttendanceRecord interface format
            const mappedRecords: AttendanceRecord[] = recordsData.map(r => ({
              id: r.id,
              studentId: r.studentId,
              name: r.studentName,
              date: r.date,
              time: new Date(r.scannedAt).toLocaleTimeString(),
              status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT"
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
      present: records.filter(r => r.status === "PRESENT").length,
      absent: records.filter(r => r.status === "ABSENT").length,
      late: records.filter(r => r.status === "LATE").length,
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
      const { getAllStudents, getInstructorAttendanceRecords } = await import('./services/adminService');
      
      const [studentsData, recordsData] = await Promise.all([
        getAllStudents(),
        getInstructorAttendanceRecords()
      ]);

      const mappedStudents: Student[] = studentsData.map(s => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        course: s.course || 'N/A',
        section: s.section || 'N/A'
      }));

      const mappedRecords: AttendanceRecord[] = recordsData.map(r => ({
        id: r.id,
        studentId: r.studentId,
        name: r.studentName,
        date: r.date,
        time: new Date(r.scannedAt).toLocaleTimeString(),
        status: r.status.toUpperCase() as "PRESENT" | "LATE" | "ABSENT"
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
        <StudentFormModal isOpen={isAddModalOpen} onClose={() => { closeModals(); refreshData(); }} />
        <StudentFormModal
          student={selectedStudent}
          isOpen={isEditModalOpen}
          onClose={() => { closeModals(); refreshData(); }}
        />
        <DeleteConfirmModal
          student={selectedStudent}
          isOpen={isDeleteModalOpen}
          onClose={() => { closeModals(); refreshData(); }}
        />

        {/* We are not using Toaster since we didn't install shadcn */}
      </div>
    </DashboardContext.Provider>
  );
};

export default AdminLayout;
