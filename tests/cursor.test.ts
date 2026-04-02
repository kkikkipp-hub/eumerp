import { describe, it, expect } from "vitest";

// Cursor 인코딩/디코딩 유틸리티
function encodeCursor(date: string, id: number): string {
  return `${date}_${id}`;
}

function decodeCursor(cursor: string): { date: string; id: number } | null {
  const parts = cursor.split("_");
  if (parts.length !== 2) return null;
  const [date, idStr] = parts;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return null;
  return { date, id };
}

// SQL WHERE 절 생성 (멀티컬럼 커서)
function buildCursorWhere(cursor: string): { sql: string; params: (string | number)[] } | null {
  const decoded = decodeCursor(cursor);
  if (!decoded) return null;
  return {
    sql: "(order_date < ? OR (order_date = ? AND order_id < ?))",
    params: [decoded.date, decoded.date, decoded.id],
  };
}

describe("Cursor 페이지네이션", () => {
  describe("인코딩", () => {
    it("날짜 + ID → 커서 문자열", () => {
      expect(encodeCursor("2026-04-01T10:00:00", 42)).toBe("2026-04-01T10:00:00_42");
    });
  });

  describe("디코딩", () => {
    it("유효한 커서 디코딩", () => {
      const result = decodeCursor("2026-04-01T10:00:00_42");
      expect(result).toEqual({ date: "2026-04-01T10:00:00", id: 42 });
    });

    it("잘못된 형식 → null", () => {
      expect(decodeCursor("invalid")).toBeNull();
      expect(decodeCursor("")).toBeNull();
      expect(decodeCursor("date_notanumber")).toBeNull();
    });
  });

  describe("WHERE 절 생성", () => {
    it("유효한 커서 → SQL 조건", () => {
      const result = buildCursorWhere("2026-04-01_100");
      expect(result).not.toBeNull();
      expect(result!.sql).toBe("(order_date < ? OR (order_date = ? AND order_id < ?))");
      expect(result!.params).toEqual(["2026-04-01", "2026-04-01", 100]);
    });

    it("잘못된 커서 → null", () => {
      expect(buildCursorWhere("bad")).toBeNull();
    });
  });

  describe("순서 보장", () => {
    it("같은 날짜, 다른 ID → ID 내림차순", () => {
      const items = [
        { date: "2026-04-01", id: 3 },
        { date: "2026-04-01", id: 1 },
        { date: "2026-04-01", id: 2 },
      ];
      const sorted = [...items].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.id - a.id;
      });
      expect(sorted.map((i) => i.id)).toEqual([3, 2, 1]);
    });

    it("다른 날짜 → 날짜 내림차순 우선", () => {
      const items = [
        { date: "2026-04-01", id: 1 },
        { date: "2026-04-03", id: 2 },
        { date: "2026-04-02", id: 3 },
      ];
      const sorted = [...items].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.id - a.id;
      });
      expect(sorted.map((i) => i.id)).toEqual([2, 3, 1]);
    });
  });
});
