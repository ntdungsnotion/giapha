// ============================================================
// giapha · js/pages/settings.js
// Vai trò  : Màn hình Cài đặt — người trung tâm mặc định, tuỳ chọn hiển thị,
//            đường sang màn hình Sao lưu & khôi phục
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, services/gas, utils/text
// Phiên bản: 1.11.0 · Cập nhật: 28/08/2026 00:20
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
 *          onMoSaoLuu?:function}} [xuLy]
 *        chạy sau khi đặt hoặc bỏ mặc định thành công. Dùng callback thay vì
 *        `import` ngược `tree-view.js` — hai file cùng lớp `pages`, import
 *        vòng tròn thì một trong hai sẽ thấy hàm của file kia là `undefined`.
 *        `onDoiHienThi` chạy sau khi đổi một công tắc trong khối Hiển thị —
 *        nơi gọi phải VẼ LẠI sơ đồ, vì công tắc ngày giỗ đổi cả chiều cao ô.
 *        `onMoSaoLuu` mở màn hình Sao lưu & khôi phục. KHÔNG truyền thì khối
 *        ấy không mọc ra — cùng khuôn với hai callback trên, và nhờ thế bài
 *        kiểm mở riêng màn Cài đặt không phải dựng máy chủ giả cho việc 7.
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
  veKhoiSaoLuu(hop);
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

  const giaiThich = document.createElement('div');
  giaiThich.textContent =
    'Xem các bản phòng hờ máy chủ đã cất, cất thêm một bản ngay, hoặc đưa cả ' +
    'gia phả quay về một bản cũ.';
  giaiThich.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-bottom:10px';
  khoi.append(giaiThich);

  khoi.append(nut('Mở Sao lưu & khôi phục', false, true,
                  () => xuLyNgoai.onMoSaoLuu()));

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

  const giaiThich = document.createElement('div');
  giaiThich.textContent =
    'Hai đường vào gia phả không đi qua sơ đồ — tìm được cả người và cả gia ' +
    'đình mà sơ đồ hiện thời không vẽ ra.';
  giaiThich.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-bottom:10px';
  khoi.append(giaiThich);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:8px';

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
