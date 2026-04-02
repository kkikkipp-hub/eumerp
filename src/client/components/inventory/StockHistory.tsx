import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";

export default function StockHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemIdParam = searchParams.get("itemId");
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState(itemIdParam || "");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.fetch("/inventory").then((data) => setItems(data.inventory)).catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedItem) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.fetch(`/inventory/stock-history/${selectedItem}`);
      setHistory(data.history);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedItem]);

  useEffect(() => { if (selectedItem) fetchHistory(); }, [fetchHistory, selectedItem]);

  const columns = [
    { key: "history_id", label: "ID" },
    {
      key: "transaction_type",
      label: "유형",
      render: (row: any) => (
        <span className={`px-2 py-0.5 rounded-[6px] text-[12px] font-medium ${
          row.transaction_type === "IN" ? "bg-success-50 text-success-700" : "bg-error-50 text-error-600"
        }`}>
          {row.transaction_type === "IN" ? "입고" : "출고"}
        </span>
      ),
    },
    { key: "quantity", label: "수량", render: (row: any) => row.quantity.toLocaleString() },
    { key: "responsible_person_name", label: "담당자", render: (row: any) => row.responsible_person_name || "-" },
    {
      key: "transaction_date",
      label: "일시",
      render: (row: any) => new Date(row.transaction_date).toLocaleString("ko-KR"),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/inventory")} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h2 className="text-[20px] font-bold text-neutral-900">입출고 이력</h2>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={selectedItem}
          onChange={(e) => setSelectedItem(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
        >
          <option value="">품목 선택</option>
          {items.map((item: any) => (
            <option key={item.item_id} value={item.item_id}>{item.name} (ID: {item.item_id})</option>
          ))}
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchHistory} />}

      {selectedItem ? (
        <DataTable columns={columns} data={history} loading={loading} emptyMessage="입출고 이력이 없습니다" />
      ) : (
        <div className="bg-white rounded-[12px] shadow-card p-16 text-center">
          <p className="text-[14px] text-neutral-500">품목을 선택하면 이력이 표시됩니다</p>
        </div>
      )}
    </div>
  );
}
