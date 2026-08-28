// ============================================================
// giapha · gas/Code.gs   (đặt trong Apps Script)
// Vai trò  : API máy chủ. Trình duyệt gọi qua google.script.run.
// Phiên bản: 0.10.0 · Cập nhật: 28/08/2026 08:30
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
// TRẠNG THÁI (22/08/2026, việc 7):
//   doGet · layPhien · layCay · trangThaiCaiDat  → đã viết thật
//   luuCay + sao lưu tự động                     → đã viết thật (chat 2.1)
//   taiAnh · layAnhBase64 · trangThaiQuyenAnh ·
//     moQuyenXemAnh · xoaAnhThu                  → đã viết thật (bước 28)
//   xoaAnhThat                                   → đã viết thật (việc 6B)
//   layDanhSachSaoLuu · saoLuuNgay · xemBanSaoLuu ·
//     khoiPhucSaoLuu                             → đã viết thật (việc 7)
//   taoFileDuLieuMoi                             → đã viết thật (việc 9)
//   layDanhSachGiaPha · chonGiaPha · boChonGiaPha → đã viết thật (chọn DB)
//   thuTimGiaPha                                 → công cụ tự kiểm chia sẻ
//
// ⚠ TỪ 28/08/2026 APP MỞ ĐƯỢC NHIỀU GIA PHẢ. `FILE_ID` không còn là "file dữ
//   liệu" nữa mà là **gia phả mặc định** — thứ mở ra khi người dùng chưa chọn
//   gì. Lựa chọn thật nằm trong kho riêng của từng tài khoản. Đừng đọc thẳng
//   ba hằng số của Config.gs nữa, dùng ba hàm ở mục 2b:
//       maGiaPhaDangChon_() · maThuMucAnh_() · maThuMucSaoLuu_()
//
// ⚠ VIỆC 6B ĐỔI HAI THỨ TRONG `luuCay`, và cả hai đều là chỗ nguy hiểm:
//   · `action: 'purge'` là đường DUY NHẤT được phép làm số bản ghi ít đi. Nó
//     không được miễn kiểm — nó đổi sang `raSoatDonRac_`, chặt hơn.
//   · với đường ấy, SAO LƯU LÀ ĐIỀU KIỆN: không cất được bản cũ thì không dọn.
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
 *   tenFileDuLieu: string,
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
    tenFileDuLieu:        '',
    loi:                  null,
  };

  var maCay = maGiaPhaDangChon_();
  if (!maCay) {
    phien.loi = 'Chưa điền FILE_ID trong Config.gs, và bạn cũng chưa chọn ' +
                'gia phả nào.';
    return phien;
  }
  phien.maGiaPha = maCay;

  var file;
  try {
    file = DriveApp.getFileById(maCay);
    // Chạm thật vào file mới biết có đọc được không. Từ việc 9 thì tên ấy đi
    // luôn về trình duyệt: sau một lần đổi FILE_ID, thứ người dùng cần thấy
    // ngay là app đang mở file NÀO — hai gia phả trông giống hệt nhau trên
    // màn hình cho tới lúc nhìn vào tên file.
    phien.tenFileDuLieu = file.getName();
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
// 2b. GIA PHẢ ĐANG CHỌN — nhiều cây, mỗi người tự chọn cây của mình
// ============================================================
//
// Trước 28/08/2026 cả app chỉ mở đúng một gia phả: `FILE_ID` trong `Config.gs`.
// Đổi sang cây khác là sửa tay ba dòng rồi triển khai lại — và đổi cho MỌI
// người cùng lúc.
//
// Nay `FILE_ID` tụt xuống vai trò **gia phả mặc định**: thứ mở ra khi người
// dùng chưa chọn gì. Lựa chọn thật nằm trong `PropertiesService
// .getUserProperties()`, kho đã được phép thử 0.11 chứng minh là **tách riêng
// theo từng tài khoản** — nên hai người trong họ mở hai cây khác nhau cùng
// lúc là chuyện bình thường, không ai đá ai.
//
// ⚠ QUYỀN VẪN DO DRIVE THỰC THI, KHÔNG DO APP.
// Mã file người dùng chọn là lời khai của trình duyệt, y như mọi thứ khác gửi
// lên — nhưng nó KHÔNG cần app canh: mọi đường đọc/ghi đều đi qua
// `DriveApp.getFileById()`, chạy dưới danh tính người ấy. Chọn một file không
// được chia sẻ thì Drive ném lỗi ở tầng máy chủ. `chonGiaPha()` vẫn kiểm
// trước, nhưng đó là để **nói cho người dùng biết ngay**, không phải để canh
// cổng — cổng đã có Drive gác.
//
// ⚠ ĐO ĐƯỢC NGÀY 28/08/2026, và cả thiết kế này treo vào nó:
// `DriveApp.searchFiles` chạy dưới danh tính người truy cập **CÓ thấy file
// người khác chia sẻ thẳng cho họ** — tài khoản khách tìm ra
// `giapha-nguyen-trong-bac.json` với quyền `EDIT` dù không phải chủ. Nhờ đó
// danh sách gia phả không cần app giữ: hỏi Drive là ra, và Drive trả về đúng
// phần của từng người.

/** Khoá trong kho riêng của từng tài khoản. */
var KHOA_GIA_PHA = 'giaPhaDangChon';

/**
 * Mã file gia phả người đang đăng nhập mở. Kho riêng → `FILE_ID` mặc định.
 *
 * Không kiểm quyền ở đây, và cố ý: hàm này chạy trong MỌI lệnh, còn phép kiểm
 * quyền là một lần chạm Drive. Chỗ kiểm đúng là `chonGiaPha()` — một lần, lúc
 * chọn — và bản thân Drive ở mọi lần sau.
 */
function maGiaPhaDangChon_() {
  var ma = '';
  try {
    ma = PropertiesService.getUserProperties().getProperty(KHOA_GIA_PHA) || '';
  } catch (e) {
    ma = '';
  }
  if (ma) return ma;
  return laMaThat_(FILE_ID) ? FILE_ID : '';
}

/** Một mã trong Config.gs đã được điền thật chưa. */
function laMaThat_(ma) {
  return !!ma && String(ma).indexOf('DAN_ID_') !== 0;
}

/** Người này đang mở đúng gia phả mặc định của `Config.gs`? */
function dangMoGiaPhaMacDinh_() {
  return laMaThat_(FILE_ID) && maGiaPhaDangChon_() === FILE_ID;
}

/**
 * Thư mục ẢNH của gia phả đang mở.
 *
 * Đọc `tree.photoFolderId` **từ chính file dữ liệu**, không từ `Config.gs`.
 * Đó là đường duy nhất còn lại sau khi đo trên Drive thật: người được chia sẻ
 * THẲNG file JSON thì `file.getParents()` trả về RỖNG — họ không thấy thư mục
 * mẹ, nên không suy được thư mục `Anh` nằm cạnh nó. Mã thư mục phải nằm trong
 * chính file, và việc 9 đã ghi sẵn nó vào đó.
 *
 * @param {object} [cay] cây đã đọc rồi, để khỏi đọc file thêm một lần nữa
 */
function maThuMucAnh_(cay) {
  var ma = cay && cay.tree && cay.tree.photoFolderId;
  if (laMaThat_(ma)) return String(ma);

  if (!cay) {
    try {
      var c = JSON.parse(DriveApp.getFileById(maGiaPhaDangChon_())
                                 .getBlob().getDataAsString('UTF-8'));
      if (c && c.tree && laMaThat_(c.tree.photoFolderId)) {
        return String(c.tree.photoFolderId);
      }
    } catch (e) {}
  }

  // Gia phả đời đầu không có `photoFolderId` — nó ra đời trước việc 9. Lùi về
  // Config.gs, NHƯNG chỉ khi đang mở đúng cây mặc định: lùi vô điều kiện là
  // đẩy ảnh của cây B vào thư mục ảnh của cây A.
  return dangMoGiaPhaMacDinh_() && laMaThat_(THU_MUC_ANH_ID) ? THU_MUC_ANH_ID : '';
}

/**
 * Thư mục SAO LƯU của gia phả đang mở — thư mục `Sao_luu` nằm cạnh file.
 *
 * Suy từ thư mục mẹ, và điều đó có nghĩa: **chỉ người thấy được thư mục mẹ mới
 * sao lưu và khôi phục được**, tức trên thực tế là chủ dự án. Đó không phải
 * hạn chế phải chịu đựng, đó chính là luật đã chốt ở việc 9 — khôi phục là ghi
 * đè cả gia phả, nó phải nằm trong tay đúng một người. Trước đây luật ấy giữ
 * bằng cách chia sẻ hẹp một thư mục; nay nó tự giữ bằng cấu trúc.
 */
function maThuMucSaoLuu_() {
  var ma = maGiaPhaDangChon_();
  if (ma) {
    try {
      var lap = DriveApp.getFileById(ma).getParents();
      while (lap.hasNext()) {
        var con = lap.next().getFoldersByName('Sao_luu');
        if (con.hasNext()) return con.next().getId();
      }
    } catch (e) {}
  }
  // Cùng lý lẽ với `maThuMucAnh_`: lùi về Config.gs chỉ khi đang mở đúng cây
  // mặc định. Lùi nhầm ở đây đắt hơn nhiều — nó trộn bản sao lưu của hai cây,
  // và `khoiPhucSaoLuu` sẽ ghi đè cây này bằng cây kia.
  return dangMoGiaPhaMacDinh_() && laMaThat_(THU_MUC_SAO_LUU_ID)
    ? THU_MUC_SAO_LUU_ID : '';
}

/**
 * DANH SÁCH GIA PHẢ người đang đăng nhập mở được. Trình duyệt gọi khi dựng
 * màn hình chọn.
 *
 * Hỏi Drive bằng `searchFiles`, nên nó **tự lọc theo quyền** — mỗi người thấy
 * đúng phần của mình, không thấy gì hơn, và app không giữ bảng phân quyền nào.
 *
 * ⚠ LỌC BẢN SAO LƯU RA. Đo ngày 28/08/2026 trên Drive thật: tài khoản chủ dự
 * án có 8 file khớp `giapha-*`, mà 6 là bản sao lưu — không lọc thì màn hình
 * bày ra sáu cái tên na ná, bấm nhầm là mở một bản chụp cũ tưởng là gia phả
 * đang dùng. Xem `laTenFileGiaPha_`.
 *
 * @returns {{ok:boolean, dangChon:string|null, ds:Array, loi:string|null}}
 */
function layDanhSachGiaPha() {
  var kq = { ok: false, dangChon: null, ds: [], loi: null };
  var dangChon = maGiaPhaDangChon_();
  kq.dangChon = dangChon || null;

  var ds = [];
  try {
    var lap = DriveApp.searchFiles("title contains 'giapha-' and trashed = false");
    while (lap.hasNext() && ds.length < 40) {
      var f = lap.next();
      if (!laTenFileGiaPha_(f.getName())) continue;
      var m = moTaMotGiaPha_(f);
      if (m) ds.push(m);
    }
  } catch (e) {
    kq.loi = 'Không hỏi được Google Drive danh sách gia phả: ' + e.message;
    return kq;
  }

  // Gia phả đang mở đứng đầu, rồi tới cây sửa được, rồi theo tên. Người dùng
  // mở màn hình này để ĐỔI, nên cây đang mở phải nhìn thấy ngay để biết mình
  // đang đứng ở đâu — không phải để bấm lại.
  ds.sort(function (a, b) {
    if (a.dangChon !== b.dangChon) return a.dangChon ? -1 : 1;
    if (a.suaDuoc !== b.suaDuoc) return a.suaDuoc ? -1 : 1;
    return a.ten < b.ten ? -1 : (a.ten > b.ten ? 1 : 0);
  });

  kq.ds = ds;
  kq.ok = true;
  return kq;
}

/**
 * Một dòng của màn hình chọn. Trả `null` nếu file không phải cây gia phả.
 *
 * PHẢI đọc nội dung file, không chỉ đọc tên: tên là thứ người dùng đổi được
 * trên Drive bất cứ lúc nào, và một file tên `giapha-abc.json` chứa thứ khác
 * mà lọt vào danh sách thì bấm vào là app ngã ở màn hình sau — chỗ không còn
 * gì để nói cho người dùng biết vì sao.
 */
function moTaMotGiaPha_(file) {
  var cay = null;
  try {
    cay = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    return null;
  }
  if (!cay || cay.format !== 'giapha-json') return null;

  var tom = tomTatCay_(cay);
  var ten = (cay.tree && cay.tree.name) ? String(cay.tree.name) : file.getName();

  return {
    fileId:   file.getId(),
    ten:      ten,
    tenFile:  file.getName(),
    soNguoi:  tom.persons,
    soCap:    tom.unions,
    revision: (cay.tree && cay.tree.revision) || 0,
    suaDuoc:  suaDuocFile_(file),
    dangChon: file.getId() === maGiaPhaDangChon_(),
    doiLuc:   docLucSua_(file),
  };
}

/** Người đang đăng nhập có sửa được file này không. Hỏi Drive, không đoán. */
function suaDuocFile_(file) {
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { return false; }
  try {
    var q = file.getAccess(email);
    return q === DriveApp.Permission.EDIT || q === DriveApp.Permission.OWNER;
  } catch (e) {
    // Người chỉ có quyền xem thường không đọc được danh sách chia sẻ — cùng ca
    // đã gặp ở `layPhien`. Mặc định bảo thủ; Drive vẫn chặn ở tầng máy chủ.
    return false;
  }
}

/** Lần sửa gần nhất, đã định dạng. Chuỗi rỗng nếu không đọc được. */
function docLucSua_(file) {
  try {
    return Utilities.formatDate(file.getLastUpdated(), muiGio_(), 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return '';
  }
}

/**
 * CHỌN một gia phả. Ghi vào kho riêng của người đang đăng nhập.
 *
 * Kiểm TRƯỚC KHI ghi, và kiểm bằng cách chạm thật vào file — không tin mã
 * trình duyệt gửi lên. Nhưng như đã nói ở đầu mục: đây là để nói cho người
 * dùng biết ngay, không phải để canh cổng. Cổng do Drive gác ở mọi lần đọc/ghi
 * sau đó.
 *
 * Ghi xong thì ĐỌC LẠI rồi trả về, cùng nếp với `datNguoiTrungTamMacDinh`.
 *
 * @returns {{ok:boolean, daChon:string|null, ten:string|null, loi:string|null}}
 */
function chonGiaPha(fileId) {
  var kq = { ok: false, daChon: null, ten: null, loi: null };
  var ma = String(fileId || '');
  if (!ma) {
    kq.loi = 'Chưa cho biết chọn gia phả nào.';
    return kq;
  }

  var file;
  try {
    file = DriveApp.getFileById(ma);
    file.getName();
  } catch (e) {
    kq.loi = 'Không mở được gia phả này — nhiều khả năng nó chưa được chia sẻ ' +
             'cho bạn, hoặc vừa bị xoá. Nhờ ' + NGUOI_QUAN_LY + ' kiểm lại ' +
             'trên Google Drive.';
    return kq;
  }

  if (!laTenFileGiaPha_(file.getName())) {
    kq.loi = 'File "' + file.getName() + '" không phải một gia phả của app này.';
    return kq;
  }

  var mo = moTaMotGiaPha_(file);
  if (!mo) {
    kq.loi = 'Mở được file "' + file.getName() + '" nhưng bên trong không phải ' +
             'cây gia phả của app này.';
    return kq;
  }

  try {
    PropertiesService.getUserProperties().setProperty(KHOA_GIA_PHA, ma);
    kq.daChon = PropertiesService.getUserProperties().getProperty(KHOA_GIA_PHA);
  } catch (e) {
    kq.loi = 'Không ghi được lựa chọn vào kho riêng của bạn: ' + e.message;
    return kq;
  }

  kq.ten = mo.ten;
  kq.ok  = kq.daChon === ma;
  if (!kq.ok) kq.loi = 'Ghi xong nhưng đọc lại ra giá trị khác. Thử lại.';
  return kq;
}

/** Bỏ lựa chọn, quay về gia phả mặc định của `Config.gs`. */
function boChonGiaPha() {
  var kq = { ok: false, loi: null };
  try {
    PropertiesService.getUserProperties().deleteProperty(KHOA_GIA_PHA);
    kq.ok = true;
  } catch (e) {
    kq.loi = e.message;
  }
  return kq;
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
    file  = DriveApp.getFileById(maGiaPhaDangChon_());
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
      file  = DriveApp.getFileById(maGiaPhaDangChon_());
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
    //
    // ⚠ ĐÚNG MỘT ĐƯỜNG được phép làm số bản ghi ÍT ĐI: lệnh *Dọn thùng rác*,
    // mang `action: 'purge'`. Nhưng nó KHÔNG được miễn kiểm — nó đổi sang một
    // phép kiểm CHẶT HƠN: mọi bản ghi biến mất phải là bản ghi đã mang cờ
    // `deleted` **trong bản trên Drive**. Máy chủ tự đọc lấy cờ ấy từ bản cũ,
    // không tin một chữ nào trong lời khai của trình duyệt — cùng lý lẽ đã
    // dùng cho quyền ở bước 1.
    var laDonRac = !!(moTa && moTa.action === 'purge');

    if (laDonRac) {
      var loiDonRac = raSoatDonRac_(cayCu, cay);
      if (loiDonRac) {
        kq.lyDo = 'matdulieu';
        kq.loi  = loiDonRac;
        return kq;
      }
    } else {
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
    }

    // --- 6. SAO LƯU BẢN CŨ, RỒI GHI BẢN MỚI ------------------------------
    // Sao lưu chạy TRƯỚC khi ghi đè, vì thứ cần cứu là bản sắp mất.
    //
    // Dọn rác thì sao lưu là BẮT BUỘC, không đợi đến hạn: đây là lần ghi duy
    // nhất của cả app mà bản cũ chứa thứ bản mới không còn.
    kq.saoLuu = saoLuuNeuDenHan_(cayCu, laDonRac);

    // ⚠ VÀ VỚI LỆNH DỌN RÁC, SAO LƯU LÀ ĐIỀU KIỆN, KHÔNG PHẢI THỨ ĐI KÈM.
    //
    // Với mọi lần ghi khác, sao lưu hỏng thì kệ nó — bản cũ vẫn còn nguyên
    // trên Drive dưới dạng phiên bản file, và hàm sao lưu đã được viết để
    // không bao giờ làm hỏng việc lưu. Dọn rác thì ngược hẳn: bản cũ là thứ
    // DUY NHẤT còn giữ những bản ghi sắp mất hẳn. Không cất được nó thì thà
    // không dọn.
    //
    // Ca thật sẽ gặp: thư mục Sao_luu chỉ chia sẻ cho chủ dự án
    // (`PHAN-QUYEN_V03`), mà script chạy bằng danh tính người đang truy cập.
    // Nên **người biên tập khác sẽ bị chặn ở đúng dòng này** — đó là hệ quả cố
    // ý của cách chia sẻ, và câu lỗi phải nói thẳng ra thế.
    if (laDonRac && !laTenFileSaoLuu_(kq.saoLuu)) {
      kq.lyDo = 'khongsaoluuduoc';
      kq.loi  = 'CHƯA dọn gì cả. Máy chủ không cất được bản sao lưu trước khi ' +
                'xoá (' + kq.saoLuu + '), mà dọn thùng rác thì bản sao lưu ấy ' +
                'là đường lùi duy nhất. Thư mục Sao_luu chỉ chia sẻ cho ' +
                NGUOI_QUAN_LY + ', nên việc này phải do chính người ấy làm.';
      return kq;
    }

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
    kq.headRevisionId = dauVanTay_(cay, DriveApp.getFileById(maGiaPhaDangChon_()));
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

/**
 * Rà soát riêng cho lệnh DỌN THÙNG RÁC. Trả câu lỗi, hoặc null nếu sạch.
 *
 * Đây là chốt chặn ở phía máy chủ cho đường xoá thật, và nó phải đứng đây chứ
 * không đứng ở trình duyệt: `domains/purge.js` đã tính đúng, nhưng cái chạy
 * trong tay người dùng thì không có gì bảo đảm là bản `purge.js` ta viết. Máy
 * chủ đọc lấy cờ `deleted` **từ bản đang nằm trên Drive** rồi tự đối chiếu.
 *
 * Một câu hỏi duy nhất, hỏi cho cả ba mảng: *thứ vừa biến mất có phải thứ đã
 * nằm trong thùng rác không?* Bất cứ bản ghi nào biến mất mà bản cũ không mang
 * cờ `deleted` đều làm cả lần ghi bị từ chối — không xoá một phần, không đoán.
 *
 * ⚠ `media` được phép biến mất theo CHỦ THỂ của nó, dù chính nó chưa mang cờ:
 * ảnh của một người vừa bị xoá hẳn thì `subjectId` của nó trỏ vào hư không.
 * Đó là ngoại lệ DUY NHẤT, và nó vẫn được kiểm — chủ thể ấy phải thật sự nằm
 * trong số vừa bị xoá.
 */
function raSoatDonRac_(cayCu, cayMoi) {
  var loi = null;

  var maNguoiMat = maBienMat_(cayCu.persons, cayMoi.persons);
  var maCapMat   = maBienMat_(cayCu.unions,  cayMoi.unions);

  loi = doiChieuCoDeleted_(cayCu.persons, maNguoiMat, 'người');
  if (loi) return loi;
  loi = doiChieuCoDeleted_(cayCu.unions, maCapMat, 'cặp');
  if (loi) return loi;

  // Ảnh: hoặc chính nó mang cờ, hoặc chủ thể của nó vừa bị xoá hẳn.
  var daMat = {};
  var i;
  for (i = 0; i < maNguoiMat.length; i++) daMat[maNguoiMat[i]] = true;
  for (i = 0; i < maCapMat.length;   i++) daMat[maCapMat[i]]   = true;

  var cuTheoMa = theoMa_(cayCu.media);
  var maAnhMat = maBienMat_(cayCu.media, cayMoi.media);
  for (i = 0; i < maAnhMat.length; i++) {
    var m = cuTheoMa[maAnhMat[i]];
    if (!m) continue;
    if (m.deleted === true) continue;
    if (daMat[m.subjectId] === true) continue;
    return 'Lệnh dọn thùng rác đòi xoá bản ghi ảnh ' + maAnhMat[i] +
           ', nhưng tấm ấy không nằm trong thùng rác và chủ thể của nó vẫn ' +
           'còn trong gia phả. Đã từ chối ghi.';
  }

  // Nhật ký không bao giờ được ngắn đi: nó là thứ duy nhất kể lại chuyện đã
  // xảy ra sau khi bản ghi đã mất.
  var logCu  = (cayCu.changeLog  && cayCu.changeLog.length)  || 0;
  var logMoi = (cayMoi.changeLog && cayMoi.changeLog.length) || 0;
  if (logMoi < logCu) {
    return 'Bản gửi lên có ít mục nhật ký hơn bản trên Drive (' + logMoi +
           ' so với ' + logCu + '). Dọn thùng rác không được đụng vào ' +
           'changeLog. Đã từ chối ghi.';
  }
  return null;
}

/** Mã có trong mảng CŨ mà không còn trong mảng MỚI. */
function maBienMat_(dsCu, dsMoi) {
  var con = {};
  var i;
  if (dsMoi && dsMoi.length) {
    for (i = 0; i < dsMoi.length; i++) {
      if (dsMoi[i] && dsMoi[i].id) con[dsMoi[i].id] = true;
    }
  }
  var ra = [];
  if (dsCu && dsCu.length) {
    for (i = 0; i < dsCu.length; i++) {
      var x = dsCu[i];
      if (x && x.id && con[x.id] !== true) ra.push(x.id);
    }
  }
  return ra;
}

/** Bản ghi theo mã, tra nhanh. */
function theoMa_(ds) {
  var ra = {};
  if (ds && ds.length) {
    for (var i = 0; i < ds.length; i++) {
      if (ds[i] && ds[i].id) ra[ds[i].id] = ds[i];
    }
  }
  return ra;
}

/** Mọi mã trong `maMat` phải mang cờ `deleted` ở bản CŨ. */
function doiChieuCoDeleted_(dsCu, maMat, loai) {
  var cu = theoMa_(dsCu);
  for (var i = 0; i < maMat.length; i++) {
    var x = cu[maMat[i]];
    if (!x || x.deleted !== true) {
      return 'Lệnh dọn thùng rác đòi xoá ' + loai + ' ' + maMat[i] +
             ', nhưng bản ghi ấy KHÔNG nằm trong thùng rác của bản đang trên ' +
             'Drive. Đã từ chối ghi — không xoá một phần nào cả. Tải lại ' +
             'trang rồi mở lại thùng rác.';
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

// --- ẢNH: bốn hàm, và ba trong số đó sinh ra để TRẢ LỜI MỘT CÂU HỎI -------
//
// Câu hỏi là: **trình duyệt có hiện được ảnh nằm trên Drive hay không**, khi
// app chạy trong khung iframe của Apps Script và file ảnh KHÔNG mở công khai.
//
// Không ai trả lời được câu ấy bằng suy luận. Có ba đường đi, và bước 28 đo cả
// ba trên máy thật:
//
//   1. `drive.google.com/thumbnail?id=…`      — cần cookie Google gửi kèm
//   2. `lh3.googleusercontent.com/d/…`        — cùng họ, máy chủ khác
//   3. `layAnhBase64()` — MÁY CHỦ đọc file rồi trả chuỗi về
//
// Đường 3 CHẮC CHẮN chạy: script thực thi bằng danh tính người đang truy cập,
// nên Drive cho đọc đúng những file người ấy được chia sẻ. Cái giá là mỗi tấm
// ảnh tốn một lần gọi máy chủ. Hai đường đầu rẻ hơn nhiều — nếu chúng chạy.
//
// ⚠ ĐỪNG XOÁ `layAnhBase64` kể cả khi đường 1 hoặc 2 thắng. Nó là đường lui
// duy nhất còn lại nếu Google siết cookie bên thứ ba.

/** Ảnh đã nén ở trình duyệt rồi mới lên tới đây. Quá cỡ này là dấu hiệu hỏng. */
var TRAN_ANH_BYTE = 3 * 1024 * 1024;

/**
 * Ghi một tấm ảnh đã nén sẵn vào THU_MUC_ANH_ID.
 *
 * KHÔNG đụng gì tới quyền chia sẻ của file. File thừa hưởng quyền của thư mục
 * Anh, và đó là chỗ chủ dự án quyết định, không phải chỗ này.
 *
 * @param {string} base64   chuỗi base64 THUẦN, không có tiền tố `data:`
 * @param {string} tenFile
 * @returns {{
 *   ok: boolean, lyDo: string|null, fileId: string|null, ten: string|null,
 *   coByte: number, urlThumb: string|null, urlLh3: string|null,
 *   urlXem: string|null, loi: string|null
 * }}
 */
function taiAnh(base64, tenFile) {
  var kq = {
    ok: false, lyDo: null, fileId: null, ten: null, coByte: 0,
    urlThumb: null, urlLh3: null, urlXem: null, loi: null,
  };

  var phien = layPhien();
  if (phien.loi) {
    kq.lyDo = 'caidat';
    kq.loi  = phien.loi;
    return kq;
  }
  // Tải ảnh lên là GHI. Người chỉ có quyền xem gia phả thì không được ghi ảnh,
  // cùng một luật với luuCay().
  if (!phien.suaDuoc) {
    kq.lyDo = 'khongcoquyen';
    kq.loi  = 'Bạn chỉ có quyền xem gia phả nên chưa tải ảnh lên được. ' +
              'Cần sửa thật thì nhờ ' + NGUOI_QUAN_LY + ' đổi quyền trên Google Drive.';
    return kq;
  }
  // Thư mục ảnh của ĐÚNG gia phả đang mở, đọc từ `tree.photoFolderId` trong
  // chính file dữ liệu. Trước 28/08/2026 đây là hằng số trong Config.gs, nên
  // ảnh của mọi cây rơi vào cùng một chỗ.
  var maAnh = maThuMucAnh_();
  if (!maAnh) {
    kq.lyDo = 'caidat';
    kq.loi  = 'Gia phả đang mở chưa có thư mục ảnh. Nhờ ' + NGUOI_QUAN_LY +
              ' chạy kiemTraConfig() để soi, hoặc tạo lại gia phả bằng ' +
              'taoFileDuLieuMoi().';
    return kq;
  }
  if (!base64 || typeof base64 !== 'string') {
    kq.lyDo = 'khongcodulieu';
    kq.loi  = 'Không nhận được dữ liệu ảnh nào.';
    return kq;
  }

  var byte;
  try {
    byte = Utilities.base64Decode(base64);
  } catch (e) {
    kq.lyDo = 'anhhong';
    kq.loi  = 'Chuỗi ảnh gửi lên không giải mã được: ' + e.message;
    return kq;
  }

  kq.coByte = byte.length;
  if (byte.length > TRAN_ANH_BYTE) {
    kq.lyDo = 'quaco';
    kq.loi  = 'Ảnh nặng ' + Math.round(byte.length / 1024) + ' KB, vượt trần ' +
              Math.round(TRAN_ANH_BYTE / 1024) + ' KB. Lẽ ra trình duyệt đã nén ' +
              'trước khi gửi — nặng thế này nghĩa là bước nén không chạy.';
    return kq;
  }

  var ten = tenAnhAnToan_(tenFile);

  try {
    var thuMuc = DriveApp.getFolderById(maAnh);
    var blob   = Utilities.newBlob(byte, 'image/jpeg', ten);
    var file   = thuMuc.createFile(blob);

    kq.fileId   = file.getId();
    kq.ten      = file.getName();
    kq.urlThumb = 'https://drive.google.com/thumbnail?id=' + kq.fileId + '&sz=w200';
    kq.urlLh3   = 'https://lh3.googleusercontent.com/d/' + kq.fileId + '=w200';
    kq.urlXem   = 'https://drive.google.com/file/d/' + kq.fileId + '/view';
    kq.ok       = true;
    return kq;
  } catch (e) {
    kq.lyDo = 'drivetuchoi';
    kq.loi  = 'Drive từ chối ghi ảnh vào thư mục Anh: ' + e.message +
              ' — thường là do thư mục Anh chưa chia sẻ quyền SỬA cho ' +
              (phien.email || 'tài khoản đang đăng nhập') + '.';
    return kq;
  }
}

/**
 * MÁY CHỦ đọc file ảnh rồi trả chuỗi base64 về — đường đi chắc chắn chạy.
 *
 * Ưu tiên `getThumbnail()`: Drive dựng sẵn một bản nhỏ, thường vài KB, đúng cỡ
 * ô sơ đồ. Chỉ khi không có bản ấy mới đọc file gốc — mà file gốc do app tải
 * lên thì cũng đã nén rồi.
 *
 * @returns {{ ok, base64: string|null, mime: string|null, coByte: number,
 *             nguon: string|null, loi: string|null }}
 */
function layAnhBase64(fileId) {
  var kq = { ok: false, base64: null, mime: null, coByte: 0, nguon: null, loi: null };
  if (!fileId) {
    kq.loi = 'Chưa cho biết mã file ảnh.';
    return kq;
  }

  try {
    var file = DriveApp.getFileById(String(fileId));
    var blob = null;
    try { blob = file.getThumbnail(); } catch (e) { blob = null; }

    if (blob) {
      kq.nguon = 'thumbnail';
    } else {
      blob = file.getBlob();
      kq.nguon = 'file-goc';
    }

    var byte  = blob.getBytes();
    kq.base64 = Utilities.base64Encode(byte);
    kq.mime   = blob.getContentType() || 'image/jpeg';
    kq.coByte = byte.length;
    kq.ok     = true;
    return kq;
  } catch (e) {
    kq.loi = 'Không đọc được ảnh trên Drive: ' + e.message;
    return kq;
  }
}

/**
 * Đọc quyền chia sẻ hiện tại của một file ảnh. CHỈ ĐỌC, không đổi gì.
 *
 * Người không phải chủ file thường KHÔNG được đọc danh sách chia sẻ, nên hàm
 * này ném lỗi là chuyện bình thường — trả về `khongdocduoc`, không coi là hỏng.
 */
function trangThaiQuyenAnh(fileId) {
  var kq = { ok: false, chiaSe: null, vaiTro: null, loi: null };
  try {
    var file = DriveApp.getFileById(String(fileId));
    kq.chiaSe = String(file.getSharingAccess());
    kq.vaiTro = String(file.getSharingPermission());
    kq.ok = true;
    return kq;
  } catch (e) {
    kq.chiaSe = 'khongdocduoc';
    kq.loi    = e.message;
    return kq;
  }
}

/**
 * Mở quyền "bất kỳ ai có đường liên kết đều XEM được" cho MỘT file ảnh.
 *
 * ⚠ ĐÂY LÀ MỘT QUYẾT ĐỊNH VỀ RIÊNG TƯ, KHÔNG PHẢI MỘT NÚT KỸ THUẬT. Ai có
 * đường liên kết cũng xem được ảnh, không cần đăng nhập, và Google không rút
 * lại được những bản đã bị chép đi. Chỉ gọi hàm này khi người dùng bấm một nút
 * nói rõ điều đó bằng chữ.
 *
 * Bước 28 gọi nó trên ĐÚNG MỘT tấm ảnh thử, để biết đường thumbnail có chạy
 * không khi file đã công khai. Đừng nối nó vào đường tải ảnh thường ngày trước
 * khi chủ dự án chốt.
 */
function moQuyenXemAnh(fileId) {
  var kq = { ok: false, chiaSe: null, loi: null };
  try {
    var file = DriveApp.getFileById(String(fileId));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    kq.chiaSe = String(file.getSharingAccess());
    kq.ok = true;
    return kq;
  } catch (e) {
    kq.loi = 'Không đổi được quyền chia sẻ: ' + e.message +
             ' — chỉ chủ file mới làm được việc này.';
    return kq;
  }
}

/**
 * Cho một file ảnh vào thùng rác. Dùng để dọn ảnh của phép thử.
 * `setTrashed` chứ không xoá hẳn — thùng rác Drive giữ thêm 30 ngày.
 */
function xoaAnhThu(fileId) {
  try {
    DriveApp.getFileById(String(fileId)).setTrashed(true);
    return { ok: true, loi: null };
  } catch (e) {
    return { ok: false, loi: e.message };
  }
}

/**
 * DỌN ẢNH RÁC — bước 4 của một lần *Dọn thùng rác*.
 *
 * --- Vì sao KHÔNG dùng lại `xoaAnhThu` ở trên -----------------------------
 *
 * Hai hàm cùng gọi `setTrashed(true)`, nên nhìn qua thì hàm này thừa. Ba khác
 * biệt, và cái thứ nhất là lý do thật:
 *
 * 1. **Nhận CẢ LOẠT, trả về từng cái.** Dọn một thùng rác có mười tấm ảnh mà
 *    gọi `xoaAnhThu` mười lần là mười vòng mạng nối tiếp nhau, mỗi vòng vài
 *    giây, trong lúc người dùng ngồi nhìn một cái hộp không nhúc nhích.
 * 2. **Không tấm nào hỏng được cả loạt.** Ảnh đã bị ai đó xoá tay trên Drive
 *    từ trước là chuyện thường; ném lỗi vì nó là bắt người dùng gánh hậu quả
 *    của một việc đã xong. Mỗi tấm một dòng kết quả, hàm luôn chạy hết.
 * 3. **Gọi SAU khi máy chủ đã gật cho lần ghi.** Bản ghi đã mất rồi, nên tấm
 *    ảnh này chắc chắn không còn ai trỏ tới — điều mà `xoaAnhThu` không dám
 *    giả định, vì nó dọn ảnh vừa tải lên hỏng giữa chừng.
 *
 * ⚠ `setTrashed` chứ KHÔNG xoá hẳn, và đây là chỗ chữ *"xoá thật"* dừng lại:
 * file vào thùng rác Drive và nằm đó thêm 30 ngày. Nhận nhầm một tấm ảnh cụ
 * ông chụp năm 1950 là mất vĩnh viễn — 30 ngày ấy là lớp lùi cuối cùng, và nó
 * nằm ngoài app nên không lệnh nào trong app xoá qua được.
 *
 * @param {string[]} dsFileId
 * @returns {{ok:boolean, soXoa:number, soHong:number, chiTiet:object[]}}
 */
function xoaAnhThat(dsFileId) {
  var kq = { ok: true, soXoa: 0, soHong: 0, chiTiet: [] };
  var ds = (dsFileId && dsFileId.length) ? dsFileId : [];

  for (var i = 0; i < ds.length; i++) {
    var ma = String(ds[i] || '');
    if (!ma) continue;
    try {
      DriveApp.getFileById(ma).setTrashed(true);
      kq.soXoa++;
      kq.chiTiet.push({ fileId: ma, ok: true, loi: null });
    } catch (e) {
      kq.soHong++;
      kq.chiTiet.push({ fileId: ma, ok: false, loi: e.message });
    }
  }
  // `ok` nói *hàm có chạy hết không*, không nói *có tấm nào hỏng không*. Nơi
  // gọi đọc `soHong` để quyết định có kể ra hay không.
  return kq;
}

/**
 * Tên file an toàn: bỏ dấu gạch chéo và ký tự lạ, luôn có đuôi `.jpg`.
 * Trống thì tự đặt theo dấu thời gian, không để Drive sinh ra "Untitled".
 */
function tenAnhAnToan_(tenFile) {
  var t = String(tenFile || '').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim();
  if (!t) {
    var mui = 'Asia/Ho_Chi_Minh';
    try { mui = Session.getScriptTimeZone() || mui; } catch (e) {}
    t = 'anh_' + Utilities.formatDate(new Date(), mui, 'yyyy-MM-dd_HHmmss');
  }
  if (t.length > 90) t = t.slice(0, 90);
  if (!/\.jpe?g$/i.test(t)) t = t.replace(/\.[a-z0-9]{1,5}$/i, '') + '.jpg';
  return t;
}

// --- SAO LƯU CHỦ ĐỘNG VÀ KHÔI PHỤC (việc 7) ------------------------------
//
// Bốn hàm dưới đây làm nốt việc mà `saoLuuNeuDenHan_` bỏ dở: nó CẤT được bản
// cũ, nhưng cất xong thì không ai TÌM LẠI được từ trong app — phải mở thư mục
// Sao_luu trên Drive mà nhìn. Một đường lùi chỉ dùng được bằng cách rời khỏi
// app thì trong lúc hoảng không ai dùng.
//
// ⚠ AI DÙNG ĐƯỢC: chỉ CHỦ DỰ ÁN. Thư mục Sao_luu chỉ chia sẻ cho một người
// (`PHAN-QUYEN_V03`), mà script chạy bằng danh tính người đang truy cập — nên
// với người biên tập khác, `DriveApp.getFolderById` ném lỗi ngay dòng đầu.
// Đây là hệ quả CỐ Ý của cách chia sẻ, y như chuyện họ không dọn được thùng
// rác (việc 6B). Cả bốn hàm nói thẳng điều đó thay vì trả danh sách rỗng.

/**
 * Danh sách bản sao lưu trong THU_MUC_SAO_LUU_ID, mới nhất trước.
 *
 * @returns {{ok:boolean, loi:string|null, thuMuc:string,
 *            ds:Array<{fileId:string, ten:string, luc:string, lucSo:number,
 *                      co:number, revision:number|null}>}}
 *
 * ⚠ KHÔNG mở từng file ra đọc. Ba mươi bản sao lưu là ba mươi lần tải cả cây
 * về máy chủ, cho một màn hình mà người dùng chỉ liếc qua rồi chọn một dòng.
 * Số revision lấy từ TÊN FILE — `saoLuuNeuDenHan_` đã gắn sẵn `_rev123` vào
 * đó, và đó chính là lý do nó gắn. Muốn biết bên trong có gì thì bấm vào một
 * dòng: `xemBanSaoLuu` mở đúng MỘT file.
 */
function layDanhSachSaoLuu() {
  var kq = { ok: false, loi: null, thuMuc: '', ds: [] };

  var maLuu = maThuMucSaoLuu_();
  if (!maLuu) {
    kq.loi = 'Không tìm thấy thư mục Sao_luu của gia phả đang mở. Thư mục ấy ' +
             'nằm cạnh file dữ liệu và KHÔNG chia sẻ cho ai, nên chỉ ' +
             NGUOI_QUAN_LY + ' xem và khôi phục được bản sao lưu.';
    return kq;
  }

  var thuMuc;
  try {
    thuMuc = DriveApp.getFolderById(maLuu);
    kq.thuMuc = thuMuc.getName();
  } catch (e) {
    kq.loi = 'Không mở được thư mục Sao_luu. Thư mục ấy chỉ chia sẻ cho ' +
             NGUOI_QUAN_LY + ', nên chỉ người ấy xem và khôi phục được bản ' +
             'sao lưu. (' + e.message + ')';
    return kq;
  }

  try {
    var ds  = dsSaoLuuMoiTruoc_(thuMuc);
    var mui = muiGio_();
    for (var i = 0; i < ds.length && i < 60; i++) {
      var f   = ds[i];
      var luc = f.getDateCreated();
      kq.ds.push({
        fileId:   f.getId(),
        ten:      f.getName(),
        luc:      Utilities.formatDate(luc, mui, 'dd/MM/yyyy HH:mm'),
        lucSo:    luc.getTime(),
        co:       f.getSize(),
        revision: revTuTenSaoLuu_(f.getName()),
      });
    }
    kq.ok = true;
    return kq;
  } catch (e) {
    kq.loi = 'Đọc được thư mục nhưng không liệt kê được file: ' + e.message;
    return kq;
  }
}

/**
 * SAO LƯU NGAY — cất bản đang nằm trên Drive vào thư mục Sao_luu, không đợi
 * đến hạn.
 *
 * ⚠ Sao lưu bản TRÊN DRIVE, không sao lưu cây trong trình duyệt. Người bấm nút
 * này thường đang sắp làm một việc lớn (nhập dữ liệu, dọn rác), và thứ họ muốn
 * cất là *bản đang có thật*, chứ không phải bản có lẫn mấy thay đổi chưa lưu
 * trên máy họ. Nhận cây từ trình duyệt còn mở ra một đường ghi thứ hai không
 * qua `luuCay` — đúng thứ không nên có.
 *
 * @returns {{ok:boolean, ten:string|null, loi:string|null, revision:number|null}}
 */
function saoLuuNgay() {
  var kq = { ok: false, ten: null, loi: null, revision: null };

  var phien = layPhien();
  if (phien.loi)      { kq.loi = phien.loi; return kq; }
  if (!phien.docDuoc) {
    kq.loi = 'Bạn chưa được cấp quyền xem file dữ liệu.';
    return kq;
  }

  var cay;
  try {
    cay = JSON.parse(DriveApp.getFileById(maGiaPhaDangChon_()).getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    kq.loi = 'Không đọc được bản đang nằm trên Drive: ' + e.message;
    return kq;
  }

  var ten = saoLuuNeuDenHan_(cay, true);
  if (!laTenFileSaoLuu_(ten)) {
    kq.loi = giaiThichSaoLuuHong_(ten);
    return kq;
  }

  kq.ok       = true;
  kq.ten      = ten;
  kq.revision = soRevision_(cay);
  return kq;
}

/**
 * Mở MỘT bản sao lưu ra xem có gì bên trong, KHÔNG ghi gì cả.
 *
 * Đây là bước đứng giữa "chọn một dòng" và "khôi phục", và nó bắt buộc phải
 * có: tên file chỉ nói ngày giờ và số revision, mà thứ người dùng cần biết
 * trước khi ghi đè là *bản ấy có bao nhiêu người*. Bản sao lưu tuần trước có
 * 57 người trong khi bản đang chạy có 59 — hai con số ấy đặt cạnh nhau nói ra
 * cái giá của việc khôi phục, còn cái tên file thì không.
 *
 * @param {string} fileId  phải là file NẰM TRONG thư mục Sao_luu
 */
function xemBanSaoLuu(fileId) {
  var kq = { ok: false, loi: null, ten: null, tomTat: null, hienTai: null };

  var doc = docBanSaoLuu_(fileId);
  if (doc.loi) { kq.loi = doc.loi; return kq; }

  kq.ten    = doc.ten;
  kq.tomTat = tomTatCay_(doc.cay);

  try {
    var cayNay = JSON.parse(
      DriveApp.getFileById(maGiaPhaDangChon_()).getBlob().getDataAsString('UTF-8'));
    kq.hienTai = tomTatCay_(cayNay);
  } catch (e) {
    kq.hienTai = null;   // không đọc được bản hiện tại thì thôi, đừng ngã cả hàm
  }

  kq.ok = true;
  return kq;
}

/**
 * KHÔI PHỤC — ghi nội dung một bản sao lưu đè lên file gia phả đang dùng.
 *
 * Trình tự bắt buộc, KHÔNG được đảo:
 *   1. Quyền sửa — không có thì từ chối ngay
 *   2. Đọc bản sao lưu, và bắt nó nằm TRONG thư mục Sao_luu
 *   3. Rà soát bản sao lưu bằng đúng phép rà của đường ghi thường
 *   4. Khoá, đọc bản hiện tại, so dấu vân tay
 *   5. SAO LƯU BẢN HIỆN TẠI — điều kiện, không phải thứ đi kèm
 *   6. Dựng cây mới (hàm thuần), rồi ghi
 *
 * ⚠ ĐÂY LÀ ĐƯỜNG GHI THỨ HAI ĐƯỢC PHÉP LÀM SỐ BẢN GHI ÍT ĐI — đường thứ nhất
 * là *Dọn thùng rác*. Nó KHÔNG đi qua `luuCay`, và điều đó phải nói thẳng chứ
 * không giấu trong mã: `luuCay` chặn mọi lần ghi làm số bản ghi giảm, mà khôi
 * phục thì gần như luôn giảm — đó chính là việc nó làm. Bốn chốt chặn thay
 * cho phép kiểm ấy:
 *
 *   · file phải nằm trong thư mục Sao_luu — không nhận một fileId bất kỳ;
 *   · nội dung phải qua `raSoatTruocKhiGhi_` như mọi lần ghi khác;
 *   · phải cất được bản hiện tại trước, không cất được thì KHÔNG khôi phục;
 *   · `changeLog` giữ bản DÀI HƠN, không bao giờ ngắn đi.
 *
 * ⚠ VÀ NÓ KHÔNG ĐI QUA `luuCay` NÊN CŨNG KHÔNG ĐƯỢC HƯỞNG PHÉP RÀ NGHIỆP VỤ
 * của trình duyệt. Không sao: thứ đang ghi vào là một bản CHÍNH APP NÀY từng
 * ghi ra, nó đã qua đủ phép rà một lần rồi.
 *
 * @param {string} fileId          bản sao lưu muốn quay về
 * @param {string} vanTayDaBiet    dấu vân tay trình duyệt nhận ở lần đọc gần nhất
 */
function khoiPhucSaoLuu(fileId, vanTayDaBiet) {
  var kq = {
    ok: false, lyDo: null, loi: null,
    saoLuu: 'khong-chay', revision: null, headRevisionId: null,
    tomTatTruoc: null, tomTatSau: null,
  };

  // --- 1. QUYỀN -----------------------------------------------------------
  var phien = layPhien();
  if (phien.loi) {
    kq.lyDo = 'caidat'; kq.loi = phien.loi; return kq;
  }
  if (!phien.suaDuoc) {
    kq.lyDo = 'khongcoquyen';
    kq.loi  = 'Bạn chỉ có quyền xem gia phả, không khôi phục được. ' +
              'Việc này phải do ' + NGUOI_QUAN_LY + ' làm.';
    return kq;
  }

  // --- 2. ĐỌC BẢN SAO LƯU -------------------------------------------------
  var doc = docBanSaoLuu_(fileId);
  if (doc.loi) {
    kq.lyDo = 'khongdocduoc'; kq.loi = doc.loi; return kq;
  }

  // --- 3. RÀ SOÁT ---------------------------------------------------------
  var loiRaSoat = raSoatTruocKhiGhi_(doc.cay);
  if (loiRaSoat) {
    kq.lyDo = 'dulieuhong';
    kq.loi  = 'Bản sao lưu "' + doc.ten + '" không dùng được: ' + loiRaSoat;
    return kq;
  }

  // --- 4. KHOÁ VÀ VÂN TAY -------------------------------------------------
  var khoa = LockService.getScriptLock();
  try {
    khoa.waitLock(10000);
  } catch (e) {
    kq.lyDo = 'khoaban';
    kq.loi  = 'Có người khác đang lưu cùng lúc. Chờ vài giây rồi thử lại.';
    return kq;
  }

  try {
    var file, cayCu;
    try {
      file  = DriveApp.getFileById(maGiaPhaDangChon_());
      cayCu = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    } catch (e) {
      kq.lyDo = 'khongdocduoc';
      kq.loi  = 'Không đọc được bản đang nằm trên Drive nên chưa dám ghi đè: ' +
                e.message;
      return kq;
    }

    // Cùng lý lẽ với `luuCay`: người khác vừa sửa mà mình ghi đè bằng một bản
    // cũ thì thay đổi của họ mất không dấu vết. Khôi phục là việc cố ý, nhưng
    // cố ý đè lên bản của CHÍNH MÌNH, không phải của người khác.
    var vanTayHienTai = dauVanTay_(cayCu, file);
    if (String(vanTayDaBiet || '') !== vanTayHienTai) {
      kq.lyDo           = 'xungdot';
      kq.headRevisionId = vanTayHienTai;
      kq.loi            = 'Bản trên Drive đã đổi kể từ lúc bạn mở app' +
                          moTaAiVuaSua_(cayCu) + '. CHƯA khôi phục gì cả. ' +
                          'Tải lại trang để nhìn bản mới rồi quyết định.';
      return kq;
    }

    // Bản sao lưu này có phải của CHÍNH gia phả đang mở không?
    //
    // Trước việc 9 câu hỏi ấy thừa — cả hệ thống chỉ có một gia phả. Nay có
    // nhiều cây, và tên file sao lưu (`giapha-sao-luu_<ngày>_rev<n>.json`)
    // KHÔNG mang tên gia phả nào, nên nhìn danh sách không phân biệt được cây
    // nào với cây nào — mà khôi phục nhầm là ghi đè cả gia phả này bằng gia
    // phả khác.
    //
    // ⚠ Từ 28/08/2026 thư mục `Sao_luu` được suy từ chính thư mục mẹ của file
    // đang mở, nên hai cây KHÔNG còn dùng chung thư mục được nữa và phép so
    // này lẽ ra không bao giờ kêu. Giữ nguyên vì đúng một lý do: nó là thứ
    // duy nhất còn gác được ca thư mục `Sao_luu` bị người ta dọn tay trên
    // Drive — chép một bản của cây khác vào đó là xong.
    var tenCu  = String((cayCu.tree  && cayCu.tree.name)  || '');
    var tenLuu = String((doc.cay.tree && doc.cay.tree.name) || '');
    if (tenCu !== '' && tenLuu !== '' && tenCu !== tenLuu) {
      kq.lyDo = 'khaccaypha';
      kq.loi  = 'CHƯA khôi phục gì cả. Bản sao lưu "' + doc.ten + '" là của gia ' +
                'phả "' + tenLuu + '", còn app đang mở gia phả "' + tenCu + '". ' +
                'Hai cây khác nhau thì bản sao lưu phải nằm ở hai thư mục ' +
                'Sao_luu khác nhau — nhiều khả năng có bản bị chép nhầm chỗ ' +
                'trên Google Drive.';
      return kq;
    }

    // --- 5. CẤT BẢN HIỆN TẠI — ĐIỀU KIỆN ---------------------------------
    // Giống hệt lệnh dọn thùng rác, và vì đúng một lý do: sau dòng ghi ở dưới,
    // bản hiện tại là thứ KHÔNG còn ở đâu nữa. Không cất được nó thì thà không
    // khôi phục — người dùng còn nguyên hai lựa chọn, thay vì mất một.
    kq.saoLuu = saoLuuNeuDenHan_(cayCu, true);
    if (!laTenFileSaoLuu_(kq.saoLuu)) {
      kq.lyDo = 'khongsaoluuduoc';
      kq.loi  = 'CHƯA khôi phục gì cả. Máy chủ không cất được bản ĐANG DÙNG ' +
                'trước khi ghi đè (' + kq.saoLuu + '), mà đó là đường lùi duy ' +
                'nhất nếu bạn đổi ý. ' + giaiThichSaoLuuHong_(kq.saoLuu);
      return kq;
    }

    // --- 6. DỰNG CÂY MỚI RỒI GHI ------------------------------------------
    var luc    = bayGio_();
    var cayMoi = dungCayKhoiPhuc_(cayCu, doc.cay, doc.ten, luc, phien.email);

    try {
      file.setContent(JSON.stringify(cayMoi, null, 2));
    } catch (e) {
      kq.lyDo = 'loighi';
      kq.loi  = 'Drive từ chối ghi file: ' + e.message;
      return kq;
    }

    kq.headRevisionId = dauVanTay_(cayMoi, DriveApp.getFileById(maGiaPhaDangChon_()));
    kq.revision       = cayMoi.tree.revision;
    kq.tomTatTruoc    = tomTatCay_(cayCu);
    kq.tomTatSau      = tomTatCay_(cayMoi);
    kq.ok             = true;
    return kq;

  } finally {
    khoa.releaseLock();
  }
}

/**
 * Đọc một file trong thư mục Sao_luu. Trả `{ten, cay, loi}`.
 *
 * ⚠ PHẢI DUYỆT THƯ MỤC, không được `getFileById` thẳng. Trình duyệt gửi lên
 * `fileId`, mà mọi thứ trình duyệt gửi lên đều là lời khai — cùng lý lẽ đã
 * dùng cho quyền ở `luuCay`. Nhận thẳng mã file nghĩa là mở một đường ghi đè
 * gia phả bằng NỘI DUNG BẤT KỲ nào chủ script đọc được trên Drive. Duyệt thư
 * mục thì thứ ghi vào chỉ có thể là thứ chính app này từng ghi ra.
 */
function docBanSaoLuu_(fileId) {
  var kq = { ten: null, cay: null, loi: null };
  var ma = String(fileId || '');
  if (!ma) { kq.loi = 'Chưa chọn bản sao lưu nào.'; return kq; }

  var maLuu = maThuMucSaoLuu_();
  if (!maLuu) {
    kq.loi = 'Không tìm thấy thư mục Sao_luu của gia phả đang mở.';
    return kq;
  }

  var f = null;
  try {
    var lap = DriveApp.getFolderById(maLuu).getFiles();
    while (lap.hasNext()) {
      var x = lap.next();
      if (x.getId() === ma) { f = x; break; }
    }
  } catch (e) {
    kq.loi = 'Không mở được thư mục Sao_luu. Thư mục ấy chỉ chia sẻ cho ' +
             NGUOI_QUAN_LY + '. (' + e.message + ')';
    return kq;
  }

  if (!f) {
    kq.loi = 'Không tìm thấy bản sao lưu ấy trong thư mục Sao_luu. Có thể nó ' +
             'vừa bị dọn đi. Tải lại danh sách rồi chọn bản khác.';
    return kq;
  }

  kq.ten = f.getName();
  try {
    kq.cay = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    kq.loi = 'Bản sao lưu "' + kq.ten + '" không đọc được — file hỏng hoặc ' +
             'không phải JSON. (' + e.message + ')';
  }
  return kq;
}

// --- BỐN HÀM THUẦN, cắt ra chạy được ngoài Apps Script -------------------
//
// `kiem-sao-luu.mjs` cắt đúng bốn hàm này ra khỏi file thật rồi chạy trong
// Node — cùng cách `kiem-don-rac.mjs` gác `raSoatDonRac_`. Chúng là phần duy
// nhất của đường khôi phục có thể sai lặng lẽ: DriveApp hỏng thì ném lỗi, còn
// một con số revision tính sai thì ghi xuống êm ru.

/**
 * Cây sẽ được ghi khi khôi phục. HÀM THUẦN — không đụng Drive, không đọc giờ.
 *
 * Ba điều nó quyết, và cả ba đều có thể làm sai theo hướng ngược lại:
 *
 * 1. **`revision` LỚN HƠN CẢ HAI BÊN.** Bản sao lưu mang số cũ (rev 12), bản
 *    đang chạy mang số mới (rev 20). Chép nguyên rev 12 xuống thì mọi trình
 *    duyệt đang mở sẽ thấy số revision TỤT, và cơ chế chống ghi đè đọc số ấy.
 *    Nên số mới là 21 — cao hơn bản cao nhất từng có.
 * 2. **`changeLog` giữ mảng DÀI HƠN.** Nhật ký kể chuyện đã xảy ra; khôi phục
 *    không làm chuyện đã xảy ra biến mất. Bản đang chạy hầu như luôn dài hơn,
 *    nhưng đừng giả định — cứ so độ dài rồi lấy.
 * 3. **Mục nhật ký ghi rõ TÊN FILE nguồn.** Không có nó thì sáu tháng sau
 *    không ai trả lời được câu *"hôm ấy quay về bản nào"*.
 */
function dungCayKhoiPhuc_(cayHienTai, cayKhoiPhuc, tenFile, luc, email) {
  var cay = JSON.parse(JSON.stringify(cayKhoiPhuc));

  if (!cay.tree || typeof cay.tree !== 'object') cay.tree = {};
  cay.tree.revision  = revisionKhoiPhuc_(cayHienTai, cayKhoiPhuc);
  cay.tree.updatedAt = luc;
  cay.tree.updatedBy = email;

  cay.changeLog = changeLogKhoiPhuc_(cayHienTai, cayKhoiPhuc);
  cay.changeLog.push({
    ts:     luc,
    by:     email,
    action: 'restore',
    target: String(tenFile || ''),
    note:   'Khôi phục toàn bộ gia phả từ bản sao lưu ' + tenFile + '.',
    diff:   {
      'tree.revision': [String(soRevision_(cayHienTai)),
                        String(cay.tree.revision)],
      'persons':       [String(demBanGhi_(cayHienTai).persons),
                        String(demBanGhi_(cay).persons)],
      'unions':        [String(demBanGhi_(cayHienTai).unions),
                        String(demBanGhi_(cay).unions)],
    },
  });

  return cay;
}

/** Số revision sau khi khôi phục: cao hơn cả bản đang chạy lẫn bản quay về. */
function revisionKhoiPhuc_(cayHienTai, cayKhoiPhuc) {
  var a = soRevision_(cayHienTai);
  var b = soRevision_(cayKhoiPhuc);
  return (a > b ? a : b) + 1;
}

/** Nhật ký sau khi khôi phục: mảng dài hơn trong hai bản, không bao giờ ngắn đi. */
function changeLogKhoiPhuc_(cayHienTai, cayKhoiPhuc) {
  var a = (cayHienTai  && Array.isArray(cayHienTai.changeLog))  ? cayHienTai.changeLog  : [];
  var b = (cayKhoiPhuc && Array.isArray(cayKhoiPhuc.changeLog)) ? cayKhoiPhuc.changeLog : [];
  var giu = (a.length >= b.length) ? a : b;
  return JSON.parse(JSON.stringify(giu));
}

/**
 * Tóm tắt một cây để hiện lên màn hình. Đếm CẢ bản ghi mang cờ `deleted` và
 * kể riêng ra: hai bản cùng "59 người" mà một bản có 4 người trong thùng rác
 * là hai thứ khác nhau, và người sắp ghi đè cần thấy điều đó.
 */
function tomTatCay_(cay) {
  var d = { persons: 0, unions: 0, media: 0, daXoa: 0,
            changeLog: 0, revision: 0, updatedAt: '', updatedBy: '' };
  if (!cay || typeof cay !== 'object') return d;

  var ds = ['persons', 'unions', 'media'];
  for (var k = 0; k < ds.length; k++) {
    var m = cay[ds[k]];
    if (!Array.isArray(m)) continue;
    d[ds[k]] = m.length;
    for (var i = 0; i < m.length; i++) if (m[i] && m[i].deleted === true) d.daXoa++;
  }

  d.changeLog = Array.isArray(cay.changeLog) ? cay.changeLog.length : 0;
  d.revision  = soRevision_(cay);
  d.updatedAt = String((cay.tree && cay.tree.updatedAt) || '');
  d.updatedBy = String((cay.tree && cay.tree.updatedBy) || '');
  return d;
}

/** Số revision đọc từ tên file sao lưu (`…_rev123.json`). Không có thì null. */
function revTuTenSaoLuu_(ten) {
  var m = String(ten || '').match(/_rev(\d+)\./);
  return m ? Number(m[1]) : null;
}

/** Múi giờ của script, luôn có giá trị dùng được. */
function muiGio_() {
  var mui = 'Asia/Ho_Chi_Minh';
  try { mui = Session.getScriptTimeZone() || mui; } catch (e) {}
  return mui;
}

/**
 * Bốn chữ trạng thái của `saoLuuNeuDenHan_` dịch ra câu người đọc hiểu được.
 * Ba trong bốn chữ ấy là chuyện CÀI ĐẶT, không phải chuyện hỏng hóc — nói
 * đúng cái nào thì người dùng biết phải làm gì tiếp.
 */
function giaiThichSaoLuuHong_(chu) {
  if (chu === 'tat') {
    return 'Sao lưu đang TẮT trong Config.gs (SAO_LUU.bat = false).';
  }
  if (chu === 'khong-cau-hinh') {
    return 'Chưa điền THU_MUC_SAO_LUU_ID trong Config.gs.';
  }
  if (chu === 'loi') {
    return 'Drive từ chối tạo file trong thư mục Sao_luu. Thư mục ấy chỉ ' +
           'chia sẻ cho ' + NGUOI_QUAN_LY + ', nên chỉ người ấy sao lưu được.';
  }
  return 'Máy chủ trả về "' + chu + '".';
}

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
 * @param {object}  cayCu
 * @param {boolean} [batBuoc]  bỏ qua hạn giờ — lệnh dọn thùng rác cần cái này
 * @returns {string} TÊN FILE vừa cất, hoặc
 *                   'chua-den-han' · 'tat' · 'khong-cau-hinh' · 'loi'
 *
 * ⚠ Trả về TÊN FILE chứ không phải chữ 'da-luu': màn hình dọn rác phải nói ra
 * được *"bản sao lưu trước khi xoá tên là gì"*, không thì câu "đã sao lưu" chỉ
 * là một lời hứa không tra lại được. Nơi duy nhất đọc giá trị này là dòng
 * `console.log` của `repo.js` và màn hình ấy — không chỗ nào so bằng chuỗi.
 */
function saoLuuNeuDenHan_(cayCu, batBuoc) {
  if (!SAO_LUU || !SAO_LUU.bat) return 'tat';
  var maLuu = maThuMucSaoLuu_();
  if (!maLuu) return 'khong-cau-hinh';

  try {
    var thuMuc = DriveApp.getFolderById(maLuu);
    var ds     = dsSaoLuuMoiTruoc_(thuMuc);

    if (ds.length && batBuoc !== true) {
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
    return ten;
  } catch (e) {
    return 'loi';
  }
}

/**
 * `saoLuuNeuDenHan_` có cất được file thật không.
 *
 * Hàm ấy trả về TÊN FILE khi thành công, và một trong bốn chữ báo trạng thái
 * khi không. Kể tên cả bốn chữ ra đây chứ không đoán bằng dấu chấm hay bằng độ
 * dài: thêm một trạng thái mới mà quên sửa chỗ này thì nó bị nhận nhầm thành
 * một cái tên file, và lệnh dọn rác chạy tiếp trong lúc không có bản lùi nào.
 */
function laTenFileSaoLuu_(kq) {
  var chu = String(kq || '');
  return chu !== '' &&
         chu !== 'tat' && chu !== 'loi' &&
         chu !== 'chua-den-han' && chu !== 'khong-cau-hinh' &&
         chu !== 'khong-chay';
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

/**
 * TẠO MỘT BỘ DỮ LIỆU MỚI, RỖNG. Chạy tay một lần, từ trình soạn thảo
 * Apps Script — KHÔNG gọi được từ trình duyệt, và cố ý như vậy: hàm này
 * sinh ra thư mục trên Drive, không phải việc mà một cú bấm nhầm nên làm được.
 *
 * Nó tạo BA thứ, không phải một:
 *
 *   Gia_pha_<tên họ>/
 *     ├── giapha-<tên họ>.json     ← file dữ liệu rỗng, đúng lược đồ V04
 *     ├── Anh/                      ← ảnh của riêng gia phả này
 *     └── Sao_luu/                  ← bản sao lưu của riêng gia phả này
 *
 * ⚠ HAI THƯ MỤC KIA KHÔNG PHẢI CHO ĐỦ BỘ — chúng là chốt chặn.
 * Tên file sao lưu là `giapha-sao-luu_<ngày>_rev<n>.json`, KHÔNG mang tên
 * gia phả nào. Hai gia phả dùng chung một thư mục Sao_luu thì bản của cây này
 * nằm lẫn với bản của cây kia, `layDanhSachSaoLuu` kể ra cả hai loại, và
 * `khoiPhucSaoLuu` sẽ ghi đè gia phả này bằng nội dung gia phả khác — mất
 * trắng, không có đường lùi. Mỗi gia phả một thư mục riêng thì chuyện ấy
 * không xảy ra được nữa.
 *
 * KHÔNG đụng một chữ nào vào file dữ liệu đang dùng, và không đụng gia phả nào
 * đã có sẵn.
 *
 * ⚠ **THƯ MỤC ĐÃ CÓ THÌ DÙNG LẠI, không tạo chồng.** Chủ dự án thường dựng sẵn
 * thư mục trên Drive trước khi nghĩ tới việc chạy hàm này — thư mục
 * `Gia_pha_Le_Van_Trac` đã nằm đó với một thư mục `Anh` bên trong là ca thật
 * ngày 28/08/2026. Bản đầu của hàm gặp thư mục cùng tên thì DỪNG, tức không
 * điền được vào chỗ người ta đã chuẩn bị; mà nếu tên lệch một chữ hoa thì nó
 * lại mọc ra thư mục thứ hai trông na ná — đúng cái lộn xộn nó sinh ra để
 * tránh. Nay nó chỉ dừng khi bên trong **đã có sẵn một file `giapha-*.json`**,
 * tức gia phả ấy thật sự tồn tại rồi.
 *
 * @param {string} tenGiaPha  tên gia phả, gõ thẳng khi chạy. Tên sao thì thư
 *        mục vậy: `'Le Van Trac'` → thư mục `Gia_pha_Le_Van_Trac`, file
 *        `giapha-le-van-trac.json`, và `tree.name` giữ nguyên câu bạn gõ.
 *        Bỏ trống thì lấy `TEN_HO` trong `Config.gs`.
 *
 * Cách dùng: sửa một dòng trong `chayTaoDbMoi()` ngay dưới đây rồi bấm Chạy.
 */
function taoFileDuLieuMoi(tenGiaPha) {
  var ten    = String(tenGiaPha || TEN_HO || '').trim() || 'Gia pha';
  var tenThu = 'Gia_pha_' + slugThuMuc_(ten);
  var tenFile = 'giapha-' + slugFile_(ten) + '.json';
  var goc    = DriveApp.getRootFolder();

  // Dùng lại thư mục cùng tên nếu có. Chỉ DỪNG khi trong đó đã có một file
  // gia phả — lúc ấy chạy tiếp là dựng cây thứ hai trong cùng một chỗ, và
  // `Sao_luu` chung sẽ trộn bản của hai cây, đúng thứ hàm này chống lại.
  var thuMuc = null;
  var lapT = goc.getFoldersByName(tenThu);
  if (lapT.hasNext()) {
    thuMuc = lapT.next();
    var daCo = daCoFileGiaPha_(thuMuc);
    if (daCo) {
      Logger.log('DỪNG — thư mục "' + tenThu + '" đã chứa sẵn một gia phả:\n' +
                 '  ' + daCo + '\n\n' +
                 'Chưa tạo gì cả, và cũng chưa đụng gì vào file ấy. Muốn dựng ' +
                 'một gia phả KHÁC thì gõ một cái tên khác vào chayTaoDbMoi().');
      return;
    }
    Logger.log('(dùng lại thư mục "' + tenThu + '" đã có sẵn trên Drive)');
  } else {
    thuMuc = goc.createFolder(tenThu);
  }

  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { email = ''; }

  var thuAnh  = thuMucCon_(thuMuc, 'Anh');
  var thuLuu  = thuMucCon_(thuMuc, 'Sao_luu');
  var luc     = bayGio_();

  var cay = {
    format:  'giapha-json',
    version: 1,
    tree: {
      id:            'T0001',
      name:          ten,
      rootPersonId:  null,          // chưa có ai; app hỏi khi thêm người đầu tiên
      photoFolderId: thuAnh.getId(),
      note:          '',
      createdAt:     luc,
      updatedAt:     luc,
      updatedBy:     email,
      revision:      0,
    },
    persons:   [],
    unions:    [],
    media:     [],
    sources:   [],
    changeLog: [
      mucNhatKy_({ action: 'create', target: 'T0001',
                   note: 'Tạo file gia phả mới, chưa có người nào.' }, luc, email),
    ],
  };

  var file = thuMuc.createFile(
    tenFile,
    JSON.stringify(cay, null, 2),
    'application/json'
  );

  Logger.log(
    'ĐÃ TẠO XONG. Chép ba dòng dưới đây đè lên ba dòng cũ trong Config.gs:\n\n' +
    "var FILE_ID            = '" + file.getId()   + "';\n" +
    "var THU_MUC_ANH_ID     = '" + thuAnh.getId() + "';\n" +
    "var THU_MUC_SAO_LUU_ID = '" + thuLuu.getId() + "';\n\n" +
    '--- Rồi làm ba việc này, theo đúng thứ tự ---\n' +
    '1. Lưu Config.gs, chạy hàm kiemTraConfig() — phải thấy đủ ba dòng ĐẠT.\n' +
    '2. Triển khai → Quản lý các bản triển khai → bút chì →\n' +
    '   Phiên bản: "Phiên bản mới" → Triển khai.\n' +
    '3. Trên Drive, chia sẻ HAI THỨ, và chia sẻ TỪNG CÁI MỘT:\n' +
    '     · file "' + tenFile + '"  — Người xem, hoặc Người chỉnh sửa\n' +
    '     · thư mục "Anh"                     — Người xem là đủ\n' +
    '   ⚠ TUYỆT ĐỐI ĐỪNG chia sẻ thư mục mẹ "' + tenThu + '".\n' +
    '     Google Drive cho quyền KẾ THỪA xuống mọi thứ bên trong, và không gỡ\n' +
    '     lại được ở thư mục con — chia sẻ thư mục mẹ là chia sẻ luôn\n' +
    '     "Sao_luu", tức trao cho người khác quyền ghi đè cả gia phả.\n' +
    '   ⚠ KHÔNG chia sẻ "Sao_luu" cho ai cả. Khôi phục là việc ghi đè toàn bộ,\n' +
    '     nó phải nằm trong tay đúng một người.\n' +
    '   ⚠ Quên chia sẻ thư mục "Anh" thì người trong họ VẪN xem được cây,\n' +
    '     nhưng không thấy một tấm ảnh nào — mà app không báo lỗi gì cả.\n\n' +
    '--- Cho tới lúc bạn làm xong bước 2, app VẪN đang mở file CŨ ---\n' +
    'Hàm này không đụng gì vào file dữ liệu đang dùng.\n\n' +
    'Thư mục vừa tạo : ' + tenThu + '  ·  ' + thuMuc.getId() + '\n' +
    'File dữ liệu    : ' + file.getName()
  );
}

/**
 * ĐÂY LÀ CHỖ BẠN SỬA. Gõ tên gia phả mới vào trong ngoặc rồi bấm Chạy.
 *
 * Sửa ở đây chứ không sửa `Config.gs`: `TEN_HO` còn hiện trên tiêu đề app và
 * màn hình Cài đặt, nên đổi nó đi để tạo một gia phả khác rồi quên đổi lại là
 * đổi tên cả app — mà không có gì báo cho bạn biết.
 */
function chayTaoDbMoi() {
  taoFileDuLieuMoi('Le Van Trac');
}

/** Tên file gia phả đầu tiên tìm thấy trong một thư mục, hoặc null. */
function daCoFileGiaPha_(thuMuc) {
  try {
    var lap = thuMuc.getFiles();
    while (lap.hasNext()) {
      var f = lap.next();
      if (laTenFileGiaPha_(f.getName())) return f.getName();
    }
  } catch (e) {}
  return null;
}

/** Thư mục con theo tên: có thì dùng lại, chưa có thì tạo. */
function thuMucCon_(thuMuc, ten) {
  var lap = thuMuc.getFoldersByName(ten);
  return lap.hasNext() ? lap.next() : thuMuc.createFolder(ten);
}

/**
 * Tên này có phải tên một file GIA PHẢ không — và quan trọng hơn: có phải một
 * bản SAO LƯU không.
 *
 * Đo được ngày 28/08/2026 trên Drive thật: tài khoản chủ dự án có **8** file
 * khớp `giapha-*`, mà **6** trong số đó là bản sao lưu. Không lọc thì màn hình
 * chọn gia phả bày ra sáu cái tên na ná nhau, và bấm nhầm một cái là mở một
 * bản chụp cũ tưởng là gia phả đang dùng.
 *
 * ⚠ KHÔNG phân biệt được bằng NỘI DUNG: bản sao lưu là một cây hoàn toàn hợp
 * lệ, `format` y hệt. Tên file là dấu hiệu duy nhất, nên khuôn tên
 * `giapha-sao-luu_…` mà `saoLuuNeuDenHan_` đặt là một **hợp đồng**, không phải
 * chuyện thẩm mỹ — đổi nó thì phải đổi cả hàm này.
 */
function laTenFileGiaPha_(ten) {
  var t = String(ten || '');
  if (t.slice(-5) !== '.json') return false;
  if (t.indexOf('giapha-') !== 0) return false;
  if (t.indexOf('giapha-sao-luu') === 0) return false;
  return true;
}

/**
 * Tên gia phả → tên THƯ MỤC: bỏ dấu, giữ hoa đầu từ, nối bằng gạch dưới.
 * `'Le Van Trac'` → `'Le_Van_Trac'`, để thành `Gia_pha_Le_Van_Trac`.
 *
 * Khuôn này chép theo đúng cái chủ dự án đã đặt tay trên Drive từ trước
 * (`Gia_pha_Nguyen_Trong_Bac`). Hàm sinh ra khuôn khác thì tên bác đặt và tên
 * hàm đặt không bao giờ trùng nhau, và mỗi lần chạy lại mọc thêm một thư mục
 * na ná bên cạnh cái cũ.
 */
function slugThuMuc_(ten) {
  var chu = boDau_(String(ten || 'Gia pha'));
  chu = chu.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return chu || 'Gia_pha';
}

/**
 * Tên gia phả → mảnh chữ đặt được tên FILE: bỏ dấu, chữ thường, gạch nối.
 * `'Le Van Trac'` → `'le-van-trac'`, để thành `giapha-le-van-trac.json`.
 */
function slugFile_(ten) {
  var chu = boDau_(String(ten || 'gia-pha')).toLowerCase();
  chu = chu.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return chu || 'gia-pha';
}

/** Giữ nguyên tên cũ cho bài kiểm b51 và mọi nơi đang gọi. */
function slugTenHo_(ten) {
  return slugFile_(ten);
}

/**
 * Bỏ dấu tiếng Việt, GIỮ NGUYÊN hoa thường.
 *
 * `normalize('NFD')` không có trong Apps Script (máy chạy ES5 cũ), nên bảng
 * tra tay là đường duy nhất. Bảng phải có CẢ hai kiểu chữ — bản đầu chỉ có
 * chữ thường và hạ cả câu xuống trước khi tra, nên nó không dùng được cho tên
 * thư mục, nơi hoa đầu từ là thứ phải giữ.
 */
function boDau_(ten) {
  var chu = String(ten || '');
  var bang = [
    ['[àáạảãâầấậẩẫăằắặẳẵ]', 'a'],
    ['[èéẹẻẽêềếệểễ]',       'e'],
    ['[ìíịỉĩ]',             'i'],
    ['[òóọỏõôồốộổỗơờớợởỡ]', 'o'],
    ['[ùúụủũưừứựửữ]',       'u'],
    ['[ỳýỵỷỹ]',             'y'],
    ['đ',                   'd'],
    ['[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]', 'A'],
    ['[ÈÉẸẺẼÊỀẾỆỂỄ]',       'E'],
    ['[ÌÍỊỈĨ]',             'I'],
    ['[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]', 'O'],
    ['[ÙÚỤỦŨƯỪỨỰỬỮ]',       'U'],
    ['[ỲÝỴỶỸ]',             'Y'],
    ['Đ',                   'D'],
  ];
  for (var i = 0; i < bang.length; i++) {
    chu = chu.replace(new RegExp(bang[i][0], 'g'), bang[i][1]);
  }
  return chu;
}

/**
 * Chạy tay để soi nhanh máy chủ đang thấy gì.
 * Kết quả hiện ở Nhật ký thực thi (Execution log).
 */
function trangThaiCaiDat() {
  Logger.log(JSON.stringify(layPhien(), null, 2));
}

// ============================================================
// 6. PHÉP THỬ TẠM — XOÁ SAU KHI CÓ CÂU TRẢ LỜI
// ============================================================

/**
 * PHÉP THỬ cho màn hình CHỌN GIA PHẢ (28/08/2026). Chỉ ĐỌC và IN, không ghi
 * gì, không sửa gì, không tạo gì. Chạy bao nhiêu lần cũng vô hại.
 *
 * Ba câu phải trả lời trước khi viết một dòng nào của màn hình chọn — và cả
 * ba đều KHÔNG đoán được, phải đo trên Drive thật:
 *
 *   1. `searchFolders` chạy dưới danh tính người truy cập có thấy thư mục
 *      NGƯỜI KHÁC CHIA SẺ cho họ không, hay chỉ thấy thư mục trong My Drive
 *      của chính họ? Nếu chỉ thấy của mình thì cả thiết kế "Drive tự lọc theo
 *      quyền" sụp, và phải quay lại kiểu khai danh sách bằng tay.
 *
 *   2. Người được chia sẻ thư mục `Gia_pha_X/` có duyệt được BÊN TRONG nó
 *      không — file JSON, thư mục `Anh`, thư mục `Sao_luu`?
 *
 *   3. Quyền có KẾ THỪA xuống thư mục con không? Nếu có thì `Sao_luu` nằm
 *      trong `Gia_pha_X/` bị chia sẻ theo, và luật "Sao_luu chỉ mình chủ dự
 *      án" của việc 9 là bất khả thi — phải đưa `Sao_luu` ra ngoài.
 *
 * CÁCH CHẠY — phải chạy HAI LẦN, bằng HAI tài khoản khác nhau:
 *   · lần 1: tài khoản chủ script (chạy thẳng trong trình soạn thảo này)
 *   · lần 2: một tài khoản chỉ được CHIA SẺ, không phải chủ
 * Chép cả hai bản Nhật ký thực thi ra rồi so. Chỗ hai bản khác nhau chính là
 * câu trả lời.
 */
function thuTimGiaPha() {
  var ra = [];
  var email = '';
  try { email = Session.getActiveUser().getEmail() || '(không đọc được)'; }
  catch (e) { email = '(không đọc được: ' + e.message + ')'; }

  ra.push('=== PHÉP THỬ TÌM GIA PHẢ ===');
  ra.push('Đang chạy bằng : ' + email);
  try {
    ra.push('My Drive gốc   : ' + DriveApp.getRootFolder().getName());
  } catch (e) {
    ra.push('My Drive gốc   : KHÔNG mở được — ' + e.message);
  }

  // --- A. TÌM THEO THƯ MỤC ------------------------------------------------
  ra.push('');
  ra.push('--- A. searchFolders("title contains Gia_pha_") ---');
  var soThuMuc = 0;
  try {
    var lapT = DriveApp.searchFolders(
      "title contains 'Gia_pha_' and trashed = false");
    while (lapT.hasNext()) {
      soThuMuc++;
      ra.push(moTaThuMucGiaPha_(lapT.next(), email));
    }
    if (soThuMuc === 0) {
      ra.push('  (không thấy thư mục nào — nếu tài khoản này ĐÃ được chia sẻ ' +
              'một thư mục Gia_pha_… thì đây chính là câu trả lời cho CÂU 1)');
    }
  } catch (e) {
    ra.push('  LỖI khi tìm: ' + e.message);
  }

  // --- B. TÌM THEO FILE, để so với A --------------------------------------
  // Hai đường có thể ra khác nhau: chia sẻ THẲNG file JSON mà không chia sẻ
  // thư mục thì A trống còn B có. Biết điều đó thì mới chọn được đường nào
  // làm đường chính của màn hình chọn.
  ra.push('');
  ra.push('--- B. searchFiles("title contains giapha-", .json) ---');
  var soFile = 0;
  try {
    var lapF = DriveApp.searchFiles(
      "title contains 'giapha-' and trashed = false");
    while (lapF.hasNext()) {
      var f = lapF.next();
      if (f.getName().slice(-5) !== '.json') continue;
      soFile++;
      ra.push('  · ' + f.getName() + '  ·  ' + f.getId());
      ra.push('      quyền của tôi trên file: ' + quyenTren_(f, email));
      ra.push('      thư mục cha           : ' + keTenCha_(f));
      ra.push('      là gia phả thật?      : ' + laGiaPha_(f));
    }
    if (soFile === 0) ra.push('  (không thấy file nào)');
  } catch (e) {
    ra.push('  LỖI khi tìm: ' + e.message);
  }

  // --- C. CẤU TRÚC ĐANG DÙNG THẬT -----------------------------------------
  // Ba ID trong Config.gs trỏ tới thứ chủ dự án tạo TAY từ trước việc 9, nên
  // chúng KHÔNG chắc nằm theo khuôn `Gia_pha_X/{json, Anh, Sao_luu}`. Màn hình
  // chọn phải tìm được cả gia phả đang chạy, không chỉ gia phả sinh ra từ
  // `taoFileDuLieuMoi()` — nếu không thì ngày bật nó lên, gia phả thật biến
  // mất khỏi danh sách.
  ra.push('');
  ra.push('--- C. Ba ID đang khai trong Config.gs nằm ở đâu ---');
  ra.push(moTaMaCauHinh_('FILE_ID (file dữ liệu)', FILE_ID, false));
  ra.push(moTaMaCauHinh_('THU_MUC_ANH_ID', THU_MUC_ANH_ID, true));
  ra.push(moTaMaCauHinh_('THU_MUC_SAO_LUU_ID', THU_MUC_SAO_LUU_ID, true));

  ra.push('');
  ra.push('=== TÓM TẮT: ' + soThuMuc + ' thư mục · ' + soFile + ' file ===');
  ra.push('Không ghi, không sửa, không tạo gì cả.');
  Logger.log(ra.join('\n'));
}

/** Một mã trong Config.gs trỏ tới đâu, và thứ ấy nằm trong thư mục nào. */
function moTaMaCauHinh_(nhan, ma, laThuMuc) {
  if (!ma || ma.indexOf('DAN_ID_') === 0) return '  · ' + nhan + ': chưa điền.';
  try {
    var x = laThuMuc ? DriveApp.getFolderById(ma) : DriveApp.getFileById(ma);
    var cha = [];
    var lap = x.getParents();
    while (lap.hasNext()) cha.push(lap.next().getName());
    return '  · ' + nhan + ': "' + x.getName() + '"' +
           '\n      nằm trong: ' + (cha.length ? cha.join(' · ') : '(gốc My Drive)');
  } catch (e) {
    return '  · ' + nhan + ': KHÔNG mở được — ' + e.message;
  }
}

/** Một thư mục gia phả: bên trong có gì, và mở được tới đâu. */
function moTaThuMucGiaPha_(thuMuc, email) {
  var d = [];
  d.push('  · ' + thuMuc.getName() + '  ·  ' + thuMuc.getId());

  try {
    d.push('      chủ sở hữu: ' + thuMuc.getOwner().getEmail());
  } catch (e) {
    d.push('      chủ sở hữu: không đọc được (' + e.message + ')');
  }

  // CÂU 2: duyệt được bên trong không?
  try {
    var ds = [];
    var lap = thuMuc.getFiles();
    while (lap.hasNext()) ds.push(lap.next().getName());
    d.push('      file bên trong: ' + (ds.length ? ds.join(' · ') : '(không có)'));
  } catch (e) {
    d.push('      file bên trong: KHÔNG duyệt được — ' + e.message);
  }

  var con = { Anh: null, Sao_luu: null };
  try {
    var lapC = thuMuc.getFolders();
    while (lapC.hasNext()) {
      var c = lapC.next();
      if (con.hasOwnProperty(c.getName())) con[c.getName()] = c;
    }
  } catch (e) {
    d.push('      thư mục con: KHÔNG duyệt được — ' + e.message);
  }

  d.push('      thư mục Anh    : ' + (con.Anh ? 'CÓ · ' + con.Anh.getId() : 'không thấy'));

  // CÂU 3 — câu đắt nhất. Tài khoản KHÔNG phải chủ mà đếm được file trong
  // Sao_luu thì quyền ĐÃ kế thừa xuống, và luật "Sao_luu chỉ mình chủ dự án"
  // của việc 9 là bất khả thi ở dạng hiện nay.
  if (!con.Sao_luu) {
    d.push('      thư mục Sao_luu: không thấy  ← nếu đây là tài khoản KHÁCH ' +
           'thì TỐT: quyền không kế thừa xuống');
  } else {
    var n = -1;
    try {
      n = 0;
      var lapS = con.Sao_luu.getFiles();
      while (lapS.hasNext()) { lapS.next(); n++; }
    } catch (e) {
      n = -1;
    }
    d.push('      thư mục Sao_luu: CÓ · ' + con.Sao_luu.getId() +
           ' · đếm được ' + (n < 0 ? 'KHÔNG duyệt được' : n + ' bản') +
           '  ← tài khoản KHÁCH mà đếm được nghĩa là quyền ĐÃ KẾ THỪA');
  }

  return d.join('\n');
}

/** Quyền của một email trên một file, hoặc lý do không hỏi được. */
function quyenTren_(file, email) {
  try {
    return String(file.getAccess(email));
  } catch (e) {
    // Người chỉ có quyền xem thường KHÔNG được đọc danh sách chia sẻ — ném
    // lỗi ở đây là chuyện bình thường, không phải sự cố. Cùng ca đã gặp ở
    // `layPhien`.
    return 'không hỏi được (' + e.message + ')';
  }
}

/** Tên các thư mục cha, hoặc lời báo là không thấy cha nào. */
function keTenCha_(file) {
  try {
    var ten = [];
    var lap = file.getParents();
    while (lap.hasNext()) ten.push(lap.next().getName());
    return ten.length ? ten.join(' · ') : '(không thấy cha nào — file được ' +
                                          'chia sẻ thẳng, không qua thư mục)';
  } catch (e) {
    return 'không đọc được (' + e.message + ')';
  }
}

/** Đọc thử vài trăm chữ đầu xem có đúng là file của app này không. */
function laGiaPha_(file) {
  try {
    var chu = file.getBlob().getDataAsString('UTF-8').slice(0, 400);
    return chu.indexOf('giapha-json') >= 0 ? 'ĐÚNG' : 'không phải';
  } catch (e) {
    return 'không đọc được nội dung (' + e.message + ')';
  }
}
