import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ClipboardListIcon, PackageIcon, WalletIcon, BarChartIcon, UsersIcon, MenuIcon } from "../common/Icons";

interface LayoutProps {
  children: ReactNode;
  user: { username: string; roles: string[] } | null;
  onLogout: () => void;
  lowStockCount?: number;
}

const MENU_ITEMS = [
  { path: "/orders", label: "주문 관리", Icon: ClipboardListIcon, roles: ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"] },
  { path: "/inventory", label: "재고 관리", Icon: PackageIcon, roles: ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"], badge: true },
  { path: "/finance", label: "정산/회계", Icon: WalletIcon, roles: ["관리자", "회계팀", "뷰어"] },
  { path: "/reports", label: "보고서", Icon: BarChartIcon, roles: ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"] },
  { path: "/admin/users", label: "사용자 관리", Icon: UsersIcon, roles: ["관리자"] },
];

export default function Layout({ children, user, onLogout, lowStockCount = 0 }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleMenuItems = MENU_ITEMS.filter((item) =>
    user?.roles.some((role) => item.roles.includes(role))
  );

  return (
    <div className="flex h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-[240px]" : "w-0 overflow-hidden"} bg-white border-r border-neutral-200 transition-all duration-200 flex-shrink-0 flex flex-col`}
      >
        <div className="px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 32 32" className="flex-shrink-0">
              <rect width="32" height="32" rx="8" fill="#3182f6"/>
              <path d="M8 16c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4s-1.8 4-4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M14 16c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4s-1.8-4-4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
            <span className="text-[15px] font-semibold text-neutral-900">이음 ERP</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] mb-0.5 text-[13px] transition-colors relative ${
                  isActive
                    ? "bg-primary-50 text-primary-600 font-medium"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary-500 rounded-r-full" />
                )}
                <item.Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
                {item.badge && lowStockCount > 0 && (
                  <span className="ml-auto bg-error-500 text-white text-[11px] leading-none px-1.5 py-1 rounded-full font-medium">
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
        <header className="h-14 bg-white border-b border-neutral-100 flex items-center px-5 justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-neutral-50 rounded-[8px] transition-colors">
            <MenuIcon className="w-[18px] h-[18px] text-neutral-500" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-neutral-600">{user?.username}</span>
            <span className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-1 rounded-[6px] font-medium">
              {user?.roles[0]}
            </span>
            <button
              onClick={onLogout}
              className="text-[13px] text-neutral-400 hover:text-error-500 transition-colors"
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
