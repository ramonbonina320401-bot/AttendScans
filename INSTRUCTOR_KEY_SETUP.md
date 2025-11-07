# Instructor Access Key Setup

## Overview
The instructor access key prevents unauthorized users from creating instructor accounts. Only users with the correct key can sign up as instructors.

## Initial Setup

### Set the Instructor Access Key in Firebase

1. **Go to Firebase Console**
   - Navigate to: https://console.firebase.google.com/
   - Select your project: `AttendScans`

2. **Access Firestore Database**
   - Click on "Firestore Database" in the left sidebar
   - Click "Start collection" (or navigate to existing collections)

3. **Create System Settings Document**
   - Collection ID: `settings`
   - Document ID: `system`
   - Add the following field:
     - **Field name**: `instructorAccessKey`
     - **Type**: string
     - **Value**: `INSTRUCTOR2024` (or choose your own secure key)
   - Click "Save"

## Key Features

- **3 Attempts**: Users get 3 attempts to enter the correct key
- **10-Minute Lockout**: After 3 failed attempts, signup is locked for 10 minutes
- **Real-time Validation**: Key is checked against Firestore before account creation
- **Countdown Timer**: Shows remaining lockout time
- **Attempts Counter**: Displays remaining attempts after each failure

## Changing the Key

To update the instructor access key:

1. Go to Firebase Console → Firestore Database
2. Navigate to `settings/system`
3. Edit the `instructorAccessKey` field
4. Set new value (e.g., `TEACH2025`)
5. Click "Save"

The new key takes effect immediately - no need to redeploy the app!

## Sharing the Key

Share the instructor access key through secure channels only:
- ✅ Direct email to verified instructors
- ✅ In-person during orientation
- ✅ Private messages (Teams, Slack, etc.)
- ❌ Never post publicly or in student-accessible areas

## Default Key

If no key is set in Firestore, the system uses: `INSTRUCTOR2024`

**Important**: Set a custom key in production for better security!

## Troubleshooting

### Issue: "Invalid instructor access key"
- **Solution**: Verify the key in Firebase matches what you're entering
- Check for typos or extra spaces
- Key is case-sensitive

### Issue: "Too many failed attempts"
- **Solution**: Wait 10 minutes for lockout to expire
- Countdown timer shows remaining time
- Lockout is browser-specific (localStorage)

### Issue: Key validation fails
- **Solution**: Check Firebase permissions
- Ensure `settings/system` document exists
- Verify internet connection

## Security Notes

- Change the key periodically (e.g., each semester)
- If key is compromised, change it immediately in Firebase
- Monitor new instructor signups regularly
- Consider implementing IP logging for failed attempts

## Example Key Values

- Semester-based: `FALL2024`, `SPRING2025`
- Department-based: `CS_FACULTY_2024`
- Random: `INST_7X9K2P`
- Passphrase: `TeachWithUs2024`

Choose a key that is:
- Easy to share verbally
- Hard to guess
- Not a common word or phrase
