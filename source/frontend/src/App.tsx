import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminActivityLogPage from "./pages/admin/AdminActivityLogPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import LoginPage from "./pages/auth/LoginPage";
import RegisterOrangTuaPage from "./pages/auth/RegisterOrangTuaPage";
import LandingPage from "./pages/landing/LandingPage";
import OrangTuaDashboard from "./pages/orang-tua/OrangTuaDashboard";
import OrangTuaDataAnakPage from "./pages/orang-tua/OrangTuaDataAnakPage";
import PetugasDashboard from "./pages/petugas/PetugasDashboard";
import PetugasInputMassalPage from "./pages/petugas/PetugasInputMassalPage";
import PetugasInputSatuanPage from "./pages/petugas/PetugasInputSatuanPage";
import type { UserRole } from "./services/dashboardService";
import { getCurrentUser } from "./utils/authSession";
import PagePreloader from "./components/ui/PagePreloader";

const dashboardRoutes: Record<UserRole, string> = {
  admin: "/admin",
  petugas: "/petugas",
  petugas_kesehatan: "/petugas",
  orang_tua: "/orang-tua",
};

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
};

function normalizeRole(role: UserRole) {
  return role === "petugas" ? "petugas_kesehatan" : role;
}

function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = normalizeRole(currentUser.role);

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={dashboardRoutes[currentUser.role] ?? "/login"} replace />;
  }

  return children;
}

function App() {
  return (
    <>
      <PagePreloader />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterOrangTuaPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/aktivitas"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminActivityLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas"
        element={
          <ProtectedRoute allowedRoles={["petugas_kesehatan"]}>
            <PetugasDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/input-satuan"
        element={
          <ProtectedRoute allowedRoles={["petugas_kesehatan"]}>
            <PetugasInputSatuanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/input-massal"
        element={
          <ProtectedRoute allowedRoles={["petugas_kesehatan"]}>
            <PetugasInputMassalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orang-tua"
        element={
          <ProtectedRoute allowedRoles={["orang_tua"]}>
            <OrangTuaDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orang-tua/data-anak"
        element={
          <ProtectedRoute allowedRoles={["orang_tua"]}>
            <OrangTuaDataAnakPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
