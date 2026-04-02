import { describe, it, expect } from "vitest";

// 주문 상태 전이 규칙 (서버 로직과 동일)
const VALID_TRANSITIONS: Record<string, string[]> = {
  접수: ["확인", "취소"],
  확인: ["출고"],
  출고: ["배송"],
  배송: ["완료"],
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("주문 상태 머신", () => {
  describe("유효한 전이", () => {
    it("접수 → 확인", () => expect(canTransition("접수", "확인")).toBe(true));
    it("접수 → 취소", () => expect(canTransition("접수", "취소")).toBe(true));
    it("확인 → 출고", () => expect(canTransition("확인", "출고")).toBe(true));
    it("출고 → 배송", () => expect(canTransition("출고", "배송")).toBe(true));
    it("배송 → 완료", () => expect(canTransition("배송", "완료")).toBe(true));
  });

  describe("무효한 전이", () => {
    it("접수 → 출고 (건너뛰기 불가)", () => expect(canTransition("접수", "출고")).toBe(false));
    it("접수 → 배송 (건너뛰기 불가)", () => expect(canTransition("접수", "배송")).toBe(false));
    it("접수 → 완료 (건너뛰기 불가)", () => expect(canTransition("접수", "완료")).toBe(false));
    it("확인 → 접수 (역방향 불가)", () => expect(canTransition("확인", "접수")).toBe(false));
    it("출고 → 확인 (역방향 불가)", () => expect(canTransition("출고", "확인")).toBe(false));
    it("배송 → 접수 (역방향 불가)", () => expect(canTransition("배송", "접수")).toBe(false));
    it("완료 → 접수 (종료 상태)", () => expect(canTransition("완료", "접수")).toBe(false));
    it("완료 → 확인 (종료 상태)", () => expect(canTransition("완료", "확인")).toBe(false));
    it("취소 → 접수 (종료 상태)", () => expect(canTransition("취소", "접수")).toBe(false));
    it("확인 → 취소 (확인 후 취소 불가)", () => expect(canTransition("확인", "취소")).toBe(false));
  });

  describe("전체 정상 흐름", () => {
    it("접수 → 확인 → 출고 → 배송 → 완료", () => {
      const flow = ["접수", "확인", "출고", "배송", "완료"];
      for (let i = 0; i < flow.length - 1; i++) {
        expect(canTransition(flow[i], flow[i + 1])).toBe(true);
      }
    });
  });
});
