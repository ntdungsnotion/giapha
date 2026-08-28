// ============================================================
// giapha · js/pages/import-export.js
// Vai trò  : Màn hình XUẤT GEDCOM (nhập GEDCOM là việc 11, xuất ảnh là việc 12)
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/gedcom, config
// Phiên bản: 1.1.0 · Cập nhật: 28/08/2026 15:10
// ============================================================
//
// Màn hình này làm đúng MỘT việc: biến gia phả đang mở thành một file `.ged`
// nằm trong máy người dùng. Không gọi máy chủ một lần nào — cây đã nằm sẵn
// trong `state.tree`, và việc dựng chữ là hàm thuần ở `domains/gedcom.js`.
//
// --- HAI ĐƯỜNG LẤY FILE, và vì sao phải có cả hai -----------------------
//
// App chạy bên trong một `<iframe>` do Apps Script dựng ra, và cái iframe ấy
// mang thuộc tính `sandbox`. Từ Chrome 83, một iframe sandbox KHÔNG được phép
// tải file về trừ khi có `allow-downloads` — mà thuộc tính ấy do Google đặt,
// không phải ta đặt, và **ta không kiểm tra được từ bên trong**. Bấm nút mà
// trình duyệt chặn thì nó chặn IM LẶNG: không lỗi, không hộp thoại, không gì
// cả. Người dùng ngồi nhìn một cái nút vừa bấm xong mà không có chuyện gì
// xảy ra — đúng thứ làm người ta nghĩ app hỏng.
//
// Nên màn hình này KHÔNG đặt cược vào một đường:
//
// 1. **Nút tải về** — đường chính, chạy được thì xong trong một cú bấm.
// 2. **Ô chữ chép tay** — nép sau một dòng *"Không tải được file?"*, kèm
//    năm bước mở Notepad.
//
// ✓ **28/08/2026 — chủ dự án đã bấm trên app thật và TẢI VỀ ĐƯỢC**, mở bằng
// Notepad ra đúng cấu trúc. Tức iframe của Apps Script CÓ `allow-downloads`.
// Bản đầu bày cả khối chép tay ra giữa màn hình vì chưa biết điều đó; nay nó
// thu lại sau một dòng chữ.
//
// ⚠ **Nhưng ĐỪNG gỡ hẳn đường 2.** Thuộc tính `sandbox` do Google đặt, đổi
// lúc nào không ai báo trước, và ngày nó đổi thì lỗi vẫn im lặng y như cũ.
// Trình duyệt trong ứng dụng — mở app từ link trong Zalo, Messenger — còn
// chặn tải file thường xuyên hơn Chrome nhiều.
//
// --- Vì sao KHÔNG đi qua máy chủ ----------------------------------------
//
// Đường chắc ăn nhất về mặt kỹ thuật là: gửi chuỗi lên Apps Script, ghi thành
// file trên Drive, trả về một đường link. Đã cân nhắc và KHÔNG chọn, vì ba lẽ:
// nó bắt sửa `gas/Code.gs` rồi chủ dự án phải triển khai lại bằng tay; nó đẩy
// cả gia phả lên mạng thêm một vòng nữa cho một việc chỉ đọc; và nó bỏ file
// `.ged` lại trên Drive — thêm một bản gia phả nằm ngoài tầm quản, đúng thứ
// mà mục *Sao lưu* đã cất công gom về một chỗ.

import { state } from '../state.js';
import { exportGedcom, tenFileGedcom, tomTatXuat } from '../domains/gedcom.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

let lopPhu = null;
let hopKetQua = null;
let duongTam = '';        // blob: URL đang giữ, phải thu hồi lúc đóng

/**
 * Mở màn hình Xuất GEDCOM.
 *
 * Không nhận `xuLy` nào: màn hình này không dẫn đi đâu và không đổi gì trong
 * cây, nên không có việc gì để báo ngược ra ngoài. Khác hẳn `openBackup` —
 * khôi phục một bản sao lưu là thay cả cây, nên chỗ ấy phải báo.
 */
export function openXuatGedcom() {
  closeXuatGedcom();

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.id = 'giapha-xuat-gedcom';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Xuất GEDCOM';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  const moDau = document.createElement('div');
  moDau.textContent =
    'GEDCOM là định dạng chung mà hầu hết phần mềm gia phả đọc được. ' +
    'Xuất ra một file .ged là để mang gia phả này sang nơi khác — hoặc ' +
    'giữ một bản ngoài Google Drive.';
  moDau.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-top:8px';
  hop.append(moDau);

  // --- Cảnh báo: bản đang cầm trong tay đã bị máy chủ lược bớt -----------
  //
  // `CLAUDE.md` mục 11 xếp điều này vào loại PHẢI NÓI THẲNG. Ở màn hình khác
  // nó chỉ làm app không được lưu đè; ở đây nó làm bản xuất ra THIẾU THẬT, mà
  // file `.ged` thì đi ra khỏi app rồi không quay lại nữa.
  if (state.daLocNguoiConSong) {
    hop.append(veLoiNhan(
      'Máy chủ đang lược bớt chi tiết người còn sống trước khi gửi gia phả ' +
      'về máy này, nên file xuất ra cũng thiếu đúng những chi tiết ấy — kể ' +
      'cả khi bạn bỏ dấu chọn bên dưới.', true));
  }

  // --- Công tắc riêng tư ------------------------------------------------
  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:16px;padding:9px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hopChon = document.createElement('input');
  hopChon.type = 'checkbox';
  hopChon.id = 'giapha-ct-an-con-song';
  hopChon.checked = true;
  hopChon.style.cssText = 'width:18px;height:18px;accent-color:#2a2622';

  const chu = document.createElement('span');
  chu.textContent = 'Ẩn chi tiết người còn sống';
  nhan.append(hopChon, chu);
  hop.append(nhan);

  const giaiThichAn = document.createElement('div');
  giaiThichAn.style.cssText =
    'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
  hop.append(giaiThichAn);

  // --- Sẽ xuất bao nhiêu, nói TRƯỚC khi bấm -----------------------------
  const tomTat = document.createElement('div');
  tomTat.style.cssText =
    'margin-top:12px;padding:10px 12px;border:1px solid #e6e0d8;' +
    'border-radius:9px;background:#faf8f5;font-size:13px;line-height:1.6';
  hop.append(tomTat);

  function veLaiTomTat() {
    const t = tomTatXuat(state.tree, { anNguoiConSong: hopChon.checked });
    const cau = ['Sẽ xuất ' + t.soNguoi + ' người và ' + t.soCap + ' gia đình.'];
    if (t.soAn > 0) cau.push('Trong đó ' + t.soAn + ' người còn sống chỉ ra tên.');
    if (t.soBoQua > 0) {
      cau.push(t.soBoQua + ' người đang ở Thùng rác không xuất.');
    }
    tomTat.textContent = cau.join(' ');

    giaiThichAn.textContent = hopChon.checked
      ? 'Người còn sống vẫn giữ tên và mối nối gia đình, nhưng bỏ ngày ' +
        'sinh, nơi chốn, nghề nghiệp, ghi chú và ảnh.'
      : 'Bỏ dấu chọn thì file mang đầy đủ ngày tháng và ghi chú của MỌI ' +
        'người, kể cả người còn sống. Chỉ làm vậy khi file này không đi ra ' +
        'khỏi tay bạn.';
  }
  hopChon.addEventListener('change', () => { veLaiTomTat(); xoaKetQua(); });
  veLaiTomTat();

  // --- Nút tạo file ------------------------------------------------------
  const nutTao = nut('Tạo file .ged', true, () => taoFile(hopChon.checked));
  nutTao.dataset.viec = 'tao-file-ged';
  nutTao.style.marginTop = '14px';
  hop.append(nutTao);

  hopKetQua = document.createElement('div');
  hop.append(hopKetQua);

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin:18px auto 0;display:block;width:100%;height:42px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;cursor:pointer;' +
    'touch-action:manipulation';
  dong.addEventListener('click', () => closeXuatGedcom());
  hop.append(dong);

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeXuatGedcom(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

export function closeXuatGedcom() {
  thuHoiDuongTam();
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  hopKetQua = null;
}

// ============================================================
// Dựng file rồi trao cho người dùng
// ============================================================

function taoFile(anNguoiConSong) {
  xoaKetQua();
  if (!hopKetQua) return;

  const luc = new Date();
  const ten = tenFileGedcom(state.tree, luc);
  let chuoi;
  try {
    chuoi = exportGedcom(state.tree, { anNguoiConSong, luc, tenFile: ten });
  } catch (e) {
    hopKetQua.append(veLoiNhan(
      'Không dựng được file: ' + (e && e.message ? e.message : String(e)), true));
    return;
  }

  // BOM đứng trước `0 HEAD`. Có nó thì Notepad và Excel nhận ra ngay đây là
  // UTF-8; không có nó thì chữ tiếng Việt mở ra có thể thành một dãy ký tự lạ,
  // và người mở file sẽ tưởng app xuất hỏng chứ không nghĩ tới bảng mã.
  const blob = new Blob(['\uFEFF', chuoi], { type: 'text/plain;charset=utf-8' });
  duongTam = URL.createObjectURL(blob);

  hopKetQua.append(veNhanKhoi('Đã tạo xong'));

  const soDong = chuoi.split('\r\n').length - 1;
  const doLon = document.createElement('div');
  doLon.textContent = ten + '  ·  ' + soDong + ' dòng  ·  ' +
                      Math.max(1, Math.round(blob.size / 1024)) + ' KB';
  doLon.style.cssText =
    'font-size:13px;line-height:1.6;word-break:break-all;' +
    'padding:9px 11px;border:1px solid #e6e0d8;border-radius:8px;background:#faf8f5';
  hopKetQua.append(doLon);

  // --- Đường 1: nút tải về ---
  const tai = document.createElement('a');
  tai.href = duongTam;
  tai.download = ten;
  tai.textContent = 'Tải file .ged về máy';
  tai.style.cssText =
    'display:block;width:100%;min-height:42px;margin-top:10px;padding:11px 14px;' +
    'box-sizing:border-box;text-align:center;text-decoration:none;font-size:14px;' +
    'font-weight:600;border-radius:9px;background:#2a2622;color:#fffdf9;' +
    'border:1px solid #2a2622;touch-action:manipulation';
  hopKetQua.append(tai);

  // --- Đường 2: chép tay, LUÔN hiện, xem ghi chú đầu file ---
  hopKetQua.append(veChepTay(chuoi, ten));
}

/**
 * Đường thoát thứ hai: chép chữ rồi tự lưu bằng Notepad.
 *
 * ⚠ **THU GỌN 28/08/2026, sau khi nút tải về được xác nhận CHẠY THẬT trên app
 * thật.** Bản đầu bày cả năm bước ra giữa màn hình, và lý lẽ lúc ấy là: iframe
 * sandbox của Apps Script có thể chặn tải file IM LẶNG, mà người dùng không
 * biết mình vừa gặp lỗi nên không đi tìm chỗ nào cả. Nay chủ dự án đã bấm và
 * tải được, tức cái iframe ấy CÓ `allow-downloads`.
 *
 * Nên đổi chỗ hai thứ: nút tải về là đường chính, khối này nép lại sau một
 * dòng chữ nhỏ. Nhưng KHÔNG bỏ hẳn, và đây là chỗ dễ đi quá tay:
 *
 * - Google đổi thuộc tính `sandbox` lúc nào không ai báo trước, và ngày
 *   nó đổi thì lỗi vẫn im lặng y như cũ.
 * - Trình duyệt trong ứng dụng — mở app từ link trong Zalo, Messenger — chặn
 *   tải file thường xuyên hơn Chrome nhiều.
 *
 * Chữ trên dòng mở là **"Không tải được file?"**, cố ý hỏi chứ không kể. Người
 * vừa bấm mà chẳng thấy gì đọc câu ấy là nhận ra ngay đây là chỗ dành cho
 * mình; người tải được rồi thì lướt qua.
 */
function veChepTay(chuoi, ten) {
  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:12px';

  const moRa = document.createElement('button');
  moRa.type = 'button';
  moRa.dataset.viec = 'mo-chep-tay';
  moRa.textContent = 'Không tải được file?';
  moRa.style.cssText =
    'display:block;width:100%;padding:9px 4px;font-size:13px;font-family:inherit;' +
    'color:#8a8078;background:none;border:0;text-align:left;cursor:pointer;' +
    'text-decoration:underline;text-underline-offset:3px;touch-action:manipulation';

  const ruot = document.createElement('div');
  ruot.hidden = true;

  const buoc = document.createElement('div');
  buoc.style.cssText = 'font-size:13px;line-height:1.7;color:#8a8078';
  buoc.append(
    dongChu('1. Bấm nút "Chép toàn bộ nội dung" bên dưới.'),
    dongChu('2. Mở Notepad (bấm nút Start, gõ chữ notepad, bấm Enter).'),
    dongChu('3. Bấm Ctrl + V để dán vào.'),
    dongChu('4. Bấm Ctrl + S. Ở ô "File name" gõ đúng tên: ' + ten),
    dongChu('5. Ở ô "Save as type" chọn "All files", ở ô "Encoding" ' +
            'chọn "UTF-8". Rồi bấm Save.'),
  );
  ruot.append(buoc);

  const o = document.createElement('textarea');
  o.readOnly = true;
  o.value = chuoi;
  o.style.cssText =
    'width:100%;height:120px;margin-top:10px;box-sizing:border-box;padding:8px;' +
    'font-family:ui-monospace,Consolas,monospace;font-size:11px;line-height:1.4;' +
    'border:1px solid #e6e0d8;border-radius:8px;background:#faf8f5;color:#2a2622;' +
    'white-space:pre;resize:vertical';
  ruot.append(o);

  const bao = document.createElement('div');
  bao.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';

  const b = nut('Chép toàn bộ nội dung', false, async () => {
    o.focus();
    o.select();
    let xong = false;
    try {
      await navigator.clipboard.writeText(chuoi);
      xong = true;
    } catch (e) {
      // `navigator.clipboard` cần ngữ cảnh an toàn và có thể bị iframe chặn.
      // `execCommand` đã cũ nhưng vẫn là đường duy nhất còn lại ở đó.
      try { xong = document.execCommand('copy'); } catch (e2) { xong = false; }
    }
    bao.textContent = xong
      ? 'Đã chép. Giờ mở Notepad và bấm Ctrl + V.'
      : 'Trình duyệt không cho chép tự động. Chữ trong ô đã được bôi đen sẵn — ' +
        'bấm Ctrl + C để chép.';
  });
  b.style.marginTop = '8px';
  ruot.append(b, bao);

  moRa.addEventListener('click', () => {
    ruot.hidden = !ruot.hidden;
    moRa.textContent = ruot.hidden ? 'Không tải được file?' : 'Ẩn cách chép tay';
  });

  khoi.append(moRa, ruot);
  return khoi;
}

function xoaKetQua() {
  thuHoiDuongTam();
  if (hopKetQua) hopKetQua.innerHTML = '';
}

/**
 * Trả lại bộ nhớ của blob.
 *
 * Một `blob:` URL sống tới khi tab đóng, kể cả khi cái thẻ `<a>` trỏ vào nó đã
 * bị gỡ. Gia phả vài chục nghìn ký tự thì không đáng kể, nhưng đây là màn hình
 * người ta bấm đi bấm lại để thử — mỗi lần bấm là một bản nữa nằm lại.
 */
function thuHoiDuongTam() {
  if (duongTam) URL.revokeObjectURL(duongTam);
  duongTam = '';
}

// ============================================================
// Việc 11 và việc 12 — chưa làm
// ============================================================

/** Xuất sơ đồ đang hiện thành PNG. */
export async function exportPng() { /* TODO — việc 12 */ }

/** Xuất PDF khổ lớn để in. */
export async function exportPdf() { /* TODO — việc 12 */ }

/** Nhập .ged — BẮT BUỘC có bước xem trước và đối chiếu trùng lặp. */
export async function importGed() { /* TODO — việc 11 */ }

// ============================================================
// Mấy mẩu dùng chung — cùng khuôn với `pages/settings.js`
// ============================================================

function veNhanKhoi(chu_) {
  const n = document.createElement('div');
  n.textContent = chu_;
  n.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078;' +
    'margin:16px 0 6px';
  return n;
}

function dongChu(chu_) {
  const d = document.createElement('div');
  d.textContent = chu_;
  return d;
}

function nut(chu_, chinh, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu_;
  b.style.cssText =
    'width:100%;min-height:42px;padding:8px 14px;font-size:14px;font-family:inherit;' +
    'border-radius:9px;touch-action:manipulation;line-height:1.35;cursor:pointer;' +
    (chinh
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  b.addEventListener('click', chay);
  return b;
}

function veLoiNhan(chu_, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu_;
  d.style.cssText =
    'margin-top:10px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4');
  return d;
}
