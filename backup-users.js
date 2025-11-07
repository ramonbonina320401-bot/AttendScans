/**
 * Backup Script: Export all user data before migration
 * 
 * Run this BEFORE the migration to backup your data:
 * node backup-users.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync } from 'fs';

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

async function backupUsers() {
  console.log('📦 Starting user data backup...\n');
  
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const backup = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      backup.push({
        id: userDoc.id,
        ...userData
      });
      
      console.log(`✅ Backed up: ${userData.email} (${userData.role})`);
      if (userData.role === 'student') {
        console.log(`   Student ID: ${userData.studentId}`);
      }
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-users-${timestamp}.json`;
    
    writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup complete!`);
    console.log(`📁 File saved: ${filename}`);
    console.log(`📊 Total users backed up: ${backup.length}\n`);
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

backupUsers();
