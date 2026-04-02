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

  const cards = data
    ? [
        { label: "매출", value: data.salesAmount, color: "text-success-600" },
        { label: "매입", value: data.purchaseAmount, color: "text-error-500" },
        { label: "이익", value: data.profit, color: data.profit >= 0 ? "text-primary-500" : "text-error-500" },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">정산/회계</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchSummary} />}

      <div className="grid grid-cols-3 gap-4">
        {loading
          ? [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-[12px] shadow-card p-6 animate-pulse">
                <div className="h-3.5 bg-neutral-100 rounded-[6px] w-1/3 mb-4" />
                <div className="h-7 bg-neutral-100 rounded-[6px] w-2/3" />
              </div>
            ))
          : cards.map((card) => (
              <div key={card.label} className="bg-white rounded-[12px] shadow-card p-6 hover:shadow-elevated transition-shadow">
                <p className="text-[13px] text-neutral-500 mb-2">{card.label}</p>
                <p className={`text-[24px] font-bold ${card.color}`}>{formatWon(card.value)}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
