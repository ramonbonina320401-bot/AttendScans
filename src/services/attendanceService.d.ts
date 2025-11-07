export interface QRCodeData {
    classId: string;
    className: string;
    instructorId: string;
    instructorName: string;
    timestamp: string;
    expiresAt: string;
    date: string;
    sessionId: string;
    course: string;
    section: string;
}
export interface AttendanceRecord {
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    instructorId: string;
    scannedAt: string;
    date: string;
    status: 'present';
    course: string;
    section: string;
    timestamp?: number;
}
export declare const generateQRCodeData: (className: string, duration: number | undefined, course: string, section: string) => Promise<QRCodeData>;
export declare const verifyQRCode: (qrData: QRCodeData) => boolean;
export declare const markAttendance: (qrData: QRCodeData) => Promise<{
    success: boolean;
    message: string;
}>;
export declare const getAttendanceRecords: (instructorId?: string) => Promise<AttendanceRecord[]>;
export declare const getStudentAttendance: (studentId?: string) => Promise<AttendanceRecord[]>;
