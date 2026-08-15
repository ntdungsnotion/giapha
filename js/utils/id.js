// ============================================================
// giapha · js/utils/id.js
// Vai trò  : Sinh ID bất biến cho person / union / media / source
// Lớp      : utils — được gọi bởi: services, domains, pages
// Phụ thuộc: (không)
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================

/**
 * Sinh ID kế tiếp chưa từng dùng.
 * QUAN TRỌNG: không tái sử dụng ID của bản ghi đã xoá — phải quét cả
 * changeLog, không chỉ danh sách hiện có.
 * @param {'P'|'U'|'M'|'S'} prefix
 * @param {object} tree
 * @returns {string} ví dụ 'P0042'
 */
export function nextId(prefix, tree) { /* TODO */ }

/** Kiểm tra chuỗi có đúng dạng ID hay không. */
export function isValidId(id) { /* TODO */ }
