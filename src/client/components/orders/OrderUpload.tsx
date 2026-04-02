import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Toast from "../common/Toast";
import * as XLSX from "xlsx";

interface ParsedRow {
  customerId: number;
  itemId: number;
  quantity: number;
  notes?: string;
  urgentFlag?: boolean;
}

export default function OrderUpload() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [parseError, setParseError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setParseError("파일 크기는 5MB 이하여야 합니다");
      return;
    }

    setFileName(file.name);
    setParseError("");
    setErrors([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length > 500) {
          setParseError("최대 500행까지 업로드 가능합니다");
          return;
        }

        const parsed: ParsedRow[] = [];
        const errs: { row: number; error: string }[] = [];

        data.forEach((row: any, i: number) => {
          const customerId = parseInt(row["고객사ID"] || row["customerId"] || row["customer_id"]);
          const itemId = parseInt(row["품목ID"] || row["itemId"] || row["item_id"]);
          const quantity = parseInt(row["수량"] || row["quantity"]);

          if (!customerId || !itemId || !quantity || quantity <= 0) {
            errs.push({ row: i + 2, error: "고객사ID, 품목ID, 수량(양수) 필수" });
          } else {
            parsed.push({
              customerId,
              itemId,
              quantity,
              notes: row["메모"] || row["notes"] || undefined,
              urgentFlag: row["긴급"] === "Y" || row["urgent"] === true,
            });
          }
        });

        setRows(parsed);
        setErrors(errs);
      } catch {
        setParseError("엑셀 파일을 읽을 수 없습니다");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleUpload() {
    if (rows.length === 0) return;
    setUploading(true);
    try {
      const res = await api.fetch("/orders/upload", {
        method: "POST",
        body: { orders: rows },
      });
      setResult(res);
      setToast(`${res.successCount}건 업로드 완료`);
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-neutral-900">대량 주문 업로드</h2>
        <button onClick={() => navigate("/orders")} className="text-[13px] text-neutral-500 hover:text-neutral-700 transition-colors">
          돌아가기
        </button>
      </div>

      {/* 안내 */}
      <div className="bg-primary-50 rounded-[12px] p-4 mb-5 text-[13px] text-primary-700">
        엑셀 파일의 컬럼: <strong>고객사ID</strong>, <strong>품목ID</strong>, <strong>수량</strong>, 메모(선택), 긴급(Y/N, 선택). 최대 500행.
      </div>

      {parseError && (
        <div className="bg-error-50 border border-error-100 text-error-600 text-[13px] rounded-[10px] p-3 mb-4">{parseError}</div>
      )}

      {/* 파일 선택 */}
      <div className="bg-white rounded-[12px] shadow-card p-6 mb-5">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-[12px] p-8 cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
          <svg className="w-10 h-10 text-neutral-300 mb-3" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-[14px] text-neutral-600 mb-1">
            {fileName || "엑셀 파일을 선택하세요"}
          </span>
          <span className="text-[12px] text-neutral-400">.xlsx, .xls (최대 5MB)</span>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* 파싱 결과 */}
      {(rows.length > 0 || errors.length > 0) && !result && (
        <div className="bg-white rounded-[12px] shadow-card p-6 mb-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-[13px]">
              <span className="text-success-600 font-medium">{rows.length}건</span> 유효
            </div>
            {errors.length > 0 && (
              <div className="text-[13px]">
                <span className="text-error-500 font-medium">{errors.length}건</span> 오류
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="mb-4">
              <table className="w-full text-[12px]">
                <thead className="bg-error-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-error-600">행</th>
                    <th className="px-3 py-2 text-left text-error-600">오류</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(0, 10).map((err) => (
                    <tr key={err.row} className="border-b border-error-50">
                      <td className="px-3 py-2 text-neutral-700">{err.row}</td>
                      <td className="px-3 py-2 text-error-600">{err.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errors.length > 10 && <p className="text-[12px] text-neutral-500 mt-2">... 외 {errors.length - 10}건</p>}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || rows.length === 0}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-[10px] text-[13px] font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {uploading ? "업로드 중..." : `${rows.length}건 업로드`}
          </button>
        </div>
      )}

      {/* 업로드 결과 */}
      {result && (
        <div className="bg-white rounded-[12px] shadow-card p-6">
          <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">업로드 결과</h3>
          <div className="flex gap-6 mb-4">
            <div className="text-[13px]"><span className="text-success-600 font-bold text-[20px]">{result.successCount}</span> 건 성공</div>
            <div className="text-[13px]"><span className="text-error-500 font-bold text-[20px]">{result.errorCount || 0}</span> 건 실패</div>
          </div>
          <button onClick={() => navigate("/orders")} className="bg-primary-500 text-white px-5 py-2.5 rounded-[10px] text-[13px] font-semibold hover:bg-primary-600 transition-colors">
            주문 목록으로
          </button>
        </div>
      )}
    </div>
  );
}
