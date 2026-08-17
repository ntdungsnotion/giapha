// ============================================================
// giapha · js/domains/person.js
// Vai trò  : Nghiệp vụ hồ sơ cá nhân — tạo, sửa, đọc thông tin một người
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/id, utils/date, utils/text
// Phiên bản: 0.2.0 · Cập nhật: 17/08/2026 14:05
// ============================================================
import { fullName, coGiaTri } from '../utils/text.js';

/** Tạo bản ghi người mới với đầy đủ trường mặc định. */
export function createPerson(tree, data) { /* TODO — giai đoạn 2 */ }

/** Sửa thông tin. Trả về tree MỚI, không sửa tree cũ. Có ghi changeLog. */
export function updatePerson(tree, personId, changes, byEmail) { /* TODO — giai đoạn 2 */ }

/** Xoá mềm: đặt cờ deleted. KHÔNG xoá khỏi mảng. */
export function softDeletePerson(tree, personId, byEmail) { /* TODO — giai đoạn 2 */ }

export function restorePerson(tree, personId, byEmail) { /* TODO — giai đoạn 2 */ }

/**
 * Lấy tên chính để hiển thị.
 * Chỉ là lối vào đúng lớp cho `utils/text.fullName` — quy tắc ghép tên nằm ở
 * đó và CHỈ ở đó, để sơ đồ với thẻ thông tin không bao giờ gọi tên một người
 * theo hai kiểu khác nhau.
 */
export function getDisplayName(person) {
  return fullName(person);
}

/**
 * Các tên khác: huý, tự, thụy, pháp danh, thường gọi.
 *
 * @returns {{loai:string, ten:string}[]} — mảng rỗng nếu người này chỉ có một
 *          tên. Nơi gọi phải ẩn cả hàng khi rỗng.
 *
 * Mục `type: 'chinh'` bị loại vì nó đã hiện ở dòng tên lớn. Thiếu mục 'chinh'
 * thì `fullName` lấy tên ĐẦU TIÊN làm tên chính, nên ở đây cũng phải bỏ đúng
 * mục đầu tiên ấy — nếu không, tên chính hiện hai lần.
 */
export function getAlternateNames(person) {
  const ds = (person && Array.isArray(person.names)) ? person.names : [];
  const coChinh = ds.some((n) => n && n.type === 'chinh');
  const ra = [];

  ds.forEach((n, i) => {
    if (!n) return;
    if (coChinh ? n.type === 'chinh' : i === 0) return;
    const ten = fullName(n);
    if (!coGiaTri(ten)) return;
    ra.push({ loai: coGiaTri(n.type) ? String(n.type) : '', ten });
  });
  return ra;
}

/** Tìm người theo tên, không phân biệt dấu. */
export function searchPersons(tree, keyword) { /* TODO — cùng màn hình Tìm kiếm */ }
