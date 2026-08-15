// ============================================================
// giapha · js/utils/text.js
// Vai trò  : Xử lý chuỗi tiếng Việt — bỏ dấu, so khớp tìm kiếm,
//            và quy tắc hiển thị trường thiếu dùng chung cho mọi màn hình
// Lớp      : utils
// Phụ thuộc: (không)
// Phiên bản: 0.2.0 · Cập nhật: 15/08/2026 12:16
// ============================================================

/**
 * Bỏ dấu tiếng Việt, chuyển chữ thường.
 * "Nguyễn Văn Ân" -> "nguyen van an"
 * Nhớ xử lý riêng chữ đ/Đ vì normalize('NFD') không tách được.
 */
export function removeDiacritics(s) { /* TODO */ }

/** So khớp tìm kiếm không phân biệt dấu và hoa thường. */
export function matchesSearch(haystack, needle) { /* TODO */ }

/** Ghép các phần tên thành một chuỗi hiển thị. */
export function fullName(nameObj) { /* TODO */ }

// --- Quy tắc hiển thị trường thiếu (chốt 14/08/2026) ---------
//
// Thiếu thông tin là TRẠNG THÁI BÌNH THƯỜNG của gia phả, không phải lỗi.
// Trường trống thì KHÔNG VẼ HÀNG ĐÓ. Không ghi "Không rõ", không hiện "...".
//
// Hai hàm dưới đây là nơi duy nhất cài quy tắc này. Mọi màn hình gọi chung.
// Đừng để mỗi màn hình tự viết `if (p.birth.iso)` theo kiểu riêng — đó chính
// là cách một quy tắc nhất quán vỡ thành bốn cách hiển thị khác nhau.

/** rỗng, null, undefined, chuỗi toàn khoảng trắng -> false */
export function coGiaTri(v) { /* TODO */ }

/** "1927 – 2001" · "1962" · "" nếu không có gì. Dùng cho dòng thứ hai của ô người. */
export function doiSongNguoi(person) { /* TODO */ }
