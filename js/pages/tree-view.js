// ============================================================
// giapha · js/pages/tree-view.js
// Vai trò  : MÀN HÌNH CHÍNH — sơ đồ cây, zoom, kéo, đổi người trung tâm
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{bloodline,layout,render}, pages/person-detail
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// Bố cục nút, đối chiếu Quick Family Tree (chat 1.5 và 1.6):
//   Trên trái  — cột 4 nút chọn số đời TỔ TIÊN
//   Dưới trái  — cột 4 nút chọn phạm vi HẬU DUỆ
//   Trên phải  — Cài đặt · Tìm kiếm · Chụp ảnh sơ đồ
//   Dưới phải  — Phóng to · Thu nhỏ · Đưa người trung tâm về giữa

export function mountTreeView(containerEl) { /* TODO — chat 1.4 */ }

/** Vẽ lại toàn bộ. Gọi khi đổi focus, đổi phạm vi, hoặc sửa dữ liệu. */
export function refresh() { /* TODO — chat 1.4 */ }

/** Đổi người trung tâm rồi vẽ lại. Gọi khi chạm vào người hoặc nốt cụt. */
export function setFocusPerson(personId) { /* TODO — chat 1.5 */ }

/** Zoom và kéo. Phải chạy được bằng ngón tay: pinch để zoom, kéo để di. */
function setupPanZoom(svgEl) { /* TODO — chat 1.5 */ }

/** Đưa người trung tâm về giữa màn hình. */
function centerOnFocus() { /* TODO — chat 1.5 */ }

/** Nút lọc phạm vi tổ tiên (góc trên trái) và hậu duệ (góc dưới trái). */
function setupScopeControls() { /* TODO — chat 1.6 */ }
