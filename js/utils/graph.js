// ============================================================
// giapha · js/utils/graph.js
// Vai trò  : Duyệt đồ thị dùng chung. MỌI hàm ở đây bắt buộc có tập visited.
// Lớp      : utils
// Phụ thuộc: (không)
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// CẢNH BÁO: Gia phả là ĐỒ THỊ, không phải cây. Hôn nhân giữa hai nhánh
// cùng họ tạo ra nhiều đường đi giữa hai điểm. Thiếu tập visited là
// treo trình duyệt, không phải chạy chậm.

/**
 * Duyệt theo chiều rộng, có chống lặp sẵn.
 * @param {string|string[]} startIds
 * @param {(id: string) => string[]} getNeighbors
 * @returns {Set<string>}
 */
export function bfs(startIds, getNeighbors) { /* TODO — chat 1.2 */ }

/**
 * Dựng chỉ mục tra cứu nhanh, gọi MỘT LẦN sau khi đọc file.
 * Trả về: { personById, unionById, unionsAsPartner, unionsAsChild }
 */
export function buildIndex(tree) { /* TODO — chat 1.1 */ }
