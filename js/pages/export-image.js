// ============================================================
// giapha · js/pages/export-image.js
// Vai trò  : Xuất sơ đồ ĐANG HIỂN THỊ thành ảnh PNG · ảnh raster độ phân giải
//            cao theo khổ giấy + DPI · in ra PDF qua hộp thoại in
// Lớp      : pages — được gọi bởi: tree-view (có `svgEl`) · settings (nút + link)
// Phụ thuộc: domains/gedcom.js (boDauChoTenFile — tái dùng luật đặt tên file),
//            domains/render.js (VE.chuTen — cỡ chữ, để tính ngược khổ giấy),
//            config.js (PHOTO — cỡ hai bản ảnh nhỏ/lớn)
// Phiên bản: 0.8.1 · Cập nhật: 01/09/2026 (bước 80 — cỡ ảnh xin kho đọc từ PHOTO)
// ============================================================
//
// VIỆC 12 của kế hoạch. Nguồn gốc: mã nháp Antigravity
// (`tai-lieu/antigravity/export-image.js`, 29/08/2026) — đã RÀ LẠI VÀ VIẾT
// LẠI, không chép nguyên. Khác nháp ở đúng phần khó nhất: cách IN.
//
// Cách làm — theo đúng thứ tự `KE-HOACH_V53` dặn, dừng ngay khi đủ dùng:
//   PNG: clone <svg> → canvas → toBlob()   — thuần trình duyệt, 0 thư viện.
//   PDF: window.print() + @media print      — trình duyệt tự có "Lưu PDF".
//   Chưa cần jsPDF (và thêm thư viện là việc PHẢI HỎI — CLAUDE.md mục 9).
//
// ⚠ **Khác NGAY một điều với Xuất GEDCOM**: ảnh này chỉ chụp đúng PHẦN SƠ ĐỒ
// ĐANG HIỆN trên màn hình (đã lọc theo phạm vi đời/huyết thống đang chọn),
// KHÔNG phải toàn bộ gia phả. Chữ trên nút ở `settings.js` phải nói rõ điều
// này — cùng bài học với cặp "Sao lưu" / "Xuất GEDCOM" ở đó.
//
// --- Quyết định 31/08/2026 (chủ dự án chọn, có HỎI trước — đúng câu
// `KE-HOACH_V53` dặn "quyết định phải hỏi chứ không tự chọn") ---------------
//
// Khi in PDF mà sơ đồ lớn hơn một trang: LUÔN THU NHỎ để vừa đúng MỘT trang
// A4 ngang, không cho tràn sang nhiều trang. Cây càng lớn thì chữ càng nhỏ,
// nhưng không ai bị cắt đôi người giữa hai trang giấy.
//
// ⚠ **CÁCH THI HÀNH BAN ĐẦU ĐÃ SAI VÀ ĐÃ SỬA 01/09/2026** — xem khối "SỰ CỐ
// novaPDF" ngay dưới. Bản đầu tính sẵn số pixel rồi ÉP vào `<svg>`; nay để
// `width/height:100%` và cho `preserveAspectRatio` của SVG tự co vừa trang.
//
// --- SỰ CỐ novaPDF, 31/08/2026 — hai lỗi làm bản xuất KHÔNG DÙNG ĐƯỢC ------
//
// Chủ dự án xuất thử trên app thật rồi báo *"ảnh xuất ra chất lượng quá kém,
// dùng không được"*, kèm ba file ở `tai-lieu/anh/`. Soi ra HAI lỗi riêng biệt,
// cả hai đều do mã này, và cả hai đều là **một con số ĐOÁN chưa từng đo**:
//
// **Lỗi 1 — nút "Chụp ảnh sơ đồ" bóp ảnh xuống 13%.** `XuatAnh2.png` ra
// 4096×304 cho gia phả 681 người: cả cây chỉ còn một hàng chấm màu. Thủ phạm
// là kẹp `CANH_TOI_DA = 4096` chép từ mã nháp. Xem `tinhTyLePng()`.
//
// **Lỗi 2 — in qua MÁY IN PDF ẢO ra khổ Letter, sơ đồ bé xíu giữa trang.**
// `XuatAnh3.pdf` do **novaPDF** sinh: `MediaBox` = 612×792pt = Letter, KHÔNG
// phải khổ app đặt; nét vẽ chỉ còn 0,24pt. Nguyên nhân là một điều tôi đã
// **đo đúng nhưng suy rộng sai**:
//
//   · `do-khong-lon.mjs` đo `Page.printToPDF` — tức **"Lưu thành PDF" của
//     chính Chrome** — và `@page size` chạy tới 8×12m. ĐÚNG, nhưng chỉ đúng
//     cho đường đó.
//   · Khi đích đến là một **TRÌNH ĐIỀU KHIỂN máy in** (novaPDF, Microsoft
//     Print to PDF, máy in giấy thật), khổ giấy do **trình điều khiển** quyết
//     định; `@page size` bị bỏ qua. Mà mã lại ép `<svg>` bằng pixel tính theo
//     khổ MONG MUỐN — nên khi khổ thật khác đi, hình không co theo.
//
//   `do-in-vua-trang.mjs` đo lại đúng ca ấy (giả lập khổ giấy áp từ ngoài):
//   ép pixel cứng → hình **tràn 359% ngang / 154% dọc** trên khổ Letter, rồi
//   bị thu nhỏ thành chấm; `width/height:100%` → **99%/100%**, co vừa đúng.
//
// **Nếp rút ra:** một phép đo chỉ nói về ĐÚNG con đường nó đã đi. `@page size`
// hoạt động ≠ "mọi máy in đều nghe `@page size`". Muốn chắc thì phải đo cả
// con đường mà NGƯỜI DÙNG thật sự đi.
//
// --- Mở rộng CÙNG NGÀY, sau khi chủ dự án đối chiếu MapInfo/MicroStation ---
//
// Hai phần mềm ấy xuất được bản vẽ khổ NHIỀU MÉT (MapInfo: ghép nhiều tờ A0;
// MicroStation: một khung ảnh độ phân giải rất cao, hoặc máy in PDF ảo khổ
// giấy tự đặt). Hỏi *"app này làm được không"* dẫn tới một phép đo thật
// trước khi trả lời (`kiem-thu/do-khong-lon.mjs`):
//
//   · `chrome.exe --headless --print-to-pdf` (dòng lệnh trần) BỎ QUA
//     `@page size`, luôn ra Letter — tưởng nhầm là "trần" của Chrome.
//   · Nhưng đi đúng đường `Page.printToPDF` qua CDP — CHÍNH LÀ cỗ máy đứng
//     sau nút "Lưu thành PDF" trong hộp thoại in thật — thì `@page size`
//     tự đặt chạy tới ÍT NHẤT 8000×12000mm (8×12 mét) mà không cắt xén.
//
// Kết luận: sơ đồ là SVG (vector), không phải bitmap, nên không có trần độ
// phân giải như đường PNG — đường ĐÚNG cho khổ lớn là IN (PDF vector), không
// phải CHỤP ẢNH (canvas). `inSoDo()` vì vậy nhận thêm một số TUỲ CHỌN — bề
// ngang khổ giấy — xem JSDoc của hàm.
//
// ⚠ **Chưa xử lý ảnh Drive thật ở khổ lớn**: ảnh là raster cỡ nhỏ cố định
// (`PHOTO.thumbSize` ~200px), phóng lên khổ nhiều mét thì mờ hẳn dù chữ và
// đường kẻ vẫn nét — chưa có công tắc "bỏ ảnh khi in khổ lớn". Việc sau.
//
// --- ĐƯỜNG THỨ BA: ảnh RASTER theo khổ giấy + DPI (thêm 31/08/2026) --------
//
// Chủ dự án đối chiếu tiếp MicroStation: *"xuất bản vẽ thành ẢNH trong khung
// khổ A0 nhưng đẩy độ phân giải lên 600, 900, 1200 DPI"*, và muốn một đường
// xuất cho phép chọn **máy in PDF trên máy tính** + **khổ giấy máy in ấy cho
// phép** + **độ phân giải 75–1200 DPI**, sơ đồ co vừa khổ.
//
// DPI chỉ có nghĩa với ẢNH RASTER. `inSoDo()` ở trên in thẳng SVG SỐNG — máy
// in tự rasterize ở độ phân giải của chính nó, không có con số nào cho người
// dùng chọn. Nên đây là một NHÁNH RIÊNG, không phải một tham số thêm của
// `inSoDo()`: `xuatAnhDoPhanGiaiCao()` dựng ảnh raster đúng số pixel yêu cầu,
// rồi `inAnhRaster()` đem chính tấm ảnh ấy đi in full khổ giấy.
//
// ⚠ **Trần canvas — ĐÃ ĐO, không đoán** (`kiem-thu/do-canvas-lon.mjs`, Chrome
// thật, 31/08/2026): canvas dựng được tối đa **268.435.456 điểm ảnh
// (= 16384×16384 chẵn, tức 2^28)** và **mỗi cạnh tối đa 65535**; quá một
// trong hai là hỏng. Vài mốc thật đo được: A4@1200dpi ĐƯỢC (139 Mpx) ·
// A2@600dpi ĐƯỢC (139 Mpx) · A0@300dpi ĐƯỢC (139,5 Mpx) · A0@600dpi HỎNG
// (558 Mpx) · A1@600dpi HỎNG (279 Mpx) · A3@1200dpi HỎNG (278 Mpx).
//
// ⚠ **Và cách nó hỏng mới là điều đáng sợ**: trình duyệt KHÔNG ném lỗi. Canvas
// vẫn nhận đúng `width`/`height`, `fillRect` vẫn chạy, chỉ có điều mọi điểm
// ảnh đọc lại đều là `0,0,0,0` và `toBlob()` trả về `null`. Đúng loại lỗi im
// lặng dự án này đã ăn đủ. Vì vậy `kiemTranCanvas()` phải CHẶN TRƯỚC bằng
// đúng hai con số đo được, và ném một câu tiếng Việt nói rõ phải giảm gì —
// chứ không để người dùng bấm rồi nhìn một ảnh đen thui hoặc không có gì.
//
// ⚠ Trần này là trần của MÃ BLINK nên không đổi theo card màn hình, nhưng máy
// ít RAM vẫn có thể hỏng SỚM HƠN. `xuatAnhDoPhanGiaiCao()` vì thế còn kiểm
// `toBlob()` trả null một lần nữa sau khi vẽ.
//
// --- Vì sao nút tải PNG KHÔNG tự bấm hộ (`a.click()`) ----------------------
//
// `pages/import-export.js` (Xuất GEDCOM, bước 55) đã cân nhắc đúng câu này
// và chọn: dựng xong file thì HIỆN một link thật, người dùng tự bấm — không
// tự kích hoạt tải bằng mã. Lý do ghi ở đó vẫn đúng ở đây, và còn thêm một lý
// do riêng của PNG: `xuatAnhPNG()` là hàm `async` (đợi tải ảnh, đợi
// `canvas.toBlob()`), nên lúc file xong thì cú bấm gốc của người dùng đã lùi
// lại vài trăm mili-giây — nhiều trình duyệt coi một `a.click()` KHÔNG còn
// nằm trong "cử chỉ người dùng" nữa và ÂM THẦM chặn tải, đúng loại lỗi im
// lặng dự án này đã ăn đủ (xem b66: "báo thành công mà không có gì xảy ra").
// Một link thật, người dùng tự bấm lần hai, luôn nằm trong cử chỉ của họ.
//
// ⚠ **CHƯA THỬ TRÊN APP THẬT** — đặc biệt phần chuyển ảnh Drive sang Data URI
// (`thayAnhBangDataUri`) có thể vướng CORS: `fetch()` một ảnh riêng tư trên
// `drive.google.com` từ trong iframe Apps Script chưa ai đo. Nếu fetch hỏng,
// mã KHÔNG vỡ cả ảnh xuất ra — nó gỡ `href` của lớp ảnh thật, để lộ đúng lớp
// bóng người mặc định nằm sẵn NGAY DƯỚI (`renderAnhTrongO` ở
// `domains/render.js` đã vẽ hai lớp chồng nhau từ bước 28, không phải mã mới
// viết thêm gì cho ca hỏng). Xem `NK-B72` để biết chỗ cần đo tiếp.
// ============================================================

import { boDauChoTenFile } from '../domains/gedcom.js';
import { VE } from '../domains/render.js';
import { PHOTO } from '../config.js';

// ============================================================
// XUẤT THEO CHIỀU CAO CHỮ — lối MicroStation (chốt 01/09/2026)
// ============================================================
//
// Chủ dự án đối chiếu MicroStation và chỉ ra chỗ thiết kế của app đang NGƯỢC:
//
//   · MicroStation: cố định **chữ cao bao nhiêu mm trên giấy** → tính NGƯỢC
//     ra khổ giấy cần in.
//   · App (tới b75): hỏi **khổ giấy** → chữ to nhỏ là hệ quả, không ai tính.
//
// Và chính chỗ ngược ấy đẻ ra sự cố: chủ dự án gõ 84cm vì đó là khổ giấy
// quen, không ai nói cho biết 84cm với cây 400 người nghĩa là chữ cao 0,08mm.
//
// ⚠ **`TY_LE_CHU_HOA` là số ĐO ĐƯỢC, không phải chép sách** —
// `kiem-thu/do-cao-chu.mjs`, đo bằng chính bộ chữ `VE.phong` trong Chrome
// thật: chữ hoa không dấu cao đúng **0,70** lần cỡ chữ. (Chữ hoa CÓ DẤU —
// "Ê", "Ố" — cao tới 0,92 vì dấu đội lên trên, nên bản in ra luôn NHỈNH HƠN
// số người dùng gõ, không bao giờ thấp hơn. Đó là chiều sai an toàn.)
//
// Vì sao hỏi chữ HOA chứ không hỏi cỡ chữ: người cầm thước đo chữ trên giấy
// là đo chiều cao chữ hoa. Hỏi "cỡ chữ" thì họ gõ 7 rồi đo ra 4,9mm và tưởng
// app tính sai.
const TY_LE_CHU_HOA = 0.70;

/** Khuyến nghị: đọc thoải mái khi đứng cách 1–1,5m (chữ cao ≈ khoảng cách/200). */
export const CHU_CAO_KHUYEN_NGHI_MM = 7;

/** Khổ giấy chuẩn, mm, dạng DỌC. Xoay ngang thì đảo hai số. */
export const KHO_GIAY = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
};

/**
 * Từ chiều cao chữ hoa MONG MUỐN trên giấy, tính ngược ra khổ giấy cần cho
 * CẢ sơ đồ. Hàm THUẦN.
 *
 * @param {number} vbW  bề ngang viewBox (đơn vị sơ đồ)
 * @param {number} vbH  bề cao viewBox
 * @param {number} chuCaoMm  chiều cao chữ HOA mong muốn, mm
 * @returns {{rongMm:number, caoMm:number, mmMoiDonVi:number}}
 */
export function tinhKhoTuChuCao(vbW, vbH, chuCaoMm) {
  const mmMoiDonVi = chuCaoMm / (VE.chuTen * TY_LE_CHU_HOA);
  return { rongMm: vbW * mmMoiDonVi, caoMm: vbH * mmMoiDonVi, mmMoiDonVi };
}

/**
 * Cả sơ đồ khổ `rongMm × caoMm` thì phải chia làm bao nhiêu tờ giấy
 * `trangRongMm × trangCaoMm`. Hàm THUẦN.
 *
 * ⚠ Chia trang là cách DUY NHẤT để xuất khổ vài mét: trần canvas của trình
 * duyệt là 268 triệu điểm ảnh (đo ở `do-canvas-lon.mjs`), một tấm 19m thì
 * không đời nào dựng nổi trong MỘT ảnh. Nhưng dựng TỪNG TỜ thì mỗi tờ chỉ là
 * một tấm A0 bình thường — cách này không có trần.
 */
export function tinhSoTrang(rongMm, caoMm, trangRongMm, trangCaoMm) {
  if (!(rongMm > 0) || !(caoMm > 0) || !(trangRongMm > 0) || !(trangCaoMm > 0)) {
    return { cot: 0, hang: 0, tong: 0 };
  }
  // Trừ hao 1e-6 để một sơ đồ rộng đúng bằng một tờ không bị làm tròn thành hai.
  const cot = Math.max(1, Math.ceil(rongMm / trangRongMm - 1e-6));
  const hang = Math.max(1, Math.ceil(caoMm / trangCaoMm - 1e-6));
  return { cot, hang, tong: cot * hang };
}

const NEN_SO_DO   = '#faf8f5';  // khớp VE.nenTrang ở domains/render.js
const TY_LE_PNG   = 2;          // ảnh nét gấp đôi màn hình thường (Retina)

/**
 * Ngân sách DIỆN TÍCH cho nút "Chụp ảnh sơ đồ" — không phải trần kỹ thuật
 * (trần thật là `TRAN_DIEN_TICH_PX`, lớn gấp đôi), mà là mức giữ cho file
 * PNG và thời gian chờ còn chịu được. Cây lớn thì hạ tỷ lệ xuống cho vừa
 * ngân sách này — **nhưng không bao giờ xuống dưới 1:1**, xem `tinhTyLePng`.
 */
const DIEN_TICH_PNG_NHANH = 120e6;

// Khổ A4 ngang, trừ lề 10mm mỗi cạnh — cùng con số Antigravity đã chọn.
const LE_TRANG_MM   = 10;
// ⚠ `A4_NGANG_MM` và `PX_MOI_MM` đã bỏ cùng `tinhKichThuocInVua()` (01/09/2026):
// từ khi in bằng `width/height:100%`, mã KHÔNG cần biết khổ giấy bao nhiêu mm
// hay một mm là bao nhiêu pixel nữa — trang giấy tự nói, `<svg>` tự co vừa.
const MM_MOI_INCH   = 25.4;

/**
 * Trần canvas — HAI con số, ĐO ĐƯỢC trong Chrome thật, không phải đoán
 * (`kiem-thu/do-canvas-lon.mjs`, 31/08/2026 — xem ghi chú đầu file).
 *
 * Vượt trần thì trình duyệt KHÔNG báo lỗi: canvas vẫn nhận đúng cỡ, nhưng mọi
 * điểm ảnh là `0,0,0,0` và `toBlob()` trả `null`. Nên hai số này phải được
 * kiểm TRƯỚC khi dựng canvas, chứ không phải chờ trình duyệt kêu.
 */
const TRAN_DIEN_TICH_PX = 268435456;   // 16384×16384 chẵn (2^28) — đo được đúng mốc này
const TRAN_CANH_PX      = 65535;       // 65536 hỏng, 65535 chạy — đo được

/** Dải độ phân giải cho người dùng chọn (chủ dự án yêu cầu 75 → 1200). */
export const DAI_DPI = [75, 150, 300, 600, 900, 1200];

/** Hai con số trần, để `settings.js` viết đúng số vào chữ giải thích. */
export const TRAN_CANVAS = { dienTich: TRAN_DIEN_TICH_PX, canh: TRAN_CANH_PX };

// ⚠ **MỘT id thẻ CSS cho CẢ HAI đường in.** `inSoDo()` (in SVG sống) và
// `inAnhRaster()` (in ảnh raster) không bao giờ được in cùng lúc, và cùng
// dùng một id thì `donDauVetIn()` gỡ được vết của đường kia trước khi chèn
// vết của mình. Hai id khác nhau là để lại HAI thẻ `@page` chồng lên nhau khi
// người dùng bấm hai nút liền tay — đúng lỗi đã bắt được lúc viết
// `kiem-thu/kiem-xuat-anh.mjs` cho hai chế độ của `inSoDo()`.
const ID_CSS_IN      = 'giapha-css-in';
const ID_KHUNG_ANH_IN = 'giapha-khung-anh-in';

// ============================================================
// XUẤT PNG
// ============================================================

/**
 * Dựng ảnh PNG từ sơ đồ đang hiển thị. KHÔNG tự tải về — trả lại blob và tên
 * file gợi ý, nơi gọi (`settings.js`) tự dựng link tải thật (xem ghi chú đầu
 * file, "vì sao nút tải PNG không tự bấm hộ").
 *
 * @param {SVGSVGElement} svgEl
 * @param {object} [tree]  — `state.tree`, chỉ để đặt tên file theo tên gia phả
 * @returns {Promise<{blob: Blob, tenFile: string}>}
 */
export async function xuatAnhPNG(svgEl, tree) {
  const { vbW, vbH } = docCoSoDoBatBuoc(svgEl);

  const tyLe = tinhTyLePng(vbW, vbH);
  const w = Math.max(1, Math.round(vbW * tyLe));
  const h = Math.max(1, Math.round(vbH * tyLe));

  const blob = await dungBlobPngTuSvg(svgEl, w, h, null,
                                      { banDoLon: banDoAnhLon(tree) });
  return { blob, tenFile: tenFileAnh(tree, 'png'), w, h, tyLe };
}

/**
 * Tỷ lệ phóng cho nút "Chụp ảnh sơ đồ". Hàm THUẦN — bài kiểm gọi thẳng.
 *
 * ⚠ **SỬA LỖI 31/08/2026 — đây là chỗ đã làm hỏng một bản xuất thật.** Bản
 * cũ kẹp cạnh dài ở 4096px (con số chép từ mã nháp Antigravity, lý do ghi là
 * *"nhiều trình duyệt di động từ chối canvas to hơn"* — một con số ĐOÁN, chưa
 * bao giờ đo). Với gia phả 681 người, sơ đồ rộng khoảng 30.000px, cái kẹp ấy
 * ép tỷ lệ xuống **0,13** — tức ảnh xuất ra NHỎ HƠN chính màn hình bảy lần
 * rưỡi. Chữ 11px thành chưa tới 1,5px: `tai-lieu/anh/XuatAnh2.png` ra
 * 4096×304, cả cây gia phả chỉ còn là một hàng chấm màu.
 *
 * Ba luật của bản mới, theo đúng thứ tự ưu tiên:
 *
 *   1. **KHÔNG BAO GIỜ nhỏ hơn 1:1.** Ảnh xuất ra mà nhỏ hơn thứ đang thấy
 *      trên màn hình thì không dùng được vào việc gì — thà file nặng.
 *   2. Muốn 2× cho nét, nhưng chịu hạ dần nếu vượt **ngân sách diện tích**
 *      `DIEN_TICH_PNG_NHANH` (giữ cho file và thời gian chờ còn chịu được).
 *   3. Trần KỸ THUẬT đo được (`TRAN_CANH_PX`, `TRAN_DIEN_TICH_PX`) là thứ
 *      DUY NHẤT được phép ép xuống dưới 1:1 — vượt nó thì trình duyệt trả về
 *      ảnh rỗng, thà nhỏ còn hơn không có gì. Ca này hiếm và nơi gọi phải
 *      NÓI RA cỡ ảnh để người dùng biết, xem `settings.js`.
 */
export function tinhTyLePng(vbW, vbH) {
  const dienTichGoc = vbW * vbH;
  const canhDaiGoc = Math.max(vbW, vbH);

  // (2) hạ từ 2× xuống cho vừa ngân sách, nhưng (1) không xuống dưới 1:1.
  let tyLe = TY_LE_PNG;
  if (dienTichGoc * tyLe * tyLe > DIEN_TICH_PNG_NHANH) {
    tyLe = Math.sqrt(DIEN_TICH_PNG_NHANH / dienTichGoc);
  }
  tyLe = Math.max(1, tyLe);

  // (3) trần kỹ thuật — chỉ chỗ này mới được kéo xuống dưới 1:1.
  tyLe = Math.min(tyLe, TRAN_CANH_PX / canhDaiGoc,
                  Math.sqrt(TRAN_DIEN_TICH_PX / dienTichGoc));
  return tyLe;
}

// ============================================================
// XUẤT ẢNH RASTER THEO KHỔ GIẤY + DPI (đường "MicroStation")
// ============================================================

/**
 * Số điểm ảnh của một tấm ảnh khổ `rongCm` in ở `dpi`, bề cao KHOÁ theo đúng
 * tỷ lệ sơ đồ. Hàm THUẦN — bài kiểm gọi thẳng, `settings.js` gọi để biết một
 * lựa chọn có vượt trần không TRƯỚC khi cho bấm.
 *
 * ⚠ Chỉ hỏi MỘT số (bề ngang), y hệt `inSoDo()` khổ lớn: hỏi cả bề ngang lẫn
 * bề cao là mời người dùng bóp méo mặt người và chữ khi hai số không đúng tỷ
 * lệ sơ đồ đang có.
 *
 * @param {number} rongCm  bề ngang khổ giấy, cm
 * @param {number} dpi     điểm ảnh trên mỗi inch
 * @param {number} vbW     bề ngang viewBox sơ đồ
 * @param {number} vbH     bề cao viewBox sơ đồ
 * @returns {{w:number, h:number}} cỡ ảnh, điểm ảnh, tối thiểu 1
 */
export function tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH) {
  const w = Math.max(1, Math.round((rongCm * 10) / MM_MOI_INCH * dpi));
  const h = Math.max(1, Math.round(w * (vbH / vbW)));
  return { w, h };
}

/**
 * Ném lỗi TIẾNG VIỆT nói rõ phải giảm gì, nếu cỡ ảnh vượt một trong hai trần
 * đo được. Chặn ở đây thay vì để trình duyệt tự xử, vì trình duyệt KHÔNG xử:
 * nó dựng canvas rỗng và trả `toBlob() === null` mà không kêu một tiếng.
 */
export function kiemTranCanvas(w, h) {
  const canhDai = Math.max(w, h);
  if (canhDai > TRAN_CANH_PX) {
    throw new Error(
      'Ảnh cần cạnh ' + canhDai + ' điểm ảnh, vượt trần ' + TRAN_CANH_PX +
      ' điểm ảnh mỗi cạnh của trình duyệt. Hãy giảm độ phân giải hoặc bề ngang khổ giấy.');
  }
  if (w * h > TRAN_DIEN_TICH_PX) {
    const trieu = (n) => Math.round(n / 1e6);
    throw new Error(
      'Ảnh cần ' + trieu(w * h) + ' triệu điểm ảnh (' + w + '×' + h + '), vượt trần ' +
      trieu(TRAN_DIEN_TICH_PX) + ' triệu của trình duyệt. ' +
      'Hãy giảm độ phân giải hoặc bề ngang khổ giấy.');
  }
}

/**
 * Lọc `DAI_DPI` lấy những mức CÒN DỰNG ĐƯỢC với khổ giấy và tỷ lệ sơ đồ này.
 *
 * ⚠ Lọc bằng ĐÚNG công thức `tinhCoAnhTheoDpi` + `kiemTranCanvas` mà lúc bấm
 * nút sẽ chạy, chứ không giải bất phương trình rồi làm tròn — làm tròn hai
 * lần theo hai đường khác nhau là cách để UI cho chọn một mức mà mã thật lại
 * từ chối, đúng thứ phải tránh.
 *
 * @returns {number[]} tập con của `DAI_DPI`, có thể RỖNG nếu khổ quá lớn
 */
export function dpiConDungDuoc(rongCm, vbW, vbH) {
  if (!(rongCm > 0) || !(vbW > 0) || !(vbH > 0)) return [];
  return DAI_DPI.filter((dpi) => {
    const { w, h } = tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH);
    try { kiemTranCanvas(w, h); return true; } catch (e) { return false; }
  });
}

// ============================================================
// TỰ DỰNG FILE PDF — khổ giấy ghi thẳng vào file, không ai ghi đè
// ============================================================
//
// ⚠ **Vì sao phải tự dựng, thay vì đi tiếp qua hộp thoại in** (chốt
// 01/09/2026, sau khi chủ dự án thử lần hai và báo *"xuất pdf chưa đạt"*):
//
// Đo `tai-lieu/anh/xuatpdf-2.pdf` — bản novaPDF sinh ra SAU khi đã sửa CSS in:
// khổ trang vẫn **Letter 216×279mm**, mực lấp đầy **90,5%×98,6%** trang, nét
// mỏng nhất **0,085mm**. Tức hình KHÔNG hề bị đặt sai chỗ hay co nhầm — nó
// lấp gần kín trang, đúng như CSS mới bắt nó làm. Thứ sai duy nhất là **khổ
// giấy**: nhồi 400 người vào bề ngang 19,5cm thì chữ nhỏ hơn sợi tóc, và
// không cách viết CSS nào chữa được điều đó.
//
// Mà khổ giấy ấy nằm ngoài tầm với của app: `@page size` chỉ có tác dụng với
// "Lưu thành PDF" của chính Chrome; một trình điều khiển máy in (novaPDF,
// Microsoft Print to PDF…) lấy khổ từ cài đặt của CHÍNH NÓ. Bảo người dùng
// *"vào cài đặt máy in ảo đặt khổ tuỳ chỉnh trước đã"* là đẩy phần khó nhất
// sang cho người không lập trình — đúng thứ `CLAUDE.md` mục 2 dặn đừng làm.
//
// Nên đường chắc chắn là: **app tự ghi lấy file PDF**. Khổ giấy nằm trong
// `/MediaBox` của chính file, không hộp thoại nào, không trình điều khiển nào
// chen vào được. Mở ra ở đâu cũng đúng 84×6,2cm nếu đã đặt 84cm.
//
// ⚠ **Không thêm thư viện nào** (`CLAUDE.md` mục 3): một PDF chứa ĐÚNG MỘT
// tấm ảnh là loại file đơn giản nhất của định dạng ấy — năm đối tượng và một
// bảng `xref`. Viết tay chưa tới trăm dòng, còn `jsPDF` từ CDN thì nặng 300KB
// và phải hỏi chủ dự án trước.
//
// ⚠ **Ảnh nhúng là JPEG, không phải PNG.** PDF nhận thẳng luồng JPEG qua bộ
// lọc `/DCTDecode` — chép nguyên byte, không phải giải nén rồi nén lại. PNG
// thì PDF KHÔNG nhận, muốn nhúng phải đọc `getImageData()` ra byte thô: một
// tấm 139 triệu điểm ảnh thành **417 MB** trong bộ nhớ, đủ giết cả thẻ trình
// duyệt. Đây là đổi chác có chủ ý: mất một chút ở rìa chữ (JPEG chất lượng
// 0,95), đổi lấy việc khổ lớn CHẠY ĐƯỢC THẬT thay vì hết bộ nhớ.

/** 1 inch = 72 point trong PDF. Khổ giấy trong `/MediaBox` tính bằng point. */
const PT_MOI_INCH = 72;

/**
 * Gói một tấm ảnh JPEG thành một file PDF một trang, khổ giấy ĐÚNG bằng số mm
 * yêu cầu, ảnh phủ kín trang.
 *
 * Viết tay theo đúng cấu trúc PDF tối giản — xem khối ghi chú ngay trên về lý
 * do không dùng thư viện. Bảng `xref` đòi **vị trí byte tuyệt đối** của từng
 * đối tượng, nên phải dựng bằng mảng byte và đếm dọc đường; nối chuỗi rồi mới
 * đổi sang byte là hỏng ngay khi có một chữ tiếng Việt lọt vào.
 *
 * @param {Uint8Array} jpeg   byte JPEG (baseline) của tấm ảnh
 * @param {number} wPx        bề ngang ảnh, điểm ảnh
 * @param {number} hPx        bề cao ảnh, điểm ảnh
 * @param {number} rongMm     bề ngang KHỔ GIẤY, mm
 * @param {number} caoMm      bề cao KHỔ GIẤY, mm
 * @returns {Blob}            file PDF
 */
export function goiJpegThanhPdf(jpeg, wPx, hPx, rongMm, caoMm) {
  return goiNhieuJpegThanhPdf([jpeg], wPx, hPx, rongMm, caoMm);
}

/**
 * Gói NHIỀU tấm JPEG thành một PDF NHIỀU TRANG, mọi trang cùng khổ giấy, mỗi
 * ảnh phủ kín một trang.
 *
 * Bố trí đối tượng (bảng `xref` đòi vị trí byte tuyệt đối nên phải đếm dọc
 * đường, không nối chuỗi rồi mới đổi sang byte):
 *
 *   1        Catalog
 *   2        Pages — `/Kids` kể tên mọi trang
 *   3        Contents — MỘT luồng dùng CHUNG cho mọi trang, vì mọi trang cùng
 *            khổ nên câu lệnh vẽ y hệt nhau. Mỗi trang tự trỏ `/Im0` sang ảnh
 *            của riêng nó qua `/Resources`.
 *   4+2i     Trang thứ i
 *   5+2i     Ảnh của trang thứ i
 *
 * @param {Uint8Array[]} danhSachJpeg  ảnh từng trang, theo thứ tự
 * @param {number} wPx  bề ngang ảnh mỗi trang, điểm ảnh (mọi trang bằng nhau)
 * @param {number} hPx  bề cao ảnh mỗi trang
 * @param {number} rongMm  bề ngang KHỔ GIẤY, mm
 * @param {number} caoMm   bề cao KHỔ GIẤY, mm
 * @returns {Blob}
 */
export function goiNhieuJpegThanhPdf(danhSachJpeg, wPx, hPx, rongMm, caoMm) {
  const rongPt = rongMm / MM_MOI_INCH * PT_MOI_INCH;
  const caoPt  = caoMm  / MM_MOI_INCH * PT_MOI_INCH;
  const so = (n) => n.toFixed(4).replace(/\.?0+$/, '');

  const phan = [];      // từng mảnh, chuỗi latin1 hoặc Uint8Array
  let daiHienTai = 0;
  const viTri = {};     // số hiệu đối tượng -> vị trí byte

  const them = (x) => {
    phan.push(x);
    daiHienTai += typeof x === 'string' ? x.length : x.length;
  };
  const doiTuong = (soHieu, than) => {
    viTri[soHieu] = daiHienTai;
    them(soHieu + ' 0 obj\n' + than + '\nendobj\n');
  };

  them('%PDF-1.4\n');
  // Dòng bốn byte cao — quy ước để phần mềm cũ nhận ra đây là file NHỊ PHÂN.
  them(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

  const soTrang = danhSachJpeg.length;
  if (!soTrang) throw new Error('Không có trang nào để gói vào PDF.');

  // Số hiệu đối tượng của trang thứ i và ảnh của nó.
  const maTrang = (i) => 4 + 2 * i;
  const maAnh   = (i) => 5 + 2 * i;
  const tongDoiTuong = 3 + 2 * soTrang;

  doiTuong(1, '<< /Type /Catalog /Pages 2 0 R >>');

  const kids = [];
  for (let i = 0; i < soTrang; i++) kids.push(maTrang(i) + ' 0 R');
  doiTuong(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + soTrang + ' >>');

  // MỘT luồng nội dung dùng chung cho mọi trang — mọi trang cùng khổ nên câu
  // lệnh vẽ y hệt; mỗi trang tự trỏ `/Im0` sang ảnh riêng qua `/Resources`.
  const noiDung = 'q\n' + so(rongPt) + ' 0 0 ' + so(caoPt) + ' 0 0 cm\n/Im0 Do\nQ\n';
  doiTuong(3, '<< /Length ' + noiDung.length + ' >>\nstream\n' + noiDung + 'endstream');

  for (let i = 0; i < soTrang; i++) {
    doiTuong(maTrang(i),
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + so(rongPt) + ' ' + so(caoPt) + ']' +
      ' /Resources << /XObject << /Im0 ' + maAnh(i) + ' 0 R >> >> /Contents 3 0 R >>');

    // Ảnh. `/DCTDecode` = luồng JPEG nguyên xi, chép byte không giải nén.
    const jpeg = danhSachJpeg[i];
    viTri[maAnh(i)] = daiHienTai;
    them(maAnh(i) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + wPx +
         ' /Height ' + hPx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
         ' /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
    them(jpeg);
    them('\nendstream\nendobj\n');
  }

  const viTriXref = daiHienTai;
  let xref = 'xref\n0 ' + (tongDoiTuong + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= tongDoiTuong; i++) {
    xref += String(viTri[i]).padStart(10, '0') + ' 00000 n \n';
  }
  them(xref);
  them('trailer\n<< /Size ' + (tongDoiTuong + 1) + ' /Root 1 0 R >>\nstartxref\n' +
       viTriXref + '\n%%EOF\n');

  // Ghép: chuỗi đổi sang byte theo latin1 (mọi ký tự đều < 256 — đã cố ý
  // không cho một chữ tiếng Việt nào vào phần cấu trúc).
  const gom = new Uint8Array(daiHienTai);
  let cho = 0;
  for (const x of phan) {
    if (typeof x === 'string') {
      for (let i = 0; i < x.length; i++) gom[cho + i] = x.charCodeAt(i) & 0xff;
      cho += x.length;
    } else {
      gom.set(x, cho);
      cho += x.length;
    }
  }
  return new Blob([gom], { type: 'application/pdf' });
}

/**
 * Dựng ảnh PNG raster đúng khổ giấy + độ phân giải yêu cầu. KHÔNG tự tải về —
 * trả blob, nơi gọi dựng link bằng `veLinkTai()` (xem ghi chú đầu file).
 *
 * ⚠ Khác `xuatAnhPNG()` ở đúng một điều quan trọng: hàm kia có trần MỀM
 * (`CANH_TOI_DA` 4096, tự co nhỏ lại cho vừa — đó là đường "chụp nhanh", đưa
 * ra ảnh gì cũng hơn không có gì). Hàm này thì NGƯỢC LẠI: người dùng đã gõ
 * đúng khổ giấy và đúng DPI họ cần, tự ý co nhỏ là trả về một tấm ảnh KHÔNG
 * đúng thứ họ đặt mà không nói — nên vượt trần là NÉM LỖI, không co.
 *
 * @param {SVGSVGElement} svgEl
 * @param {object} [tree]    chỉ để đặt tên file
 * @param {number} rongCm    bề ngang khổ giấy, cm
 * @param {number} dpi       điểm ảnh mỗi inch (75–1200)
 * @returns {Promise<{blob: Blob, tenFile: string, w: number, h: number,
 *                    rongMm: number, caoMm: number}>}
 *   `rongMm`/`caoMm` để nơi gọi đem thẳng sang `inAnhRaster()` — bề cao là số
 *   sơ đồ TỰ tính, người dùng không gõ nó nên phải trả ra đây.
 */
export async function xuatAnhDoPhanGiaiCao(svgEl, tree, rongCm, dpi) {
  const { vbW, vbH } = docCoSoDoBatBuoc(svgEl);
  if (!(rongCm > 0)) throw new Error('Chưa nhập bề ngang khổ giấy.');
  if (!(dpi > 0)) throw new Error('Chưa chọn độ phân giải.');

  const { w, h } = tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH);
  kiemTranCanvas(w, h);

  const blob = await dungBlobPngTuSvg(svgEl, w, h, null,
                                      { banDoLon: banDoAnhLon(tree) });
  const rongMm = rongCm * 10;
  return {
    blob,
    tenFile: tenFileAnh(tree, 'png', Math.round(rongCm) + 'cm-' + dpi + 'dpi'),
    w,
    h,
    rongMm,
    caoMm: rongMm * (vbH / vbW),
  };
}

/**
 * Dựng thẳng một file **PDF** đúng khổ giấy + độ phân giải yêu cầu, KHÔNG đi
 * qua hộp thoại in. Đây là đường DUY NHẤT bảo đảm được khổ giấy — xem khối
 * "TỰ DỰNG FILE PDF" ở trên về vì sao hộp thoại in không bảo đảm nổi.
 *
 * Cùng một ruột với `xuatAnhDoPhanGiaiCao()` (cùng cách tính số điểm ảnh,
 * cùng phép chặn trần canvas), chỉ khác hai chỗ: ảnh dựng ra ở dạng JPEG để
 * nhúng thẳng được vào PDF, và kết quả gói lại bằng `goiJpegThanhPdf()`.
 *
 * @param {SVGSVGElement} svgEl
 * @param {object} [tree]    chỉ để đặt tên file
 * @param {number} rongCm    bề ngang khổ giấy, cm
 * @param {number} dpi       điểm ảnh mỗi inch (75–1200)
 * @returns {Promise<{blob: Blob, tenFile: string, w: number, h: number,
 *                    rongMm: number, caoMm: number}>}
 */
export async function xuatPdfDoPhanGiaiCao(svgEl, tree, rongCm, dpi) {
  const { vbW, vbH } = docCoSoDoBatBuoc(svgEl);
  if (!(rongCm > 0)) throw new Error('Chưa nhập bề ngang khổ giấy.');
  if (!(dpi > 0)) throw new Error('Chưa chọn độ phân giải.');

  const { w, h } = tinhCoAnhTheoDpi(rongCm, dpi, vbW, vbH);
  kiemTranCanvas(w, h);

  const jpegBlob = await dungBlobPngTuSvg(svgEl, w, h, 'image/jpeg',
                                          { banDoLon: banDoAnhLon(tree) });
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());

  const rongMm = rongCm * 10;
  const caoMm = rongMm * (vbH / vbW);
  return {
    blob: goiJpegThanhPdf(jpeg, w, h, rongMm, caoMm),
    tenFile: tenFileAnh(tree, 'pdf', Math.round(rongCm) + 'cm-' + dpi + 'dpi'),
    w,
    h,
    rongMm,
    caoMm,
  };
}

/**
 * Xem TRƯỚC một lần xuất nhiều trang sẽ ra cái gì — KHÔNG dựng ảnh nào.
 *
 * Có hàm này để màn hình nói được *"sẽ ra 6 trang A3, ghép lại thành 84×22cm"*
 * NGAY LÚC người dùng còn đang gõ, chứ không phải sau khi bấm và chờ. Chủ dự
 * án đòi đúng điều này: *"hộp xuất pdf thông báo luôn số trang pdf sẽ xuất"*.
 *
 * @returns {{rongMm, caoMm, mmMoiDonVi, cot, hang, tong,
 *            trangRongMm, trangCaoMm, wPx, hPx}|null}
 */
export function xemTruocNhieuTrang(svgEl, chuCaoMm, tenKho, nam, dpi) {
  const co = docCoSoDo(svgEl);
  if (!co || !(chuCaoMm > 0) || !(dpi > 0)) return null;
  const kho = KHO_GIAY[tenKho];
  if (!kho) return null;

  const [trangRongMm, trangCaoMm] = nam ? [kho[1], kho[0]] : [kho[0], kho[1]];
  const { rongMm, caoMm, mmMoiDonVi } = tinhKhoTuChuCao(co.vbW, co.vbH, chuCaoMm);
  const { cot, hang, tong } = tinhSoTrang(rongMm, caoMm, trangRongMm, trangCaoMm);

  return {
    rongMm, caoMm, mmMoiDonVi, cot, hang, tong, trangRongMm, trangCaoMm,
    wPx: Math.max(1, Math.round(trangRongMm / MM_MOI_INCH * dpi)),
    hPx: Math.max(1, Math.round(trangCaoMm / MM_MOI_INCH * dpi)),
  };
}

/**
 * Xuất cả sơ đồ thành PDF NHIỀU TRANG, chữ in ra đúng chiều cao yêu cầu.
 *
 * ⚠ **Dựng TỪNG TỜ một, không dựng một tấm khổng lồ rồi cắt.** Đây là chỗ
 * phá được trần canvas: một sơ đồ 19 mét thì không đời nào nằm vừa 268 triệu
 * điểm ảnh, nhưng mỗi TỜ A3 ở 300dpi chỉ là 3508×4961 — bình thường. Cắt tờ
 * bằng cách đổi `viewBox` của bản sao SVG sang đúng ô lưới của tờ ấy; phần
 * thò ra ngoài sơ đồ thì nền tự phủ.
 *
 * @param {SVGSVGElement} svgEl
 * @param {object} [tree]
 * @param {{chuCaoMm:number, tenKho:string, nam:boolean, dpi:number,
 *          onTien?:function}} tuyChon
 *        `onTien(daXong, tong)` gọi sau mỗi tờ, để màn hình đếm cho người dùng
 *        thấy — xuất 20 tờ mất khá lâu, im lặng là người ta tưởng treo.
 * @returns {Promise<{blob, tenFile, tong, cot, hang, rongMm, caoMm,
 *                    trangRongMm, trangCaoMm}>}
 */
export async function xuatPdfNhieuTrang(svgEl, tree, tuyChon) {
  const { chuCaoMm, tenKho, nam, dpi, onTien } = tuyChon || {};
  const co = docCoSoDoBatBuoc(svgEl);
  const xem = xemTruocNhieuTrang(svgEl, chuCaoMm, tenKho, nam, dpi);
  if (!xem) throw new Error('Chưa đủ thông tin để xuất (chiều cao chữ, khổ giấy, độ phân giải).');

  kiemTranCanvas(xem.wPx, xem.hPx);

  // Một tờ chiếm bao nhiêu ĐƠN VỊ sơ đồ.
  const toRongDonVi = xem.trangRongMm / xem.mmMoiDonVi;
  const toCaoDonVi  = xem.trangCaoMm  / xem.mmMoiDonVi;

  // Vòng ảnh `2 × PHOTO.banKinhTrenO` đơn vị → xin kho bản vừa đủ cho tờ này.
  //
  // ⚠ Đọc từ `PHOTO`, đừng gõ lại con số. Bước 80 nâng bán kính 26 → 34; chỗ
  // này mà còn giữ 52 thì bản in xin ảnh THIẾU 30% điểm ảnh so với chỗ nó
  // được vẽ ra, và cái thiếu ấy chỉ lộ ra khi cầm tờ giấy lên soi.
  const coAnhCanPx = Math.ceil(2 * PHOTO.banKinhTrenO * (xem.wPx / toRongDonVi));
  // Dựng MỘT LẦN cho cả mấy chục tờ, không dựng lại mỗi tờ.
  const banDoLon = banDoAnhLon(tree);

  const trang = [];
  for (let h = 0; h < xem.hang; h++) {
    for (let c = 0; c < xem.cot; c++) {
      const blob = await dungBlobPngTuSvg(svgEl, xem.wPx, xem.hPx, 'image/jpeg', {
        vungCat: {
          vbX: co.vbX + c * toRongDonVi,
          vbY: co.vbY + h * toCaoDonVi,
          vbW: toRongDonVi,
          vbH: toCaoDonVi,
        },
        coAnhCanPx,
        banDoLon,
      });
      trang.push(new Uint8Array(await blob.arrayBuffer()));
      if (typeof onTien === 'function') onTien(trang.length, xem.tong);
    }
  }

  return {
    blob: goiNhieuJpegThanhPdf(trang, xem.wPx, xem.hPx, xem.trangRongMm, xem.trangCaoMm),
    tenFile: tenFileAnh(tree, 'pdf',
                        chuCaoMm + 'mm-' + tenKho + (nam ? '-ngang' : '') + '-' + xem.tong + 'trang'),
    tong: xem.tong, cot: xem.cot, hang: xem.hang,
    rongMm: xem.rongMm, caoMm: xem.caoMm,
    trangRongMm: xem.trangRongMm, trangCaoMm: xem.trangCaoMm,
  };
}

/**
 * Mở hộp thoại in với ẢNH RASTER vừa dựng, chèn full khổ giấy.
 *
 * ⚠ Vì sao có hàm này thay vì thêm một tham số cho `inSoDo()`: hai hàm in HAI
 * THỨ KHÁC HẲN NHAU. `inSoDo()` in `svgEl` SỐNG đang gắn trong trang (nên nó
 * KHÔNG được clone — CSS `@media print` chỉ với tới phần tử thật). Hàm này in
 * một tấm ảnh vừa dựng xong, chưa có mặt trong trang, nên nó phải TỰ gắn một
 * khung tạm vào `<body>` rồi gỡ đi. Nhét cả hai vào một hàm thì mỗi nhánh
 * `if` lại phủ nhận ghi chú của nhánh kia.
 *
 * Phần CSS cô lập vùng in thì DÙNG LẠI ĐÚNG khuôn của `inSoDo()` — ẩn hết
 * trang bằng `visibility`, hiện lại đúng khung — không viết khác đi.
 *
 * ⚠ **Phải đợi `<img>` tải xong rồi mới `window.print()`.** Ảnh là blob nằm
 * sẵn trong bộ nhớ nhưng trình duyệt vẫn cần một nhịp để giải mã; in khi ảnh
 * chưa giải mã xong cho ra một trang TRẮNG — lại đúng loại lỗi im lặng. Đợi
 * bằng `await` được, vì `window.print()` (khác `a.click()` để tải file) không
 * đòi phải nằm trong cử chỉ người dùng.
 *
 * @param {string} nguonAnh  địa chỉ ảnh — object URL hoặc Data URI
 * @param {number} rongMm    bề ngang khổ giấy, mm
 * @param {number} caoMm     bề cao khổ giấy, mm (đã khoá theo tỷ lệ sơ đồ)
 * @returns {Promise<void>}
 */
export async function inAnhRaster(nguonAnh, rongMm, caoMm) {
  if (!nguonAnh || !(rongMm > 0) || !(caoMm > 0)) return;

  donDauVetIn();

  const khung = document.createElement('div');
  khung.id = ID_KHUNG_ANH_IN;
  // Trên MÀN HÌNH khung này phải vô hình và không chiếm chỗ; lúc IN thì CSS
  // dưới đây kéo nó về `inset:0`. Dùng `position:fixed` + đẩy ra ngoài mép
  // thay vì `display:none` — phần tử `display:none` không được in tới, kể cả
  // khi CSS in bật `visibility` lại.
  khung.style.cssText =
    'position:fixed;left:-99999px;top:0;width:1px;height:1px;overflow:hidden';

  const anh = document.createElement('img');
  anh.alt = 'Sơ đồ gia phả';
  khung.append(anh);
  document.body.append(khung);

  await new Promise((xong) => {
    anh.onload = xong;
    anh.onerror = xong;   // hỏng thì vẫn mở hộp thoại in, đừng treo im lặng
    anh.src = nguonAnh;
  });

  const soMm = (n) => n.toFixed(1) + 'mm';
  const cssIn = document.createElement('style');
  cssIn.id = ID_CSS_IN;
  cssIn.textContent =
    '@media print {' +
    'body * { visibility: hidden !important; }' +
    '#' + ID_KHUNG_ANH_IN + ', #' + ID_KHUNG_ANH_IN + ' * { visibility: visible !important; }' +
    '#' + ID_KHUNG_ANH_IN + ' {' +
      'position: absolute !important; inset: 0 !important;' +
      'left: 0 !important; top: 0 !important;' +
      'width: auto !important; height: auto !important;' +
      'overflow: visible !important; margin: 0 !important; padding: 0 !important;' +
    '}' +
    // ⚠ `width/height: 100%` + `object-fit: contain`, KHÔNG phải số mm cứng —
    // xem khối "SỰ CỐ novaPDF" ở đầu file. Ép mm cứng thì khi trình điều
    // khiển máy in đưa khổ giấy khác, ảnh tràn ra ngoài trang rồi bị thu nhỏ
    // thành một chấm. `contain` giữ đúng tỷ lệ, không bóp méo.
    '#' + ID_KHUNG_ANH_IN + ' img {' +
      'display: block !important;' +
      'width: 100% !important; height: 100% !important;' +
      'object-fit: contain !important;' +
      'page-break-inside: avoid;' +
    '}' +
    '@page { size: ' + soMm(rongMm) + ' ' + soMm(caoMm) + '; margin: 0; }' +
    '}';
  document.head.append(cssIn);

  window.print();

  // Gỡ trễ, cùng lý do với `inSoDo()`: trên vài trình duyệt di động
  // `window.print()` không đồng bộ, gỡ ngay là xoá CSS trước khi engine in
  // kịp đọc. Gỡ luôn cả khung ảnh — để lại là rác treo trong `<body>`.
  //
  // ⚠ Gỡ đúng HAI phần tử mình vừa tạo, không gọi lại `donDauVetIn()` (gỡ
  // theo id): người dùng bấm tiếp "In sơ đồ" trong vòng một giây thì lúc bộ
  // đếm này chạy, thẻ mang id ấy đã là thẻ của LẦN SAU — gỡ theo id là gỡ
  // nhầm CSS của bản in người ta đang chờ.
  setTimeout(() => { cssIn.remove(); khung.remove(); }, 1000);
}

/**
 * Có phải màn hình MÁY TÍNH (không phải điện thoại) hay không.
 *
 * ⚠ Dự án KHÔNG có sẵn cơ chế nhận biết điện thoại — `config.js` cố tình giải
 * mọi việc bằng CSS co giãn thuần (`clamp`/`min`/`max`), "không một câu điều
 * kiện nào trong JS". Nhưng khối "in độ phân giải cao" thì KHÔNG co giãn
 * được: chủ dự án nói thẳng *"không áp dụng cho điện thoại"* — điện thoại
 * không có máy in PDF ảo để chọn khổ giấy, và dựng nổi một canvas 139 triệu
 * điểm ảnh trên điện thoại là chuyện khác hẳn trên máy để bàn. Nên phải có
 * đúng MỘT câu điều kiện, và nó sống ở đây chứ không nhét vào `config.js`.
 *
 * Đo bằng CẠNH NGẮN chứ không phải `innerWidth`: một điện thoại NẰM NGANG
 * rộng 740px (đúng khổ `config.js` đang tính tới) sẽ lọt qua mọi ngưỡng đặt
 * theo bề ngang, mà nó vẫn là điện thoại.
 */
export function laManHinhMayTinh() {
  return Math.min(window.innerWidth, window.innerHeight) >= 500;
}

// ============================================================
// IN PDF (window.print)
// ============================================================

// ⚠ **`tinhKichThuocInVua()` ĐÃ XOÁ 01/09/2026.** Nó tính sẵn số pixel rồi ép
// vào `<svg>` khi in. Cả tiền đề ấy SAI, và phép đo `kiem-thu/do-in-vua-trang.mjs`
// đã bác: ép pixel cứng thì khổ giấy thật khác đi là hình TRÀN RA NGOÀI trang
// (đo được 359% ngang trên khổ Letter) rồi bị máy in thu nhỏ thành một chấm.
// Đừng dựng lại nó — cách đúng là để `<svg>` `width/height:100%` rồi cho
// `preserveAspectRatio` của chính nó lo việc co vừa.

/**
 * Mở hộp thoại in của trình duyệt, ẩn mọi thứ trừ sơ đồ.
 *
 * Hai chế độ, chọn bằng việc CÓ hay KHÔNG truyền `rongKhoLonMm`:
 *
 * - **Không truyền** (mặc định) — co vừa đúng MỘT trang A4 ngang.
 * - **Có truyền** — IN KHỔ LỚN (áp phích, bản vẽ kỹ thuật). Chỉ hỏi MỘT số:
 *   BỀ NGANG. Bề dài tự tính theo đúng tỷ lệ sơ đồ đang có, không hỏi thêm —
 *   hỏi cả hai số mà không khoá tỷ lệ là mời người dùng BÓP MÉO sơ đồ (mặt
 *   người, chữ méo hẳn khi khung khác tỷ lệ nội dung). Đúng cách máy in cuộn
 *   (plotter) hoạt động: khổ RỘNG cố định theo cuộn giấy, khổ DÀI cắt theo
 *   nội dung — chủ dự án đối chiếu MapInfo/MicroStation, 31/08/2026.
 *
 *   ⚠ **`@page size` CHỈ ĐƯỢC NGHE Ở MỘT ĐƯỜNG.** Đo bằng
 *   `kiem-thu/do-khong-lon.mjs`: đường **"Lưu thành PDF" của chính Chrome**
 *   (`Page.printToPDF`) nhận khổ tự đặt tới ít nhất 8×12 mét, chuẩn xác.
 *   Nhưng một **TRÌNH ĐIỀU KHIỂN máy in** (novaPDF, Microsoft Print to PDF,
 *   máy in giấy) thì lấy khổ giấy từ CHÍNH NÓ và bỏ qua `@page size` — sự cố
 *   31/08/2026, xem khối "SỰ CỐ novaPDF" ở đầu file. Vì vậy `@page size` ở
 *   đây chỉ là LỜI ĐỀ NGHỊ; thứ bảo đảm bản in luôn dùng được là
 *   `width/height:100%` để `<svg>` tự co vừa khổ giấy THẬT, bất kể khổ nào.
 *
 *   Nói với người dùng: muốn ra ĐÚNG khổ đã gõ thì chọn **"Lưu thành PDF"**
 *   trong hộp thoại in; chọn máy in PDF ảo thì phải đặt khổ giấy tuỳ chỉnh
 *   trong phần cài đặt của chính máy in ấy (`settings.js` có ghi câu này).
 *
 * ⚠ **Không clone SVG như `xuatAnhPNG`.** In dùng thẳng `svgEl` đang gắn
 * trong trang: CSS `@media print` chỉ có tác dụng lên phần tử THẬT đang hiển
 * thị, một bản clone rời rạc ngoài DOM sẽ không được trình duyệt in tới.
 *
 * ⚠ Trên iOS Safari, `window.print()` trong iframe có thể không hoạt động.
 * Chưa thử — nếu gặp, đường PNG là lối thoát dự phòng.
 *
 * @param {SVGSVGElement} svgEl
 * @param {string} idKhungIn  — id của phần tử BỌC `svgEl` cần giữ lại khi in
 *   (xem `tree-view.js`, hằng `ID_KHUNG_IN`) — truyền vào thay vì hằng cứng
 *   ở đây, vì "biết DOM trông thế nào" là việc của `tree-view.js`, không phải
 *   của file này.
 * @param {number} [rongKhoLonMm]  — bề ngang khổ giấy MONG MUỐN, đơn vị mm.
 *   Có giá trị (>0) thì bật chế độ khổ lớn; bỏ trống thì co vừa 1 trang A4.
 */
export function inSoDo(svgEl, idKhungIn, rongKhoLonMm) {
  if (!svgEl || !idKhungIn) return;

  const vb = svgEl.getAttribute('viewBox');
  if (!vb) return;
  const [, , vbW, vbH] = vb.split(/\s+/).map(Number);
  if (!(vbW > 0) || !(vbH > 0)) return;

  const khoLon = rongKhoLonMm > 0;
  let khoGiayCss, leTrangMm;

  if (khoLon) {
    const caoKhoLonMm = rongKhoLonMm * (vbH / vbW);   // khoá tỷ lệ, không hỏi thêm số
    // Số thập phân đủ để mm không tròn mất phần lẻ trên khổ nhiều mét.
    khoGiayCss = rongKhoLonMm.toFixed(1) + 'mm ' + caoKhoLonMm.toFixed(1) + 'mm';
    // Khổ lớn KHÔNG chừa lề — bản đi tiệm, tiệm tự cắt theo khổ đặt.
    leTrangMm = 0;
  } else {
    khoGiayCss = 'landscape';
    leTrangMm = LE_TRANG_MM;
  }

  // Cách cô lập vùng in: ẩn HẾT trang (`visibility:hidden` trên mọi phần tử),
  // rồi hiện lại đúng khung sơ đồ và mọi thứ bên trong nó. Chọn cách này thay
  // vì liệt kê từng lớp DOM cần ẩn (cách mã nháp Antigravity làm,
  // `#app div[style*="position:absolute"]`…) — liệt kê theo VỊ TRÍ trong cây
  // DOM là thứ gãy ngay khi có ai đổi bố cục một màn hình khác, dù màn hình
  // đó không liên quan gì tới việc in. `visibility` (khác `display`) không
  // phá layout nên không cần lo phần tử ẩn làm lệch số đo của phần hiện.
  //
  // ⚠ Gỡ thẻ CŨ (nếu còn) trước khi chèn thẻ MỚI — bấm "In sơ đồ" rồi bấm
  // ngay "In khổ lớn" (hai lần gọi liên tiếp, cách nhau chưa tới 1 giây) mà
  // không gỡ trước thì `document.head` mang HAI thẻ `id="giapha-css-in"`
  // cùng lúc, và bộ dọn trễ ở cuối hàm chỉ gỡ đúng thẻ CUỐI mình vừa tạo —
  // thẻ đầu vẫn còn CSS của lần gọi trước, chồng lên bản in. Bắt được lỗi
  // này khi viết `kiem-thu/kiem-xuat-anh.mjs`, không phải đoán trước.
  //
  // Từ 31/08/2026 dọn bằng `donDauVetIn()` để gỡ luôn khung ảnh của
  // `inAnhRaster()` nếu nó còn sót — bấm "In ảnh" rồi bấm "In sơ đồ" mà khung
  // ảnh còn nằm trong `<body>` thì bản in ra mang cả hai thứ.
  donDauVetIn();

  const cssIn = document.createElement('style');
  cssIn.id = ID_CSS_IN;
  cssIn.textContent =
    '@media print {' +
    'body * { visibility: hidden !important; }' +
    '#' + idKhungIn + ', #' + idKhungIn + ' * { visibility: visible !important; }' +
    '#' + idKhungIn + ' {' +
      'position: absolute !important; inset: 0 !important;' +
      'width: auto !important; height: auto !important;' +
      'overflow: visible !important; padding: 0 !important;' +
      // KHÔNG dùng flex nữa: `<svg>` đã tự căn giữa bằng
      // `preserveAspectRatio` mặc định (`xMidYMid meet`) của chính nó.
      'display: block !important;' +
    '}' +
    '#' + idKhungIn + ' svg {' +
      'width: 100% !important; height: 100% !important;' +
      'page-break-inside: avoid;' +
    '}' +
    '@page { size: ' + khoGiayCss + '; margin: ' + leTrangMm + 'mm; }' +
    '}';
  document.head.append(cssIn);

  window.print();

  // `window.print()` đồng bộ trên hầu hết trình duyệt để bàn — tới đây hộp
  // thoại đã đóng. Trên một số trình duyệt di động nó KHÔNG đồng bộ, nên gỡ
  // trễ thay vì gỡ ngay — gỡ ngay có thể xoá mất CSS trước khi engine in kịp
  // đọc, làm bản in ra không co theo trang nào cả.
  setTimeout(() => cssIn.remove(), 1000);
}

// ============================================================
// HÀM PHỤ TRỢ
// ============================================================

/** Gỡ mọi vết CSS/khung tạm mà hai đường in để lại, nếu còn sót. */
function donDauVetIn() {
  const cssCu = document.getElementById(ID_CSS_IN);
  if (cssCu) cssCu.remove();
  const khungCu = document.getElementById(ID_KHUNG_ANH_IN);
  if (khungCu) khungCu.remove();
}

/**
 * Đọc `viewBox` của sơ đồ, hoặc ném lỗi TIẾNG VIỆT nói đúng lý do.
 *
 * Tách riêng vì cả `xuatAnhPNG()` lẫn `xuatAnhDoPhanGiaiCao()` đều bắt đầu
 * bằng đúng ba câu kiểm này, và chúng phải nói ra CÙNG một câu lỗi — hai câu
 * khác nhau cho cùng một tình huống là thứ làm người dùng tưởng có hai lỗi.
 */
function docCoSoDoBatBuoc(svgEl) {
  if (!svgEl) throw new Error('Chưa có sơ đồ để xuất.');
  const co = docCoSoDo(svgEl);
  if (!co) throw new Error('Sơ đồ chưa vẽ xong, thử lại sau.');
  return co;
}

/**
 * Cỡ `viewBox` của sơ đồ, hoặc `null` nếu chưa vẽ xong.
 *
 * Xuất ra ngoài để `tree-view.js` đưa cho `settings.js` biết TỶ LỆ sơ đồ đang
 * hiện — màn hình Cài đặt cần nó để tự tính mức DPI nào còn dựng nổi, mà nó
 * không được phép chạm vào `svgEl` (`svgEl` là của `tree-view.js`).
 *
 * @returns {{vbX:number, vbY:number, vbW:number, vbH:number}|null}
 */
export function docCoSoDo(svgEl) {
  if (!svgEl) return null;
  const vb = svgEl.getAttribute('viewBox');
  if (!vb) return null;
  const [vbX, vbY, vbW, vbH] = vb.split(/\s+/).map(Number);
  if (!(vbW > 0) || !(vbH > 0)) return null;
  return { vbX, vbY, vbW, vbH };
}

/**
 * Nhân đôi sơ đồ, tô nền, đổi ảnh Drive sang Data URI rồi vẽ lên canvas đúng
 * `w × h` điểm ảnh và trả về blob PNG.
 *
 * Ruột chung của CẢ HAI đường xuất ảnh — chúng chỉ khác nhau ở cách TÍNH ra
 * `w`/`h`, còn mọi việc còn lại (nền, ảnh Drive, serialize, vẽ) giống hệt.
 * Chép hai bản là để hai bản trôi dần khỏi nhau: sửa lỗi CORS ở bản này quên
 * bản kia thì đường xuất khổ lớn lặng lẽ mất ảnh mà không ai biết.
 */
async function dungBlobPngTuSvg(svgEl, w, h, kieu, tuyChon) {
  const { vungCat, coAnhCanPx: coAnhCanPxNgoai, banDoLon } = tuyChon || {};
  const coGoc = docCoSoDoBatBuoc(svgEl);
  // `vungCat` — một Ô LƯỚI của lối xuất nhiều trang: vẽ đúng khúc ấy của sơ
  // đồ thay vì cả sơ đồ. Không truyền thì vẽ trọn, y như cũ.
  const { vbX, vbY, vbW, vbH } = vungCat || coGoc;

  const ban = svgEl.cloneNode(true);
  ban.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH);
  ban.setAttribute('width', String(vbW));
  ban.setAttribute('height', String(vbH));

  // Sơ đồ trên màn hình nền TRONG SUỐT, dựa vào CSS của trang (`#faf8f5`).
  // Canvas không có khái niệm "nền trang" — không tô thì PNG xuất ra nền đen.
  const nenNS = 'http://www.w3.org/2000/svg';
  const nen = document.createElementNS(nenNS, 'rect');
  nen.setAttribute('x', String(vbX));
  nen.setAttribute('y', String(vbY));
  nen.setAttribute('width', String(vbW));
  nen.setAttribute('height', String(vbH));
  nen.setAttribute('fill', NEN_SO_DO);
  ban.insertBefore(nen, ban.firstChild);

  // Vòng ảnh vẽ `2 × PHOTO.banKinhTrenO` đơn vị viewBox, nên ở bản xuất này nó
  // chiếm `2R × tỷ lệ` điểm ảnh. Xin Drive đúng cỡ ấy — xem cảnh báo ở
  // `xuatNhieuTrang()`, đừng gõ lại con số.
  await thayAnhBangDataUri(ban, coAnhCanPxNgoai ||
                                Math.ceil(2 * PHOTO.banKinhTrenO * (w / vbW)), banDoLon);

  const chuoiSvg = new XMLSerializer().serializeToString(ban);
  const svgBlob = new Blob([chuoiSvg], { type: 'image/svg+xml;charset=utf-8' });
  const duongSvg = URL.createObjectURL(svgBlob);

  const khung = document.createElement('canvas');
  khung.width = w;
  khung.height = h;
  const but = khung.getContext('2d');
  but.fillStyle = NEN_SO_DO;
  but.fillRect(0, 0, w, h);

  try {
    const anh = await napAnh(duongSvg);
    but.drawImage(anh, 0, 0, w, h);
  } finally {
    URL.revokeObjectURL(duongSvg);
  }

  // ⚠ `toBlob()` trả `null` là ĐÚNG cách canvas quá to hỏng — không có
  // exception nào cả. `kiemTranCanvas()` đã chặn trước theo trần ĐO ĐƯỢC,
  // nhưng máy ít RAM vẫn hỏng sớm hơn trần ấy, nên câu này là lưới thứ hai.
  return new Promise((resolve, reject) => {
    khung.toBlob(
      (b) => (b
        ? resolve(b)
        : reject(new Error('Trình duyệt không tạo được ảnh ' + w + '×' + h +
                           ' điểm ảnh — máy có thể không đủ bộ nhớ. ' +
                           'Hãy giảm độ phân giải hoặc bề ngang khổ giấy.'))),
      kieu || 'image/png',
      kieu === 'image/jpeg' ? 0.95 : undefined,
    );
  });
}

/**
 * Chuyển MỌI `<image>` có `href` trỏ ra ngoài (bắt đầu bằng "http") thành
 * Data URI, để `canvas.drawImage()` không bị coi là "nhiễm bẩn" (tainted) và
 * từ chối `toBlob()`. Ảnh mặc định (bóng người) đã là Data URI sẵn từ
 * `utils/avatar.js` nên không rơi vào đây.
 *
 * ⚠ CORS CHƯA ĐO — xem cảnh báo đầu file. Tải hỏng thì GỠ `href`, không ném
 * lỗi ra ngoài: một ảnh Drive không tải được không được phép làm hỏng cả lần
 * xuất PNG.
 */
async function thayAnhBangDataUri(svgClone, coAnhCanPx, banDoLon) {
  const anhThat = Array.from(svgClone.querySelectorAll('image')).filter((el) => {
    const href = el.getAttribute('href') || '';
    return href.indexOf('http') === 0;
  });

  await Promise.all(anhThat.map(async (el) => {
    const href = xinBanToHon(el.getAttribute('href'), coAnhCanPx, banDoLon);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const dataUri = await new Promise((resolve, reject) => {
        const doc = new FileReader();
        doc.onloadend = () => resolve(doc.result);
        doc.onerror = () => reject(new Error('Không đọc được ảnh.'));
        doc.readAsDataURL(blob);
      });
      el.setAttribute('href', dataUri);
    } catch (e) {
      el.removeAttribute('href');
    }
  }));
}

/**
 * Đổi đường dẫn ảnh Drive sang bản TO HƠN, vừa đủ cho lần xuất này.
 *
 * ⚠ **Đây là gốc của lời than "ảnh in ra mờ" (chủ dự án, 01/09/2026).** Sơ đồ
 * trên màn hình xin Drive bản **200px** (`PHOTO.thumbSize`) — đúng cho một
 * vòng ảnh 52px trên màn hình. Nhưng đường xuất lại **chép nguyên đường dẫn
 * ấy**: in khổ 84cm thì vòng ảnh thành 2,3cm giấy, mà nguồn vẫn chỉ 200px —
 * tức khoảng 220 DPI, nhìn là thấy mềm nhoè.
 *
 * Drive cắt ảnh theo tham số `sz=w<số>` ngay lúc phục vụ, nên chỉ cần XIN
 * bản to hơn — không phải tải lại gì, không phải đổi dữ liệu, không phải
 * upload lại.
 *
 * ⚠ **Trần thật là 800px** (`PHOTO.maxWidth`): app NÉN ảnh xuống 800px trước
 * khi gửi lên Drive, nên bản gốc trên Drive cũng chỉ có bấy nhiêu. Xin 3000
 * cũng chỉ nhận về 800. Muốn nét hơn nữa thì phải đổi chính con số nén ấy —
 * việc riêng, phải hỏi chủ dự án vì nó đổi cả đường tải ảnh lên.
 *
 * @param {string} href       đường dẫn gốc (bản 200px của màn hình)
 * @param {number} coAnhCanPx bề ngang ảnh cần, tính bằng điểm ảnh của bản xuất
 */
function xinBanToHon(href, coAnhCanPx, banDoLon) {
  if (!href) return href;

  // ⚠ **ĐỔI HẲN SANG BẢN LỚN nếu tấm ấy có** (01/09/2026). Từ nay mỗi ảnh lưu
  // HAI file trên kho: bản nhỏ 400px cho màn hình, bản lớn 1600px để in (xem
  // `PHOTO` ở `config.js`). Sơ đồ trên màn hình trỏ vào bản NHỎ — đúng cho màn
  // hình, nhưng in ra thì nhoè. Nên lúc xuất phải thay chính MÃ FILE trong
  // đường dẫn, không phải chỉ xin cỡ to hơn của bản nhỏ.
  //
  // Bản đồ nhỏ→lớn dựng từ `tree.media`, xem `banDoAnhLon()`. Ảnh tải lên
  // trước ngày có bản lớn thì không có trong bản đồ — giữ nguyên bản nhỏ.
  let ra = href;
  if (banDoLon) {
    const m = href.match(/[?&]id=([^&]+)/) || href.match(/\/d\/([^=/?]+)/);
    const lon = m && banDoLon.get(decodeURIComponent(m[1]));
    if (lon) ra = ra.replace(m[1], encodeURIComponent(lon));
  }

  if (!(coAnhCanPx > 0)) return ra;
  // Xin dư một nấc cho chắc, nhưng không quá bản lớn đang giữ.
  const xin = Math.min(PHOTO.maxWidthLon, Math.max(200, Math.ceil(coAnhCanPx * 1.2)));
  return ra.replace(/([?&]sz=w)\d+/, '$1' + xin)
           .replace(/(=w)\d+$/, '$1' + xin);       // dạng lh3: …=w200
}

/**
 * Bản đồ `mã ảnh nhỏ → mã ảnh lớn`, dựng từ kho ảnh của cây.
 *
 * Tách ra đây thay vì thêm một trường `photoFileIdLon` vào từng NGƯỜI: mã bản
 * lớn đã nằm sẵn trong bản ghi ảnh (`tree.media`), chép thêm một bản thứ hai
 * vào `persons` là dựng ra hai nguồn sự thật cho cùng một điều, rồi tới ngày
 * chúng lệch nhau thì không ai biết tin bản nào.
 */
function banDoAnhLon(tree) {
  const bang = new Map();
  const ds = tree && Array.isArray(tree.media) ? tree.media : [];
  for (const m of ds) {
    if (m && !m.deleted && m.driveFileId && m.driveFileIdLon) {
      bang.set(String(m.driveFileId), String(m.driveFileIdLon));
    }
  }
  return bang;
}

/** Nạp ảnh từ một URL (kể cả blob:), trả về khi sẵn sàng vẽ lên canvas. */
function napAnh(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không dựng được ảnh từ sơ đồ.'));
    img.src = src;
  });
}

/**
 * "Gia phả họ Nguyễn Trọng Bậc" + 'png' -> "gia-pha-ho-nguyen-trong-bac-so-do-20260831.png"
 *
 * `duoiTen` là phần ghép thêm TRƯỚC đuôi file, ví dụ "84cm-300dpi". Có nó thì
 * ba lần xuất trong cùng một ngày ra ba tên file khác nhau — không có nó,
 * trình duyệt tự thêm "(1)", "(2)" và người dùng không còn biết file nào là
 * bản 300 DPI, file nào là bản 1200 DPI.
 */
function tenFileAnh(tree, duoi, duoiTen) {
  const t = new Date();
  const so = (n) => String(n).padStart(2, '0');
  const ngay = t.getFullYear() + so(t.getMonth() + 1) + so(t.getDate());
  const ten = tree && tree.tree && typeof tree.tree.name === 'string' ? tree.tree.name : '';
  const goc = boDauChoTenFile(ten).slice(0, 60) || 'gia-pha';
  return goc + '-so-do-' + ngay + (duoiTen ? '-' + duoiTen : '') + '.' + duoi;
}

/**
 * Dựng một link tải thật (không tự bấm) cho một blob, đúng kiểu dáng nút của
 * `settings.js`. Tách ra đây (thay vì viết lại trong `settings.js`) vì cả
 * PNG lẫn mọi thứ xuất ra ở file này đều cần đúng một thao tác này.
 *
 * @param {Blob} blob
 * @param {string} tenFile
 * @param {string} chuNut
 * @returns {HTMLAnchorElement}
 */
export function veLinkTai(blob, tenFile, chuNut) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tenFile;
  a.textContent = chuNut;
  a.style.cssText =
    'display:block;width:100%;min-height:42px;margin-top:8px;padding:11px 14px;' +
    'box-sizing:border-box;text-align:center;text-decoration:none;font-size:14px;' +
    'font-weight:600;border-radius:9px;background:#2a2622;color:#fffdf9;' +
    'border:1px solid #2a2622;touch-action:manipulation';
  // Thu hồi blob URL khi rời trang — không thu hồi ngay, link còn phải sống
  // để người dùng bấm. Rò rỉ nhỏ, hết phiên là hết; đổi lấy sự chắc chắn link
  // luôn bấm được cho tới khi người dùng rời màn hình Cài đặt.
  return a;
}
