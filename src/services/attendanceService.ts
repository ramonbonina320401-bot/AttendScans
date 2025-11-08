import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

export interface QRCodeData {
  classId: string;
  className: string;
  instructorId: string;
  instructorName: string;
  timestamp: string;
  expiresAt: string;
  date: string;
  sessionId: string; // Unique 8-character alphanumeric code
  course: string; // Course name (e.g., "CS101")
  section: string; // Section identifier (e.g., "A", "B")
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  instructorId: string;
  scannedAt: string; // ISO timestamp of when the scan happened
  date: string;
  status: 'present' | 'late';
  course: string; // Course name (e.g., "CS101")
  section: string; // Section identifier (e.g., "A", "B")
  timestamp?: number; // Unix timestamp for sorting
}

// Generate a secure random session ID (8 characters: uppercase letters and numbers)
const generateSessionId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sessionId = '';
  for (let i = 0; i < 8; i++) {
    sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sessionId;
};

// Generate QR code data for a class
export const generateQRCodeData = async (
  className: string, 
  duration: number = 5, 
  course: string, 
  section: string
): Promise<QRCodeData> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Get instructor info from Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration * 60000); // duration in minutes
  const sessionId = generateSessionId(); // Generate unique 8-character code
  
  const qrData: QRCodeData = {
    classId: `${className}-${now.getTime()}`,
    className,
    instructorId: user.uid,
    instructorName: userData?.fullName || 'Instructor',
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    date: now.toLocaleDateString(),
    sessionId,
    course,
    section
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

    if (!userData) {
      return { success: false, message: "User not found in system" };
    }

    if (userData.role !== 'student') {
      return { success: false, message: "Only students can mark attendance" };
    }

    // Check if student is registered in the system with proper student data
    if (!userData.studentId || !userData.firstName || !userData.lastName) {
      return { success: false, message: "Student profile incomplete. Please contact administrator." };
    }

    // Verify student email is registered in the instructor's student list
    const studentEmail = user.email?.toLowerCase().trim();
    if (!studentEmail) {
      return { success: false, message: "No email associated with your account" };
    }

    // Check if this student's email is registered under the instructor
    const registeredStudentsQuery = query(
      collection(db, 'registeredStudents'),
      where('instructorId', '==', qrData.instructorId),
      where('email', '==', studentEmail)
    );
    const registeredStudentsSnapshot = await getDocs(registeredStudentsQuery);

    if (registeredStudentsSnapshot.empty) {
      return { 
        success: false, 
        message: "You are not registered in this instructor's student list. Please contact your instructor to add your email to the system." 
      };
    }

    // Verify student's course and section match the QR code's course and section
    let isEnrolledInThisSection = false;
    let studentCourse = '';
    let studentSection = '';
    
    registeredStudentsSnapshot.forEach((doc) => {
      const studentData = doc.data();
      studentCourse = studentData.course;
      studentSection = studentData.section;
      
      // Check if course and section match
      if (studentData.course === qrData.course && studentData.section === qrData.section) {
        isEnrolledInThisSection = true;
      }
    });

    if (!isEnrolledInThisSection) {
      return {
        success: false,
        message: `You are registered in ${studentCourse} - Section ${studentSection}, but this QR code is for ${qrData.course} - Section ${qrData.section}. Please scan the correct QR code for your section.`
      };
    }

    // Check if already marked attendance for this class TODAY
    // Changed from checking specific classId to checking className + date
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', user.uid),
      where('className', '==', qrData.className),
      where('date', '==', qrData.date)
    );
    const existingAttendance = await getDocs(attendanceQuery);

    if (!existingAttendance.empty) {
      return { success: false, message: `Attendance already marked for ${qrData.className} today` };
    }

    // Check if student is late based on instructor's late threshold setting
    const now = new Date();
    const qrCodeCreationTime = new Date(qrData.timestamp);
    const currentTime = now;
    const timeDiffMinutes = (currentTime.getTime() - qrCodeCreationTime.getTime()) / (1000 * 60);

    // Fetch instructor's late threshold setting
    const instructorSettingsDoc = await getDoc(doc(db, 'settings', qrData.instructorId));
    const lateThreshold = instructorSettingsDoc.exists() 
      ? instructorSettingsDoc.data().lateThreshold || 15 
      : 15; // Default to 15 minutes if not set

    // Determine status based on time difference
    const attendanceStatus = timeDiffMinutes > lateThreshold ? 'late' : 'present';

    // Create attendance record
    const attendanceRecord: AttendanceRecord = {
      studentId: user.uid,
      studentName: `${userData.firstName} ${userData.lastName}`,
      classId: qrData.classId,
      className: qrData.className,
      instructorId: qrData.instructorId,
      scannedAt: now.toISOString(),
      date: qrData.date,
      status: attendanceStatus,
      course: qrData.course,
      section: qrData.section,
      timestamp: now.getTime() // Unix timestamp for easy sorting
    };

    // Save to Firestore
    await addDoc(collection(db, 'attendance'), attendanceRecord);

    const successMessage = attendanceStatus === 'late' 
      ? `Attendance marked as LATE for ${qrData.className}. You scanned ${Math.round(timeDiffMinutes)} minutes after the QR code was generated.`
      : "Attendance marked successfully!";

    return { success: true, message: successMessage };
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

    // Sort by timestamp (most recent first)
    // If timestamp doesn't exist (old records), fall back to scannedAt
    records.sort((a, b) => {
      const timeA = a.timestamp || new Date(a.scannedAt).getTime();
      const timeB = b.timestamp || new Date(b.scannedAt).getTime();
      return timeB - timeA; // Descending order (newest first)
    });

    return records;
  } catch (error) {
    console.error("Error getting student attendance:", error);
    throw error;
  }
};
