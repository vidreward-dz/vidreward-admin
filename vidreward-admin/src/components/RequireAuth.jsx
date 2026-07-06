import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner spinner-dark" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return children;
}
