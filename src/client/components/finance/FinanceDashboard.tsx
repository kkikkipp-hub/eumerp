import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import ErrorBanner from "../common/ErrorBanner";

function formatWon(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

export default function FinanceDashboard() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchSummary() {
    setLoading(true);
    setError("");
    try {
      const result = await api.fetch(`/financials/monthly-summary?month=${month}`);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, [month]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">정산/회계</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchSummary} />}

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">매출</p>
            <p className="text-2xl font-bold text-green-600">{formatWon(data.salesAmount)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">매입</p>
            <p className="text-2xl font-bold text-red-600">{formatWon(data.purchaseAmount)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">이익</p>
            <p className={`text-2xl font-bold ${data.profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatWon(data.profit)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
