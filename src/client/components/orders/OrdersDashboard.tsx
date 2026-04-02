import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";
import Toast from "../common/Toast";

const STATUS_STYLES: Record<string, string> = {
  접수: "bg-primary-50 text-primary-600",
  확인: "bg-warning-50 text-warning-500",
  출고: "bg-purple-50 text-purple-700",
  배송: "bg-orange-50 text-orange-700",
  완료: "bg-success-50 text-success-700",
  취소: "bg-error-50 text-error-600",
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
      render: (row: any) => <span className="text-neutral-600">{new Date(row.order_date).toLocaleDateString("ko-KR")}</span>,
    },
    { key: "item_count", label: "품목 수" },
    {
      key: "status",
      label: "상태",
      render: (row: any) => (
        <span className={`inline-flex px-2 py-0.5 rounded-[6px] text-[12px] font-medium ${STATUS_STYLES[row.status] || ""}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "urgent_flag",
      label: "긴급",
      render: (row: any) =>
        row.urgent_flag ? (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-error-50 text-error-500 text-[11px] font-bold">!</span>
        ) : null,
    },
  ];

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">주문 관리</h2>
        <button
          onClick={() => navigate("/orders/new")}
          className="bg-primary-500 text-white px-4 py-2.5 rounded-[10px] text-[13px] font-semibold hover:bg-primary-600 active:bg-primary-700 transition-colors"
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
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] w-64 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
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
