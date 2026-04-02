import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Modal from "../common/Modal";
import Toast from "../common/Toast";
import ErrorBanner from "../common/ErrorBanner";

const STATUS_STYLES: Record<string, string> = {
  접수: "bg-primary-50 text-primary-600",
  확인: "bg-warning-50 text-warning-500",
  출고: "bg-purple-50 text-purple-700",
  배송: "bg-orange-50 text-orange-700",
  완료: "bg-success-50 text-success-700",
  취소: "bg-error-50 text-error-600",
};

const NEXT_STATUS: Record<string, string> = {
  접수: "확인",
  확인: "출고",
  출고: "배송",
  배송: "완료",
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [statusLog, setStatusLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editUrgent, setEditUrgent] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchOrder() {
    setLoading(true);
    setError("");
    try {
      const [orderData, statusData] = await Promise.all([
        api.fetch(`/orders/${orderId}`),
        api.fetch(`/orders/${orderId}/status`),
      ]);
      setOrder(orderData);
      setStatusLog(statusData.history || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrder(); }, [orderId]);

  async function handleStatusChange() {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    setActionLoading(true);
    try {
      await api.fetch(`/orders/${orderId}/status`, {
        method: "PUT",
        body: { newStatus: nextStatus },
      });
      setToast(`상태 변경: ${order.status} → ${nextStatus}`);
      setShowStatusModal(false);
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEdit() {
    setActionLoading(true);
    try {
      await api.fetch(`/orders/${orderId}`, {
        method: "PUT",
        body: { notes: editNotes, urgentFlag: editUrgent },
      });
      setToast("주문 정보가 수정되었습니다");
      setShowEditModal(false);
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      await api.fetch(`/orders/${orderId}`, { method: "DELETE" });
      setToast("주문이 취소되었습니다");
      setShowCancelModal(false);
      setTimeout(() => navigate("/orders"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-neutral-100 rounded-[8px] w-48" />
        <div className="bg-white rounded-[12px] shadow-card p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-neutral-100 rounded-[6px] w-2/3" />)}
        </div>
      </div>
    );
  }

  if (error && !order) {
    return <ErrorBanner message={error} onRetry={fetchOrder} />;
  }

  if (!order) return null;

  const nextStatus = NEXT_STATUS[order.status];
  const canCancel = order.status === "접수";
  const canEdit = ["접수", "확인"].includes(order.status);

  return (
    <div className="max-w-3xl">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/orders")} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h2 className="text-[20px] font-bold text-neutral-900">주문 #{order.order_id}</h2>
          <span className={`px-2.5 py-1 rounded-[8px] text-[12px] font-medium ${STATUS_STYLES[order.status]}`}>
            {order.status}
          </span>
          {order.urgent_flag === 1 && (
            <span className="px-2 py-0.5 bg-error-50 text-error-500 rounded-[6px] text-[11px] font-bold">긴급</span>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => { setEditNotes(order.notes || ""); setEditUrgent(!!order.urgent_flag); setShowEditModal(true); }}
              className="text-neutral-600 px-4 py-2.5 rounded-[10px] text-[13px] font-medium hover:bg-neutral-50 border border-neutral-200 transition-colors"
            >
              수정
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="bg-primary-500 text-white px-4 py-2.5 rounded-[10px] text-[13px] font-semibold hover:bg-primary-600 transition-colors"
            >
              {nextStatus}으로 변경
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-error-500 px-4 py-2.5 rounded-[10px] text-[13px] font-medium hover:bg-error-50 transition-colors"
            >
              주문 취소
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* 주문 정보 */}
      <div className="bg-white rounded-[12px] shadow-card p-6 mb-4">
        <h3 className="text-[15px] font-semibold text-neutral-900 mb-4">주문 정보</h3>
        <div className="grid grid-cols-2 gap-y-3 text-[13px]">
          <div className="text-neutral-500">고객사</div>
          <div className="text-neutral-800 font-medium">{order.customer_name}</div>
          <div className="text-neutral-500">주문일</div>
          <div className="text-neutral-800">{new Date(order.order_date).toLocaleString("ko-KR")}</div>
          <div className="text-neutral-500">특이사항</div>
          <div className="text-neutral-800">{order.notes || "-"}</div>
          {order.modified_at && (
            <>
              <div className="text-neutral-500">수정일</div>
              <div className="text-neutral-800">{new Date(order.modified_at).toLocaleString("ko-KR")}</div>
            </>
          )}
          {order.canceled_at && (
            <>
              <div className="text-neutral-500">취소일</div>
              <div className="text-error-500">{new Date(order.canceled_at).toLocaleString("ko-KR")}</div>
            </>
          )}
        </div>
      </div>

      {/* 품목 */}
      {order.items?.length > 0 && (
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-neutral-50">
            <h3 className="text-[15px] font-semibold text-neutral-900">주문 품목</h3>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-2.5 text-left font-medium text-neutral-500">품목</th>
                <th className="px-6 py-2.5 text-right font-medium text-neutral-500">단가</th>
                <th className="px-6 py-2.5 text-right font-medium text-neutral-500">수량</th>
                <th className="px-6 py-2.5 text-right font-medium text-neutral-500">소계</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.order_item_id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-6 py-3 text-neutral-800">{item.item_name}</td>
                  <td className="px-6 py-3 text-right text-neutral-600">{item.unit_price.toLocaleString()}원</td>
                  <td className="px-6 py-3 text-right text-neutral-800">{item.quantity}</td>
                  <td className="px-6 py-3 text-right font-medium text-neutral-800">{(item.unit_price * item.quantity).toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 border-t border-neutral-100">
              <tr>
                <td colSpan={3} className="px-6 py-3 text-right text-[13px] font-medium text-neutral-600">합계</td>
                <td className="px-6 py-3 text-right text-[15px] font-bold text-primary-600">
                  {order.items.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0).toLocaleString()}원
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 상태 이력 */}
      {statusLog.length > 0 && (
        <div className="bg-white rounded-[12px] shadow-card p-6">
          <h3 className="text-[15px] font-semibold text-neutral-900 mb-4">상태 변경 이력</h3>
          <div className="space-y-3">
            {statusLog.map((log: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-[13px]">
                <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                <span className="text-neutral-500 w-36 flex-shrink-0">
                  {new Date(log.changed_at).toLocaleString("ko-KR")}
                </span>
                <span className="text-neutral-400">{log.previous_status || "—"}</span>
                <svg className="w-3 h-3 text-neutral-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                <span className={`px-2 py-0.5 rounded-[6px] text-[12px] font-medium ${STATUS_STYLES[log.new_status]}`}>
                  {log.new_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상태 변경 모달 */}
      {showStatusModal && nextStatus && (
        <Modal
          title="상태 변경"
          onClose={() => setShowStatusModal(false)}
          onConfirm={handleStatusChange}
          confirmText={`${nextStatus}으로 변경`}
          loading={actionLoading}
        >
          <p className="text-[14px] text-neutral-700">
            주문 #{order.order_id}의 상태를 <span className="font-medium">{order.status}</span>에서{" "}
            <span className="font-medium text-primary-600">{nextStatus}</span>(으)로 변경하시겠습니까?
          </p>
          {nextStatus === "출고" && (
            <p className="text-[12px] text-warning-500 mt-2">출고 처리시 재고가 자동으로 차감됩니다.</p>
          )}
        </Modal>
      )}

      {/* 취소 모달 */}
      {showCancelModal && (
        <Modal
          title="주문 취소"
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancel}
          confirmText="취소 확인"
          loading={actionLoading}
        >
          <p className="text-[14px] text-neutral-700">
            주문 #{order.order_id}을 정말 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
        </Modal>
      )}

      {/* 수정 모달 */}
      {showEditModal && (
        <Modal
          title="주문 수정"
          onClose={() => setShowEditModal(false)}
          onConfirm={handleEdit}
          confirmText="저장"
          loading={actionLoading}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">특이사항 메모</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={editUrgent} onChange={(e) => setEditUrgent(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-500" />
              <span className="text-[13px] text-neutral-700">긴급 주문</span>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
