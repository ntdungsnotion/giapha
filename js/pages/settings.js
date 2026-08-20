// ============================================================
// giapha · js/pages/settings.js
// Vai trò  : Màn hình Cài đặt — mặc định, tự kiểm ghi, thử ảnh, rà soát
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, services/{gas,repo}, domains/validate,
//            utils/{text,date,image}
// Phiên bản: 1.3.0 · Cập nhật: 20/08/2026 11:51
// ============================================================
//
// Màn hình này tồn tại vì MỘT việc: đặt và bỏ người trung tâm mặc định của
// riêng tài khoản đang đăng nhập. Mọi thứ khác ở đây là thông tin để tự kiểm.
//
// --- Vì sao đây cũng là chỗ dọn hai giá trị rác P0012 · P0020 ------------
//
// Hai tài khoản đang mang sẵn giá trị đặt bằng nút thử của mục 0.11. Kho chứa
// là `PropertiesService.getUserProperties()`, mà kho đó TÁCH RIÊNG theo từng
// tài khoản — đó chính là điều phép thử bốn vòng đã chứng minh, và cũng là
// điều làm việc dọn không thể làm hộ được. Chạy tay trong trình soạn thảo
// Apps Script chỉ dọn được kho của tài khoản chủ script.
//
// Nên đường dọn duy nhất đúng là: mỗi tài khoản tự mở màn hình này và bấm
// "Bỏ mặc định". Không có đường tắt, và đi tìm đường tắt là đi ngược lại tính
// chất đã cất công chứng minh.
//
// --- Không có máy chủ thì sao -------------------------------------------
//
// Mở thẳng từ GitHub Pages (không qua web app của Apps Script) thì
// `gas.coMayChu()` trả false. Lúc đó màn hình vẫn mở, vẫn đọc được, nhưng hai
// nút ghi phải MỜ VÀ NÓI RÕ VÌ SAO — nút bấm vào không xảy ra gì là thứ làm
// người dùng nghĩ app hỏng.

import { state, notify } from '../state.js';
import {
  coMayChu, datNguoiTrungTamMacDinh, xoaNguoiTrungTamMacDinh,
  taiAnh, layAnhBase64, trangThaiQuyenAnh, moQuyenXemAnh, xoaAnhThu,
} from '../services/gas.js';
import { luuCay, suaDuoc } from '../services/repo.js';
import { fullName, coGiaTri, doiSongNguoi } from '../utils/text.js';
import { stampNow } from '../utils/date.js';
import { compressImage, driveThumbUrl, driveLh3Url, dataUri, moTaCo } from '../utils/image.js';
import { validateAll } from '../domains/validate.js';

let lopPhu = null;
let xuLyNgoai = {};   // { onDoiMacDinh } — nơi gọi truyền vào

// Giữ THAM CHIẾU tới khối, không tra lại bằng querySelector.
//
// Bản đầu tra `lopPhu.querySelector('#khoi-mac-dinh')`, và nó trả null: lúc
// khối được vẽ lần đầu thì nó chưa được gắn vào `lopPhu` — `lopPhu.append()`
// nằm ở cuối `openSettings()`. Màn hình mở ra không có lấy một cái nút nào,
// mà không có lỗi nào ném ra cả. Cùng một họ với lỗi của chat 1.5: hàm đúng,
// gọi sai thời điểm.
let khoiMacDinh = null;
let khoiThuGhi  = null;
let khoiThuAnh  = null;
let khoiRaSoat  = null;

/**
 * Mở màn hình Cài đặt.
 *
 * @param {{onDoiMacDinh?:function}} [xuLy]
 *        chạy sau khi đặt hoặc bỏ mặc định thành công. Dùng callback thay vì
 *        `import` ngược `tree-view.js` — hai file cùng lớp `pages`, import
 *        vòng tròn thì một trong hai sẽ thấy hàm của file kia là `undefined`.
 */
export function openSettings(xuLy = {}) {
  closeSettings();
  xuLyNgoai = xuLy;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.id = 'giapha-cai-dat';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;width:100%;max-width:380px;' +
    'max-height:82vh;overflow:auto;box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Cài đặt';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  veKhoiMacDinh(hop);
  veKhoiThuGhi(hop);
  veKhoiThuAnh(hop);
  veKhoiRaSoat(hop);
  veKhoiPhien(hop);

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin-top:18px;width:100%;height:42px;font-size:14px;font-family:inherit;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;cursor:pointer;' +
    'touch-action:manipulation';
  dong.addEventListener('click', () => closeSettings());
  hop.append(dong);

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeSettings(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

export function closeSettings() {
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  khoiMacDinh = null;
  khoiThuGhi  = null;
  khoiThuAnh  = null;
  khoiRaSoat  = null;
  // Đóng màn hình là bỏ luôn kết quả phép thử: giữ lại thì lần mở sau hiện ba
  // khung ảnh của một tấm đã dọn khỏi Drive, và đó là một kết quả sai.
  thuAnh = trangThaiThuAnhRong();
}

// ============================================================
// Khối "Người trung tâm mặc định"
// ============================================================

function veKhoiMacDinh(vao) {
  khoiMacDinh = document.createElement('div');
  khoiMacDinh.style.cssText = 'margin-top:16px';
  vao.append(khoiMacDinh);
  veLaiKhoiMacDinh();
  return khoiMacDinh;
}

/**
 * Vẽ lại riêng khối này sau mỗi lần đặt/bỏ, thay vì đóng mở cả màn hình.
 *
 * Đóng rồi mở lại cả lớp phủ thì màn hình nháy một cái và người dùng mất chỗ
 * đang cuộn — mà đây là màn hình họ vừa bấm một nút quan trọng, đúng lúc cần
 * nhìn thấy kết quả nhất.
 */
function veLaiKhoiMacDinh(loi) {
  const khoi = khoiMacDinh;
  if (!khoi) return;
  khoi.innerHTML = '';

  khoi.append(veNhanKhoi('Người trung tâm mặc định'));

  const macDinh = state.phien && state.phien.nguoiTrungTamMacDinh;
  const nguoiMacDinh = macDinh && state.index ? state.index.personById.get(macDinh) : null;

  const giaiThich = document.createElement('div');
  giaiThich.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078;margin-bottom:10px';
  if (coGiaTri(macDinh) && nguoiMacDinh) {
    giaiThich.textContent =
      'Mỗi lần bạn mở app, sơ đồ sẽ vẽ quanh ' + fullName(nguoiMacDinh) + '. ' +
      'Giá trị này của riêng tài khoản bạn, người khác trong họ không thấy.';
  } else if (coGiaTri(macDinh)) {
    // Người được đặt làm mặc định đã bị xoá khỏi gia phả. Nói thẳng, vì đây
    // đúng là lúc cần bấm "Bỏ mặc định".
    giaiThich.textContent =
      'Đang đặt mã ' + macDinh + ', nhưng không còn ai mang mã đó trong gia phả. ' +
      'Nên bỏ mặc định đi.';
  } else {
    giaiThich.textContent =
      'Chưa đặt. Mỗi lần mở app, sơ đồ vẽ quanh người gốc của gia phả.';
  }
  khoi.append(giaiThich);

  if (nguoiMacDinh) khoi.append(veTheNho(nguoiMacDinh));

  // --- Hai nút ghi -------------------------------------------------------
  const dangXem = state.index && state.focusPersonId
    ? state.index.personById.get(state.focusPersonId) : null;
  const coNoi = coMayChu();

  const hangNut = document.createElement('div');
  hangNut.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';

  if (dangXem && state.focusPersonId !== macDinh) {
    hangNut.append(nut(
      'Đặt ' + fullName(dangXem) + ' làm mặc định', true, coNoi,
      () => chay(() => datNguoiTrungTamMacDinh(state.focusPersonId), state.focusPersonId)));
  }
  if (coGiaTri(macDinh)) {
    hangNut.append(nut('Bỏ mặc định', false, coNoi,
      () => chay(() => xoaNguoiTrungTamMacDinh(), '')));
  }
  khoi.append(hangNut);

  if (!coNoi) {
    khoi.append(veLoiNhan(
      'Trang này đang mở thẳng từ GitHub Pages nên không nối được máy chủ. ' +
      'Mở app qua địa chỉ web app của Apps Script thì hai nút trên mới bấm được.',
      false));
  }
  if (loi) khoi.append(veLoiNhan(loi, true));
}

/**
 * Gọi máy chủ rồi cập nhật lại giao diện.
 *
 * `giaTriMoi` được ghi vào `state.phien` NGAY sau khi máy chủ báo xong, chứ
 * không chờ gọi lại `layPhien()`: đó là một vòng mạng nữa cho một giá trị ta
 * vừa tự đặt và máy chủ vừa xác nhận.
 */
async function chay(lenh, giaTriMoi) {
  const khoi = khoiMacDinh;
  if (khoi) khoi.style.opacity = '0.5';
  try {
    await lenh();
    if (!state.phien) state.phien = {};
    state.phien.nguoiTrungTamMacDinh = giaTriMoi;
    notify();
    if (khoi) khoi.style.opacity = '1';
    veLaiKhoiMacDinh();
    if (xuLyNgoai.onDoiMacDinh) xuLyNgoai.onDoiMacDinh(giaTriMoi);
  } catch (e) {
    if (khoi) khoi.style.opacity = '1';
    veLaiKhoiMacDinh(e && e.message ? e.message : String(e));
  }
}

// ============================================================
// Khối "Kiểm tra ghi dữ liệu" — chat 2.1
// ============================================================
//
// Vì sao có khối này. `luuCay()` là nút cổ chai của cả giai đoạn 2: form nhập
// liệu, thêm người, menu 7 mục, ảnh — tất cả đều chờ nó. Nhưng form nhập liệu
// mãi chat 2.3 mới có, nên nếu không có chỗ nào bấm được thì đường ghi dữ liệu
// nằm đó không ai kiểm được, và lỗi sẽ lộ ra muộn hơn nhiều.
//
// Đây cũng đúng nếp đã ghi trong tài liệu: *chỗ nào cần tự kiểm thì phải có
// một cái nút ngay cạnh*, không bắt ai mở bảng điều khiển của trình duyệt gõ
// lệnh.
//
// Nút này sửa ghi chú của người trung tâm ĐANG XEM — nó THAY dấu cũ chứ không
// nối thêm, nên bấm bao nhiêu lần ghi chú cũng không phình ra.

const DAU_THU = /\s*\[thử ghi lúc [^\]]*\]/g;

function veKhoiThuGhi(vao) {
  khoiThuGhi = document.createElement('div');
  khoiThuGhi.style.cssText = 'margin-top:20px';
  vao.append(khoiThuGhi);
  veLaiKhoiThuGhi();
  return khoiThuGhi;
}

/** @param {{chu:string, laLoi:boolean}} [ketQua] */
function veLaiKhoiThuGhi(ketQua) {
  const khoi = khoiThuGhi;
  if (!khoi) return;
  khoi.innerHTML = '';

  khoi.append(veNhanKhoi('Kiểm tra ghi dữ liệu'));

  const dangXem = state.index && state.focusPersonId
    ? state.index.personById.get(state.focusPersonId) : null;
  const coNoi   = coMayChu();
  const ghiDuoc = coNoi && suaDuoc() && !!dangXem && !state.daLocNguoiConSong;

  const giaiThich = document.createElement('div');
  giaiThich.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078;margin-bottom:10px';
  giaiThich.textContent = dangXem
    ? 'Bấm nút dưới đây để thử ghi thật xuống Google Drive: app sẽ đánh một dấu ' +
      'thời gian vào ghi chú của ' + fullName(dangXem) + '. Đóng app mở lại, ' +
      'xem thẻ thông tin của người đó mà dấu vẫn còn thì đường lưu đã chạy đúng.'
    : 'Chưa chọn được người trung tâm nào nên chưa thử ghi được.';
  khoi.append(giaiThich);

  khoi.append(nut('Thử ghi vào gia phả', false, ghiDuoc, () => thuGhi(dangXem)));

  if (coNoi && !suaDuoc()) {
    khoi.append(veLoiNhan(
      'Bạn chỉ có quyền xem gia phả nên nút này không bấm được. ' +
      'Quyền do danh sách chia sẻ trên Google Drive quyết định.', false));
  }
  if (state.daLocNguoiConSong) {
    khoi.append(veLoiNhan(
      'Bản gia phả trong máy đang bị ẩn bớt chi tiết người còn sống, ' +
      'nên app không được phép lưu đè lên bản gốc.', false));
  }
  if (ketQua) khoi.append(veLoiNhan(ketQua.chu, ketQua.laLoi));
}

/**
 * Chạy đúng một lần ghi thật.
 *
 * Hàm sửa chạy trên BẢN SAO của cây do `repo.luuCay()` dựng — nó không đụng
 * vào `state.tree`. Máy chủ gật thì repo mới thay cây và gọi `notify()`.
 */
async function thuGhi(nguoi) {
  const khoi = khoiThuGhi;
  if (!nguoi) return;
  if (khoi) khoi.style.opacity = '0.5';

  const dau = '[thử ghi lúc ' + stampNow() + ']';

  let kq;
  try {
    kq = await luuCay(
      (cay) => {
        const p = (cay.persons || []).find((x) => x && x.id === nguoi.id);
        if (!p) return;
        const cu = typeof p.note === 'string' ? p.note : '';
        p.note = (cu.replace(DAU_THU, '').trim() + ' ' + dau).trim();
      },
      {
        action: 'update',
        target: nguoi.id,
        note:   'Nút "Thử ghi vào gia phả" trong màn hình Cài đặt (chat 2.1).',
        diff:   { 'note.dauThu': ['', dau] },
      }
    );
  } catch (e) {
    kq = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  if (khoi) khoi.style.opacity = '1';

  if (kq && kq.ok) {
    veLaiKhoiThuGhi({
      laLoi: false,
      chu: 'Đã ghi xong xuống Google Drive. Bản gia phả nay là phiên bản ' +
           kq.revision + ', dấu vừa đánh là ' + dau + '. ' +
           moTaSaoLuu(kq.saoLuu) +
           ' Giờ đóng app mở lại, xem thẻ thông tin của ' + fullName(nguoi) +
           ' — dấu này phải vẫn còn.',
    });
  } else {
    veLaiKhoiThuGhi({
      laLoi: true,
      chu: (kq && kq.loi) || 'Chưa lưu được, mà máy chủ không nói rõ vì sao.',
    });
  }
}

/** Dịch mã trạng thái sao lưu của máy chủ ra câu người thường đọc được. */
function moTaSaoLuu(ma) {
  if (ma === 'da-luu')         return 'Đã cất thêm một bản phòng hờ vào thư mục Sao_luu.';
  if (ma === 'chua-den-han')   return 'Chưa cất bản phòng hờ mới vì bản gần nhất còn chưa quá 24 giờ.';
  if (ma === 'tat')            return 'Sao lưu tự động đang tắt trong Config.gs.';
  if (ma === 'khong-cau-hinh') return 'Chưa điền THU_MUC_SAO_LUU_ID trong Config.gs nên chưa cất bản phòng hờ nào.';
  // 'loi' — thường là do thư mục Sao_luu chỉ chia sẻ cho chủ dự án.
  if (ma === 'loi')            return 'Ghi được gia phả, nhưng KHÔNG cất được bản phòng hờ ' +
                                      '(thư mục Sao_luu chỉ chủ dự án mới ghi được).';
  return '';
}

// ============================================================
// Khối "Phép thử ảnh" — bước 28
// ============================================================
//
// KHỐI NÀY LÀ MỘT DỤNG CỤ ĐO, KHÔNG PHẢI MỘT TÍNH NĂNG. Nó không gắn ảnh vào
// người nào, không sửa gia phả, không đụng `state.tree` một chữ. Xong bước 28
// thì gỡ nó đi — để lại là để một cái nút "tải ảnh chẳng vào đâu" nằm giữa màn
// hình Cài đặt.
//
// Nó tồn tại để trả lời BA CÂU HỎI mà không ai trả lời được bằng suy luận:
//
//   1. Chuỗi base64 dài bao nhiêu thì `google.script.run` còn chịu được?
//      → đo bằng chính ảnh thật của chủ dự án, không đoán theo tài liệu.
//   2. Trình duyệt có HIỆN được ảnh nằm trên Drive không, khi file KHÔNG mở
//      công khai và app chạy trong khung iframe của Apps Script?
//      → thử cả ba đường một lúc, cùng một tấm ảnh, cùng một khoảnh khắc.
//   3. Ô sơ đồ phải nở ra bao nhiêu khi có ảnh?
//      → câu này KHÔNG đo ở đây. Nó phải nhìn bằng mắt trên sơ đồ thật.
//
// ⚠ Ba đường hiện ảnh, và chúng KHÔNG tương đương nhau:
//
//   A. `drive.google.com/thumbnail?id=…`  rẻ nhất, nhưng cần trình duyệt gửi
//      kèm cookie Google sang một tên miền khác — thứ Chrome đang siết dần.
//   B. `lh3.googleusercontent.com/d/…`    cùng họ với A, máy chủ khác.
//   C. `layAnhBase64()` qua máy chủ       chắc chắn chạy, nhưng mỗi tấm ảnh
//      tốn một lần gọi máy chủ. Với sơ đồ 60 ô thì đó là 60 lần gọi.
//
// Nếu A hoặc B chạy: ô sơ đồ dùng nó, C để dành làm đường lui.
// Nếu cả hai hỏng khi file còn riêng tư: phải chọn giữa **mở công khai thư mục
// Anh** (ảnh người trong họ ai có link cũng xem được) và **đi đường C**. Đó là
// một quyết định của chủ dự án, không phải của mã.

let thuAnh = trangThaiThuAnhRong();

function trangThaiThuAnhRong() {
  return {
    dangChay: false,
    dong: [],          // các dòng chữ tường thuật
    loi: null,
    fileId: null,
    nenXong: null,     // kết quả compressImage
    quyen: null,       // chuỗi mô tả quyền chia sẻ hiện tại
    daMoCongKhai: false,
    ketQua: {},        // { thumb:'cho'|'dat'|'hong', lh3:…, mayChu:… }
    base64MayChu: null,
  };
}

function veKhoiThuAnh(vao) {
  khoiThuAnh = document.createElement('div');
  khoiThuAnh.style.cssText = 'margin-top:20px';
  vao.append(khoiThuAnh);
  veLaiKhoiThuAnh();
  return khoiThuAnh;
}

function veLaiKhoiThuAnh() {
  const khoi = khoiThuAnh;
  if (!khoi) return;
  khoi.innerHTML = '';

  khoi.append(veNhanKhoi('Phép thử ảnh (bước 28)'));

  const coNoi   = coMayChu();
  const taiDuoc = coNoi && suaDuoc();

  const giaiThich = document.createElement('div');
  giaiThich.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078;margin-bottom:10px';
  giaiThich.textContent =
    'Chọn một tấm ảnh bất kỳ. App sẽ nén nó, tải lên thư mục Anh trên Drive, ' +
    'rồi thử HIỆN nó lại bằng ba đường khác nhau. Việc này KHÔNG sửa gia phả, ' +
    'không gắn ảnh vào ai — chỉ để biết đường nào chạy được.';
  khoi.append(giaiThich);

  // Ô chọn file. Bọc trong nhãn để bấm đâu cũng mở được — ô `input type=file`
  // trần trên điện thoại là một vệt chữ nhỏ khó trúng ngón tay.
  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:block;width:100%;min-height:42px;padding:10px 14px;box-sizing:border-box;' +
    'font-size:14px;text-align:center;border-radius:9px;border:1px solid #e6e0d8;' +
    'background:#faf8f5;cursor:' + (taiDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (taiDuoc ? '1' : '0.45');
  nhan.textContent = thuAnh.dangChay ? 'Đang chạy…' : 'Chọn ảnh rồi thử';

  const o = document.createElement('input');
  o.type = 'file';
  o.accept = 'image/*';
  o.disabled = !taiDuoc || thuAnh.dangChay;
  o.style.cssText = 'display:none';
  o.addEventListener('change', () => {
    const f = o.files && o.files[0];
    if (f) chayThuAnh(f);
  });
  nhan.append(o);
  khoi.append(nhan);

  if (coNoi && !suaDuoc()) {
    khoi.append(veLoiNhan(
      'Bạn chỉ có quyền xem gia phả nên chưa tải ảnh lên được. ' +
      'Quyền do danh sách chia sẻ trên Google Drive quyết định.', false));
  }
  if (!coNoi) {
    khoi.append(veLoiNhan(
      'Trang này đang mở thẳng từ GitHub Pages, không qua web app của Apps ' +
      'Script, nên không có máy chủ để tải ảnh lên.', false));
  }

  for (const d of thuAnh.dong) khoi.append(veDongThuAnh(d));
  if (thuAnh.loi) khoi.append(veLoiNhan(thuAnh.loi, true));

  if (thuAnh.fileId) {
    khoi.append(veBaKhungAnh());

    khoi.append(nut(
      thuAnh.daMoCongKhai
        ? 'Đã mở công khai — bấm để thử hiện lại'
        : 'Mở công khai tấm ảnh thử này rồi thử lại',
      false, !thuAnh.dangChay, () => moCongKhaiRoiThuLai()));

    khoi.append(veLoiNhan(
      '⚠ Nút trên đặt quyền "bất kỳ ai có đường liên kết đều xem được" cho ' +
      'ĐÚNG tấm ảnh thử này. Bấm nó chỉ để biết hai đường đầu có chạy khi ảnh ' +
      'công khai hay không. Nó KHÔNG đổi quyền của thư mục Anh, và ảnh thử sẽ ' +
      'được dọn bằng nút dưới cùng.', false));

    khoi.append(nut('Dọn tấm ảnh thử này khỏi Drive', false, !thuAnh.dangChay,
      () => donAnhThu()));
  }
}

/** Một dòng tường thuật của phép thử. */
function veDongThuAnh(d) {
  const h = document.createElement('div');
  h.style.cssText =
    'display:flex;gap:8px;align-items:baseline;padding:5px 0;' +
    'border-top:1px solid #f0ebe4;font-size:13px;line-height:1.5';

  const nhan = document.createElement('div');
  nhan.textContent = d.nhan;
  nhan.style.cssText = 'flex:0 0 116px;font-size:12px;color:#8a8078';

  const gt = document.createElement('div');
  gt.textContent = d.giaTri;
  gt.style.cssText = 'flex:1 1 auto;word-break:break-word';

  h.append(nhan, gt);
  return h;
}

/**
 * Ba khung ảnh cạnh nhau, cùng một tấm ảnh, ba đường khác nhau.
 *
 * ⚠ Phải xếp CẠNH NHAU chứ không lần lượt: đọc ba kết quả ở ba thời điểm khác
 * nhau thì không loại trừ được khả năng Drive vừa mới xong việc dựng thumbnail
 * giữa hai lần thử.
 */
function veBaKhungAnh() {
  const hang_ = document.createElement('div');
  hang_.style.cssText = 'display:flex;gap:8px;margin-top:12px';

  hang_.append(motKhungAnh('A · thumbnail', 'thumb'));
  hang_.append(motKhungAnh('B · lh3', 'lh3'));
  hang_.append(motKhungAnh('C · máy chủ', 'mayChu'));

  return hang_;
}

function motKhungAnh(ten, khoa) {
  const o = document.createElement('div');
  o.style.cssText = 'flex:1 1 0;min-width:0;text-align:center';

  const khung = document.createElement('div');
  khung.style.cssText =
    'width:100%;aspect-ratio:1;border-radius:8px;border:1px solid #e6e0d8;' +
    'background:#faf8f5;overflow:hidden;display:flex;align-items:center;' +
    'justify-content:center';

  const ma = thuAnh.ketQua[khoa];
  if (ma === 'dat') {
    const im = document.createElement('img');
    im.src = duongCuaKhoa(khoa);
    im.alt = ten;
    im.style.cssText = 'width:100%;height:100%;object-fit:cover';
    khung.append(im);
  } else {
    const c = document.createElement('div');
    c.textContent = ma === 'hong' ? '✕' : ma === 'cho' ? '…' : '';
    c.style.cssText = 'font-size:20px;color:#8a8078';
    khung.append(c);
  }
  o.append(khung);

  const nhan = document.createElement('div');
  nhan.textContent = ten;
  nhan.style.cssText = 'font-size:11px;color:#8a8078;margin-top:4px;line-height:1.3';
  o.append(nhan);

  const kq = document.createElement('div');
  kq.textContent = ma === 'dat' ? 'hiện được' : ma === 'hong' ? 'KHÔNG hiện' : 'đang thử';
  kq.style.cssText =
    'font-size:11px;margin-top:1px;font-weight:600;line-height:1.3;color:' +
    (ma === 'dat' ? '#3f6b8a' : ma === 'hong' ? '#8a3a2a' : '#8a8078');
  o.append(kq);

  return o;
}

function duongCuaKhoa(khoa) {
  if (khoa === 'thumb')  return driveThumbUrl(thuAnh.fileId, 400);
  if (khoa === 'lh3')    return driveLh3Url(thuAnh.fileId, 400);
  return dataUri(thuAnh.base64MayChu || '');
}

/**
 * Chạy một vòng thử đầy đủ: nén → tải lên → thử hiện ba đường.
 *
 * Đo THỜI GIAN từng chặng. Con số ấy quyết định được một việc mà con số dung
 * lượng không quyết định được: tải một tấm ảnh mất 2 giây thì gắn ảnh cho 60
 * người là hai phút ngồi chờ, và lúc đó cách làm phải khác.
 */
async function chayThuAnh(file) {
  thuAnh = trangThaiThuAnhRong();
  thuAnh.dangChay = true;
  thuAnh.dong.push({ nhan: 'Ảnh gốc', giaTri: file.name + '  ·  ' + moTaCo(file.size) });
  veLaiKhoiThuAnh();

  try {
    const t0 = Date.now();
    const nen = await compressImage(file);
    const tNen = Date.now() - t0;

    thuAnh.nenXong = nen;
    thuAnh.dong.push({
      nhan: 'Sau khi nén',
      giaTri: nen.rong + '×' + nen.cao + ' px  ·  ' + moTaCo(nen.byteNen) +
              '  ·  nén hết ' + tNen + ' ms',
    });
    thuAnh.dong.push({
      nhan: 'Chuỗi gửi lên',
      giaTri: nen.daiBase64.toLocaleString('vi-VN') + ' ký tự base64  ·  ' +
              moTaCo(nen.daiBase64),
    });
    veLaiKhoiThuAnh();

    const t1 = Date.now();
    const kq = await taiAnh(nen.base64, 'thu-buoc-28_' + stampTen() + '.jpg');
    const tTai = Date.now() - t1;

    if (!kq || !kq.ok) {
      thuAnh.loi = (kq && kq.loi) || 'Máy chủ không nhận ảnh mà không nói vì sao.';
      thuAnh.dangChay = false;
      veLaiKhoiThuAnh();
      return;
    }

    thuAnh.fileId = kq.fileId;
    thuAnh.dong.push({
      nhan: 'Đã lên Drive',
      giaTri: kq.ten + '  ·  ' + moTaCo(kq.coByte) + '  ·  gửi hết ' + tTai + ' ms',
    });
    thuAnh.dong.push({ nhan: 'Mã file', giaTri: kq.fileId });

    const q = await trangThaiQuyenAnh(kq.fileId).catch(() => null);
    if (q) {
      thuAnh.quyen = q.ok ? (q.chiaSe + ' / ' + q.vaiTro) : 'không đọc được quyền';
      thuAnh.dong.push({ nhan: 'Quyền chia sẻ', giaTri: thuAnh.quyen });
    }

    await thuBaDuong();
  } catch (e) {
    thuAnh.loi = e && e.message ? e.message : String(e);
  }

  thuAnh.dangChay = false;
  veLaiKhoiThuAnh();
}

/** Thử cả ba đường hiện ảnh, song song, trên cùng một tấm. */
async function thuBaDuong() {
  thuAnh.ketQua = { thumb: 'cho', lh3: 'cho', mayChu: 'cho' };
  veLaiKhoiThuAnh();

  const c = await layAnhBase64(thuAnh.fileId).catch(() => null);
  if (c && c.ok) {
    thuAnh.base64MayChu = c.base64;
    thuAnh.dong.push({
      nhan: 'Đường C · máy chủ',
      giaTri: 'đọc được ' + moTaCo(c.coByte) + ' từ ' + c.nguon,
    });
  } else {
    thuAnh.dong.push({
      nhan: 'Đường C · máy chủ',
      giaTri: (c && c.loi) || 'không đọc được',
    });
  }

  const [a, b, cc] = await Promise.all([
    hienDuoc(driveThumbUrl(thuAnh.fileId, 400)),
    hienDuoc(driveLh3Url(thuAnh.fileId, 400)),
    thuAnh.base64MayChu ? hienDuoc(dataUri(thuAnh.base64MayChu)) : Promise.resolve(false),
  ]);

  thuAnh.ketQua = {
    thumb:  a  ? 'dat' : 'hong',
    lh3:    b  ? 'dat' : 'hong',
    mayChu: cc ? 'dat' : 'hong',
  };
  veLaiKhoiThuAnh();
}

/**
 * Một đường dẫn có hiện ra ảnh thật hay không.
 *
 * ⚠ `onerror` KHÔNG PHẢI cách duy nhất hỏng. Google trả về một trang HTML báo
 * lỗi kèm mã 200 thì `<img>` vẫn báo `onload`, chỉ là kích thước bằng 0. Nên
 * phải xét cả `naturalWidth`. Và phải có hạn giờ: có ca không cái nào chạy cả,
 * để mãi thì phép thử treo mà không nói gì.
 */
function hienDuoc(duong, hanGiay = 12) {
  return new Promise((xong) => {
    if (!duong) { xong(false); return; }
    let daTraLoi = false;
    const tra = (v) => { if (!daTraLoi) { daTraLoi = true; xong(v); } };

    const im = new Image();
    im.onload  = () => tra(im.naturalWidth > 0 && im.naturalHeight > 0);
    im.onerror = () => tra(false);
    im.src = duong;
    setTimeout(() => tra(false), hanGiay * 1000);
  });
}

async function moCongKhaiRoiThuLai() {
  if (!thuAnh.fileId) return;
  thuAnh.dangChay = true;
  veLaiKhoiThuAnh();

  try {
    const kq = await moQuyenXemAnh(thuAnh.fileId);
    if (kq && kq.ok) {
      thuAnh.daMoCongKhai = true;
      thuAnh.dong.push({ nhan: 'Đã mở công khai', giaTri: kq.chiaSe });
      // Drive cần một nhịp để quyền mới có hiệu lực ở tầng phục vụ ảnh.
      await nghi(1500);
      await thuBaDuong();
    } else {
      thuAnh.loi = (kq && kq.loi) || 'Không mở được quyền công khai.';
    }
  } catch (e) {
    thuAnh.loi = e && e.message ? e.message : String(e);
  }

  thuAnh.dangChay = false;
  veLaiKhoiThuAnh();
}

async function donAnhThu() {
  if (!thuAnh.fileId) return;
  thuAnh.dangChay = true;
  veLaiKhoiThuAnh();

  let chu = '';
  try {
    const kq = await xoaAnhThu(thuAnh.fileId);
    chu = kq && kq.ok
      ? 'Đã cho tấm ảnh thử vào thùng rác Drive.'
      : 'Chưa dọn được: ' + ((kq && kq.loi) || 'máy chủ không nói vì sao');
  } catch (e) {
    chu = 'Chưa dọn được: ' + (e && e.message ? e.message : String(e));
  }

  thuAnh = trangThaiThuAnhRong();
  thuAnh.dong.push({ nhan: 'Dọn', giaTri: chu });
  veLaiKhoiThuAnh();
}

function nghi(ms) {
  return new Promise((xong) => setTimeout(xong, ms));
}

/** Dấu thời gian gọn để đặt tên file ảnh thử: `20-08-2026_1151`. */
function stampTen() {
  return stampNow().replace(/[\/\s:]/g, (k) => (k === '/' ? '-' : k === ' ' ? '_' : ''));
}

// ============================================================
// Khối "Rà soát dữ liệu" — chat 2.2
// ============================================================
//
// Cùng lý lẽ với khối bên trên: `domains/validate.js` mãi chat 2.3 mới có form
// nhập liệu gọi tới. Không có nút bấm thì bộ luật rà soát nằm đó không ai kiểm,
// và nó sẽ chỉ lộ mặt đúng lúc người trong họ đang gõ dở một bản ghi.
//
// HAI NÚT NÀY KHÔNG GHI GÌ XUỐNG DRIVE. Phép thử chặn chạy trên một BẢN SAO
// trong bộ nhớ; `state.tree` không bị đụng tới một chữ. Nhờ vậy nút bấm được cả
// khi người dùng chỉ có quyền xem — rà soát là việc đọc.

const SO_DONG_TOI_DA = 6;   // dài hơn thì màn hình điện thoại không đọc nổi

function veKhoiRaSoat(vao) {
  khoiRaSoat = document.createElement('div');
  khoiRaSoat.style.cssText = 'margin-top:20px';
  vao.append(khoiRaSoat);
  veLaiKhoiRaSoat();
  return khoiRaSoat;
}

/** @param {{chu:string, laLoi:boolean, dong?:string[]}} [ketQua] */
function veLaiKhoiRaSoat(ketQua) {
  const khoi = khoiRaSoat;
  if (!khoi) return;
  khoi.innerHTML = '';

  khoi.append(veNhanKhoi('Rà soát dữ liệu'));

  const coCay = !!(state.tree && state.index);

  const giaiThich = document.createElement('div');
  giaiThich.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078;margin-bottom:10px';
  giaiThich.textContent =
    'Chín phép rà soi ngày tháng và quan hệ trong gia phả. Người chỉ biết năm mất, ' +
    'hoặc chỉ biết năm sinh, thì phép rà bỏ qua chứ không báo lỗi — thiếu thông tin ' +
    'là chuyện bình thường của gia phả, không phải dữ liệu sai. Hai nút này chỉ đọc, ' +
    'không ghi gì xuống Google Drive.';
  khoi.append(giaiThich);

  const dangXem = state.index && state.focusPersonId
    ? state.index.personById.get(state.focusPersonId) : null;

  khoi.append(nut('Rà soát cả gia phả', false, coCay, raSoatCaCay));

  const oNut = document.createElement('div');
  oNut.style.cssText = 'margin-top:8px';
  oNut.append(nut('Thử phép chặn: năm mất trước năm sinh', false,
                  coCay && !!dangXem, () => thuPhepChan(dangXem)));
  khoi.append(oNut);

  if (ketQua) {
    khoi.append(veLoiNhan(ketQua.chu, ketQua.laLoi));
    for (const d of (ketQua.dong || [])) khoi.append(veDongRaSoat(d));
  }
}

/**
 * Rà cả cây và kể lại bằng câu người thường đọc được.
 *
 * Bản báo cáo LUÔN nói ra số phép "chưa kiểm được", không giấu đi. Câu
 * *"0 lỗi"* một mình có thể có nghĩa là gia phả sạch, mà cũng có thể có nghĩa
 * là chẳng phép nào rà nổi vì thiếu năm — hai tình trạng ngược nhau, cùng một
 * con số. Giấu phần chưa kiểm được là tự khen mình sạch nhờ chỗ mình chưa biết.
 */
function raSoatCaCay() {
  const kq = validateAll(state.tree, state.index, 'tree');
  const c  = kq.counts;

  const soNguoi = state.index.personById.size;
  const dau = kq.errors.length > 0
    ? 'Có ' + kq.errors.length + ' lỗi phải sửa trước khi lưu.'
    : (kq.warnings.length > 0
        ? 'Không có lỗi nào phải chặn, nhưng có ' + kq.warnings.length + ' chỗ đáng xem lại.'
        : 'Không tìm thấy lỗi nào, cũng không có chỗ nào đáng ngờ.');

  veLaiKhoiRaSoat({
    laLoi: kq.errors.length > 0,
    chu: dau + ' Đã soi ' + soNguoi + ' người bằng ' + c.total + ' phép rà: ' +
         c.ok + ' phép kết luận là ổn, ' + c.skip + ' phép chưa kiểm được vì ' +
         'người đó thiếu năm sinh hoặc năm mất.',
    dong: kq.errors.concat(kq.warnings).slice(0, SO_DONG_TOI_DA).map((m) => m.message),
  });
}

/**
 * Điểm dừng của chat 2.2, bấm được bằng ngón tay.
 *
 * Đặt năm sinh 1950 và năm mất 1940 lên một BẢN SAO của người đang xem, rồi hỏi
 * bộ luật rà soát xem có cho lưu không. Dùng số cố định chứ không lấy năm thật
 * của người đó, vì rất nhiều người trong gia phả không có năm nào cả — phép thử
 * phải chạy được với mọi người trung tâm.
 */
function thuPhepChan(nguoi) {
  const banSao = JSON.parse(JSON.stringify(nguoi));
  banSao.birth = { iso: '1950', raw: '1950', place: '' };
  banSao.death = { iso: '1940', raw: '1940', place: '' };
  banSao.living = false;

  const kq = validateAll(state.tree, state.index, 'person', { person: banSao });
  const chan = kq.errors.filter((m) => m.check === 'checkDeathAfterBirth');

  if (chan.length > 0) {
    veLaiKhoiRaSoat({
      laLoi: false,
      chu: 'Đúng như phải thế: thử đặt cho ' + fullName(nguoi) +
           ' năm sinh 1950 và năm mất 1940 thì app KHÔNG cho lưu. ' +
           'Bản gia phả thật không bị đụng tới — đây chỉ là bản thử trong bộ nhớ.',
      dong: chan.map((m) => m.message),
    });
  } else {
    veLaiKhoiRaSoat({
      laLoi: true,
      chu: 'HỎNG: năm mất 1940 đứng trước năm sinh 1950 mà app vẫn cho lưu. ' +
           'Phép chặn trong domains/validate.js không chạy.',
    });
  }
}

function veDongRaSoat(chu) {
  const d = document.createElement('div');
  d.textContent = '• ' + chu;
  d.style.cssText =
    'margin-top:6px;padding:7px 10px;font-size:12px;line-height:1.5;' +
    'border-radius:8px;background:#faf8f5;border:1px solid #f0ebe4;color:#5c554e';
  return d;
}

// ============================================================
// Khối "Tài khoản và quyền" — chỉ để đọc
// ============================================================

/**
 * Phân quyền do DANH SÁCH CHIA SẺ TRÊN DRIVE quyết định, Google thực thi ở
 * tầng máy chủ; app không giữ bảng phân quyền riêng. Khối này chỉ ĐỌC lại
 * những gì máy chủ vừa nói, không phải chỗ sửa quyền — và phải viết sao cho
 * không ai hiểu nhầm là sửa được ở đây.
 */
function veKhoiPhien(vao) {
  const phien = state.phien;
  if (!phien) return;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Tài khoản và quyền'));

  const bang = document.createElement('div');
  bang.style.cssText = 'display:flex;flex-direction:column;gap:1px';
  hang(bang, 'Đăng nhập', phien.email);
  hang(bang, 'Dòng họ', phien.tenHo);
  hang(bang, 'Vai trò', phien.vaiTro);
  hang(bang, 'Quyền', quyenBangChu(phien));
  hang(bang, 'Người quản lý', phien.nguoiQuanLy);
  khoi.append(bang);

  const nhac = document.createElement('div');
  nhac.textContent =
    'Quyền do danh sách chia sẻ của file trên Google Drive quyết định, ' +
    'không sửa được trong app. Cần đổi thì nhờ người quản lý.';
  nhac.style.cssText = 'margin-top:8px;font-size:12px;line-height:1.5;color:#8a8078';
  khoi.append(nhac);

  vao.append(khoi);
}

function quyenBangChu(phien) {
  if (phien.suaDuoc) return 'Xem và sửa';
  if (phien.docDuoc) return 'Chỉ xem';
  return '';
}

// ============================================================
// Mấy mẩu dùng chung
// ============================================================

function veNhanKhoi(chu) {
  const n = document.createElement('div');
  n.textContent = chu;
  n.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078;margin-bottom:6px';
  return n;
}

function veTheNho(p) {
  const the = document.createElement('div');
  the.style.cssText =
    'padding:9px 11px;border:1px solid #e6e0d8;border-radius:8px;background:#faf8f5';

  const ten = document.createElement('div');
  ten.textContent = fullName(p);
  ten.style.cssText = 'font-size:14px';
  the.append(ten);

  const song = doiSongNguoi(p);
  const phu = [song, p.id].filter(coGiaTri).join('  ·  ');
  const d = document.createElement('div');
  d.textContent = phu;
  d.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px';
  the.append(d);

  return the;
}

/** Hàng nhãn — giá trị. Trống thì ẩn cả hàng, đúng luật chung của app. */
function hang(bang, nhan, giaTri) {
  if (!coGiaTri(giaTri)) return;
  const h = document.createElement('div');
  h.style.cssText =
    'display:flex;gap:10px;align-items:baseline;padding:6px 0;border-top:1px solid #f0ebe4';

  const n = document.createElement('div');
  n.textContent = nhan;
  n.style.cssText = 'flex:0 0 100px;font-size:12px;color:#8a8078';

  const g = document.createElement('div');
  g.textContent = String(giaTri).trim();
  g.style.cssText = 'flex:1 1 auto;font-size:14px;word-break:break-word';

  h.append(n, g);
  bang.append(h);
}

function nut(chu, chinh, batDuoc, chay_) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'width:100%;min-height:42px;padding:8px 14px;font-size:14px;font-family:inherit;' +
    'border-radius:9px;touch-action:manipulation;line-height:1.35;' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45') + ';' +
    (chinh
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  if (batDuoc) b.addEventListener('click', chay_);
  return b;
}

function veLoiNhan(chu, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:10px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4');
  return d;
}
