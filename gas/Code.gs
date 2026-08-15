// ============================================================
// giapha · gas/Code.gs   (đặt trong Apps Script)
// Vai trò  : API máy chủ. Trình duyệt gọi qua google.script.run.
// Phiên bản: 0.4.0 · Cập nhật: 15/08/2026 20:22
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
// TRẠNG THÁI (15/08/2026, chat 1.1):
//   doGet · layPhien · layCay · trangThaiCaiDat  → đã viết thật
//   luuCay · taiAnh · …                          → khung, làm ở giai đoạn 2

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
    loiUserProperties:    null,   // chỉ dùng cho phép thử 0.11
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
  //
  // PHÂN BIỆT HAI THỨ KHÁC NHAU, đừng gộp thành null:
  //   nguoiTrungTamMacDinh = null, loiUserProperties = null  -> chưa đặt
  //   loiUserProperties có chữ                               -> KHÔNG ĐỌC ĐƯỢC
  // Gộp lại thì phép thử 0.11 không phân biệt được "kho tách đúng, người này
  // chưa đặt gì" với "kho không dùng được cho người này".
  try {
    phien.nguoiTrungTamMacDinh =
      PropertiesService.getUserProperties().getProperty('nguoiTrungTamMacDinh');
  } catch (e) {
    phien.nguoiTrungTamMacDinh = null;
    phien.loiUserProperties    = e.message;
  }

  return phien;
}

/**
 * Ghi người trung tâm mặc định của riêng người đang đăng nhập.
 * Gọi từ màn hình Cài đặt (chat 1.5), và từ phép thử 0.11.
 *
 * Ghi xong thì ĐỌC LẠI rồi trả về, không tin lời khai của chính mình.
 * Nếu kho không tách theo người, chỗ này vẫn báo ok — cái phát hiện được
 * điều đó là bước mở bằng tài khoản thứ hai, không phải hàm này.
 *
 * @returns {{ ok: boolean, daGhi: string|null, email: string, loi: string|null }}
 */
function datNguoiTrungTamMacDinh(personId) {
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) {}

  try {
    var kho = PropertiesService.getUserProperties();
    kho.setProperty('nguoiTrungTamMacDinh', String(personId));
    return {
      ok:    true,
      daGhi: kho.getProperty('nguoiTrungTamMacDinh'),
      email: email,
      loi:   null,
    };
  } catch (e) {
    return { ok: false, daGhi: null, email: email, loi: e.message };
  }
}

/** Xoá giá trị đã đặt, để chạy lại phép thử từ đầu. */
function xoaNguoiTrungTamMacDinh() {
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) {}

  try {
    PropertiesService.getUserProperties().deleteProperty('nguoiTrungTamMacDinh');
    return { ok: true, daGhi: null, email: email, loi: null };
  } catch (e) {
    return { ok: false, daGhi: null, email: email, loi: e.message };
  }
}

// ============================================================
// 3. ĐỌC / GHI CÂY GIA PHẢ  — chat 1.1
// ============================================================

/**
 * Đọc cây gia phả.
 * Nếu người dùng chỉ có quyền xem và AN_NGUOI_CON_SONG_VOI_NGUOI_XEM bật,
 * LỌC BỎ chi tiết người còn sống TRƯỚC KHI trả về — đây là điều chỉ làm
 * được nhờ có máy chủ.
 *
 * Hàm này tự gọi lại layPhien() để biết quyền, KHÔNG nhận quyền do trình
 * duyệt gửi lên. Trình duyệt nằm trong tay người dùng; lời khai của nó về
 * quyền của chính nó không có giá trị. Cái giá là một lần chạm Drive nữa,
 * chấp nhận được vì cả app chỉ gọi layCay() một lần khi mở.
 *
 * @returns {{
 *   ok: boolean,
 *   cay: object|null,
 *   headRevisionId: string|null,
 *   daLocNguoiConSong: boolean,
 *   vaiTro: string,
 *   loi: string|null
 * }}
 */
function layCay() {
  var kq = {
    ok:                false,
    cay:               null,
    headRevisionId:    null,
    daLocNguoiConSong: false,
    vaiTro:            'khong',
    loi:               null,
  };

  var phien = layPhien();
  kq.vaiTro = phien.vaiTro;

  if (phien.loi) {
    kq.loi = phien.loi;
    return kq;
  }
  if (!phien.docDuoc) {
    // Đường đi bình thường của người chưa được chia sẻ, không phải sự cố.
    kq.loi = 'Bạn chưa được cấp quyền xem file dữ liệu.';
    return kq;
  }

  var file, chuoi;
  try {
    file  = DriveApp.getFileById(FILE_ID);
    chuoi = file.getBlob().getDataAsString('UTF-8');
  } catch (e) {
    kq.loi = 'Đọc được tên file nhưng không đọc được nội dung: ' + e.message;
    return kq;
  }

  var cay;
  try {
    cay = JSON.parse(chuoi);
  } catch (e) {
    // Nói thẳng phải làm gì. Câu "JSON không hợp lệ" một mình không giúp ai.
    kq.loi = 'File dữ liệu không phải JSON hợp lệ — nhiều khả năng có người ' +
             'sửa tay ngoài app. Khôi phục từ thư mục Sao_luu. (' + e.message + ')';
    return kq;
  }

  if (!cay || cay.format !== 'giapha-json') {
    kq.loi = 'Đọc được file nhưng đây không phải file gia phả của app này. ' +
             'Kiểm tra lại FILE_ID trong Config.gs bằng hàm kiemTraConfig().';
    return kq;
  }

  // Lọc TRƯỚC KHI trả về. Gửi đủ rồi nhờ trình duyệt giấu bớt là không lọc gì cả.
  if (AN_NGUOI_CON_SONG_VOI_NGUOI_XEM && !phien.suaDuoc) {
    locNguoiConSong_(cay);
    kq.daLocNguoiConSong = true;
  }

  kq.cay            = cay;
  kq.headRevisionId = dauVanTay_(cay, file);
  kq.ok             = true;
  return kq;
}

/**
 * Xoá chi tiết riêng tư của người còn sống, giữ lại đủ thứ để vẽ được sơ đồ:
 * mã, tên, giới tính, và toàn bộ quan hệ. Sửa thẳng trên object sắp trả về —
 * object này chỉ sống trong một lần gọi, không phải bản trên Drive.
 *
 * Đánh dấu `daAnChiTiet` để giao diện phân biệt được "bị ẩn" với "thiếu dữ
 * liệu". Hai thứ này trông giống hệt nhau trên màn hình mà kết luận ngược
 * nhau: một bên là app đang chạy đúng, một bên là gia phả còn thiếu.
 */
function locNguoiConSong_(cay) {
  var ds = (cay && cay.persons) || [];
  for (var i = 0; i < ds.length; i++) {
    var p = ds[i];
    if (!p || p.living !== true) continue;
    p.birth       = { iso: null, raw: '', place: '' };
    p.death       = { iso: null, raw: '', place: '' };
    p.burialPlace = '';
    p.note        = '';
    p.photoFileId = '';
    p.daAnChiTiet = true;
  }
}

/**
 * Dấu vân tay của bản đang nằm trên Drive, để chat sau phát hiện xung đột.
 *
 * Ghép HAI thứ vì mỗi thứ một mình đều lọt:
 *  - `tree.revision` chỉ tăng khi ghi qua app; người sửa tay file trên Drive
 *    không tăng nó — mà "chặn Editor sửa tay file JSON" là việc app CHƯA làm
 *    được, nên đây là chuyện sẽ xảy ra thật.
 *  - thời điểm sửa file thì đổi ở mọi lần ghi, kể cả ghi tay.
 */
function dauVanTay_(cay, file) {
  var rev = (cay.tree && cay.tree.revision != null) ? cay.tree.revision : 0;
  var luc = 0;
  try { luc = file.getLastUpdated().getTime(); } catch (e) { luc = 0; }
  return String(rev) + '|' + String(luc);
}

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
