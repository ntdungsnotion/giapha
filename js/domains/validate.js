// ============================================================
// giapha · js/domains/validate.js
// Vai trò  : Quy tắc nghiệp vụ trước khi lưu.
// Lớp      : domains — HÀM THUẦN
// Phụ thuộc: utils/date, utils/graph
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// Mỗi hàm trả về: { ok: boolean, level: 'error'|'warning', message: string }
// - error   -> chặn, không cho lưu
// - warning -> cho lưu nhưng hiện cảnh báo (dữ liệu gia phả cũ thường
//              có mâu thuẫn thật, không nên chặn cứng)
//
// Đây là hàng rào phía trình duyệt, KHÔNG phải hàng rào duy nhất: quyền sửa
// và xung đột phiên bản do máy chủ (gas/Code.gs) thực thi.

/** CHẶN: một người không thể là tổ tiên của chính mình. */
export function checkNoAncestorCycle(index, childId, parentId) { /* TODO */ }

/** CHẶN: ngày mất không sớm hơn ngày sinh. */
export function checkDeathAfterBirth(person) { /* TODO */ }

/** CẢNH BÁO: cha mẹ sinh sau con, hoặc cách con dưới 15 tuổi. */
export function checkParentAge(index, parentId, childId) { /* TODO */ }

/** CẢNH BÁO: tuổi thọ trên 110. */
export function checkLifespan(person) { /* TODO */ }

/** CẢNH BÁO: trùng tên và trùng năm sinh — có thể là bản ghi lặp. */
export function checkDuplicate(tree, person) { /* TODO */ }

/** Chạy toàn bộ kiểm tra liên quan trước khi lưu. */
export function validateAll(tree, index, changeType, payload) { /* TODO */ }
