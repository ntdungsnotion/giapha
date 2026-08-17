// ============================================================
// giapha · gas/Code.gs   (đặt trong Apps Script)
// Vai trò  : API máy chủ. Trình duyệt gọi qua google.script.run.
// Phiên bản: 0.5.0 · Cập nhật: 17/08/2026 19:10
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
// TRẠNG THÁI (17/08/2026, chat 2.1):
//   doGet · layPhien · layCay · trangThaiCaiDat  → đã viết thật
//   luuCay + sao lưu tự động                     → đã viết thật (chat 2.1)
//   taiAnh (chat 2.6) · layDanhSachSaoLuu · taoFileDuLieuMoi → còn khung
//
// ⚠ SỬA FILE NÀY XONG PHẢI TRIỂN KHAI LẠI, không thì web app vẫn chạy bản cũ:
//   Triển khai → Quản lý các bản triển khai → bút chì →
//   Phiên bản: "Phiên bản mới" → Triển khai

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
 * Ghi cây.
 *
 * Trình tự bắt buộc, và thứ tự này KHÔNG được đảo:
 *   1. Kiểm tra quyền sửa — không có thì từ chối ngay
 *   2. Rà soát cây gửi lên TRƯỚC KHI chạm vào file
 *   3. LockService.getScriptLock().waitLock(10000)
 *   4. So dấu vân tay với bản trình duyệt đang giữ
 *   5. Khác nhau -> { ok:false, lyDo:'xungdot' }, KHÔNG ghi đè
 *   6. Giống -> sao lưu bản CŨ nếu đến hạn, rồi tăng revision, ghi changeLog, ghi file
 *   7. releaseLock() trong khối finally
 *
 * ⚠ BA THỨ MÁY CHỦ TỰ ĐIỀN, KHÔNG NHẬN TỪ TRÌNH DUYỆT:
 * `tree.updatedBy`, và `ts` + `by` của mục changeLog. Trình duyệt nằm trong
 * tay người dùng nên lời khai của nó về danh tính chính nó không có giá trị —
 * cùng một lý lẽ đã dùng ở `layCay()` cho phần quyền.
 *
 * @param {object} cay             toàn bộ cây, đã mang sẵn thay đổi
 * @param {string} revisionDaBiet  dấu vân tay trình duyệt nhận ở lần đọc gần nhất
 * @param {object} [moTa]          { action, target, note, diff } — ghi vào changeLog
 * @returns {{
 *   ok: boolean,
 *   lyDo: string|null,
 *   headRevisionId: string|null,
 *   revision: number|null,
 *   tree: object|null,
 *   mucChangeLog: object|null,
 *   saoLuu: string,
 *   loi: string|null
 * }}
 */
function luuCay(cay, revisionDaBiet, moTa) {
  var kq = {
    ok:             false,
    lyDo:           null,
    headRevisionId: null,
    revision:       null,
    tree:           null,
    mucChangeLog:   null,
    saoLuu:         'khong-chay',
    loi:            null,
  };

  // --- 1. QUYỀN -----------------------------------------------------------
  // Hỏi lại máy chủ, không tin quyền do trình duyệt gửi lên.
  var phien = layPhien();
  if (phien.loi) {
    kq.lyDo = 'caidat';
    kq.loi  = phien.loi;
    return kq;
  }
  if (!phien.docDuoc) {
    kq.lyDo = 'khongcoquyen';
    kq.loi  = 'Bạn chưa được cấp quyền xem file dữ liệu.';
    return kq;
  }
  if (!phien.suaDuoc) {
    kq.lyDo = 'khongcoquyen';
    kq.loi  = 'Bạn chỉ có quyền xem gia phả, không sửa được. ' +
              'Cần sửa thì nhờ ' + NGUOI_QUAN_LY + ' đổi quyền trên Google Drive.';
    return kq;
  }

  // --- 2. RÀ SOÁT TRƯỚC KHI CHẠM VÀO FILE ---------------------------------
  var loiRaSoat = raSoatTruocKhiGhi_(cay);
  if (loiRaSoat) {
    kq.lyDo = 'dulieuhong';
    kq.loi  = loiRaSoat;
    return kq;
  }

  // --- 3. KHOÁ ------------------------------------------------------------
  // getScriptLock (không phải getUserLock): khoá dùng chung cho cả script,
  // đúng thứ cần khi hai NGƯỜI KHÁC NHAU cùng ghi.
  //
  // ⚠ CHƯA KIỂM CHỨNG ở chế độ "thực thi bằng người dùng truy cập". Lớp bảo vệ
  // thật sự chống ghi đè là dấu vân tay ở bước 4, không phải cái khoá này.
  // Khoá chỉ thu hẹp khe hở giữa lúc đọc và lúc ghi.
  var khoa = LockService.getScriptLock();
  try {
    khoa.waitLock(10000);
  } catch (e) {
    kq.lyDo = 'khoaban';
    kq.loi  = 'Có người khác đang lưu cùng lúc. Chờ vài giây rồi bấm Lưu lại.';
    return kq;
  }

  try {
    var file, cayCu;
    try {
      file  = DriveApp.getFileById(FILE_ID);
      cayCu = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    } catch (e) {
      kq.lyDo = 'khongdocduoc';
      kq.loi  = 'Không đọc được bản đang nằm trên Drive nên chưa dám ghi đè: ' + e.message;
      return kq;
    }

    // --- 4. XUNG ĐỘT ------------------------------------------------------
    var vanTayHienTai = dauVanTay_(cayCu, file);
    if (String(revisionDaBiet || '') !== vanTayHienTai) {
      kq.lyDo           = 'xungdot';
      kq.headRevisionId = vanTayHienTai;
      kq.loi            = 'Bản trên Drive đã đổi kể từ lúc bạn mở app' +
                          moTaAiVuaSua_(cayCu) + '. Thay đổi của bạn CHƯA được ' +
                          'lưu. Tải lại trang để lấy bản mới rồi sửa lại.';
      return kq;
    }

    // --- 5. KHÔNG ĐƯỢC MẤT NGƯỜI -----------------------------------------
    // App không bao giờ xoá cứng — xoá là đặt cờ `deleted`. Nên số bản ghi chỉ
    // có tăng. Ít đi nghĩa là cây gửi lên bị cắt cụt ở đâu đó, và cái giá của
    // việc ghi nhầm là mất dữ liệu thật.
    var soCu  = demBanGhi_(cayCu);
    var soMoi = demBanGhi_(cay);
    if (soMoi.persons < soCu.persons || soMoi.unions < soCu.unions) {
      kq.lyDo = 'matdulieu';
      kq.loi  = 'Bản gửi lên có ít bản ghi hơn bản trên Drive (' +
                soMoi.persons + '/' + soMoi.unions + ' so với ' +
                soCu.persons + '/' + soCu.unions + ' người/hôn nhân). ' +
                'App không xoá cứng bao giờ, nên đây là dấu hiệu hỏng — ' +
                'đã từ chối ghi. Tải lại trang rồi thử lại.';
      return kq;
    }

    // --- 6. SAO LƯU BẢN CŨ, RỒI GHI BẢN MỚI ------------------------------
    // Sao lưu chạy TRƯỚC khi ghi đè, vì thứ cần cứu là bản sắp mất.
    kq.saoLuu = saoLuuNeuDenHan_(cayCu);

    var luc = bayGio_();
    if (!cay.tree || typeof cay.tree !== 'object') cay.tree = {};
    cay.tree.revision  = soRevision_(cayCu) + 1;
    cay.tree.updatedAt = luc;
    cay.tree.updatedBy = phien.email;

    if (!Array.isArray(cay.changeLog)) cay.changeLog = [];
    var muc = mucNhatKy_(moTa, luc, phien.email);
    cay.changeLog.push(muc);

    try {
      file.setContent(JSON.stringify(cay, null, 2));
    } catch (e) {
      kq.lyDo = 'loighi';
      kq.loi  = 'Drive từ chối ghi file: ' + e.message;
      return kq;
    }

    // Đọc lại metadata bằng một object file MỚI. Object `file` cũ giữ bản
    // metadata từ lúc mở, dùng nó thì vân tay trả về sẽ là vân tay cũ và lần
    // lưu kế tiếp báo xung đột giả.
    //
    // ⚠ Nếu vẫn gặp "xung đột" ngay ở lần lưu thứ hai mà không ai sửa gì, thì
    // đây là chỗ cần ngờ: Drive cập nhật getLastUpdated() chậm hơn setContent().
    // Cách chữa tạm cho người dùng: tải lại trang.
    kq.headRevisionId = dauVanTay_(cay, DriveApp.getFileById(FILE_ID));
    kq.revision       = cay.tree.revision;
    kq.tree           = cay.tree;
    kq.mucChangeLog   = muc;
    kq.ok             = true;
    return kq;

  } finally {
    // --- 7. LUÔN TRẢ KHOÁ, kể cả khi ở trên đã return ---------------------
    khoa.releaseLock();
  }
}

/**
 * Rà soát cây gửi lên. Trả về câu mô tả lỗi, hoặc null nếu sạch.
 *
 * Đây không phải bộ rà nghiệp vụ (`domains/validate.js` lo việc đó, chat 2.2).
 * Đây chỉ hỏi một câu: thứ này có phải một cây gia phả nguyên vẹn không, hay
 * là một mẩu vỡ mà ghi vào là mất dữ liệu.
 */
function raSoatTruocKhiGhi_(cay) {
  if (!cay || typeof cay !== 'object') {
    return 'Không nhận được dữ liệu cây gia phả nào để lưu.';
  }
  if (cay.format !== 'giapha-json') {
    return 'Dữ liệu gửi lên không phải cây gia phả của app này.';
  }
  if (!isFinite(Number(cay.version))) {
    return 'Dữ liệu gửi lên không ghi số phiên bản.';
  }
  // Array.isArray chứ không phải `instanceof Array`: tham số đi qua
  // google.script.run được dựng lại ở phía máy chủ, và `instanceof` bắt hụt
  // mảng dựng ở một ngữ cảnh khác. Bắt hụt ở đây nghĩa là từ chối một lần lưu
  // hoàn toàn hợp lệ.
  if (!Array.isArray(cay.persons) || !Array.isArray(cay.unions)) {
    return 'Dữ liệu gửi lên thiếu danh sách người hoặc danh sách hôn nhân.';
  }
  if (cay.persons.length === 0) {
    return 'Dữ liệu gửi lên không có người nào — đã từ chối ghi.';
  }

  // Bản đã bị lọc thì TUYỆT ĐỐI không được ghi đè lên bản gốc: locNguoiConSong_
  // đã xoá trắng ngày sinh, ngày mất, nơi an táng, ghi chú và ảnh của mọi người
  // còn sống. Đường đi này lẽ ra không xảy ra (chỉ người `suaDuoc === false`
  // mới nhận bản lọc, mà họ đã bị chặn ở bước 1), nhưng cái giá nếu nó xảy ra
  // là mất dữ liệu thật của toàn bộ người còn sống — nên chặn thêm một lớp.
  for (var i = 0; i < cay.persons.length; i++) {
    var p = cay.persons[i];
    if (!p || !p.id) {
      return 'Có bản ghi người không mang mã ID — đã từ chối ghi.';
    }
    if (p.daAnChiTiet === true) {
      return 'Bản gửi lên là bản ĐÃ BỊ LỌC chi tiết người còn sống. ' +
             'Ghi đè bản này lên bản gốc sẽ xoá mất dữ liệu thật. Đã từ chối ghi.';
    }
  }
  return null;
}

/** Đếm bản ghi, để so trước và sau. */
function demBanGhi_(cay) {
  return {
    persons: (cay && Array.isArray(cay.persons)) ? cay.persons.length : 0,
    unions:  (cay && Array.isArray(cay.unions))  ? cay.unions.length  : 0,
  };
}

/** Số revision của một cây, thiếu thì coi là 0. */
function soRevision_(cay) {
  var r = cay && cay.tree && cay.tree.revision;
  return (typeof r === 'number' && isFinite(r)) ? r : 0;
}

/**
 * Nói thêm ai vừa sửa, nếu bản trên Drive có ghi.
 * Người sửa tay file ngoài app thì không có hai trường này — trả chuỗi rỗng,
 * chứ không bịa ra "không rõ".
 */
function moTaAiVuaSua_(cayCu) {
  var ai  = cayCu && cayCu.tree && cayCu.tree.updatedBy;
  var luc = cayCu && cayCu.tree && cayCu.tree.updatedAt;
  if (!ai && !luc) return '';
  if (ai && luc)   return ' (' + ai + ' sửa lúc ' + luc + ')';
  return ' (' + (ai || luc) + ')';
}

/**
 * Một mục changeLog.
 *
 * KHOÁ THỜI GIAN LÀ `ts`, chốt 17/08/2026 — file dữ liệu đang lẫn `ts` (10 mục)
 * và `at` (1 mục, dòng gộp nhánh ngày 15/08). Chọn `ts` vì nó là bên đông hơn.
 * Mục `at` lẻ đã được sửa về `ts` cùng ngày. Đừng mở lại chuyện này.
 *
 * `ts` và `by` do máy chủ điền, kể cả khi trình duyệt có gửi lên.
 */
function mucNhatKy_(moTa, luc, email) {
  var m = moTa && typeof moTa === 'object' ? moTa : {};
  return {
    ts:     luc,
    by:     email,
    action: String(m.action || 'update'),
    target: String(m.target || ''),
    note:   String(m.note   || ''),
    diff:   (m.diff && typeof m.diff === 'object') ? m.diff : {},
  };
}

/** Dấu thời gian dd/mm/yyyy HH:mm, đúng khuôn dùng chung của cả dự án. */
function bayGio_() {
  var mui = 'Asia/Ho_Chi_Minh';
  try { mui = Session.getScriptTimeZone() || mui; } catch (e) {}
  return Utilities.formatDate(new Date(), mui, 'dd/MM/yyyy HH:mm');
}

// ============================================================
// 4. ẢNH VÀ SAO LƯU  — giai đoạn sau
// ============================================================

/** Nén sẵn phía trình duyệt, ở đây chỉ ghi vào THU_MUC_ANH_ID. */
function taiAnh(base64, tenFile) { /* TODO — chat 2.6 */ }

/** Danh sách bản sao lưu trong THU_MUC_SAO_LUU_ID, mới nhất trước. */
function layDanhSachSaoLuu() { /* TODO — giai đoạn 3, màn hình khôi phục */ }

/**
 * Cất bản CŨ vào thư mục Sao_luu, nếu đã đến hạn.
 *
 * ⚠ ĐIỀU PHẢI NÓI THẲNG: thư mục Sao_luu chỉ chia sẻ cho chủ dự án
 * (`PHAN-QUYEN_V03`), mà script chạy bằng danh tính NGƯỜI ĐANG TRUY CẬP. Nên
 * khi một người biên tập khác lưu cây, `createFile` sẽ bị Drive từ chối và
 * hàm này trả về 'loi'. Nói cách khác: **chỉ những lần chủ dự án lưu mới sinh
 * ra bản sao lưu.** Đây là hệ quả cố ý của cách chia sẻ, không phải lỗi —
 * mở quyền thư mục Sao_luu cho Editor thì họ xoá được cả kho phòng hờ.
 *
 * Vì vậy toàn bộ hàm nằm trong try/catch và KHÔNG BAO GIỜ được làm hỏng việc
 * lưu: sao lưu là thứ đi kèm, không phải điều kiện để ghi.
 *
 * @returns {string} 'da-luu' · 'chua-den-han' · 'tat' · 'khong-cau-hinh' · 'loi'
 */
function saoLuuNeuDenHan_(cayCu) {
  if (!SAO_LUU || !SAO_LUU.bat) return 'tat';
  if (!THU_MUC_SAO_LUU_ID || THU_MUC_SAO_LUU_ID.indexOf('DAN_ID_') === 0) {
    return 'khong-cau-hinh';
  }

  try {
    var thuMuc = DriveApp.getFolderById(THU_MUC_SAO_LUU_ID);
    var ds     = dsSaoLuuMoiTruoc_(thuMuc);

    if (ds.length) {
      var cachNhauGio =
        (new Date().getTime() - ds[0].getDateCreated().getTime()) / 3600000;
      if (cachNhauGio < SAO_LUU.cachNhauGio) return 'chua-den-han';
    }

    var mui = 'Asia/Ho_Chi_Minh';
    try { mui = Session.getScriptTimeZone() || mui; } catch (e) {}

    var ten = 'giapha-sao-luu_' +
              Utilities.formatDate(new Date(), mui, 'yyyy-MM-dd_HHmm') +
              '_rev' + soRevision_(cayCu) + '.json';

    thuMuc.createFile(ten, JSON.stringify(cayCu, null, 2), 'application/json');
    donBanSaoLuuCu_(thuMuc);
    return 'da-luu';
  } catch (e) {
    return 'loi';
  }
}

/** File trong thư mục sao lưu, MỚI NHẤT ĐỨNG TRƯỚC. */
function dsSaoLuuMoiTruoc_(thuMuc) {
  var ds  = [];
  var lap = thuMuc.getFiles();
  while (lap.hasNext()) ds.push(lap.next());
  ds.sort(function (a, b) {
    return b.getDateCreated().getTime() - a.getDateCreated().getTime();
  });
  return ds;
}

/**
 * Giữ lại SAO_LUU.giuLai bản mới nhất, phần dư cho vào thùng rác.
 * Dùng setTrashed chứ không xoá hẳn: thùng rác Drive giữ thêm 30 ngày, và
 * đây đúng là loại thao tác mà một hôm nào đó sẽ cần lấy lại.
 */
function donBanSaoLuuCu_(thuMuc) {
  var giuLai = (SAO_LUU && SAO_LUU.giuLai) || 30;
  var ds     = dsSaoLuuMoiTruoc_(thuMuc);
  for (var i = giuLai; i < ds.length; i++) {
    try { ds[i].setTrashed(true); } catch (e) {}
  }
}

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
