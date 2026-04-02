import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/layout/Layout";
import LoginPage from "./components/auth/LoginPage";
import OrdersDashboard from "./components/orders/OrdersDashboard";
import OrderCreate from "./components/orders/OrderCreate";
import OrderDetail from "./components/orders/OrderDetail";
import OrderUpload from "./components/orders/OrderUpload";
import InventoryDashboard from "./components/inventory/InventoryDashboard";
import FinanceDashboard from "./components/finance/FinanceDashboard";
import ReportsPage from "./components/reports/ReportsPage";
import UserManagement from "./components/admin/UserManagement";

export default function App() {
  const { user, loading, login, logout, defaultRoute } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-400">로딩중...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route path="/orders" element={<OrdersDashboard />} />
        <Route path="/orders/new" element={<OrderCreate />} />
        <Route path="/orders/upload" element={<OrderUpload />} />
        <Route path="/orders/:orderId" element={<OrderDetail />} />
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </Layout>
  );
}
