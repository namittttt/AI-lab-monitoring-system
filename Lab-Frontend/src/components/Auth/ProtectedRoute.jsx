import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xl font-semibold text-gray-700">
        Loading...
      </div>
    );
  }

  // Only redirect if not loading and user is null
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}


