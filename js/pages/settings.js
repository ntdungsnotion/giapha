// ============================================================
// giapha · js/pages/settings.js
// Vai trò  : Màn hình Cài đặt — người trung tâm mặc định, tự kiểm ghi và rà soát
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, services/{gas,repo}, domains/validate, utils/{text,date}
// Phiên bản: 1.4.0 · Cập nhật: 20/08/2026 14:25
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
import { coMayChu, datNguoiTrungTamMacDinh, xoaNguoiTrungTamMacDinh } from '../services/gas.js';
import { luuCay, suaDuoc } from '../services/repo.js';
import { fullName, coGiaTri, doiSongNguoi } from '../utils/text.js';
import { stampNow } from '../utils/date.js';
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
  khoiRaSoat  = null;
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
