// ============================================================
// giapha · js/domains/union.js
// Vai trò  : Nghiệp vụ hôn nhân và quan hệ cha mẹ – con
// Lớp      : domains — HÀM THUẦN
// Phụ thuộc: utils/id
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// NHẮC LẠI HAI ĐIỀU HAY BỊ LẪN:
// - partners là MẢNG, không phải husband/wife. Hôn nhân đồng giới phải chạy.
//   Chỉ ánh xạ sang HUSB/WIFE lúc xuất GEDCOM.
// - partnerOrder = vị trí trái/phải trên sơ đồ.
//   rank         = thứ bậc vợ cả (1) / vợ thứ (2).
//   Hai thứ KHÁC NHAU. Không gộp.

export function createUnion(tree, partnerIds, data) { /* TODO */ }

export function updateUnion(tree, unionId, changes, byEmail) { /* TODO */ }

export function softDeleteUnion(tree, unionId, byEmail) { /* TODO */ }

/** Thêm con vào một union. relation: birth|adopted|step|foster|thua_tu */
export function addChild(tree, unionId, personId, relation, byEmail) { /* TODO */ }

export function removeChild(tree, unionId, personId, byEmail) { /* TODO */ }

/** Đổi vị trí trái/phải của hai vợ chồng trên sơ đồ. */
export function swapPartnerOrder(tree, unionId) { /* TODO */ }

/** Đổi thứ tự anh chị em (kéo thả). */
export function reorderChildren(tree, unionId, orderedPersonIds) { /* TODO */ }

// --- Truy vấn quan hệ (dùng nhiều, nên tách riêng) ---
export function getParentUnions(index, personId) { /* TODO */ }
export function getPartnerUnions(index, personId) { /* TODO */ }
export function getParents(index, personId)  { /* TODO */ }
export function getChildren(index, personId) { /* TODO */ }
export function getSiblings(index, personId) { /* TODO */ }
export function getSpouses(index, personId)  { /* TODO */ }
