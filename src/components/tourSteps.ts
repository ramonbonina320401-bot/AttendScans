import type { TourStep } from "./GuidedTour";

export const instructorTourSteps: TourStep[] = [
  {
    target: "nav-settings",
    title: "⚙️ Settings - Start Here",
    description:
      "Set your grace period (how many minutes late students can be) and configure your attendance system preferences.",
    position: "right",
  },
  {
    target: "nav-courses",
    title: "📚 Courses Management",
    description:
      "Add and manage your courses here. Create programs, courses, and sections. This is where you set up your teaching schedule.",
    position: "right",
  },
  {
    target: "nav-students",
    title: "👥 Student Management",
    description:
      "Add students one by one or import many at once using Excel. Students must be enrolled in your course to scan attendance.",
    position: "right",
  },
  {
    target: "nav-generate-qr",
    title: "📱 Generate QR Code",
    description:
      "Create a new QR code for today's class. Select your course, enter the topic (e.g., 'Midterm Review'), choose duration, and deploy. Students scan this to mark attendance.",
    position: "right",
  },
  {
    target: "nav-records",
    title: "📊 Attendance Records",
    description:
      "View all scanned attendance here. Filter by date, program, course, and section. Download reports as CSV for your records.",
    position: "right",
  },
];

export const studentTourSteps: TourStep[] = [
  {
    target: "attendance-status",
    title: "📅 Check Your Status",
    description:
      "This shows whether you've marked attendance today. Make sure to scan the QR code before the session expires!",
    position: "bottom",
  },
  {
    target: "camera-scanner",
    title: "📸 QR Code Scanner",
    description:
      "Click 'Start Camera' to activate your camera, then point it at the QR code displayed by your instructor. The app will automatically detect and scan it.",
    position: "bottom",
  },
  {
    target: "manual-entry",
    title: "⌨️ Manual Session ID Entry",
    description:
      "If you can't scan the QR code, ask your instructor for the 8-character Session ID and enter it here instead.",
    position: "top",
  },
  {
    target: "view-report-btn",
    title: "📊 View Your Report",
    description:
      "Click here to see your full attendance history, including dates, courses, and your attendance percentage.",
    position: "bottom",
  },
];
