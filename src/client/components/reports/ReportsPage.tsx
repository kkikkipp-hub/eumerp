import { useState } from "react";
import { api } from "../../lib/api";
import ErrorBanner from "../common/ErrorBanner";

type ReportType = "orders" | "inventory" | "finance";

function formatWon(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("orders");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [to, setTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchReport() {
    setLoading(true);
    setError("");
    setData(null);
    try {
      let result;
      if (reportType === "orders") {
        result = await api.fetch(`/reports/orders?from=${from}-01&to=${to}-31`);
      } else if (reportType === "inventory") {
        result = await api.fetch("/reports/inventory");
      } else {
        result = await api.fetch(`/reports/finance?from=${from}&to=${to}`);
      }
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">보고서</h2>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-[10px]">
          {(["orders", "inventory", "finance"] as ReportType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setReportType(t); setData(null); }}
              className={`px-3.5 py-2 rounded-[8px] text-[13px] font-medium transition-all ${
                reportType === t ? "bg-white text-neutral-900 shadow-card" : "text-neutral-500"
              }`}
            >
              {{ orders: "주문", inventory: "재고", finance: "매출/매입" }[t]}
            </button>
          ))}
        </div>

        {reportType !== "inventory" && (
          <>
            <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            <span className="self-center text-neutral-400 text-[13px]">~</span>
            <input type="month" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </>
        )}

        <button onClick={fetchReport} disabled={loading} className="bg-primary-500 text-white px-4 py-2.5 rounded-[10px] text-[13px] font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {loading ? "조회중..." : "조회"}
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchReport} />}

      {/* 결과 */}
      {data && reportType === "orders" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold text-neutral-800">주문 현황 보고서</h3>
            <button onClick={() => downloadCSV(data.report, `주문보고서_${from}_${to}.csv`)} className="text-[12px] text-primary-500 hover:text-primary-700 font-medium">
              CSV 다운로드
            </button>
          </div>
          <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">상태</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">건수</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">금액</th>
                </tr>
              </thead>
              <tbody>
                {data.report.map((row: any) => (
                  <tr key={row.status} className="border-b border-neutral-50 last:border-0">
                    <td className="px-4 py-3 text-neutral-800">{row.status}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{row.count}건</td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-800">{formatWon(row.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && reportType === "inventory" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold text-neutral-800">재고 현황 보고서</h3>
            <button onClick={() => downloadCSV(data.report, `재고보고서_${new Date().toISOString().slice(0, 10)}.csv`)} className="text-[12px] text-primary-500 hover:text-primary-700 font-medium">
              CSV 다운로드
            </button>
          </div>
          <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">품목</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">현재</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">안전재고</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">창고</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">상태</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">입고 횟수</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">출고 횟수</th>
                </tr>
              </thead>
              <tbody>
                {data.report.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-neutral-50 last:border-0">
                    <td className="px-4 py-3 text-neutral-800">{row.name}</td>
                    <td className="px-4 py-3 text-right">{row.current_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">{row.safety_stock.toLocaleString()}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.warehouse_location}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium ${
                        row.stock_status === "normal" ? "bg-success-50 text-success-700" :
                        row.stock_status === "low" ? "bg-warning-50 text-warning-500" :
                        "bg-error-50 text-error-600"
                      }`}>
                        {{ normal: "정상", low: "부족", out: "품절" }[row.stock_status as string]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">{row.total_in_count}</td>
                    <td className="px-4 py-3 text-right text-neutral-600">{row.total_out_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && reportType === "finance" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold text-neutral-800">매출/매입 보고서</h3>
            <button onClick={() => downloadCSV(data.sales, `매출보고서_${from}_${to}.csv`)} className="text-[12px] text-primary-500 hover:text-primary-700 font-medium">
              CSV 다운로드
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
              <div className="px-4 py-3 bg-success-50 border-b border-success-100">
                <h4 className="text-[13px] font-semibold text-success-700">매출</h4>
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {data.sales.length === 0 ? (
                    <tr><td className="px-4 py-6 text-center text-neutral-400">데이터 없음</td></tr>
                  ) : data.sales.map((row: any) => (
                    <tr key={row.month} className="border-b border-neutral-50 last:border-0">
                      <td className="px-4 py-3 text-neutral-700">{row.month}</td>
                      <td className="px-4 py-3 text-right font-medium text-success-600">{formatWon(row.sales_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
              <div className="px-4 py-3 bg-error-50 border-b border-error-100">
                <h4 className="text-[13px] font-semibold text-error-600">매입</h4>
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {data.purchases.length === 0 ? (
                    <tr><td className="px-4 py-6 text-center text-neutral-400">데이터 없음</td></tr>
                  ) : data.purchases.map((row: any) => (
                    <tr key={row.month} className="border-b border-neutral-50 last:border-0">
                      <td className="px-4 py-3 text-neutral-700">{row.month}</td>
                      <td className="px-4 py-3 text-right font-medium text-error-500">{formatWon(row.purchase_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="bg-white rounded-[12px] shadow-card p-16 text-center">
          <svg className="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
          </svg>
          <p className="text-[14px] text-neutral-500">보고서 유형과 기간을 선택하고 조회하세요</p>
        </div>
      )}
    </div>
  );
}
