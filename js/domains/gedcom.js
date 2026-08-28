// ============================================================
// giapha · js/domains/gedcom.js
// Vai trò  : Xuất gia phả ra GEDCOM 5.5.1 (nhập GEDCOM là việc 11)
// Lớp      : domains — HÀM THUẦN, không chạm DOM, không gọi services
// Phụ thuộc: utils/date, utils/text
// Phiên bản: 1.0.0 · Cập nhật: 28/08/2026 14:30
// ============================================================
//
// XUẤT: GEDCOM 5.5.1. Cũ hơn 7.0 nhưng gần như mọi phần mềm gia phả đọc được.
//       Mục đích xuất là để dữ liệu ĐI ĐƯỢC SANG NƠI KHÁC, nên tương thích
//       rộng quan trọng hơn hiện đại.
// NHẬP: chưa làm — `parseGedcom` còn là khung. Xuất đứng trước nhập vì xuất
//       chỉ ĐỌC: sai thì không mất gì, mà bản xuất ra lại thành ca kiểm sẵn
//       có cho đường nhập sau này.
//
// --- BẢNG ÁNH XẠ, và bốn chỗ đi khác `CAU-TRUC-DU-LIEU_V04` --------------
//
// Bảng chuẩn nằm ở `tai-lieu/CAU-TRUC-DU-LIEU_V04.md` mục *Ánh xạ GEDCOM*.
// Bốn chỗ dưới đây đi khác nó, và cả bốn đều CÓ CHỦ Ý:
//
// 1. **Xref mang nguyên mã, `@P0012@` chứ không `@P1@`.** Bảng viết `@P1@` là
//    viết cho gọn. Mang nguyên mã thì mở file bằng Notepad là đọc ra ngay
//    người nào, và tới việc 11 (nhập) thì nhập lại chính bản mình xuất ra là
//    KHÔNG MẤT MÃ — thứ mà `@P1@` không làm được.
//
// 2. **`PEDI` đứng dưới `INDI.FAMC`, không đứng dưới `FAM.CHIL`.** Bảng viết
//    *"`CHIL` kèm `PEDI`"*, nhưng 5.5.1 KHÔNG cho `PEDI` đứng dưới `CHIL` —
//    chỗ đúng của nó là `FAMC` bên bản ghi người. Ghi sai chỗ thì phần mềm
//    nhận hoặc bỏ qua, hoặc báo file hỏng. Nên: `FAM` có `CHIL`, `INDI` có
//    `FAMC` + `PEDI`, hai bên khớp nhau.
//
// 3. **Ba thẻ `_` MỚI ngoài bảng: `_QUANHE` · `_RANK` · `_TRANGTHAI`.**
//
//    ⚠ Đây KHÔNG phải đi ra ngoài chuẩn. 5.5.1 quy định hẳn: **thẻ mở đầu
//    bằng dấu `_` là thẻ do bên xuất tự đặt**, và phần mềm nhận phải BỎ QUA
//    thay vì báo lỗi. Đó đúng là cơ chế mà `_DOI` · `_CHI` · `_GIO` của bảng
//    ánh xạ đã dùng từ đầu; ba thẻ này chỉ là ba thẻ mới, cùng cơ chế ấy.
//
//    Nhưng phải phân biệt cho rõ hai chuyện, vì lẫn chúng là hỏng file:
//
//    - **Thẻ tự đặt** — có, và dùng thoải mái.
//    - **Giá trị tự đặt trong một thẻ CHUẨN** — KHÔNG có. `PEDI` là danh
//      sách ĐÓNG đúng bốn giá trị: `birth` · `adopted` · `foster` ·
//      `sealing`. App có năm mã quan hệ, nên `step` và `thua_tu` không có
//      chỗ đậu ở đó. Ghi `PEDI thua_tu` không phải "dùng trường tuỳ chỉnh",
//      nó là ghi sai giá trị vào một trường chuẩn — phần mềm nhận hoặc bỏ,
//      hoặc báo file hỏng.
//
//    Nên đường đi: giá trị nào khớp chuẩn thì ra `PEDI`, còn mã gốc thì LUÔN
//    ra `_QUANHE` bên cạnh. Bỏ mã gốc đi là mất một sự thật về gia đình;
//    nhét `thua_tu` vào `foster` là nói sai một sự thật khác.
//
//    `_RANK` (vợ cả / vợ thứ) và `_TRANGTHAI` cùng một lối: GEDCOM không có
//    thẻ CHUẨN nào chứa chúng — chỗ chứa thì có, chính là thẻ `_`. Riêng
//    `divorced` còn ra thêm `1 DIV Y`, thẻ chuẩn, để phần mềm nào không đọc
//    `_TRANGTHAI` vẫn biết cặp ấy đã ly hôn.
//
// 4. **`raw` được ghi kèm, nhưng CHỈ KHI nó nói thêm điều `iso` không nói.**
//    `birth.raw` = "1927" cạnh `iso` = "1927" thì thừa. `raw` = "khoảng 1890"
//    thì không thừa: `2 DATE 1890` một mình đã bỏ mất chữ *khoảng*. Ca ấy sinh
//    thêm `2 NOTE Nguyên văn: khoảng 1890`. Còn `iso` rỗng mà `raw` có chữ thì
//    `raw` thành DATE_PHRASE — `2 DATE (tháng chạp năm Bính Tý)`, đúng 5.5.1.
//
// --- Hai điều bản xuất KHÔNG mang theo, nói thẳng ------------------------
//
// - **Bản ghi mang cờ `deleted` không xuất.** GEDCOM không có chỗ cho *"đã xoá
//   nhưng còn giữ"*, xuất ra là phần mềm nhận hiểu thành người thật. Và vì thế
//   mọi con trỏ TRỎ TỚI họ cũng phải biến mất — `CHIL`, `HUSB`, `WIFE`,
//   `FAMS`, `FAMC`. Một xref trỏ vào khoảng không là file hỏng, không phải file
//   thiếu.
// - **Mặc định ẩn chi tiết người `living: true`.** Ẩn nghĩa là: giữ TÊN CHÍNH,
//   giới tính, và mọi mối nối gia đình — bỏ ngày sinh/mất, nơi chốn, nghề
//   nghiệp, ghi chú, ảnh, tên phụ, ngày giỗ. Giữ tên vì cây mất tên là cây vô
//   nghĩa; bỏ phần còn lại vì đó mới là thứ riêng tư. Người bị ẩn mang
//   `1 RESN privacy` — đúng thẻ mà 5.5.1 dựng cho việc này, nên phần mềm nhận
//   biết là *cố ý giấu*, không phải *dữ liệu thiếu*.

import { parseLooseDate } from '../utils/date.js';
import { coGiaTri } from '../utils/text.js';

// ============================================================
// Hằng số
// ============================================================

const THANG_GED = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                   'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// 5.5.1 chốt dòng dài tối đa 255 ký tự KỂ CẢ cấp và thẻ. Cắt ở 200 cho rộng
// tay: thẻ dài nhất ở đây là `2 CONT ` (7 ký tự), phần thừa còn lại là chỗ dự
// phòng cho chữ có dấu — vài phần mềm cũ đếm BYTE chứ không đếm ký tự, mà một
// chữ tiếng Việt có dấu chiếm ba byte UTF-8.
const DAI_TOI_DA = 200;

// `PEDI` của 5.5.1 chỉ nhận bốn giá trị này. Mã nào không có mặt ở đây thì
// KHÔNG sinh ra `PEDI` — mã gốc vẫn còn nguyên ở `_QUANHE`.
const PEDI_CHUAN = { birth: 'birth', adopted: 'adopted', foster: 'foster' };

// ============================================================
// 1. XUẤT
// ============================================================

/**
 * Dựng nội dung một file `.ged`.
 *
 * HÀM THUẦN: cùng một `tree` và cùng một `luc` thì luôn ra đúng một chuỗi.
 * `luc` phải do nơi gọi đưa vào chính vì thế — đọc `new Date()` ngay trong
 * thân hàm là mất tính thuần, và bài kiểm hết so được hai lần chạy với nhau.
 *
 * @param {object} tree  cây gia phả, đúng khuôn `CAU-TRUC-DU-LIEU_V04`
 * @param {{anNguoiConSong?: boolean, luc?: Date, tenFile?: string}} [tuyChon]
 *        `anNguoiConSong` mặc định TRUE — xem ghi chú đầu file.
 * @returns {string} nội dung file, dòng kết thúc bằng CRLF. KHÔNG kèm BOM;
 *          nơi gọi thêm BOM lúc dựng Blob (xem `pages/import-export.js`).
 */
export function exportGedcom(tree, tuyChon) {
  const y = tuyChon || {};
  const an = y.anNguoiConSong !== false;
  const luc = y.luc instanceof Date ? y.luc : new Date();

  const cay = tree && typeof tree === 'object' ? tree : {};
  const nguoi = Array.isArray(cay.persons) ? cay.persons : [];
  const cap = Array.isArray(cay.unions) ? cay.unions : [];
  const anh = Array.isArray(cay.media) ? cay.media : [];
  const nguon = Array.isArray(cay.sources) ? cay.sources : [];

  // --- Lọc một lần, dùng lại khắp nơi ---
  const nguoiRa = nguoi.filter((p) => p && p.id && !p.deleted);
  const coNguoi = new Set(nguoiRa.map((p) => p.id));
  const theoMa = new Map(nguoiRa.map((p) => [p.id, p]));

  const capRa = [];
  for (const u of cap) {
    if (!u || !u.id || u.deleted) continue;
    const banDoi = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => coNguoi.has(id));
    const con = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && coNguoi.has(c.personId));
    // Cặp không còn ai thì không có gì để kể. Nó không phải cặp nữa.
    if (banDoi.length === 0 && con.length === 0) continue;
    capRa.push({ goc: u, banDoi, con });
  }

  const boAn = new Set(an ? nguoiRa.filter(daAn).map((p) => p.id) : []);
  const anhTheoChu = gomAnh(anh, coNguoi, new Set(capRa.map((x) => x.goc.id)));

  // --- Bảng tra mối nối, để mỗi INDI biết mình thuộc cặp nào ---
  const lamVo = new Map();     // personId -> [unionId]      (FAMS)
  const lamCon = new Map();    // personId -> [{unionId, relation}]  (FAMC)
  for (const c of capRa) {
    for (const id of c.banDoi) themVaoMang(lamVo, id, c.goc.id);
    for (const k of c.con) {
      themVaoMang(lamCon, k.personId, { unionId: c.goc.id, relation: k.relation });
    }
  }

  const ds = [];
  veHead(ds, cay, luc, y.tenFile, boAn.size, nguoiRa.length, capRa.length);
  for (const p of nguoiRa) {
    veNguoi(ds, p, boAn.has(p.id), lamVo.get(p.id), lamCon.get(p.id), anhTheoChu);
  }
  for (const c of capRa) veCap(ds, c, theoMa, boAn, anhTheoChu);
  for (const s of nguon) veNguon(ds, s);
  ds.push('0 TRLR');

  return ds.join('\r\n') + '\r\n';
}

/**
 * Tên file gợi ý: `gia-pha-ho-nguyen-YYYYMMDD.ged`.
 *
 * Bỏ dấu và hạ chữ thường vì cái tên này đi ra khỏi app — sang máy người khác,
 * sang phần mềm khác, có khi sang cả USB định dạng FAT. Chữ có dấu ở đó là
 * chuyện hên xui, không phải chuyện chắc chắn.
 */
export function tenFileGedcom(tree, luc) {
  const t = luc instanceof Date ? luc : new Date();
  const so = (n) => String(n).padStart(2, '0');
  const ngay = t.getFullYear() + so(t.getMonth() + 1) + so(t.getDate());

  const ten = tree && tree.tree && typeof tree.tree.name === 'string'
    ? tree.tree.name : '';
  const goc = boDauChoTenFile(ten).slice(0, 60) || 'gia-pha';
  return goc + '-' + ngay + '.ged';
}

/**
 * Đếm trước khi xuất, để màn hình nói được *"sẽ xuất bao nhiêu"* TRƯỚC lúc bấm.
 *
 * Đếm bằng đúng bộ lọc mà `exportGedcom` dùng, không đếm xấp xỉ: con số hiện
 * trên màn hình mà lệch con số trong file thì lần sau không ai tin nó nữa.
 *
 * @returns {{soNguoi:number, soCap:number, soAn:number, soBoQua:number}}
 */
export function tomTatXuat(tree, tuyChon) {
  const an = !tuyChon || tuyChon.anNguoiConSong !== false;
  const cay = tree && typeof tree === 'object' ? tree : {};
  const nguoi = Array.isArray(cay.persons) ? cay.persons : [];
  const cap = Array.isArray(cay.unions) ? cay.unions : [];

  const nguoiRa = nguoi.filter((p) => p && p.id && !p.deleted);
  const coNguoi = new Set(nguoiRa.map((p) => p.id));

  let soCap = 0;
  for (const u of cap) {
    if (!u || !u.id || u.deleted) continue;
    const banDoi = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => coNguoi.has(id)).length;
    const con = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && coNguoi.has(c.personId)).length;
    if (banDoi === 0 && con === 0) continue;
    soCap++;
  }

  return {
    soNguoi: nguoiRa.length,
    soCap,
    soAn: an ? nguoiRa.filter(daAn).length : 0,
    soBoQua: nguoi.length - nguoiRa.length,
  };
}

// ============================================================
// 2. NHẬP — việc 11, chưa làm
// ============================================================
//
// ⚠ Bốn hàm dưới đây CỐ Ý còn là khung. Kế hoạch xếp nhập sau xuất, và lý do
// nằm ở chỗ nhập là đường MỘT CHIỀU: GEDCOM của phần mềm khác mang những
// trường app này không có chỗ chứa, nhập vào là MẤT chúng chứ không phải giữ
// im. Việc 11 phải nói ra điều đó trước khi nhập, và nhập vào một file MỚI.

/**
 * Phân tích file .ged. KHÔNG ghi đè dữ liệu ngay —
 * trả về bản xem trước để người dùng đối chiếu.
 * @returns {{ persons, unions, warnings }}
 */
export function parseGedcom(text) { /* TODO — việc 11 */ }

/** Dò bản ghi trùng giữa dữ liệu nhập vào và cây hiện có. */
export function detectDuplicates(tree, imported) { /* TODO — việc 11 */ }

/** Trộn dữ liệu đã nhập vào cây, sau khi người dùng xác nhận. */
export function mergeImported(tree, imported, decisions) { /* TODO — việc 11 */ }

// ============================================================
// 3. Dựng từng khối
// ============================================================

function veHead(ds, cay, luc, tenFile, soAn, soNguoi, soCap) {
  const t = cay.tree && typeof cay.tree === 'object' ? cay.tree : {};

  ds.push('0 HEAD');
  ds.push('1 SOUR GIAPHA');
  themDong(ds, 2, 'NAME', 'Gia phả — web app gia phả của dòng họ');
  themDong(ds, 2, 'VERS', '1.0.0');
  ds.push('1 DEST ANY');
  themDong(ds, 1, 'DATE', ngayHead(luc));
  themDong(ds, 2, 'TIME', gioHead(luc));
  ds.push('1 SUBM @SUB1@');
  themDong(ds, 1, 'FILE', tenFile);
  ds.push('1 GEDC');
  ds.push('2 VERS 5.5.1');
  ds.push('2 FORM LINEAGE-LINKED');
  ds.push('1 CHAR UTF-8');
  ds.push('1 LANG Vietnamese');

  // Ghi chú đầu file: thứ người mở bằng Notepad đọc thấy trước tiên. Nói đủ
  // ba điều họ cần biết ngay — cây nào, xuất lúc nào, và ĐÃ GIẤU GÌ.
  const cau = [];
  if (coGiaTri(t.name)) cau.push(String(t.name).trim());
  cau.push('Xuất lúc ' + ngayGioViet(luc) + '. ' +
           soNguoi + ' người, ' + soCap + ' gia đình.');
  if (soAn > 0) {
    cau.push('Đã ẩn chi tiết của ' + soAn + ' người còn sống — giữ tên và ' +
             'mối nối gia đình, bỏ ngày tháng, nơi chốn, ghi chú, ảnh. ' +
             'Họ mang thẻ RESN privacy.');
  }
  if (coGiaTri(t.note)) cau.push(String(t.note).trim());
  themDong(ds, 1, 'NOTE', cau.join('\n'));

  ds.push('0 @SUB1@ SUBM');
  themDong(ds, 1, 'NAME', coGiaTri(t.name) ? t.name : 'Gia phả');
}

function veNguoi(ds, p, giauChiTiet, dsLamVo, dsLamCon, anhTheoChu) {
  ds.push('0 @' + p.id + '@ INDI');

  const ten = Array.isArray(p.names) ? p.names : [];
  const chinh = ten.find((n) => n && n.type === 'chinh') || ten[0] || null;
  veTen(ds, chinh, true);
  if (!giauChiTiet) {
    for (const n of ten) {
      if (n === chinh || !n) continue;
      veTen(ds, n, false);
    }
  }

  if (p.sex === 'M' || p.sex === 'F' || p.sex === 'U') {
    ds.push('1 SEX ' + p.sex);
  }

  if (giauChiTiet) {
    // RESN đứng NGAY sau tên và giới tính, trước mọi mối nối: phần mềm nhận
    // đọc tuần tự, gặp cờ sớm thì nó biết cách bày cả bản ghi.
    ds.push('1 RESN privacy');
  } else {
    veSuKien(ds, 'BIRT', p.birth);
    veChet(ds, p);
    veNoiChon(ds, 'BURI', p.burialPlace);

    themDong(ds, 1, 'TITL', p.title);
    themDong(ds, 1, 'OCCU', p.occupation);
    themDong(ds, 1, 'EDUC', p.education);
    themDong(ds, 1, 'RELI', p.religion);
    veNoiChon(ds, 'RESI', p.residence);
    themDong(ds, 1, 'NATI', p.nationality);
    themDong(ds, 1, 'NOTE', p.note);

    const vn = p.vn && typeof p.vn === 'object' ? p.vn : {};
    if (Number.isInteger(vn.generation) && vn.generation > 0) {
      themDong(ds, 1, '_DOI', String(vn.generation));
    }
    themDong(ds, 1, '_CHI', vn.branch);
    themDong(ds, 1, '_GIO', vn.gio);

    for (const m of anhTheoChu.get(p.id) || []) veAnh(ds, m);
  }

  for (const uid of dsLamVo || []) ds.push('1 FAMS @' + uid + '@');
  for (const k of dsLamCon || []) {
    ds.push('1 FAMC @' + k.unionId + '@');
    const ma = String(k.relation || '').trim();
    if (PEDI_CHUAN[ma]) ds.push('2 PEDI ' + PEDI_CHUAN[ma]);
    themDong(ds, 2, '_QUANHE', ma);
  }
}

function veCap(ds, c, theoMa, boAn, anhTheoChu) {
  const u = c.goc;
  ds.push('0 @' + u.id + '@ FAM');

  const vaiTro = chiaVaiTro(c.banDoi, u.partnerOrder, theoMa);
  if (vaiTro.husb) ds.push('1 HUSB @' + vaiTro.husb + '@');
  if (vaiTro.wife) ds.push('1 WIFE @' + vaiTro.wife + '@');
  for (const id of vaiTro.thua) ds.push('1 _BANDOI @' + id + '@');

  // Con xếp theo `order` — thứ tự anh em là một sự thật của gia đình, và bản
  // xuất ra phải giữ được nó dù GEDCOM không có thẻ nào nói ra thứ tự ấy.
  const con = c.con.slice().sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  for (const k of con) ds.push('1 CHIL @' + k.personId + '@');

  // Ẩn chi tiết cặp khi MỘT trong hai người đang bị ẩn: ngày cưới là chuyện
  // của cả hai, giấu một nửa thì không giấu được gì.
  const anCap = c.banDoi.some((id) => boAn.has(id));
  if (anCap) {
    if (coGiaTri(u.note) || coNgay(u.marriage)) ds.push('1 RESN privacy');
  } else {
    veSuKien(ds, 'MARR', u.marriage);
    themDong(ds, 1, 'NOTE', u.note);
    for (const m of anhTheoChu.get(u.id) || []) veAnh(ds, m);
  }

  // `married` là mặc định — `config.nhanTrangThaiCap` coi cả chuỗi rỗng lẫn
  // thiếu hẳn là `married`. Ghi nó ra trên cả 25 gia đình là 25 dòng không
  // nói thêm điều gì; chỉ ghi khi trạng thái KHÁC lệ thường.
  const tt = String(u.status || '').trim();
  if (tt === 'divorced') ds.push('1 DIV Y');
  if (tt !== '' && tt !== 'married') themDong(ds, 1, '_TRANGTHAI', tt);
  if (Number.isInteger(u.rank) && u.rank > 0) {
    themDong(ds, 1, '_RANK', String(u.rank));
  }
}

function veNguon(ds, s) {
  if (!s || !s.id) return;
  ds.push('0 @' + s.id + '@ SOUR');
  themDong(ds, 1, 'TITL', s.title);
  themDong(ds, 1, 'AUTH', s.author);
  themDong(ds, 1, 'NOTE', s.note);
}

// ============================================================
// 4. Mấy mẩu dựng dòng
// ============================================================

function veTen(ds, n, laChinh) {
  if (!n) return;
  const ho = chu(n.surname);
  const dem = chu(n.middle);
  const rieng = chu(n.given);
  // Không có lấy một phần nào thì không vẽ thẻ. Mục `chinh` RỖNG là ca thật —
  // *"con thứ ba của cụ Bá"* — và nó tồn tại để giữ chỗ đầu mảng, không phải
  // để xuất ra một cái tên trống (`CAU-TRUC-DU-LIEU_V04`, quy ước 2).
  if (ho === '' && dem === '' && rieng === '') return;

  // 5.5.1 viết tên theo lối *tên riêng /HỌ/*, ngược thứ tự người Việt đọc.
  // Ngược mà ĐÚNG CHUẨN: phần mềm nhận đọc dấu gạch chéo để biết đâu là họ.
  // `GIVN`/`SURN` bên dưới mới là thứ máy dùng; dòng `NAME` là để người đọc.
  const truoc = [dem, rieng].filter((x) => x !== '').join(' ');
  themDong(ds, 1, 'NAME', (truoc === '' ? '' : truoc + ' ') + '/' + ho + '/');
  if (!laChinh) themDong(ds, 2, 'TYPE', n.type);
  themDong(ds, 2, 'GIVN', truoc);
  themDong(ds, 2, 'SURN', ho);
}

/**
 * Một sự kiện có ngày và nơi. Không có gì để nói thì KHÔNG vẽ thẻ — thẻ `BIRT`
 * trơ trọi không mang thêm tin gì, nó chỉ nói *"người này có sinh ra"*.
 */
function veSuKien(ds, the, khoi) {
  const ngay = ngayGedcom(khoi);
  const noi = khoi && typeof khoi === 'object' ? chu(khoi.place) : '';
  const them = rawNoiThem(khoi);
  if (ngay === '' && noi === '' && them === '') return;

  ds.push('1 ' + the);
  themDong(ds, 2, 'DATE', ngay);
  themDong(ds, 2, 'PLAC', noi);
  if (them !== '') themDong(ds, 2, 'NOTE', 'Nguyên văn: ' + them);
}

/**
 * Chết là sự kiện DUY NHẤT được phép rỗng mà vẫn xuất.
 *
 * `living: false` không kèm ngày tháng nào vẫn là một điều đã biết chắc, và
 * `1 DEAT Y` là đúng câu mà 5.5.1 dựng ra để nói nó. Bỏ đi thì phần mềm nhận
 * xếp người ấy vào diện *còn sống* — sai một cách im lặng.
 */
function veChet(ds, p) {
  const truoc = ds.length;
  veSuKien(ds, 'DEAT', p.death);
  if (ds.length > truoc) return;
  if (p.living === false) ds.push('1 DEAT Y');
}

/** Thẻ sự kiện chỉ có nơi chốn: `BURI`, `RESI`. */
function veNoiChon(ds, the, noi) {
  const c = chu(noi);
  if (c === '') return;
  ds.push('1 ' + the);
  themDong(ds, 2, 'PLAC', c);
}

function veAnh(ds, m) {
  ds.push('1 OBJE');
  themDong(ds, 2, 'FILE', 'https://drive.google.com/uc?id=' + chu(m.driveFileId));
  themDong(ds, 3, 'FORM', 'jpg');
  themDong(ds, 3, 'TITL', m.caption);
}

// ============================================================
// 5. Đóng gói một dòng — chỗ dễ sai nhất của cả file
// ============================================================

/**
 * Ghi một thẻ có giá trị, tự cắt dòng dài và tự xuống dòng.
 *
 * Ba luật của 5.5.1 gói hết vào đây, và cả ba đều là loại lỗi KHÔNG TỰ LỘ RA —
 * file vẫn mở được, chỉ mất chữ:
 *
 * 1. **Rỗng thì không ghi.** Luật chung của app (`CLAUDE.md` mục 7), và ở đây
 *    còn thêm một lý do: `1 NOTE` trơ trọi là thẻ hợp lệ, phần mềm nhận sẽ
 *    dựng ra một ghi chú rỗng cho mỗi người.
 * 2. **Xuống dòng thành `CONT`, dòng quá dài thành `CONC`.** Ký tự xuống dòng
 *    thật trong một dòng GEDCOM cắt bản ghi làm đôi.
 * 3. **`@` phải nhân đôi.** `@` mở đầu một xref; một địa chỉ email trong ghi
 *    chú mà không nhân đôi thì phần mềm nhận đi tìm bản ghi không có thật.
 */
function themDong(ds, cap, the, giaTri) {
  const chuoi = lamSach(giaTri);
  if (chuoi === '') return;

  const doan = chuoi.split('\n');
  for (let i = 0; i < doan.length; i++) {
    const manh = chiaDai(doan[i]);
    for (let j = 0; j < manh.length; j++) {
      if (i === 0 && j === 0) ds.push(cap + ' ' + the + ' ' + manh[j]);
      else if (j === 0) ds.push((cap + 1) + ' CONT ' + manh[j]);
      else ds.push((cap + 1) + ' CONC ' + manh[j]);
    }
    // Dòng trống giữa đoạn văn: `CONT` không có giá trị, vẫn phải ghi ra thì
    // ghi chú mới giữ được hình dáng cũ.
    if (manh.length === 0) ds.push((cap + 1) + ' CONT');
  }
}

function chiaDai(s) {
  if (s.length <= DAI_TOI_DA) return s === '' ? [] : [s];
  const ra = [];
  let i = 0;
  while (i < s.length) {
    let n = Math.min(DAI_TOI_DA, s.length - i);
    if (i + n < s.length) {
      // Đừng cắt giữa một cặp surrogate — cắt vào giữa là hai nửa ký tự hỏng.
      const ma = s.charCodeAt(i + n - 1);
      if (ma >= 0xD800 && ma <= 0xDBFF) n--;
      // Cắt GIỮA MỘT CHỮ, không bao giờ cắt sát khoảng trắng — dù ở đầu mẩu
      // sau hay cuối mẩu trước. Phần mềm nào cũng có thể cắt trắng ở rìa dòng
      // `CONC`, và cắt xong thì hai chữ dính liền nhau mà không ai thấy.
      while (n > 1 && (s.charAt(i + n - 1) === ' ' || s.charAt(i + n) === ' ')) n--;
    }
    ra.push(s.slice(i, i + n));
    i += n;
  }
  return ra;
}

function lamSach(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/@/g, '@@')
    .trim();
}

// ============================================================
// 6. Ngày tháng
// ============================================================

/**
 * `{iso, raw}` của app -> DATE_VALUE của GEDCOM.
 *
 *   iso "1948-03-12" -> "12 MAR 1948"
 *   iso "1948-03"    -> "MAR 1948"
 *   iso "1948"       -> "1948"
 *   iso rỗng, raw có -> "(tháng chạp năm Bính Tý)"   ← DATE_PHRASE, hợp lệ
 *   không có gì      -> ""
 *
 * ⚠ `iso` ở app này CÓ THỂ chỉ dài bốn chữ số, và đó là ca THƯỜNG GẶP chứ
 * không phải ca lạ: gia phả cũ hầu hết chỉ có năm.
 */
function ngayGedcom(khoi) {
  if (!khoi || typeof khoi !== 'object') return '';
  const iso = chu(khoi.iso);
  const m = iso.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (m) {
    const nam = m[1];
    if (!m[2]) return nam;
    const t = THANG_GED[Number(m[2]) - 1];
    if (!t) return nam;
    if (!m[3]) return t + ' ' + nam;
    return Number(m[3]) + ' ' + t + ' ' + nam;
  }
  const raw = chu(khoi.raw);
  // Ngoặc đơn trong một DATE_PHRASE làm hỏng chính cặp ngoặc bao ngoài.
  if (raw !== '') return '(' + raw.replace(/[()]/g, ' ').trim() + ')';
  return '';
}

/**
 * `raw` có nói thêm điều gì mà `iso` không nói không?
 *
 * Có thì trả về nguyên văn, để `veSuKien` ghi kèm một `NOTE`. Không thì trả về
 * chuỗi rỗng — và đó là ca thường: dữ liệu đang dùng có 72 khối ngày, cả 72
 * khối đều `raw` trùng khít `iso`.
 */
function rawNoiThem(khoi) {
  if (!khoi || typeof khoi !== 'object') return '';
  const raw = chu(khoi.raw);
  const iso = chu(khoi.iso);
  if (raw === '' || iso === '') return '';    // iso rỗng thì raw đã thành DATE_PHRASE
  const doc = parseLooseDate(raw);
  if (doc.iso === iso && doc.confident) return '';
  return raw;
}

function coNgay(khoi) {
  return ngayGedcom(khoi) !== '';
}

/** `1 DATE 28 AUG 2026` của thẻ HEAD — luôn đủ ngày tháng năm. */
function ngayHead(t) {
  return t.getDate() + ' ' + THANG_GED[t.getMonth()] + ' ' + t.getFullYear();
}

function gioHead(t) {
  const so = (n) => String(n).padStart(2, '0');
  return so(t.getHours()) + ':' + so(t.getMinutes()) + ':' + so(t.getSeconds());
}

/** dd/mm/yyyy HH:mm — khuôn thời gian của cả dự án (`CLAUDE.md` mục 2). */
function ngayGioViet(t) {
  const so = (n) => String(n).padStart(2, '0');
  return so(t.getDate()) + '/' + so(t.getMonth() + 1) + '/' + t.getFullYear() +
         ' ' + so(t.getHours()) + ':' + so(t.getMinutes());
}

// ============================================================
// 7. Mấy phép nhỏ
// ============================================================

/**
 * Chia hai người trong một cặp về `HUSB` và `WIFE`.
 *
 * Dữ liệu app dùng mảng `partners`, cố ý không có `husband`/`wife`, để hôn nhân
 * đồng giới chạy được. GEDCOM 5.5.1 thì chỉ có hai ô ấy — nên chỗ này là NƠI
 * DUY NHẤT trong cả app ánh xạ ngược lại, đúng như `CLAUDE.md` mục 7 dặn.
 *
 * - Có đủ một nam một nữ: gán theo GIỚI TÍNH.
 * - Cùng giới, hoặc cả hai đều `U`: gán theo `partnerOrder` — người đứng trước
 *   vào `HUSB`. Không có nghĩa gì về vai vế, chỉ là hai cái ô phải điền.
 * - Một người duy nhất: ca THẬT trong dữ liệu (cha nhận con nuôi, không có vợ
 *   trong gia phả). Ô còn lại để trống, không bịa ra người.
 */
function chiaVaiTro(banDoi, partnerOrder, theoMa) {
  const ds = xepTheoThuTu(banDoi, partnerOrder);
  const gioi = (id) => {
    const p = theoMa.get(id);
    return p && (p.sex === 'M' || p.sex === 'F') ? p.sex : 'U';
  };

  const nam = ds.filter((id) => gioi(id) === 'M');
  const nu = ds.filter((id) => gioi(id) === 'F');

  let husb = null;
  let wife = null;
  const thua = [];

  // Hai người CÙNG một giới đã biết: giới tính hết chia được, `partnerOrder`
  // là thứ duy nhất còn nói được điều gì. Không tách riêng ca này ra thì vòng
  // lấp chỗ trống bên dưới xếp ngược thứ tự — người thứ hai rơi vào `HUSB`.
  const cungGioi = (nam.length > 1 && nu.length === 0) ||
                   (nu.length > 1 && nam.length === 0);
  if (cungGioi) {
    husb = ds[0] || null;
    wife = ds[1] || null;
  } else {
    husb = nam[0] || null;
    wife = nu[0] || null;
  }

  for (const id of ds) {
    if (id === husb || id === wife) continue;
    if (!husb) husb = id;
    else if (!wife) wife = id;
    else thua.push(id);
  }
  return { husb, wife, thua };
}

/**
 * `partnerOrder` quyết định ai đứng trước, nhưng nó CHỈ là gợi ý vị trí và có
 * thể lệch khỏi `partners` (thiếu người, thừa người, hoặc vắng mặt hẳn). Nên:
 * lấy theo nó những ai còn hợp lệ, rồi nối phần còn lại theo `partners`.
 */
function xepTheoThuTu(banDoi, partnerOrder) {
  const con = new Set(banDoi);
  const ra = [];
  for (const id of Array.isArray(partnerOrder) ? partnerOrder : []) {
    if (con.has(id)) { ra.push(id); con.delete(id); }
  }
  for (const id of banDoi) if (con.has(id)) { ra.push(id); con.delete(id); }
  return ra;
}

/** Ảnh gom theo chủ thể, bỏ ảnh đã gỡ và ảnh trỏ vào bản ghi không xuất. */
function gomAnh(media, coNguoi, coCap) {
  const ra = new Map();
  for (const m of media) {
    if (!m || m.deleted || !coGiaTri(m.driveFileId)) continue;
    const chuThe = m.subjectId;
    if (!coNguoi.has(chuThe) && !coCap.has(chuThe)) continue;
    themVaoMang(ra, chuThe, m);
  }
  return ra;
}

function daAn(p) {
  return p.living === true;
}

function themVaoMang(bang, khoa, giaTri) {
  const cu = bang.get(khoa);
  if (cu) cu.push(giaTri);
  else bang.set(khoa, [giaTri]);
}

/** Chuỗi đã cắt trắng; thứ gì không phải chuỗi thì coi như không có. */
function chu(v) {
  return typeof v === 'string' ? v.trim() : '';
}

/** "Gia phả họ Nguyễn Trọng Bậc" -> "gia-pha-ho-nguyen-trong-bac" */
function boDauChoTenFile(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
