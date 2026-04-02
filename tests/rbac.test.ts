import { describe, it, expect } from "vitest";

// RBAC 라우트-권한 매트릭스 (서버 로직과 동일)
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "POST /api/orders": ["관리자", "영업팀"],
  "PUT /api/orders": ["관리자", "영업팀"],
  "DELETE /api/orders": ["관리자", "영업팀"],
  "GET /api/orders": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "POST /api/inventory": ["관리자", "물류팀"],
  "GET /api/inventory": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
  "GET /api/financials": ["관리자", "회계팀", "뷰어"],
  "POST /api/users": ["관리자"],
  "PUT /api/users": ["관리자"],
  "PUT /api/user-roles": ["관리자"],
  "GET /api/reports": ["관리자", "영업팀", "물류팀", "회계팀", "뷰어"],
};

function checkPermission(method: string, path: string, roles: string[]): boolean {
  const routeKey = Object.keys(ROUTE_PERMISSIONS).find((key) => {
    const [m, p] = key.split(" ");
    return m === method && path.startsWith(p);
  });
  if (!routeKey) return false; // default deny
  const allowedRoles = ROUTE_PERMISSIONS[routeKey];
  return roles.some((role) => allowedRoles.includes(role));
}

describe("RBAC 권한 검증", () => {
  describe("관리자 (전체 접근)", () => {
    const roles = ["관리자"];
    it("주문 생성 가능", () => expect(checkPermission("POST", "/api/orders", roles)).toBe(true));
    it("재고 입출고 가능", () => expect(checkPermission("POST", "/api/inventory/transaction", roles)).toBe(true));
    it("사용자 생성 가능", () => expect(checkPermission("POST", "/api/users", roles)).toBe(true));
    it("정산 조회 가능", () => expect(checkPermission("GET", "/api/financials/monthly-summary", roles)).toBe(true));
  });

  describe("영업팀", () => {
    const roles = ["영업팀"];
    it("주문 생성 가능", () => expect(checkPermission("POST", "/api/orders", roles)).toBe(true));
    it("주문 수정 가능", () => expect(checkPermission("PUT", "/api/orders/123", roles)).toBe(true));
    it("주문 삭제 가능", () => expect(checkPermission("DELETE", "/api/orders/123", roles)).toBe(true));
    it("재고 조회 가능", () => expect(checkPermission("GET", "/api/inventory", roles)).toBe(true));
    it("재고 입출고 불가", () => expect(checkPermission("POST", "/api/inventory/transaction", roles)).toBe(false));
    it("사용자 관리 불가", () => expect(checkPermission("POST", "/api/users", roles)).toBe(false));
    it("정산 조회 불가", () => expect(checkPermission("GET", "/api/financials/monthly-summary", roles)).toBe(false));
  });

  describe("물류팀", () => {
    const roles = ["물류팀"];
    it("주문 조회 가능", () => expect(checkPermission("GET", "/api/orders", roles)).toBe(true));
    it("주문 생성 불가", () => expect(checkPermission("POST", "/api/orders", roles)).toBe(false));
    it("재고 입출고 가능", () => expect(checkPermission("POST", "/api/inventory/transaction", roles)).toBe(true));
    it("사용자 관리 불가", () => expect(checkPermission("POST", "/api/users", roles)).toBe(false));
  });

  describe("회계팀", () => {
    const roles = ["회계팀"];
    it("정산 조회 가능", () => expect(checkPermission("GET", "/api/financials/monthly-summary", roles)).toBe(true));
    it("주문 조회 가능", () => expect(checkPermission("GET", "/api/orders", roles)).toBe(true));
    it("주문 생성 불가", () => expect(checkPermission("POST", "/api/orders", roles)).toBe(false));
    it("재고 입출고 불가", () => expect(checkPermission("POST", "/api/inventory/transaction", roles)).toBe(false));
  });

  describe("뷰어", () => {
    const roles = ["뷰어"];
    it("주문 조회 가능", () => expect(checkPermission("GET", "/api/orders", roles)).toBe(true));
    it("재고 조회 가능", () => expect(checkPermission("GET", "/api/inventory", roles)).toBe(true));
    it("정산 조회 가능", () => expect(checkPermission("GET", "/api/financials/monthly-summary", roles)).toBe(true));
    it("보고서 조회 가능", () => expect(checkPermission("GET", "/api/reports/orders", roles)).toBe(true));
    it("모든 쓰기 불가", () => {
      expect(checkPermission("POST", "/api/orders", roles)).toBe(false);
      expect(checkPermission("PUT", "/api/orders/123", roles)).toBe(false);
      expect(checkPermission("DELETE", "/api/orders/123", roles)).toBe(false);
      expect(checkPermission("POST", "/api/inventory/transaction", roles)).toBe(false);
      expect(checkPermission("POST", "/api/users", roles)).toBe(false);
    });
  });

  describe("Default deny", () => {
    it("존재하지 않는 경로 → 거부", () => {
      expect(checkPermission("GET", "/api/unknown", ["관리자"])).toBe(false);
    });
    it("역할 없는 사용자 → 거부", () => {
      expect(checkPermission("GET", "/api/orders", [])).toBe(false);
    });
  });
});
