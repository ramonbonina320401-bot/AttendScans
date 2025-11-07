/**
 * Migration Script: Update Student IDs to 00-0000 Format
 * 
 * This script updates all existing student accounts in Firestore
 * to use the new student ID format (00-0000).
 * 
 * Run this once with: node migrate-student-ids.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_ku73QmzC86CSuFWtc1dR4F4YUsX3naM",
  authDomain: "attendscan-soft-35066.firebaseapp.com",
  projectId: "attendscan-soft-35066",
  storageBucket: "attendscan-soft-35066.firebasestorage.app",
  messagingSenderId: "963184719625",
  appId: "1:963184719625:web:92e583b1c051f1072ac5d8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Format student ID to 00-0000 pattern
 * @param {string} studentId - Original student ID
 * @returns {string} Formatted student ID
 */
function formatStudentId(studentId) {
  if (!studentId) return studentId;
  
  // Convert to string and remove all non-numeric characters
  const numericOnly = studentId.toString().replace(/\D/g, "");
  
  // If already has 6 digits, format as 00-0000
  if (numericOnly.length === 6) {
    return `${numericOnly.slice(0, 2)}-${numericOnly.slice(2, 6)}`;
  }
  
  // If it's already formatted correctly, return as-is
  if (/^\d{2}-\d{4}$/.test(studentId)) {
    return studentId;
  }
  
  // If less than 6 digits, pad with zeros on the left
  if (numericOnly.length < 6) {
    const padded = numericOnly.padStart(6, '0');
    return `${padded.slice(0, 2)}-${padded.slice(2, 6)}`;
  }
  
  // If more than 6 digits, take first 6
  if (numericOnly.length > 6) {
    const truncated = numericOnly.slice(0, 6);
    return `${truncated.slice(0, 2)}-${truncated.slice(2, 6)}`;
  }
  
  return studentId; // fallback
}

/**
 * Migrate all student accounts
 */
async function migrateStudentIds() {
  console.log('🚀 Starting student ID migration...\n');
  
  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalUsers = 0;
    let studentsFound = 0;
    let studentsUpdated = 0;
    let studentsSkipped = 0;
    let errors = 0;
    
    console.log(`Found ${usersSnapshot.size} total users in database\n`);
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      totalUsers++;
      const userData = userDoc.data();
      
      // Only process students
      if (userData.role !== 'student') {
        continue;
      }
      
      studentsFound++;
      const currentId = userData.studentId;
      
      console.log(`Processing: ${userData.email}`);
      console.log(`  Current ID: ${currentId}`);
      
      // Check if already in correct format
      if (/^\d{2}-\d{4}$/.test(currentId)) {
        console.log(`  ✅ Already in correct format, skipping\n`);
        studentsSkipped++;
        continue;
      }
      
      // Format the student ID
      const newId = formatStudentId(currentId);
      console.log(`  New ID: ${newId}`);
      
      try {
        // Update in Firestore
        await updateDoc(doc(db, 'users', userDoc.id), {
          studentId: newId
        });
        console.log(`  ✅ Updated successfully\n`);
        studentsUpdated++;
      } catch (error) {
        console.error(`  ❌ Failed to update: ${error.message}\n`);
        errors++;
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('Migration Complete!');
    console.log('═══════════════════════════════════════');
    console.log(`Total users processed: ${totalUsers}`);
    console.log(`Students found: ${studentsFound}`);
    console.log(`Students updated: ${studentsUpdated}`);
    console.log(`Students already correct: ${studentsSkipped}`);
    console.log(`Errors: ${errors}`);
    console.log('═══════════════════════════════════════\n');
    
    if (errors > 0) {
      console.log('⚠️  Some accounts failed to update. Please check the errors above.');
    } else if (studentsUpdated > 0) {
      console.log('✅ All student IDs have been successfully migrated!');
    } else {
      console.log('ℹ️  No updates needed - all student IDs were already in the correct format.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the migration
migrateStudentIds();
