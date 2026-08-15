// ============================================================
// giapha · js/utils/date.js
// Vai trò  : Xử lý ngày tháng — phân tích, hiển thị, tính tuổi
// Lớp      : utils
// Phụ thuộc: (không)
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// Ngày lưu song song hai trường: iso (máy đọc) và raw (người gõ).
// KHÔNG BAO GIỜ suy đoán rồi ghi đè raw.

/**
 * Cố đoán ngày ISO từ chuỗi người dùng gõ.
 * KHÔNG BAO GIỜ ghi đè trường raw — chỉ trả về gợi ý.
 * Nhận được: "1948", "12/3/1948", "khoảng 1948", "tháng 3 năm 1948"
 * @returns {{iso: string|null, confident: boolean}}
 */
export function parseLooseDate(text) { /* TODO */ }

/** Hiển thị ngày cho người đọc. Ưu tiên raw nếu có, không thì định dạng iso. */
export function formatDate({ iso, raw }) { /* TODO */ }

/**
 * Tính tuổi thọ. Trả về null nếu thiếu dữ liệu.
 * Nếu còn sống thì tính đến hôm nay.
 */
export function calcAge(birth, death, isLiving) { /* TODO */ }

/** Dấu thời gian dạng dd/mm/yyyy HH:mm cho tài liệu và changeLog. */
export function stampNow() { /* TODO */ }
