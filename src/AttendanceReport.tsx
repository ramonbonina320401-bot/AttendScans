import React from "react";
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Check,
  Clock,
} from "lucide-react";

// --- Mock Data Types ---
interface ReportStats {
  totalClasses: number;
  present: number;
  percentage: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  subject: string;
  status: "Present" | "Absent" | "Late";
}

// --- Component Props ---
interface AttendanceReportProps {
  onBack: () => void;
  stats: ReportStats;
  history: AttendanceRecord[];
  studentName?: string;
}

/**
 * A component to display the student's attendance report.
 */
const AttendanceReport: React.FC<AttendanceReportProps> = ({
  onBack,
  stats,
  history,
  studentName = "Student",
}) => {
  const isPoor = stats.percentage < 75;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* --- Header --- */}
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 rounded-full hover:bg-gray-200"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-gray-800 text-white rounded-lg">
              <BarChart2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Attendance Report
              </h1>
              <p className="text-sm text-gray-600">{studentName}</p>
            </div>
          </div>
        </header>

        <main className="space-y-6">
          {/* --- Stats Cards --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Classes */}
            <StatCard
              icon={<Calendar size={20} className="text-gray-500" />}
              title="Total Classes"
              value={stats.totalClasses.toString()}
              label="Last 30 days"
            />
            {/* Present */}
            <StatCard
              icon={<CheckCircle size={20} className="text-green-600" />}
              title="Present"
              value={stats.present.toString()}
              label="Days attended"
            />
            {/* Percentage */}
            <StatCard
              icon={<TrendingUp size={20} className="text-gray-500" />}
              title="Percentage"
              value={`${stats.percentage}%`}
              label={
                isPoor ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    Poor
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Good
                  </span>
                )
              }
            />
          </div>

          {/* --- Warning Banner --- */}
          {isPoor && (
            <div className="flex items-center p-4 text-sm text-yellow-800 rounded-lg bg-yellow-50">
              <AlertTriangle className="flex-shrink-0 inline w-4 h-4 mr-3" />
              <div>
                Your attendance is below 75%. Please ensure regular attendance
                to meet academic requirements.
              </div>
            </div>
          )}

          {/* --- Recent Attendance List --- */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Attendance
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Your attendance history for the past 30 days
            </p>

            {history.length === 0 ? (
              // Empty State
              <div className="text-center py-16">
                <XCircle
                  size={48}
                  className="mx-auto text-gray-400"
                  strokeWidth={1.5}
                />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No attendance records found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start scanning QR codes to build your attendance history.
                </p>
              </div>
            ) : (
              // List State
              <ul className="divide-y divide-gray-200 mt-6">
                {history.map((record) => (
                  <li
                    key={record.id}
                    className="flex justify-between items-center py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {record.subject}
                      </p>
                      <p className="text-sm text-gray-500">{record.date}</p>
                    </div>
                    <AttendanceTag status={record.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// --- Helper Components ---

/**
 * A small reusable card for displaying a single stat.
 */
const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  label: string | React.ReactNode;
}> = ({ icon, title, value, label }) => (
  <div className="bg-white p-5 rounded-lg shadow-md">
    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
      {icon}
      {title}
    </div>
    <p className="text-4xl font-bold text-gray-900 mt-3">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

/**
 * A small tag to display the attendance status.
 */
const AttendanceTag: React.FC<{ status: AttendanceRecord["status"] }> = ({
  status,
}) => {
  if (status === "Present") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        <Check size={14} />
        {status}
      </span>
    );
  }
  if (status === "Absent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-800">
        <XCircle size={14} />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
      <Clock size={14} />
      {status}
    </span>
  );
};

export default AttendanceReport;
