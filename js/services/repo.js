// ============================================================
// giapha · js/services/repo.js
// Vai trò  : Nạp/lưu cây gia phả, dựng chỉ mục, giữ trạng thái phiên.
// Lớp      : services — được gọi bởi: pages · gọi: services/gas, utils
// Phụ thuộc: services/gas.js, utils/graph.js, utils/id.js, state.js
// Phiên bản: 0.9.0 · Cập nhật: 29/08/2026 22:10
// ============================================================
//
// RANH GIỚI ĐỔI KHO LƯU TRỮ.
// Đổi từ JSON-trên-Drive sang thứ khác thì chỉ file này và gas.js
// phải viết lại. domains/ và pages/ không đổi một dòng.
//
// TRẠNG THÁI (17/08/2026, chat 2.1): khoiTao · napCay · nangCapNeuCan · luuCay
// đều đã chạy thật.

import * as gas from './gas.js';
import { state, notify } from '../state.js';
import { buildIndex } from '../utils/graph.js';
import { sinhMaCay, sinhUid, maCayCuaCay } from '../utils/id.js';
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
 *
 * ⚠ KHÔNG nhận sẵn một cây đã sửa, mà nhận HÀM SỬA. Lý do là luật đã chốt
 * 17/08/2026: *giao diện chỉ đổi SAU khi máy chủ xác nhận*. Nếu nơi gọi sửa
 * thẳng vào `state.tree` rồi mới gọi lưu, thì lúc máy chủ từ chối — hết quyền,
 * xung đột, mất mạng — màn hình đã hiện một điều không đúng sự thật, và không
 * còn bản gốc nào để lùi về.
 *
 * Cách làm ở đây: nhân đôi cây, cho `apDung` sửa trên BẢN SAO, gửi bản sao lên.
 * Máy chủ gật thì bản sao mới trở thành `state.tree`. Máy chủ lắc thì
 * `state.tree` chưa hề bị đụng vào.
 *
 * Xung đột thì CỐ Ý KHÔNG cập nhật `state.headRevisionId`. Nghe có vẻ tiện —
 * "cập nhật rồi lưu lại là xong" — nhưng đó chính là ghi đè mất bản của người
 * kia, tức là tự tay làm đúng cái việc mà cả cơ chế này sinh ra để chặn.
 * Đường ra duy nhất là nạp lại cây.
 *
 * @param {function(object):void} apDung  sửa trên bản sao cây; không trả về gì
 * @param {{action?:string, target?:string, note?:string, diff?:object}} [moTa]
 *        ghi vào changeLog. `ts` và `by` do máy chủ điền, gửi lên cũng bỏ qua.
 * @returns {Promise<{ok:boolean, lyDo:string|null, loi:string|null,
 *                    revision?:number, saoLuu?:string}>}
 */
export async function luuCay(apDung, moTa) {
  if (!state.tree) {
    return tuChoi('chuanapcay', 'Chưa nạp được gia phả nên chưa lưu được gì.');
  }
  if (!suaDuoc()) {
    return tuChoi('khongcoquyen',
      'Bạn chỉ có quyền xem gia phả, không sửa được. ' +
      'Cần sửa thì nhờ người quản lý đổi quyền trên Google Drive.');
  }
  // Bản đang giữ trong máy đã bị máy chủ cắt chi tiết người còn sống. Gửi
  // ngược lên là xoá trắng dữ liệu thật của họ. Máy chủ cũng chặn lần nữa,
  // nhưng chặn ngay ở đây thì không tốn một vòng mạng để nghe lời từ chối.
  if (state.daLocNguoiConSong) {
    return tuChoi('dulieubiloc',
      'Bản gia phả trong máy đang bị ẩn bớt chi tiết người còn sống, ' +
      'nên không được phép lưu đè lên bản gốc.');
  }

  // Nhân đôi bằng JSON: cây vốn là dữ liệu JSON thuần, không có hàm, không có
  // Date, không có tham chiếu vòng — nên phép này an toàn và không cần
  // structuredClone (Apps Script iframe cũ chưa chắc có).
  const banNhap = JSON.parse(JSON.stringify(state.tree));
  if (typeof apDung === 'function') apDung(banNhap);

  let kq;
  try {
    kq = await gas.luuCay(banNhap, state.headRevisionId, moTa || null);
  } catch (e) {
    return tuChoi('khongnoiduoc',
      'Không gọi được máy chủ nên chưa lưu được. ' +
      (e && e.message ? e.message : String(e)));
  }

  if (!kq)    return tuChoi('khongtraloi', 'Máy chủ không trả về gì khi lưu.');
  if (!kq.ok) return kq;   // máy chủ đã viết sẵn câu giải thích trong kq.loi

  // Từ đây trở xuống mới được đụng vào state.
  banNhap.tree = kq.tree || banNhap.tree;
  if (kq.mucChangeLog) {
    if (!Array.isArray(banNhap.changeLog)) banNhap.changeLog = [];
    banNhap.changeLog.push(kq.mucChangeLog);
  }

  state.tree           = banNhap;
  state.index          = buildIndex(banNhap);
  state.headRevisionId = kq.headRevisionId || null;
  state.dirty          = false;
  notify();

  console.log('[repo] đã lưu: revision ' + kq.revision +
              ', sao lưu: ' + kq.saoLuu);
  return kq;
}

/** Lời từ chối của chính trình duyệt, cùng khuôn với kết quả máy chủ trả về. */
function tuChoi(lyDo, loi) {
  return { ok: false, lyDo, loi, headRevisionId: null, revision: null };
}

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
  // `imports` là SỔ NHẬP — mỗi lần trộn một file `.ged` vào cây ghi một mục,
  // giữ bảng ánh xạ *"bản ghi nào trong file là bản ghi nào trong cây"*. Có
  // từ 29/08/2026 (b62); cây lập trước ngày ấy không có nó, và đó là chuyện
  // thường chứ không phải file hỏng — xem `domains/gedcom.tronBoSung`.
  for (const ten of ['persons', 'unions', 'media', 'sources', 'changeLog',
                     'imports']) {
    if (!Array.isArray(raw[ten])) raw[ten] = [];
  }

  themMaCayNeuThieu(raw);
  themUidNeuThieu(raw);

  return raw;
}

/**
 * Điền `uid` cho bản ghi chưa có — điểm neo đi theo con người.
 *
 * RẺ VÀ KHÔNG RỦI RO, khác hẳn chuyện đổi mã: **không con trỏ nào trỏ tới
 * `uid`**, nên thêm nó không kéo theo phải sửa chỗ nào khác. Đó là lý do việc
 * này làm được cho cả bản ghi cũ, còn đổi mã thì không.
 *
 * Sinh từ mã cây + mã bản ghi nên hai máy ra cùng kết quả, cùng lý lẽ với
 * `themMaCayNeuThieu`. Bản ghi ĐÃ CÓ `uid` thì không đụng — `uid` nhập về từ
 * phần mềm khác là mã của họ, tính lại từ mã của ta là làm đứt đúng cái neo
 * vừa nhận được.
 */
function themUidNeuThieu(raw) {
  const maCay = maCayCuaCay(raw);
  let dem = 0;
  for (const ten of ['persons', 'unions']) {
    for (const b of raw[ten]) {
      if (!b || typeof b !== 'object' || !b.id) continue;
      if (typeof b.uid === 'string' && b.uid) continue;
      b.uid = sinhUid(maCay, b.id);
      dem++;
    }
  }
  if (dem) console.log('[repo] điền uid cho ' + dem + ' bản ghi chưa có');
}

/**
 * Điền `tree.treeCode` cho cây chưa có, để mã sinh từ nay mang tiền tố cây
 * (`NTBK7R3_P0060`). KHÔNG đụng một mã nào đang có — chủ dự án chốt 29/08/2026:
 * mã cũ để nguyên, chỉ mã mới mang tiền tố.
 *
 * ⚠ HẠT GIỐNG PHẢI ỔN ĐỊNH, và đó là cả lý do hàm này trông kỳ quặc. Nó chạy
 * ở MỌI máy MỌI lần nạp cây, mà cây chỉ ghi được mã ấy xuống file ở lần lưu
 * đầu tiên sau đó. Giữa hai mốc ấy, hai người cùng mở app phải tính ra CÙNG
 * một mã — nếu không, ai lưu trước đặt một tiền tố, người kia thêm người với
 * một tiền tố khác, và cây mọc ra hai tiền tố mà không có gì báo. Nên hạt
 * giống lấy từ hai thứ có sẵn trong file và không đổi theo máy: ngày tạo và
 * tên cây. `Math.random()` ở đây là sai, dù đọc thì thấy tự nhiên hơn.
 *
 * Đổi tên cây SAU khi mã đã ghi xuống file thì mã giữ nguyên — mã đã nằm
 * trong `raw.tree.treeCode` và hàm này không đụng tới nữa.
 */
function themMaCayNeuThieu(raw) {
  const t = raw.tree;
  if (typeof t.treeCode === 'string' && t.treeCode) return;

  const hat = String(t.createdAt || t.id || '') + '|' + String(t.name || '');
  t.treeCode = sinhMaCay(t.name, hat);
  console.log('[repo] cây chưa có mã cây, đặt: ' + t.treeCode +
              ' (mã người đang có giữ nguyên)');
}

// ============================================================
// Dựng một gia phả MỚI trên Drive
// ============================================================
//
// ⚠ `gas.taoFileDuLieuMoi()` KHÔNG TRẢ VỀ GÌ — bên máy chủ nó kể mọi thứ bằng
// `Logger.log`, thứ chỉ đọc được trong trình soạn thảo Apps Script. Nên cây
// mới phải TÌM lại bằng cách chụp danh sách trước và sau, rồi nhặt `fileId`
// chưa từng có mặt. So theo TÊN là sai ở đúng ca hỏng: máy chủ gặp thư mục đã
// chứa sẵn một gia phả thì dừng lặng lẽ, và cây cũ cùng tên vẫn nằm trong
// danh sách — so tên sẽ tưởng vừa dựng xong.
//
// Drive đánh chỉ mục có độ trễ, nên lần hỏi đầu chưa thấy KHÔNG có nghĩa là
// chưa tạo được. Hỏi lại tối đa `SO_LAN_HOI` lần, cách nhau `NHIP_HOI`.
//
// Đứng ở `services/` chứ không ở màn hình vì HAI màn hình cần nó: *Chọn gia
// phả* (nút Dữ liệu mới) và *Nhập GEDCOM* (ghi vào một gia phả mới). Chép
// sang màn hình thứ hai là dựng bản thứ hai của một đoạn khó, và bản thứ hai
// bao giờ cũng là bản quên sửa.

const SO_LAN_HOI = 4;
const NHIP_HOI   = 1500;

/**
 * Dựng gia phả mới rồi tìm lại nó trong danh sách.
 *
 * KHÔNG chọn, KHÔNG mở, KHÔNG đụng gì vào cây đang mở — nơi gọi tự quyết
 * bước tiếp theo.
 *
 * @param {string} ten  tên gia phả người dùng gõ
 * @param {{conSong?:function():boolean}} [tuyChon]
 *        `conSong` trả về `false` thì hàm dừng vòng hỏi lại — dùng khi người
 *        dùng đã đóng màn hình giữa chừng.
 * @returns {Promise<{ok:boolean, moi:object|null, lyDo:string, loi:string}>}
 */
export async function taoGiaPhaMoi(ten, tuyChon) {
  const t = tuyChon || {};
  const conSong = typeof t.conSong === 'function' ? t.conSong : () => true;
  const thua = (lyDo, loi) => ({ ok: false, moi: null, lyDo, loi });

  const tenGon = String(ten || '').trim();
  if (!tenGon) return thua('thieuten', 'Chưa gõ tên gia phả.');

  let truoc;
  try {
    truoc = await tapMaGiaPha();
  } catch (e) {
    return thua('khongnoiduoc', cauLoi(e));
  }

  try {
    await gas.taoFileDuLieuMoi(tenGon);
  } catch (e) {
    return thua('khongnoiduoc', cauLoi(e));
  }

  for (let lan = 0; lan < SO_LAN_HOI; lan++) {
    if (!conSong()) return thua('daDong', 'Màn hình đã đóng giữa chừng.');
    if (lan > 0) await nghi(NHIP_HOI);

    let ds;
    try {
      ds = await danhSachThuong();
    } catch (e) {
      return thua('khongnoiduoc', cauLoi(e));
    }
    if (!conSong()) return thua('daDong', 'Màn hình đã đóng giữa chừng.');

    const moi = ds.find((m) => m && !truoc.has(m.fileId));
    if (moi) return { ok: true, moi, lyDo: '', loi: '' };
  }

  return thua('khongthay',
    'Máy chủ chạy xong nhưng chưa thấy gia phả mới nào trong danh sách. Hai ' +
    'khả năng, và chúng ngược nhau: đã có sẵn một gia phả tên "' + tenGon +
    '" nên app không dựng đè lên; hoặc cây đã dựng xong mà Google Drive chưa ' +
    'kịp đưa vào danh sách tìm kiếm. Đóng màn hình này, mở lại sau một phút ' +
    'rồi xem có cây mới không — ĐỪNG bấm dựng lần nữa ngay.');
}

/** Tập mã của mọi gia phả đang thấy. Ném lỗi nếu máy chủ từ chối. */
async function tapMaGiaPha() {
  const ds = await danhSachThuong();
  return new Set(ds.map((m) => m && m.fileId).filter((x) => !!x));
}

/** `layDanhSachGiaPha` đã bóc vỏ. Ném lỗi thay vì trả về `{ok:false}`. */
async function danhSachThuong() {
  const kq = await gas.layDanhSachGiaPha();
  if (!kq || !kq.ok) {
    throw new Error((kq && kq.loi) || 'Máy chủ không trả về danh sách gia phả.');
  }
  return Array.isArray(kq.ds) ? kq.ds : [];
}

function nghi(ms) {
  return new Promise((xong) => setTimeout(xong, ms));
}

function cauLoi(e) {
  return e && e.message ? e.message : String(e);
}
