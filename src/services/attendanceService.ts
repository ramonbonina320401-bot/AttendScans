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
  deployedAt?: string; // When QR was actually deployed (for late calculation)
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
  program: string; // Program (e.g., "BSIT", "BSCS")
  course: string; // Course code (e.g., "IM101")
  section: string; // Section identifier (e.g., "1-4")
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
    console.log('[ATTENDANCE] Step 1: Starting markAttendance');
    console.log('[ATTENDANCE] QR Data received:', JSON.stringify(qrData, null, 2));
    console.log('[ATTENDANCE] Has deployedAt?', !!qrData.deployedAt, 'Value:', qrData.deployedAt);
    const user = auth.currentUser;
    if (!user) {
      console.log('[ATTENDANCE] Error: User not authenticated');
      return { success: false, message: "User not authenticated" };
    }
    console.log('[ATTENDANCE] Step 2: User authenticated, UID:', user.uid);

    // Verify QR code is not expired
    if (!verifyQRCode(qrData)) {
      console.log('[ATTENDANCE] Error: QR code expired');
      return { success: false, message: "QR code has expired" };
    }
    console.log('[ATTENDANCE] Step 3: QR code verified, not expired');

    // Get student info
    console.log('[ATTENDANCE] Step 4: Fetching user doc from users collection');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    console.log('[ATTENDANCE] Step 5: User doc fetched successfully, exists:', userDoc.exists());
    const userData = userDoc.data();

    if (!userData) {
      console.log('[ATTENDANCE] Error: User data not found');
      return { success: false, message: "User not found in system" };
    }
    console.log('[ATTENDANCE] Step 6: User data retrieved, role:', userData.role);

    if (userData.role !== 'student') {
      console.log('[ATTENDANCE] Error: User is not a student');
      return { success: false, message: "Only students can mark attendance" };
    }

    // Check if student is registered in the system with proper student data
    if (!userData.studentId || !userData.firstName || !userData.lastName) {
      console.log('[ATTENDANCE] Error: Incomplete student profile');
      return { success: false, message: "Student profile incomplete. Please contact administrator." };
    }
    console.log('[ATTENDANCE] Step 7: Student profile complete, studentId:', userData.studentId);

    // Verify student email is registered in the instructor's student list
    const studentEmail = user.email?.toLowerCase().trim();
    if (!studentEmail) {
      console.log('[ATTENDANCE] Error: No email on account');
      return { success: false, message: "No email associated with your account" };
    }
    console.log('[ATTENDANCE] Step 8: Student email:', studentEmail);

    // Check if this student's email is registered under the instructor
    // Query only by email (students can only read their own records)
    console.log('[ATTENDANCE] Step 9: Preparing to query registeredStudents by email');
    const registeredStudentsQuery = query(
      collection(db, 'registeredStudents'),
      where('email', '==', studentEmail)
    );
    console.log('[ATTENDANCE] Step 10: Executing registeredStudents query...');
    const registeredStudentsSnapshot = await getDocs(registeredStudentsQuery);
    console.log('[ATTENDANCE] Step 11: Query successful! Docs found:', registeredStudentsSnapshot.size);

    if (registeredStudentsSnapshot.empty) {
      console.log('[ATTENDANCE] Error: No registration records found');
      return { 
        success: false, 
        message: "You are not registered in this instructor's student list. Please contact your instructor to add your email to the system." 
      };
    }

    // Verify the student is registered under THIS instructor
    console.log('[ATTENDANCE] Step 12: Verifying registration with instructor:', qrData.instructorId);
    let registeredWithThisInstructor = false;
    let isEnrolledInThisSection = false;
    let studentProgram = '';
    let studentCourse = '';
    let studentSection = '';
    
    registeredStudentsSnapshot.forEach((doc) => {
      const studentData = doc.data();
      console.log('[ATTENDANCE] Checking doc:', doc.id, 'instructorId:', studentData.instructorId);
      
      // Check if this record is for the current instructor
      if (studentData.instructorId === qrData.instructorId) {
        registeredWithThisInstructor = true;
        studentProgram = studentData.program || '';
        studentCourse = studentData.course;
        studentSection = studentData.section;
        console.log('[ATTENDANCE] Found match! Course:', studentCourse, 'Section:', studentSection);
        
        // Check if course and section match
        if (studentData.course === qrData.course && studentData.section === qrData.section) {
          isEnrolledInThisSection = true;
          console.log('[ATTENDANCE] Section matches!');
        }
      }
    });
    console.log('[ATTENDANCE] Step 13: Instructor match:', registeredWithThisInstructor, 'Section match:', isEnrolledInThisSection);


    console.log('[ATTENDANCE] Step 13: Instructor match:', registeredWithThisInstructor, 'Section match:', isEnrolledInThisSection);

    if (!registeredWithThisInstructor) {
      console.log('[ATTENDANCE] Error: Not registered with this instructor');
      return {
        success: false,
        message: "You are not registered with this instructor. Please contact your instructor to add you to their class."
      };
    }

    if (!isEnrolledInThisSection) {
      console.log('[ATTENDANCE] Error: Wrong section');
      return {
        success: false,
        message: `You are registered in ${studentCourse} - Section ${studentSection}, but this QR code is for ${qrData.course} - Section ${qrData.section}. Please scan the correct QR code for your section.`
      };
    }
    console.log('[ATTENDANCE] Step 14: Enrollment verified');

    // Check if already marked attendance for this class TODAY
    // Changed from checking specific classId to checking className + date
    console.log('[ATTENDANCE] Step 15: Checking for duplicate attendance');
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', user.uid),
      where('className', '==', qrData.className),
      where('date', '==', qrData.date)
    );
    const existingAttendance = await getDocs(attendanceQuery);
    console.log('[ATTENDANCE] Step 16: Duplicate check complete, existing:', existingAttendance.size);

    if (!existingAttendance.empty) {
      console.log('[ATTENDANCE] Error: Already marked today');
      return { success: false, message: `Attendance already marked for ${qrData.className} today` };
    }

    // Check if student is late based on instructor's late threshold setting
    console.log('[ATTENDANCE] Step 17: Calculating late status');
    const now = new Date();
    // Use deployedAt if available (when grace period starts), fallback to timestamp
    const deploymentTime = new Date(qrData.deployedAt || qrData.timestamp);
    const currentTime = now;
    const timeDiffMinutes = (currentTime.getTime() - deploymentTime.getTime()) / (1000 * 60);
    console.log('[ATTENDANCE] Deployment time:', qrData.deployedAt || qrData.timestamp, 'Time since deployment:', timeDiffMinutes.toFixed(2), 'min');

    // Fetch instructor's late threshold setting
    console.log('[ATTENDANCE] Step 18: Fetching instructor settings');
    let lateThreshold = 15; // default
    try {
      const instructorSettingsDoc = await getDoc(doc(db, 'settings', qrData.instructorId));
      console.log('[ATTENDANCE] Step 19: Settings fetched, exists:', instructorSettingsDoc.exists());
      if (instructorSettingsDoc.exists()) {
        const cfg = instructorSettingsDoc.data();
        const value = cfg?.lateThreshold;
        if (typeof value === 'number' && !Number.isNaN(value)) {
          lateThreshold = value;
        }
      }
    } catch (settingsErr: any) {
      console.warn('[ATTENDANCE] Settings read blocked, using default 15. Code:', settingsErr?.code);
    }
    console.log('[ATTENDANCE] Step 20: Late threshold:', lateThreshold, 'minutes, time diff:', timeDiffMinutes.toFixed(2));

    // Determine status based on time difference
    const attendanceStatus = timeDiffMinutes > lateThreshold ? 'late' : 'present';
    console.log('[ATTENDANCE] Step 21: Status determined:', attendanceStatus);

    // Create attendance record
    console.log('[ATTENDANCE] Step 22: Creating attendance record');
    const attendanceRecord: AttendanceRecord = {
      studentId: user.uid,
      studentName: `${userData.firstName} ${userData.lastName}`,
      classId: qrData.classId,
      className: qrData.className,
      instructorId: qrData.instructorId,
      scannedAt: now.toISOString(),
      date: qrData.date,
      status: attendanceStatus,
      program: studentProgram,
      course: qrData.course,
      section: qrData.section,
      timestamp: now.getTime() // Unix timestamp for easy sorting
    };

    // Save to Firestore
    console.log('[ATTENDANCE] Step 23: Saving to Firestore attendance collection');
    await addDoc(collection(db, 'attendance'), attendanceRecord);
    console.log('[ATTENDANCE] Step 24: SUCCESS! Attendance saved');

    const successMessage = attendanceStatus === 'late' 
      ? `Attendance marked as LATE for ${qrData.className}. You scanned ${Math.round(timeDiffMinutes)} minutes after the QR code was generated.`
      : "Attendance marked successfully!";

    return { success: true, message: successMessage };
  } catch (error: any) {
    console.error('[ATTENDANCE] ERROR at step:', error);
    console.error('[ATTENDANCE] Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
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
