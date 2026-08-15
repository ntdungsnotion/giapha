// ============================================================
// giapha · js/domains/gedcom.js
// Vai trò  : Nhập và xuất GEDCOM
// Lớp      : domains — HÀM THUẦN
// Phụ thuộc: utils/date, utils/id
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// XUẤT: GEDCOM 5.5.1. Cũ hơn 7.0 nhưng gần như mọi phần mềm gia phả
//       đọc được. Mục đích xuất là để dữ liệu ĐI ĐƯỢC SANG NƠI KHÁC,
//       nên tương thích rộng quan trọng hơn hiện đại.
// NHẬP: chấp nhận cả 5.5.1 và 7.0.
//
// Ánh xạ trường:
//   person.id            -> xref @P1@, thẻ INDI
//   names[type=chinh]    -> NAME với SURN / GIVN
//   names[] khác         -> NAME lặp lại kèm TYPE
//   union.partners       -> HUSB / WIFE, gán theo sex;
//                           cùng giới thì gán theo partnerOrder
//   children[].relation  -> CHIL kèm PEDI
//   vn.*                 -> thẻ mở rộng _DOI, _CHI, _GIO
//
// Không xuất thẻ rỗng.

/** @returns {string} nội dung file .ged */
export function exportGedcom(tree, options) { /* TODO */ }

/**
 * Phân tích file .ged. KHÔNG ghi đè dữ liệu ngay —
 * trả về bản xem trước để người dùng đối chiếu.
 * @returns {{ persons, unions, warnings }}
 */
export function parseGedcom(text) { /* TODO */ }

/** Dò bản ghi trùng giữa dữ liệu nhập vào và cây hiện có. */
export function detectDuplicates(tree, imported) { /* TODO */ }

/** Trộn dữ liệu đã nhập vào cây, sau khi người dùng xác nhận. */
export function mergeImported(tree, imported, decisions) { /* TODO */ }
