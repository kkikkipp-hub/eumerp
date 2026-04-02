import { useState } from "react";
import { api } from "../../lib/api";
import Toast from "../common/Toast";

export default function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) { setError("새 비밀번호는 6자 이상이어야 합니다"); return; }
    if (newPassword !== confirmPassword) { setError("새 비밀번호가 일치하지 않습니다"); return; }

    setLoading(true);
    try {
      await api.fetch("/users/password", {
        method: "PUT",
        body: { currentPassword, newPassword },
      });
      setToast("비밀번호가 변경되었습니다");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors";

  return (
    <div className="max-w-md">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h2 className="text-[20px] font-bold text-neutral-900 mb-6">비밀번호 변경</h2>

      {error && (
        <div className="bg-error-50 border border-error-100 text-error-600 text-[13px] rounded-[10px] p-3 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">현재 비밀번호</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">새 비밀번호</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="6자 이상" required />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">새 비밀번호 확인</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required />
        </div>
        <button type="submit" disabled={loading} className="bg-primary-500 text-white px-5 py-3 rounded-[10px] text-[14px] font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {loading ? "변경중..." : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}
