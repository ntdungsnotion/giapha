// ============================================================
// giapha · js/domains/layout.js
// Vai trò  : Tính TOẠ ĐỘ các nút và đường nối. Không vẽ gì cả.
// Lớp      : domains — HÀM THUẦN
// Phụ thuộc: config (LAYOUT), utils/graph
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// Tách khỏi render.js có chủ ý: chỉnh giao diện (màu, phông, bo góc)
// không được đụng vào thuật toán bố trí.
//
// Dùng d3-hierarchy cho phần chống chồng nhánh ở cây hậu duệ.
// Phần vợ/chồng và nốt cụt tự xử lý — d3 không có khái niệm này.
//
// ĐÂY LÀ PHẦN KHÓ NHẤT CỦA DỰ ÁN. Dự trù làm lại vài lần.
// Chiều cao ô PHẢI cố định, dù người đó có một dòng hay hai — để ô co lại
// theo nội dung thì các ô cùng một đời sẽ so le, sơ đồ nhìn gãy.

import { LAYOUT } from '../config.js';

/**
 * @returns {{
 *   nodes: Array<{id, x, y, w, h, kind}>,
 *   links: Array<{from, to, kind}>,
 *   stubs: Array<{x, y, angle, personId}>,
 *   bounds: {minX, minY, maxX, maxY}
 * }}
 */
export function computeLayout(index, focusPersonId, visibleSet, scope) { /* TODO — chat 1.3 */ }

/** Bố trí phần hậu duệ đi xuống. */
function layoutDescendants(index, rootId, scope) { /* TODO — chat 1.3 */ }

/** Bố trí phần tổ tiên đi lên. Không phải cây ngược — có thể chồng nhánh. */
function layoutAncestors(index, rootId, scope) { /* TODO — chat 1.3 */ }

/** Đặt vợ/chồng cạnh nhau, tôn trọng partnerOrder. */
function placeSpouses(nodes, index) { /* TODO — chat 1.3 */ }
