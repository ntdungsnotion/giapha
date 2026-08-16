// ============================================================
// giapha · js/pages/khoi-dong.js
// Vai trò  : Màn hình mở đầu — chờ máy chủ trả danh tính và quyền,
//            báo lỗi rõ ràng nếu người dùng không có quyền xem.
// Lớp      : pages
// Phụ thuộc: state, services/repo, services/gas, pages/tree-view
// Phiên bản: 0.5.0 · Cập nhật: 16/08/2026 23:45
// ============================================================

import * as repo from '../services/repo.js';
import * as gas from '../services/gas.js';
import { state } from '../state.js';
import { mountTreeView } from './tree-view.js';

/** Kết quả thao tác gần nhất của phép thử 0.11, giữ qua một lần vẽ lại. */
let thongDiepThu = null;

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
  //
  // Bảng xác nhận kết nối của mục 0.12 từ nay không còn tự hiện ra — cùng với
  // nó là khối thử 0.11 ở cuối file. Phép thử 0.11 đã ĐẠT (xem KE-HOACH), nên
  // đây không phải mất mát gì; mã của cả hai giữ nguyên tới chat 1.5 mới gỡ,
  // để nếu hạ tầng trục trặc thì còn gọi tay lại được ngay.
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

/** Tạm thời, cho mục 0.12: xác nhận cả chuỗi hạ tầng đã thông. */
function hienManHinhDaKetNoi(el, phien) {
  const vaiTro = {
    chu:  'Chủ sở hữu — sửa được',
    sua:  'Người chỉnh sửa — sửa được',
    xem:  'Người xem — chỉ đọc',
    khong:'Không có quyền',
  }[phien.vaiTro] || phien.vaiTro;

  const khoUP = phien.loiUserProperties
    ? 'KHÔNG ĐỌC ĐƯỢC — ' + phien.loiUserProperties
    : 'đọc được';

  // Chat 1.1 — điểm dừng của phiên: con số này phải ra 32 người, 13 hôn nhân.
  const soDoc = state.index
    ? state.index.personById.size + ' người · ' +
      state.index.unionById.size + ' hôn nhân' +
      (state.daLocNguoiConSong ? ' · đã ẩn chi tiết người còn sống' : '')
    : '(chưa nạp được)';

  el.innerHTML = '';
  el.append(khung([
    tieuDe('Đã kết nối máy chủ'),
    bang([
      ['Tài khoản',              phien.email || '(không lấy được)'],
      ['Quyền',                  vaiTro],
      ['Đọc được file dữ liệu',  phien.docDuoc ? 'có' : 'không'],
      ['Sửa được',               phien.suaDuoc ? 'có' : 'không'],
      ['Kho cài đặt riêng',      khoUP],
      ['Người trung tâm mặc định', phien.nguoiTrungTamMacDinh || '(chưa đặt)'],
      ['Số người đọc được',      soDoc],
    ]),
    khoiThuUserProperties(el),
    nhoMo('Đây là màn hình tạm của mục 0.12. Sơ đồ cây làm ở chat 1.4.'),
  ]));
}

// ============================================================
// Khối tạm cho PHÉP THỬ 0.11 — gỡ bỏ ở chat 1.5
// ============================================================
//
// Câu hỏi cần trả lời: PropertiesService.getUserProperties() có thật sự tách
// riêng theo từng tài khoản khi web app chạy ở chế độ "Thực thi bằng: Người
// dùng truy cập ứng dụng web" hay không.
//
// Phải ghi TỪ WEB APP, không phải chạy tay trong trình soạn thảo Apps Script
// — chạy tay ở đó là chạy bằng tài khoản chủ script, tức đúng cái ngữ cảnh mà
// phép thử cần tránh.
//
// Mỗi thao tác xong đều gọi lại layPhien() và vẽ lại toàn bộ, nên con số hiện
// trên bảng là con số MÁY CHỦ ĐỌC LẠI, không phải con số trình duyệt nhớ.

function khoiThuUserProperties(el) {
  const hop = document.createElement('div');
  hop.style.cssText = 'margin:18px 0;padding:14px;border:1px dashed #c8bfb2;' +
                      'border-radius:8px;background:#fffdf9';

  const nhan = document.createElement('div');
  nhan.textContent = 'Phép thử 0.11 — kho cài đặt riêng theo tài khoản';
  nhan.style.cssText = 'font-size:13px;color:#8a8078;margin-bottom:10px';
  hop.append(nhan);

  const hangNut = document.createElement('div');
  hangNut.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  hangNut.append(
    nutThu('Đặt P0012', () => gas.datNguoiTrungTamMacDinh('P0012'), el),
    nutThu('Đặt P0020', () => gas.datNguoiTrungTamMacDinh('P0020'), el),
    nutThu('Xoá giá trị', () => gas.xoaNguoiTrungTamMacDinh(), el),
  );
  hop.append(hangNut);

  if (thongDiepThu) {
    const p = document.createElement('p');
    p.textContent = thongDiepThu;
    p.style.cssText = 'margin:10px 0 0;font-size:13px;color:#2a2622';
    hop.append(p);
    thongDiepThu = null;
  }

  return hop;
}

function nutThu(chu, chay, el) {
  const nut = document.createElement('button');
  nut.textContent = chu;
  nut.style.cssText = 'padding:8px 14px;font-size:14px;border:1px solid #c8bfb2;' +
                      'border-radius:8px;background:#fff;cursor:pointer';
  nut.addEventListener('click', async () => {
    nut.disabled = true;
    nut.textContent = 'đang gửi…';
    try {
      const kq = await chay();
      thongDiepThu = kq.ok
        ? 'Máy chủ ghi xong cho ' + (kq.email || '(không rõ email)') +
          '. Đọc lại được: ' + (kq.daGhi || '(trống)')
        : 'Máy chủ TỪ CHỐI ghi: ' + kq.loi;
    } catch (loi) {
      thongDiepThu = 'Gọi máy chủ hỏng: ' + (loi && loi.message || loi);
    }
    await mountKhoiDong(el);   // đọc lại phiên từ máy chủ, vẽ lại toàn bộ
  });
  return nut;
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
