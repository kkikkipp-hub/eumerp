import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "생성", UPDATE: "수정", DELETE: "삭제", LOGIN: "로그인",
  STATUS_CHANGE: "상태변경", BULK_UPLOAD: "대량업로드", STOCK_IN: "입고",
  STOCK_OUT: "출고", ROLE_CHANGE: "역할변경", PASSWORD_CHANGE: "비밀번호변경",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (tableFilter) params.set("table", tableFilter);
      const data = await api.fetch(`/users/audit-log?${params}`);
      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns = [
    { key: "log_id", label: "ID" },
    {
      key: "created_at",
      label: "일시",
      render: (row: any) => <span className="text-neutral-600">{new Date(row.created_at).toLocaleString("ko-KR")}</span>,
    },
    { key: "username", label: "사용자", render: (row: any) => row.username || "-" },
    {
      key: "action",
      label: "작업",
      render: (row: any) => (
        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-[6px] text-[12px] font-medium">
          {ACTION_LABELS[row.action] || row.action}
        </span>
      ),
    },
    { key: "table_name", label: "대상" },
    { key: "record_id", label: "레코드 ID", render: (row: any) => row.record_id ?? "-" },
    {
      key: "changes",
      label: "변경 내용",
      render: (row: any) => {
        if (!row.changes) return "-";
        try {
          const parsed = JSON.parse(row.changes);
          return <span className="text-[11px] text-neutral-500 font-mono">{JSON.stringify(parsed).slice(0, 60)}</span>;
        } catch {
          return <span className="text-[11px] text-neutral-500">{String(row.changes).slice(0, 60)}</span>;
        }
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">감사 로그</h2>
      </div>

      <div className="mb-4">
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
        >
          <option value="">전체 대상</option>
          <option value="orders">주문</option>
          <option value="inventory">재고</option>
          <option value="users">사용자</option>
          <option value="user_roles">역할</option>
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchLogs} />}
      <DataTable columns={columns} data={logs} loading={loading} emptyMessage="감사 로그가 없습니다" />
    </div>
  );
}
