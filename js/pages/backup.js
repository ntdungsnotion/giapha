// ============================================================
// giapha · js/pages/backup.js
// Vai trò  : Màn hình Sao lưu & khôi phục — cất bản phòng hờ, và quay về nó
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, services/gas, config
// Phiên bản: 1.0.0 · Cập nhật: 22/08/2026 00:40
// ============================================================
//
// Máy chủ đã tự cất bản phòng hờ từ bước 16 (`saoLuuNeuDenHan_`). Thứ thiếu là
// đường TÌM LẠI: trước màn hình này, muốn lấy bản cũ về thì phải rời app, mở
// Drive, vào thư mục Sao_luu, tải file xuống, rồi tải đè lên file gia phả bằng
// *Quản lý các phiên bản*. Năm bước, không bước nào làm trong app, và tất cả
// diễn ra đúng lúc người ta đang hoảng vì vừa làm hỏng cái gì đó.
//
// --- BỐN QUYẾT ĐỊNH của màn hình này -------------------------------------
//
// 1. **Xem trước là BẮT BUỘC, không phải tuỳ chọn.** Bấm một dòng KHÔNG khôi
//    phục ngay — nó mở bản ấy ra đếm người rồi mới hỏi. Tên file chỉ nói ngày
//    giờ và số revision; hai con số ấy không cho biết cái giá của việc ghi đè.
//    *"Quay về bản 57 người, bản đang dùng 59 người"* thì cho biết.
//
// 2. **Hộp xác nhận kể ĐÚNG BỐN DÒNG.** Ràng buộc BỐ CỤC, học từ b37: bản đầu
//    của hộp dọn rác kể sáu dòng, và sáu dòng ấy đẩy nút xác nhận xuống quá mép
//    dưới khung 390px. Người phải cuộn đi tìm nút thì không đọc dòng nào. Thêm
//    ý mới vào đây thì phải gộp bớt chỗ khác.
//
// 3. **Xong thì TẢI LẠI TRANG, không vá `state` tại chỗ.** Khôi phục đổi cả
//    cây: người đang đứng giữa sơ đồ có thể không còn tồn tại trong bản vừa
//    quay về, mọi màn hình đang mở đang cầm mã của bản cũ. Nạp lại cây rồi tự
//    chữa từng chỗ là một danh sách không ai biết đã đủ chưa. `location.reload()`
//    đi qua đúng đường khởi động đã chạy đúng hàng trăm lần.
//
// 4. **Không có nút XOÁ bản sao lưu.** Máy chủ tự dọn, giữ `SAO_LUU.giuLai`
//    bản mới nhất. Một cái nút xoá ở đây chỉ phục vụ đúng một việc: xoá mất
//    đường lùi, ngay trong màn hình sinh ra để giữ đường lùi.
//
// ⚠ CHỈ CHỦ DỰ ÁN DÙNG ĐƯỢC. Thư mục Sao_luu chỉ chia sẻ cho một người
// (`PHAN-QUYEN_V03`), mà script chạy bằng danh tính người đang truy cập. Người
// biên tập khác mở màn hình này sẽ đọc được một câu nói thẳng điều đó — không
// phải một danh sách rỗng, thứ khiến người ta tưởng chưa có bản sao lưu nào.

import { state } from '../state.js';
import { coMayChu, layDanhSachSaoLuu, saoLuuNgay, xemBanSaoLuu,
         khoiPhucSaoLuu } from '../services/gas.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

let lopPhu  = null;
let khoiDs  = null;    // khối danh sách, vẽ lại riêng sau mỗi lần sao lưu
let khoiTin = null;    // khối lời nhắn dưới nút "Sao lưu ngay"
let dangChay = false;  // chặn bấm hai lần trong lúc chờ máy chủ

/** Màn hình có đang mở không — bài kiểm và nơi gọi đọc. */
export function dangMoBackup() {
  return !!lopPhu;
}

export function closeBackup() {
  if (lopPhu) lopPhu.remove();
  lopPhu  = null;
  khoiDs  = null;
  khoiTin = null;
  dangChay = false;
}

/** Mở màn hình Sao lưu & khôi phục. */
export function openBackup() {
  closeBackup();

  lopPhu = document.createElement('div');
  lopPhu.id = 'giapha-lop-sao-luu';
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.id = 'giapha-sao-luu';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sao lưu & khôi phục';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent =
    'Máy chủ tự cất bản phòng hờ mỗi lần lưu, nếu đã cách bản trước đủ lâu. ' +
    'Sắp làm việc lớn thì cất thêm một bản ngay ở đây.';
  phu.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-top:6px';

  hop.append(tieuDe, phu);

  // --- Nút "Sao lưu ngay" ------------------------------------------------
  const coNoi = coMayChu();
  hop.append(nut('Sao lưu ngay', true, coNoi, () => chaySaoLuuNgay()));

  khoiTin = document.createElement('div');
  hop.append(khoiTin);

  if (!coNoi) {
    khoiTin.append(loiNhan(
      'Trang này đang mở thẳng từ GitHub Pages nên không nối được máy chủ. ' +
      'Mở app qua địa chỉ web app của Apps Script thì mới sao lưu được.', false));
  }

  // --- Danh sách bản sao lưu --------------------------------------------
  khoiDs = document.createElement('div');
  khoiDs.style.cssText = 'margin-top:18px';
  hop.append(khoiDs);

  hop.append(nut('Đóng', false, true, () => closeBackup()));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeBackup(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  if (coNoi) napDanhSach();
  else khoiDs.append(nhan('Các bản sao lưu đã cất'));
}

// ============================================================
// Danh sách
// ============================================================

async function napDanhSach() {
  const khoi = khoiDs;
  if (!khoi) return;
  khoi.innerHTML = '';
  khoi.append(nhan('Các bản sao lưu đã cất'));
  khoi.append(doanChu('Đang đọc thư mục Sao_luu…'));

  let kq;
  try {
    kq = await layDanhSachSaoLuu();
  } catch (e) {
    if (khoiDs !== khoi) return;
    khoi.innerHTML = '';
    khoi.append(nhan('Các bản sao lưu đã cất'));
    khoi.append(loiNhan(cauLoiMayChu(e), true));
    return;
  }
  if (khoiDs !== khoi) return;

  khoi.innerHTML = '';
  khoi.append(nhan('Các bản sao lưu đã cất'));

  if (!kq || !kq.ok) {
    khoi.append(loiNhan((kq && kq.loi) || 'Máy chủ không trả về danh sách.', true));
    return;
  }
  if (!kq.ds || kq.ds.length === 0) {
    khoi.append(doanChu(
      'Chưa có bản sao lưu nào trong thư mục Sao_luu. Bấm "Sao lưu ngay" ở ' +
      'trên để cất bản đầu tiên.'));
    return;
  }

  for (let i = 0; i < kq.ds.length; i++) {
    khoi.append(dongSaoLuu(kq.ds[i], i === 0));
  }

  khoi.append(doanChu(
    'Bấm một dòng để xem bản ấy có gì trước khi quyết định. Máy chủ giữ lại ' +
    'các bản mới nhất và tự dọn bản quá cũ.'));
}

/** Một dòng bấm được. Kể ngày giờ, số revision, cỡ file — không kể tên file. */
function dongSaoLuu(muc, laMoiNhat) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.saoLuu = muc.fileId;
  b.style.cssText =
    'display:block;width:100%;text-align:left;margin-top:6px;padding:10px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-family:inherit;color:#2a2622;cursor:pointer;touch-action:manipulation';

  const d1 = document.createElement('div');
  d1.textContent = muc.luc + (laMoiNhat ? '   ·   mới nhất' : '');
  d1.style.cssText = 'font-size:14px';

  const d2 = document.createElement('div');
  // Trường trống thì không ghép vào — luật chung của app, không hiện "không rõ".
  d2.textContent = [
    (muc.revision === null || muc.revision === undefined) ? '' : 'bản ghi số ' + muc.revision,
    coCoc(muc.co),
  ].filter((x) => !!x).join('  ·  ');
  d2.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px';

  b.append(d1, d2);
  if (d2.textContent === '') d2.remove();

  b.addEventListener('click', () => moHopKhoiPhuc(muc));
  return b;
}

// ============================================================
// "Sao lưu ngay"
// ============================================================

async function chaySaoLuuNgay() {
  if (dangChay) return;
  dangChay = true;
  const khoi = khoiTin;
  if (khoi) { khoi.innerHTML = ''; khoi.append(doanChu('Đang cất bản sao lưu…')); }

  let kq;
  try {
    kq = await saoLuuNgay();
  } catch (e) {
    dangChay = false;
    if (khoiTin === khoi && khoi) { khoi.innerHTML = ''; khoi.append(loiNhan(cauLoiMayChu(e), true)); }
    return;
  }

  dangChay = false;
  if (khoiTin !== khoi || !khoi) return;
  khoi.innerHTML = '';

  if (!kq || !kq.ok) {
    khoi.append(loiNhan((kq && kq.loi) || 'Máy chủ không cất được bản sao lưu.', true));
    return;
  }

  khoi.append(loiNhan('Đã cất xong: ' + kq.ten, false));
  napDanhSach();
}

// ============================================================
// Hộp khôi phục — xem trước, rồi hỏi
// ============================================================

/**
 * Mở bản sao lưu ra xem rồi hỏi.
 *
 * Vẽ đè lên chính hộp đang mở chứ không dựng lớp phủ thứ hai: hai lớp phủ
 * chồng nhau là cái bẫy đã sập một lần ở bước 26 — lớp mở sau nằm dưới lớp mở
 * trước và người dùng bấm vào khoảng không.
 */
async function moHopKhoiPhuc(muc) {
  const hop = lopPhu && lopPhu.querySelector('#giapha-sao-luu');
  if (!hop) return;

  hop.innerHTML = '';
  hop.append(tieuDeHop('Khôi phục bản này?'), doanChu('Đang mở bản sao lưu ra xem…'));

  let kq;
  try {
    kq = await xemBanSaoLuu(muc.fileId);
  } catch (e) {
    veHopLoi(hop, cauLoiMayChu(e));
    return;
  }
  if (!lopPhu) return;
  if (!kq || !kq.ok) {
    veHopLoi(hop, (kq && kq.loi) || 'Không mở được bản sao lưu ấy.');
    return;
  }

  hop.innerHTML = '';
  hop.append(tieuDeHop('Khôi phục bản này?'));
  // Chỉ NGÀY GIỜ, không kể tên file: cái tên dài 44 ký tự xuống hai dòng trên
  // khung 390px, và nó không nói thêm gì mà dòng ngày giờ chưa nói. Tên file
  // vẫn được ghi vào `changeLog` khi khôi phục — chỗ cần tra ngược là ở đó,
  // không phải ở cái hộp người ta đọc trong ba giây rồi bấm.
  hop.append(doanChu(muc.luc));

  for (const dong of bonDongHauQua(kq)) hop.append(gachDau(dong));

  const nutLam = nut('Khôi phục — ghi đè gia phả', true, true,
                     () => chayKhoiPhuc(muc, kq, nutLam));
  nutLam.style.background = '#8a3a2a';
  nutLam.style.borderColor = '#8a3a2a';
  hop.append(nutLam);
  hop.append(nut('Quay lại', false, true, () => openBackup()));
}

/**
 * ĐÚNG BỐN DÒNG. Xem quyết định 2 ở đầu file trước khi thêm dòng thứ năm.
 *
 * Thứ tự cũng cố ý: cái GIÁ đứng trước cái BẢO ĐẢM. Đọc dòng "có sao lưu, yên
 * tâm" trước thì hai dòng đầu chỉ còn là thủ tục.
 */
function bonDongHauQua(kq) {
  const t = kq.tomTat  || {};
  const h = kq.hienTai || null;

  const veBan = 'Gia phả quay về đúng bản này: ' + t.persons + ' người · ' +
                t.unions + ' cặp' +
                (h ? '  (bản đang dùng: ' + h.persons + ' người · ' + h.unions + ' cặp)' : '') + '.';

  const veMat = 'Mọi thay đổi làm SAU lúc ' +
                (t.updatedAt || 'bản sao lưu được cất') +
                ' sẽ mất — thêm người, sửa hồ sơ, nối, gỡ nối, tất cả.';

  const veLui = 'Trước khi ghi đè, máy chủ cất bản đang dùng thành một bản sao ' +
                'lưu mới. Không cất được thì KHÔNG khôi phục gì cả.';

  const veAnh = 'Ảnh trên Drive không bị đụng tới. Xong thì app tự tải lại trang.';

  return [veBan, veMat, veLui, veAnh];
}

async function chayKhoiPhuc(muc, xem, nutLam) {
  if (dangChay) return;
  dangChay = true;
  nutLam.disabled = true;
  nutLam.style.opacity = '.45';

  const hop = lopPhu && lopPhu.querySelector('#giapha-sao-luu');
  if (hop) {
    const cho = doanChu('Đang khôi phục… đừng đóng trang.');
    cho.id = 'giapha-sao-luu-cho';
    hop.append(cho);
  }

  let kq;
  try {
    kq = await khoiPhucSaoLuu(muc.fileId, state.headRevisionId || '');
  } catch (e) {
    dangChay = false;
    if (hop) veHopLoi(hop, cauLoiMayChu(e));
    return;
  }

  dangChay = false;
  if (!lopPhu || !hop) return;

  if (!kq || !kq.ok) {
    veHopLoi(hop, (kq && kq.loi) || 'Máy chủ từ chối khôi phục.');
    return;
  }

  hop.innerHTML = '';
  hop.append(tieuDeHop('Đã khôi phục'));
  hop.append(gachDau('Gia phả nay là bản ' + muc.luc + ': ' +
                     kq.tomTatSau.persons + ' người · ' + kq.tomTatSau.unions + ' cặp.'));
  hop.append(gachDau('Bản vừa bị thay đã được cất thành: ' + kq.saoLuu +
                     ' — đổi ý thì quay về nó theo đúng đường này.'));
  hop.append(nut('Tải lại trang', true, true, () => location.reload()));
}

function veHopLoi(hop, cau) {
  hop.innerHTML = '';
  hop.append(tieuDeHop('Chưa khôi phục gì cả'));
  hop.append(loiNhan(cau, true));
  hop.append(nut('Quay lại', false, true, () => openBackup()));
}

// ============================================================
// Mấy mẩu dùng chung
// ============================================================

/**
 * Lỗi ném ra từ `services/gas.js`.
 *
 * ⚠ Ca RIÊNG phải bắt: mã trong `js/` nằm trên GitHub Pages nên đẩy lên là có
 * hiệu lực ngay, còn `gas/Code.gs` chỉ chạy sau khi bấm *Triển khai*. Giữa hai
 * mốc ấy, trình duyệt gọi một hàm máy chủ CHƯA TỒN TẠI, và câu Apps Script trả
 * về là "Script function not found" — một câu người không lập trình đọc xong
 * sẽ nghĩ app hỏng. Nói đúng việc phải làm thay vì thuật lại câu ấy.
 */
function cauLoiMayChu(e) {
  const chu = String((e && e.message) || e || '');
  if (chu.indexOf('not found') >= 0 || chu.indexOf('Script function') >= 0) {
    return 'Máy chủ chưa có chức năng này. Người quản lý cần mở Apps Script và ' +
           'bấm: Triển khai → Quản lý các bản triển khai → bút chì → ' +
           'Phiên bản: "Phiên bản mới" → Triển khai. Sau đó tải lại trang.';
  }
  return chu || 'Không gọi được máy chủ.';
}

function tieuDeHop(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:19px;font-weight:600';
  return d;
}

function nhan(chu) {
  const n = document.createElement('div');
  n.textContent = chu;
  n.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078;margin-bottom:6px';
  return n;
}

function doanChu(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078;margin-top:8px';
  return d;
}

function gachDau(chu) {
  const d = document.createElement('div');
  d.textContent = '• ' + chu;
  d.style.cssText =
    'font-size:13px;line-height:1.55;margin-top:8px;overflow-wrap:anywhere';
  return d;
}

function loiNhan(chu, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:10px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4');
  return d;
}

function nut(chu, chinh, batDuoc, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'display:block;width:100%;margin:12px auto 0;min-height:42px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border-radius:9px;touch-action:manipulation;line-height:1.35;' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45') + ';' +
    (chinh
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  if (batDuoc) b.addEventListener('click', chay);
  return b;
}

/** Cỡ file cho người đọc. Thiếu số thì trả chuỗi rỗng, không đoán. */
function coCoc(so) {
  const n = Number(so);
  if (!isFinite(n) || n <= 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}
