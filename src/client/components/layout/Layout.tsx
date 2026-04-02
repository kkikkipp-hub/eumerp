import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
  user: { username: string; roles: string[] } | null;
  onLogout: () => void;
  lowStockCount?: number;
}

const MENU_ITEMS = [
  { path: "/orders", label: "주문 관리", icon: "📋", roles: ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"] },
  { path: "/inventory", label: "재고 관리", icon: "📦", roles: ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"], badge: true },
  { path: "/finance", label: "정산/회계", icon: "💰", roles: ["관리자", "회계팀", "뷰어"] },
  { path: "/reports", label: "보고서", icon: "📊", roles: ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"] },
  { path: "/admin/users", label: "사용자 관리", icon: "👤", roles: ["관리자"] },
];

export default function Layout({ children, user, onLogout, lowStockCount = 0 }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleMenuItems = MENU_ITEMS.filter((item) =>
    user?.roles.some((role) => item.roles.includes(role))
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-60" : "w-0 overflow-hidden"} bg-white border-r border-gray-200 transition-all duration-200 flex-shrink-0`}
      >
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-blue-600">ABC전자 ERP</h1>
        </div>
        <nav className="p-2">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && lowStockCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {lowStockCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {user?.roles[0]}
            </span>
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
