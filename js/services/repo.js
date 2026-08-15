// ============================================================
// giapha · js/services/repo.js
// Vai trò  : Nạp/lưu cây gia phả, dựng chỉ mục, giữ trạng thái phiên.
// Lớp      : services — được gọi bởi: pages · gọi: services/gas, utils
// Phụ thuộc: services/gas.js, utils/graph.js, state.js
// Phiên bản: 0.4.0 · Cập nhật: 15/08/2026 20:22
// ============================================================
//
// RANH GIỚI ĐỔI KHO LƯU TRỮ.
// Đổi từ JSON-trên-Drive sang thứ khác thì chỉ file này và gas.js
// phải viết lại. domains/ và pages/ không đổi một dòng.
//
// TRẠNG THÁI (15/08/2026, chat 1.1): layPhien · napCay · nangCapNeuCan
// đã chạy thật. luuCay còn khung — làm ở giai đoạn 2.

import * as gas from './gas.js';
import { state } from '../state.js';
import { buildIndex } from '../utils/graph.js';
import { DATA_VERSION } from '../config.js';

/**
 * Gọi khi mở app: lấy danh tính và quyền, rồi nạp cây.
 * @returns {Promise<object>} chính là phiên máy chủ trả về
 */
export async function khoiTao() {
  const phien = await gas.layPhien();
  state.phien = phien;

  // Không đọc được thì dừng ngay — pages/khoi-dong lo phần giải thích.
  if (!phien.docDuoc) return phien;

  await napCay();
  state.focusPersonId = chonNguoiTrungTam(phien);

  return phien;
}

/**
 * Đọc cây, kiểm tra định dạng, dựng chỉ mục tra cứu.
 * Ném lỗi nếu máy chủ từ chối hoặc dữ liệu hỏng — pages/khoi-dong bắt và
 * hiện màn hình lỗi kèm nút Thử lại.
 * @returns {Promise<object>} object gốc đọc từ file JSON
 */
export async function napCay() {
  const kq = await gas.layCay();

  if (!kq)    throw new Error('Máy chủ không trả về gì khi đọc cây gia phả.');
  if (!kq.ok) throw new Error(kq.loi || 'Máy chủ từ chối trả cây gia phả.');

  const cay = nangCapNeuCan(kq.cay);

  state.tree              = cay;
  state.index             = buildIndex(cay);
  state.headRevisionId    = kq.headRevisionId || null;
  state.daLocNguoiConSong = !!kq.daLocNguoiConSong;

  console.log(
    '[repo] nạp cây: ' + state.index.personById.size + ' người, ' +
    state.index.unionById.size + ' hôn nhân' +
    (state.daLocNguoiConSong ? ' (đã ẩn chi tiết người còn sống)' : '')
  );

  return cay;
}

/**
 * Chọn người đứng giữa sơ đồ, theo thứ tự ưu tiên.
 *
 * Mỗi bước đều kiểm người đó CÒN trong chỉ mục hay không. Giá trị lưu ở kho
 * cài đặt riêng là một mã người chép từ lúc trước; người đó có thể đã bị xoá
 * từ lâu. Không kiểm thì sơ đồ mở ra trống trơn mà không báo gì — và giá trị
 * rác của phép thử 0.11 đang nằm sẵn trên hai tài khoản.
 */
function chonNguoiTrungTam(phien) {
  const con = id => !!(id && state.index && state.index.personById.has(id));

  // 1. Người dùng đã tự đặt trong Cài đặt (kho riêng theo tài khoản).
  if (con(phien.nguoiTrungTamMacDinh)) return phien.nguoiTrungTamMacDinh;

  // 2. Gốc cây ghi trong file. state.tree là object gốc của file JSON,
  //    còn state.tree.tree là khối thông tin chung — hai chữ "tree" khác nhau.
  const goc = state.tree && state.tree.tree && state.tree.tree.rootPersonId;
  if (con(goc)) return goc;

  // 3. Cùng lắm lấy người đầu tiên, để màn hình không trắng trơn.
  const dau = state.index && state.index.personById.keys().next();
  return (dau && !dau.done) ? dau.value : null;
}

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

/**
 * Kiểm tra và nâng cấp file dữ liệu phiên bản cũ.
 *
 * Từ chối thẳng file MỚI HƠN app: mở ra rồi lưu đè sẽ nuốt mất những trường
 * mà app đời này chưa biết đến. Thà không mở còn hơn mở rồi làm mất dữ liệu.
 *
 * @param {object} raw  object vừa đọc từ file
 * @returns {object}    chính object đó, đã bổ sung các mảng còn thiếu
 */
export function nangCapNeuCan(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('File dữ liệu rỗng hoặc không đọc ra được nội dung.');
  }
  if (raw.format !== 'giapha-json') {
    throw new Error('Đây không phải file gia phả của app này ' +
                    '(thiếu dòng "format": "giapha-json").');
  }

  const v = Number(raw.version);
  if (!Number.isFinite(v)) {
    throw new Error('File dữ liệu không ghi số phiên bản.');
  }
  if (v > DATA_VERSION) {
    throw new Error('File dữ liệu là phiên bản ' + v + ', mới hơn app ' +
                    '(phiên bản ' + DATA_VERSION + '). Tải lại trang để ' +
                    'lấy bản app mới trước khi mở.');
  }
  // v < DATA_VERSION: chưa từng có phiên bản cũ nào để nâng cấp.
  // Khi đổi schema, các bước nâng cấp viết vào đúng chỗ này.

  // Mảng thiếu thì coi như rỗng. Gia phả mới lập chưa có ảnh, chưa có nguồn —
  // đó là chuyện thường, không phải file hỏng.
  if (!raw.tree || typeof raw.tree !== 'object') raw.tree = {};
  for (const ten of ['persons', 'unions', 'media', 'sources', 'changeLog']) {
    if (!Array.isArray(raw[ten])) raw[ten] = [];
  }

  return raw;
}
