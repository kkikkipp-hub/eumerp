-- 역할 마스터 데이터
INSERT OR IGNORE INTO roles (role_name, description) VALUES
('관리자', '시스템 전체 관리 권한'),
('영업팀', '주문 관리 권한'),
('물류팀', '재고 관리 권한'),
('회계팀', '정산/회계 관리 권한'),
('뷰어', '읽기 전용 권한');

-- 권한 마스터 데이터
INSERT OR IGNORE INTO permissions (permission_name, description) VALUES
('orders:create', '주문 생성'),
('orders:update', '주문 수정'),
('orders:delete', '주문 취소'),
('orders:read', '주문 조회'),
('inventory:create', '입출고 처리'),
('inventory:read', '재고 조회'),
('finance:read', '정산 조회'),
('users:create', '사용자 생성'),
('users:update', '사용자 수정'),
('reports:read', '보고서 조회');

-- 역할-권한 매핑 (관리자: 전체)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p WHERE r.role_name = '관리자';

-- 영업팀: 주문 CRUD + 재고/정산/보고서 읽기
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = '영업팀' AND p.permission_name IN ('orders:create', 'orders:update', 'orders:delete', 'orders:read', 'inventory:read', 'reports:read');

-- 물류팀: 재고 관리 + 주문/보고서 읽기
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = '물류팀' AND p.permission_name IN ('inventory:create', 'inventory:read', 'orders:read', 'reports:read');

-- 회계팀: 정산 + 주문/재고/보고서 읽기
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = '회계팀' AND p.permission_name IN ('finance:read', 'orders:read', 'inventory:read', 'reports:read');

-- 뷰어: 읽기만
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = '뷰어' AND p.permission_name IN ('orders:read', 'inventory:read', 'finance:read', 'reports:read');

-- 샘플 고객사
INSERT OR IGNORE INTO customers (name, contact_info) VALUES
('(주)삼성전기', '02-1234-5678'),
('LG이노텍', '031-987-6543'),
('SK하이닉스', '031-456-7890');

-- 샘플 품목
INSERT OR IGNORE INTO items (name, description, unit_price) VALUES
('반도체칩 A100', '고성능 반도체칩', 15000),
('커패시터 C200', '세라믹 커패시터', 500),
('저항기 R300', '정밀 저항기', 100),
('PCB보드 P400', '4층 PCB 기판', 25000),
('커넥터 K500', 'USB-C 커넥터', 3000);

-- 샘플 재고
INSERT OR IGNORE INTO inventory (item_id, current_quantity, safety_stock, warehouse_location) VALUES
(1, 500, 100, 'A동 1층'),
(2, 2000, 500, 'A동 2층'),
(3, 5000, 1000, 'B동 1층'),
(4, 200, 50, 'B동 2층'),
(5, 1000, 200, 'C동 1층');
