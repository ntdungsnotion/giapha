// ============================================================
// giapha · js/pages/khoi-dong.js
// Vai trò  : Màn hình mở đầu — chờ máy chủ trả danh tính và quyền,
//            báo lỗi rõ ràng nếu người dùng không có quyền xem.
// Lớp      : pages
// Phụ thuộc: state, services/repo
// Phiên bản: 0.2.0 · Cập nhật: 15/08/2026 12:16
// ============================================================

import * as repo from '../services/repo.js';
import { state } from '../state.js';

/**
 * Hiện màn hình chờ, gọi repo.khoiTao(), rồi chuyển sang tree-view.
 * @returns {Promise<boolean>} true nếu người dùng đọc được cây
 */
export async function mountKhoiDong(containerEl) {
  hienManHinhCho(containerEl);

  let phien;
  try {
    phien = await repo.khoiTao();
  } catch (loi) {
    hienManHinhLoi(containerEl, loi);
    return false;
  }

  if (phien.loi) {
    hienManHinhLoi(containerEl, new Error(phien.loi));
    return false;
  }

  if (!phien.docDuoc) {
    hienManHinhKhongCoQuyen(containerEl, phien);
    return false;
  }

  // TODO — chat 1.4: chỗ này chuyển sang mountTreeView(containerEl).
  // Tới khi có sơ đồ, hiện bảng xác nhận kết nối để còn kiểm hạ tầng.
  hienManHinhDaKetNoi(containerEl, phien);
  return true;
}

// ============================================================
// Các màn hình
// ============================================================

function hienManHinhCho(el) {
  el.innerHTML = '';
  el.append(khung([
    tieuDe('Đang mở gia phả…'),
    doan('Lần đầu mở, Google có thể hỏi bạn cấp quyền. Đó là bình thường.'),
  ]));
}

/**
 * Người không được chia sẻ file sẽ rơi vào đây.
 * Thông báo phải nói rõ phải làm gì, KHÔNG hiện lỗi kỹ thuật thô.
 */
function hienManHinhKhongCoQuyen(el, phien) {
  el.innerHTML = '';
  el.append(khung([
    tieuDe('Bạn chưa được cấp quyền xem'),
    doan('Bạn chưa được cấp quyền xem cây gia phả ' + (phien.tenHo || '') + '.'),
    doan('Liên hệ ' + (phien.nguoiQuanLy || '') + ' để được thêm vào.'),
    phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
  ]));
}

/** Lỗi mạng hoặc máy chủ — kèm nút Thử lại. */
function hienManHinhLoi(el, loi) {
  el.innerHTML = '';
  const nut = document.createElement('button');
  nut.textContent = 'Thử lại';
  nut.style.cssText = 'margin-top:16px;padding:10px 20px;font-size:16px;' +
                      'border:1px solid #c8bfb2;border-radius:8px;' +
                      'background:#fff;cursor:pointer';
  nut.addEventListener('click', () => mountKhoiDong(el));

  el.append(khung([
    tieuDe('Không mở được gia phả'),
    doan('Kiểm tra kết nối mạng rồi thử lại.'),
    nhoMo(String(loi && loi.message || loi)),
    nut,
  ]));
}

/** Tạm thời, cho mục 0.12: xác nhận cả chuỗi hạ tầng đã thông. */
function hienManHinhDaKetNoi(el, phien) {
  const vaiTro = {
    chu:  'Chủ sở hữu — sửa được',
    sua:  'Người chỉnh sửa — sửa được',
    xem:  'Người xem — chỉ đọc',
    khong:'Không có quyền',
  }[phien.vaiTro] || phien.vaiTro;

  el.innerHTML = '';
  el.append(khung([
    tieuDe('Đã kết nối máy chủ'),
    bang([
      ['Tài khoản',              phien.email || '(không lấy được)'],
      ['Quyền',                  vaiTro],
      ['Đọc được file dữ liệu',  phien.docDuoc ? 'có' : 'không'],
      ['Sửa được',               phien.suaDuoc ? 'có' : 'không'],
      ['Người trung tâm mặc định', phien.nguoiTrungTamMacDinh || '(chưa đặt)'],
    ]),
    nhoMo('Đây là màn hình tạm của mục 0.12. Sơ đồ cây làm ở chat 1.4.'),
  ]));
}

// ============================================================
// Vài mẩu DOM dùng chung. Không thư viện, không bước build.
// ============================================================

function khung(phanTu) {
  const d = document.createElement('div');
  d.style.cssText = 'max-width:520px;margin:0 auto;padding:32px 24px;' +
                    'font-family:system-ui,sans-serif;color:#2a2622;' +
                    'line-height:1.6';
  phanTu.filter(Boolean).forEach(x => d.append(x));
  return d;
}

function tieuDe(chu) {
  const h = document.createElement('h1');
  h.textContent = chu;
  h.style.cssText = 'font-size:20px;margin:0 0 12px';
  return h;
}

function doan(chu) {
  const p = document.createElement('p');
  p.textContent = chu;
  p.style.margin = '0 0 10px';
  return p;
}

function nhoMo(chu) {
  const p = document.createElement('p');
  p.textContent = chu;
  p.style.cssText = 'margin:16px 0 0;font-size:13px;color:#8a8078';
  return p;
}

function bang(hang) {
  const t = document.createElement('table');
  t.style.cssText = 'border-collapse:collapse;font-size:15px;margin:8px 0';
  for (const [nhan, giaTri] of hang) {
    const tr = t.insertRow();
    const a = tr.insertCell();
    const b = tr.insertCell();
    a.textContent = nhan;
    b.textContent = giaTri;
    a.style.cssText = 'padding:5px 14px 5px 0;color:#8a8078;white-space:nowrap';
    b.style.cssText = 'padding:5px 0';
  }
  return t;
}
