import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc, getDocs, query, where, deleteDoc, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import type { AttendanceRecord } from './attendanceService';

// Extended attendance record with ID for admin use
export interface AdminAttendanceRecord extends AttendanceRecord {
  id: string;
}

// Student interface for admin management
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

// Settings interface
export interface SystemSettings {
  systemName: string;
  university: string;
  lateThresholdMinutes: number;
}

// Get all students
export const getAllStudents = async (): Promise<AdminStudent[]> => {
  try {
    const studentsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    );
    
    const snapshot = await getDocs(studentsQuery);
    const students: AdminStudent[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      students.push({
        id: doc.id,
        studentId: data.studentId || doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        course: data.course || 'N/A',
        section: data.section || 'N/A',
        role: data.role
      });
    });

    return students;
  } catch (error) {
    console.error("Error getting students:", error);
    throw error;
  }
};

// Get attendance records for instructor's classes
export const getInstructorAttendanceRecords = async (): Promise<AdminAttendanceRecord[]> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    console.log("Fetching attendance for instructor:", user.uid);

    // Try to get all attendance records first (for debugging)
    const allAttendanceQuery = query(
      collection(db, 'attendance'),
      orderBy('scannedAt', 'desc')
    );
    
    const snapshot = await getDocs(allAttendanceQuery);
    console.log("Total attendance records in database:", snapshot.size);
    
    const records: AdminAttendanceRecord[] = [];
    const allRecords: any[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      allRecords.push({ id: doc.id, ...data });
      
      // Filter by instructorId in the code (in case Firestore query has issues)
      if (data.instructorId === user.uid) {
        records.push({
          id: doc.id,
          studentId: data.studentId,
          studentName: data.studentName,
          classId: data.classId,
          className: data.className,
          instructorId: data.instructorId,
          scannedAt: data.scannedAt,
          date: data.date,
          status: data.status,
          program: data.program || 'N/A',
          course: data.course || 'N/A',
          section: data.section || 'N/A'
        });
      }
    });

    console.log("All attendance records in DB:", allRecords);
    console.log("Records matching instructor ID:", records.length);
    console.log("Filtered records:", records);
    
    return records;
  } catch (error) {
    console.error("Error getting attendance records:", error);
    // Return empty array instead of throwing to prevent UI breaks
    return [];
  }
};

// Get attendance statistics
export const getAttendanceStats = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('instructorId', '==', user.uid)
    );
    
    const snapshot = await getDocs(attendanceQuery);
    
    let total = 0;
    let present = 0;
    let late = 0;
    let absent = 0;

    snapshot.forEach((doc) => {
      total++;
      const data = doc.data();
      if (data.status === 'present') present++;
      else if (data.status === 'late') late++;
      else if (data.status === 'absent') absent++;
    });

    return { total, present, late, absent };
  } catch (error) {
    console.error("Error getting stats:", error);
    return { total: 0, present: 0, late: 0, absent: 0 };
  }
};

// Add student to instructor's class
export const addStudentToClass = async (studentData: {
  studentId?: string; // actual institutional ID (e.g., 23-3289) if provided
  name: string;
  email?: string; // Optional email
  program: string;
  course: string;
  section: string;
}) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Use provided studentId if valid else generate internal fallback
    let studentId = (studentData.studentId || '').trim();
    const idFormat = /^\d{2}-\d{4}$/; // expected pattern like 23-3289
    if (!idFormat.test(studentId)) {
      // Fallback internal ID (still stored but not shown as official ID)
      studentId = `STU${String(Math.floor(Math.random() * 90000) + 10000)}`;
    }

    const displayId = studentData.studentId && idFormat.test(studentData.studentId.trim()) ? studentData.studentId.trim() : studentId;

    // Check for duplicate Student ID in users collection (students who signed up)
    const usersQuery = query(
      collection(db, 'users'),
      where('displayStudentId', '==', displayId)
    );
    const existingUsers = await getDocs(usersQuery);

    // Also check in registeredStudents collection (already registered by instructors)
    const registeredQuery = query(
      collection(db, 'registeredStudents'),
      where('displayStudentId', '==', displayId)
    );
    const existingRegistered = await getDocs(registeredQuery);

    if (!existingUsers.empty || !existingRegistered.empty) {
      return { 
        success: false, 
        message: `Student ID ${displayId} is already registered in the system. Each student must have a unique ID.` 
      };
    }

    // Add to registeredStudents collection (instructor's student list)
    await addDoc(collection(db, 'registeredStudents'), {
      studentId,
      displayStudentId: displayId,
      name: studentData.name,
      email: studentData.email ? studentData.email.toLowerCase().trim() : '', // Optional email
      program: studentData.program,
      course: studentData.course,
      section: studentData.section,
      instructorId: user.uid,
      createdAt: new Date().toISOString()
    });

    return { success: true, message: "Student registered successfully", studentId };
  } catch (error: any) {
    console.error("Error adding student:", error);
    return { success: false, message: error.message };
  }
};

// Remove student
export const removeStudent = async (studentId: string) => {
  try {
    await deleteDoc(doc(db, 'registeredStudents', studentId));
    return { success: true, message: "Student removed successfully" };
  } catch (error: any) {
    console.error("Error removing student:", error);
    return { success: false, message: error.message };
  }
};

// Update student
export const updateStudent = async (studentId: string, studentData: { studentId?: string; name: string; email?: string; program: string; course: string; section: string }) => {
  try {
    const idFormat = /^\d{2}-\d{4}$/;
    const updatePayload: any = {
      name: studentData.name,
      email: studentData.email ? studentData.email.toLowerCase().trim() : '',
      program: studentData.program,
      course: studentData.course,
      section: studentData.section
    };
    if (studentData.studentId && idFormat.test(studentData.studentId.trim())) {
      updatePayload.displayStudentId = studentData.studentId.trim();
    }
    await updateDoc(doc(db, 'registeredStudents', studentId), updatePayload);
    return { success: true, message: "Student updated successfully" };
  } catch (error: any) {
    console.error("Error updating student:", error);
    return { success: false, message: error.message };
  }
};

// Get instructor's registered students
export const getRegisteredStudents = async (): Promise<any[]> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const studentsQuery = query(
      collection(db, 'registeredStudents'),
      where('instructorId', '==', user.uid)
    );
    
    const snapshot = await getDocs(studentsQuery);
    const students: any[] = [];
    
    snapshot.forEach((doc) => {
      students.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return students;
  } catch (error) {
    console.error("Error getting registered students:", error);
    throw error;
  }
};

// Get system settings
export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const settingsDoc = await getDoc(doc(db, 'settings', user.uid));
    
    if (settingsDoc.exists()) {
      return settingsDoc.data() as SystemSettings;
    }
    
    // Return defaults
    return {
      systemName: 'AttendScan',
      university: 'Your University',
      lateThresholdMinutes: 15
    };
  } catch (error) {
    console.error("Error getting settings:", error);
    return {
      systemName: 'AttendScan',
      university: 'Your University',
      lateThresholdMinutes: 15
    };
  }
};

// Save system settings
export const saveSystemSettings = async (settings: SystemSettings) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    await updateDoc(doc(db, 'settings', user.uid), settings as any);
    return { success: true, message: "Settings saved successfully" };
  } catch (error: any) {
    // If document doesn't exist, create it
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      await setDoc(doc(db, 'settings', user.uid), settings as any);
      return { success: true, message: "Settings saved successfully" };
    } catch (err: any) {
      console.error("Error saving settings:", err);
      return { success: false, message: err.message };
    }
  }
};

// Get student's attendance records
export const getStudentAttendanceRecords = async (studentId: string): Promise<AdminAttendanceRecord[]> => {
  try {
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      orderBy('scannedAt', 'desc')
    );
    
    const snapshot = await getDocs(attendanceQuery);
    const records: AdminAttendanceRecord[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        studentId: data.studentId,
        studentName: data.studentName,
        classId: data.classId,
        className: data.className,
        instructorId: data.instructorId,
        scannedAt: data.scannedAt,
        date: data.date,
        status: data.status,
        program: data.program || 'N/A',
        course: data.course || 'N/A',
        section: data.section || 'N/A'
      });
    });

    return records;
  } catch (error) {
    console.error("Error getting student attendance:", error);
    throw error;
  }
};
