// ============================================================
// giapha · js/services/gas.js
// Vai trò  : Cầu nối duy nhất xuống máy chủ Apps Script.
//            Bọc google.script.run thành hàm Promise dùng await được.
// Lớp      : services — được gọi bởi: services/repo, pages/settings,
//            pages/backup · gọi: (không)
// Phụ thuộc: (không)
// Phiên bản: 0.7.0 · Cập nhật: 22/08/2026 00:40
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

/**
 * Ghi cây. Máy chủ tự kiểm tra xung đột và quyền sửa.
 *
 * `moTa` = { action, target, note, diff } — máy chủ ghi thành một mục
 * changeLog. Đừng gửi `ts` hay `by` trong đó: máy chủ tự điền hai trường ấy
 * và bỏ qua thứ trình duyệt khai.
 */
export function luuCay(cay, revisionDaBiet, moTa) {
  return goi('luuCay', cay, revisionDaBiet, moTa);
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

/**
 * Nhờ MÁY CHỦ đọc hộ một tấm ảnh trên Drive rồi trả về chuỗi base64.
 *
 * Đường này chắc chắn chạy — máy chủ thực thi bằng danh tính người đang truy
 * cập nên Drive cho đọc đúng những file người ấy được chia sẻ. Cái giá là một
 * lần gọi máy chủ cho mỗi tấm ảnh. Dùng khi hai đường `<img src>` thẳng tới
 * Drive không hiện được ảnh.
 */
export function layAnhBase64(fileId) {
  return goi('layAnhBase64', fileId);
}

/** Đọc quyền chia sẻ hiện tại của một file ảnh. Chỉ đọc, không đổi gì. */
export function trangThaiQuyenAnh(fileId) {
  return goi('trangThaiQuyenAnh', fileId);
}

/**
 * ⚠ Mở quyền "bất kỳ ai có đường liên kết" cho MỘT file ảnh.
 * Đây là quyết định về riêng tư, không phải một lệnh kỹ thuật — chỉ gọi từ
 * chỗ đã nói rõ điều đó bằng chữ cho người dùng đọc.
 */
export function moQuyenXemAnh(fileId) {
  return goi('moQuyenXemAnh', fileId);
}

/** Cho một file ảnh vào thùng rác. Dùng để dọn ảnh của phép thử. */
export function xoaAnhThu(fileId) {
  return goi('xoaAnhThu', fileId);
}

/**
 * DỌN ẢNH RÁC — bước 4 của một lần *Dọn thùng rác*. Nhận CẢ LOẠT mã file.
 *
 * ⚠ Không phải `xoaAnhThu` gọi nhiều lần. Gọi SAU khi máy chủ đã gật cho lần
 * ghi — bản ghi mất rồi thì file mới chắc chắn không còn ai trỏ tới. Hàm luôn
 * chạy hết cả loạt: một tấm hỏng không được làm hỏng chín tấm còn lại.
 *
 * @param {string[]} dsFileId
 * @returns {Promise<{ok:boolean, soXoa:number, soHong:number, chiTiet:object[]}>}
 */
export function xoaAnhThat(dsFileId) {
  return goi('xoaAnhThat', dsFileId);
}

// --- SAO LƯU VÀ KHÔI PHỤC (việc 7) --------------------------------------
//
// ⚠ Cả bốn lệnh chỉ CHỦ DỰ ÁN gọi được. Thư mục Sao_luu chỉ chia sẻ cho một
// người, mà script chạy bằng danh tính người đang truy cập — người biên tập
// khác gọi thì máy chủ trả về một câu lỗi nói thẳng điều đó, không phải một
// danh sách rỗng. Nơi gọi phải kể lại câu ấy, đừng nuốt đi.

/**
 * Danh sách bản sao lưu, mới nhất trước.
 * Trả về { ok, loi, thuMuc, ds:[{ fileId, ten, luc, lucSo, co, revision }] }.
 */
export function layDanhSachSaoLuu() {
  return goi('layDanhSachSaoLuu');
}

/**
 * Cất NGAY bản đang nằm trên Drive vào thư mục Sao_luu, không đợi đến hạn.
 * Trả về { ok, ten, loi, revision }.
 *
 * ⚠ Sao lưu bản TRÊN DRIVE, không gửi cây trong trình duyệt lên. Vì thế hàm
 * này không nhận tham số nào — và đó là chủ ý, không phải thiếu sót.
 */
export function saoLuuNgay() {
  return goi('saoLuuNgay');
}

/**
 * Mở một bản sao lưu ra xem, KHÔNG ghi gì.
 * Trả về { ok, loi, ten, tomTat, hienTai } — hai tóm tắt để đặt cạnh nhau.
 */
export function xemBanSaoLuu(fileId) {
  return goi('xemBanSaoLuu', fileId);
}

/**
 * ⚠ GHI ĐÈ toàn bộ gia phả bằng nội dung một bản sao lưu.
 *
 * Đây là đường ghi thứ HAI được phép làm số bản ghi ít đi (đường thứ nhất là
 * dọn thùng rác), và nó KHÔNG đi qua `luuCay` — chỉ gọi từ chỗ đã kể đủ
 * hậu quả bằng chữ cho người dùng đọc.
 *
 * @param {string} fileId        bản sao lưu muốn quay về
 * @param {string} vanTayDaBiet  `state.headRevisionId` — máy chủ so để chặn
 *                               ghi đè lên thay đổi của người khác
 */
export function khoiPhucSaoLuu(fileId, vanTayDaBiet) {
  return goi('khoiPhucSaoLuu', fileId, vanTayDaBiet);
}
