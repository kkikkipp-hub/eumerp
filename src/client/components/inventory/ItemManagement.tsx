import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";
import Modal from "../common/Modal";
import Toast from "../common/Toast";

function formatWon(n: number) { return n.toLocaleString("ko-KR") + "원"; }

export default function ItemManagement() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", unitPrice: 0, initialQuantity: 0, safetyStock: 10, warehouseLocation: "" });

  const fetchItems = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api.fetch(`/items${params}`);
      setItems(data.items);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleCreate() {
    if (!form.name || form.unitPrice <= 0) { setError("품목명과 단가(양수)를 입력하세요"); return; }
    setFormLoading(true);
    try {
      await api.fetch("/items", { method: "POST", body: form });
      setToast("품목이 등록되었습니다");
      setShowCreate(false);
      setForm({ name: "", description: "", unitPrice: 0, initialQuantity: 0, safetyStock: 10, warehouseLocation: "" });
      fetchItems();
    } catch (err: any) { setError(err.message); }
    finally { setFormLoading(false); }
  }

  async function handleEdit() {
    if (!showEdit) return;
    setFormLoading(true);
    try {
      await api.fetch(`/items/${showEdit.item_id}`, { method: "PUT", body: {
        name: form.name, description: form.description, unitPrice: form.unitPrice,
        safetyStock: form.safetyStock, warehouseLocation: form.warehouseLocation,
      }});
      setToast("품목이 수정되었습니다");
      setShowEdit(null);
      fetchItems();
    } catch (err: any) { setError(err.message); }
    finally { setFormLoading(false); }
  }

  const columns = [
    { key: "item_id", label: "ID" },
    { key: "name", label: "품목명", sortable: true },
    { key: "description", label: "설명", render: (r: any) => <span className="text-neutral-500">{r.description || "-"}</span> },
    { key: "unit_price", label: "단가", render: (r: any) => formatWon(r.unit_price) },
    {
      key: "actions", label: "",
      render: (r: any) => (
        <button onClick={() => {
          setForm({ name: r.name, description: r.description || "", unitPrice: r.unit_price, initialQuantity: 0, safetyStock: 0, warehouseLocation: "" });
          setShowEdit(r);
        }} className="text-primary-500 hover:text-primary-700 text-[12px] font-medium">수정</button>
      ),
    },
  ];

  const inputClass = "w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors";

  const formFields = (isCreate: boolean) => (
    <div className="space-y-3">
      <div>
        <label className="block text-[13px] font-medium text-neutral-700 mb-1">품목명 *</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} placeholder="예: 반도체칩 A100" />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-neutral-700 mb-1">설명</label>
        <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inputClass} placeholder="품목 설명 (선택)" />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-neutral-700 mb-1">단가 (원) *</label>
        <input type="number" min={0} value={form.unitPrice} onChange={e => setForm({...form, unitPrice: parseInt(e.target.value) || 0})} className={inputClass} />
      </div>
      {isCreate && (
        <>
          <div>
            <label className="block text-[13px] font-medium text-neutral-700 mb-1">초기 재고 수량</label>
            <input type="number" min={0} value={form.initialQuantity} onChange={e => setForm({...form, initialQuantity: parseInt(e.target.value) || 0})} className={inputClass} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-neutral-700 mb-1">안전재고</label>
            <input type="number" min={0} value={form.safetyStock} onChange={e => setForm({...form, safetyStock: parseInt(e.target.value) || 0})} className={inputClass} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-neutral-700 mb-1">창고 위치</label>
            <input value={form.warehouseLocation} onChange={e => setForm({...form, warehouseLocation: e.target.value})} className={inputClass} placeholder="예: A동 1층" />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">품목 관리</h2>
        <button onClick={() => { setForm({ name: "", description: "", unitPrice: 0, initialQuantity: 0, safetyStock: 10, warehouseLocation: "" }); setShowCreate(true); }}
          className="bg-primary-500 text-white px-4 py-2.5 rounded-[10px] text-[13px] font-semibold hover:bg-primary-600 transition-colors">
          + 품목 등록
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="품목 검색..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] w-64 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors" />
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchItems} />}
      <DataTable columns={columns} data={items} loading={loading} emptyMessage="등록된 품목이 없습니다" />

      {showCreate && (
        <Modal title="품목 등록" onClose={() => setShowCreate(false)} onConfirm={handleCreate} confirmText="등록" loading={formLoading}>
          {formFields(true)}
        </Modal>
      )}

      {showEdit && (
        <Modal title={`품목 수정: ${showEdit.name}`} onClose={() => setShowEdit(null)} onConfirm={handleEdit} confirmText="저장" loading={formLoading}>
          {formFields(false)}
        </Modal>
      )}
    </div>
  );
}
