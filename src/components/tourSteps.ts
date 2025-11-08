import type { TourStep } from "./GuidedTour";

export const instructorTourSteps: TourStep[] = [
  {
    target: "nav-settings",
    title: "⚙️ Settings - Start Here",
    description:
      "Set your grace period (how many minutes late students can be) and add your courses. This is where you configure your attendance system.",
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
    target: "add-student-btn",
    title: "➕ Adding Students",
    description:
      "Click here to add a single student. Make sure their email, program, course, and section match your settings. You can also download an Excel template for bulk imports.",
    position: "bottom",
  },
  {
    target: "nav-generate-qr",
    title: "📱 Generate QR Code",
    description:
      "Create a new QR code for today's class. Select your course, enter the topic (e.g., 'Midterm Review'), choose duration, and deploy. Students scan this to mark attendance.",
    position: "right",
  },
  {
    target: "grace-period",
    title: "⏱️ Grace Period",
    description:
      "This shows your current grace period. Students scanning within this time after class starts are marked 'present'. After that, they're 'late'. Change it in Settings → General.",
    position: "bottom",
  },
  {
    target: "nav-records",
    title: "📊 Attendance Records",
    description:
      "View all scanned attendance here. Filter by date, program, course, and section. Download reports as CSV for your records.",
    position: "right",
  },
];
