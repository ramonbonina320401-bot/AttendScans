import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface QRCodeData {
  classId: string;
  className: string;
  instructorId: string;
  instructorName: string;
  timestamp: string;
  expiresAt: string;
  date: string;
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
}

// Generate QR code data for a class
export const generateQRCodeData = async (className: string, duration: number = 5): Promise<QRCodeData> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Get instructor info from Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration * 60000); // duration in minutes
  
  const qrData: QRCodeData = {
    classId: `${className}-${now.getTime()}`,
    className,
    instructorId: user.uid,
    instructorName: userData?.fullName || 'Instructor',
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    date: now.toLocaleDateString()
  };

  return qrData;
};

// Verify QR code is valid (not expired)
export const verifyQRCode = (qrData: QRCodeData): boolean => {
  const now = new Date();
  const expiryTime = new Date(qrData.expiresAt);
  return now < expiryTime;
};

// Mark student attendance
export const markAttendance = async (qrData: QRCodeData): Promise<{ success: boolean; message: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, message: "User not authenticated" };
    }

    // Verify QR code is not expired
    if (!verifyQRCode(qrData)) {
      return { success: false, message: "QR code has expired" };
    }

    // Get student info
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    if (userData?.role !== 'student') {
      return { success: false, message: "Only students can mark attendance" };
    }

    // Check if already marked attendance for this class session
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', user.uid),
      where('classId', '==', qrData.classId)
    );
    const existingAttendance = await getDocs(attendanceQuery);

    if (!existingAttendance.empty) {
      return { success: false, message: "Attendance already marked for this session" };
    }

    // Create attendance record
    const attendanceRecord: AttendanceRecord = {
      studentId: user.uid,
      studentName: `${userData.firstName} ${userData.lastName}`,
      classId: qrData.classId,
      className: qrData.className,
      instructorId: qrData.instructorId,
      scannedAt: new Date().toISOString(),
      date: qrData.date,
      status: 'present'
    };

    // Save to Firestore
    await addDoc(collection(db, 'attendance'), attendanceRecord);

    return { success: true, message: "Attendance marked successfully!" };
  } catch (error: any) {
    console.error("Error marking attendance:", error);
    return { success: false, message: error.message || "Failed to mark attendance" };
  }
};

// Get attendance records for an instructor
export const getAttendanceRecords = async (instructorId?: string) => {
  try {
    const userId = instructorId || auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('instructorId', '==', userId)
    );
    
    const snapshot = await getDocs(attendanceQuery);
    const records: AttendanceRecord[] = [];
    
    snapshot.forEach((doc) => {
      records.push(doc.data() as AttendanceRecord);
    });

    return records;
  } catch (error) {
    console.error("Error getting attendance records:", error);
    throw error;
  }
};

// Get attendance records for a student
export const getStudentAttendance = async (studentId?: string) => {
  try {
    const userId = studentId || auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', userId)
    );
    
    const snapshot = await getDocs(attendanceQuery);
    const records: AttendanceRecord[] = [];
    
    snapshot.forEach((doc) => {
      records.push(doc.data() as AttendanceRecord);
    });

    return records;
  } catch (error) {
    console.error("Error getting student attendance:", error);
    throw error;
  }
};
