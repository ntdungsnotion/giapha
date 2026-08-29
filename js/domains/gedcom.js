// ============================================================
// giapha · js/domains/gedcom.js
// Vai trò  : Xuất gia phả ra GEDCOM 5.5.1, và ĐỌC file .ged thành bản xem trước
// Lớp      : domains — HÀM THUẦN, không chạm DOM, không gọi services
// Phụ thuộc: utils/date, utils/text, utils/id, config, domains/union
// Phiên bản: 1.7.0 · Cập nhật: 29/08/2026 19:30
// ============================================================
//
// XUẤT: GEDCOM 5.5.1. Cũ hơn 7.0 nhưng gần như mọi phần mềm gia phả đọc được.
//       Mục đích xuất là để dữ liệu ĐI ĐƯỢC SANG NƠI KHÁC, nên tương thích
//       rộng quan trọng hơn hiện đại.
// NHẬP: hai chế độ. `parseGedcom` đọc file thành bản XEM TRƯỚC và KHÔNG ghi
//       vào đâu cả. `mergeImported` đổ vào một gia phả MỚI (xong 29/08/2026).
//       `detectDuplicates` dò trùng cho chế độ BỔ SUNG vào gia phả đang mở,
//       và `goiYCapTheoNguoi` suy ra điểm neo GIA ĐÌNH từ bản đồ NGƯỜI mà
//       con người đã duyệt — phần trộn của chế độ ấy còn là khung. Xuất đứng trước nhập vì xuất chỉ
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
import { coGiaTri, fullName } from '../utils/text.js';
import { isValidId, loaiCua, maCayCua, maCayCuaCay, chuanUid }
  from '../utils/id.js';
import { QUAN_HE_CON_NHAN, nhanQuanHeCon, nhanTrangThaiCap } from '../config.js';
import { ranksRoRang } from './union.js';

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
// 2. NHẬP — việc 11: ĐỌC và XEM TRƯỚC
// ============================================================
//
// ⚠ `parseGedcom` KHÔNG ghi vào đâu cả. Nó nhận một chuỗi và trả về một bản
// xem trước. `detectDuplicates` cũng chỉ ĐỌC — nó bày ra chỗ lệch chứ không
// quyết. `mergeImported` là hàm duy nhất trong file này đụng vào dữ liệu.
// Thứ tự ấy là chủ ý: nhập là đường MỘT CHIỀU, nên phần KHÔNG mất gì nếu sai
// được làm trước và làm xong hẳn.
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
 *   tenCay: string, nguonXuat: string, maNguon: string,
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
    maNguon: maNguonTuHead(head),
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

// ============================================================
// DÒ TRÙNG — việc 11, chế độ BỔ SUNG
// ============================================================
//
// Chỉ chế độ *bổ sung vào gia phả đang mở* cần tới phần này; chế độ *tạo gia
// phả mới* ghi vào một cây rỗng nên không có gì để đối chiếu.
//
// --- Nhận nhau bằng MÃ, không bằng tên (chủ dự án chốt 29/08/2026) -------
//
// Hỏi: *"dựa vào đâu để nghi hai bản ghi là cùng một người"*. Chủ dự án đáp:
// **"id của người, gia đình"**.
//
// Đúng với ca dùng thật, và ca dùng thật chỉ có một: xuất gia phả này ra
// `.ged` → ai đó sửa/thêm ở phần mềm khác → nhập lại để cập nhật. Luật b56
// *giữ nguyên mã nếu mã đúng khuôn app* làm cho vòng ấy khép kín — `P0004`
// đi ra rồi về vẫn là `P0004`.
//
// So bằng TÊN thì sao? Màn Rà soát đã so bằng tên (`checkDuplicate`: trùng
// tên + trùng năm sinh). Nó hợp ở đó vì nó chỉ CẢNH BÁO. Ở đây kết luận dẫn
// tới một lần ghi không lùi lại được, mà trong một dòng họ thì cháu mang tên
// ông là tục lệ chứ không phải lỗi — nhận nhầm hai người thành một là nhập
// đời cháu đè lên đời ông.
//
// --- ⚠ Chỗ hở của phép nhận theo mã, và cách bịt --------------------------
//
// Mã chỉ chắc chắn khi file đến TỪ CHÍNH gia phả này. Hai gia phả khác nhau
// đều bắt đầu từ `P0001`, nên nhập nhầm file của họ khác vào sẽ ra hàng loạt
// ca *"trùng mã, khác hẳn người"*.
//
// Hàm này KHÔNG tự đoán và KHÔNG tự chặn. Nó làm hai việc:
//
// 1. mỗi ca đều mang sẵn **tên hai bên** (`tenDangCo` / `tenTrongFile`), để
//    màn duyệt bày cạnh nhau — nhìn phát biết ngay là nhầm file;
// 2. đếm riêng số ca **khác tên chính** (`thongKe.soKhacTen`), để màn hình nói
//    thẳng được *"40/45 ca trùng mã nhưng khác tên — nhiều khả năng đây là
//    file của gia phả khác"* trước khi người dùng bấm bất cứ nút nào.
//
// Quyết cuối cùng vẫn là của người, từng ca một. Đó là chỗ chốt chặn thật.
//
// --- Hàm này KHÔNG quyết, nó chỉ BÀY ------------------------------------
//
// Nó không trộn, không chọn hộ, không sắp thứ tự ưu tiên. Nó trả ra ba thứ
// rời nhau: ca trùng mã · bản ghi mới hẳn · và với mỗi ca trùng thì đúng hai
// danh sách — `boSung` (ô cây đang TRỐNG mà file có chữ) và `mauThuan` (hai
// bên đều có chữ mà khác nhau). Đúng như chủ dự án đặt: *"liệt kê sự thay
// đổi = mâu thuẫn để người nhập chọn cập nhật cái gì, trường hợp dữ liệu gốc
// không có thông tin thì hiển nhiên là bổ sung, liệt kê những nội dung bổ
// sung cho người dùng biết"*.

/** Đọc một trường ra CHỮ NGƯỜI ĐỌC ĐƯỢC. Rỗng nghĩa là ô ấy đang trống. */
const TRUONG_NGUOI = [
  { truong: 'ten',         nhan: 'Tên chính',  doc: (p) => fullName(p) },
  { truong: 'tenKhac',     nhan: 'Tên khác',   doc: (p) => tenKhacCua(p) },
  { truong: 'sex',         nhan: 'Giới tính',  doc: (p) => GIOI_CHU[p.sex] || '' },
  { truong: 'birth',       nhan: 'Ngày sinh',  doc: (p) => formatDate(p.birth) },
  { truong: 'birthPlace',  nhan: 'Nơi sinh',   doc: (p) => noiCua(p.birth) },
  { truong: 'death',       nhan: 'Ngày mất',   doc: (p) => formatDate(p.death) },
  { truong: 'deathPlace',  nhan: 'Nơi mất',    doc: (p) => noiCua(p.death) },
  { truong: 'burialPlace', nhan: 'An táng',    doc: (p) => chu(p.burialPlace) },
  { truong: 'title',       nhan: 'Chức tước',  doc: (p) => chu(p.title) },
  { truong: 'occupation',  nhan: 'Nghề nghiệp', doc: (p) => chu(p.occupation) },
  { truong: 'education',   nhan: 'Học vấn',    doc: (p) => chu(p.education) },
  { truong: 'religion',    nhan: 'Tôn giáo',   doc: (p) => chu(p.religion) },
  { truong: 'residence',   nhan: 'Quê quán',   doc: (p) => chu(p.residence) },
  { truong: 'nationality', nhan: 'Dân tộc',    doc: (p) => chu(p.nationality) },
  { truong: 'doi',         nhan: 'Đời',        doc: (p) => soDoiCua(p) },
  { truong: 'chi',         nhan: 'Chi / nhánh', doc: (p) => chu(p.vn && p.vn.branch) },
  { truong: 'gio',         nhan: 'Ngày giỗ',   doc: (p) => chu(p.vn && p.vn.gio) },
  { truong: 'note',        nhan: 'Ghi chú',    doc: (p) => chu(p.note) },
  // `living` KHÔNG đứng trong bảng này — xem `dongConSong()`. Nó là hệ quả
  // của ngày mất, và bày cả hai là bắt người dùng trả lời một câu hai lần.
];

const TRUONG_CAP = [
  { truong: 'status',        nhan: 'Tình trạng', doc: (u) => nhanTrangThaiCap(u.status) },
  { truong: 'marriage',      nhan: 'Ngày cưới',  doc: (u) => formatDate(u.marriage) },
  { truong: 'marriagePlace', nhan: 'Nơi cưới',   doc: (u) => noiCua(u.marriage) },
  { truong: 'note',          nhan: 'Ghi chú',    doc: (u) => chu(u.note) },
];

const GIOI_CHU = { M: 'Nam', F: 'Nữ' };

/**
 * Dò bản ghi trùng giữa dữ liệu nhập vào và cây hiện có.
 *
 * HÀM THUẦN: không đụng vào `tree` lẫn `imported`, không đọc đồng hồ, không
 * chạm DOM. Cùng hai tham số vào thì luôn ra cùng một kết quả.
 *
 * --- ĐIỂM NEO: mã nào được phép kết luận, mã nào không -------------------
 *
 * Không phải mã nào trong `imported` cũng là mã CỦA FILE. `parseGedcom` cấp
 * mã mới cho bản ghi không đúng khuôn app — `@I1@` của PAF và `@I0001@` của
 * Gramps đều thành `P0001`. Lấy mã ấy làm neo là kết luận hai người **khác
 * hẳn nhau** là một, chỉ vì cả hai tình cờ đứng đầu file mình.
 *
 * Đo thật 29/08/2026: nhập file PAF (Nguyễn Trọng Bậc, Vũ Thị Ngọc) rồi nhập
 * tiếp file Gramps (Lê Văn Trác, Trần Thị Mai) vào cùng cây — bản trước hàm
 * này báo *2 ca trùng · 0 người mới*. Thứ duy nhất chặn một lần gộp sai là
 * dòng cảnh báo "khác tên", tức là một CON NGƯỜI đọc và bắt được.
 *
 * Nên mã chỉ được làm neo trong đúng hai ca, và cả hai đều là *"mã này đi ra
 * từ chính cây này"*:
 *
 *   · `uid`    — mã bền đi theo con người (`_UID`), tầng neo MẠNH NHẤT và là
 *                tầng duy nhất còn ăn khi file đến từ phần mềm khác. Khớp
 *                bằng `uid` thì mã hai bên khác nhau là chuyện thường — mã
 *                của cây đích nằm ở `id`, mã trong file nằm ở `idTrongFile`.
 *   · `ma-cay` — mã mang mã cây trùng mã cây của cây đích (`NTBK6W4_P0004`).
 *   · `ma-cu`  — mã đời cũ không mang mã cây, VÀ file khai `SOUR GIAPHA`, tức
 *                do chính app này xuất ra trước ngày có mã cây.
 *
 * Mọi bản ghi còn lại rơi vào `nguoiChuaNeo`/`capChuaNeo`: **không kết luận
 * gì cả**, để dành cho bảng ghép đôi hai cột — người dùng chỉ ra ai là ai,
 * rồi cặp ấy được ghi lại làm điểm neo cho lần nhập sau. Không kết luận vẫn
 * hơn kết luận sai, vì nhập là đường một chiều.
 *
 * --- LUẬT ĐIỂM NEO ĐẦU TIÊN (chủ dự án chốt 29/08/2026) ------------------
 *
 * **Người nhập BẮT BUỘC khai tay ít nhất một điểm neo, và điểm ấy app KHÔNG
 * được tự xác định.** Chưa khai thì hàm này không kết luận một ca trùng nào —
 * `caTrung` rỗng, mọi bản ghi nằm ở `nguoiChuaNeo`/`capChuaNeo`, và
 * `duocTron` là `false`.
 *
 * ⚠ Chưa khai thì cũng KHÔNG bày đề xuất. Đây là chỗ dễ làm hỏng luật nhất mà
 * vẫn tưởng đang tuân thủ: bày sẵn 40 dòng app đoán rồi mời người dùng xác
 * nhận một dòng thì "khai tay" tụt xuống thành "bấm Đồng ý", và cái app đoán
 * sai vẫn trôi qua. Muốn người ta thật sự nhìn thì cột phải phải TRỐNG.
 *
 * Điểm neo tay làm hai việc, và việc thứ hai mới là việc quý:
 *
 * 1. Chặn ca nhập nhầm hẳn file của dòng họ khác — không tìm nổi một người
 *    chung nào thì file ấy không có lý do gì để trộn vào cây này.
 * 2. **Làm phép thử ngược cho chính máy.** Người khai *file X là người Y*, mà
 *    `uid`/mã của X lại chỉ sang người Z — thì một trong hai bên sai, và hàm
 *    DỪNG (`lyDoChan: 'neoMauThuan'`) chứ không lặng lẽ chọn bên nào. Không có
 *    điểm neo tay thì mâu thuẫn này vĩnh viễn không ai phát hiện.
 *
 * --- `khaiMoi`: vế thứ hai của bảng ghép đôi (29/08/2026) ----------------
 *
 * Bảng hai cột có ĐÚNG HAI câu trả lời, không phải một: *"người này là ai
 * trong cây"* và *"người này CHƯA CÓ trong cây"*. Vế thứ hai cũng là một lời
 * khẳng định của con người, nên nó đi cùng cửa với `diemNeoTay`:
 *
 * - Khai `khaiMoi` mà không neo được → rơi vào `nguoiMoi`/`capMoi`, tức người
 *   dùng đã kết luận thay cho máy. Không khai thì vẫn là `chuaNeo` như cũ —
 *   luật *"không đủ căn cứ thì không kết luận"* của b60 giữ nguyên.
 * - **Phép thử ngược chạy cả chiều này**: khai *"chưa có trong cây"* mà `uid`
 *   hoặc mã của bản ghi ấy lại chỉ đúng vào một người đang có → DỪNG. Đây là
 *   ca đắt nhất của cả đường nhập, vì nó đẻ ra một người thứ hai mang cùng
 *   một con người, và không có nút hoàn tác.
 * - Một bản ghi khai cả hai vế là một lỗi gõ → `neoSai`, chặn cả lần nhập.
 *
 * ⚠ `khaiMoi` KHÔNG mở được cửa: khai cả file là "người mới" mà không có một
 * điểm neo tay nào thì vẫn bị chặn ở `chuaKhaiDiemNeo`. Đó đúng là việc thứ
 * nhất của luật điểm neo — chặn ca nhập nhầm file của dòng họ khác.
 *
 * @param {object} tree      cây đích — gia phả đang mở
 * @param {object} imported  kết quả `parseGedcom`
 * @param {{diemNeoTay?: {trongFile:string, trongCay:string}[],
 *          khaiMoi?: string[]}} [tuyChon]
 *        `diemNeoTay` là những cặp NGƯỜI DÙNG tự chỉ ra. Thiếu là bị chặn.
 *        `khaiMoi` là những mã TRONG FILE người dùng khai là chưa có trong cây.
 * @returns {{
 *   ok: boolean, lyDo: string, loi: string,
 *   caTrung: {
 *     kieu: 'nguoi'|'giadinh', id: string,
 *     tenDangCo: string, tenTrongFile: string,
 *     khacTen: boolean, daXoa: boolean, giongHet: boolean,
 *     boSung:   {truong:string, nhan:string, giaTri:string}[],
 *     mauThuan: {truong:string, nhan:string, dangCo:string, trongFile:string}[],
 *     neo: 'tay'|'uid'|'ma-cay'|'ma-cu', idTrongFile: string
 *   }[],
 *   nguoiMoi: string[], capMoi: string[],
 *   duocTron: boolean,
 *   lyDoChan: ''|'cayRong'|'chuaKhaiDiemNeo'|'neoSai'|'neoMauThuan',
 *   neoTay: {trongFile:string, trongCay:string}[],
 *   loiNeoTay: {trongFile:string, trongCay:string, vi:string}[],
 *   nguoiChuaNeo: string[], capChuaNeo: string[],
 *   thongKe: {soCaTrung:number, soCaNguoi:number, soCaCap:number,
 *             soGiongHet:number, soKhacTen:number, soDaXoa:number,
 *             soBoSung:number, soMauThuan:number,
 *             soNguoiMoi:number, soCapMoi:number, soChuaNeo:number,
 *             soNeoTay:number}
 * }}
 */
export function detectDuplicates(tree, imported, tuyChon) {
  const thua = (lyDo, loi) => ({
    ok: false, lyDo, loi,
    caTrung: [], nguoiMoi: [], capMoi: [],
    duocTron: false, lyDoChan: 'khongdocduoc', neoTay: [], loiNeoTay: [],
    nguoiChuaNeo: [], capChuaNeo: [], thongKe: thongKeRong(),
  });

  if (!tree || typeof tree !== 'object') return thua('khongcocay', 'Chưa nạp được gia phả đích.');
  if (!imported || !Array.isArray(imported.persons)) {
    return thua('khongdocduoc', 'Chưa đọc được file nên chưa dò được gì.');
  }

  const nguoiCay = new Map();
  for (const p of mang(tree.persons)) if (p && chu(p.id)) nguoiCay.set(p.id, p);
  const capCay = new Map();
  for (const u of mang(tree.unions)) if (u && chu(u.id)) capCay.set(u.id, u);

  // Tên người dùng để KỂ RA một mã con — lấy được từ cả hai phía, vì một đứa
  // con mới trong file thì cây chưa biết nó là ai.
  const tenTheoMa = new Map();
  for (const p of mang(tree.persons)) if (p && chu(p.id)) tenTheoMa.set(p.id, fullName(p));
  for (const p of imported.persons) {
    if (p && chu(p.id) && !tenTheoMa.has(p.id)) tenTheoMa.set(p.id, fullName(p));
  }

  // Mã do CHÍNH `parseGedcom` cấp lúc nhập, không phải mã của file. Danh sách
  // này đã có sẵn từ b56 — tới hôm nay mới có ai đọc nó.
  const maAppTuCap = new Set();
  for (const cap of mang(imported.doiMa)) {
    if (Array.isArray(cap) && chu(cap[1])) maAppTuCap.add(chu(cap[1]));
  }
  const maCayTa   = maCayCuaCay(tree);
  const tuAppNay  = chu(imported.maNguon).toUpperCase() === 'GIAPHA';

  /** Mã này có đủ tư cách làm điểm neo không, và neo kiểu gì. */
  const neoCua = (id) => {
    if (maAppTuCap.has(id)) return '';
    const mc = maCayCua(id);
    if (mc) return mc === maCayTa ? 'ma-cay' : '';
    return tuAppNay ? 'ma-cu' : '';
  };

  // Tầng neo TRÊN mã: UID đi theo con người qua mọi phần mềm.
  const theoUid = new Map();
  for (const p of mang(tree.persons)) if (p && chu(p.uid)) theoUid.set(chu(p.uid), p);
  for (const u of mang(tree.unions))  if (u && chu(u.uid)) theoUid.set(chu(u.uid), u);

  // ---- Điểm neo TAY: luật 29/08/2026 ----------------------------------
  const nguoiFile = new Map();
  for (const p of imported.persons) if (p && chu(p.id)) nguoiFile.set(chu(p.id), p);
  const capFile = new Map();
  for (const u of mang(imported.unions)) if (u && chu(u.id)) capFile.set(chu(u.id), u);

  const { neoTay, loiNeoTay } = docNeoTay(
    tuyChon && tuyChon.diemNeoTay, nguoiCay, capCay, nguoiFile, capFile);

  const khaiMoi = docKhaiMoi(
    tuyChon && tuyChon.khaiMoi, neoTay, nguoiFile, capFile, loiNeoTay);

  const caTrung = [];
  const nguoiMoi = [];
  const capMoi = [];
  const nguoiChuaNeo = [];
  const capChuaNeo = [];

  // Chưa khai điểm neo nào thì KHÔNG kết luận gì, và cũng không đề xuất gì.
  // Trả về đủ danh sách hai bên để bảng ghép đôi có cái mà bày, thế thôi.
  if (neoTay.size === 0 || loiNeoTay.length > 0) {
    for (const id of nguoiFile.keys()) nguoiChuaNeo.push(id);
    for (const id of capFile.keys()) capChuaNeo.push(id);

    // Cây rỗng là ca riêng, và phải nói riêng: ở đây không phải người dùng
    // QUÊN khai điểm neo, mà là không có gì để khai. Bảo họ "hãy khai một
    // điểm neo" lúc cây chưa có ai là chỉ họ đi vào một cửa không mở được.
    // Cửa đúng là đường TẠO GIA PHẢ MỚI.
    const cayRong = nguoiCay.size === 0 && capCay.size === 0;
    return khungKetQua({
      caTrung, nguoiMoi, capMoi, nguoiChuaNeo, capChuaNeo,
      duocTron: false,
      lyDoChan: cayRong ? 'cayRong'
              : (loiNeoTay.length > 0 ? 'neoSai' : 'chuaKhaiDiemNeo'),
      neoTay: capNeoTay(neoTay), loiNeoTay,
    });
  }

  // Một bản ghi trong cây chỉ được ghép với ĐÚNG MỘT bản ghi của file. Hai
  // dòng cùng trỏ vào một người là hai lần ghi đè lên nhau, mà lần sau xoá
  // mất lần trước và không có gì báo.
  const daGhep = new Set();

  /**
   * Tìm bản ghi trong cây tương ứng, theo thứ tự neo mạnh → yếu.
   * @returns {{cu:object|null, neo:string}} `neo` rỗng nghĩa là KHÔNG neo được
   */
  const timBanCu = (banGhi, idFile, theoMa) => {
    // Tầng 0 — người dùng đã chỉ tận tay. Không gì đè lên được.
    const tay = neoTay.get(idFile);
    if (tay) {
      const cu = theoMa.get(tay);
      return cu && !daGhep.has(cu.id) ? { cu, neo: 'tay' } : { cu: null, neo: '' };
    }
    const uid = chu(banGhi && banGhi.uid);
    if (uid) {
      const cu = theoUid.get(uid);
      if (cu && !daGhep.has(cu.id)) return { cu, neo: 'uid' };
      if (cu) return { cu: null, neo: '' };
    }
    const neo = neoCua(idFile);
    if (!neo) return { cu: null, neo: '' };
    const cu = theoMa.get(idFile) || null;
    if (cu && daGhep.has(cu.id)) return { cu: null, neo: '' };
    return { cu, neo };
  };

  // Phép thử ngược: với mỗi điểm neo tay, hỏi xem máy TỰ nó sẽ chỉ vào ai.
  // Máy chỉ sang người khác nghĩa là một trong hai bên sai — dừng, không chọn.
  /** Máy TỰ nó sẽ chỉ bản ghi này vào ai — và bằng đường nào. */
  const mayChiVao = (idFile) => {
    const banGhi = nguoiFile.get(idFile) || capFile.get(idFile);
    const uid = chu(banGhi && banGhi.uid);
    const theoU = uid ? theoUid.get(uid) : null;
    if (theoU) return { cu: theoU, duong: 'mã bền (uid)' };
    if (!neoCua(idFile)) return { cu: null, duong: '' };
    const cu = nguoiCay.get(idFile) || capCay.get(idFile) || null;
    return cu ? { cu, duong: 'mã bản ghi' } : { cu: null, duong: '' };
  };

  const xungDot = [];
  for (const [idFile, idCay] of neoTay) {
    const { cu, duong } = mayChiVao(idFile);
    if (cu && cu.id !== idCay) {
      xungDot.push({
        trongFile: idFile, trongCay: idCay,
        vi: 'người khai đây là ' + idCay + ', nhưng ' + duong +
            ' của nó chỉ sang ' + cu.id + '.',
      });
    }
  }

  // Cùng phép thử ngược, chiều còn lại: khai "chưa có trong cây" mà máy lại
  // chỉ đúng vào một bản ghi đang có. Bỏ qua là đẻ ra một người thứ hai mang
  // cùng một con người — và nhập không có nút hoàn tác.
  for (const idFile of khaiMoi) {
    const { cu, duong } = mayChiVao(idFile);
    if (cu) {
      xungDot.push({
        trongFile: idFile, trongCay: cu.id,
        vi: 'người khai đây là bản ghi CHƯA CÓ trong cây, nhưng ' + duong +
            ' của nó chỉ sang ' + cu.id + ' đang có sẵn.',
      });
    }
  }
  if (xungDot.length > 0) {
    for (const id of nguoiFile.keys()) nguoiChuaNeo.push(id);
    for (const id of capFile.keys()) capChuaNeo.push(id);
    return khungKetQua({
      caTrung, nguoiMoi, capMoi, nguoiChuaNeo, capChuaNeo,
      duocTron: false, lyDoChan: 'neoMauThuan',
      neoTay: capNeoTay(neoTay), loiNeoTay: xungDot,
    });
  }

  for (const p of imported.persons) {
    const idFile = chu(p && p.id);
    if (!idFile) continue;
    const { cu, neo } = timBanCu(p, idFile, nguoiCay);
    if (!neo) { (khaiMoi.has(idFile) ? nguoiMoi : nguoiChuaNeo).push(idFile); continue; }
    if (!cu)  { nguoiMoi.push(idFile); continue; }
    daGhep.add(cu.id);
    caTrung.push(Object.assign(caNguoi(cu.id, cu, p), { neo, idTrongFile: idFile }));
  }

  // Bản đồ NGƯỜI của chính lần chạy này — dựng xong ngay khi vòng người khép
  // lại, và vòng gia đình bên dưới cần nó để khỏi kể ra mâu thuẫn giả.
  const banDoNguoi = new Map();
  for (const ca of caTrung) {
    if (ca.kieu === 'nguoi') banDoNguoi.set(ca.idTrongFile, ca.id);
  }
  const doiSang = (id) => banDoNguoi.get(id) || id;

  for (const u of mang(imported.unions)) {
    const idFile = chu(u && u.id);
    if (!idFile) continue;
    const { cu, neo } = timBanCu(u, idFile, capCay);
    if (!neo) { (khaiMoi.has(idFile) ? capMoi : capChuaNeo).push(idFile); continue; }
    if (!cu)  { capMoi.push(idFile); continue; }
    daGhep.add(cu.id);
    caTrung.push(Object.assign(caCap(cu.id, cu, u, tenTheoMa, doiSang),
                                { neo, idTrongFile: idFile }));
  }

  return khungKetQua({
    caTrung, nguoiMoi, capMoi, nguoiChuaNeo, capChuaNeo,
    duocTron: true, lyDoChan: '',
    neoTay: capNeoTay(neoTay), loiNeoTay: [],
  });
}

/** Gói kết quả — một chỗ duy nhất tính `thongKe`, để bốn đường ra không lệch nhau. */
function khungKetQua(k) {
  const caTrung = k.caTrung;
  return {
    ok: true, lyDo: '', loi: '',
    caTrung, nguoiMoi: k.nguoiMoi, capMoi: k.capMoi,
    duocTron: k.duocTron, lyDoChan: k.lyDoChan,
    neoTay: k.neoTay, loiNeoTay: k.loiNeoTay,
    nguoiChuaNeo: k.nguoiChuaNeo, capChuaNeo: k.capChuaNeo,
    thongKe: {
      soCaTrung:   caTrung.length,
      soCaNguoi:   caTrung.filter((c) => c.kieu === 'nguoi').length,
      soCaCap:     caTrung.filter((c) => c.kieu === 'giadinh').length,
      soGiongHet:  caTrung.filter((c) => c.giongHet).length,
      soKhacTen:   caTrung.filter((c) => c.khacTen).length,
      soDaXoa:     caTrung.filter((c) => c.daXoa).length,
      soBoSung:    caTrung.reduce((n, c) => n + c.boSung.length, 0),
      soMauThuan:  caTrung.reduce((n, c) => n + c.mauThuan.length, 0),
      soNguoiMoi:  k.nguoiMoi.length,
      soCapMoi:    k.capMoi.length,
      soChuaNeo:   k.nguoiChuaNeo.length + k.capChuaNeo.length,
      soNeoTay:    k.neoTay.length,
    },
  };
}

const capNeoTay = (m) =>
  Array.from(m, ([trongFile, trongCay]) => ({ trongFile, trongCay }));

/**
 * Đọc và kiểm danh sách điểm neo người dùng khai.
 *
 * Sai một điểm thì chặn cả lần nhập, không lặng lẽ bỏ điểm sai đi mà chạy
 * tiếp bằng những điểm còn lại: người khai bốn điểm mà chỉ ba điểm được dùng
 * là một sự thật họ cần biết trước khi ghi, không phải sau.
 */
function docNeoTay(ds, nguoiCay, capCay, nguoiFile, capFile) {
  const neoTay = new Map();
  const loiNeoTay = [];
  const dungRoi = new Set();

  for (const c of mang(ds)) {
    const trongFile = chu(c && c.trongFile);
    const trongCay  = chu(c && c.trongCay);
    const ghiLoi = (vi) => loiNeoTay.push({ trongFile, trongCay, vi });

    if (!trongFile || !trongCay) { ghiLoi('thiếu một trong hai vế.'); continue; }

    const coFile = nguoiFile.has(trongFile) || capFile.has(trongFile);
    const coCay  = nguoiCay.has(trongCay)  || capCay.has(trongCay);
    if (!coFile) { ghiLoi('file không có bản ghi ' + trongFile + '.'); continue; }
    if (!coCay)  { ghiLoi('cây không có bản ghi ' + trongCay + '.'); continue; }

    // Người với người, cặp với cặp. Ghép chéo là một lỗi gõ, không phải một ý.
    const laNguoi = nguoiFile.has(trongFile);
    if (laNguoi !== nguoiCay.has(trongCay)) {
      ghiLoi('một vế là người, vế kia là gia đình.');
      continue;
    }

    if (neoTay.has(trongFile)) { ghiLoi('bản ghi trong file được khai hai lần.'); continue; }
    if (dungRoi.has(trongCay)) { ghiLoi('bản ghi trong cây được khai hai lần.'); continue; }

    neoTay.set(trongFile, trongCay);
    dungRoi.add(trongCay);
  }
  return { neoTay, loiNeoTay };
}

/**
 * Đọc và kiểm danh sách bản ghi người dùng khai là CHƯA CÓ trong cây.
 *
 * Ghi lỗi vào chính `loiNeoTay` chứ không dựng danh sách lỗi thứ hai: với
 * người đang đứng trước màn hình thì cả hai đều là *"một dòng tôi khai bị
 * sai"*, và hai danh sách là hai chỗ để quên đọc một chỗ.
 */
function docKhaiMoi(ds, neoTay, nguoiFile, capFile, loiNeoTay) {
  const khaiMoi = new Set();
  for (const x of mang(ds)) {
    const trongFile = chu(x);
    const ghiLoi = (vi) => loiNeoTay.push({ trongFile, trongCay: '', vi });

    if (!trongFile) { ghiLoi('một dòng khai "chưa có trong cây" mà không có mã.'); continue; }
    if (!nguoiFile.has(trongFile) && !capFile.has(trongFile)) {
      ghiLoi('file không có bản ghi ' + trongFile + '.');
      continue;
    }
    // Vừa khai ghép với một người, vừa khai là người mới. Không đoán bên nào.
    if (neoTay.has(trongFile)) {
      ghiLoi('vừa khai ghép với ' + neoTay.get(trongFile) +
             ', vừa khai là bản ghi chưa có trong cây.');
      continue;
    }
    khaiMoi.add(trongFile);
  }
  return khaiMoi;
}

function thongKeRong() {
  return {
    soCaTrung: 0, soCaNguoi: 0, soCaCap: 0, soGiongHet: 0, soKhacTen: 0,
    soDaXoa: 0, soBoSung: 0, soMauThuan: 0, soNguoiMoi: 0, soCapMoi: 0,
    soChuaNeo: 0, soNeoTay: 0,
  };
}

/** Một ca trùng mã NGƯỜI. */
function caNguoi(id, cu, moi) {
  const { boSung, mauThuan } = soTruong(TRUONG_NGUOI, cu, moi);
  dongConSong(boSung, mauThuan, cu, moi);

  const tenDangCo = fullName(cu);
  const tenTrongFile = fullName(moi);
  return {
    kieu: 'nguoi',
    id,
    tenDangCo,
    tenTrongFile,
    // So thô, KHÔNG bỏ dấu: chỗ này chỉ để bật một lời cảnh báo, mà cảnh báo
    // thừa thì người dùng đọc rồi bỏ qua, còn cảnh báo thiếu thì im lặng.
    khacTen: chu(tenDangCo) !== chu(tenTrongFile),
    daXoa: cu.deleted === true,
    giongHet: boSung.length === 0 && mauThuan.length === 0,
    boSung,
    mauThuan,
  };
}

/**
 * Một ca trùng mã GIA ĐÌNH.
 *
 * ⚠ `doiSang` là thứ giữ cho hàm này khỏi kể ra một MÂU THUẪN KHÔNG CÓ THẬT.
 * Một cặp trong file trỏ tới bạn đời và con bằng mã CỦA FILE; cùng những con
 * người ấy trong cây mang mã khác. So thẳng hai bên là lần nào cũng ra
 * *"Vợ/chồng: A, C ≠ a, c"* — bốn mã, hai con người. Đo trên hai file thật
 * 29/08/2026: mọi cặp ghép được đều đẻ ra đúng dòng giả ấy.
 *
 * Nên phải dịch mã file sang mã cây TRƯỚC khi so, bằng chính bản đồ người mà
 * vòng chạy trước vừa dựng xong. Chỗ này chạy được là nhờ vòng NGƯỜI luôn
 * đứng trước vòng GIA ĐÌNH — đổi thứ tự hai vòng ấy là hỏng lặng lẽ.
 */
function caCap(id, cu, moi, tenTheoMa, doiSang) {
  const { boSung, mauThuan } = soTruong(TRUONG_CAP, cu, moi);
  dongBanDoi(boSung, mauThuan, cu, moi, tenTheoMa, doiSang);
  dongCon(boSung, mauThuan, cu, moi, tenTheoMa, doiSang);

  const tenDangCo = keBanDoi(cu, tenTheoMa);
  const tenTrongFile = keBanDoi(moi, tenTheoMa);
  return {
    kieu: 'giadinh',
    id,
    tenDangCo,
    tenTrongFile,
    khacTen: !cungTap(banDoiCua(cu), banDoiCua(moi).map(doiSang)),
    daXoa: cu.deleted === true,
    giongHet: boSung.length === 0 && mauThuan.length === 0,
    boSung,
    mauThuan,
  };
}

/**
 * Chạy một bảng trường qua hai bản ghi.
 *
 * Ba nhánh, và chỉ ba: file trống thì KHÔNG có gì để nói (nhập là đường một
 * chiều — không bao giờ lấy cái trống của file xoá chữ đang có); cây trống mà
 * file có chữ là BỔ SUNG; hai bên khác nhau là MÂU THUẪN.
 */
function soTruong(bang, cu, moi) {
  const boSung = [];
  const mauThuan = [];
  for (const t of bang) {
    const a = chu(t.doc(cu));
    const b = chu(t.doc(moi));
    if (b === '' || a === b) continue;
    if (a === '') boSung.push({ truong: t.truong, nhan: t.nhan, giaTri: b });
    else mauThuan.push({ truong: t.truong, nhan: t.nhan, dangCo: a, trongFile: b });
  }
  return { boSung, mauThuan };
}

/**
 * `living` — chỉ kể khi nó là thứ DUY NHẤT mang tin ấy.
 *
 * Ngày mất đã chênh nhau thì dòng "Còn sống" chỉ nói lại đúng điều đó bằng
 * chữ khác. Nhưng `1 DEAT Y` — biết chắc đã mất mà không có ngày — là một
 * điều đã biết THẬT, và không dòng nào khác chở được nó.
 */
function dongConSong(boSung, mauThuan, cu, moi) {
  const daKe = (ds) => ds.some((d) => d.truong === 'death');
  if (daKe(boSung) || daKe(mauThuan)) return;

  const a = cu.living === false;
  const b = moi.living === false;
  if (a === b) return;
  if (!b) return;      // file nói "còn sống" thì không đè lên chữ đang có
  if (!a) boSung.push({ truong: 'living', nhan: 'Còn sống', giaTri: 'Đã mất' });
}

/**
 * Bạn đời của một cặp.
 *
 * Tập của file RỘNG HƠN là bổ sung — thêm người vào cặp. Lệch kiểu khác (file
 * thiếu người, hoặc hai bên có người riêng) là mâu thuẫn, và bày cả hai danh
 * sách: đây chính là dòng nói to nhất khi nhập nhầm file của gia phả khác.
 */
function dongBanDoi(boSung, mauThuan, cu, moi, tenTheoMa, doiSang) {
  const a = banDoiCua(cu);
  const b = banDoiCua(moi).map(doiSang);
  if (cungTap(a, b)) return;

  const ke = (ds) => ds.map((id) => moTaMa(id, tenTheoMa)).join(', ');
  if (a.every((id) => b.includes(id))) {
    const them = b.filter((id) => !a.includes(id));
    boSung.push({ truong: 'banDoi', nhan: 'Vợ/chồng', giaTri: 'thêm ' + ke(them) });
    return;
  }
  mauThuan.push({ truong: 'banDoi', nhan: 'Vợ/chồng', dangCo: ke(a), trongFile: ke(b) });
}

/**
 * Con của một cặp.
 *
 * ⚠ `order` CỐ Ý không so. Thêm một người con vào giữa là đổi số thứ tự của
 * mọi đứa sau nó, nên so `order` thì một ca bổ sung đúng đắn sẽ kéo theo cả
 * loạt "mâu thuẫn" giả. Thứ tự anh em có màn *Sắp thứ tự* riêng của nó.
 */
function dongCon(boSung, mauThuan, cu, moi, tenTheoMa, doiSang) {
  const a = new Map();
  for (const c of mang(cu.children)) if (c && chu(c.personId)) a.set(c.personId, c);

  for (const c of mang(moi.children)) {
    const id = doiSang(chu(c && c.personId));
    if (!id) continue;
    const ten = moTaMa(id, tenTheoMa);
    const qhMoi = chu(nhanQuanHeCon(c.relation));
    const cCu = a.get(id);

    if (!cCu) {
      boSung.push({
        truong: 'con', nhan: 'Con',
        giaTri: 'thêm ' + ten + (qhMoi ? ' — ' + qhMoi.toLowerCase() : ''),
      });
      continue;
    }
    const qhCu = chu(nhanQuanHeCon(cCu.relation));
    if (qhMoi === '' || qhMoi === qhCu) continue;
    if (qhCu === '') {
      boSung.push({ truong: 'con', nhan: 'Quan hệ với ' + ten, giaTri: qhMoi });
    } else {
      mauThuan.push({
        truong: 'con', nhan: 'Quan hệ với ' + ten,
        dangCo: qhCu, trongFile: qhMoi,
      });
    }
  }
}

/** Mã người kèm tên, để một dòng chỉ đúng vào một bản ghi. */
function moTaMa(id, tenTheoMa) {
  const ten = chu(tenTheoMa.get(id));
  return ten === '' ? id : ten + ' (' + id + ')';
}

function banDoiCua(u) {
  return mang(u && u.partners).map((x) => chu(x)).filter((x) => x !== '');
}

function keBanDoi(u, tenTheoMa) {
  const ds = banDoiCua(u);
  return ds.length === 0 ? '' : ds.map((id) => moTaMa(id, tenTheoMa)).join(' — ');
}

function cungTap(a, b) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

function tenKhacCua(p) {
  const ds = mang(p && p.names).filter((n) => n && n.type !== 'chinh');
  return ds.map(fullName).filter((t) => chu(t) !== '').join(', ');
}

function noiCua(khoi) {
  return chu(khoi && khoi.place);
}

function soDoiCua(p) {
  const s = p && p.vn && p.vn.generation;
  return Number.isInteger(s) && s > 0 ? String(s) : '';
}

function mang(x) {
  return Array.isArray(x) ? x : [];
}

/**
 * Suy ra điểm neo cho GIA ĐÌNH từ bản đồ NGƯỜI mà con người đã duyệt xong.
 *
 * --- Vì sao hàm này KHÔNG phá luật "app không tự xác định điểm neo" -------
 *
 * Vì một gia đình trong app không có căn cước riêng: nó **chính là** tập bạn
 * đời của nó. Hai bạn đời đã được con người khẳng định là ai thì gia đình
 * của họ không còn gì để đoán — đây là một phép SUY RA, không phải một phép
 * đoán. Luật của b60 cấm app tự chỉ ra điểm neo ĐẦU TIÊN; hàm này chỉ chạy
 * sau khi con người đã chỉ, và nơi gọi phải tự giữ điều đó (xem
 * `pages/form-ghep-doi.js`).
 *
 * Không suy ra thì cái giá rất cụ thể: file khai gia đình *a + c*, cây đã có
 * *A + C* đúng hai con người ấy, mà lần trộn vẫn đẻ thêm một cặp thứ hai —
 * hai vợ chồng cưới nhau hai lần trên cùng một sơ đồ.
 *
 * BA chỗ hàm này chịu thua, và cả ba đều im lặng bỏ qua chứ không đoán:
 *
 * 1. Còn một bạn đời chưa có trong bản đồ → chưa đủ căn cứ.
 * 2. Cây không có cặp nào mang ĐÚNG tập bạn đời ấy → đây là cặp mới thật.
 * 3. Hai gia đình trong file cùng suy ra một cặp trong cây → bỏ cả hai, vì
 *    ghép một cặp hai lần là hai lần ghi đè, lần sau xoá mất lần trước.
 *
 * HÀM THUẦN.
 *
 * @param {object} tree        cây đích
 * @param {object} imported    kết quả `parseGedcom`
 * @param {Map<string,string>|object} banDoNguoi  mã người TRONG FILE → mã
 *        người TRONG CÂY. Chỉ chứa những người đã ghép được; người khai là
 *        "chưa có trong cây" thì KHÔNG có mặt ở đây.
 * @returns {{trongFile:string, trongCay:string}[]}
 */
export function goiYCapTheoNguoi(tree, imported, banDoNguoi) {
  const tra = (id) => (banDoNguoi instanceof Map
    ? banDoNguoi.get(id)
    : (banDoNguoi && typeof banDoNguoi === 'object' ? banDoNguoi[id] : ''));

  const khoaCua = (ds) => ds.slice().sort().join('|');

  // Cặp đã xoá mềm KHÔNG được làm đích: ghép vào một cặp nằm trong thùng rác
  // là dựng lại nó bằng cửa sau, mà người dùng thì không thấy chuyện ấy.
  const capTheoKhoa = new Map();
  const trung = new Set();
  for (const u of mang(tree && tree.unions)) {
    if (!u || !chu(u.id) || u.deleted === true) continue;
    const k = khoaCua(banDoiCua(u));
    if (k === '') continue;
    if (capTheoKhoa.has(k)) trung.add(k);
    else capTheoKhoa.set(k, u.id);
  }

  const ketQua = [];
  const daDung = new Map();   // mã cặp trong cây → mã cặp trong file đầu tiên
  const boDi = new Set();
  for (const u of mang(imported && imported.unions)) {
    const idFile = chu(u && u.id);
    if (!idFile) continue;
    const banDoi = banDoiCua(u);
    if (banDoi.length === 0) continue;

    const trongCay = [];
    for (const id of banDoi) {
      const sang = chu(tra(id));
      if (!sang) { trongCay.length = 0; break; }
      trongCay.push(sang);
    }
    if (trongCay.length === 0) continue;

    const k = khoaCua(trongCay);
    if (trung.has(k)) continue;         // cây đang có hai cặp y hệt nhau
    const capCay = capTheoKhoa.get(k);
    if (!capCay) continue;

    if (daDung.has(capCay)) { boDi.add(capCay); continue; }
    daDung.set(capCay, idFile);
    ketQua.push({ trongFile: idFile, trongCay: capCay });
  }

  return boDi.size === 0
    ? ketQua
    : ketQua.filter((x) => !boDi.has(x.trongCay));
}

/**
 * Trộn bản đã đọc vào một cây gia phả. HÀM THUẦN: `tree` không bị đụng vào,
 * cây mới được trả về; không đọc đồng hồ, không gọi máy chủ.
 *
 * ⚠ **Chỉ làm chế độ `moi` — đổ vào một cây RỖNG.** Chế độ bổ sung vào gia
 * phả đang có người thì phải dò trùng trước, và nó là việc riêng ở nửa sau.
 * Hàm này TỪ CHỐI khi cây đích còn dù chỉ một bản ghi: nhập là đường một
 * chiều, nên chốt chặn phải nằm ở đây — chỗ dựng dữ liệu — chứ không chỉ ở
 * màn hình, vì màn hình có thể gọi sai mà dữ liệu thì không lùi lại được.
 *
 * Ba thứ CỐ Ý không mang sang:
 *
 * · **Ảnh** — `media` để rỗng. Thẻ `OBJE` chỉ có đường dẫn máy khác, còn app
 *   lưu ảnh bằng `driveFileId` trong thư mục `Anh` của chính gia phả này.
 * · **`changeLog`** — máy chủ tự ghi một mục khi `luuCay` gật. Chép lịch sử
 *   của cây khác vào đây là dựng ra một quá khứ chưa từng xảy ra ở cây này.
 * · **Khối `tree`** — giữ nguyên của cây đích, kể cả `name` người dùng vừa
 *   gõ và `photoFolderId` máy chủ vừa cấp. Đè `photoFolderId` bằng giá trị
 *   rỗng của file `.ged` là cắt đứt kho ảnh của cây mới ngay từ lúc dựng.
 *
 * @param {object} tree      cây đích, phải RỖNG
 * @param {object} imported  kết quả `parseGedcom`
 * @param {{che?:string, luc?:string, nguoiGhi?:string}} [tuyChon]
 *        `luc` là dấu thời gian `dd/mm/yyyy HH:mm` do nơi gọi đưa vào — hàm
 *        này không được đọc đồng hồ, nếu không nó hết thuần và hết kiểm được.
 * @returns {{ok:boolean, lyDo:string, loi:string, cay:object|null,
 *            tomTat:{soNguoi:number, soCap:number, soNguon:number}|null}}
 */
export function mergeImported(tree, imported, tuyChon) {
  const t = tuyChon || {};
  const che = chu(t.che) || 'moi';
  const thua = (lyDo, loi) => ({ ok: false, lyDo, loi, cay: null, tomTat: null });

  if (che !== 'moi') {
    return thua('chualam',
      'Mới ghi được vào một gia phả MỚI. Đường bổ sung vào gia phả đang mở ' +
      'còn đang làm — nó phải dò trùng trước khi trộn.');
  }
  if (!imported || !Array.isArray(imported.persons) || imported.persons.length === 0) {
    return thua('khongcoai', 'File không có người nào, nên không có gì để ghi.');
  }
  if (!tree || typeof tree !== 'object' || !tree.tree) {
    return thua('khongcocay', 'Chưa nạp được gia phả đích nên chưa ghi được gì.');
  }

  const dem = (x) => (Array.isArray(x) ? x.length : 0);
  const daCo = dem(tree.persons) + dem(tree.unions) + dem(tree.sources);
  if (daCo > 0) {
    return thua('khongrong',
      'Gia phả đích đã có ' + dem(tree.persons) + ' người và ' +
      dem(tree.unions) + ' gia đình. Chế độ này chỉ ghi vào một gia phả RỖNG.');
  }

  // Nhân đôi bằng JSON, cùng lý lẽ với `services/repo.luuCay`: cây là dữ liệu
  // JSON thuần. Nhân đôi cả `imported` để cây trả về không dùng chung một
  // object nào với bản xem trước đang bày trên màn hình.
  const cay = JSON.parse(JSON.stringify(tree));
  const nhap = JSON.parse(JSON.stringify(imported));

  const luc = chu(t.luc);
  const boi = chu(t.nguoiGhi);
  for (const p of nhap.persons) {
    p.meta = { createdAt: luc, updatedAt: luc, updatedBy: boi };
  }

  cay.persons = nhap.persons;
  cay.unions = Array.isArray(nhap.unions) ? nhap.unions : [];
  cay.sources = Array.isArray(nhap.sources) ? nhap.sources : [];
  cay.media = [];

  // Người đứng giữa sơ đồ lúc mở cây lần đầu. Lấy người ĐẦU TIÊN của file —
  // `repo.chonNguoiTrungTam` vẫn có đường lùi khi trường này rỗng, nhưng để
  // rỗng là bắt app tự đoán ở mỗi lần mở, mà thứ tự của một `Map` thì không
  // phải thứ ai cũng đoán giống nhau.
  cay.tree.rootPersonId = chu(nhap.persons[0].id) || null;

  return {
    ok: true,
    lyDo: '',
    loi: '',
    cay,
    tomTat: {
      soNguoi: cay.persons.length,
      soCap: cay.unions.length,
      soNguon: cay.sources.length,
    },
  };
}

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
    if (isValidId(ma) && loaiCua(ma) === tt && !daDung.has(ma)) {
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
    uid: '',
    xrefGoc: chu(r.xref),
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
      case 'UID':
      case '_UID': {
        n.dung = true;
        if (!p.uid) p.uid = chuanUid(giaTriChu(n));
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
    uid: '',
    xrefGoc: chu(r.xref),
    banDoiXref: [],
    conXref: [],
    status: '',
    marriage: khoiNgayRong(),
    note: '',
    rank: 0,
    ranksTho: {},     // xref người -> thứ bậc, từ `_RANK` cấp 2
  };
  let coLyHon = false;

  for (const n of r.con) {
    switch (n.the) {
      // Thứ tự đọc chính là thứ tự đứng trên sơ đồ: `HUSB` rồi `WIFE` rồi
      // phần thừa. Đây là chỗ ánh xạ NGƯỢC của `chiaVaiTro` — cả app chỉ có
      // hai chỗ này biết tới hai chữ `husband`/`wife`.
      case 'HUSB':
      case 'WIFE':
      case '_BANDOI': {
        n.dung = true;
        const x = troToi(n);
        tho.banDoiXref.push(x);
        // `_RANK` CẤP 2 — thứ bậc của riêng người này. Bản xuất từ b57 ghi ở
        // đây; lối cũ (một số cấp 1 dưới `FAM`) vẫn đọc được ở `case '_RANK'`
        // dưới kia, vì những file đã xuất ra ngoài không sửa lại được nữa.
        const cRank = conThe(n, '_RANK');
        if (cRank) {
          cRank.dung = true;
          const s2 = Number(giaTriChu(cRank));
          if (Number.isInteger(s2) && s2 > 1 && x) tho.ranksTho[x] = s2;
        }
        break;
      }
      case 'CHIL':
        n.dung = true;
        tho.conXref.push(troToi(n));
        break;
      case 'UID':
      case '_UID': {
        n.dung = true;
        if (!tho.uid) tho.uid = chuanUid(giaTriChu(n));
        break;
      }
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
    // Hai lối viết thứ bậc, và chúng KHÔNG ngang hàng nhau:
    //
    // · `_RANK` CẤP 2 (bản xuất từ b57) nói rõ *của ai* — dựng thẳng thành
    //   `ranks`, đúng lược đồ b46.
    // · `_RANK` CẤP 1 (bản xuất b55, và file cũ đã gửi đi) là MỘT số cho cả
    //   cặp. Giữ nguyên ở trường `rank`, chỗ cầu tạm `rankCua()` đang đọc.
    //   Bịa ra `ranks` từ một con số không nói của ai là dựng ra một sự thật
    //   mà file không hề chứa.
    const ranks = {};
    for (const x of Object.keys(c.ranksTho)) {
      const id = doi(x);
      if (id && banDoi.indexOf(id) >= 0) ranks[id] = c.ranksTho[x];
    }
    if (Object.keys(ranks).length > 0) u.ranks = ranks;
    else if (c.rank > 0) u.rank = c.rank;
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

/**
 * Mã THÔ của thẻ `SOUR` trong `HEAD` — `GIAPHA` với file do app này xuất ra.
 *
 * Khác `nguonTuHead()` một chỗ quan trọng: hàm kia trả `SOUR.NAME`, tức câu
 * chữ để BÀY RA cho người đọc ("Gia phả — web app…"), còn hàm này trả cái mã
 * để MÁY SO. Trộn hai thứ làm một thì đổi một câu chữ hiển thị là lặng lẽ đổi
 * luôn cách app quyết một file có đáng tin hay không.
 */
function maNguonTuHead(head) {
  if (!head) return '';
  const c = conThe(head, 'SOUR');
  return c ? giaTriChu(c).trim().toUpperCase() : '';
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

/**
 * Ghi `_UID` — điểm neo đi theo con người, không theo cây.
 *
 * Thẻ tự đặt (mở đầu bằng gạch dưới) nên 5.5.1 nhận; 7.0 có thẻ chuẩn `UID`
 * cho đúng việc này, đổi sang lúc nào xuất 7.0. Bản ghi chưa có `uid` thì
 * KHÔNG ghi dòng nào — luật "không xuất thẻ rỗng" của đường xuất, và một
 * `_UID` rỗng còn tệ hơn không có, vì bên nhận sẽ coi nó là một mã thật.
 */
function veUid(ds, banGhi) {
  const uid = chu(banGhi && banGhi.uid);
  if (uid) ds.push('1 _UID ' + uid);
}

function veNguoi(ds, p, giauChiTiet, dsLamVo, dsLamCon, anhTheoChu) {
  ds.push('0 @' + p.id + '@ INDI');
  veUid(ds, p);

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
  veUid(ds, u);

  const vaiTro = chiaVaiTro(c.banDoi, u.partnerOrder, theoMa);
  const bacRieng = ranksRoRang(u);
  if (vaiTro.husb) veBanDoi(ds, 'HUSB', vaiTro.husb, bacRieng);
  if (vaiTro.wife) veBanDoi(ds, 'WIFE', vaiTro.wife, bacRieng);
  for (const id of vaiTro.thua) veBanDoi(ds, '_BANDOI', id, bacRieng);

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

  // Cặp còn ở lược đồ CŨ (`rank`, một số cho cả cặp): ghi lại đúng lối cũ,
  // cấp 1. Không nâng nó lên `_RANK` cấp 2 cho từng người — xem `ranksRoRang`.
  if (Object.keys(bacRieng).length === 0 &&
      Number.isInteger(u.rank) && u.rank > 0) {
    themDong(ds, 1, '_RANK', String(u.rank));
  }
}

/**
 * Một người trong cặp, kèm thứ bậc của RIÊNG NGƯỜI ẤY.
 *
 * ⚠ **`_RANK` đứng ở CẤP 2, dưới tên người — không phải cấp 1 dưới `FAM`.**
 * Bản xuất đầu (b55) ghi một số cho cả cặp, đúng lược đồ `rank` cũ mà b46 đã
 * bỏ. Cặp nào đã mang `ranks` khoá theo người thì thứ bậc **rơi im lặng** lúc
 * xuất: "thứ mấy" chỉ có nghĩa khi hỏi *của ai* — xét Dũng thì Lan là vợ 2,
 * xét Lan thì Dũng là chồng 1. Một con số treo dưới `FAM` không nói được điều
 * đó, nên nó phải đi theo người.
 *
 * Chỉ ghi khi khác 1: vắng thẻ đã có nghĩa là 1 (`rankCua`), ghi thêm là hai
 * cách viết cùng một sự thật.
 */
function veBanDoi(ds, the, personId, bacRieng) {
  ds.push('1 ' + the + ' @' + personId + '@');
  const n = bacRieng[personId];
  if (Number.isInteger(n) && n > 1) ds.push('2 _RANK ' + n);
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
