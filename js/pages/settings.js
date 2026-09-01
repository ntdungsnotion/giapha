// ============================================================
// giapha · js/pages/settings.js
// Vai trò  : Màn hình Cài đặt — người trung tâm mặc định, tuỳ chọn hiển thị,
//            đường sang Chọn gia phả · Sao lưu & khôi phục · Xuất/Nhập GEDCOM
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, services/gas, utils/text, pages/export-image
// Phiên bản: 1.21.0 · Cập nhật: 01/09/2026 08:20
// ============================================================
//
// Màn hình này tồn tại vì MỘT việc: đặt và bỏ người trung tâm mặc định của
// riêng tài khoản đang đăng nhập. Ba khối còn lại chỉ để ĐỌC hoặc để đổi một
// tuỳ chọn hiển thị — không khối nào ghi gì xuống Drive.
//
// --- HAI KHỐI ĐÃ GỠ, và vì sao (bước 30) --------------------------------
//
// Cả hai dựng ra để TỰ KIỂM trong lúc xây, không phải để người trong họ dùng.
// Chủ dự án nhìn màn hình thật và nói đúng một câu: *"người dùng không cần cái
// này"*.
//
// 1. **"Thử ghi vào gia phả"** (bước 16) — dựng khi `luuCay()` chưa có nơi nào
//    gọi, để đường ghi không nằm im không ai kiểm. Nay `luuCay()` chạy qua chín
//    đường khác nhau, và cái nút ấy chỉ còn **ghi rác vào ghi chú** của người
//    đang xem: mỗi lần bấm một dấu `[thử ghi lúc …]`.
//
// 2. **"Rà soát dữ liệu"** (bước 17) — hai nút: *Rà soát cả gia phả* và
//    *Thử phép chặn: năm mất trước năm sinh*. Cái thứ hai rõ ràng là phép thử.
//    Cái thứ nhất là chức năng thật, nhưng nó **chỉ KỂ TÊN lỗi mà không có
//    đường sửa** — người dùng đọc xong một danh sách rồi đứng đó. Chỗ đúng của
//    nó là màn hình *Người mồ côi · Dọn rác* — **việc 6 của giai đoạn 3** — nơi
//    mỗi dòng lỗi dẫn thẳng tới một việc làm được ngay tại đó.
//
// ⚠ **Gỡ nút KHÔNG gỡ phép rà.** Chín luật của `domains/validate.js` vẫn chạy
// **tự động mỗi lần lưu** từ bước 18 — `person-edit.handleSave()` gọi
// `validateAll()` trước khi ghi, sai ngày tháng là app chặn ngay tại form. Thứ
// mất đi chỉ là chỗ chạy TAY trên cả cây.
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
// `gas.coMayChu()` trả false. Lúc đó màn hình vẫn mở, vẫn đọc được, nhưng NÚT GHI
// — nút đặt/bỏ người trung tâm mặc định — phải MỜ VÀ NÓI RÕ VÌ SAO; nút bấm vào
// không xảy ra gì là thứ làm người dùng nghĩ app hỏng.

import { state, notify } from '../state.js';
import { coMayChu, datNguoiTrungTamMacDinh, xoaNguoiTrungTamMacDinh } from '../services/gas.js';
import { fullName, coGiaTri, doiSongNguoi } from '../utils/text.js';
import { veLinkTai, inAnhRaster, dpiConDungDuoc, laManHinhMayTinh, DAI_DPI }
  from './export-image.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

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

/**
 * Mở màn hình Cài đặt.
 *
 * @param {{onDoiMacDinh?:function, onDoiHienThi?:function,
 *          onMoChonGiaPha?:function, onMoSaoLuu?:function,
 *          onMoXuatGedcom?:function, onDanhSachNguoi?:function,
 *          onDanhSachGiaDinh?:function, onXuatAnhPng?:function,
 *          onInSoDo?:function, onXuatAnhDpi?:function,
 *          onXuatPdfDpi?:function, onCoSoDo?:function}} [xuLy]
 *        chạy sau khi đặt hoặc bỏ mặc định thành công. Dùng callback thay vì
 *        `import` ngược `tree-view.js` — hai file cùng lớp `pages`, import
 *        vòng tròn thì một trong hai sẽ thấy hàm của file kia là `undefined`.
 *        `onDoiHienThi` chạy sau khi đổi một công tắc trong khối Hiển thị —
 *        nơi gọi phải VẼ LẠI sơ đồ, vì công tắc ngày giỗ đổi cả chiều cao ô.
 *        `onMoChonGiaPha` mở màn hình Chọn gia phả, `onMoSaoLuu` mở màn hình
 *        Sao lưu & khôi phục, `onMoXuatGedcom` mở màn hình Xuất GEDCOM, hai
 *        `onDanhSach*` mở hai danh sách của khối Quản lý gia phả. `onXuatAnhPng`
 *        (việc 12) trả về `Promise<{blob, tenFile}>` — dựng ảnh PNG của sơ đồ
 *        đang hiện, KHÔNG tự tải về (xem `export-image.js`). `onInSoDo` mở
 *        hộp thoại in của trình duyệt — gọi không tham số thì co vừa 1 trang
 *        A4, gọi với một số (mm) thì bật chế độ khổ LỚN đúng bề ngang ấy,
 *        bề dài tự tính theo tỷ lệ sơ đồ (khối "In khổ lớn" tự thêm khi có
 *        callback này, không cần cấu hình riêng).
 *
 *        `onXuatAnhDpi(rongCm, dpi)` trả `Promise<{blob, tenFile, w, h,
 *        rongMm, caoMm}>` — dựng ảnh RASTER đúng khổ giấy + độ phân giải yêu
 *        cầu (đường thứ ba, xem `veKhoiAnhDpi`). `onXuatPdfDpi(rongCm, dpi)`
 *        cùng khuôn ấy nhưng trả về file PDF app TỰ DỰNG — khổ giấy nằm trong
 *        chính file nên không hộp thoại in nào ghi đè được (sự cố novaPDF
 *        01/09/2026). `onCoSoDo()` trả
 *        `{vbW, vbH}` (hoặc `null`) — TỶ LỆ sơ đồ đang hiện, chỉ để khối ấy
 *        tự biết mức DPI nào vượt trần canvas mà mờ đi TRƯỚC khi người dùng
 *        bấm. Thiếu `onCoSoDo` thì khối vẫn mọc, chỉ tính chặt hơn (coi sơ đồ
 *        là hình vuông).
 *
 *        ⚠ **KHÔNG truyền một callback thì khối của nó KHÔNG MỌC RA**, và đó
 *        là cơ chế im lặng — màn hình vẫn mở bình thường, chỉ thiếu mất một
 *        khối. Bài kiểm và bộ chụp ảnh vì thế phải truyền ĐỦ, kể cả khi chúng
 *        chỉ là hàm rỗng. Đã có lần thiếu bốn cái và `km-cai-dat.png` chụp
 *        một màn Cài đặt thiếu ba khối suốt nhiều bước mà không ai thấy
 *        (sửa 28/08/2026).
 */
export function openSettings(xuLy = {}) {
  closeSettings();
  xuLyNgoai = xuLy;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.id = 'giapha-cai-dat';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Cài đặt';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  veKhoiQuanLy(hop);
  veKhoiMacDinh(hop);
  veKhoiHienThi(hop);
  veKhoiGiaPha(hop);
  veKhoiSaoLuu(hop);
  veKhoiXuat(hop);
  veKhoiNhap(hop);
  veKhoiPhien(hop);

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin:18px auto 0;display:block;width:100%;height:42px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
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
      'Chưa nối được máy chủ nên nút trên chưa bấm được. Hãy mở gia phả bằng ' +
      'đúng đường link thường dùng.',
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
// Khối "Hiển thị" — bước 30
// ============================================================
//
// --- Vì sao công tắc NGÀY GIỖ chuyển về đây ------------------------------
//
// Bước 28 đặt nó trong cột *"Đời dưới"* ở góc dưới trái sơ đồ, ngay dưới công
// tắc dâu/rể. Chỗ ấy sai hai lần, và chủ dự án tìm ra bằng cách **đi tìm mà
// không thấy** (20/08/2026):
//
// 1. Cột ấy **mặc định thu lại**, phải bấm nút tóm tắt xổ ra mới thấy — tức
//    một tuỳ chọn nằm sau một cú bấm mà không có gì báo là nó nằm ở đó.
// 2. Cột ấy là **bộ lọc phạm vi đời** — *vẽ tới đời thứ mấy*. Ngày giỗ không
//    phải phạm vi, nó là **thứ hiện trên mỗi ô**. Đứng lẫn giữa các nấc lọc là
//    sai loại, và sai loại thì người dùng không đoán ra được nó ở đâu.
//
// Công tắc dâu/rể thì Ở LẠI cột kia, có chủ ý: nó đổi **AI được vẽ**, đúng
// nghĩa một bộ lọc phạm vi. Hai công tắc trông giống nhau mà thuộc hai loại
// khác nhau — đó chính là chỗ đã làm lẫn.
//
// ⚠ Bài học loại này khác mọi lần *"nhìn ảnh mới thấy"* trước đó: chức năng
// **chạy đúng, có phép kiểm xanh**. Thứ hỏng là **chỗ đứng**. Bộ kiểm không có
// cách nào bắt được, chỉ người dùng thật mới bắt được.

function veKhoiHienThi(vao) {
  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Hiển thị'));

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hopChon = document.createElement('input');
  hopChon.type = 'checkbox';
  hopChon.id = 'giapha-ct-ngay-gio';
  hopChon.checked = state.hienNgayGio === true;
  hopChon.style.cssText = 'width:18px;height:18px;accent-color:#2a2622';
  hopChon.addEventListener('change', () => {
    state.hienNgayGio = hopChon.checked;
    notify();
    if (xuLyNgoai.onDoiHienThi) xuLyNgoai.onDoiHienThi();
  });

  const chu = document.createElement('span');
  chu.textContent = 'Hiện hàng ngày giỗ dưới mỗi ô';

  nhan.append(hopChon, chu);
  khoi.append(nhan);

  // Công tắc này đổi CHIỀU CAO Ô, không chỉ đổi chữ — vẫn phải nói ra một câu,
  // vì bật lên là cả sơ đồ dài thêm.
  //
  // ⚠ Chữ đã RÚT GỌN 22/08/2026. Bản cũ kể luôn cả *"sơ đồ dài thêm khoảng một
  // phần tám"* và *"vì thế mặc định tắt"* — đó là lý lẽ THIẾT KẾ, viết cho
  // người đang xây app chứ không cho người đang dùng. Phần ấy chuyển sang
  // `tai-lieu/GHI-CHU-HUONG-DAN_V01.md`, chỗ dành cho bản hướng dẫn sử dụng.
  const nhac = document.createElement('div');
  nhac.textContent =
    'Bật lên thì mọi ô cao thêm một hàng, kể cả ô chưa có ngày giỗ.';
  nhac.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
  khoi.append(nhac);

  vao.append(khoi);
  return khoi;
}

// ============================================================
// Khối "Gia phả" — việc 9b, nửa giao diện của bước 52
// ============================================================
//
// Từ 28/08/2026 app mở được NHIỀU cây, và tới hôm ấy thì đường duy nhất để đổi
// là sửa `FILE_ID` trong `Config.gs` rồi triển khai lại — việc của người xây
// app, không phải của người dùng. Khối này là cửa vào màn hình chọn.
//
// ⚠ Nó đứng DƯỚI ba khối kia, khác hẳn "Quản lý gia phả": đổi cây là việc vài
// tháng làm một lần, và bấm nhầm thì cả app nhảy sang một gia phả khác. Việc
// hiếm mà hậu quả rộng thì không đặt ở chỗ tay hay chạm qua.
//
// Nút KHÔNG mờ với người chỉ có quyền xem: danh sách do Drive lọc theo quyền
// của chính họ, nên họ mở màn hình ấy ra là thấy đúng phần của mình — và người
// chỉ được chia sẻ một cây vẫn cần biết mình đang mở cây nào.

function veKhoiGiaPha(vao) {
  if (!xuLyNgoai.onMoChonGiaPha) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Gia phả'));

  const dangMo = state.phien && state.phien.tenFileDuLieu;
  const giaiThich = document.createElement('div');
  giaiThich.textContent =
    (dangMo ? 'Đang mở ' + dangMo + '. ' : '') +
    'Đổi sang một cây khác được chia sẻ cho bạn. Lựa chọn này của riêng tài ' +
    'khoản bạn.';
  giaiThich.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-bottom:10px';
  khoi.append(giaiThich);

  const b = nut('Chọn gia phả khác', false, true, () => xuLyNgoai.onMoChonGiaPha());
  b.dataset.viec = 'chon-gia-pha';
  khoi.append(b);

  vao.append(khoi);
  return khoi;
}

// ============================================================
// Khối "Sao lưu & khôi phục" — việc 7
// ============================================================
//
// Chỉ MỘT cái nút, mở sang màn hình riêng (`pages/backup.js`). Không nhúng
// thẳng danh sách bản sao lưu vào đây, và có lý do: màn hình Cài đặt mở ra là
// đọc ngay ba khối — nhúng vào nghĩa là MỖI LẦN mở Cài đặt lại gọi máy chủ
// liệt kê cả thư mục Sao_luu, cho một việc mỗi tháng làm một lần.
//
// ⚠ Nút này KHÔNG mờ đi với người chỉ có quyền xem, và đó là chủ ý: bên trong
// có nút *Sao lưu ngay* — cất một bản phòng hờ không phải là sửa gia phả. Thứ
// chặn theo quyền nằm ở máy chủ, và câu từ chối của nó nói rõ vì sao.

function veKhoiSaoLuu(vao) {
  if (!xuLyNgoai.onMoSaoLuu) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Sao lưu & khôi phục'));

  // Không có dòng giải thích: tên nút đã nói đủ, và màn hình mở ra giải thích
  // lại lần nữa (chủ dự án bỏ 28/08/2026). `margin-top:4px` giữ đúng khoảng
  // cách nhãn–nút của mấy khối bên cạnh, chỗ dòng giải thích từng chiếm.
  const b = nut('Mở Sao lưu & khôi phục', false, true,
                () => xuLyNgoai.onMoSaoLuu());
  b.style.marginTop = '4px';
  khoi.append(b);

  vao.append(khoi);
  return khoi;
}

// ============================================================
// Khối "Xuất dữ liệu" — việc 10
// ============================================================
//
// Đứng NGAY SAU *Sao lưu & khôi phục*, và đứng cạnh nhau là có chủ ý: cả hai
// đều là *mang gia phả ra khỏi app*. Nhưng chúng khác nhau ở đúng một điều mà
// người dùng cần phân biệt được, nên chữ trên nút phải nói ra:
//
// - **Sao lưu** cất một bản Ở LẠI TRÊN DRIVE, để hôm nào lỡ tay thì lấy về.
// - **Xuất GEDCOM** đưa một bản RA KHỎI DRIVE, sang phần mềm khác, sang máy
//   khác — và app không biết gì về nó nữa.
//
// ⚠ Nút này KHÔNG mờ với người chỉ có quyền xem, cùng lý lẽ của nút *Sao lưu*:
// xuất là việc CHỈ ĐỌC, nó không sửa một chữ nào trong gia phả.

function veKhoiXuat(vao) {
  if (!xuLyNgoai.onMoXuatGedcom && !xuLyNgoai.onXuatAnhPng && !xuLyNgoai.onInSoDo
      && !xuLyNgoai.onXuatAnhDpi) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Xuất dữ liệu'));

  if (xuLyNgoai.onMoXuatGedcom) {
    const b = nut('Xuất ra file GEDCOM (.ged)', false, true,
                  () => xuLyNgoai.onMoXuatGedcom());
    b.dataset.viec = 'xuat-gedcom';
    b.style.marginTop = '4px';
    khoi.append(b);
  }

  veKhoiXuatAnh(khoi);

  vao.append(khoi);
  return khoi;
}

// ------------------------------------------------------------
// Việc 12 — hai nút "xuất ảnh" bên trong khối Xuất dữ liệu
// ------------------------------------------------------------
//
// Đứng CHUNG khối với GEDCOM (không phải một khối riêng): cả ba đều là
// "mang gia phả ra khỏi app", đúng phân loại đã có. Nhưng chữ giải thích
// phải nói ra điều làm chúng KHÁC nhau — GEDCOM xuất cả gia phả, ảnh chỉ
// chụp đúng phần sơ đồ đang hiện trên màn hình — cùng bài học đã áp cho cặp
// Sao lưu / Xuất GEDCOM ở trên.
//
// ⚠ Gate hai nút này theo `onXuatAnhPng`/`onInSoDo` RIÊNG với `onMoXuatGedcom`
// — ba callback độc lập, thiếu một cái không kéo mất hai cái kia.
function veKhoiXuatAnh(khoi) {
  if (!xuLyNgoai.onXuatAnhPng && !xuLyNgoai.onInSoDo && !xuLyNgoai.onXuatAnhDpi) return;

  const chu = document.createElement('div');
  chu.textContent = 'Ảnh và PDF dưới đây chỉ chụp đúng PHẦN SƠ ĐỒ ĐANG HIỆN '
                   + 'trên màn hình (theo đúng phạm vi đời đang chọn) — không '
                   + 'phải toàn bộ gia phả như file GEDCOM ở trên.';
  chu.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:10px';
  khoi.append(chu);

  if (xuLyNgoai.onXuatAnhPng) {
    const ketQua = document.createElement('div');

    const nutPng = nut('Chụp ảnh sơ đồ (.png)', false, true, async () => {
      nutPng.disabled = true;
      nutPng.style.opacity = '0.6';
      nutPng.style.cursor = 'wait';
      ketQua.textContent = 'Đang tạo ảnh...';
      ketQua.style.cssText = 'font-size:13px;color:#8a8078;margin-top:8px';
      try {
        const anh = await xuLyNgoai.onXuatAnhPng();
        ketQua.textContent = '';

        // ⚠ NÓI RA cỡ ảnh, kể cả khi đẹp. Bản trước im lặng, nên hôm
        // 31/08/2026 một bản 4096×304 (cả cây thành hàng chấm) đi thẳng về
        // máy chủ dự án mà app không hé một chữ nào là nó vừa bóp ảnh lại.
        const doDuoc = document.createElement('div');
        doDuoc.dataset.viec = 'co-anh-png';
        doDuoc.textContent = 'Ảnh ' + anh.w + '×' + anh.h + ' điểm ảnh'
          + (anh.tyLe < 1
             ? ' — ⚠ NHỎ HƠN sơ đồ trên màn hình (sơ đồ quá lớn so với mức '
               + 'trình duyệt dựng nổi). Muốn nét hơn thì dùng "Ảnh độ phân '
               + 'giải cao" bên dưới, hoặc thu bớt số đời đang hiện.'
             : '.');
        doDuoc.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:8px';
        ketQua.append(doDuoc);

        ketQua.append(veLinkTai(anh.blob, anh.tenFile, 'Tải ảnh PNG về máy'));
      } catch (e) {
        ketQua.textContent = 'Không tạo được ảnh: ' + (e && e.message ? e.message : String(e));
      } finally {
        nutPng.disabled = false;
        nutPng.style.opacity = '1';
        nutPng.style.cursor = 'pointer';
      }
    });
    nutPng.dataset.viec = 'xuat-anh-png';
    nutPng.style.marginTop = '8px';
    khoi.append(nutPng, ketQua);
  }

  if (xuLyNgoai.onInSoDo) {
    const nutIn = nut('In sơ đồ (lưu PDF từ hộp thoại in)', false, true,
                       () => xuLyNgoai.onInSoDo());
    nutIn.dataset.viec = 'in-so-do';
    nutIn.style.marginTop = '8px';
    khoi.append(nutIn);

    veKhoiInKhoLon(khoi);
  }

  // Gate RIÊNG với `onInSoDo` — đường ảnh raster độ phân giải cao không dùng
  // chung một callback nào với hai nút trên, thiếu cái này không kéo mất cái kia.
  veKhoiAnhDpi(khoi);
}

/**
 * In khổ LỚN — áp phích, bản vẽ kỹ thuật. Thêm 31/08/2026 sau khi chủ dự án
 * đối chiếu MapInfo/MicroStation (đã ĐO trước khi xây, xem
 * `kiem-thu/do-khong-lon.mjs` và ghi chú đầu `export-image.js`).
 *
 * ⚠ **Chỉ hỏi MỘT số — bề ngang.** Hỏi thêm bề cao rồi để người dùng tự gõ
 * là mời họ BÓP MÉO sơ đồ nếu hai số không đúng tỷ lệ; `inSoDo()` tự tính bề
 * cao theo đúng tỷ lệ sơ đồ đang có (như máy in cuộn: khổ rộng cố định theo
 * cuộn giấy, khổ dài cắt theo nội dung).
 */
function veKhoiInKhoLon(khoi) {
  const boc = document.createElement('div');
  boc.style.cssText =
    'margin-top:10px;padding:10px;border:1px solid #e6e0d8;border-radius:8px;' +
    'background:#faf8f5';

  const nhan = document.createElement('label');
  nhan.textContent = 'In khổ LỚN (áp phích, bản vẽ) — bề ngang khổ giấy, cm:';
  nhan.style.cssText = 'display:block;font-size:12px;color:#8a8078;margin-bottom:6px';
  boc.append(nhan);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:8px;align-items:stretch';

  const oNhap = document.createElement('input');
  oNhap.type = 'number';
  oNhap.min = '10';
  oNhap.max = '800';   // đã ĐO an toàn tới 800cm (8m) — xem do-khong-lon.mjs
  oNhap.step = '1';
  oNhap.value = '100';
  oNhap.dataset.viec = 'rong-kho-lon-cm';
  oNhap.style.cssText =
    'width:80px;min-height:38px;padding:6px 8px;font-size:14px;font-family:inherit;' +
    'border-radius:8px;border:1px solid #e6e0d8;box-sizing:border-box';

  const nutInLon = nut('In khổ lớn (PDF)', false, true, () => {
    const cm = Number(oNhap.value);
    if (!(cm > 0)) { oNhap.focus(); return; }
    xuLyNgoai.onInSoDo(cm * 10);   // cm -> mm
  });
  nutInLon.dataset.viec = 'in-kho-lon';
  nutInLon.style.flex = '1';

  hang.append(oNhap, nutInLon);
  boc.append(hang);

  const giaiThich = document.createElement('div');
  // ⚠ Câu này sửa 01/09/2026 sau sự cố novaPDF: bản cũ nói "chọn Lưu thành
  // PDF HOẶC máy in PDF ảo" như thể hai đường ngang nhau. KHÔNG ngang nhau —
  // chỉ "Lưu thành PDF" của Chrome mới nghe khổ giấy app đặt. Xem khối
  // "SỰ CỐ novaPDF" ở đầu `export-image.js`.
  giaiThich.textContent =
    'Bề dài tự tính theo đúng tỷ lệ sơ đồ, không bóp méo. ⚠ Trong hộp thoại ' +
    'in phải chọn đúng "Lưu thành PDF" (Save as PDF) của trình duyệt thì mới ' +
    'ra đúng khổ trên. Nếu chọn một máy in PDF khác (novaPDF, Microsoft Print ' +
    'to PDF…) thì khổ giấy do chính máy in ấy quyết định — phải vào cài đặt ' +
    'của nó đặt khổ tuỳ chỉnh trước, không thì sơ đồ sẽ co lại vừa khổ mặc ' +
    'định (thường là A4/Letter). Ảnh đại diện thật có thể mờ ở khổ lớn — chữ ' +
    'và đường kẻ vẫn nét.';
  giaiThich.style.cssText = 'font-size:11px;line-height:1.5;color:#8a8078;margin-top:6px';
  boc.append(giaiThich);

  khoi.append(boc);
}

/**
 * Ảnh RASTER độ phân giải cao — đường thứ ba, thêm 31/08/2026 theo đúng câu
 * chủ dự án đặt ra: *"cho chọn máy in PDF trên máy tính + khổ giấy máy in ấy
 * cho phép, độ phân giải 75–1200 DPI, sơ đồ co vừa khổ; không áp dụng cho
 * điện thoại"*.
 *
 * Vì sao là một khối RIÊNG chứ không thêm ô DPI vào khối "In khổ lớn" ngay
 * trên: hai khối in ra HAI THỨ khác hẳn nhau, và người dùng phải phân biệt
 * được — đúng bài học của cặp "Sao lưu" / "Xuất GEDCOM".
 *
 *   · **In khổ lớn** in SVG sống → PDF **vector**: nét ở mọi cỡ phóng, file
 *     nhẹ, chạy tới khổ 8 mét (đã đo), nhưng KHÔNG có DPI để chọn.
 *   · **Khối này** dựng một tấm ảnh **raster** đúng số điểm ảnh yêu cầu — đó
 *     là thứ mà máy in PDF ảo và tiệm in đòi khi họ nói "gửi file 600 DPI".
 *
 * ⚠ **Ô DPI mờ đi những mức KHÔNG dựng nổi, ngay khi đổi bề ngang khổ giấy.**
 * Cho chọn hết rồi vỡ lúc bấm là đúng thứ phải tránh: trần canvas không phải
 * con số tròn ai cũng đoán được (268 triệu điểm ảnh — A0 chỉ lên tới 300 DPI,
 * A4 lên được tận 1200 DPI), và ở trên trần thì trình duyệt KHÔNG báo lỗi mà
 * lặng lẽ trả về ảnh rỗng. Xem `kiem-thu/do-canvas-lon.mjs`.
 *
 * ⚠ **Chỉ vẽ trên MÁY TÍNH.** Trên điện thoại khối này không mọc ra — không
 * có máy in PDF ảo để chọn khổ, và một canvas trăm triệu điểm ảnh trên điện
 * thoại là chuyện khác hẳn trên máy để bàn.
 */
function veKhoiAnhDpi(khoi) {
  if (!xuLyNgoai.onXuatAnhDpi) return;
  if (!laManHinhMayTinh()) return;

  const boc = document.createElement('div');
  boc.dataset.viec = 'khoi-anh-dpi';
  boc.style.cssText =
    'margin-top:10px;padding:10px;border:1px solid #e6e0d8;border-radius:8px;' +
    'background:#faf8f5';

  const nhan = document.createElement('label');
  nhan.textContent = 'Ảnh độ phân giải cao (gửi máy in PDF, tiệm in) — bề ngang khổ giấy, cm:';
  nhan.style.cssText = 'display:block;font-size:12px;color:#8a8078;margin-bottom:6px';
  boc.append(nhan);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:8px;align-items:stretch;flex-wrap:wrap';

  const oNhap = document.createElement('input');
  oNhap.type = 'number';
  oNhap.min = '5';
  oNhap.max = '800';
  oNhap.step = '1';
  oNhap.value = '84';   // đúng bề ngang khổ A0 (841mm) — khổ tiệm in hay nhận nhất
  oNhap.dataset.viec = 'rong-anh-dpi-cm';
  oNhap.style.cssText =
    'width:80px;min-height:38px;padding:6px 8px;font-size:14px;font-family:inherit;' +
    'border-radius:8px;border:1px solid #e6e0d8;box-sizing:border-box';

  const oDpi = document.createElement('select');
  oDpi.dataset.viec = 'chon-dpi';
  oDpi.style.cssText =
    'flex:1;min-width:150px;min-height:38px;padding:6px 8px;font-size:14px;' +
    'font-family:inherit;border-radius:8px;border:1px solid #e6e0d8;box-sizing:border-box';
  for (const dpi of DAI_DPI) {
    const o = document.createElement('option');
    o.value = String(dpi);
    o.textContent = dpi + ' DPI';
    oDpi.append(o);
  }
  oDpi.value = '300';

  hang.append(oNhap, oDpi);
  boc.append(hang);

  const canhBao = document.createElement('div');
  canhBao.dataset.viec = 'canh-bao-dpi';
  canhBao.style.cssText = 'font-size:11px;line-height:1.5;color:#8a8078;margin-top:6px';
  boc.append(canhBao);

  const ketQua = document.createElement('div');

  /**
   * Mờ những mức DPI vượt trần canvas với bề ngang đang gõ, và kéo lựa chọn
   * hiện tại về mức cao nhất còn dùng được nếu nó vừa bị mờ.
   *
   * Tỷ lệ sơ đồ lấy qua callback `onCoSoDo` — màn hình này không được chạm
   * vào `svgEl` (của `tree-view.js`). Không có callback thì coi sơ đồ VUÔNG
   * (tỷ lệ 1:1): đó là giả thiết CHẶT NHẤT, thà mờ nhầm một mức còn dùng được
   * hơn là cho chọn một mức sẽ vỡ.
   */
  function capNhatDpi() {
    const co = xuLyNgoai.onCoSoDo ? xuLyNgoai.onCoSoDo() : null;
    const vbW = co && co.vbW > 0 ? co.vbW : 1;
    const vbH = co && co.vbH > 0 ? co.vbH : 1;
    const cm = Number(oNhap.value);
    const dungDuoc = dpiConDungDuoc(cm, vbW, vbH);

    for (const o of oDpi.options) {
      const duoc = dungDuoc.indexOf(Number(o.value)) !== -1;
      o.disabled = !duoc;
      o.textContent = o.value + ' DPI' + (duoc ? '' : ' — quá lớn, không dựng nổi');
    }

    if (!dungDuoc.length) {
      oDpi.disabled = true;
      canhBao.textContent =
        'Khổ ' + (cm > 0 ? cm + 'cm' : 'này') + ' quá lớn: không mức nào trong ' +
        '75–1200 DPI dựng nổi thành ảnh. Hãy giảm bề ngang, hoặc dùng "In khổ ' +
        'lớn (PDF)" ở trên — đường ấy là PDF vector nên không có trần này.';
      return;
    }

    oDpi.disabled = false;
    if (dungDuoc.indexOf(Number(oDpi.value)) === -1) {
      oDpi.value = String(dungDuoc[dungDuoc.length - 1]);
    }
    const caoNhat = dungDuoc[dungDuoc.length - 1];
    canhBao.textContent = caoNhat < DAI_DPI[DAI_DPI.length - 1]
      ? 'Ở bề ngang ' + cm + 'cm, trình duyệt chỉ dựng nổi tới ' + caoNhat +
        ' DPI — các mức cao hơn đã mờ đi. Cần nét hơn nữa thì dùng "In khổ ' +
        'lớn (PDF)" ở trên: PDF vector nét ở mọi cỡ phóng.'
      : 'Bề dài tự tính theo đúng tỷ lệ sơ đồ, không bóp méo. Ảnh càng nhiều ' +
        'DPI càng lâu và càng nặng — 300 DPI đã đủ cho hầu hết tiệm in.';
  }

  oNhap.addEventListener('input', capNhatDpi);
  capNhatDpi();

  const nutTao = nut('Tạo ảnh độ phân giải cao', false, true, async () => {
    nutTao.disabled = true;
    nutTao.style.opacity = '0.6';
    nutTao.style.cursor = 'wait';
    ketQua.textContent = 'Đang tạo ảnh...';
    ketQua.style.cssText = 'font-size:13px;color:#8a8078;margin-top:8px';
    try {
      const anh = await xuLyNgoai.onXuatAnhDpi(Number(oNhap.value), Number(oDpi.value));
      ketQua.textContent = '';

      const doDuoc = document.createElement('div');
      doDuoc.textContent = 'Đã tạo ảnh ' + anh.w + '×' + anh.h + ' điểm ảnh — khổ ' +
                           Math.round(anh.rongMm / 10) + '×' + Math.round(anh.caoMm / 10) + 'cm.';
      doDuoc.style.cssText = 'font-size:12px;color:#8a8078;margin-top:8px';
      ketQua.append(doDuoc);

      // ⚠ Dùng LẠI đúng object URL mà `veLinkTai()` vừa tạo (`a.href`) cho nút
      // in, thay vì gọi `URL.createObjectURL(blob)` lần thứ hai: hai địa chỉ
      // cho cùng một tấm ảnh nghĩa là hai bản nằm trong bộ nhớ, mà tấm ảnh này
      // có thể nặng vài chục MB.
      const link = veLinkTai(anh.blob, anh.tenFile, 'Tải ảnh về máy');
      ketQua.append(link);

      const nutIn = nut('Gửi tới máy in', false, true,
                        () => inAnhRaster(link.href, anh.rongMm, anh.caoMm));
      nutIn.dataset.viec = 'in-anh-dpi';
      nutIn.style.marginTop = '8px';
      ketQua.append(nutIn);

      const nhacIn = document.createElement('div');
      // ⚠ Câu này sửa 01/09/2026: nút "Gửi tới máy in" KHÔNG còn được quảng
      // cáo là đường lấy PDF nữa. Đường lấy PDF đúng khổ là nút PDF riêng ở
      // trên — nó tự dựng file, không ai ghi đè khổ giấy được.
      nhacIn.textContent =
        'Nút này mở hộp thoại in của máy — khổ giấy sẽ do chính máy in quyết ' +
        'định, không phải khổ đã gõ ở trên. Muốn đúng khổ thì dùng nút "Tải ' +
        'file PDF" bên trên.';
      nhacIn.style.cssText = 'font-size:11px;line-height:1.5;color:#8a8078;margin-top:6px';
      ketQua.append(nhacIn);
    } catch (e) {
      ketQua.textContent = 'Không tạo được ảnh: ' + (e && e.message ? e.message : String(e));
    } finally {
      nutTao.disabled = false;
      nutTao.style.opacity = '1';
      nutTao.style.cursor = 'pointer';
    }
  });
  nutTao.dataset.viec = 'tao-anh-dpi';
  nutTao.style.marginTop = '8px';

  // --- Nút PDF — đường DUY NHẤT bảo đảm đúng khổ giấy ----------------------
  //
  // ⚠ Đứng TRƯỚC nút ảnh và tô đậm (nút chính), vì đây mới là thứ chủ dự án
  // cần khi mang ra tiệm in: khổ giấy nằm trong chính file PDF, không hộp
  // thoại in nào, không máy in ảo nào ghi đè được. Sự cố 01/09/2026 (novaPDF
  // ra khổ Letter) đẻ ra đúng cái nút này — xem `export-image.js`.
  const nutPdf = xuLyNgoai.onXuatPdfDpi
    ? nut('Tải file PDF đúng khổ', true, true, async () => {
        nutPdf.disabled = true;
        nutPdf.style.opacity = '0.6';
        nutPdf.style.cursor = 'wait';
        ketQua.textContent = 'Đang dựng file PDF...';
        ketQua.style.cssText = 'font-size:13px;color:#8a8078;margin-top:8px';
        try {
          const pdf = await xuLyNgoai.onXuatPdfDpi(Number(oNhap.value), Number(oDpi.value));
          ketQua.textContent = '';

          const doDuoc = document.createElement('div');
          doDuoc.dataset.viec = 'co-pdf-dpi';
          doDuoc.textContent =
            'PDF khổ ' + (pdf.rongMm / 10).toFixed(1) + '×' + (pdf.caoMm / 10).toFixed(1) +
            'cm, ảnh bên trong ' + pdf.w + '×' + pdf.h + ' điểm ảnh. Khổ này nằm ' +
            'trong chính file — mở ở đâu, in ở tiệm nào cũng đúng bằng đó.';
          doDuoc.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:8px';
          ketQua.append(doDuoc);
          ketQua.append(veLinkTai(pdf.blob, pdf.tenFile, 'Tải file PDF về máy'));
        } catch (e) {
          ketQua.textContent = 'Không dựng được PDF: ' + (e && e.message ? e.message : String(e));
        } finally {
          nutPdf.disabled = false;
          nutPdf.style.opacity = '1';
          nutPdf.style.cursor = 'pointer';
        }
      })
    : null;
  if (nutPdf) {
    nutPdf.dataset.viec = 'tao-pdf-dpi';
    nutPdf.style.marginTop = '8px';
    boc.append(nutPdf);
  }

  boc.append(nutTao, ketQua);
  khoi.append(boc);
}

// ============================================================
// Khối "Nhập dữ liệu" — việc 11
// ============================================================
//
// Khối RIÊNG, đứng dưới *Xuất dữ liệu*, chứ không phải một nút thứ hai nằm
// chung khối với nút xuất. Xuất và nhập trông như một cặp đối xứng nhưng
// KHÔNG cân nhau chút nào: xuất chỉ ĐỌC, ai bấm nhầm cũng không sao; nhập
// là đường MỘT CHIỀU. Xếp chung một khối là mời người dùng coi chúng ngang
// nhau, rồi bấm cái thứ hai chỉ vì vừa bấm cái thứ nhất.
//
// ✓ Hai chữ *xem trước* ĐÃ BỎ ở nửa sau, đúng lúc màn hình ấy ghi thật — để
// lại là nói dối theo chiều nguy hiểm hơn hẳn chiều ngược lại.
//
// ⚠ Nút này vẫn KHÔNG mờ với người chỉ có quyền xem, và nay đó là một quyết
// định chứ không còn là chuyện hiển nhiên: đường nhập ghi vào một gia phả
// MỚI dựng trong Drive của chính người bấm, nơi họ là chủ. Quyền xem trên
// cây đang mở không dính dáng gì tới việc ấy — chặn họ ở đây là chặn nhầm
// người ở nhầm cây.

function veKhoiNhap(vao) {
  if (!xuLyNgoai.onMoNhapGedcom) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:20px';
  khoi.append(veNhanKhoi('Nhập dữ liệu'));

  const b = nut('Nhập từ file GEDCOM hoặc Excel', false, true,
                () => xuLyNgoai.onMoNhapGedcom());
  b.dataset.viec = 'nhap-gedcom';
  b.style.marginTop = '4px';
  khoi.append(b);

  const chu = document.createElement('div');
  chu.textContent = 'Xem file .ged có những gì, rồi ghi vào một gia phả MỚI. '
                  + 'Gia phả đang mở không bị đụng tới.';
  chu.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
  khoi.append(chu);

  vao.append(khoi);
  return khoi;
}

// ============================================================
// Khối "Quản lý gia phả" — hai danh sách (22/08/2026)
// ============================================================
//
// Chủ dự án: *"Ở cài đặt sẽ cho thêm 2 menu là quản lý cá nhân => hiện danh
// sách cá nhân => sửa thông tin của người đó; menu gia đình => có danh sách
// các gia đình => bấm vào đó sửa thành viên"*.
//
// --- BA quyết định ------------------------------------------------------
//
// 1. **ĐỨNG ĐẦU màn hình Cài đặt.** Bốn khối cũ đều là *chỉnh app* — người
//    trung tâm mặc định, cỡ chữ, sao lưu, tài khoản. Hai nút này là *đi vào
//    gia phả*, tức việc thường ngày. Việc làm nhiều nhất đứng chỗ dễ thấy nhất.
//
// 2. **"Danh sách người" mở ĐÚNG cái màn hình mà nút 🔍 mở** — không dựng bản
//    thứ hai. Hai cửa vào một phòng là chuyện thường; hai cái phòng giống nhau
//    thì tới ngày một cái được vá còn cái kia không. Nút 🔍 giữ nguyên cho
//    người đã quen nó.
//
// 3. **"Các gia đình" là màn hình MỚI**, và nó lấp đúng lỗ hổng mà Danh sách
//    người đã lấp cho người: một cặp không nằm trong vùng vẽ thì trước hôm nay
//    không màn hình nào kể tên nó ra.

function veKhoiQuanLy(vao) {
  if (!xuLyNgoai.onDanhSachNguoi && !xuLyNgoai.onDanhSachGiaDinh) return null;

  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:4px';
  khoi.append(veNhanKhoi('Quản lý gia phả'));

  // Không có dòng giải thích: tên hai nút đã kể đủ việc chúng làm (chủ dự án
  // bỏ 28/08/2026). `margin-top:4px` giữ đúng khoảng cách nhãn–nút cũ.
  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;flex-direction:column;gap:8px;margin-top:4px';

  if (xuLyNgoai.onDanhSachNguoi) {
    const b = nut('Danh sách người — xem và sửa từng người', false, true,
                  () => xuLyNgoai.onDanhSachNguoi());
    b.dataset.viec = 'danh-sach-nguoi';
    hang.append(b);
  }

  if (xuLyNgoai.onDanhSachGiaDinh) {
    const b = nut('Các gia đình — xem một cặp và các con', false, true,
                  () => xuLyNgoai.onDanhSachGiaDinh());
    b.dataset.viec = 'danh-sach-gia-dinh';
    hang.append(b);
  }

  khoi.append(hang);
  vao.append(khoi);
  return khoi;
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
  // File dữ liệu đang mở. Chỉ có một dòng này nói ra được nó: hai gia phả
  // khác nhau trông y hệt nhau trên mọi màn hình còn lại. Đứng ở đây vì đây
  // là chỗ duy nhất người cài đặt mở ra sau khi vừa đổi FILE_ID — nếu tên
  // hiện lên vẫn là tên cũ thì bản triển khai Apps Script chưa được cập nhật.
  if (phien.tenFileDuLieu) hang(bang, 'File dữ liệu', phien.tenFileDuLieu);
  khoi.append(bang);

  const nhac = document.createElement('div');
  nhac.textContent =
    'Quyền do danh sách chia sẻ của file trên Google Drive quyết định, ' +
    'không sửa được trong app. Cần đổi thì nhờ người quản lý.';
  nhac.style.cssText = 'margin-top:8px;font-size:12px;line-height:1.5;color:#8a8078';
  khoi.append(nhac);

  // "Bị ẩn" KHÔNG phải "còn thiếu" — câu này chuyển về đây ở bước 30, khi khối
  // "Thử ghi vào gia phả" bị gỡ. Nó phải sống ở đâu đó: `CLAUDE.md` mục 11 xếp
  // nó vào loại điều PHẢI NÓI THẲNG, KHÔNG ĐƯỢC CHE.
  if (state.daLocNguoiConSong) {
    khoi.append(veLoiNhan(
      "Máy chủ đang lược bớt chi tiết người còn sống trước khi gửi bản gia phả " +
      "về máy này, nên app KHÔNG được phép lưu đè lên bản gốc. Đây không phải " +
      "gia phả thiếu thông tin.", false));
  }

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
