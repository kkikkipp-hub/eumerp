import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";
import Modal from "../common/Modal";
import Toast from "../common/Toast";

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
        <span className={row.stock_status === "low" ? "text-orange-600 font-medium" : row.stock_status === "out" ? "text-red-600 font-bold" : ""}>
          {row.current_quantity.toLocaleString()}
        </span>
      ),
    },
    { key: "safety_stock", label: "안전재고" },
    { key: "warehouse_location", label: "창고 위치" },
    {
      key: "stock_status",
      label: "상태",
      render: (row: any) => {
        const colors: Record<string, string> = {
          normal: "bg-green-100 text-green-700",
          low: "bg-orange-100 text-orange-700",
          out: "bg-red-100 text-red-700",
        };
        const labels: Record<string, string> = { normal: "정상", low: "부족", out: "품절" };
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[row.stock_status]}`}>
            {labels[row.stock_status]}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "입출고",
      render: (row: any) => (
        <button
          onClick={(e) => { e.stopPropagation(); setTxModal({ itemId: row.item_id, itemName: row.name }); }}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
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
        <h2 className="text-xl font-bold">재고 관리</h2>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="품목 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체</option>
          <option value="normal">정상</option>
          <option value="low">부족</option>
          <option value="out">품절</option>
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchInventory} />}

      <DataTable
        columns={columns}
        data={inventory}
        loading={loading}
        emptyMessage="재고 데이터가 없습니다"
      />

      {txModal && (
        <Modal
          title={`입출고 처리: ${txModal.itemName}`}
          onClose={() => { setTxModal(null); setTxQuantity(""); }}
          onConfirm={handleTransaction}
          confirmText={txType === "IN" ? "입고 처리" : "출고 처리"}
          loading={txLoading}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setTxType("IN")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${txType === "IN" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                입고
              </button>
              <button
                onClick={() => setTxType("OUT")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${txType === "OUT" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                출고
              </button>
            </div>
            <input
              type="number"
              placeholder="수량"
              value={txQuantity}
              onChange={(e) => setTxQuantity(e.target.value)}
              min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
