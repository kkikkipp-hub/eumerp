import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import DataTable from "../common/DataTable";
import ErrorBanner from "../common/ErrorBanner";

function formatWon(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

export default function Receivables() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const result = await api.fetch("/customers/receivables");
      setData(result.receivables);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { key: "customer_id", label: "ID" },
    { key: "name", label: "거래처명" },
    {
      key: "outstanding",
      label: "미수금",
      render: (row: any) => (
        <span className={`font-medium ${row.outstanding > 0 ? "text-warning-500" : "text-neutral-600"}`}>
          {formatWon(row.outstanding)}
        </span>
      ),
    },
    { key: "total_billed", label: "완료 금액", render: (row: any) => <span className="text-success-600">{formatWon(row.total_billed)}</span> },
    { key: "open_orders", label: "진행중 주문", render: (row: any) => row.open_orders > 0 ? `${row.open_orders}건` : "-" },
  ];

  const totalOutstanding = data.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">거래처별 미수금</h2>
        {data.length > 0 && (
          <div className="text-[14px]">
            총 미수금: <span className="font-bold text-warning-500">{formatWon(totalOutstanding)}</span>
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}
      <DataTable columns={columns} data={data} loading={loading} emptyMessage="거래처 데이터가 없습니다" />
    </div>
  );
}
