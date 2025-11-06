import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc, getDocs, query, where, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
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

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('instructorId', '==', user.uid),
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
        status: data.status
      });
    });

    return records;
  } catch (error) {
    console.error("Error getting attendance records:", error);
    throw error;
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
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  course: string;
  section: string;
}) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // Add to users collection
    await addDoc(collection(db, 'users'), {
      ...studentData,
      role: 'student',
      instructorId: user.uid,
      createdAt: new Date().toISOString()
    });

    return { success: true, message: "Student added successfully" };
  } catch (error: any) {
    console.error("Error adding student:", error);
    return { success: false, message: error.message };
  }
};

// Remove student
export const removeStudent = async (studentId: string) => {
  try {
    await deleteDoc(doc(db, 'users', studentId));
    return { success: true, message: "Student removed successfully" };
  } catch (error: any) {
    console.error("Error removing student:", error);
    return { success: false, message: error.message };
  }
};

// Update student
export const updateStudent = async (studentId: string, studentData: Partial<AdminStudent>) => {
  try {
    await updateDoc(doc(db, 'users', studentId), studentData as any);
    return { success: true, message: "Student updated successfully" };
  } catch (error: any) {
    console.error("Error updating student:", error);
    return { success: false, message: error.message };
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
      
      await addDoc(collection(db, 'settings'), {
        ...settings,
        userId: user.uid
      });
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
        status: data.status
      });
    });

    return records;
  } catch (error) {
    console.error("Error getting student attendance:", error);
    throw error;
  }
};
