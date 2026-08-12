// ============================================================
// PHÉP THỬ SỐ 3 · spike3/main.js   (đặt trên GitHub Pages)
// Vai trò  : Gọi máy chủ, hiển thị danh tính và quyền trên file.
// Phiên bản: 1.0.0 · Cập nhật: 12/08/2026 23:20
// ============================================================

ghi('✓ Module nạp được từ GitHub Pages.');
ghi('… Đang hỏi máy chủ…', 'cho');

window.google.script.run
  .withSuccessHandler(hienKetQua)
  .withFailureHandler(function (loi) {
    ghi('✗ Gọi máy chủ thất bại.', 'hong');
    ghiKhoi(String(loi && loi.message ? loi.message : loi));
  })
  .layThongTin();


function hienKetQua(d) {

  // --- Điểm mấu chốt: máy chủ có biết bạn là ai không ---
  if (d.email) {
    ghi('✓ DANH TÍNH — Máy chủ biết bạn là: ' + d.email);
  } else {
    ghi('✗ DANH TÍNH — Email vẫn RỖNG. Chế độ thực thi chưa đúng.', 'hong');
    ghi('Kiểm tra lại: "Thực thi bằng tên" phải là '
      + '"Người dùng truy cập ứng dụng web".', 'cho');
  }

  // --- Quyền trên file ---
  if (d.docDuoc) {
    ghi('✓ ĐỌC — Mở được file: ' + d.tenFile);

    if (d.suaDuoc === true) {
      ghi('✓ QUYỀN — Bạn SỬA ĐƯỢC file này (vai trò Editor).');
    } else if (d.suaDuoc === false) {
      ghi('✓ QUYỀN — Bạn CHỈ XEM được, không sửa được (vai trò Viewer).');
    } else {
      ghi('? QUYỀN — Chưa xác định được.', 'cho');
    }

  } else {
    ghi('✓ CHẶN — Không đọc được file. Nếu bạn CHƯA được chia sẻ '
      + 'thì đây là kết quả ĐÚNG.', 'dat');
  }

  ghiKhoi(
    'Email      : ' + (d.email || '(RỖNG)') + '\n' +
    'Đọc được   : ' + (d.docDuoc ? 'CÓ' : 'KHÔNG') + '\n' +
    'Sửa được   : ' + (d.suaDuoc === null ? '(không xác định)'
                                          : (d.suaDuoc ? 'CÓ' : 'KHÔNG')) + '\n' +
    'Tên file   : ' + (d.tenFile || '—') + '\n' +
    'Giờ máy chủ: ' + d.gioMayChu +
    (d.loi ? '\nGhi chú    : ' + d.loi : '')
  );

  ghi('Chụp màn hình này và báo lại cho Claude, kèm cho biết '
    + 'đang mở bằng tài khoản nào và ở vòng thử thứ mấy.', 'cho');
}
