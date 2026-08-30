// ============================================================
// giapha · js/pages/import-export.js
// Vai trò  : Hai màn hình — XUẤT GEDCOM, và NHẬP GEDCOM/Excel (đọc + ghi thật)
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, pages/form-ghep-doi, domains/{gedcom,excel}, services/{gas,repo},
//            utils/{date,text}, config
// Phiên bản: 1.7.0 · Cập nhật: 31/08/2026 08:00
// ============================================================
//
// File này giữ HAI màn hình, và chúng là hai chiều của cùng một cửa:
//
// - `openXuatGedcom` — biến gia phả đang mở thành một file `.ged` nằm trong
//   máy người dùng. Xong từ b55, chủ dự án đã bấm thử trên app thật.
// - `openNhapGedcom` — đọc một file `.ged` HOẶC một file Excel một bảng
//   (`.xlsx`/`.xlsb`, `domains/excel.js` từ 31/08/2026), kể ra đọc được gì,
//   rồi GHI vào một gia phả MỚI dựng trên Drive.
//
// ⚠ **Hai màn hình này nay KHÔNG còn cân nhau.** Màn Xuất chỉ đọc: nó không
// gọi máy chủ một lần nào, cây đã nằm sẵn trong `state.tree`. Màn Nhập thì
// dựng thư mục trên Drive, đổi gia phả đang chọn và ghi dữ liệu — xem khối
// *Đường GHI THẬT* ở cuối file. Phép dựng chữ và đọc chữ vẫn là hàm thuần ở
// `domains/gedcom.js`; chỉ phần điều phối là đụng máy chủ.
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
import { exportGedcom, tenFileGedcom, tomTatXuat, parseGedcom, mergeImported }
  from '../domains/gedcom.js';
import { parseExcel } from '../domains/excel.js';
import { openGhepDoi, closeGhepDoi } from './form-ghep-doi.js';
import { chonGiaPha } from '../services/gas.js';
import { taoGiaPhaMoi, khoiTao, luuCay } from '../services/repo.js';
import { formatDate, stampNow } from '../utils/date.js';
import { fullName } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

let lopPhu = null;
let hopKetQua = null;
let duongTam = '';        // blob: URL đang giữ, phải thu hồi lúc đóng

// Màn hình NHẬP giữ biến riêng, KHÔNG dùng chung `lopPhu` với màn Xuất:
// hai màn hình có thể chồng nhau (mở Xuất, đóng, mở Nhập) và dùng chung một
// biến thì cú đóng của màn này gỡ mất lớp phủ của màn kia.
let lopPhuNhap = null;
let hopXemTruoc = null;
let dangGhi = false;    // chặn bấm hai lần trong lúc chờ máy chủ

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
// MÀN HÌNH NHẬP GEDCOM — việc 11: XEM TRƯỚC, RỒI GHI VÀO CÂY MỚI
// ============================================================
//
// Màn hình đi hai chặng: ĐỌC file và kể ra đọc được gì, rồi mới tới khối
// *Ghi vào đâu* ở cuối. Chặng đầu không đụng vào đâu cả; chặng sau dựng một
// gia phả mới trên Drive và ghi vào đó — xem khối *Đường GHI THẬT*.
//
// Chia đôi việc 11 như vậy là có lý do, và lý do ấy đo được: chặng đầu sai
// thì không mất gì — cùng đúng lý lẽ đã xếp *xuất* đứng trước *nhập*. Chặng
// ghi bước vào với một bộ đọc đã chạy đúng trên 59 người thật
// (`kiem-thu/kiem-nhap-gedcom.mjs`).
//
// --- Vì sao bản xem trước kể THỨ MẤT trước thứ được ----------------------
//
// Màn *Xuất* kể *"sẽ xuất 59 người"* là đủ, vì xuất không mất gì. Nhập thì
// ngược lại: file của phần mềm khác mang những trường app này không có chỗ
// chứa, và nhập vào là chúng biến mất IM LẶNG. Nên khối cảnh báo đứng NGAY
// TRÊN mấy con số, không nép xuống dưới.
//
// --- ⚠ CHỮ TRÊN MÀN HÌNH: CHỦ DỰ ÁN ĐÃ CẮT BỚT (29/08/2026) --------------
//
// Bản đầu mở màn bằng một khối đỏ ba dòng — *một chiều · vào gia phả mới ·
// ảnh không nhập* — và giải thích cả cơ chế. Chủ dự án gạch đi: **người dùng
// app chỉ cần hiểu họ đang làm gì và kết quả sẽ thế nào**, phần lý lẽ là
// chuyện giữa người viết mã với nhau, để lại trong ghi chú như đoạn này.
//
// Còn lại đúng hai câu, và cả hai đều nói HẬU QUẢ chứ không nói cơ chế:
//
// 1. **Lưu vào Google Drive của <tài khoản>.** Nói NƠI dữ liệu tới, kèm tên
//    tài khoản — người dùng có hai tài khoản Google thì đây là chỗ họ nhận
//    ra mình đang đứng ở tài khoản nào.
// 2. **Ghi xong KHÔNG có nút hoàn tác.** Câu duy nhất được giữ nguyên vẹn
//    qua đợt cắt, vì nó là thứ đổi được quyết định của người đang bấm.
//
// Ba điều bị cắt vẫn đúng và vẫn được app tuân thủ; chúng chỉ không còn bày
// ra trước mặt người dùng nữa. Thứ nào thật sự cần biết SAU khi ghi — ảnh
// không có, đường quay về cây cũ, cách chia sẻ Drive — đã nằm ở màn *Đã ghi
// xong*, tức đúng lúc người ta cần dùng tới.
//
// --- HAI đường đưa file vào, cùng lý lẽ với màn Xuất --------------------
//
// App chạy trong `<iframe sandbox>` của Apps Script. Nút *Tải về* của màn
// Xuất từng là chỗ đáng ngờ vì thế, và hoá ra chạy được. Ô CHỌN FILE thì
// chưa ai thử bao giờ, nên ở đây giữ nguyên nếp cũ: có ô chọn file làm đường
// chính, và một ô DÁN CHỮ nép sau một dòng hỏi. Ngày ô chọn file bị chặn thì
// nó cũng chặn im lặng y như cũ.

/**
 * Mở màn hình Nhập GEDCOM (bản xem trước).
 *
 * Vẫn không nhận `xuLy` nào, dù nửa sau đã ghi thật — nhưng lý do đã khác.
 * Ghi xong thì app đứng ở một gia phả KHÁC, tức mọi màn hình đang mở đều nói
 * về cây cũ: sơ đồ, người trung tâm, danh sách. Báo ngược ra ngoài để từng
 * chỗ tự cập nhật là dựng lại cả đường khởi động bằng tay. Nên chỗ này đi
 * đúng đường màn *Chọn gia phả* đã đi: một nút **Tải lại trang**, và
 * `location.reload()` chạy lại đúng đường khởi động đã chạy hàng trăm lần.
 */
export function openNhapGedcom() {
  closeNhapGedcom();

  lopPhuNhap = document.createElement('div');
  lopPhuNhap.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.id = 'giapha-nhap-gedcom';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Nhập GEDCOM / Excel';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  const moDau = document.createElement('div');
  moDau.textContent =
    'Chọn một file .ged, hoặc một file Excel một bảng (.xlsx/.xlsb), để xem ' +
    'trước rồi lưu thành một gia phả mới.';
  moDau.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-top:8px';
  hop.append(moDau);

  // --- Đường 1: chọn file -----------------------------------------------
  const nhanFile = document.createElement('label');
  nhanFile.style.cssText =
    'display:block;margin-top:16px;font-size:14px;font-weight:600';
  nhanFile.textContent = 'Chọn file .ged hoặc file Excel';
  hop.append(nhanFile);

  const oFile = document.createElement('input');
  oFile.type = 'file';
  oFile.accept = '.ged,.GED,.xlsx,.XLSX,.xlsb,.XLSB,text/plain';
  oFile.id = 'giapha-o-chon-ged';
  oFile.style.cssText =
    'display:block;width:100%;margin-top:6px;padding:9px;box-sizing:border-box;' +
    'font-size:13px;font-family:inherit;border:1px solid #e6e0d8;' +
    'border-radius:9px;background:#faf8f5';
  oFile.addEventListener('change', () => {
    const f = oFile.files && oFile.files[0];
    if (!f) return;
    docFile(f);
  });
  hop.append(oFile);

  // --- Đường 2: dán chữ, nép sau một dòng hỏi ---------------------------
  hop.append(veDanChu());

  hopXemTruoc = document.createElement('div');
  hop.append(hopXemTruoc);

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin:18px auto 0;display:block;width:100%;height:42px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;cursor:pointer;' +
    'touch-action:manipulation';
  dong.addEventListener('click', () => closeNhapGedcom());
  hop.append(dong);

  lopPhuNhap.addEventListener('click', (e) => {
    if (e.target === lopPhuNhap) closeNhapGedcom();
  });
  lopPhuNhap.append(hop);
  document.body.append(lopPhuNhap);
}

export function closeNhapGedcom() {
  // Bảng ghép đôi nằm TRÊN màn này. Đóng màn dưới mà bỏ lại lớp trên là để
  // một lớp phủ mồ côi che kín app, và không còn nút nào gỡ nó ra.
  closeGhepDoi();
  if (lopPhuNhap) lopPhuNhap.remove();
  lopPhuNhap = null;
  hopXemTruoc = null;
}

// ============================================================
// Đọc file rồi dựng bản xem trước
// ============================================================

function veDanChu() {
  const khoi = document.createElement('div');
  khoi.style.cssText = 'margin-top:10px';

  const moRa = document.createElement('button');
  moRa.type = 'button';
  moRa.dataset.viec = 'mo-dan-ged';
  moRa.textContent = 'Không chọn được file?';
  moRa.style.cssText =
    'display:block;width:100%;padding:9px 4px;font-size:13px;font-family:inherit;' +
    'color:#8a8078;background:none;border:0;text-align:left;cursor:pointer;' +
    'text-decoration:underline;text-underline-offset:3px;touch-action:manipulation';

  const ruot = document.createElement('div');
  ruot.hidden = true;

  const buoc = document.createElement('div');
  buoc.style.cssText = 'font-size:13px;line-height:1.7;color:#8a8078';
  buoc.append(
    dongChu('1. Mở file .ged bằng Notepad (bấm phải vào file, chọn Open with, ' +
            'chọn Notepad).'),
    dongChu('2. Bấm Ctrl + A rồi Ctrl + C để chép hết.'),
    dongChu('3. Bấm vào ô bên dưới, bấm Ctrl + V để dán vào.'),
  );
  ruot.append(buoc);

  const o = document.createElement('textarea');
  o.id = 'giapha-o-dan-ged';
  o.placeholder = '0 HEAD…';
  o.style.cssText =
    'width:100%;height:110px;margin-top:10px;box-sizing:border-box;padding:8px;' +
    'font-family:ui-monospace,Consolas,monospace;font-size:11px;line-height:1.4;' +
    'border:1px solid #e6e0d8;border-radius:8px;background:#faf8f5;color:#2a2622;' +
    'white-space:pre;resize:vertical';
  ruot.append(o);

  const b = nut('Xem trước nội dung đã dán', false, () => xemTruoc(o.value, 'chữ đã dán'));
  b.dataset.viec = 'xem-truoc-dan';
  b.style.marginTop = '8px';
  ruot.append(b);

  moRa.addEventListener('click', () => {
    ruot.hidden = !ruot.hidden;
    moRa.textContent = ruot.hidden ? 'Không chọn được file?' : 'Ẩn cách dán chữ';
  });

  khoi.append(moRa, ruot);
  return khoi;
}

/**
 * Đọc file bằng `FileReader`, KHÔNG dùng `file.text()`.
 *
 * `file.text()` gọn hơn nhưng nó trả về Promise và chỉ đọc được UTF-8. File
 * `.ged` của phần mềm cũ thì hay là ANSI hoặc UTF-16 — `FileReader` cho ta
 * chỗ để nói ra điều đó bằng một câu người đọc hiểu được, thay vì một cây
 * chữ vuông không ai giải thích.
 *
 * File Excel (`.xlsx`/`.xlsb`) là nhị phân — đọc bằng `readAsArrayBuffer`,
 * KHÔNG đọc bằng `readAsText`, và `parseExcel` là hàm BẤT ĐỒNG BỘ (nó nạp
 * thư viện đọc Excel qua mạng) nên nhánh này không dùng chung `xemTruoc`.
 */
function docFile(f) {
  if (!hopXemTruoc) return;
  hopXemTruoc.innerHTML = '';
  hopXemTruoc.append(veNhanKhoi('Đang đọc'));

  const laExcel = /\.(xlsx|xlsb)$/i.test(f.name || '');
  const doc = new FileReader();
  doc.onerror = () => {
    hopXemTruoc.innerHTML = '';
    hopXemTruoc.append(veLoiNhan('Không đọc được file này. ' +
      (laExcel ? '' : 'Thử cách dán chữ bên trên.'), true));
  };

  if (laExcel) {
    doc.onload = () => xemTruocExcel(doc.result, f.name);
    doc.readAsArrayBuffer(f);
  } else {
    doc.onload = () => xemTruoc(String(doc.result || ''), f.name);
    doc.readAsText(f, 'utf-8');
  }
}

function xemTruoc(chuoi, tenNguon) {
  if (!hopXemTruoc) return;
  hopXemTruoc.innerHTML = '';

  if (String(chuoi).trim() === '') {
    hopXemTruoc.append(veLoiNhan('Chưa có nội dung nào để đọc.', true));
    return;
  }

  let kq;
  try {
    kq = parseGedcom(chuoi);
  } catch (e) {
    hopXemTruoc.append(veLoiNhan(
      'Không đọc được file: ' + (e && e.message ? e.message : String(e)), true));
    return;
  }

  hienThiXemTruoc(kq, tenNguon);
}

async function xemTruocExcel(arrayBuffer, tenNguon) {
  if (!hopXemTruoc) return;
  hopXemTruoc.innerHTML = '';
  hopXemTruoc.append(veNhanKhoi('Đang đọc'));

  let kq;
  try {
    kq = await parseExcel(arrayBuffer);
  } catch (e) {
    if (!hopXemTruoc) return;
    hopXemTruoc.innerHTML = '';
    hopXemTruoc.append(veLoiNhan(
      'Không đọc được file: ' + (e && e.message ? e.message : String(e)), true));
    return;
  }
  if (!hopXemTruoc) return; // màn hình đã đóng trong lúc chờ mạng
  hopXemTruoc.innerHTML = '';

  if (kq.persons.length === 0 && kq.canhBao.some((c) => c.muc === 'nang')) {
    hopXemTruoc.append(veLoiNhan(kq.canhBao[0].chu, true));
    return;
  }

  hienThiXemTruoc(kq, tenNguon);
}

function hienThiXemTruoc(kq, tenNguon) {
  hopXemTruoc.append(veNhanKhoi('Đọc được gì từ ' + tenNguon));

  // --- Cây nào, phần mềm nào xuất ra ------------------------------------
  const dsNguon = [];
  if (kq.tenCay) dsNguon.push('Tên gia phả trong file: ' + kq.tenCay);
  if (kq.nguonXuat) dsNguon.push('Do phần mềm "' + kq.nguonXuat + '" xuất ra');
  if (dsNguon.length > 0) {
    const kNguon = document.createElement('div');
    kNguon.style.cssText =
      'font-size:12px;line-height:1.6;color:#8a8078;margin-bottom:8px';
    for (const c of dsNguon) kNguon.append(dongChu(c));
    hopXemTruoc.append(kNguon);
  }

  // --- Con số -----------------------------------------------------------
  const t = kq.thongKe;
  const so = document.createElement('div');
  so.dataset.viec = 'tom-tat-nhap';
  so.style.cssText =
    'padding:10px 12px;border:1px solid #e6e0d8;border-radius:9px;' +
    'background:#faf8f5;font-size:13px;line-height:1.6';
  const cau = [t.soNguoi + ' người', t.soCap + ' gia đình'];
  if (t.soNguon > 0) cau.push(t.soNguon + ' nguồn dẫn');
  so.textContent = cau.join(' · ');
  hopXemTruoc.append(so);

  // --- Cảnh báo: khối QUAN TRỌNG NHẤT của màn hình này -------------------
  if (kq.canhBao.length > 0) {
    hopXemTruoc.append(veNhanKhoi('Những gì sẽ mất, hoặc cần biết trước'));
    for (const c of kq.canhBao) {
      hopXemTruoc.append(veLoiNhan(c.chu, c.muc === 'nang'));
    }
  }

  // --- Kể tên từng thẻ bị bỏ, để người dùng tra được ---------------------
  if (kq.theLa.length > 0) {
    const bang = document.createElement('div');
    bang.style.cssText =
      'margin-top:10px;padding:9px 11px;border:1px solid #e6e0d8;border-radius:8px;' +
      'background:#faf8f5;font-size:12px;line-height:1.7;color:#8a8078';
    bang.append(dongChu('Từng loại thẻ bị bỏ:'));
    for (const x of kq.theLa) bang.append(dongChu('· ' + x.the + ' — ' + x.so + ' dòng'));
    hopXemTruoc.append(bang);
  }

  // --- Mấy người đầu tiên, để NHÌN BẰNG MẮT xem có đúng không -----------
  //
  // Con số nói *"đọc được 59 người"*; nó không nói tên có bị tách nhầm họ với
  // tên riêng không, ngày có lệch một tháng không. Mười cái tên thật bày ra
  // đây thì người trong họ liếc một cái là biết.
  if (kq.persons.length > 0) {
    hopXemTruoc.append(veNhanKhoi('Mười người đầu tiên'));
    const ds = document.createElement('div');
    ds.dataset.viec = 'xem-truoc-nguoi';
    ds.style.cssText =
      'padding:9px 11px;border:1px solid #e6e0d8;border-radius:8px;' +
      'background:#faf8f5;font-size:12px;line-height:1.7';
    for (const p of kq.persons.slice(0, 10)) ds.append(dongChu(motDongNguoi(p)));
    if (kq.persons.length > 10) {
      const them = dongChu('… và ' + (kq.persons.length - 10) + ' người nữa.');
      them.style.color = '#8a8078';
      ds.append(them);
    }
    hopXemTruoc.append(ds);
  }

  // --- Ghi vào đâu ------------------------------------------------------
  hopXemTruoc.append(veKhoiGhi(kq, tenNguon));
}

/** Một dòng người trong bản xem trước: tên · năm sinh–năm mất · mã. */
function motDongNguoi(p) {
  const ten = fullName((p.names || [])[0]) || '(chưa có tên)';
  const sinh = formatDate(p.birth);
  const mat = formatDate(p.death);
  const phan = [ten];
  if (sinh !== '' || mat !== '') phan.push(sinh + ' – ' + mat);
  phan.push(p.id);
  return phan.join('  ·  ');
}

// ============================================================
// Đường GHI THẬT — việc 11 nửa sau
// ============================================================
//
// ⚠ Đây là chỗ màn hình này ĐỔI BẢN CHẤT. Tới hết nửa A nó chỉ đọc, nên sai
// cũng không mất gì; từ đây nó dựng một gia phả thật trên Drive của người
// dùng và ghi dữ liệu vào đó.
//
// --- Vì sao phải CHỌN cây mới TRƯỚC rồi mới ghi -------------------------
//
// `gas.luuCay()` ghi vào gia phả ĐANG được chọn, không nhận `fileId`. Nên
// muốn ghi vào cây vừa dựng thì bắt buộc: dựng → chọn → nạp → ghi. Hệ quả
// phải nói thẳng với người dùng, và mã dưới đây nói: nếu bước GHI hỏng sau
// khi bước CHỌN đã gật, app đang đứng ở một gia phả mới RỖNG — cây cũ vẫn
// nguyên vẹn, quay về bằng màn *Chọn gia phả*.
//
// Đường sạch hơn là thêm một hàm máy chủ nhận `fileId` để ghi thẳng. Không
// chọn, vì nó bắt sửa `gas/Code.gs` rồi chủ dự án phải triển khai lại bằng
// tay — và cái giá ấy đắt hơn hẳn một câu giải thích đúng lúc.
//
// --- Đường BỔ SUNG nay đi hết (b62, 29/08/2026) ------------------------
//
// Nó dẫn sang `pages/form-ghep-doi.js` — bảng ghép đôi hai cột, chỗ người
// dùng khai điểm neo. Tới b61 bảng ấy dừng ở bản xem trước; từ b62 nó gọi
// ngược lại `chayTronBoSung` bên dưới, và đó là một lần GHI THẬT.
//
// ⚠ Hàm ghi nằm ở ĐÂY chứ không nằm trong bảng ghép đôi, và chỗ ấy có lý do:
// `form-ghep-doi.js` khai phụ thuộc của nó là `state · domains · utils ·
// config` — không có `services`. Cho nó tự gọi `repo.luuCay` là kéo một màn
// hình con xuống làm chỗ ghi thứ hai, và từ đó hai chỗ ghi sẽ trôi lệch nhau.
// Bảng chỉ trao lại lời khai; ghi vẫn là việc của màn hình này.
//
// ⚠ Đường bổ sung cần một gia phả ĐANG MỞ, khác hẳn đường tạo cây mới. Không
// có cây thì nói thẳng ra ở đây, đừng để bảng ghép đôi mở ra rồi mới báo
// "cây rỗng" — lúc ấy người dùng đã đi qua một cửa không dẫn tới đâu.

function veKhoiGhi(kq, tenNguon) {
  const khoi = document.createElement('div');
  khoi.dataset.viec = 'khoi-ghi-that';

  khoi.append(veNhanKhoi('Ghi vào đâu'));

  const nhac = document.createElement('div');
  nhac.style.cssText =
    'padding:10px 12px;border:1px solid #f0d8d0;border-radius:9px;' +
    'background:#fbf0ec;color:#8a3a2a;font-size:12px;line-height:1.6';
  const taiKhoan = (state.phien && state.phien.email) || 'tài khoản của bạn';
  nhac.append(
    dongChu('· Lưu vào Google Drive của ' + taiKhoan + '.'),
    dongChu('· Ghi xong KHÔNG có nút hoàn tác.'),
  );
  khoi.append(nhac);

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:block;margin-top:14px;font-size:14px;font-weight:600';
  nhan.textContent = 'Tên gia phả mới';
  khoi.append(nhan);

  const o = document.createElement('input');
  o.type = 'text';
  o.id = 'giapha-ten-cay-nhap';
  o.value = kq.tenCay || '';
  o.placeholder = 'Ví dụ: Họ Nguyễn Trọng — chi Bắc';
  o.style.cssText =
    'display:block;width:100%;margin-top:6px;padding:10px;box-sizing:border-box;' +
    'font-size:14px;font-family:inherit;border:1px solid #e6e0d8;' +
    'border-radius:9px;background:#faf8f5';
  khoi.append(o);

  const tin = document.createElement('div');
  tin.dataset.viec = 'tin-ghi-that';
  khoi.append(tin);

  const nutGhi = document.createElement('button');
  nutGhi.type = 'button';
  nutGhi.dataset.viec = 'ghi-vao-cay-moi';
  nutGhi.textContent = 'Tạo gia phả mới và ghi vào đó';
  nutGhi.style.cssText =
    'display:block;width:100%;margin:14px auto 0;min-height:44px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;line-height:1.35;border-radius:9px;cursor:pointer;' +
    'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;' +
    'touch-action:manipulation';
  nutGhi.addEventListener('click', () => chayGhiVaoCayMoi(kq, o, nutGhi, tin));
  khoi.append(nutGhi);

  khoi.append(veNhanKhoi('Hoặc bổ sung vào gia phả đang mở'));

  const coCay = !!(state.tree && Array.isArray(state.tree.persons) &&
                   state.tree.persons.length > 0);

  const giaiThich = document.createElement('div');
  giaiThich.style.cssText =
    'font-size:12px;line-height:1.6;color:#8a8078;margin-bottom:8px';
  giaiThich.textContent = coCay
    ? 'Bạn sẽ tự chỉ ra ai trong file là ai trong cây, rồi mới ghi. Ghi xong ' +
      'KHÔNG có nút hoàn tác.'
    : 'Chưa mở gia phả nào có người, nên chưa có ai để ghép. Dùng đường tạo ' +
      'gia phả mới bên trên.';
  khoi.append(giaiThich);

  const nutBoSung = nut('Bổ sung vào gia phả đang mở', false,
                        () => openGhepDoi(kq, (tuyChon, thongKe) =>
                          chayTronBoSung(kq, tenNguon, tuyChon, thongKe)));
  nutBoSung.dataset.viec = 'mo-ghep-doi';
  nutBoSung.disabled = !coCay;
  if (!coCay) {
    nutBoSung.style.opacity = '.45';
    nutBoSung.style.cursor = 'default';
  }
  khoi.append(nutBoSung);

  return khoi;
}

/**
 * Dựng cây mới → chọn nó → nạp → ghi. Bốn bước, mỗi bước một cách hỏng riêng,
 * nên mỗi bước tự kể ra mình hỏng ở đâu.
 */
async function chayGhiVaoCayMoi(kq, o, nutGhi, tin) {
  if (dangGhi) return;

  const ten = String(o.value || '').trim();
  if (!ten) {
    tin.innerHTML = '';
    tin.append(veLoiNhan('Chưa gõ tên gia phả mới.', true));
    try { o.focus(); } catch (e) {}
    return;
  }

  dangGhi = true;
  nutGhi.disabled = true;
  nutGhi.style.opacity = '.45';
  o.disabled = true;
  const noi = (chu_) => {
    if (!lopPhuNhap || !tin.isConnected) return;
    tin.innerHTML = '';
    const d = document.createElement('div');
    d.textContent = chu_;
    d.style.cssText = 'margin-top:10px;font-size:13px;line-height:1.6;color:#8a8078';
    tin.append(d);
  };
  const thua = (chu_) => {
    dangGhi = false;
    if (!lopPhuNhap || !tin.isConnected) return;
    tin.innerHTML = '';
    tin.append(veLoiNhan(chu_, true));
    nutGhi.disabled = false;
    nutGhi.style.opacity = '1';
    o.disabled = false;
  };

  // 1. Dựng trên Drive.
  noi('Đang dựng "' + ten + '" trên Google Drive…');
  const daTao = await taoGiaPhaMoi(ten, { conSong: () => !!lopPhuNhap });
  if (!lopPhuNhap) { dangGhi = false; return; }
  if (!daTao.ok) {
    if (daTao.lyDo === 'daDong') { dangGhi = false; return; }
    return thua(daTao.loi);
  }

  // 2. Chọn nó. Từ đây trở đi app KHÔNG còn đứng ở cây cũ nữa — mọi lời báo
  //    hỏng bên dưới phải nói ra điều đó.
  noi('Đã dựng xong. Đang chuyển sang gia phả mới…');
  let doi;
  try {
    doi = await chonGiaPha(daTao.moi.fileId);
  } catch (e) {
    return thua('Đã dựng được gia phả mới nhưng không chuyển sang được: ' +
                (e && e.message ? e.message : String(e)) +
                ' — cây cũ vẫn nguyên vẹn.');
  }
  if (!doi || !doi.ok) {
    return thua('Đã dựng được gia phả mới nhưng không chuyển sang được: ' +
                ((doi && doi.loi) || 'máy chủ không nói lý do') +
                ' — cây cũ vẫn nguyên vẹn.');
  }

  // 3. Nạp lại TỪ ĐẦU — `khoiTao()` chứ không phải `napCay()`.
  //
  // ⚠ Chỗ này từng là một cái bẫy: `state.phien.suaDuoc` là quyền trên cây
  // CŨ. Người chỉ có quyền xem cây đang mở vẫn là CHỦ của gia phả vừa dựng
  // trong Drive của chính mình — nạp mỗi cây mà không hỏi lại phiên thì
  // `repo.luuCay` chặn họ ghi vào cây của chính họ, và câu từ chối lại nói
  // về quyền, tức chỉ sai đường.
  noi('Đang nạp gia phả mới…');
  try {
    await khoiTao();
  } catch (e) {
    return thua(daChuyenRoi('không nạp được cây mới: ' +
                            (e && e.message ? e.message : String(e))));
  }

  // 4. Dựng dữ liệu rồi ghi. `mergeImported` là hàm thuần và đã từ chối sẵn
  //    mọi cây đích không rỗng — chốt chặn nằm ở đó, không phải ở đây.
  const dung = mergeImported(state.tree, kq, {
    che: 'moi',
    luc: stampNow(),
    nguoiGhi: (state.phien && state.phien.email) || '',
  });
  if (!dung.ok) return thua(daChuyenRoi(dung.loi));

  noi('Đang ghi ' + dung.tomTat.soNguoi + ' người vào gia phả mới…');
  const luu = await luuCay((banNhap) => {
    banNhap.persons = dung.cay.persons;
    banNhap.unions = dung.cay.unions;
    banNhap.sources = dung.cay.sources;
    banNhap.media = [];
    banNhap.tree.rootPersonId = dung.cay.tree.rootPersonId;
  }, {
    action: 'nhapGedcom',
    target: daTao.moi.fileId,
    note: 'Nhập từ file GEDCOM: ' + dung.tomTat.soNguoi + ' người, ' +
          dung.tomTat.soCap + ' gia đình.',
  });
  if (!luu || !luu.ok) {
    return thua(daChuyenRoi((luu && luu.loi) || 'máy chủ không nói lý do'));
  }

  dangGhi = false;
  veHopDaGhi(daTao.moi, dung.tomTat);
}

/**
 * TRỘN BỔ SUNG vào gia phả đang mở — lần ghi thật của đường nhập thứ hai.
 *
 * Nhẹ hơn `chayGhiVaoCayMoi` đúng ba bước: không dựng cây, không chuyển cây,
 * không nạp lại. App vẫn đứng nguyên ở gia phả đang mở, nên mọi cách hỏng
 * của bốn bước kia đều không có ở đây — hỏng thì cây vẫn y nguyên.
 *
 * ⚠ Trả về `{ok, loi}` chứ KHÔNG tự bày lỗi ra màn hình. Bảng ghép đôi mới
 * là chỗ phải hiện lỗi: người dùng vừa ghép tay từng dòng ở đó, và đóng bảng
 * để báo lỗi chỗ khác là bắt họ ghép lại từ đầu.
 *
 * @returns {Promise<{ok:boolean, loi:string}>}
 */
async function chayTronBoSung(kq, tenNguon, tuyChon, thongKe) {
  if (dangGhi) return { ok: false, loi: 'Đang ghi dở một việc khác.' };
  dangGhi = true;

  try {
    // 1. Dựng dữ liệu. Hàm thuần, chưa đụng vào đâu — và nó tự chạy lại phép
    //    dò trùng bằng đúng bộ tuỳ chọn bảng vừa trao, nên bản ghi xuống
    //    đúng bằng bản đã bày.
    const dung = mergeImported(state.tree, kq, {
      che: 'bosung',
      diemNeoTay: (tuyChon && tuyChon.diemNeoTay) || [],
      khaiMoi: (tuyChon && tuyChon.khaiMoi) || [],
      luc: stampNow(),
      nguoiGhi: (state.phien && state.phien.email) || '',
      tenFile: tenNguon || '',
    });
    if (!dung.ok) return { ok: false, loi: dung.loi };

    const t = dung.tomTat;

    // ⚠ CÓ ĐỔI ĐƯỢC GÌ KHÔNG — hỏi TRƯỚC khi ghi, và trả lời bằng chính con
    // số vừa tính, không bằng chuyện máy chủ có gật hay không.
    //
    // Đây là lỗi chủ dự án đo được 30/08/2026: *"app thông báo đã hợp nhất
    // nhưng tải lại thì không có dữ liệu mới"*. Cả đường ghi chạy đúng, máy
    // chủ gật thật, file trên Drive đổi thật — nhưng thứ đổi chỉ là số
    // revision, một mục nhật ký và một mục sổ nhập. Không một con người nào
    // được thêm. Mà tấm biển trên cùng vẫn đề *"Đã hợp nhất xong"*.
    //
    // Xảy ra bất cứ khi nào MỌI bản ghi trong file đều đã có trong cây và
    // không ô trống nào được điền — ca dễ gặp nhất đời thường: nhập lại đúng
    // file đã nhập hôm trước. Dựng lại được bằng `kiem-duong-ghi-bo-sung.mjs`.
    const coDoi = (t.themNguoi + t.themCap + t.themNguon +
                   t.suaNguoi + t.suaCap) > 0;

    // 2. Ghi. `luuCay` tự cập nhật `state.tree` và dựng lại chỉ mục khi máy
    //    chủ gật, nên sơ đồ đằng sau lớp phủ tự vẽ lại — không phải tải trang.
    const luu = await luuCay((banNhap) => {
      banNhap.persons = dung.cay.persons;
      banNhap.unions  = dung.cay.unions;
      banNhap.sources = dung.cay.sources;
      banNhap.imports = dung.cay.imports;
    }, {
      action: 'nhapBoSung',
      target: (state.tree && state.tree.tree && state.tree.tree.id) || '',
      note: 'Bổ sung từ file GEDCOM' + (tenNguon ? ' "' + tenNguon + '"' : '') +
            (coDoi
              ? ': thêm ' + t.themNguoi + ' người, ' + t.themCap + ' gia đình; ' +
                'bổ sung chi tiết cho ' + t.suaNguoi + ' người, ' + t.suaCap +
                ' gia đình.'
              : ': KHÔNG thêm và KHÔNG sửa bản ghi nào — mọi bản ghi trong ' +
                'file đều đã có trong cây. Lần ghi này chỉ cất bảng ghép đôi ' +
                'vào sổ nhập.'),
    });
    if (!luu || !luu.ok) {
      return {
        ok: false,
        loi: 'Chưa ghi được nên gia phả vẫn y nguyên: ' +
             ((luu && luu.loi) || 'máy chủ không nói lý do'),
      };
    }

    closeGhepDoi();
    veHopDaTron(t, dung.boQua, tenNguon, coDoi);
    return { ok: true, loi: '' };
  } finally {
    dangGhi = false;
  }
}

/**
 * Ghi xong thì kể lại ĐÃ ĐỔI GÌ, và kể cả chỗ KHÔNG đổi được.
 *
 * ⚠ `boQua` phải bày ra chứ không được nuốt. Đó là những chỗ file có nói mà
 * app không ghi nổi — người dùng tưởng đã nhập hết thì họ sẽ không bao giờ
 * quay lại sửa tay mấy chỗ ấy nữa.
 */
function veHopDaTron(t, boQua, tenNguon, coDoi) {
  const hop = lopPhuNhap && lopPhuNhap.querySelector('#giapha-nhap-gedcom');
  if (!hop) return;

  hop.innerHTML = '';
  hopXemTruoc = null;

  // ⚠ HAI TẤM BIỂN KHÁC HẲN NHAU, và mang HAI `data-viec` khác nhau.
  //
  // Dùng chung một tấm biển rồi để mấy con số bên dưới nói sự thật là cách
  // đã hỏng: người ta đọc dòng chữ to, không đọc bảng số. Và một bài kiểm
  // dò theo `data-viec` cũng đọc y như thế — chung một tên thì nó không
  // phân biệt nổi hai ca, tức là canh được đúng một nửa.
  const tieuDe = document.createElement('div');
  tieuDe.textContent = coDoi
    ? 'Đã hợp nhất xong'
    : 'KHÔNG thêm được ai — gia phả giữ nguyên';
  tieuDe.dataset.viec = coDoi ? 'da-tron-xong' : 'khong-doi-gi';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600' +
    (coDoi ? '' : ';color:#8a3a2a');
  hop.append(tieuDe);

  if (!coDoi) {
    hop.append(veLoiNhan(
      'Mọi bản ghi trong file đều đã có sẵn trong gia phả, và không ô nào ' +
      'đang trống được điền thêm. Nên lần này KHÔNG có người mới, KHÔNG có ' +
      'gia đình mới, và không một ô nào đổi giá trị — tải lại trang cũng sẽ ' +
      'không thấy gì mới, đó là đúng chứ không phải hỏng.', false));
  }

  const so = document.createElement('div');
  so.dataset.viec = 'tom-tat-da-tron';
  so.style.cssText =
    'margin-top:10px;padding:10px 12px;border:1px solid #e6e0d8;border-radius:9px;' +
    'background:#faf8f5;font-size:13px;line-height:1.7';
  so.append(
    dongChu('· Thêm mới: ' + t.themNguoi + ' người · ' + t.themCap + ' gia đình'),
    dongChu('· Bổ sung chi tiết: ' + t.suaNguoi + ' người · ' + t.suaCap +
            ' gia đình (' + t.soBoSung + ' ô đang trống được điền)'),
    dongChu('· Gia phả nay có ' + t.soNguoi + ' người · ' + t.soCap + ' gia đình'),
  );
  hop.append(so);

  if (t.soGiu > 0) {
    hop.append(veLoiNhan(
      'Có ' + t.soGiu + ' chỗ hai bên nói khác nhau. App GIỮ nguyên của gia ' +
      'phả, không lấy của file. Muốn đổi thì sửa tay từng người.', false));
  }

  if (Array.isArray(boQua) && boQua.length > 0) {
    hop.append(veNhanKhoi('Mấy chỗ file có nói mà app chưa ghi được'));
    const k = document.createElement('div');
    k.dataset.viec = 'bo-qua-khi-tron';
    k.style.cssText =
      'padding:9px 11px;border:1px solid #e6e0d8;border-radius:8px;' +
      'background:#faf8f5;font-size:12px;line-height:1.7;color:#6a4a40';
    for (const b of boQua.slice(0, 20)) {
      k.append(dongChu('· ' + b.id + ' — ' + b.nhan + ': ' + b.vi));
    }
    if (boQua.length > 20) {
      k.append(dongChu('… và ' + (boQua.length - 20) + ' chỗ nữa.'));
    }
    hop.append(k);
  }

  const nhac = document.createElement('div');
  nhac.style.cssText =
    'margin-top:12px;font-size:12px;line-height:1.7;color:#8a8078';
  nhac.append(
    dongChu('· Ảnh không nằm trong file .ged nên lần hợp nhất này không mang ảnh nào sang.'),
    dongChu('· App đã ghi lại "dòng nào trong file là ai trong cây". Lần sau ' +
            'nhập tiếp từ ' + (tenNguon || 'cùng nguồn ấy') + ', bạn không ' +
            'phải ghép lại những người đã ghép hôm nay.'),
  );
  hop.append(nhac);

  const nutDong = document.createElement('button');
  nutDong.type = 'button';
  nutDong.dataset.viec = 'dong-sau-tron';
  nutDong.textContent = 'Xong';
  nutDong.style.cssText =
    'display:block;width:100%;margin:16px auto 0;height:44px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;border-radius:9px;cursor:pointer;' +
    'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;' +
    'touch-action:manipulation';
  nutDong.addEventListener('click', () => closeNhapGedcom());
  hop.append(nutDong);
}

/** Câu báo hỏng SAU khi app đã chuyển cây — chỗ dễ làm người dùng hoảng nhất. */
function daChuyenRoi(cau) {
  return 'App đã chuyển sang gia phả mới nhưng chưa ghi được gì vào đó: ' +
         cau + ' Gia phả cũ của bạn vẫn nguyên vẹn — vào Cài đặt → Chọn gia ' +
         'phả để quay về.';
}

/** Ghi xong. Kể lại việc còn phải làm tay trên Drive, cùng khuôn màn Chọn gia phả. */
function veHopDaGhi(moi, tomTat) {
  const hop = lopPhuNhap && lopPhuNhap.querySelector('#giapha-nhap-gedcom');
  if (!hop) return;

  hop.innerHTML = '';
  hopXemTruoc = null;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Đã ghi xong';
  tieuDe.dataset.viec = 'da-ghi-xong';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(tieuDe);

  const so = document.createElement('div');
  so.style.cssText =
    'margin-top:10px;padding:10px 12px;border:1px solid #e6e0d8;border-radius:9px;' +
    'background:#faf8f5;font-size:13px;line-height:1.6';
  so.textContent = moi.ten + '  ·  ' + tomTat.soNguoi + ' người · ' +
                   tomTat.soCap + ' gia đình';
  hop.append(so);

  const nhac = document.createElement('div');
  nhac.style.cssText =
    'margin-top:12px;font-size:12px;line-height:1.7;color:#8a8078';
  nhac.append(
    dongChu('· App nay mở gia phả mới này. Muốn quay về cây cũ thì vào Cài ' +
            'đặt → Chọn gia phả.'),
    dongChu('· Ảnh không nằm trong file .ged nên gia phả mới chưa có ảnh nào.'),
    dongChu('· Muốn người trong họ xem được thì vào Google Drive chia sẻ HAI ' +
            'thứ, từng cái một: file "' + moi.tenFile + '", và thư mục "Anh" ' +
            'bên cạnh nó. ĐỪNG chia sẻ thư mục mẹ — làm thế là trao luôn ' +
            'thư mục "Sao_luu", tức quyền ghi đè cả gia phả.'),
  );
  hop.append(nhac);

  const nutTai = document.createElement('button');
  nutTai.type = 'button';
  nutTai.dataset.viec = 'tai-lai-sau-nhap';
  nutTai.textContent = 'Tải lại trang';
  nutTai.style.cssText =
    'display:block;width:100%;margin:16px auto 0;height:44px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;border-radius:9px;cursor:pointer;' +
    'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;' +
    'touch-action:manipulation';
  nutTai.addEventListener('click', () => location.reload());
  hop.append(nutTai);
}

// ============================================================
// Việc 12 — chưa làm
// ============================================================

/** Xuất sơ đồ đang hiện thành PNG. */
export async function exportPng() { /* TODO — việc 12 */ }

/** Xuất PDF khổ lớn để in. */
export async function exportPdf() { /* TODO — việc 12 */ }

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
