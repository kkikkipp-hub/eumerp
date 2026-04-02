# 이음 ERP 작업일지

**프로젝트:** 이음 ERP (eumerp) - ABC전자 통합 ERP 시스템
**작업일:** 2026-04-02
**저장소:** https://github.com/kkikkipp-hub/eumerp
**배포:** https://eumerp.pages.dev (프론트엔드) / https://eumerp-api.kkikkipp.workers.dev (API)

---

## 1. 프로젝트 개요

ABC전자의 엑셀 기반 수작업 시스템을 대체하는 웹 ERP.
주문 접수부터 출고, 정산까지 하나의 시스템에서 관리.

**기술 스택:** Vite + React + TypeScript + Tailwind CSS + Cloudflare Workers (Hono) + D1 (SQLite)

---

## 2. 작업 내역

### Phase 1: 설계 문서 분석 및 계획 수립

- 기존 설계 문서 4개 (명세서, DB설계서, API명세서, 화면설계서) 분석
- 중복 파일 식별 및 정리 (상세설계 4개 = 명세서 내 상세설계와 100% 동일)
- /autoplan 실행: CEO/Design/Eng 3단계 리뷰 + Claude/Codex 듀얼 보이스 6회 독립 검토
- 24개 개선사항 도출 (금액 INTEGER, order_items 다품목, PBKDF2, soft delete 등)

### Phase 2: 백엔드 구현

| 항목 | 내용 |
|------|------|
| DB 스키마 | 15개 테이블 (D1/SQLite), 인덱스 포함 |
| API 라우트 | 8개 모듈 (auth, orders, inventory, finance, users, reports, customers, items) |
| 인증 | JWT (PBKDF2 해싱) + refresh token + blacklist |
| RBAC | 라우트-권한 매트릭스, 5개 역할 (관리자/영업팀/물류팀/회계팀/뷰어) |
| 감사 로그 | 모든 CUD 작업 기록 |
| 트랜잭션 | D1 batch API (주문+재고 원자적 처리) |

### Phase 3: 프론트엔드 구현

| 페이지 | URL | 기능 |
|--------|-----|------|
| 로그인 | / | 초기 설정 + 일반 로그인 |
| 주문 대시보드 | /orders | 목록, 검색, 필터, 상태 뱃지 |
| 신규 주문 | /orders/new | 고객사+품목 선택, 금액 합계 |
| 주문 상세 | /orders/:id | 정보, 품목, 상태 변경, 수정, 취소, 이력 |
| 엑셀 업로드 | /orders/upload | 파일 파싱, 검증, 템플릿 다운로드 |
| 재고 대시보드 | /inventory | 품목별 수량, 상태, 입출고 버튼 |
| 품목 관리 | /inventory/items | 등록, 수정, 삭제 |
| 입출고 이력 | /inventory/history | 품목별 IN/OUT 이력 조회 |
| 정산/회계 | /finance | 월별 매출/매입/이익 카드 |
| 미수금 관리 | /finance/receivables | 거래처별 미수금 |
| 보고서 | /reports | 주문/재고/매출매입 3종, CSV 다운로드 |
| 사용자 관리 | /admin/users | 생성, 역할 변경 |
| 감사 로그 | /admin/audit-log | 테이블 필터, 변경 내용 표시 |
| 비밀번호 변경 | /admin/password | 현재/새 비밀번호 |

### Phase 4: 디자인 개선

- 토스 UI 스타일 적용 (Pretendard 폰트, 토스 컬러 팔레트)
- 이모지 6개 → SVG 아이콘 컴포넌트 10개
- 파비콘: 이음 연결 심볼 (토스 블루 원형)
- 디자인 토큰: 커스텀 색상, 그림자, 둥근 모서리 체계
- impeccable 디자인 원칙 참고

### Phase 5: QA 및 버그 수정

| 이슈 | 심각도 | 내용 | 수정 |
|------|--------|------|------|
| ISSUE-001 | Critical | setup 실패시 로그인 시도 안 됨 | catch 분리, 자동 전환 |
| ISSUE-002 | Medium | "출고으로 변경" 조사 오류 | "출고로 변경" |
| ISSUE-006 | Critical | JWT 한글 역할명 디코딩 깨짐 (atob) | TextDecoder UTF-8 적용 |
| ISSUE-007 | High | GET /api/users RBAC 매트릭스 누락 | 라우트 추가 |
| SPA 라우팅 | High | 새로고침시 404 | _redirects 위치 수정, _routes.json 충돌 해결 |

### Phase 6: 전체 흐름 브라우저 검증

| 단계 | 결과 |
|------|------|
| 로그인 (admin/admin1234) | OK |
| 신규 주문 (삼성전기, 반도체칩 A100 × 50) | OK |
| 상태 변경 (접수→확인→출고→배송→완료) | OK |
| 재고 자동 차감 (500→450) | OK |
| 정산 반영 (매출 750,000원) | OK |
| 상태 변경 이력 5단계 기록 | OK |

---

## 3. 산출물

| 항목 | 수량 |
|------|------|
| 커밋 | 18개 |
| 소스 파일 | 39개 |
| 소스 코드 | 4,427줄 |
| 테스트 코드 | 265줄 (61개 테스트) |
| DB 테이블 | 15개 |
| API 엔드포인트 | 25+개 |
| 프론트엔드 페이지 | 14개 |

---

## 4. 남은 과제 (TODOS.md 참고)

- [ ] 홈택스 API 연동 (세금계산서 자동 발행)
- [ ] 바코드 스캐너 하드웨어 연동
- [ ] 상태 머신 확장 (반품, 부분출고, 부분취소)
- [ ] 실시간 알림 시스템 (이메일/카톡)
- [ ] 주문 접수시 재고 사전 확인
- [ ] 입고 단가 vs 판매 단가 분리 (마진 계산)
- [ ] API 에러 메시지 한국어화
- [ ] 데이터 마이그레이션 계획 (기존 엑셀 → D1)

---

## 5. 교훈

1. **브라우저 검증 필수.** 코드만 보고 "구현 완료"라고 하면 안 됨. 실제로 클릭해봐야 함.
2. **품목 CRUD 같은 기본 기능은 설계 문서에 있었는데 빠뜨림.** PRD 체크리스트를 먼저 만들고 하나씩 체크해야 함.
3. **SPA 라우팅은 배포 환경에서 반드시 테스트.** 로컬 dev 서버와 Cloudflare Pages의 동작이 다름.
4. **JWT에 한글 넣으면 atob() 깨짐.** TextDecoder 사용 필수.

---

*작성: Claude Opus 4.6 + 컴앤정보통신*
*최종 커밋: e8a1925*
