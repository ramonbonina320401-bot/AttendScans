interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: "student" | "instructor" | "admin";
}
declare const ProtectedRoute: React.FC<ProtectedRouteProps>;
export default ProtectedRoute;
