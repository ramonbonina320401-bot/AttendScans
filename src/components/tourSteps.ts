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
