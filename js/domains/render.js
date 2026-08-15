// ============================================================
// giapha · js/domains/render.js
// Vai trò  : Vẽ SVG từ kết quả layout. Chỉ vẽ, không tính toạ độ.
// Lớp      : domains
// Phụ thuộc: config (LAYOUT, PHOTO), utils/image, utils/text
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// Đây là file sẽ sửa nhiều nhất khi chỉnh giao diện. Giữ nó chỉ chứa
// việc vẽ, để mỗi lần đổi màu không phải nạp cả layout.js vào ngữ cảnh.
//
// Trường trống thì KHÔNG VẼ HÀNG ĐÓ — không có năm sinh lẫn năm mất thì
// bỏ hẳn dòng thứ hai, ô chỉ còn tên. Dùng utils/text.doiSongNguoi(),
// đừng tự kiểm `if (p.birth.iso)` ở đây.

/** Vẽ toàn bộ sơ đồ vào phần tử SVG. */
export function renderTree(svgEl, layout, index, handlers) { /* TODO — chat 1.4 */ }

/**
 * Một ô người: ảnh tròn, tên, năm sinh–mất, tuổi thọ.
 * Người trung tâm có QUẦNG CAM bao quanh ô — chi tiết nhỏ nhưng thiếu nó
 * thì người dùng mất dấu mình đang đứng ở đâu.
 */
function renderPersonNode(node, person, kind) { /* TODO — chat 1.4 */ }

/**
 * NỐT CỤT — dấu hiệu "còn dữ liệu ở hướng này nhưng không cùng huyết thống".
 * Vẽ đoạn thẳng ngắn + nốt tròn đặc. Nốt PHẢI bấm được:
 * bấm vào thì người đó thành trung tâm mới.
 */
function renderStub(stub, onClick) { /* TODO — chat 1.4 */ }

/** Đường nối cha mẹ – con và đường nối vợ chồng (khác kiểu nét). */
function renderLink(link) { /* TODO — chat 1.4 */ }

/** Ký hiệu người đã mất — Quick Family Tree thiếu cái này, ta nên có. */
function renderDeceasedMark(node) { /* TODO — chat 1.4 */ }
