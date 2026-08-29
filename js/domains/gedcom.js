// ============================================================
// giapha · js/domains/gedcom.js
// Vai trò  : Xuất gia phả ra GEDCOM 5.5.1, và ĐỌC file .ged thành bản xem trước
// Lớp      : domains — HÀM THUẦN, không chạm DOM, không gọi services
// Phụ thuộc: utils/date, utils/text, utils/id, config
// Phiên bản: 1.1.0 · Cập nhật: 29/08/2026 10:40
// ============================================================
//
// XUẤT: GEDCOM 5.5.1. Cũ hơn 7.0 nhưng gần như mọi phần mềm gia phả đọc được.
//       Mục đích xuất là để dữ liệu ĐI ĐƯỢC SANG NƠI KHÁC, nên tương thích
//       rộng quan trọng hơn hiện đại.
// NHẬP: nửa A xong (29/08/2026) — `parseGedcom` đọc được file thành bản XEM
//       TRƯỚC. Nó KHÔNG ghi vào đâu cả; `mergeImported` mới là hàm đụng vào
//       dữ liệu và hàm ấy còn là khung. Xuất đứng trước nhập vì xuất chỉ
//       ĐỌC: sai thì không mất gì, mà bản xuất ra lại thành ca kiểm sẵn có
//       cho đường nhập — xem `kiem-thu/kiem-nhap-gedcom.mjs`.
//
// --- BẢNG ÁNH XẠ, và bốn chỗ V04 chưa đủ để đi tới file .ged -------------
//
// Bảng chuẩn nay nằm ở `tai-lieu/CAU-TRUC-DU-LIEU_V05.md` mục *Ánh xạ
// GEDCOM* — bản ấy viết SAU khi file này chạy được, và nó chốt đúng bốn
// chỗ dưới đây vào tài liệu. Giữ lại phần giải thích ở đây vì đây là chỗ
// người sửa mã đọc trước tiên:
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

import { parseLooseDate, formatDate } from '../utils/date.js';
import { coGiaTri } from '../utils/text.js';
import { isValidId } from '../utils/id.js';
import { QUAN_HE_CON_NHAN } from '../config.js';

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

// Chiều NGƯỢC của `THANG_GED`, dựng từ chính nó — hai bảng gõ tay là hai bảng
// trôi lệch nhau, và lệch ở đây thì tháng 3 nhập vào thành tháng 4.
const THANG_SO = {};
for (let i = 0; i < THANG_GED.length; i++) THANG_SO[THANG_GED[i]] = i + 1;

// Tiền tố ngày của GEDCOM, dịch sang tiếng Việt. `formatDate` ưu tiên `raw`,
// nên để nguyên chữ Anh là app hiện "ABT 1890" giữa một thẻ tiếng Việt.
const TIEN_TO_NGAY = {
  ABT: 'khoảng', ABOUT: 'khoảng',
  EST: 'ước chừng',
  CAL: 'tính ra',
  BEF: 'trước', BEFORE: 'trước',
  AFT: 'sau',   AFTER: 'sau',
  INT: '',
};

// Mã quan hệ hợp lệ, DẪN XUẤT từ bảng của `config` đúng như `union.js` làm.
// Gõ lại năm cái mã ở đây là dựng bảng mã thứ ba trong cùng một dự án.
const QUAN_HE_NHAP = QUAN_HE_CON_NHAN.map((x) => x.ma);

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
 * @param {object} tree  cây gia phả, đúng khuôn `CAU-TRUC-DU-LIEU_V05`
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
// 2. NHẬP — việc 11, nửa A: ĐỌC và XEM TRƯỚC
// ============================================================
//
// ⚠ `parseGedcom` KHÔNG ghi vào đâu cả. Nó nhận một chuỗi và trả về một bản
// xem trước. `detectDuplicates` và `mergeImported` — hai hàm THẬT SỰ đụng vào
// dữ liệu — còn là khung, và đó là chủ ý: nhập là đường MỘT CHIỀU, nên nửa
// đầu của việc 11 chỉ làm phần KHÔNG mất gì nếu sai.
//
// --- Vì sao bản xem trước phải kể ra thứ MẤT, không chỉ thứ được ---------
//
// Bản xuất kể *"sẽ xuất 59 người"* là đủ, vì xuất không mất gì. Nhập thì
// khác: file của phần mềm khác mang những trường app này không có chỗ chứa —
// nguồn dẫn chứng, sự kiện rửa tội, địa chỉ, số điện thoại, hàng chục thẻ
// khác. Nhập vào là chúng BIẾN MẤT, và biến mất im lặng.
//
// Nên hàm này đếm luôn cả **những thẻ nó không đọc** (`theLa`) và trả ra
// đúng cái danh sách ấy. Người dùng nhìn thấy *"bỏ qua 41 dòng: BAPM, ADDR,
// PHON"* thì tự quyết được có nhập hay không. Đó là điều một con số "59
// người" không bao giờ nói ra.
//
// --- Bốn quyết định đã chốt ở nửa A --------------------------------------
//
// 1. **GIỮ NGUYÊN mã nếu mã ấy đúng khuôn app** (`P0012`, `U0003`). Chính
//    điều này làm cho bản xuất của b55 thành ca kiểm: xuất ra rồi nhập lại
//    phải ra đúng cây cũ, kể cả mã. Mã của phần mềm khác (`@I1@`, `@F12@`)
//    thì được cấp mã mới, và những chỗ đổi được kể ra từng cặp.
//
// 2. **`FAM` là nguồn nói THỨ TỰ anh em, `INDI.FAMC` là nguồn nói QUAN HỆ.**
//    Bản xuất ghi cả hai phía; chuẩn 5.5.1 cũng đặt `PEDI` ở phía `INDI`.
//    Hai phía lệch nhau — file của phần mềm khác hay lệch — thì lấy hợp của
//    cả hai và ghi một dòng cảnh báo, chứ không lặng lẽ bỏ một phía.
//
// 3. **Ảnh KHÔNG nhập.** Thẻ `OBJE` chỉ mang một đường dẫn; app thì lưu ảnh
//    bằng `driveFileId` — một file có thật trong thư mục `Anh` của gia phả
//    này. Dựng bản ghi `media` trỏ vào đường dẫn của máy khác là dựng ra một
//    kho ảnh mà mọi tấm đều hỏng. Đếm và kể ra, không nhập.
//
// 4. **Ngày có tiền tố (`ABT`, `BEF`, `BET…AND`) dịch sang tiếng Việt vào
//    `raw`, còn `iso` lấy mốc đọc được.** `formatDate` ưu tiên `raw`, nên để
//    nguyên chữ Anh là app hiện "ABT 1890" giữa một thẻ tiếng Việt. Dịch mà
//    vẫn giữ `iso` thì vừa đọc được vừa sắp xếp được.

/**
 * Đọc nội dung một file `.ged` thành bản XEM TRƯỚC.
 *
 * HÀM THUẦN: không đọc đồng hồ, không sinh số ngẫu nhiên, không chạm DOM.
 * Cùng một chuỗi vào thì luôn ra cùng một kết quả.
 *
 * @param {string} text  nội dung file, kèm hay không kèm BOM đều được
 * @returns {{
 *   persons: object[], unions: object[], sources: object[],
 *   tenCay: string, nguonXuat: string,
 *   thongKe: {soNguoi:number, soCap:number, soNguon:number, soAnhBoQua:number,
 *             soDongHong:number, soDongBoQua:number, soAn:number, soDoiMa:number},
 *   theLa: {the:string, so:number}[],
 *   doiMa: string[][],
 *   anhBoQua: {chuThe:string, duongDan:string, caption:string}[],
 *   canhBao: {muc:'nang'|'nhe', chu:string}[]
 * }}
 */
export function parseGedcom(text) {
  const dong = tachDong(text);
  const { goc, hong } = docCayGedcom(dong);

  const banGhi = { INDI: [], FAM: [], SOUR: [], khac: [] };
  let head = null;
  let subm = null;
  for (const r of goc) {
    if (r.the === 'HEAD') { head = r; continue; }
    if (r.the === 'SUBM') { subm = r; continue; }
    if (r.the === 'TRLR') continue;
    if (banGhi[r.the]) banGhi[r.the].push(r);
    else banGhi.khac.push(r);
  }

  const tatCa = banGhi.INDI.concat(banGhi.FAM, banGhi.SOUR);
  const { bang, doiMa } = dungBangMa(tatCa);

  // --- Người ---------------------------------------------------------
  const gom = {
    soAn: 0,
    anh: [],
    fams: [],      // {personId, capXref}
    famc: [],      // {personId, capXref, relation}
  };
  const persons = banGhi.INDI.map((r) => docNguoi(r, gom));
  const coNguoi = new Set(persons.map((p) => p.id));

  // --- Cặp -----------------------------------------------------------
  const thoCap = banGhi.FAM.map((r) => docCap(r, gom));

  // --- Nối hai phía lại ------------------------------------------------
  const noi = noiCapVaNguoi(thoCap, bang, coNguoi, gom);
  const unions = noi.unions;

  // --- Nguồn -----------------------------------------------------------
  const sources = banGhi.SOUR.map((r) => docNguon(r));

  // --- Thẻ app không có chỗ chứa ---------------------------------------
  //
  // KHÔNG quét `HEAD`, `SUBM`, `TRLR`: chúng nói về CÁI FILE, không nói về
  // gia đình nào. Kể `1 CHAR UTF-8` vào danh sách "bỏ qua" là làm loãng đúng
  // cái danh sách người dùng cần đọc kỹ.
  const demThe = new Map();
  for (const r of tatCa) quetTheLa(r, demThe);
  for (const r of banGhi.khac) {
    themDem(demThe, r.the);
    quetTheLa(r, demThe);
  }
  const theLa = [...demThe.entries()]
    .map(([the, so]) => ({ the, so }))
    .sort((a, b) => b.so - a.so || (a.the < b.the ? -1 : 1));
  const soDongBoQua = theLa.reduce((t, x) => t + x.so, 0);

  // --- Nói ra mọi thứ mất mát ------------------------------------------
  const canhBao = [];
  if (hong.length > 0) {
    canhBao.push({
      muc: 'nang',
      chu: hong.length + ' dòng không đúng khuôn GEDCOM, đã bỏ qua. ' +
           'Dòng đầu tiên: dòng ' + hong[0].so + ' — ' + catNgan(hong[0].chu, 60),
    });
  }
  if (persons.length === 0) {
    canhBao.push({
      muc: 'nang',
      chu: 'Không đọc được người nào. File này có thể không phải GEDCOM, ' +
           'hoặc đã hỏng.',
    });
  }
  if (gom.anh.length > 0) {
    canhBao.push({
      muc: 'nang',
      chu: gom.anh.length + ' tấm ảnh KHÔNG nhập được. File .ged chỉ mang ' +
           'đường dẫn tới ảnh chứ không mang chính tấm ảnh, và đường dẫn ấy ' +
           'trỏ vào máy khác. Ảnh phải thêm lại bằng tay sau khi nhập.',
    });
  }
  if (soDongBoQua > 0) {
    canhBao.push({
      muc: 'nang',
      chu: soDongBoQua + ' dòng mang thông tin app này không có chỗ chứa, ' +
           'sẽ MẤT khi nhập: ' + keTheLa(theLa) + '.',
    });
  }
  if (doiMa.length > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: doiMa.length + ' mã phải đổi vì không đúng khuôn của app ' +
           '(ví dụ ' + doiMa[0][0] + ' thành ' + doiMa[0][1] + ').',
    });
  }
  if (gom.soAn > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: gom.soAn + ' người mang cờ riêng tư ở file gốc — phần mềm xuất ra ' +
           'file này đã bỏ bớt chi tiết của họ trước khi ghi. App không lấy ' +
           'lại được phần đã bị bỏ.',
    });
  }
  for (const c of noi.canhBao) canhBao.push(c);

  return {
    persons,
    unions,
    sources,
    tenCay: tenCayTuFile(head, subm),
    nguonXuat: nguonTuHead(head),
    thongKe: {
      soNguoi: persons.length,
      soCap: unions.length,
      soNguon: sources.length,
      soAnhBoQua: gom.anh.length,
      soDongHong: hong.length,
      soDongBoQua,
      soAn: gom.soAn,
      soDoiMa: doiMa.length,
    },
    theLa,
    doiMa,
    anhBoQua: gom.anh,
    canhBao,
  };
}

/** Dò bản ghi trùng giữa dữ liệu nhập vào và cây hiện có. */
export function detectDuplicates(tree, imported) { /* TODO — việc 11 nửa B */ }

/** Trộn dữ liệu đã nhập vào cây, sau khi người dùng xác nhận. */
export function mergeImported(tree, imported, decisions) { /* TODO — việc 11 nửa B */ }

// ============================================================
// 2a. Tách chuỗi thành cây nút
// ============================================================

function tachDong(text) {
  const s = typeof text === 'string' ? text : '';
  return s.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
}

/**
 * Dựng cây nút từ danh sách dòng.
 *
 * Ba chỗ dễ sai, và cả ba đều làm mất chữ chứ không báo lỗi:
 *
 * 1. **`CONC`/`CONT` không phải nút con.** Chúng là phần ĐUÔI của dòng trên,
 *    và phải được nối thẳng vào giá trị của nút cha. Coi chúng là nút con thì
 *    một ghi chú ba đoạn biến thành một ghi chú một dòng cộng hai nút lạ.
 * 2. **`@@` phải gỡ về `@`.** Gỡ ở `giaTriChu`, sau khi đã nối xong `CONC` —
 *    gỡ sớm thì một `@` bị cắt đôi giữa hai dòng sẽ gỡ nhầm.
 * 3. **Ngăn xếp phải CẮT NGẮN khi lùi cấp.** `ngan.length = cap` trước khi
 *    gán, nếu không thì một nút cấp 3 cũ còn nằm lại và nút cấp 3 mới gắn
 *    nhầm cha.
 */
function docCayGedcom(dong) {
  const goc = [];
  const hong = [];
  const ngan = [];

  for (let i = 0; i < dong.length; i++) {
    const d = dong[i];
    if (d.trim() === '') continue;

    const m = d.match(/^\s*(\d+)\s+(?:@([^@]*)@\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\s([\s\S]*))?$/);
    if (!m) { hong.push({ so: i + 1, chu: d }); continue; }

    const cap = Number(m[1]);
    const the = m[3].toUpperCase();
    const giaTri = m[4] === undefined ? '' : m[4];

    if (the === 'CONC' || the === 'CONT') {
      const cha = ngan[cap - 1];
      if (!cha) { hong.push({ so: i + 1, chu: d }); continue; }
      cha.giaTri += (the === 'CONT' ? '\n' : '') + giaTri;
      continue;
    }

    const nut = {
      xref: m[2] ? m[2].trim() : '',
      the,
      giaTri,
      con: [],
      dung: false,
      ma: '',
    };

    if (cap === 0) {
      goc.push(nut);
      ngan.length = 0;
      ngan[0] = nut;
      continue;
    }
    const cha = ngan[cap - 1];
    if (!cha) { hong.push({ so: i + 1, chu: d }); continue; }
    cha.con.push(nut);
    ngan.length = cap;
    ngan[cap] = nut;
  }
  return { goc, hong };
}

// ============================================================
// 2b. Bảng mã — giữ mã cũ được thì giữ
// ============================================================

/**
 * Quyết mã cho từng bản ghi, hai vòng và thứ tự hai vòng ấy là điều quan trọng:
 *
 * - **Vòng 1** nhận những mã đã đúng khuôn app (`P0012`) và GIỮ NGUYÊN.
 * - **Vòng 2** mới cấp mã mới cho phần còn lại, và luôn **né** mọi mã vòng 1
 *   đã nhận. Làm ngược thứ tự thì `@I1@` chiếm mất `P0001`, rồi bản ghi thật
 *   sự mang mã `P0001` phải đổi đi — mã cũ mất mà chẳng vì lý do gì.
 */
function dungBangMa(banGhi) {
  const nhom = { INDI: 'P', FAM: 'U', SOUR: 'S' };
  const bang = new Map();
  const daDung = new Set();
  const doiMa = [];

  for (const r of banGhi) {
    const tt = nhom[r.the];
    if (!tt || !r.xref) continue;
    const ma = r.xref.trim().toUpperCase();
    if (isValidId(ma) && ma.charAt(0) === tt && !daDung.has(ma)) {
      daDung.add(ma);
      r.ma = ma;
      bang.set(r.xref, ma);
    }
  }

  const dem = { P: 0, U: 0, S: 0 };
  for (const r of banGhi) {
    const tt = nhom[r.the];
    if (!tt || r.ma) continue;
    let ma;
    do {
      dem[tt]++;
      ma = tt + String(dem[tt]).padStart(4, '0');
    } while (daDung.has(ma));
    daDung.add(ma);
    r.ma = ma;
    if (r.xref) {
      bang.set(r.xref, ma);
      doiMa.push([r.xref, ma]);
    } else {
      doiMa.push(['(bản ghi không có mã)', ma]);
    }
  }
  return { bang, doiMa };
}

// ============================================================
// 2c. Đọc từng loại bản ghi
// ============================================================

function docNguoi(r, gom) {
  const p = {
    id: r.ma,
    names: [],
    sex: 'U',
    birth: khoiNgayRong(),
    death: khoiNgayRong(),
    burialPlace: '',
    title: '',
    occupation: '',
    education: '',
    religion: '',
    residence: '',
    nationality: '',
    living: true,
    photoFileId: '',
    note: '',
    deleted: false,
    meta: { createdAt: '', updatedAt: '', updatedBy: '' },
  };
  const vn = {};
  let coChet = false;

  for (const n of r.con) {
    switch (n.the) {
      case 'NAME': {
        n.dung = true;
        const t = docTen(n, p.names.length === 0);
        if (t) p.names.push(t);
        break;
      }
      case 'SEX': {
        n.dung = true;
        const v = giaTriChu(n).toUpperCase();
        p.sex = (v === 'M' || v === 'F') ? v : 'U';
        break;
      }
      case 'BIRT': n.dung = true; p.birth = docSuKien(n); break;
      case 'DEAT': n.dung = true; coChet = true; p.death = docSuKien(n); break;
      case 'BURI': n.dung = true; p.burialPlace = docNoiChon(n); break;
      case 'RESI': n.dung = true; p.residence = docNoiChon(n) || giaTriChu(n); break;
      case 'TITL': n.dung = true; p.title = giaTriChu(n); break;
      case 'OCCU': n.dung = true; p.occupation = giaTriChu(n); break;
      case 'EDUC': n.dung = true; p.education = giaTriChu(n); break;
      case 'RELI': n.dung = true; p.religion = giaTriChu(n); break;
      case 'NATI': n.dung = true; p.nationality = giaTriChu(n); break;
      case 'NOTE': n.dung = true; p.note = gopChu(p.note, giaTriChu(n)); break;
      case '_DOI': {
        n.dung = true;
        const s = Number(giaTriChu(n));
        if (Number.isInteger(s) && s > 0) vn.generation = s;
        break;
      }
      case '_CHI': n.dung = true; if (giaTriChu(n)) vn.branch = giaTriChu(n); break;
      case '_GIO': n.dung = true; if (giaTriChu(n)) vn.gio = giaTriChu(n); break;
      case 'RESN':
        n.dung = true;
        if (giaTriChu(n).toLowerCase() === 'privacy') gom.soAn++;
        break;
      case 'OBJE':
        n.dung = true;
        gom.anh.push(docAnh(n, p.id));
        break;
      case 'FAMS':
        n.dung = true;
        gom.fams.push({ personId: p.id, capXref: troToi(n) });
        break;
      case 'FAMC': {
        n.dung = true;
        const cQh = conThe(n, '_QUANHE');
        const cPedi = conThe(n, 'PEDI');
        if (cQh) cQh.dung = true;
        if (cPedi) cPedi.dung = true;
        // `_QUANHE` giữ MÃ GỐC đủ năm loại; `PEDI` là danh sách đóng bốn giá
        // trị của chuẩn. Ưu tiên `_QUANHE` vì nó nói được `step` và `thua_tu`,
        // hai loại mà `PEDI` không có chỗ đậu — xem bảng ánh xạ đầu file.
        const ma = (cQh ? giaTriChu(cQh) : '') ||
                   (cPedi ? giaTriChu(cPedi).toLowerCase() : '');
        gom.famc.push({ personId: p.id, capXref: troToi(n), relation: ma });
        break;
      }
      default: break;      // để `quetTheLa` nhặt
    }
  }

  // Không có `NAME` nào là ca THẬT — bản xuất bỏ hẳn thẻ khi cả ba phần tên
  // đều rỗng (`veTen`). Dựng lại mục `chinh` rỗng để giữ đúng quy ước 2 của
  // lược đồ: mảng `names` luôn có mục đầu, và mục đầu luôn là `chinh`.
  if (p.names.length === 0) {
    p.names.push({ type: 'chinh', surname: '', middle: '', given: '' });
  }
  if (coChet) p.living = false;
  if (Object.keys(vn).length > 0) p.vn = vn;
  return p;
}

/**
 * Một thẻ `NAME`.
 *
 * `GIVN`/`SURN` là thứ MÁY đọc, dòng `NAME` với cặp gạch chéo là thứ NGƯỜI
 * đọc. Ưu tiên hai thẻ con vì chúng không mơ hồ; thiếu chúng thì mới bóc cặp
 * gạch chéo. Không có cả hai đường thì coi cả dòng là phần trước họ — sai ít
 * hơn là coi cả dòng là họ.
 */
function docTen(n, laDau) {
  const cSurn = conThe(n, 'SURN');
  const cGivn = conThe(n, 'GIVN');
  const cType = conThe(n, 'TYPE');
  if (cSurn) cSurn.dung = true;
  if (cGivn) cGivn.dung = true;
  if (cType) cType.dung = true;

  let ho = cSurn ? giaTriChu(cSurn) : '';
  let truoc = cGivn ? giaTriChu(cGivn) : '';

  if (!cSurn || !cGivn) {
    const tho = giaTriChu(n);
    const m = tho.match(/^([^/]*)\/([^/]*)\/([\s\S]*)$/);
    if (m) {
      if (!cGivn) truoc = (m[1].trim() + ' ' + m[3].trim()).trim();
      if (!cSurn) ho = m[2].trim();
    } else if (!cGivn) {
      truoc = tho;
    }
  }

  ho = ho.replace(/\s+/g, ' ').trim();
  truoc = truoc.replace(/\s+/g, ' ').trim();

  const loai = laDau
    ? 'chinh'
    : ((cType ? giaTriChu(cType) : '') || 'khac');

  if (ho === '' && truoc === '') {
    return laDau ? { type: 'chinh', surname: '', middle: '', given: '' } : null;
  }

  // Người Việt đọc HỌ · ĐỆM · TÊN, và tên riêng là chữ CUỐI. Bản xuất ghép
  // `[middle, given]` bằng một khoảng trắng, nên bóc ngược đúng chỗ ấy.
  const manh = truoc === '' ? [] : truoc.split(' ');
  const rieng = manh.length > 0 ? manh[manh.length - 1] : '';
  const dem = manh.slice(0, -1).join(' ');
  return { type: loai, surname: ho, middle: dem, given: rieng };
}

function docSuKien(n) {
  const k = khoiNgayRong();

  const cDate = conThe(n, 'DATE');
  if (cDate) {
    cDate.dung = true;
    const d = docNgayGedcom(giaTriChu(cDate));
    k.iso = d.iso;
    k.raw = d.raw;
  }
  const cPlac = conThe(n, 'PLAC');
  if (cPlac) { cPlac.dung = true; k.place = giaTriChu(cPlac); }

  // `NOTE Nguyên văn: …` là quy ước của chính bản xuất (`veSuKien`) — trả nó
  // về đúng chỗ cũ là `raw`, đừng để nó nằm lại thành một ghi chú rời.
  for (const c of moiCon(n, 'NOTE')) {
    const v = giaTriChu(c);
    const m = v.match(/^Nguyên văn:\s*([\s\S]+)$/);
    if (m) { c.dung = true; k.raw = m[1].trim(); }
  }
  return k;
}

/** Thẻ sự kiện chỉ lấy nơi chốn: `BURI`, `RESI`. */
function docNoiChon(n) {
  const cPlac = conThe(n, 'PLAC');
  if (!cPlac) return '';
  cPlac.dung = true;
  return giaTriChu(cPlac);
}

function docAnh(n, chuThe) {
  const cFile = conThe(n, 'FILE');
  const cTitl = conThe(n, 'TITL') || (cFile ? conThe(cFile, 'TITL') : null);
  const cForm = conThe(n, 'FORM') || (cFile ? conThe(cFile, 'FORM') : null);
  if (cFile) cFile.dung = true;
  if (cTitl) cTitl.dung = true;
  if (cForm) cForm.dung = true;
  return {
    chuThe,
    duongDan: cFile ? giaTriChu(cFile) : '',
    caption: cTitl ? giaTriChu(cTitl) : '',
  };
}

function docCap(r, gom) {
  const tho = {
    id: r.ma,
    banDoiXref: [],
    conXref: [],
    status: '',
    marriage: khoiNgayRong(),
    note: '',
    rank: 0,
  };
  let coLyHon = false;

  for (const n of r.con) {
    switch (n.the) {
      // Thứ tự đọc chính là thứ tự đứng trên sơ đồ: `HUSB` rồi `WIFE` rồi
      // phần thừa. Đây là chỗ ánh xạ NGƯỢC của `chiaVaiTro` — cả app chỉ có
      // hai chỗ này biết tới hai chữ `husband`/`wife`.
      case 'HUSB':
      case 'WIFE':
      case '_BANDOI':
        n.dung = true;
        tho.banDoiXref.push(troToi(n));
        break;
      case 'CHIL':
        n.dung = true;
        tho.conXref.push(troToi(n));
        break;
      case 'MARR': n.dung = true; tho.marriage = docSuKien(n); break;
      case 'DIV': n.dung = true; coLyHon = true; break;
      case '_TRANGTHAI': n.dung = true; tho.status = giaTriChu(n); break;
      case '_RANK': {
        n.dung = true;
        const s = Number(giaTriChu(n));
        if (Number.isInteger(s) && s > 0) tho.rank = s;
        break;
      }
      case 'NOTE': n.dung = true; tho.note = gopChu(tho.note, giaTriChu(n)); break;
      case 'RESN': n.dung = true; break;
      default: break;
    }
  }

  // `_TRANGTHAI` nói rõ hơn `DIV Y` nên nó thắng; chỉ khi vắng `_TRANGTHAI`
  // mới suy từ `DIV`. File của phần mềm khác chỉ có `DIV`, và đó chính là ca
  // mà dòng này tồn tại để phục vụ.
  if (tho.status === '' && coLyHon) tho.status = 'divorced';
  if (tho.status === '') tho.status = 'married';
  return tho;
}

function docNguon(r) {
  const s = { id: r.ma, title: '', author: '', note: '' };
  for (const n of r.con) {
    switch (n.the) {
      case 'TITL': n.dung = true; s.title = giaTriChu(n); break;
      case 'AUTH': n.dung = true; s.author = giaTriChu(n); break;
      case 'NOTE': n.dung = true; s.note = gopChu(s.note, giaTriChu(n)); break;
      default: break;
    }
  }
  return s;
}

// ============================================================
// 2d. Nối hai phía — chỗ file hay lệch nhất
// ============================================================

/**
 * Ghép `FAM` với `INDI` thành mảng `unions` đúng lược đồ app.
 *
 * Bản xuất ghi mối cha mẹ–con ở CẢ HAI phía (`FAM.CHIL` và `INDI.FAMC`), và
 * chuẩn 5.5.1 bắt buộc như vậy. Nhưng file của phần mềm khác lệch thường
 * xuyên, và lệch theo cả hai chiều. Luật ở đây:
 *
 * - Thứ tự anh em lấy theo `FAM.CHIL` — đó là nơi DUY NHẤT nói được thứ tự.
 * - Mã quan hệ lấy theo `INDI.FAMC` — đó là nơi chuẩn đặt `PEDI`.
 * - Bên nào có mà bên kia không có thì **vẫn nhận**, và đếm ra một dòng cảnh
 *   báo. Bỏ im một phía là mất một mối quan hệ có thật mà không ai biết.
 * - Con trỏ trỏ vào bản ghi không tồn tại thì bỏ, và cũng đếm ra.
 */
function noiCapVaNguoi(thoCap, bang, coNguoi, gom) {
  const canhBao = [];
  const theoMa = new Map(thoCap.map((c) => [c.id, c]));

  const doi = (xref) => {
    const ma = bang.get(xref);
    return ma || (isValidId(String(xref).toUpperCase()) ? String(xref).toUpperCase() : '');
  };

  let hutTro = 0;
  let lechFamc = 0;
  let lechFams = 0;

  // --- Quan hệ, khoá theo "cặp|người" ---
  const quanHe = new Map();
  for (const f of gom.famc) {
    const uid = doi(f.capXref);
    if (!uid || !theoMa.has(uid)) { hutTro++; continue; }
    quanHe.set(uid + '|' + f.personId, f.relation);
  }

  const unions = [];
  for (const c of thoCap) {
    const banDoi = [];
    for (const x of c.banDoiXref) {
      const id = doi(x);
      if (!id || !coNguoi.has(id)) { hutTro++; continue; }
      if (banDoi.indexOf(id) === -1) banDoi.push(id);
    }

    const con = [];
    const daCo = new Set();
    for (const x of c.conXref) {
      const id = doi(x);
      if (!id || !coNguoi.has(id)) { hutTro++; continue; }
      if (daCo.has(id)) continue;
      daCo.add(id);
      con.push({ personId: id, relation: '', order: con.length + 1 });
    }

    // Người nói mình là con của cặp này, mà cặp thì không kể tên: vẫn nhận,
    // xếp cuối. Xếp cuối chứ không xen giữa — không có căn cứ nào để xen.
    for (const f of gom.famc) {
      const uid = doi(f.capXref);
      if (uid !== c.id) continue;
      if (!coNguoi.has(f.personId) || daCo.has(f.personId)) continue;
      daCo.add(f.personId);
      con.push({ personId: f.personId, relation: '', order: con.length + 1 });
      lechFamc++;
    }

    for (const k of con) {
      const ma = quanHe.get(c.id + '|' + k.personId) || '';
      k.relation = QUAN_HE_NHAP.indexOf(ma) >= 0 ? ma : 'birth';
    }

    const u = {
      id: c.id,
      partners: banDoi,
      partnerOrder: banDoi.slice(),
      status: c.status,
      marriage: c.marriage,
      children: con,
      note: c.note,
      deleted: false,
    };
    // `_RANK` của bản xuất là MỘT số cho cả cặp — lược đồ cũ. Giữ nguyên nó ở
    // trường `rank`, đúng chỗ mà cầu tạm `rankCua()` đang đọc. Bịa ra một
    // bảng `ranks` khoá theo người từ một con số không nói của ai là dựng ra
    // một sự thật mà file không hề chứa.
    if (c.rank > 0) u.rank = c.rank;
    unions.push(u);
  }

  // Người nói mình là vợ/chồng trong một cặp mà cặp không kể tên.
  const theoUnion = new Map(unions.map((u) => [u.id, u]));
  for (const f of gom.fams) {
    const uid = doi(f.capXref);
    const u = theoUnion.get(uid);
    if (!u) { hutTro++; continue; }
    if (!coNguoi.has(f.personId) || u.partners.indexOf(f.personId) >= 0) continue;
    u.partners.push(f.personId);
    u.partnerOrder.push(f.personId);
    lechFams++;
  }

  // Cặp không còn ai và không có con thì nó không phải một cặp nữa — cùng
  // đúng phép lọc mà `exportGedcom` dùng ở chiều ngược lại.
  const giu = unions.filter((u) => u.partners.length > 0 || u.children.length > 0);
  const boBot = unions.length - giu.length;

  if (hutTro > 0) {
    canhBao.push({
      muc: 'nang',
      chu: hutTro + ' con trỏ trỏ vào bản ghi không có trong file, đã bỏ. ' +
           'File gốc thiếu người hoặc thiếu gia đình.',
    });
  }
  if (lechFamc > 0 || lechFams > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: (lechFamc + lechFams) + ' mối quan hệ chỉ được ghi ở MỘT phía của ' +
           'file (bản ghi người có, bản ghi gia đình không). Đã nhận, và xếp ' +
           'người ấy vào cuối.',
    });
  }
  if (boBot > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: boBot + ' gia đình rỗng — không còn vợ chồng lẫn con — đã bỏ.',
    });
  }
  return { unions: giu, canhBao };
}

// ============================================================
// 2e. Ngày tháng: GEDCOM -> {iso, raw}
// ============================================================

/**
 * Chiều ngược của `ngayGedcom`. Bốn đường ra, và đường thứ tư mới là đường
 * hay gặp nhất khi nhập file của phần mềm khác:
 *
 *   "12 MAR 1948"        -> iso "1948-03-12", raw ""
 *   "(năm Bính Tý)"      -> iso "",           raw "năm Bính Tý"
 *   "ABT 1890"           -> iso "1890",       raw "khoảng 1890"
 *   "BET 1890 AND 1895"  -> iso "1890",       raw "giữa 1890 và 1895"
 *
 * ⚠ Giữ `iso` cả ở hai ca cuối là có chủ ý: `formatDate` bày `raw` cho người
 * đọc, còn `mocNgay`/`calcAge` cần `iso` để sắp xếp và tính tuổi. Bỏ `iso` đi
 * thì cụ "khoảng 1890" biến mất khỏi mọi phép sắp theo thời gian.
 */
function docNgayGedcom(v) {
  // Ngoặc lịch `@#DGREGORIAN@` đứng đầu — app chỉ dùng dương lịch, bỏ đi.
  const s = String(v || '').replace(/^@#[^@]*@\s*/, '').trim();
  if (s === '') return { iso: '', raw: '' };

  const ngoac = s.match(/^\(([\s\S]*)\)$/);
  if (ngoac) return { iso: '', raw: ngoac[1].trim() };

  const don = ngayDonGedcom(s);
  if (don) return { iso: don, raw: '' };

  let m = s.match(/^(?:BET|BETWEEN)\s+([\s\S]+?)\s+AND\s+([\s\S]+)$/i);
  if (m) return khoangNgay('giữa', 'và', m[1], m[2]);
  m = s.match(/^FROM\s+([\s\S]+?)\s+TO\s+([\s\S]+)$/i);
  if (m) return khoangNgay('từ', 'đến', m[1], m[2]);
  m = s.match(/^FROM\s+([\s\S]+)$/i);
  if (m) return motDauNgay('từ', m[1]);
  m = s.match(/^TO\s+([\s\S]+)$/i);
  if (m) return motDauNgay('đến', m[1]);
  m = s.match(/^(ABT|ABOUT|EST|CAL|BEF|BEFORE|AFT|AFTER|INT)\s+([\s\S]+)$/i);
  if (m) return motDauNgay(TIEN_TO_NGAY[m[1].toUpperCase()] || '', m[2]);

  // Không đọc được thì GIỮ NGUYÊN VĂN, đừng đoán. Một chuỗi lạ nằm ở `raw`
  // thì người trong họ còn đọc ra được; đoán bừa thành một năm sai thì không
  // ai biết đường mà lần lại.
  return { iso: '', raw: s };
}

function motDauNgay(chu, phan) {
  const t = String(phan).trim();
  const iso = ngayDonGedcom(t);
  const doc = iso ? formatDate({ iso, raw: '' }) : t;
  return { iso: iso || '', raw: (chu ? chu + ' ' : '') + doc };
}

function khoangNgay(truoc, giua, x, y) {
  const tx = String(x).trim();
  const ty = String(y).trim();
  const ix = ngayDonGedcom(tx);
  const iy = ngayDonGedcom(ty);
  return {
    iso: ix || iy || '',
    raw: truoc + ' ' + (ix ? formatDate({ iso: ix, raw: '' }) : tx) +
         ' ' + giua + ' ' + (iy ? formatDate({ iso: iy, raw: '' }) : ty),
  };
}

/** Một mốc GEDCOM đơn giản, không tiền tố. Không đọc được thì trả chuỗi rỗng. */
function ngayDonGedcom(s) {
  const t = String(s || '').trim().toUpperCase();
  let m = t.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/);
  if (m && THANG_SO[m[2]]) return ghepIsoGedcom(m[3], THANG_SO[m[2]], Number(m[1]));
  m = t.match(/^([A-Z]{3})\s+(\d{3,4})$/);
  if (m && THANG_SO[m[1]]) return ghepIsoGedcom(m[2], THANG_SO[m[1]], 0);
  m = t.match(/^(\d{3,4})$/);
  if (m) return ghepIsoGedcom(m[1], 0, 0);
  return '';
}

function ghepIsoGedcom(nam, thang, ngay) {
  const hai = (n) => String(n).padStart(2, '0');
  const n = String(Number(nam)).padStart(4, '0');
  if (!thang) return n;
  if (!ngay) return n + '-' + hai(thang);
  return n + '-' + hai(thang) + '-' + hai(ngay);
}

// ============================================================
// 2f. Mấy phép nhỏ của đường nhập
// ============================================================

/**
 * Đếm mọi thẻ KHÔNG được đọc — chính là danh sách thứ sẽ mất khi nhập.
 *
 * Đệ quy, và có `visited` bằng chính hình dáng của cây: `docCayGedcom` dựng
 * cây từ một ngăn xếp nên không nút nào có hai cha, không có vòng. Đây là ca
 * hiếm mà `CLAUDE.md` mục 7 không đòi tập `visited` — vì đây không phải đồ
 * thị gia phả.
 */
function quetTheLa(nut, dem) {
  for (const c of nut.con) {
    if (!c.dung) themDem(dem, c.the);
    quetTheLa(c, dem);
  }
}

function themDem(dem, the) {
  dem.set(the, (dem.get(the) || 0) + 1);
}

function keTheLa(theLa) {
  const dau = theLa.slice(0, 5).map((x) => x.the + ' (' + x.so + ')');
  return dau.join(', ') + (theLa.length > 5 ? ', và ' + (theLa.length - 5) + ' loại nữa' : '');
}

function tenCayTuFile(head, subm) {
  if (subm) {
    const c = conThe(subm, 'NAME');
    if (c) { c.dung = true; const v = giaTriChu(c); if (v) return v; }
  }
  if (head) {
    const c = conThe(head, 'NOTE');
    if (c) {
      c.dung = true;
      const dong1 = giaTriChu(c).split('\n')[0].trim();
      if (dong1 && !/^Xuất lúc /.test(dong1)) return dong1;
    }
  }
  return '';
}

function nguonTuHead(head) {
  if (!head) return '';
  const c = conThe(head, 'SOUR');
  if (!c) return '';
  c.dung = true;
  const cName = conThe(c, 'NAME');
  if (cName) cName.dung = true;
  return (cName ? giaTriChu(cName) : '') || giaTriChu(c);
}

function conThe(nut, the) {
  if (!nut) return null;
  for (const c of nut.con) if (c.the === the) return c;
  return null;
}

function moiCon(nut, the) {
  if (!nut) return [];
  return nut.con.filter((c) => c.the === the);
}

/** `@P0001@` -> `P0001`. Không phải con trỏ thì trả chuỗi rỗng. */
function troToi(nut) {
  const v = nut && typeof nut.giaTri === 'string' ? nut.giaTri.trim() : '';
  const m = v.match(/^@([^@]+)@$/);
  return m ? m[1].trim() : '';
}

/**
 * Giá trị của một nút, đã gỡ `@@` về `@`.
 *
 * Con trỏ `@P0001@` KHÔNG gỡ: dấu `@` của nó không phải dấu nhân đôi, gỡ vào
 * là hỏng chính cái con trỏ.
 */
function giaTriChu(nut) {
  const v = nut && typeof nut.giaTri === 'string' ? nut.giaTri : '';
  if (/^@[^@]+@$/.test(v.trim())) return v.trim();
  return v.replace(/@@/g, '@').trim();
}

function gopChu(cu, moi) {
  if (moi === '') return cu;
  return cu === '' ? moi : cu + '\n' + moi;
}

function khoiNgayRong() {
  return { iso: '', raw: '', place: '' };
}

function catNgan(s, n) {
  const t = String(s || '');
  return t.length <= n ? t : t.slice(0, n) + '…';
}

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
  // để xuất ra một cái tên trống (`CAU-TRUC-DU-LIEU_V05`, quy ước 2).
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
