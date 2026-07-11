import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/useAuth";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Videos from "./pages/Videos";
import Withdrawals from "./pages/Withdrawals";
import Users from "./pages/Users";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/videos"
            element={
              <RequireAuth>
                <Videos />
              </RequireAuth>
            }
          />
          <Route
            path="/withdrawals"
            element={
              <RequireAuth>
                <Withdrawals />
              </RequireAuth>
            }
          /> 
          <Route path="/users" element={<RequireAuth><Users /></RequireAuth>} />          
          <Route path="*" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
