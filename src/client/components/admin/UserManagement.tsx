import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";
import Modal from "../common/Modal";
import Toast from "../common/Toast";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", email: "", roleId: 0 });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, rolesData] = await Promise.all([
        api.fetch("/users"),
        api.fetch("/users/roles"),
      ]);
      setUsers(usersData.users);
      setRoles(rolesData.roles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    setCreateLoading(true);
    try {
      await api.fetch("/users", { method: "POST", body: newUser });
      setToast("사용자 생성 완료");
      setShowCreate(false);
      setNewUser({ username: "", password: "", email: "", roleId: 0 });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  const columns = [
    { key: "user_id", label: "ID" },
    { key: "username", label: "사용자명" },
    { key: "email", label: "이메일", render: (row: any) => <span className="text-neutral-500">{row.email}</span> },
    {
      key: "roles",
      label: "역할",
      render: (row: any) => (
        <div className="flex gap-1.5">
          {row.roles.map((r: string) => (
            <span key={r} className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-[6px] text-[12px] font-medium">{r}</span>
          ))}
        </div>
      ),
    },
    {
      key: "created_at",
      label: "생성일",
      render: (row: any) => <span className="text-neutral-500">{new Date(row.created_at).toLocaleDateString("ko-KR")}</span>,
    },
  ];

  const inputClass = "w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors";

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">사용자 관리</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary-500 text-white px-4 py-2.5 rounded-[10px] text-[13px] font-semibold hover:bg-primary-600 active:bg-primary-700 transition-colors"
        >
          + 사용자 추가
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      <DataTable columns={columns} data={users} loading={loading} emptyMessage="사용자가 없습니다" />

      {showCreate && (
        <Modal title="사용자 추가" onClose={() => setShowCreate(false)} onConfirm={handleCreate} confirmText="생성" loading={createLoading}>
          <div className="space-y-3">
            <input type="text" placeholder="사용자명" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className={inputClass} />
            <input type="email" placeholder="이메일" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputClass} />
            <input type="password" placeholder="비밀번호" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputClass} />
            <select value={newUser.roleId} onChange={(e) => setNewUser({ ...newUser, roleId: parseInt(e.target.value) })} className={inputClass}>
              <option value={0}>역할 선택</option>
              {roles.map((r: any) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
