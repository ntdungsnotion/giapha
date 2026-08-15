// ============================================================
// giapha · gas/Config.gs   (đặt trong Apps Script)
// Vai trò  : ĐÂY LÀ FILE DUY NHẤT BẠN CẦN SỬA TAY.
// Phiên bản: 0.2.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// ⚠ BẢN NẰM TRONG REPO GITHUB NÀY GIỮ CHỮ GIỮ CHỖ.
//   Repo bắt buộc để Public, nên mọi thứ ở đây là công khai vĩnh viễn.
//   ID thật chỉ gõ thẳng vào trình soạn thảo Apps Script, không bao giờ
//   chép ngược về đây. ID thật nằm ở file trên máy:
//   Claude_Code\ID-DRIVE_KHONG-DAY-LEN-GITHUB.md

// --- BẠN PHẢI ĐIỀN BỐN DÒNG DƯỚI ĐÂY -------------------------

/** Địa chỉ GitHub Pages, KHÔNG có dấu / ở cuối. */
var GITHUB_PAGES = 'https://ntdungsnotion.github.io/giapha';

/** ID file JSON dữ liệu trên Drive. */
var FILE_ID = 'DAN_ID_FILE_DU_LIEU_VAO_DAY';

/** ID thư mục chứa ảnh trên Drive. */
var THU_MUC_ANH_ID = 'DAN_ID_THU_MUC_ANH_VAO_DAY';

/** ID thư mục chứa bản sao lưu trên Drive. Chỉ chủ dự án được chia sẻ. */
var THU_MUC_SAO_LUU_ID = 'DAN_ID_THU_MUC_SAO_LUU_VAO_DAY';

// --- Phần dưới thường không cần sửa ---------------------------

var TEN_HO        = 'Họ Nguyễn';
var NGUOI_QUAN_LY = 'ntdungs.notion@gmail.com';  // hiện trong thông báo lỗi

var SAO_LUU = {
  bat:         true,
  cachNhauGio: 24,
  giuLai:      30,
};

/** Ẩn chi tiết người còn sống với người chỉ có quyền xem. */
var AN_NGUOI_CON_SONG_VOI_NGUOI_XEM = true;

// --- Tự kiểm khi cài đặt --------------------------------------

/**
 * Chạy tay hàm này một lần sau khi điền bốn dòng trên.
 * Xem kết quả ở Nhật ký thực thi (Execution log).
 * Không sửa gì cả — chỉ đọc và báo cáo.
 */
function kiemTraConfig() {
  var loi = [];
  var ok  = [];

  if (GITHUB_PAGES.slice(-1) === '/') {
    loi.push('GITHUB_PAGES đang có dấu / ở cuối — bỏ đi.');
  } else {
    ok.push('GITHUB_PAGES: ' + GITHUB_PAGES);
  }

  ok.push(thu_('FILE_ID (file dữ liệu)', FILE_ID, function () {
    return DriveApp.getFileById(FILE_ID).getName();
  }, loi));

  ok.push(thu_('THU_MUC_ANH_ID (thư mục Anh)', THU_MUC_ANH_ID, function () {
    return DriveApp.getFolderById(THU_MUC_ANH_ID).getName();
  }, loi));

  ok.push(thu_('THU_MUC_SAO_LUU_ID (thư mục Sao_luu)', THU_MUC_SAO_LUU_ID, function () {
    return DriveApp.getFolderById(THU_MUC_SAO_LUU_ID).getName();
  }, loi));

  Logger.log('--- ĐẠT ---\n' + ok.filter(String).join('\n'));
  if (loi.length) {
    Logger.log('--- CẦN SỬA ---\n' + loi.join('\n'));
  } else {
    Logger.log('--- CẦN SỬA ---\n(không có)');
  }
}

/** Phụ trợ cho kiemTraConfig. Không gọi ở nơi khác. */
function thu_(nhan, giaTri, layTen, loi) {
  if (!giaTri || giaTri.indexOf('DAN_ID_') === 0) {
    loi.push(nhan + ': chưa điền.');
    return '';
  }
  try {
    return nhan + ': ' + layTen();
  } catch (e) {
    loi.push(nhan + ': ID sai hoặc không có quyền truy cập. (' + e.message + ')');
    return '';
  }
}
