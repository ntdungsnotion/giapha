// ============================================================
// giapha · js/app.js
// Vai trò  : Điểm khởi động phía trình duyệt.
// Lớp      : pages
// Phụ thuộc: pages/khoi-dong
// Phiên bản: 0.3.1 · Cập nhật: 17/08/2026 08:58
// ============================================================

import { mountKhoiDong } from './pages/khoi-dong.js';

/**
 * Khởi động:
 *   1. Mở màn hình chờ
 *   2. repo.khoiTao() — lấy danh tính, quyền, và cây
 *   3. Không có quyền -> màn hình giải thích, dừng
 *   4. Có quyền -> mở tree-view
 */
async function main() {
  const el = document.getElementById('app');
  if (!el) {
    console.error('[app] không tìm thấy phần tử #app trong gas/index.html');
    return;
  }
  await mountKhoiDong(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  // Module tải xong sau khi DOM đã sẵn sàng thì sự kiện trên không bắn nữa.
  main();
}
