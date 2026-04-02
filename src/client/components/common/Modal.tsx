import { ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  loading?: boolean;
}

export default function Modal({ title, children, onClose, onConfirm, confirmText = "확인", loading }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-modal w-full max-w-md mx-4 p-7">
        <h3 className="text-[17px] font-semibold text-neutral-900 mb-5">{title}</h3>
        <div className="mb-6">{children}</div>
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] text-neutral-600 hover:bg-neutral-50 rounded-[10px] font-medium transition-colors">
            취소
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2.5 text-[13px] bg-primary-500 text-white rounded-[10px] font-semibold hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "처리중..." : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
