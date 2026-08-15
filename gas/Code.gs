// ============================================================
// giapha · gas/Code.gs   (đặt trong Apps Script)
// Vai trò  : API máy chủ. Trình duyệt gọi qua google.script.run.
// Phiên bản: 0.2.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// Triển khai BẮT BUỘC đặt:
//   Thực thi bằng tên       : Người dùng truy cập ứng dụng web
//   Người có quyền truy cập : Bất cứ ai có Tài khoản Google
//
// Chế độ này khiến mỗi người tự cấp quyền, nhờ đó getActiveUser()
// trả về email thật và Drive thực thi phân quyền theo danh sách chia sẻ.
// Đã kiểm chứng ba vòng ở phép thử 3 — xem NK-B03. ĐỪNG ĐỔI.
//
// TRẠNG THÁI (15/08/2026, mục 0.12):
//   doGet · layPhien · trangThaiCaiDat  → đã viết thật
//   layCay · luuCay · taiAnh · …        → khung, làm ở chat 1.1 trở đi

// ============================================================
// 1. PHỤC VỤ TRANG
// ============================================================

/** Phục vụ trang. Dùng template để chèn GITHUB_PAGES từ Config.gs. */
function doGet() {
  var t = HtmlService.createTemplateFromFile('index');
  t.githubPages = GITHUB_PAGES;
  return t.evaluate()
    .setTitle(TEN_HO + ' — Gia phả')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// 2. DANH TÍNH VÀ QUYỀN
// ============================================================

/**
 * Danh tính và quyền. Trình duyệt gọi đầu tiên khi mở app.
 *
 * Quyền KHÔNG do app tự quyết — app chỉ hỏi Drive rồi thuật lại.
 * Drive mới là nơi thực thi, ở tầng máy chủ của Google.
 *
 * @returns {{
 *   email: string,
 *   docDuoc: boolean,
 *   suaDuoc: boolean,
 *   vaiTro: 'chu'|'sua'|'xem'|'khong',
 *   nguoiTrungTamMacDinh: string|null,
 *   tenHo: string,
 *   nguoiQuanLy: string,
 *   loi: string|null
 * }}
 */
function layPhien() {
  var email = '';
  try {
    email = Session.getActiveUser().getEmail() || '';
  } catch (e) {
    email = '';
  }

  var phien = {
    email:                email,
    docDuoc:              false,
    suaDuoc:              false,
    vaiTro:               'khong',
    nguoiTrungTamMacDinh: null,
    tenHo:                TEN_HO,
    nguoiQuanLy:          NGUOI_QUAN_LY,
    loi:                  null,
  };

  if (!FILE_ID || FILE_ID.indexOf('DAN_ID_') === 0) {
    phien.loi = 'Chưa điền FILE_ID trong Config.gs.';
    return phien;
  }

  var file;
  try {
    file = DriveApp.getFileById(FILE_ID);
    file.getName();          // chạm thật vào file mới biết có đọc được không
    phien.docDuoc = true;
  } catch (e) {
    // Không đọc được = chưa được chia sẻ. Đây là đường đi bình thường
    // của người lạ, không phải sự cố. Vòng 1 phép thử 3 đã kiểm chứng.
    return phien;
  }

  // Quyền sửa: hỏi Drive. Người chỉ có quyền xem thường KHÔNG được phép
  // đọc danh sách chia sẻ, nên getAccess ném lỗi — coi như không sửa được.
  // Đoán sai theo hướng "được sửa" cũng không nguy hiểm: Drive vẫn chặn ở
  // tầng máy chủ khi thật sự ghi. Nhưng mặc định bảo thủ vẫn tốt hơn.
  try {
    var quyen = file.getAccess(email);
    phien.suaDuoc = (quyen === DriveApp.Permission.EDIT ||
                     quyen === DriveApp.Permission.OWNER);
    if (quyen === DriveApp.Permission.OWNER) phien.vaiTro = 'chu';
  } catch (e) {
    phien.suaDuoc = false;
  }

  if (phien.vaiTro !== 'chu') {
    phien.vaiTro = phien.suaDuoc ? 'sua' : 'xem';
  }

  // Người trung tâm mặc định, tách riêng theo từng tài khoản đăng nhập.
  // ⚠ CHƯA KIỂM CHỨNG (mục 0.11 của KE-HOACH): getUserProperties có thật
  // sự tách theo người dùng ngoài ở chế độ "thực thi bằng người truy cập"
  // hay không. Bọc try/catch để nếu hỏng cũng không chặn việc mở app.
  try {
    phien.nguoiTrungTamMacDinh =
      PropertiesService.getUserProperties().getProperty('nguoiTrungTamMacDinh');
  } catch (e) {
    phien.nguoiTrungTamMacDinh = null;
  }

  return phien;
}

/**
 * Ghi người trung tâm mặc định của riêng người đang đăng nhập.
 * Gọi từ màn hình Cài đặt (chat 1.5).
 */
function datNguoiTrungTamMacDinh(personId) {
  PropertiesService.getUserProperties()
    .setProperty('nguoiTrungTamMacDinh', String(personId));
  return { ok: true };
}

// ============================================================
// 3. ĐỌC / GHI CÂY GIA PHẢ  — chat 1.1
// ============================================================

/**
 * Đọc cây gia phả.
 * Nếu người dùng chỉ có quyền xem và AN_NGUOI_CON_SONG_VOI_NGUOI_XEM bật,
 * LỌC BỎ chi tiết người còn sống TRƯỚC KHI trả về — đây là điều chỉ làm
 * được nhờ có máy chủ.
 */
function layCay() { /* TODO — chat 1.1 */ }

/**
 * Ghi cây. Trình tự bắt buộc:
 *   1. Kiểm tra quyền sửa — không có thì từ chối ngay
 *   2. LockService.getScriptLock().waitLock(10000)
 *   3. So headRevisionId với bản trình duyệt đang giữ
 *   4. Khác nhau -> trả về { ok:false, lyDo:'xungdot' }, KHÔNG ghi đè
 *   5. Giống -> tăng revision, ghi file, ghi changeLog
 *   6. Sao lưu nếu đến hạn, vào thư mục THU_MUC_SAO_LUU_ID
 *   7. releaseLock() trong khối finally
 */
function luuCay(cay, revisionDaBiet) { /* TODO — chat 1.1 */ }

// ============================================================
// 4. ẢNH VÀ SAO LƯU  — giai đoạn sau
// ============================================================

/** Nén sẵn phía trình duyệt, ở đây chỉ ghi vào THU_MUC_ANH_ID. */
function taiAnh(base64, tenFile) { /* TODO */ }

/** Danh sách bản sao lưu trong THU_MUC_SAO_LUU_ID, mới nhất trước. */
function layDanhSachSaoLuu() { /* TODO */ }

// ============================================================
// 5. CHẠY TAY MỘT LẦN KHI CÀI ĐẶT
// ============================================================

/** Chạy tay một lần khi cài đặt: tạo file dữ liệu rỗng, in ra ID. */
function taoFileDuLieuMoi() { /* TODO */ }

/**
 * Chạy tay để soi nhanh máy chủ đang thấy gì.
 * Kết quả hiện ở Nhật ký thực thi (Execution log).
 */
function trangThaiCaiDat() {
  Logger.log(JSON.stringify(layPhien(), null, 2));
}
