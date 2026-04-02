import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";
import Modal from "../common/Modal";
import Toast from "../common/Toast";

const STOCK_STYLES: Record<string, { badge: string; label: string }> = {
  normal: { badge: "bg-success-50 text-success-700", label: "정상" },
  low: { badge: "bg-warning-50 text-warning-500", label: "부족" },
  out: { badge: "bg-error-50 text-error-600", label: "품절" },
};

export default function InventoryDashboard() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [txModal, setTxModal] = useState<{ itemId: number; itemName: string } | null>(null);
  const [txType, setTxType] = useState<"IN" | "OUT">("IN");
  const [txQuantity, setTxQuantity] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (stockFilter) params.set("stockStatus", stockFilter);
      if (search) params.set("search", search);
      const data = await api.fetch(`/inventory?${params}`);
      setInventory(data.inventory);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [stockFilter, search]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  async function handleTransaction() {
    if (!txModal || !txQuantity) return;
    setTxLoading(true);
    try {
      await api.fetch("/inventory/transaction", {
        method: "POST",
        body: { itemId: txModal.itemId, quantity: parseInt(txQuantity), transactionType: txType },
      });
      setToast(`${txType === "IN" ? "입고" : "출고"} 처리 완료`);
      setTxModal(null);
      setTxQuantity("");
      fetchInventory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTxLoading(false);
    }
  }

  const columns = [
    { key: "item_id", label: "품목 ID" },
    { key: "name", label: "품목명", sortable: true },
    {
      key: "current_quantity",
      label: "현재 수량",
      render: (row: any) => (
        <span className={`font-medium ${row.stock_status === "low" ? "text-warning-500" : row.stock_status === "out" ? "text-error-500 font-bold" : "text-neutral-800"}`}>
          {row.current_quantity.toLocaleString()}
        </span>
      ),
    },
    { key: "safety_stock", label: "안전재고", render: (row: any) => <span className="text-neutral-500">{row.safety_stock}</span> },
    { key: "warehouse_location", label: "창고 위치" },
    {
      key: "stock_status",
      label: "상태",
      render: (row: any) => {
        const style = STOCK_STYLES[row.stock_status] || STOCK_STYLES.normal;
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-[6px] text-[12px] font-medium ${style.badge}`}>
            {style.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "",
      render: (row: any) => (
        <button
          onClick={(e) => { e.stopPropagation(); setTxModal({ itemId: row.item_id, itemName: row.name }); }}
          className="text-primary-500 hover:text-primary-700 text-[12px] font-medium transition-colors"
        >
          입출고
        </button>
      ),
    },
  ];

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">재고 관리</h2>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="품목 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] w-64 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
        />
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
        >
          <option value="">전체</option>
          <option value="normal">정상</option>
          <option value="low">부족</option>
          <option value="out">품절</option>
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchInventory} />}

      <DataTable columns={columns} data={inventory} loading={loading} emptyMessage="재고 데이터가 없습니다" />

      {txModal && (
        <Modal
          title={`입출고 처리: ${txModal.itemName}`}
          onClose={() => { setTxModal(null); setTxQuantity(""); }}
          onConfirm={handleTransaction}
          confirmText={txType === "IN" ? "입고 처리" : "출고 처리"}
          loading={txLoading}
        >
          <div className="space-y-4">
            <div className="flex gap-1.5 bg-neutral-100 p-1 rounded-[10px]">
              <button
                onClick={() => setTxType("IN")}
                className={`flex-1 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${txType === "IN" ? "bg-white text-success-600 shadow-card" : "text-neutral-500"}`}
              >
                입고
              </button>
              <button
                onClick={() => setTxType("OUT")}
                className={`flex-1 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${txType === "OUT" ? "bg-white text-error-500 shadow-card" : "text-neutral-500"}`}
              >
                출고
              </button>
            </div>
            <input
              type="number"
              placeholder="수량을 입력하세요"
              value={txQuantity}
              onChange={(e) => setTxQuantity(e.target.value)}
              min={1}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
