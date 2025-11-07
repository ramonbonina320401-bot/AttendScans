# AttendScans - QR Code Attendance System

A modern web-based attendance tracking system using QR codes, built with React, TypeScript, Vite, and Firebase.

## 🚀 Features

- **Student & Instructor Roles** with role-based access control
- **QR Code Scanning** for attendance tracking
- **Email Verification** for secure account creation
- **Real-time Attendance Records** stored in Firebase
- **Brute-force Protection** (3-4 attempts with lockout)
- **Instructor Access Key** system for controlled instructor signup
- **Activity Monitoring** with auto-logout
- **Responsive UI** built with Tailwind CSS

## 📋 Prerequisites

Before cloning and running this project, make sure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)
- A **modern web browser** (Chrome, Firefox, Edge, Safari)

## 🛠️ Setup Instructions for Your Teammate

### 1. Clone the Repository

```bash
git clone https://github.com/ramonbonina320401-bot/AttendScans.git
cd AttendScans
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 19
- Firebase SDK
- React Router
- Tailwind CSS
- QR Code libraries
- TypeScript
- And more...

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173` (or another port if 5173 is busy)

### 4. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### 5. Preview Production Build

```bash
npm run preview
```

## 🔥 Firebase Configuration

**Good News:** Firebase credentials are already configured in `src/firebase.ts`

The project uses Firebase for:
- **Authentication** (Email/Password with verification)
- **Firestore Database** (User profiles, attendance records, courses)

### Firebase Project Details:
- Project ID: `attendscan-soft-35066`
- Auth Domain: `attendscan-soft-35066.firebaseapp.com`

**Note:** The Firebase API keys in this project are **public** and safe to commit. They're designed to be public and protected by Firebase Security Rules.

### Firebase Security Rules Setup

To ensure the app works correctly, make sure these Firestore rules are set in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to system settings (for instructor access key)
    match /settings/system {
      allow read: if true;
      allow write: if false;
    }
    
    // User-specific settings (private)
    match /settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Other collections - customize as needed
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📁 Project Structure

```
AttendScans/
├── src/
│   ├── assets/              # Static assets
│   ├── utils/               # Utility functions (brute-force protection, etc.)
│   ├── services/            # Service files (auth service, etc.)
│   ├── firebase.ts          # Firebase configuration
│   ├── App.tsx              # Main app component with routing
│   ├── Login.tsx            # Login page with verification
│   ├── Signup.tsx           # Signup with student/instructor roles
│   ├── StudentDashboard.tsx # Student dashboard with QR scanner
│   ├── AdminLayout.tsx      # Instructor/Admin dashboard
│   ├── QrScanner.tsx        # QR code scanner component
│   ├── ProtectedRoute.tsx   # Route protection with email verification
│   ├── ActivityMonitor.tsx  # Auto-logout on inactivity
│   └── main.tsx             # App entry point
├── public/                  # Public assets
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── tailwind.config.cjs      # Tailwind CSS configuration
└── README.md                # This file
```

## 🔐 Default Credentials & Test Data

### Instructor Access Key:
- Default Key: `INSTRUCTOR2024`
- This can be changed in Firebase Console → Firestore → `settings/system` → `instructorAccessKey`

### Student ID Format:
- Format: `00-0000` (2 digits, hyphen, 4 digits)
- Example: `23-1234`

## 🎨 Working on Frontend/UI

### Available npm Scripts:

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint to check code quality
```

### UI Technologies:
- **Tailwind CSS** for styling (utility-first CSS)
- **Lucide React** for icons
- **React Icons** for additional icons
- Custom animations and transitions

### Tips for UI Development:
1. Tailwind classes are configured and working
2. Check existing components for styling patterns
3. The app is fully responsive (mobile-first design)
4. Use browser DevTools to inspect components

## 🚨 Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:** Run `npm install` again

### Issue: Port 5173 is already in use
**Solution:** Vite will automatically use the next available port, or specify a port:
```bash
npm run dev -- --port 3000
```

### Issue: Firebase permission errors
**Solution:** Check Firestore Security Rules in Firebase Console

### Issue: Email verification not working
**Solution:** 
1. Check Firebase Console → Authentication → Templates → Email verification is enabled
2. Check spam folder for verification emails

### Issue: Can't create instructor account
**Solution:** Use the correct instructor access key: `INSTRUCTOR2024`

## 🔄 Pulling Latest Changes

To get the latest updates from the repository:

```bash
git pull origin main
npm install  # In case new dependencies were added
```

## 📝 Development Workflow

1. **Create a new branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test locally

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

4. **Push to GitHub**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub for review

## 📚 Key Features to Know

### Email Verification Flow:
- All new accounts require email verification
- Verification modal appears on login if email not verified
- "Resend verification email" option available

### Role-Based Access:
- **Students:** Can scan QR codes and view their attendance
- **Instructors:** Can generate QR codes, view attendance records, manage students
- **Admin:** Full access to all features + settings

### Brute-Force Protection:
- Login: 4 attempts, 3-minute lockout
- Password Change: 4 attempts, 3-minute lockout
- Instructor Access Key: 3 attempts, 10-minute lockout

## 🤝 Contributing

When improving the UI/Frontend:
1. Follow the existing code style
2. Use TypeScript for type safety
3. Test on multiple screen sizes (responsive design)
4. Keep components modular and reusable
5. Add comments for complex logic

## 📞 Need Help?

- Check the browser console for error messages
- Review existing component code for examples
- Firebase Console for backend data/rules
- Check `INSTRUCTOR_KEY_SETUP.md` for instructor key documentation

## 🎯 Next Steps for UI Improvements

Some ideas for your teammate:
- Enhance color scheme and branding
- Improve loading states and animations
- Add more informative error messages
- Create better success/confirmation modals
- Improve mobile responsiveness
- Add data visualization (charts for attendance)
- Enhance QR code scanner UI
- Add profile pictures/avatars

---

**Built with ❤️ using React + TypeScript + Vite + Firebase**
