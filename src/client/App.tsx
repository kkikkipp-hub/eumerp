import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/layout/Layout";
import LoginPage from "./components/auth/LoginPage";
import OrdersDashboard from "./components/orders/OrdersDashboard";
import InventoryDashboard from "./components/inventory/InventoryDashboard";
import FinanceDashboard from "./components/finance/FinanceDashboard";
import UserManagement from "./components/admin/UserManagement";

export default function App() {
  const { user, loading, login, logout, defaultRoute } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">로딩중...</div>
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
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="/finance" element={<FinanceDashboard />} />
        <Route path="/reports" element={<div className="text-gray-500">보고서 페이지 (구현 예정)</div>} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </Layout>
  );
}
