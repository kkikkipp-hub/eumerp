import { describe, it, expect } from "vitest";

// INTEGER → 원화 표시 (서버: INTEGER 저장, 클라이언트: 포맷팅)
function formatWon(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

// 원화 → INTEGER 변환 (입력 파싱)
function parseWon(input: string): number {
  return parseInt(input.replace(/[^0-9-]/g, ""), 10) || 0;
}

describe("금액 포맷팅 (INTEGER ↔ 원화)", () => {
  describe("INTEGER → 원화 표시", () => {
    it("0원", () => expect(formatWon(0)).toBe("0원"));
    it("1,000원", () => expect(formatWon(1000)).toBe("1,000원"));
    it("1,000,000원", () => expect(formatWon(1000000)).toBe("1,000,000원"));
    it("15,000원 (반도체칩 단가)", () => expect(formatWon(15000)).toBe("15,000원"));
    it("음수 금액", () => expect(formatWon(-500000)).toBe("-500,000원"));
  });

  describe("원화 문자열 → INTEGER 파싱", () => {
    it("1,000,000원 → 1000000", () => expect(parseWon("1,000,000원")).toBe(1000000));
    it("15,000 → 15000", () => expect(parseWon("15,000")).toBe(15000));
    it("빈 문자열 → 0", () => expect(parseWon("")).toBe(0));
    it("숫자만 → 그대로", () => expect(parseWon("500")).toBe(500));
  });

  describe("정밀도 검증 (부동소수점 없음)", () => {
    it("큰 금액 연산: 999,999,999 + 1 = 1,000,000,000", () => {
      expect(999999999 + 1).toBe(1000000000);
    });
    it("곱셈: 15000 * 500 = 7,500,000", () => {
      expect(15000 * 500).toBe(7500000);
    });
    it("합계: 여러 품목 합산", () => {
      const items = [
        { unitPrice: 15000, quantity: 100 },
        { unitPrice: 500, quantity: 2000 },
        { unitPrice: 100, quantity: 5000 },
      ];
      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      expect(total).toBe(3000000); // 1,500,000 + 1,000,000 + 500,000
    });
  });
});
