import type { AttendanceRecord } from './attendanceService';
export interface AdminAttendanceRecord extends AttendanceRecord {
    id: string;
}
export interface AdminStudent {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    course?: string;
    section?: string;
    role: string;
}
export interface SystemSettings {
    systemName: string;
    university: string;
    lateThresholdMinutes: number;
}
export declare const getAllStudents: () => Promise<AdminStudent[]>;
export declare const getInstructorAttendanceRecords: () => Promise<AdminAttendanceRecord[]>;
export declare const getAttendanceStats: () => Promise<{
    total: number;
    present: number;
    late: number;
    absent: number;
}>;
export declare const addStudentToClass: (studentData: {
    name: string;
    email: string;
    course: string;
    section: string;
}) => Promise<{
    success: boolean;
    message: string;
    studentId: string;
} | {
    success: boolean;
    message: any;
    studentId?: undefined;
}>;
export declare const removeStudent: (studentId: string) => Promise<{
    success: boolean;
    message: any;
}>;
export declare const updateStudent: (studentId: string, studentData: {
    name: string;
    email: string;
    course: string;
    section: string;
}) => Promise<{
    success: boolean;
    message: any;
}>;
export declare const getRegisteredStudents: () => Promise<any[]>;
export declare const getSystemSettings: () => Promise<SystemSettings>;
export declare const saveSystemSettings: (settings: SystemSettings) => Promise<{
    success: boolean;
    message: any;
}>;
export declare const getStudentAttendanceRecords: (studentId: string) => Promise<AdminAttendanceRecord[]>;
