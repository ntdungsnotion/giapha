// ============================================================
// giapha · js/services/gas.js
// Vai trò  : Cầu nối duy nhất xuống máy chủ Apps Script.
//            Bọc google.script.run thành hàm Promise dùng await được.
// Lớp      : services — được gọi bởi: services/repo · gọi: (không)
// Phụ thuộc: (không)
// Phiên bản: 0.3.0 · Cập nhật: 15/08/2026 16:10
// ============================================================
//
// ĐÂY LÀ RANH GIỚI GIỮA TRÌNH DUYỆT VÀ MÁY CHỦ.
// Không file nào khác được gọi thẳng google.script.run.

/** Có đang chạy bên trong khung Apps Script hay không. */
export function coMayChu() {
  return typeof google !== 'undefined' &&
         !!google.script &&
         !!google.script.run;
}

/**
 * Gọi một hàm trong Code.gs, trả về Promise.
 * @param {string} tenHam  tên hàm phía máy chủ
 * @param {...any} thamSo
 */
export function goi(tenHam, ...thamSo) {
  return new Promise((thanhCong, thatBai) => {
    if (!coMayChu()) {
      thatBai(new Error(
        'Không có máy chủ. Trang này phải mở qua địa chỉ web app của Apps ' +
        'Script, không mở thẳng từ GitHub Pages.'
      ));
      return;
    }
    google.script.run
      .withSuccessHandler(thanhCong)
      .withFailureHandler(loi => thatBai(
        loi instanceof Error ? loi : new Error(String(loi && loi.message || loi))
      ))
      [tenHam](...thamSo);
  });
}

// --- Các lệnh gọi cụ thể. Mỗi lệnh khớp một hàm trong Code.gs. ---

/**
 * Danh tính và quyền. Gọi đầu tiên khi mở app.
 * Trả về { email, docDuoc, suaDuoc, vaiTro, nguoiTrungTamMacDinh,
 *          tenHo, nguoiQuanLy, loi }.
 */
export function layPhien() {
  return goi('layPhien');
}

/** Đọc toàn bộ cây gia phả. Máy chủ đã lọc theo vai trò trước khi trả. */
export function layCay() {
  return goi('layCay');
}

/** Ghi cây. Máy chủ tự kiểm tra xung đột và quyền sửa. */
export function luuCay(cay, revisionDaBiet) {
  return goi('luuCay', cay, revisionDaBiet);
}

/** Ghi người trung tâm mặc định của riêng người đang đăng nhập. */
export function datNguoiTrungTamMacDinh(personId) {
  return goi('datNguoiTrungTamMacDinh', personId);
}

/** Xoá giá trị đã đặt, để chạy lại phép thử 0.11 từ đầu. */
export function xoaNguoiTrungTamMacDinh() {
  return goi('xoaNguoiTrungTamMacDinh');
}

/** Tải ảnh lên. Truyền chuỗi base64 đã nén sẵn phía trình duyệt. */
export function taiAnh(base64, tenFile) {
  return goi('taiAnh', base64, tenFile);
}

/** Danh sách bản sao lưu để khôi phục. */
export function layDanhSachSaoLuu() {
  return goi('layDanhSachSaoLuu');
}
