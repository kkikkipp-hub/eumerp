import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Toast from "../common/Toast";

interface Customer {
  customer_id: number;
  name: string;
}

interface Item {
  item_id: number;
  name: string;
  unit_price: number;
}

interface OrderItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export default function OrderCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customerId, setCustomerId] = useState(0);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [urgentFlag, setUrgentFlag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // 품목 추가용
  const [selectedItemId, setSelectedItemId] = useState(0);
  const [selectedQty, setSelectedQty] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const [invData] = await Promise.all([
          api.fetch("/inventory"),
        ]);
        // inventory에서 품목 목록 추출
        setItems(invData.inventory.map((i: any) => ({
          item_id: i.item_id,
          name: i.name,
          unit_price: i.unit_price,
        })));

        const custData = await api.fetch("/customers");
        setCustomers(custData.customers);
      } catch (err: any) {
        setError(err.message);
      }
    }
    load();
  }, []);

  function addItem() {
    if (!selectedItemId || selectedQty <= 0) return;
    const item = items.find((i) => i.item_id === selectedItemId);
    if (!item) return;
    if (orderItems.some((oi) => oi.itemId === selectedItemId)) {
      setError("이미 추가된 품목입니다");
      return;
    }
    setOrderItems([...orderItems, {
      itemId: item.item_id,
      itemName: item.name,
      quantity: selectedQty,
      unitPrice: item.unit_price,
    }]);
    setSelectedItemId(0);
    setSelectedQty(1);
    setError("");
  }

  function removeItem(itemId: number) {
    setOrderItems(orderItems.filter((oi) => oi.itemId !== itemId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) { setError("고객사를 선택하세요"); return; }
    if (orderItems.length === 0) { setError("품목을 추가하세요"); return; }

    setLoading(true);
    setError("");
    try {
      const result = await api.fetch("/orders", {
        method: "POST",
        body: {
          customerId,
          items: orderItems.map((oi) => ({ itemId: oi.itemId, quantity: oi.quantity })),
          notes: notes || undefined,
          urgentFlag,
        },
      });
      setToast(`주문 #${result.orderId} 접수 완료`);
      setTimeout(() => navigate("/orders"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = orderItems.reduce((sum, oi) => sum + oi.unitPrice * oi.quantity, 0);

  const inputClass = "w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors";

  return (
    <div className="max-w-2xl">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">신규 주문</h2>
        <button
          onClick={() => navigate("/orders")}
          className="text-[13px] text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          취소
        </button>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-100 text-error-600 text-[13px] rounded-[10px] p-3 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 고객사 */}
        <div>
          <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">고객사</label>
          <select value={customerId} onChange={(e) => setCustomerId(parseInt(e.target.value))} className={inputClass}>
            <option value={0}>고객사 선택</option>
            {customers.map((c) => (
              <option key={c.customer_id} value={c.customer_id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 품목 추가 */}
        <div>
          <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">품목 추가</label>
          <div className="flex gap-2">
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(parseInt(e.target.value))} className={`${inputClass} flex-1`}>
              <option value={0}>품목 선택</option>
              {items.map((item) => (
                <option key={item.item_id} value={item.item_id}>
                  {item.name} ({item.unit_price.toLocaleString()}원)
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={selectedQty}
              onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
              className={`${inputClass} w-24`}
              placeholder="수량"
            />
            <button
              type="button"
              onClick={addItem}
              className="bg-neutral-100 text-neutral-700 px-4 py-2.5 rounded-[10px] text-[13px] font-medium hover:bg-neutral-200 transition-colors flex-shrink-0"
            >
              추가
            </button>
          </div>
        </div>

        {/* 품목 목록 */}
        {orderItems.length > 0 && (
          <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-neutral-500">품목</th>
                  <th className="px-4 py-2.5 text-right font-medium text-neutral-500">단가</th>
                  <th className="px-4 py-2.5 text-right font-medium text-neutral-500">수량</th>
                  <th className="px-4 py-2.5 text-right font-medium text-neutral-500">소계</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((oi) => (
                  <tr key={oi.itemId} className="border-b border-neutral-50 last:border-0">
                    <td className="px-4 py-3 text-neutral-800">{oi.itemName}</td>
                    <td className="px-4 py-3 text-right text-neutral-600">{oi.unitPrice.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-neutral-800">{oi.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-800">
                      {(oi.unitPrice * oi.quantity).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => removeItem(oi.itemId)} className="text-error-500 hover:text-error-700 text-[12px]">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 border-t border-neutral-100">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-[13px] font-medium text-neutral-600">합계</td>
                  <td className="px-4 py-3 text-right text-[15px] font-bold text-primary-600">
                    {totalAmount.toLocaleString()}원
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 특이사항 */}
        <div>
          <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">특이사항 메모</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} h-20 resize-none`}
            placeholder="특이사항이 있으면 입력하세요 (선택)"
          />
        </div>

        {/* 긴급 플래그 */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={urgentFlag}
            onChange={(e) => setUrgentFlag(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500/30"
          />
          <span className="text-[13px] text-neutral-700">긴급 주문</span>
        </label>

        {/* 제출 */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 text-white px-6 py-3 rounded-[10px] text-[14px] font-semibold hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "처리중..." : "주문 접수"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="text-neutral-600 px-6 py-3 rounded-[10px] text-[14px] font-medium hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
