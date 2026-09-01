// ============================================================
// giapha · js/config.js
// Vai trò  : Hằng số hiển thị phía trình duyệt.
// Lớp      : config — không gọi file nào khác
// Phụ thuộc: (không)
// Phiên bản: 0.14.0 · Cập nhật: 01/09/2026 11:40
// ============================================================
//
// LƯU Ý: từ khi chuyển sang kiến trúc Apps Script, file này KHÔNG còn
// là nơi bạn điền cấu hình. Mọi thứ cần điền nằm ở gas/Config.gs.
// File này chỉ chứa hằng số hiển thị, thường không cần sửa.

export const APP_NAME     = 'Gia phả';
export const DATA_VERSION = 1;

export const PHOTO = {
  // --- HAI BẢN CHO MỖI TẤM ẢNH (01/09/2026) ------------------------------
  //
  // Chủ dự án chỉ ra điều này sau khi in thử: một tấm ảnh không phục vụ nổi
  // cả hai việc. Màn hình cần ảnh NHỎ (tải nhanh trên 4G, và nhất là ít RAM —
  // RAM tốn theo ảnh ĐÃ GIẢI MÃ, một tấm 1600px ngốn 10MB còn tấm 400px chỉ
  // 640KB, gấp mười sáu lần). Bản in thì cần ảnh LỚN.
  //
  // ⚠ **Vì sao lưu HAI FILE chứ không lưu một file to rồi nhờ kho cắt nhỏ.**
  // Drive có cắt ảnh theo `sz=w…`, và app đang dựa vào việc ấy ở NĂM chỗ. Nhưng
  // dự án sẽ chuyển sang Supabase, nơi dịch vụ cắt ảnh nằm ở gói TRẢ PHÍ. Mất
  // dịch vụ ấy thì lối "một file to" rơi về "tải nguyên ảnh to ở mọi chỗ" —
  // đúng thảm hoạ 4G và RAM ở trên. Hai file thì chạy được trên bất cứ kho nào,
  // kể cả kho không biết cắt ảnh: mỗi chỗ trỏ thẳng vào bản nó cần.
  //
  // Hai con số dưới đây tính ngược từ chỗ dùng, không phải chọn cho tròn:
  //
  //   nhỏ 400px — chỗ hiện to nhất trên màn hình là 240px (thẻ người), và
  //     vòng thông tin 76px trên màn hình 3× cần 228px. 400 phủ hết còn dư.
  //     (Bản 200px cũ thực ra ĐANG THIẾU cho màn hình 3×.)
  //   lớn 1600px — vòng ảnh 52 đơn vị, ở chữ cao 7mm là 47mm trên giấy: 300
  //     DPI cần 559px, 600 DPI cần 1118px. 1600 phủ tới vòng ảnh 135mm ở 300
  //     DPI, và đủ nét cho màn hình 4K khi bấm xem ảnh to.
  maxWidth:    400,   // nén BẢN NHỎ xuống chiều rộng này trước khi gửi lên
  jpegQuality: 0.82,
  maxWidthLon:    1600,   // bản LỚN, chỉ để in và để xem ảnh to
  jpegQualityLon: 0.85,
  thumbSize:   200,

  // Bán kính vòng ảnh trên ô sơ đồ.
  //
  // ⚠ **20 → 26 ở bước 28b** — chủ dự án: *"hình đại diện to hơn, chữ nhỏ
  // hơn"*, học theo cách Quick Family Tree trình bày. Vòng ảnh nay 52px trên
  // một ô rộng 120px, to hơn 30%, mà ô lại NGẮN ĐI: bảng tên đè lên đáy vòng.
  //
  // Đã thử 28 (56px) trước. Hỏng: để giữ chiều cao ô thì bảng tên phải đè sâu
  // 14px, và lúc ấy vòng ảnh đọc ra thành hình vòng cung — xem `BONG` trong
  // `utils/image.js`.
  //
  // ⚠ Vẽ 52px nhưng XIN Drive bản 200px (`thumbSize` ở trên): màn hình điện
  // thoại có tỷ lệ pixel gấp 2–3, xin đúng 52 thì ảnh rỗ.
  banKinhTrenO: 26,

  // Cách từ mép trên ô xuống đỉnh vòng ảnh.
  //
  // ⚠ **BẰNG 0, và đó là một quyết định chứ không phải bỏ sót.** Ô sơ đồ nay
  // không có viền (bước 28), nên "mép trên ô" chỉ còn là một toạ độ, không
  // phải một đường kẻ ai nhìn thấy. Để nó bằng 0 thì **đỉnh vòng ảnh CHÍNH LÀ
  // mép trên ô**, và mọi nét đi từ trên xuống — nét treo con, nốt cụt mọc lên —
  // chạm đúng vào vòng ảnh, không dừng lơ lửng cách nó mấy pixel.
  //
  // Để 6 thì mỗi nét ấy hụt đúng 6px. Sáu pixel không ai gọi tên được, nhưng
  // nhìn vào thì thấy sơ đồ "rời rạc" mà không chỉ ra được vì sao.
  leTrenO:       0,
};

// Kích thước sơ đồ (pixel)
//
// nodeHeight là chiều cao CỐ ĐỊNH của mọi ô, dù người đó có một dòng hay hai,
// và dù người đó CÓ ẢNH HAY KHÔNG. Để ô co lại theo nội dung thì các ô cùng
// một đời sẽ so le, sơ đồ nhìn gãy.
//
// ⚠ **64 → 104 → 88 trong cùng một ngày (20/08/2026, bước 28).** Ba con số ấy
// kể lại đúng ba lần chủ dự án nhìn app thật:
//
//   64   trước khi có ảnh
//   104  chừa chỗ cho vòng ảnh 40px xếp TRÊN chữ  → *"khoảng cách quá lớn"*
//   88   vòng ảnh to lên 52px, nhưng BẢNG TÊN ĐÈ LÊN đáy nó, học theo QFT
//
// Nghe ngược đời: ảnh to thêm 30% mà ô lại ngắn đi 16px. Chỗ tiết kiệm nằm ở
// **phần chồng lên nhau** — bảng tên chồm lên vòng ảnh 8px — và ở chữ nhỏ đi
// một nấc, nhờ đó ít tên phải xuống hai dòng hơn.
//
// Đọc CÙNG `vGap` bên dưới, đừng đọc riêng: bước hàng = nodeHeight + vGap.
// Đo thật trên 59 sơ đồ bằng `kiem-thu/do-o-co-anh.mjs`.
export const LAYOUT = {
  nodeWidth:  120,

  // ⚠ Chiều cao khi KHÔNG hiện hàng ngày giỗ.
  nodeHeight:  88,

  // Chiều cao khi công tắc "Ngày giỗ" đang BẬT: thêm đúng một hàng chữ.
  //
  // ⚠ Cao thêm cho MỌI ô, kể cả người không có ngày giỗ và người còn sống. Đó
  // là cái giá của luật *"ô cao bằng nhau"* ngay ở đầu khối này. Ai thấy phí
  // thì tắt công tắc đi — nó mặc định TẮT.
  //
  // ⚠ `layout.js` đọc lại hai con số này ở MỖI lần `computeLayout()`, không
  // chụp một lần lúc nạp như trước bước 28. Xem ghi chú `CAO` ở đó.
  nodeHeightNgayGio: 99,

  hGap:        28,   // cách ngang giữa 2 người

  // Cách dọc giữa 2 đời — cũng chính là ĐỘ DÀI ĐOẠN KẺ DỌC nối hai đời.
  //
  // ⚠ **90 → 48 → 34 trong cùng ngày 20/08/2026**, cả hai lần đều do chủ dự án
  // nhìn app thật rồi chỉ ra: lần đầu *"khoảng cách giữa các hàng quá lớn,
  // lãng phí không gian, nhất là điện thoại"*, lần sau *"có thể giảm 30% nữa ở
  // chỗ giảm độ dài gạch nối theo chiều dọc"*.
  //
  // Đọc CÙNG `nodeHeight`, đừng đọc riêng: thứ mắt nhìn thấy là **bước hàng**.
  //
  //     trước bước 28   64 + 90 = 154
  //     giữa bước 28   104 + 90 = 194   ← chỗ chủ dự án kêu lần đầu
  //     nay             88 + 34 = 122   ← ngắn hơn 21% so với thời chưa có ảnh
  //
  // Tức là mỗi ô mang thêm một khuôn mặt 52px và một dòng tuổi, mà sơ đồ vẫn
  // ngắn hơn hẳn. Chỗ 90px kia sinh ra khi ô mới cao 64 và CÓ VIỀN; bỏ viền
  // rồi thì phần trống giữa hai hàng vốn đã rộng ra, cộng thêm 90 nữa là thừa
  // hai lần.
  //
  // ⚠ **Sàn của con số này là `stubLength + stubRadius`** — nốt cụt mọc thẳng
  // xuống phải nằm gọn trong khe giữa hai đời, không thì nốt tròn rơi vào ô
  // người ở đời dưới. Nay 22 + 6 = 28 < 34, còn chừa 6px. Hạ `vGap` nữa thì
  // PHẢI hạ `stubLength` trước, đừng hạ một mình.
  vGap:        34,
  spouseGap:   16,

  // Độ dài đường kẻ dẫn tới nốt cụt, hướng LÊN và XUỐNG.
  // 34 → 22 ở bước 28d, để `vGap` xuống được 34. Xem ghi chú `vGap` ở trên.
  stubLength:  22,
  stubRadius:   6,

  // Nốt cụt nằm NGANG phải ngắn hơn, và đây là lý do — đừng gộp lại làm một
  // con số (16/08/2026, chat 1.4).
  //
  // Chiều dọc có vGap (nay 34px) để mọc ra, chiều ngang chỉ có hGap = 28px giữa
  // hai khối anh em. Dùng chung 34px thì nốt tròn rơi hẳn vào trong ô người
  // bên cạnh: đo trên bản 57 người, 14/120 nốt đè lên ô, và ĐÚNG BẰNG toàn bộ
  // số nốt nằm ngang — tức mọi nốt ngang đều hỏng. Sáu bất biến của chat 1.3
  // không bắt được vì chúng chỉ xét ô với ô; lỗi này chỉ lộ ra khi xem hình.
  //
  // 14 + stubRadius 6 = 20 < 28, còn chừa 8px hở. Đổi hGap thì phải đổi cả
  // con số này. (Bản ngang KHÔNG hạ theo bản dọc ở bước 28d: nó bị hGap chặn,
  // không bị vGap chặn.)
  stubLengthNgang: 14,

  // Nét vợ chồng chồng nấc khi một người có nhiều bạn đời — QUY-TAC-VE §3.
  // Nét thứ nhất luôn nằm giữa khung; nét thứ k lùi lên spouseStepMax pixel
  // mỗi nấc, nhưng tự co lại để nấc trên cùng còn cách mép trên
  // spouseStepPadTop pixel. Cộng dồn cứng 8px thì đến người thứ tư nét tràn
  // ra khỏi khung.
  spouseStepMax:    8,
  spouseStepPadTop: 6,

  // Cách ngang giữa hai KHỐI gốc rời nhau (hai gia đình không nối với nhau
  // trong cùng một sơ đồ). Rộng hơn hGap để mắt tách được hai khối.
  blockGap:    56,
};

// Bốn con số điều khiển tập người được vẽ. Xem KE-HOACH_V08.
//
//   ancestors           số đời vẽ lên   — 0 = không giới hạn
//   descendants         số đời vẽ xuống — 0 = không giới hạn
//   spouseOfDescendants có vẽ vợ/chồng của hậu duệ không
//   k                   đi lên tới đời thứ mấy thì còn rẽ ngang sang anh chị em
//
// ancestors để 0 (không phải 3) vì ảnh hinh_3.jpg vẽ liền 5 đời tổ tiên.
// k = 1 là con số Quick Family Tree đang dùng, đã đối chiếu cả bốn ảnh.
export const DEFAULT_SCOPE = {
  ancestors:           0,
  descendants:         0,
  spouseOfDescendants: true,
  k:                   1,
};

// ============================================================
// TÊN PHỤ — nhãn tiếng Việt của `names[].type`
// ============================================================
//
// Gia phả Việt gọi một người bằng nhiều tên: tên huý (tên thật lúc nhỏ, kiêng
// gọi ra), tên tự, tên thụy (đặt sau khi mất), pháp danh (nhà chùa đặt), và
// tên thường gọi. Schema đã chứa cả năm từ bước 00 — `CAU-TRUC-DU-LIEU §names[]`.
//
// ⚠ **Bảng này ở `config` chứ không nằm trong hai file `pages`, và đó là chủ ý.**
// Form GHI mã `phap_danh` xuống dữ liệu, thẻ ĐỌC mã ấy lên để kể tên. Hai bên
// giữ hai bảng riêng thì tới ngày ai đó thêm một loại tên, một bên biết còn bên
// kia hiện trơ cái mã `phap_danh` ra giữa thẻ. Đây đúng là *hằng số hiển thị*.
//
// ⚠ **`chinh` KHÔNG có trong bảng.** Tên chính không phải một lựa chọn trong
// danh sách tên phụ — nó là dòng tên lớn ở đầu thẻ, và mỗi người chỉ có đúng một.
export const LOAI_TEN_PHU = [
  { ma: 'huy',        chu: 'Tên huý' },
  { ma: 'tu',         chu: 'Tên tự' },
  { ma: 'thuy',       chu: 'Tên thụy' },
  { ma: 'phap_danh',  chu: 'Pháp danh' },
  { ma: 'thuong_goi', chu: 'Thường gọi' },
  { ma: 'khac',       chu: 'Tên khác' },
];

/**
 * Nhãn tiếng Việt của một mã loại tên. Mã lạ — dữ liệu cũ, hoặc file GEDCOM
 * nhập từ phần mềm khác — trả về CHÍNH CÁI MÃ chứ không trả về chuỗi rỗng:
 * thấy `birth_name` giữa thẻ thì còn biết đường mà tra, thấy khoảng trống thì
 * tưởng dữ liệu hỏng.
 */
export function nhanLoaiTenPhu(ma) {
  const m = String(ma || '').trim();
  if (m === '') return '';
  const muc = LOAI_TEN_PHU.find((x) => x.ma === m);
  return muc ? muc.chu : m;
}

// ============================================================
// QUAN HỆ CHA MẸ – CON (việc 3, 21/08/2026)
// ============================================================
//
// ⚠ **Bảng này ở `config` chứ không nằm trong `domains/union.js`, cùng đúng lý
// lẽ đã dùng cho `LOAI_TEN_PHU`:** form GHI mã `thua_tu` xuống dữ liệu, thẻ ĐỌC
// mã ấy lên để kể quan hệ. Hai bên giữ hai bảng riêng thì tới ngày ai đó thêm
// một loại quan hệ, một bên biết còn bên kia hiện trơ cái mã ra giữa thẻ.
//
// ⚠ **`union.QUAN_HE_CON` — danh sách mã hợp lệ — DẪN XUẤT từ bảng này**, nên
// hai thứ không thể trôi lệch nhau. Thêm một hàng ở đây là thêm luôn một mã hợp
// lệ; bỏ một hàng là bỏ luôn. Đừng dựng bảng mã thứ hai ở bất cứ đâu.
//
// ⚠ **HAI cột nhãn, không phải một.** Cùng một mã `adopted` đọc từ phía người
// con là *"con nuôi"*, đọc từ phía cha mẹ là *"cha mẹ nuôi"*. Thẻ thông tin kể
// cả hai chiều — nhóm *Cha mẹ* và nhóm *Con* — nên một cột nhãn là chắc chắn có
// một chiều đọc lên sai.
//
// ⚠ **`birth` có nhãn, và nhãn ấy KHÔNG được in ra thẻ.** Form cần chữ "Con đẻ"
// để có cái mà bày trong danh sách chọn; thẻ thì im lặng với `birth` — ghi "con
// đẻ" cạnh mọi người con là bắt người đọc lọc lấy thứ khác thường giữa một rừng
// chữ bình thường. Chỗ quyết định điều đó là nơi GỌI, xem `person-detail.js`.
export const QUAN_HE_CON_NHAN = [
  { ma: 'birth',   con: 'Con đẻ',         chaMe: 'Cha mẹ đẻ' },
  { ma: 'adopted', con: 'Con nuôi',       chaMe: 'Cha mẹ nuôi' },
  { ma: 'step',    con: 'Con riêng',      chaMe: 'Cha dượng / mẹ kế' },
  { ma: 'foster',  con: 'Con nuôi dưỡng', chaMe: 'Cha mẹ nuôi dưỡng' },
  { ma: 'thua_tu', con: 'Con thừa tự',    chaMe: 'Cha mẹ thừa tự' },
];

/**
 * Nhãn tiếng Việt của một mã quan hệ.
 *
 * @param {string} ma
 * @param {'con'|'chaMe'} [phia]  đọc từ phía nào; mặc định là phía người con
 * @returns {string} mã lạ trả về CHÍNH CÁI MÃ — cùng lối với `nhanLoaiTenPhu`:
 *          thấy `sealed` giữa thẻ thì còn biết đường mà tra, thấy khoảng trống
 *          thì tưởng dữ liệu hỏng.
 */
export function nhanQuanHeCon(ma, phia) {
  const m = String(ma || '').trim();
  if (m === '') return '';
  const muc = QUAN_HE_CON_NHAN.find((x) => x.ma === m);
  return muc ? muc[phia === 'chaMe' ? 'chaMe' : 'con'] : m;
}

/**
 * Cùng cái nhãn ấy, nhưng ở dạng CHÚ THÍCH — thứ đứng nép bên cạnh một cái tên
 * trên thẻ, chứ không phải một mục trong danh sách chọn.
 *
 * Khác `nhanQuanHeCon` đúng hai điều, và cả hai đều là chuyện hiển thị:
 *
 * - **`birth` trả về CHUỖI RỖNG.** Ghi "con đẻ" cạnh mọi người con là bắt
 *   người đọc lọc lấy thứ khác thường giữa một rừng chữ bình thường. Chú thích
 *   chỉ có nghĩa khi nó nói một điều KHÁC lệ thường.
 * - **Chữ đầu viết thường.** Nó nằm giữa câu, sau một cái tên — "Nguyễn Bá
 *   Thục (con nuôi)". Viết hoa ở đó đọc lên như một cái tên riêng thứ hai.
 *
 * Ba nơi cần đúng phép này — thẻ thông tin (hai nhóm) và hộp Gỡ nối — nên nó
 * là một hàm, không phải ba lần gõ lại cùng một điều kiện.
 */
export function chuThichQuanHe(ma, phia) {
  const m = String(ma || '').trim();
  if (m === '' || m === 'birth') return '';
  const chu = nhanQuanHeCon(m, phia);
  return chu ? chu.charAt(0).toLowerCase() + chu.slice(1) : '';
}

// ============================================================
// TRẠNG THÁI CỦA MỘT CẶP (27/08/2026)
// ============================================================
//
// ⚠ **Bảng này ở `config` cùng đúng lý lẽ của `QUAN_HE_CON_NHAN`:** form GHI mã
// `divorced` xuống dữ liệu, thẻ gia đình và màn hình *Sửa thông tin gia đình*
// ĐỌC mã ấy lên để kể. Trước hôm nay câu *"Đang là vợ chồng / Đã ly hôn"* nằm
// rải ở bốn nơi, mỗi nơi một bản `u.status === 'divorced' ? … : …`.
//
// ⚠ **CHỈ HAI MỤC, dù `CAU-TRUC-DU-LIEU_V05` cho phép bốn** (`widowed` ·
// `unknown`). Hai mã kia chưa có cửa nào ghi được và app chưa hỏi ai câu ấy;
// bày một mục ra rồi không chỗ nào đọc lên là hứa một việc chưa làm. Mã lạ —
// dữ liệu cũ, hoặc file GEDCOM nhập từ phần mềm khác — thì GIỮ NGUYÊN và hiện
// chính cái mã, cùng lối với `nhanQuanHeCon`.
export const TRANG_THAI_CAP = [
  { ma: 'married',  chu: 'Đang là vợ chồng' },
  { ma: 'divorced', chu: 'Đã ly hôn' },
];

/**
 * Mã trạng thái của một cặp, đọc ra chữ.
 *
 * @param {string} ma  thiếu hoặc rỗng thì coi là `married` — cùng phép chuẩn
 *        hoá mà `union.updateUnion` dùng khi ghi, nên chữ hiện ra luôn đúng
 *        thứ sắp được ghi xuống.
 * @returns {string} mã lạ trả về CHÍNH CÁI MÃ.
 */
export function nhanTrangThaiCap(ma) {
  const m = String(ma || '').trim() || 'married';
  const muc = TRANG_THAI_CAP.find((x) => x.ma === m);
  return muc ? muc.chu : m;
}

// ============================================================
// KHỔ MÀN HÌNH — hai công thức dùng chung cho MỌI lớp phủ
// ============================================================
//
// Chốt 21/08/2026 (việc KM). Chủ dự án: form thiết kế cho điện thoại DỌC, nên
// điện thoại NẰM NGANG và MÁY ĐỂ BÀN dùng chưa thoải mái — hộp vẫn hẹp đúng
// 360px giữa một màn hình rộng 1440px.
//
// ⚠ **Dự án KHÔNG có file CSS.** Mọi kiểu viết thẳng vào `style.cssText`, mà
// `@media` KHÔNG dùng được với kiểu inline. Nên cả hai việc — rộng ra trên máy
// để bàn, cao lên khi màn hình thấp — phải làm bằng **CSS thuần co giãn**
// (`clamp` · `min` · `max` · `vw` · `vh`), không một câu điều kiện nào trong JS.
//
// ⚠ **Hai công thức này là thứ mọi màn hình sinh sau phải GỌI.** Trước hôm nay
// bảy chỗ chép tay bảy chuỗi `max-width:…px` rời nhau, và mỗi màn hình mới lại
// chép thêm một bản. Gõ thẳng một con số px vào màn hình mới là dựng lại đúng
// cái vừa phải đi sửa bảy lần.
//
// ⚠ **MỨC 3 — form hai cột trên màn hình rộng — ĐÃ LOẠI, đừng dựng lại.** Chủ
// dự án: *"gây trải nghiệm không đồng bộ"*. Ai quen form một cột trên điện
// thoại mà mở máy tính ra thấy hai cột thì phải học lại chỗ của từng ô.

/**
 * Chiều cao tối thiểu mà một hộp được phép chiếm, khi màn hình quá thấp để
 * `xxvh` còn đủ dùng — điện thoại nằm ngang cao chừng 360–400px.
 *
 * 340px là chiều cao của khung vòng tròn (`280 × 320`) cộng chỗ cho một dòng
 * tiêu đề. Thấp hơn nữa thì hộp nào cũng thành một khe ngang phải cuộn ba lần.
 */
const SAN_CAO_HOP = 340;

/**
 * Bề ngang của một hộp phủ, dạng giá trị cho `max-width`.
 *
 * ⚠ **`coSo` phải bằng ĐÚNG bề ngang hộp ấy đang có hôm nay.** Nhờ vậy không
 * một khổ màn hình nào hẹp ĐI sau việc này — đó là điều kiện để mức 1+2 không
 * phá thứ đang chạy tốt trên điện thoại DỌC. Trên 360px, `62vw` chỉ ra 223px
 * nên `clamp` lấy sàn, tức hộp giữ nguyên xưa nay.
 *
 * `tiLeVw` cao (≈62) chứ không phải 46: chỗ được lợi nhiều nhất không phải máy
 * để bàn — nó đã chạm trần — mà là **điện thoại nằm ngang** (740 × 360), nơi
 * 46vw chỉ ra 340px, tức không rộng thêm một pixel nào so với hôm nay.
 *
 * @param {number} coSo   bề ngang hôm nay, px — cũng là sàn, không bao giờ hẹp hơn
 * @param {number} toiDa  trần, px — chỗ chữ dài quá một dòng thì khó đọc
 * @param {number} [tiLeVw] phần trăm bề ngang màn hình ở khoảng giữa
 * @returns {string} chuỗi `clamp(...)` để ghép sau `max-width:`
 */
export function rongHop(coSo, toiDa, tiLeVw = 62) {
  return 'clamp(' + coSo + 'px, ' + tiLeVw + 'vw, ' + toiDa + 'px)';
}

/**
 * Chiều cao trần của một hộp phủ, dạng giá trị cho `max-height` (hoặc `height`
 * ở màn hình Danh sách người, nơi chiều cao chốt cứng có lý do riêng).
 *
 * Công thức đọc là: **giữ nguyên `tiLeVh` như xưa nay, chỉ NỚI RA khi màn hình
 * thấp đến mức `tiLeVh` không còn đủ `SAN_CAO_HOP`** — và ngay cả lúc nới cũng
 * không vượt quá chỗ trống thật giữa hai lề của lớp phủ.
 *
 *   `max( <tiLeVh>vh , min( 340px , 100vh − hai lề ) )`
 *
 * Ba khổ để đọc ra ba nhánh, với `tiLeVh = 82` và lề 20px:
 *
 *   điện thoại DỌC   640px cao → max(525, min(340, 600)) = **525** — y hệt hôm nay
 *   máy để bàn       900px cao → max(738, min(340, 860)) = **738** — y hệt hôm nay
 *   điện thoại NGANG 360px cao → max(295, min(340, 331)) = **331** — nới ra, và
 *                                vẫn vừa khít giữa hai lề nên KHÔNG tràn
 *
 * ⚠ Nhánh thứ ba là toàn bộ lý do có `min(...)`. Bỏ nó đi mà viết thẳng 340px
 * thì trên màn hình cao 300px hộp sẽ cao hơn chỗ nó đứng, và vì lớp phủ căn
 * GIỮA nên nó bị cắt CẢ HAI ĐẦU — phần trên cuộn tới không được nữa.
 *
 * ⚠ Phần trừ đi phải là **`haiLe()` của chính lớp phủ đang bọc hộp**, không
 * phải một con số gõ tay: lề co lại trên màn hình thấp (xem `leLopPhu`), và hai
 * công thức lệch nhau dù chỉ 8px là hộp thò ra ngoài đúng 8px ấy.
 *
 * @param {number} tiLeVh  tỉ lệ chiều cao hôm nay (82 · 86 · 70…)
 * @param {number} [le]    `padding` gốc của lớp phủ, px — MỘT bên
 * @returns {string} chuỗi `max(...)` để ghép sau `max-height:`
 */
export function caoHop(tiLeVh, le = 20) {
  return 'max(' + tiLeVh + 'vh, min(' + SAN_CAO_HOP + 'px, ' +
         'calc(100vh - ' + haiLe(le) + ')))';
}

/**
 * Bề ngang TỐI ĐA của một nút hành động, khi hộp đã rộng ra.
 *
 * ⚠ Chốt sau khi NHÌN ẢNH của việc KM, không phải trước. Hộp rộng ra thì mọi
 * thứ `width:100%` hay `flex:1` bên trong rộng theo, và một nút *Đóng* dài
 * 640px thì đọc ra thành một cái thanh, không ra một cái nút — trong khi đích
 * chạm chẳng khá hơn nút 320px chút nào. Bài kiểm tự động cho qua trọn vẹn:
 * nút ấy KHÔNG SAI, nó chỉ xấu. Đây là lần thứ TÁM trong dự án này một lỗi bố
 * cục chỉ lộ ra khi có người mở ảnh ra nhìn.
 *
 * 320px vì đó là bề ngang nút trên điện thoại dọc — khổ mà cả họ đang dùng.
 * Lấy đúng con số ấy làm trần thì nút trên máy để bàn **to bằng** nút trên
 * điện thoại, không to hơn: cùng một màn hình, không phải hai.
 */
export const RONG_NUT_TOI_DA = '320px';

/**
 * `padding` của một lớp phủ — **lề co lại khi màn hình thấp**.
 *
 * Lề trên/dưới 20px là 11% chiều cao của một điện thoại nằm ngang, mà lại chỉ
 * là 4% của một màn hình máy để bàn. Cùng một con số px đọc ra hai nghĩa khác
 * hẳn nhau, nên nó phải co: **đủ 20px khi màn cao từ 500px trở lên, dưới mức ấy
 * thì thu theo đúng tỉ lệ.**
 *
 * Lề TRÁI/PHẢI không co — bề ngang chưa bao giờ là thứ thiếu ở đây, và một hộp
 * chạm sát mép màn hình thì mất luôn chỗ bấm-ra-ngoài-để-đóng.
 *
 * @param {number} [le] lề gốc, px
 * @returns {string} chuỗi để ghép sau `padding:`
 */
export function leLopPhu(le = 20) {
  return 'min(' + le + 'px, ' + (le / 5) + 'vh) ' + le + 'px';
}

/** Tổng hai lề trên–dưới của `leLopPhu(le)`. Dùng trong `calc()` của `caoHop`. */
function haiLe(le) {
  return 'min(' + (le * 2) + 'px, ' + (le * 2 / 5) + 'vh)';
}
