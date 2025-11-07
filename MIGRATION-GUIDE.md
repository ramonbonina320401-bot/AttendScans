# Student ID Migration Guide

This guide will help you migrate all existing student accounts to use the new student ID format (00-0000).

## ⚠️ Important: Before You Start

1. **Backup first!** Always backup your data before running any migration
2. The scripts are safe - they only update the `studentId` field for student accounts
3. Instructor/admin accounts are not affected

## 📋 Prerequisites

Make sure you have Node.js installed and the Firebase packages:

```powershell
npm install firebase
```

## 🚀 Step-by-Step Instructions

### Step 1: Backup Your Data (REQUIRED)

Run the backup script first to save all your current user data:

```powershell
node backup-users.js
```

This will create a file like `backup-users-2025-11-07T12-34-56-789Z.json` with all your user data. **Keep this file safe!**

### Step 2: Review the Backup

Open the backup file and verify your student IDs. For example:

```json
{
  "id": "abc123",
  "email": "student@example.com",
  "role": "student",
  "studentId": "123456",
  ...
}
```

### Step 3: Run the Migration

Run the migration script to update all student IDs:

```powershell
node migrate-student-ids.js
```

The script will:
- Find all student accounts
- Format their student IDs to 00-0000 pattern
- Skip accounts already in the correct format
- Show progress and summary

### Step 4: Verify the Migration

Check the output. You should see something like:

```
═══════════════════════════════════════
Migration Complete!
═══════════════════════════════════════
Total users processed: 10
Students found: 5
Students updated: 3
Students already correct: 2
Errors: 0
═══════════════════════════════════════

✅ All student IDs have been successfully migrated!
```

### Step 5: Test Login

Try logging in with a student account using the new format (e.g., "12-3456" instead of "123456").

## 🔧 How the Migration Works

The script converts student IDs like this:

| Original Format | Converted To |
|----------------|--------------|
| `123456`       | `12-3456`    |
| `1234`         | `00-1234`    |
| `12-3456`      | `12-3456` (no change) |
| `12345678`     | `12-3456` (truncated) |

## ❓ Troubleshooting

### "Module not found" error

Install Firebase:
```powershell
npm install firebase
```

### "Permission denied" error

Make sure your Firebase rules allow reading/writing the users collection. The scripts use the same Firebase config as your app.

### Migration shows 0 students

Check that:
1. Your Firestore database has a `users` collection
2. Student accounts have `role: "student"` field
3. Your Firebase config is correct

### Need to rollback?

If something goes wrong, you can manually restore from the backup JSON file using the Firebase Console.

## 📝 What Gets Updated

- ✅ Only the `studentId` field in the `users` collection
- ✅ Only accounts with `role: "student"`
- ❌ No other fields are modified
- ❌ Instructor/admin accounts are not touched
- ❌ Attendance records are not modified

## 🔒 Security Note

The scripts use your Firebase config from the app, which is safe because:
1. They run locally on your machine
2. They use the same Firestore rules as your app
3. They only update data you already have permission to modify

## 💡 After Migration

Once the migration is complete:
1. All students must use the new format (00-0000) to log in
2. New signups will automatically use the correct format
3. You can delete the migration scripts (backup-users.js and migrate-student-ids.js)
4. **Keep the backup JSON file** in case you need to reference old data

## 🆘 Need Help?

If you encounter any issues:
1. Check the error message in the terminal
2. Review your backup file
3. Check the Firebase Console to see what's in your database
4. You can always manually update student IDs in the Firebase Console
