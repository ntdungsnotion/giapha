// ============================================================
// giapha · js/services/repo.js
// Vai trò  : Nạp/lưu cây gia phả, dựng chỉ mục, giữ trạng thái phiên.
// Lớp      : services — được gọi bởi: pages · gọi: services/gas, utils
// Phụ thuộc: services/gas.js, utils/graph.js, state.js
// Phiên bản: 0.3.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// RANH GIỚI ĐỔI KHO LƯU TRỮ.
// Đổi từ JSON-trên-Drive sang thứ khác thì chỉ file này và gas.js
// phải viết lại. domains/ và pages/ không đổi một dòng.
//
// TRẠNG THÁI (15/08/2026, mục 0.12): layPhien đã chạy thật.
// napCay · luuCay · nangCapNeuCan còn khung — làm ở chat 1.1.

import * as gas from './gas.js';
import { state } from '../state.js';

/**
 * Gọi khi mở app: lấy danh tính và quyền, rồi nạp cây.
 * @returns {Promise<object>} chính là phiên máy chủ trả về
 */
export async function khoiTao() {
  const phien = await gas.layPhien();
  state.phien = phien;

  // Không đọc được thì dừng ngay — pages/khoi-dong lo phần giải thích.
  if (!phien.docDuoc) return phien;

  // TODO — chat 1.1: await napCay(); rồi đặt focusPersonId theo
  // phien.nguoiTrungTamMacDinh, rơi về tree.rootPersonId nếu không có.

  return phien;
}

/** Đọc cây, kiểm tra định dạng, dựng chỉ mục tra cứu. */
export async function napCay() { /* TODO — chat 1.1 */ }

/**
 * Lưu cây.
 * Máy chủ chịu trách nhiệm kiểm tra quyền sửa và xung đột phiên bản.
 * Trả về { ok:false, lyDo:'xungdot' } nếu người khác vừa sửa,
 * hoặc { ok:false, lyDo:'khongcoquyen' } nếu chỉ có quyền xem.
 */
export async function luuCay() { /* TODO — chat 1.1 */ }

/** Người đang dùng có sửa được không. Lấy từ phiên, KHÔNG tự suy từ email. */
export function suaDuoc() {
  return !!(state.phien && state.phien.suaDuoc);
}

/** Người đang dùng có đọc được không. */
export function docDuoc() {
  return !!(state.phien && state.phien.docDuoc);
}

/** Kiểm tra và nâng cấp file dữ liệu phiên bản cũ. */
export function nangCapNeuCan(raw) { /* TODO — chat 1.1 */ }
