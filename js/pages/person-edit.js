// ============================================================
// giapha · js/pages/person-edit.js
// Vai trò  : Form thêm/sửa người, và các thao tác thêm quan hệ
// Lớp      : pages
// Phụ thuộc: state, domains/{person,union,validate}, services/repo
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// NGƯỢC với hai màn hình kia: form HIỆN ĐỦ MỌI Ô, kèm chữ mờ gợi ý.
// Không ẩn ô trống — người dùng phải điền được.

export function openPersonForm(personId /* null = thêm mới */) { /* TODO */ }

/** Thêm nhanh bằng vài cú chạm — giống Quick Family Tree. */
export function quickAddParent(childId, sex)   { /* TODO */ }
export function quickAddSpouse(personId)       { /* TODO */ }
export function quickAddChild(unionId)         { /* TODO */ }

/** Nối / gỡ nối với người đã có sẵn trong cây. */
export function linkExisting(personId, targetId, relationType) { /* TODO */ }
export function unlink(personId, targetId, relationType)       { /* TODO */ }

/**
 * Lưu. Trình tự bắt buộc:
 *   1. Chạy validate.validateAll
 *   2. Nếu có error   -> dừng, hiện lỗi
 *   3. Nếu có warning -> hỏi người dùng có tiếp tục không
 *   4. Gọi repo.luuCay
 *   5. Nếu trả về { lyDo:'xungdot' } -> hiện "người khác vừa sửa,
 *      tải lại trước khi lưu", KHÔNG ghi đè
 */
async function handleSave(formData) { /* TODO */ }
