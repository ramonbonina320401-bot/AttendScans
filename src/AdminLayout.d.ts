import React from "react";
export interface Student {
    id: string;
    studentId?: string;
    displayStudentId?: string;
    name: string;
    email: string;
    program: string;
    course: string;
    section: string;
}
export interface AttendanceRecord {
    id: string;
    studentId: string;
    name: string;
    date: string;
    time: string;
    status: "PRESENT" | "LATE" | "ABSENT";
    program: string;
    course: string;
    section: string;
    className?: string;
}
/**
 * 1. DASHBOARD PAGE
 */
export declare const DashboardPage: React.FC;
/**
 * 2. GENERATE QR CODE PAGE
 */
export declare const GenerateQrPage: React.FC;
/**
 * 3. ATTENDANCE RECORDS PAGE
 */
export declare const AttendanceRecordsPage: React.FC;
/**
 * 4. STUDENT MANAGEMENT PAGE
 */
export declare const StudentManagementPage: React.FC;
export declare const SettingsPage: React.FC;
export declare const AdminLayout: React.FC;
export default AdminLayout;
