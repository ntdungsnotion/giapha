// ============================================================
// giapha · js/pages/khoi-dong.js
// Vai trò  : Màn hình mở đầu — chờ máy chủ trả danh tính và quyền,
//            báo lỗi rõ ràng nếu người dùng không có quyền xem.
// Lớp      : pages
// Phụ thuộc: services/repo, pages/tree-view
// Phiên bản: 0.6.0 · Cập nhật: 17/08/2026 08:58
// ============================================================
//
// Chat 1.5 đã gỡ hẳn khối thử 0.11 và bảng "Đã kết nối máy chủ" đi cùng nó.
// Phép thử đã ĐẠT (xem KE-HOACH, mục "Người trung tâm mặc định theo tài
// khoản"), và từ chat 1.4 sơ đồ vẽ được ra màn hình đã tự chứng minh cả chuỗi
// hạ tầng thông — bảng xác nhận không còn kiểm được thứ gì mà sơ đồ chưa kiểm.
//
// Máy chủ vẫn giữ đủ ba hàm `datNguoiTrungTamMacDinh` · `xoaNguoiTrungTamMacDinh`
// · phần đọc đã gộp trong `layPhien()`, và `services/gas.js` vẫn bọc sẵn cả ba.
// Màn hình Cài đặt sẽ gọi tới chúng; không có gì bị mất theo khối thử này.

import * as repo from '../services/repo.js';
import { mountTreeView } from './tree-view.js';

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

  // Chat 1.4: đọc được cây thì mở thẳng sơ đồ.
  mountTreeView(containerEl);
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
