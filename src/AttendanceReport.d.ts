import React from "react";
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
interface AttendanceReportProps {
    onBack: () => void;
    stats: ReportStats;
    history: AttendanceRecord[];
    studentName?: string;
}
/**
 * A component to display the student's attendance report.
 */
declare const AttendanceReport: React.FC<AttendanceReportProps>;
export default AttendanceReport;
