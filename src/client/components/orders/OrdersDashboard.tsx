import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";
import Toast from "../common/Toast";

const STATUS_COLORS: Record<string, string> = {
  접수: "bg-blue-100 text-blue-700",
  확인: "bg-yellow-100 text-yellow-700",
  출고: "bg-purple-100 text-purple-700",
  배송: "bg-orange-100 text-orange-700",
  완료: "bg-green-100 text-green-700",
  취소: "bg-red-100 text-red-700",
};

export default function OrdersDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const data = await api.fetch(`/orders?${params}`);
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const columns = [
    { key: "order_id", label: "주문 ID", sortable: true },
    { key: "customer_name", label: "고객사", sortable: true },
    {
      key: "order_date",
      label: "주문일",
      sortable: true,
      render: (row: any) => new Date(row.order_date).toLocaleDateString("ko-KR"),
    },
    { key: "item_count", label: "품목 수" },
    {
      key: "status",
      label: "상태",
      render: (row: any) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[row.status] || ""}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "urgent_flag",
      label: "긴급",
      render: (row: any) => (row.urgent_flag ? <span className="text-red-500 font-bold">!</span> : null),
    },
  ];

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">주문 관리</h2>
        <button
          onClick={() => navigate("/orders/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + 신규 주문
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="주문 ID 또는 고객사 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 상태</option>
          {["접수", "확인", "출고", "배송", "완료", "취소"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchOrders} />}

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyMessage="주문이 없습니다"
        onRowClick={(row) => navigate(`/orders/${row.order_id}`)}
      />
    </div>
  );
}
