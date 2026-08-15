// ============================================================
// giapha · js/domains/person.js
// Vai trò  : Nghiệp vụ hồ sơ cá nhân — tạo, sửa, đọc thông tin một người
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/id, utils/date, utils/text
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================

/** Tạo bản ghi người mới với đầy đủ trường mặc định. */
export function createPerson(tree, data) { /* TODO */ }

/** Sửa thông tin. Trả về tree MỚI, không sửa tree cũ. Có ghi changeLog. */
export function updatePerson(tree, personId, changes, byEmail) { /* TODO */ }

/** Xoá mềm: đặt cờ deleted. KHÔNG xoá khỏi mảng. */
export function softDeletePerson(tree, personId, byEmail) { /* TODO */ }

export function restorePerson(tree, personId, byEmail) { /* TODO */ }

/** Lấy tên chính để hiển thị. */
export function getDisplayName(person) { /* TODO */ }

/** Lấy các tên khác: húy, tự, thụy, pháp danh, thường gọi. */
export function getAlternateNames(person) { /* TODO */ }

/** Tìm người theo tên, không phân biệt dấu. */
export function searchPersons(tree, keyword) { /* TODO */ }
