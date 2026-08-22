// ============================================================
// giapha · js/domains/render.js
// Vai trò  : Vẽ SVG từ kết quả layout. Chỉ vẽ, không tính toạ độ sơ đồ.
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phụ thuộc: config (LAYOUT, PHOTO), utils/text, utils/image, utils/avatar
// Phiên bản: 1.6.0 · Cập nhật: 22/08/2026 09:40
// ============================================================
//
// Đây là file sẽ sửa nhiều nhất khi chỉnh giao diện. Giữ nó chỉ chứa việc vẽ,
// để mỗi lần đổi màu không phải nạp cả layout.js vào ngữ cảnh.
//
// ============================================================
// BỐN LUẬT KHÔNG ĐƯỢC PHÁ
// ============================================================
//
// 1. KHÔNG TÍNH LẤY MỘT PIXEL NÀO CỦA SƠ ĐỒ. Mọi x, y, mọi mảng điểm gấp
//    khúc đều do layout.js sinh (QUY-TAC-VE §11). Muốn đổi khoảng cách giữa
//    hai đời thì sửa LAYOUT trong config.js, KHÔNG sửa ở đây.
//    Ngoại lệ duy nhất, và là ngoại lệ có chủ ý: chữ NẰM TRONG ô — cỡ chữ,
//    baseline, chỗ ngắt dòng của tên dài. Đó là việc của tầng vẽ, layout.js
//    chỉ hứa mỗi ô rộng LAYOUT.nodeWidth và cao LAYOUT.nodeHeight.
//
// 2. VẼ HAI LƯỢT (QUY-TAC-VE §7): hết đường nối rồi mới đến ô.
//
//    Luật đầy đủ KHÔNG phải "ô thì tô nền đặc" — mà là:
//
//        MỌI THỨ VẼ ĐÈ LÊN NÉT ĐỀU PHẢI TỰ MANG NỀN ĐẶC.
//
//    Ô người chỉ là ca đầu tiên của luật đó, không phải toàn bộ luật. Vẽ sau
//    mới chỉ giải quyết được thứ tự; cái làm nét biến mất là NỀN, không phải
//    thứ tự. Bất cứ hình nào trong suốt — chữ, con số, ký hiệu — vẽ sau đến
//    mấy thì nét vẫn chạy xuyên qua nó.
//
//    Đã sập đúng chỗ này một lần (17/08/2026): số đếm cạnh nốt cụt gộp vẽ ở
//    lượt cuối cùng, đúng thứ tự, nhưng không có nền — nên đường kẻ ngang gom
//    các con chạy thẳng qua con số. Sửa bằng cách cho con số một đĩa nền đặc,
//    xem `chuCoNen()`. Thêm hình mới vẽ chồng lên nét thì dùng lại hàm đó.
//
//    Nhờ luật này mà nét chéo và nét chồng nấc không cần tính giao điểm với
//    mép ô — cứ vẽ tâm → tâm rồi để ô đè lên.
//    Nốt cụt tách làm hai phần: đoạn kẻ đi cùng lượt đường nối, còn NỐT TRÒN
//    vẽ sau cùng — nốt phải bấm được nên không được để ô nào che mất.
//
//    ⚠ **Từ bước 28, cái mang nền đặc KHÔNG còn là cả ô.** Ô đã bỏ viền. Hai
//    thứ che nét bây giờ là VÒNG ẢNH (đặc, rộng 52px giữa ô) và BẢNG TÊN nền
//    trắng. Đấy là chủ ý: nét vợ chồng nay chạy ngang tầm khuôn mặt, nên nếu ô
//    che cả dải trên thì nét bị nuốt mất, chỉ hở 16px ở khe giữa hai ô.
//
//    ⚠ Hệ quả phải nhớ: **hai hàng chữ DƯỚI bảng tên không có nền**. Chúng nằm
//    trong khoảng vGap, nơi không nét nào chạy qua — nên hiện tại không sao.
//    Bao giờ có nét chạy ngang ở tầm ấy thì phải cho chúng nền, xem `chuCoNen()`.
//
// 3. BA LOẠI NÉT CỐ ĐỊNH (QUY-TAC-VE §8), đọc từ `kind` + `relation`. Không
//    đổi nét theo mật độ: cùng một nốt mà lúc nét này lúc nét kia thì người
//    dùng phải học hai luật.
//
// 4. TRƯỜNG TRỐNG THÌ KHÔNG VẼ HÀNG ĐÓ. Không năm sinh lẫn năm mất thì BỎ HẲN
//    hàng năm; không có ngày giỗ thì bỏ hẳn hàng giỗ. Không ghi "Không rõ",
//    không hiện "...". Dùng `utils/text.doiSongTuoi()` và `ngayGio()`, đừng tự
//    kiểm `if (p.birth.iso)` ở đây. Ca kiểm sống: P0005 Lê Thị Thái.
//    Chiều cao ô vẫn CỐ ĐỊNH — ô co theo nội dung thì các ô cùng một đời so le.

import { LAYOUT, PHOTO } from '../config.js';
import { fullName, doiSongTuoi, ngayGio } from '../utils/text.js';
import { driveThumbUrl } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';

const NS = 'http://www.w3.org/2000/svg';

/**
 * Đếm số lần đã vẽ, chỉ để dựng mã `clipPath` không đụng nhau.
 *
 * ⚠ **Mã `id` trong SVG là mã của CẢ TRANG, không phải của riêng một thẻ
 * `<svg>`.** Vòng ảnh mỗi ô cần một `clipPath` riêng, và bản đầu đặt mã theo
 * mã người (`anh-P0001`). Trong app thật chỉ có một sơ đồ nên không sao — ngay
 * lúc dựng một trang có HAI sơ đồ để đối chiếu thì mọi `url(#anh-P0001)` đều
 * trỏ về cái thứ nhất, ở toạ độ khác hẳn, và **ảnh bị cắt sạch: ô chỉ còn một
 * vòng tròn rỗng**. Ảnh `kiem-thu/ca-kho.png` bắt được đúng cảnh ấy.
 *
 * Trong app thật lỗi này chưa bao giờ xảy ra, nhưng nó nằm sẵn đó chờ màn hình
 * đầu tiên vẽ hai sơ đồ cạnh nhau — mà "so hai người trung tâm" là việc sớm
 * muộn cũng làm.
 */
let demLanVe = 0;

/**
 * Bảng giao diện — màu, cỡ chữ, độ dày nét. Chỗ duy nhất được sửa khi đổi
 * "trông thế nào". Không có con số nào ở đây ảnh hưởng tới VỊ TRÍ của ô.
 */
export const VE = {
  // ⚠ **Bước 28 hạ cả ba cỡ chữ một nấc** — chủ dự án: *"hình đại diện to hơn,
  // chữ nhỏ hơn"*. Ô vẫn rộng 120px, nên chữ nhỏ đi nghĩa là ít tên phải xuống
  // hai dòng hơn, và mỗi ô ngắn lại. Trước đó là 12 · 11 · 11.
  //
  // Ở 11px, phần lớn tên ba chữ tiếng Việt ("Nguyễn Bá Cương") vừa một dòng —
  // đo thật bằng canvas, xem `beRong()`. Đừng nâng lên 12 lại: ở 12px một số
  // tên ba chữ vượt, một số không, và cả một hàng ô cao thấp so le vô cớ.
  chuTen:      11,
  chuTenNho:   10,     // dùng khi tên dài phải xuống hai dòng
  leTrongO:    12,     // tổng lề trái + phải chừa cho chữ dưới bảng tên
  chuNam:      9.5,
  chuDem:      10,     // số đếm cạnh nốt cụt gộp
  phong:       'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',

  // --- BẢNG TÊN (bước 28) ------------------------------------------------
  //
  // Nền trắng, bo góc, ĐÈ LÊN đáy vòng ảnh `deLenAnh` pixel. Chính chỗ đè ấy
  // là phần tiết kiệm được: bảng tên nằm hẳn dưới vòng ảnh thì ô cao thêm 8px
  // mà không được gì thêm.
  //
  // ⚠ Bảng này CÓ NỀN ĐẶC, và đó là việc thật chứ không phải trang trí: nó là
  // thứ che nét chạy phía dưới tên (LUẬT 2 ở đầu file). Từ bước 28 nó thay hẳn
  // hình chữ nhật nền cũ của cả ô.
  nenBangTen:   '#ffffff',
  vienBangTen:  '#ece5db',
  boBangTen:    5,
  leBangTen:    3,     // lề trái/phải của bảng so với mép ô
  leTrongBang:  3,     // lề trên/dưới BÊN TRONG bảng
  buocDongTen:  11,    // cách hai dòng tên trong bảng
  // Bảng tên chồm lên đáy vòng ảnh bấy nhiêu pixel.
  //
  // ⚠ Đè sâu quá thì vòng ảnh đọc ra thành HÌNH VÒNG CUNG: vai của bóng
  // người cũng màu trắng, dính vào nền trắng của bảng, và cả hai thành một
  // khối. Thử 14 trước và hỏng đúng thế. 8 thì đáy vòng ảnh chỉ mất 15%, vẫn
  // đọc ra là hình tròn, mà vẫn tiết kiệm được 8px mỗi ô.
  deLenAnh:      8,

  buocDongPhu:  11,    // cách hai hàng chữ DƯỚI bảng tên
  chuGio:       9.5,
  chuGioMau:    '#9b8f7f',

  // Nền của cả trang sơ đồ. Phải khớp `background` trong gas/index.html và
  // trong pages/tree-view.js — đây là màu mà `chuCoNen()` VÀ nền dải chữ của
  // ô dùng để xoá nét chạy phía dưới. Lệch màu là hiện ra một vệt sáng.
  //
  // ⚠ Bước 28 bỏ hai màu `lotO` (#ffffff) và `lotOBien` (#f6f2ec): ô không còn
  // nền riêng, nó tô đúng màu trang. Đừng dựng lại chúng để "cho ô nổi lên" —
  // ô nổi lên đúng là cái khung mà chủ dự án đã bảo bỏ.
  nenTrang:    '#faf8f5',
  chuChinh:    '#2a2622',
  chuPhu:      '#8a8078',

  // Viền ô theo giới tính. `sex: "U"` PHẢI có màu riêng, không được lẫn với
  // nam hay nữ — dữ liệu có hai người mang giá trị này (P0040, P0052).
  vienNam:     '#3f6b8a',
  vienNu:      '#a4576b',
  vienKhongRo: '#8a8078',

  quangTrungTam: '#e08a3c',
  net:           '#6b6157',
  notCut:        '#c07a3e',

  dayNetCon:   1.6,
  dayNetVo:    1.2,
  dayQuang:    3,          // vòng cam quanh ảnh người trung tâm

  motNetDut:   '6 4',      // con nuôi
  motNetGachCham: '5 3 1 3',   // nốt cụt
  // Nét đứt của nút biên (dâu/rể). Từ bước 28 nó nằm ở VÀNH ẢNH, không còn ở
  // viền ô — viền ô đã bỏ. Giữ nguyên khuôn nét để người dùng không phải học lại.
  motNetOBien: '4 3',

  moNetDai:    0.5,        // nét dẫn tới chỗ xa vẽ nhạt hơn
  bo:          8,          // bo góc ô
};

/**
 * Vẽ toàn bộ sơ đồ vào phần tử SVG.
 *
 * @param {SVGSVGElement} svgEl
 * @param {object} layout   kết quả computeLayout()
 * @param {object} index    chỉ mục từ utils/graph.buildIndex — để tra tên
 * @param {{onChonNguoi?:function, onChonNotCut?:function}} [handlers]
 * @param {{hienNgayGio?:boolean}} [tuyChon]
 *        `hienNgayGio` — công tắc của sơ đồ, xem `pages/tree-view.js`. Phải
 *        khớp với cờ cùng tên đưa vào `computeLayout()`: chỗ kia CHỪA CHỖ cho
 *        hàng giỗ, chỗ này VẼ nó. Lệch nhau thì hàng giỗ hoặc tràn ra ngoài ô,
 *        hoặc để lại một khoảng trống không ai giải thích được.
 */
export function renderTree(svgEl, layout, index, handlers, tuyChon) {
  if (!svgEl) return;
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  if (!layout || !Array.isArray(layout.nodes) || layout.nodes.length === 0) return;

  demLanVe += 1;
  const xuLy    = handlers || {};
  const hienGio = !!(tuyChon && tuyChon.hienNgayGio);
  const b    = layout.bounds || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const rong = Math.max(1, b.maxX - b.minX);
  const cao  = Math.max(1, b.maxY - b.minY);

  // bounds đã cộng sẵn lề 24px ở layout.js — dùng thẳng, không cộng thêm.
  svgEl.setAttribute('viewBox', b.minX + ' ' + b.minY + ' ' + rong + ' ' + cao);
  svgEl.setAttribute('width',  String(rong));
  svgEl.setAttribute('height', String(cao));
  svgEl.setAttribute('font-family', VE.phong);

  const gDuong = tao('g', { 'data-lop': 'duong' });
  const gO     = tao('g', { 'data-lop': 'o' });
  const gNot   = tao('g', { 'data-lop': 'not-cut' });

  // --- LƯỢT 1 — toàn bộ đường nối -----------------------------------------
  for (const link of layout.links || []) {
    const el = renderLink(link);
    if (el) gDuong.append(el);
  }

  // Đoạn kẻ của nốt cụt đi cùng lượt 1; nốt tròn để dành cho lượt 3.
  const notCho = [];
  for (const stub of layout.stubs || []) {
    const phan = renderStub(stub, xuLy.onChonNotCut);
    if (!phan) continue;
    gDuong.append(phan.net);
    notCho.push(phan.nut);
  }

  // --- LƯỢT 2 — toàn bộ ô người, nền ĐẶC ----------------------------------
  for (const node of layout.nodes) {
    const person = index && index.personById ? index.personById.get(node.id) : null;
    const el = renderPersonNode(node, person, node.kind, hienGio);
    if (!el) continue;
    if (xuLy.onChonNguoi) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => xuLy.onChonNguoi(node.id));
    }
    gO.append(el);
  }

  // --- LƯỢT 3 — nốt tròn, luôn nằm trên cùng để còn bấm được --------------
  for (const nut of notCho) gNot.append(nut);

  svgEl.append(gDuong, gO, gNot);
}

// ============================================================
// Ô NGƯỜI
// ============================================================

/**
 * Một ô người, dựng theo lối Quick Family Tree — chốt 20/08/2026 sau khi chủ
 * dự án xem app thật:
 *
 *        ╭───────────╮
 *        │  ẢNH TRÒN │        56px, vành màu theo giới tính
 *        ╰──┬─────┬──╯
 *      ┌────┴─────┴────┐      BẢNG TÊN nền trắng, ĐÈ LÊN đáy vòng ảnh
 *      │ Nguyễn Văn A  │
 *      └───────────────┘
 *       1927 – 2001 (ở tuổi 74)     ← trên nền trang, không có bảng
 *       Giỗ: 12 tháng Chạp          ← chỉ khi bật công tắc và có dữ liệu
 *
 * ⚠ **Chỗ tiết kiệm được nhiều nhất chính là cái ĐÈ LÊN.** Bảng tên chồm lên
 * đáy vòng ảnh 14px, tức mỗi ô ngắn đi 14px mà ảnh vẫn to thêm 40%. Xếp bảng
 * tên nằm hẳn dưới vòng ảnh thì ô cao thêm chừng ấy mà không được thêm gì.
 *
 * ⚠ **Đã BỎ dấu "đã mất".** Chủ dự án nói thẳng: dòng năm đã nói hết —
 * *"1927 – 2001 (ở tuổi 74)"* là người đã mất, *"1962 (tuổi 64)"* là người còn
 * sống. Một ký hiệu nữa chỉ lặp lại điều ấy bằng thứ tiếng phải học.
 *
 * Nút biên (dâu/rể lấy vào) vẫn khác: vành ảnh NÉT ĐỨT, chữ nhạt hơn. Họ là
 * người thật, nhưng nhánh của họ cố tình bị cắt ngắn.
 *
 * @param {{id,x,y,w,h,kind,gen,laTrungTam}} node
 * @param {object|null} person
 * @param {'full'|'edge'} kind
 * @param {boolean} hienGio  có vẽ hàng ngày giỗ không (công tắc của sơ đồ)
 * @returns {SVGGElement}
 */
function renderPersonNode(node, person, kind, hienGio) {
  const g = tao('g', { 'data-id': node.id });
  const laBien = kind === 'edge';
  const tamX   = node.x + node.w / 2;
  const R      = PHOTO.banKinhTrenO;

  // Ảnh vẽ TRƯỚC, bảng tên vẽ SAU và đè lên — đó là toàn bộ mẹo của bố cục này.
  g.append(renderAnhTrongO(node, person, laBien, node.laTrungTam));

  // --- BẢNG TÊN ------------------------------------------------------------
  // CHỖ DUY NHẤT render.js được tự tính pixel, và chỉ tính BÊN TRONG ô.
  const ten     = fullName(person) || node.id;
  const rongChu = node.w - VE.leBangTen * 2 - 6;
  const dong    = xepTen(ten, rongChu);
  const coChu   = dong.length > 1 ? VE.chuTenNho : VE.chuTen;

  const dinhBang = node.y + PHOTO.leTrenO + 2 * R - VE.deLenAnh;
  const caoBang  = VE.leTrongBang * 2 + dong.length * VE.buocDongTen;

  g.append(tao('rect', {
    x: node.x + VE.leBangTen, y: dinhBang,
    width: node.w - VE.leBangTen * 2, height: caoBang,
    rx: VE.boBangTen,
    fill: VE.nenBangTen,
    stroke: VE.vienBangTen, 'stroke-width': 1,
  }));

  const mauTen = laBien ? VE.chuPhu : VE.chuChinh;
  const dauTen = dinhBang + VE.leTrongBang + coChu * 0.82;
  dong.forEach((chuoi, i) => {
    g.append(chu(chuoi, tamX, dauTen + i * VE.buocDongTen, coChu, mauTen, rongChu));
  });

  // --- HAI HÀNG DƯỚI BẢNG, trên nền trang ----------------------------------
  //
  // TRƯỜNG TRỐNG THÌ KHÔNG VẼ HÀNG ĐÓ (LUẬT 4 ở đầu file). Không có năm nào
  // thì bỏ hẳn hàng năm; không có ngày giỗ, hoặc công tắc đang tắt, thì bỏ hẳn
  // hàng giỗ. Ô vẫn cao đúng LAYOUT.nodeHeight — đó là việc của layout.js.
  const doi = doiSongTuoi(person);
  let y = dinhBang + caoBang + VE.buocDongPhu;
  if (doi) {
    g.append(chu(doi, tamX, y, VE.chuNam, VE.chuPhu, node.w - VE.leTrongO));
    y += VE.buocDongPhu;
  }

  const gio = hienGio ? ngayGio(person) : '';
  if (gio) {
    g.append(chu('Giỗ: ' + gio, tamX, y, VE.chuGio, VE.chuGioMau,
                 node.w - VE.leTrongO));
  }

  // Nhãn rê chuột: nói ĐỦ, kể cả những thứ ô không đủ chỗ vẽ.
  const nhan = tao('title');
  nhan.textContent = ten + (doi ? '  ·  ' + doi : '') +
                     (ngayGio(person) ? '  ·  giỗ ' + ngayGio(person) : '') +
                     (laBien ? '  —  nhánh của người này không được vẽ tiếp' : '');
  g.append(nhan);

  return g;
}

/**
 * VÒNG ẢNH ở đầu ô — bước 28.
 *
 * ⚠ **Vẽ HAI LỚP CHỒNG LÊN NHAU, và đó là toàn bộ cách chống ảnh hỏng.**
 *
 *   lớp dưới : bóng người mặc định (nam · nữ · không rõ), luôn luôn vẽ
 *   lớp trên : ảnh thật trên Drive, CHỈ gắn `href` khi đã tải về được
 *
 * ⚠ **Và đây là chỗ bản đầu đã sai, sai đúng vì đoán thay vì đo.** Bản đầu ghi
 * *"`<image>` tải hỏng thì lặng lẽ không vẽ gì"* rồi gắn `href` thẳng. **Chrome
 * làm ngược lại: nó vẽ BIỂU TƯỢNG ẢNH HỎNG** — một hình núi xám nhỏ — đè lên
 * đúng giữa bóng người. Ảnh `kiem-thu/oa-1.png` bắt được ngay ở lần chụp đầu.
 *
 * Nên đường đi bây giờ là: **thử tải bằng một `Image()` rời trước**, tải xong
 * và có kích thước thật rồi mới gắn `href` vào thẻ `<image>` của sơ đồ. Hỏng
 * thì thẻ ấy suốt đời không có `href` và không vẽ gì cả — bóng người bên dưới
 * còn nguyên. Không tốn thêm một lần tải nào: trình duyệt lấy lại từ bộ nhớ đệm.
 *
 * Xét cả `naturalWidth`, không chỉ `onload`: Google có lúc trả về một trang
 * báo lỗi kèm mã 200, và với trang ấy `onload` vẫn nổ như thường.
 *
 * ⚠ **Xin Drive bản 200px tuy chỉ vẽ 40px.** Điện thoại có tỷ lệ pixel gấp
 * 2–3 lần; xin đúng 40 thì ảnh rỗ trên đúng thiết bị người trong họ hay dùng.
 *
 * Không có `person` (ô của người đã bị lọc, hoặc mã lạc) thì vẫn vẽ bóng người
 * "không rõ" — ô trống hoác giữa sơ đồ trông như lỗi vẽ.
 */
function renderAnhTrongO(node, person, laBien, laTrungTam) {
  const R  = PHOTO.banKinhTrenO;
  const cx = node.x + node.w / 2;
  const cy = node.y + PHOTO.leTrenO + R;

  const g  = tao('g');
  const ma = 'anh-' + demLanVe + '-' + String(node.id).replace(/[^A-Za-z0-9_-]/g, '');

  const cat = tao('clipPath', { id: ma });
  cat.append(tao('circle', { cx, cy, r: R }));
  g.append(cat);

  const oAnh = {
    x: cx - R, y: cy - R, width: 2 * R, height: 2 * R,
    'clip-path': 'url(#' + ma + ')',
    preserveAspectRatio: 'xMidYMid slice',
    opacity: laBien ? 0.7 : 1,
  };

  g.append(tao('image', Object.assign({
    href: anhMacDinhUri(person && person.sex, mauVien(person)),
  }, oAnh)));

  const anhThat = person && typeof person.photoFileId === 'string'
    ? person.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, PHOTO.thumbSize);
    const oThat = tao('image', Object.assign({}, oAnh));   // CHƯA có href
    g.append(oThat);

    const thu = new Image();
    thu.onload = () => {
      if (thu.naturalWidth > 0 && thu.naturalHeight > 0) {
        oThat.setAttribute('href', duong);
      }
    };
    thu.src = duong;
  }

  // Vành trắng rồi vành màu: vành trắng tách ảnh khỏi nền, vành màu nói GIỚI
  // TÍNH. Từ bước 28 vành màu này là chỗ DUY NHẤT nói giới tính — ô đã bỏ viền.
  //
  // ⚠ Và nó cũng là chỗ duy nhất còn nói *"nhánh của người này bị cắt"*: nút
  // biên (dâu/rể lấy vào) mang vành NÉT ĐỨT. Trước bước 28 việc ấy do viền ô
  // nét đứt lo; bỏ viền ô mà không chuyển nét đứt sang đây là mất hẳn một
  // thông tin, chứ không phải làm gọn giao diện.
  g.append(tao('circle', {
    cx, cy, r: R, fill: 'none', stroke: '#ffffff', 'stroke-width': 2,
  }));
  g.append(tao('circle', {
    cx, cy, r: R, fill: 'none', stroke: mauVien(person),
    'stroke-width': laBien ? 1.4 : 1.8,
    'stroke-opacity': laBien ? 0.6 : 0.85,
    'stroke-dasharray': laBien ? VE.motNetOBien : null,
  }));

  if (laTrungTam) {
    g.append(tao('circle', {
      cx, cy, r: R + 4, fill: 'none',
      stroke: VE.quangTrungTam, 'stroke-width': VE.dayQuang,
    }));
  }

  return g;
}

/**
 * Viền ô theo giới tính. `sex: "U"` có màu riêng, không lẫn nam cũng không lẫn nữ.
 *
 * ⚠ **Export ra ngoài từ bước 28**, và chỉ vì một lý do: nền của BÓNG NGƯỜI
 * mặc định phải đúng bằng màu này. Vòng tròn thông tin ở `person-detail.js` vẽ
 * bằng HTML chứ không bằng SVG, nên nó không đi qua file này — mà chép ba mã
 * màu sang bên ấy là dựng ra một bản thứ hai của bảng `VE`.
 */
export function mauVien(person) {
  const gt = (person && person.sex) || 'U';
  if (gt === 'M') return VE.vienNam;
  if (gt === 'F') return VE.vienNu;
  return VE.vienKhongRo;
}

/**
 * Ngắt tên dài thành tối đa HAI dòng.
 *
 * Trình duyệt không cho đo chiều rộng chữ trước khi vẽ mà không dựng thêm một
 * phần tử tạm, nên ở đây ước lượng bằng số ký tự. Ước lượng chỉ quyết định
 * CHỖ NGẮT DÒNG; phần bảo hiểm nằm ở `chu()`, nơi đặt `textLength` để chuỗi
 * dài quá tự co lại chứ không bao giờ tràn ra khỏi ô.
 *
 * Ngắt ở khoảng trắng CUỐI CÙNG còn vừa dòng trên, nên "Nguyễn Thị Hương Lan"
 * xuống dòng thành "Nguyễn Thị Hương" / "Lan" — tên riêng nằm trọn một dòng.
 */
function xepTen(ten, rongToiDa) {
  const s = String(ten || '').trim();
  if (s === '') return [''];
  if (beRong(s, VE.chuTen) <= rongToiDa) return [s];

  const tu = s.split(/\s+/);
  if (tu.length === 1) return [s];          // một từ dài — để textLength lo

  let cat = -1;
  for (let i = 1; i < tu.length; i++) {
    if (beRong(tu.slice(0, i).join(' '), VE.chuTenNho) <= rongToiDa) cat = i;
  }
  if (cat <= 0) cat = tu.length - 1;
  return [tu.slice(0, cat).join(' '), tu.slice(cat).join(' ')];
}

/**
 * Bề rộng thật của một chuỗi, đo bằng canvas.
 *
 * Lúc đầu chỗ này ước lượng `số ký tự × cỡ chữ × 0,55`. Nhìn ảnh chụp mới thấy
 * ước lượng lệch đủ để đổi kết quả: "Nguyễn Bá Cương" bị xuống hai dòng còn
 * "Nguyễn Bá Toàn" thì không, hai ô cạnh nhau trông so le vô cớ. Đo thật thì
 * hết hẳn chuyện đó. Đây đúng là loại lỗi mà phép thử tự động không bắt được —
 * cả hai cách đều "không sai", chỉ một cách nhìn được.
 *
 * Không phải phụ thuộc mới: canvas là API sẵn có của trình duyệt, không thư
 * viện, không bước build. Máy nào không dựng được canvas thì rơi về ước lượng
 * cũ — chữ vẫn không tràn ô nhờ `textLength` ở `chu()`.
 */
const nhoRong = new Map();
let doChu; // undefined = chưa thử dựng · null = dựng hỏng, thôi thử lại

function beRong(s, coChu) {
  const khoa = coChu + '|' + s;
  if (nhoRong.has(khoa)) return nhoRong.get(khoa);

  if (doChu === undefined) {
    try {
      doChu = document.createElement('canvas').getContext('2d');
    } catch (e) {
      doChu = null;
    }
  }

  const rong = doChu
    ? (doChu.font = coChu + 'px ' + VE.phong, doChu.measureText(String(s)).width)
    : String(s).length * coChu * 0.55;

  nhoRong.set(khoa, rong);
  return rong;
}

// ============================================================
// ĐƯỜNG NỐI
// ============================================================

/**
 * Đường nối cha mẹ – con và đường nối vợ chồng.
 *
 *   kind 'spouse'                  → nét liền, mảnh hơn
 *   kind 'child', relation 'birth' → nét liền
 *   kind 'child', relation khác    → nét ĐỨT (con nuôi)
 *
 * `netDai` là đường dẫn tới một chỗ xa — bộ cha mẹ thứ hai của con nuôi, hoặc
 * bạn đời ở nhánh khác. Vẽ NHẠT HƠN để mắt biết đây là đường tham chiếu, chứ
 * KHÔNG sinh ra loại nét thứ tư.
 */
function renderLink(link) {
  if (!link || !Array.isArray(link.points) || link.points.length < 2) return null;

  const laCon  = link.kind === 'child';
  const conNuoi = laCon && link.relation && link.relation !== 'birth';

  return tao('polyline', {
    points: link.points.map((p) => p[0] + ',' + p[1]).join(' '),
    fill: 'none',
    stroke: VE.net,
    'stroke-width': laCon ? VE.dayNetCon : VE.dayNetVo,
    'stroke-dasharray': conNuoi ? VE.motNetDut : null,
    'stroke-opacity': link.netDai ? VE.moNetDai : 1,
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  });
}

// ============================================================
// NỐT CỤT
// ============================================================

/**
 * NỐT CỤT — dấu hiệu "còn dữ liệu ở hướng này nhưng không nằm trong sơ đồ".
 * Đoạn kẻ gạch–chấm ngắn cộng một nốt tròn đặc.
 *
 * Nốt PHẢI bấm được: bấm thì mở nhánh đó ra, người bên kia thành trung tâm
 * mới. Vùng bấm to hơn nốt vẽ ra khá nhiều — trên điện thoại ngón tay không
 * trúng nổi một chấm bán kính 6px.
 *
 * Nốt gộp (`nguon.length > 1`) hiện thêm SỐ ĐẾM: nhiều nốt rơi đúng một điểm
 * thì gộp làm một, `hiddenCount` đã cộng dồn sẵn ở layout.js.
 *
 * Trả về HAI phần tử vì chúng thuộc hai lượt vẽ khác nhau (xem luật 2 ở đầu
 * file): đoạn kẻ đi cùng lượt đường nối, nốt tròn vẽ sau cùng.
 *
 * @returns {{net:SVGElement, nut:SVGGElement}|null}
 */
function renderStub(stub, onClick) {
  if (!stub || !Number.isFinite(stub.x) || !Number.isFinite(stub.y)) return null;

  const net = tao('line', {
    x1: stub.x1, y1: stub.y1, x2: stub.x, y2: stub.y,
    stroke: VE.notCut,
    'stroke-width': VE.dayNetVo,
    'stroke-dasharray': VE.motNetGachCham,
    'stroke-linecap': 'round',
  });

  const nut = tao('g', {
    'data-not-cut': (stub.personId || '') + '|' + (stub.unionId || ''),
  });

  // Vùng bấm — trong suốt, to hơn nốt vẽ ra. Không có nó thì trên điện thoại
  // gần như không bấm trúng.
  nut.append(tao('circle', {
    cx: stub.x, cy: stub.y, r: LAYOUT.stubRadius + 10,
    fill: 'transparent',
  }));
  nut.append(tao('circle', {
    cx: stub.x, cy: stub.y, r: LAYOUT.stubRadius,
    fill: VE.notCut,
  }));

  const dem = Number(stub.hiddenCount) || 0;
  if (dem > 1) {
    // Số đếm KHÔNG bao giờ đặt ra phía ngoài theo hướng nốt mọc ra, và cả hai
    // hướng đều có lý do riêng:
    //
    //   nốt NGANG  → ngoài nó là ô người bên cạnh; viết số vào đó là số đè lên
    //                tên người. Đặt lên TRÊN.
    //   nốt DỌC    → ngoài nó là ô người ở hàng trên/hàng dưới. Đặt SANG BÊN,
    //                vì ngang tầm nốt dọc là **khe giữa hai đời**, và khe ấy
    //                không có ô nào cả.
    //
    // ⚠ Bước 28d mới đổi vế thứ hai. Trước đó số đếm của nốt dọc đặt ra ngoài
    // theo hướng mọc, và với khe 90px thì vẫn lọt; khe rút còn 34px thì nó rơi
    // đúng vào dòng năm sinh của ô hàng trên.
    const goc = Number(stub.angle) || 0;
    const d   = LAYOUT.stubRadius + 9;
    const ngang = goc === 0 || goc === 180;
    const x = ngang ? stub.x : stub.x + d;
    const y = ngang ? stub.y - d : stub.y;

    // CÓ NỀN, không phải chữ trần: chỗ này rơi trúng thanh ngang gom các con
    // là chuyện thường (luật 2 ở đầu file).
    for (const el of chuCoNen(String(dem), x, y, VE.chuDem, VE.notCut)) nut.append(el);
  }

  const nhan = tao('title');
  nhan.textContent = stub.direction === 'up'
    ? 'Còn ' + dem + ' người ở đời trên chưa vẽ — bấm để mở'
    : 'Còn ' + dem + ' người ở nhánh này chưa vẽ — bấm để mở';
  nut.append(nhan);

  if (onClick) {
    nut.style.cursor = 'pointer';
    nut.addEventListener('click', () => onClick(stub));
  }

  return { net, nut };
}

// ============================================================
// Mấy mẩu SVG dùng chung. Không thư viện, không bước build.
// ============================================================

function tao(ten, thuoc) {
  const el = document.createElementNS(NS, ten);
  for (const khoa in thuoc || {}) {
    const v = thuoc[khoa];
    if (v === null || v === undefined) continue;   // null = không đặt thuộc tính
    el.setAttribute(khoa, String(v));
  }
  return el;
}

/**
 * Một dòng chữ căn giữa quanh `x`.
 *
 * `rongToiDa` là dây bảo hiểm: chuỗi ước lượng còn tràn thì đặt `textLength`
 * cho trình duyệt tự bóp lại. Thà chữ hơi chật còn hơn tên thò ra khỏi ô và
 * đè lên ô bên cạnh.
 */
/**
 * Chữ CÓ NỀN ĐẶC — dùng cho mọi chữ vẽ đè lên đường nối.
 *
 * Đây là luật 2 ở đầu file, viết thành hàm. Vẽ sau mới chỉ giải quyết được
 * THỨ TỰ; cái làm nét biến mất là NỀN. Chữ trần thì vẽ cuối cùng đến mấy,
 * đường kẻ vẫn chạy xuyên qua giữa con số.
 *
 * Đĩa nền tô đúng màu nền trang (`VE.nenTrang`) chứ không phải trắng: nền
 * trang là #faf8f5, tô trắng thì hiện ra một đốm sáng quanh con số.
 *
 * `y` là TÂM chữ, không phải baseline — nơi gọi không phải tự cộng trừ.
 *
 * @returns {SVGElement[]} [đĩa nền, chữ] — nơi gọi append theo đúng thứ tự
 */
function chuCoNen(noiDung, x, y, coChu, mau) {
  const r = coChu * 0.78 + 2;
  return [
    tao('circle', { cx: x, cy: y, r, fill: VE.nenTrang }),
    chu(noiDung, x, y + coChu * 0.35, coChu, mau),
  ];
}

function chu(noiDung, x, y, coChu, mau, rongToiDa) {
  const t = tao('text', {
    x, y,
    'text-anchor': 'middle',
    'font-size': coChu,
    fill: mau,
  });
  if (rongToiDa && beRong(noiDung, coChu) > rongToiDa) {
    t.setAttribute('textLength', String(rongToiDa));
    t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  t.textContent = noiDung;
  return t;
}
