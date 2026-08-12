// ============================================================
// PHÉP THỬ KIẾN TRÚC · spike/main.js  (đặt trên GitHub Pages)
// Vai trò  : Chạy 3 phép thử quyết định kiến trúc.
// Phiên bản: 1.0.0 · Cập nhật: 12/08/2026 12:10
// ============================================================

// Nếu dòng import này chạy được, nghĩa là đường dẫn tương đối bên trong
// module phân giải đúng theo github.io — điều kiện sống còn cho 27 file
// mã của app thật.
import { chaoTuFilePhuThuoc } from './helper.js';

// --- Bước 1: module ngoài nạp được vào sandbox của HtmlService ---
ghi('✓ Bước 1 — Module ngoài nạp được từ GitHub Pages vào Apps Script.');

// --- Bước 2: import tương đối bên trong module ---
ghi('✓ Bước 2 — ' + chaoTuFilePhuThuoc());

// --- Bước 3: gọi được google.script.run từ trong phạm vi module ---
// Đây là bước quyết định. Hai bước trên đạt mà bước này hỏng thì
// kiến trúc không dùng được.
if (!window.google || !window.google.script || !window.google.script.run) {
  ghi('✗ Bước 3 THẤT BẠI — không thấy google.script.run trong phạm vi module.', 'hong');
  ghi('Nghĩa là sandbox không cho module chạm vào cầu nối tới máy chủ.', 'cho');
} else {
  ghi('… Bước 3 — thấy google.script.run, đang gọi máy chủ…', 'cho');

  window.google.script.run
    .withSuccessHandler(function (kq) {
      ghi('✓ Bước 3 — Gọi được máy chủ từ trong module.');
      ghi('✓ Bước 4 — Máy chủ nhận diện được người đăng nhập.');
      ghiKhoi(
        'Email của bạn : ' + kq.email + '\n' +
        'Giờ máy chủ   : ' + kq.gioMayChu + '\n' +
        'Lời nhắn vọng : ' + kq.echo
      );
      ghi('KẾT LUẬN: kiến trúc đứng vững. Báo lại cho Claude.', 'dat');
    })
    .withFailureHandler(function (loi) {
      ghi('✗ Bước 3 THẤT BẠI — gọi máy chủ bị lỗi.', 'hong');
      ghiKhoi(String(loi && loi.message ? loi.message : loi));
    })
    .pingServer('xin chào từ ES Module trên GitHub Pages');
}
