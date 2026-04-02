import { ReactNode } from "react";
import { InboxIcon } from "./Icons";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-neutral-100 rounded-[6px] w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = "데이터가 없습니다",
  emptyAction,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-neutral-500">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-[12px] shadow-card p-16 text-center">
        <InboxIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-[14px] text-neutral-500 mb-4">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="bg-neutral-50 border-b border-neutral-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-medium text-neutral-500 ${col.sortable ? "cursor-pointer hover:text-neutral-800 select-none" : ""}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    <span className="text-primary-500 text-[11px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-neutral-50 last:border-0 transition-colors ${onRowClick ? "cursor-pointer hover:bg-primary-50/40" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3.5 text-neutral-800">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
