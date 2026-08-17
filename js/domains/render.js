// ============================================================
// giapha · js/domains/render.js
// Vai trò  : Vẽ SVG từ kết quả layout. Chỉ vẽ, không tính toạ độ sơ đồ.
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phụ thuộc: config (LAYOUT), utils/text
// Phiên bản: 1.1.0 · Cập nhật: 17/08/2026 07:40
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
// 3. BA LOẠI NÉT CỐ ĐỊNH (QUY-TAC-VE §8), đọc từ `kind` + `relation`. Không
//    đổi nét theo mật độ: cùng một nốt mà lúc nét này lúc nét kia thì người
//    dùng phải học hai luật.
//
// 4. TRƯỜNG TRỐNG THÌ KHÔNG VẼ HÀNG ĐÓ. Không năm sinh lẫn năm mất thì BỎ HẲN
//    dòng thứ hai — ô chỉ còn tên, và tên tự căn giữa. Không ghi "Không rõ",
//    không hiện "...". Dùng utils/text.doiSongNguoi(), đừng tự kiểm
//    `if (p.birth.iso)` ở đây. Ca kiểm sống: P0005 Lê Thị Thái.
//    Chiều cao ô vẫn CỐ ĐỊNH — ô co theo nội dung thì các ô cùng một đời so le.

import { LAYOUT } from '../config.js';
import { fullName, doiSongNguoi } from '../utils/text.js';

const NS = 'http://www.w3.org/2000/svg';

/**
 * Bảng giao diện — màu, cỡ chữ, độ dày nét. Chỗ duy nhất được sửa khi đổi
 * "trông thế nào". Không có con số nào ở đây ảnh hưởng tới VỊ TRÍ của ô.
 */
export const VE = {
  // Cỡ chữ tên: 12px, KHÔNG phải 13px. Ô rộng 120px, trừ lề còn 108px. Đo
  // thật bằng canvas thì ở 13px phần lớn tên ba chữ tiếng Việt ("Nguyễn Bá
  // Cương") vượt 108px và bị xuống hai dòng, trong khi tên bốn chữ vẫn một
  // dòng — cả một hàng ô cao thấp so le nhau vô cớ. Ở 12px thì tên ba chữ
  // gần như luôn vừa một dòng, chỉ tên bốn chữ mới xuống dòng.
  chuTen:      12,
  chuTenNho:   11,     // dùng khi tên dài phải xuống hai dòng
  leTrongO:    12,     // tổng lề trái + phải chừa cho chữ trong ô
  chuNam:      11,
  chuDem:      10,     // số đếm cạnh nốt cụt gộp
  phong:       'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',

  lotO:        '#ffffff',
  lotOBien:    '#f6f2ec',   // nút biên (dâu/rể) — nhạt hơn

  // Nền của cả trang sơ đồ. Phải khớp `background` trong gas/index.html và
  // trong pages/tree-view.js — đây là màu mà `chuCoNen()` dùng để xoá nét
  // chạy phía dưới chữ. Lệch màu là hiện ra một vệt sáng quanh con số.
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
  dayVienO:    1.6,
  dayQuang:    3,

  motNetDut:   '6 4',      // con nuôi
  motNetGachCham: '5 3 1 3',   // nốt cụt
  motNetOBien: '4 3',      // viền ô nút biên

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
 */
export function renderTree(svgEl, layout, index, handlers) {
  if (!svgEl) return;
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  if (!layout || !Array.isArray(layout.nodes) || layout.nodes.length === 0) return;

  const xuLy = handlers || {};
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
    const el = renderPersonNode(node, person, node.kind);
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
 * Một ô người: tên, năm sinh – năm mất, dấu đã mất.
 *
 * Người trung tâm có QUẦNG CAM bao quanh ô — chi tiết nhỏ nhưng thiếu nó thì
 * người dùng mất dấu mình đang đứng ở đâu, nhất là sau khi bấm một nốt cụt.
 *
 * Nút biên (dâu/rể lấy vào) vẽ NHẠT HƠN, viền nét đứt: họ là người thật, nhưng
 * nhánh của họ cố tình bị cắt ngắn, và người xem cần thấy được sự khác biệt đó.
 *
 * @param {{id,x,y,w,h,kind,gen,laTrungTam}} node
 * @param {object|null} person
 * @param {'full'|'edge'} kind
 * @returns {SVGGElement}
 */
function renderPersonNode(node, person, kind) {
  const g = tao('g', { 'data-id': node.id });
  const laBien = kind === 'edge';

  if (node.laTrungTam) {
    g.append(tao('rect', {
      x: node.x - 4, y: node.y - 4, width: node.w + 8, height: node.h + 8,
      rx: VE.bo + 3, fill: 'none',
      stroke: VE.quangTrungTam, 'stroke-width': VE.dayQuang,
    }));
  }

  g.append(tao('rect', {
    x: node.x, y: node.y, width: node.w, height: node.h, rx: VE.bo,
    fill: laBien ? VE.lotOBien : VE.lotO,          // NỀN ĐẶC — luật hai lượt
    stroke: mauVien(person),
    'stroke-width': VE.dayVienO,
    'stroke-opacity': laBien ? 0.55 : 1,
    'stroke-dasharray': laBien ? VE.motNetOBien : null,
  }));

  const dauMat = renderDeceasedMark(node, person);
  if (dauMat) g.append(dauMat);

  // --- Chữ trong ô ---------------------------------------------------------
  // CHỖ DUY NHẤT render.js được tự tính pixel, và chỉ tính BÊN TRONG ô.
  const ten   = fullName(person) || node.id;
  const doi   = doiSongNguoi(person);
  const rongChu = node.w - VE.leTrongO;
  const dong    = xepTen(ten, rongChu);
  const coChu   = dong.length > 1 ? VE.chuTenNho : VE.chuTen;
  const tamX    = node.x + node.w / 2;

  // Trường trống thì KHÔNG VẼ HÀNG ĐÓ: không có năm nào thì bỏ hẳn dòng dưới
  // và dồn tên vào giữa ô. Ô vẫn cao đúng LAYOUT.nodeHeight.
  const soHang = dong.length + (doi ? 1 : 0);
  const buocY  = soHang >= 3 ? 16 : 18;
  const dauY   = node.y + node.h / 2 - ((soHang - 1) * buocY) / 2 + coChu * 0.35;

  dong.forEach((chuoi, i) => {
    g.append(chu(chuoi, tamX, dauY + i * buocY, coChu, VE.chuChinh, rongChu));
  });
  if (doi) {
    g.append(chu(doi, tamX, dauY + dong.length * buocY, VE.chuNam, VE.chuPhu, rongChu));
  }

  const nhan = tao('title');
  nhan.textContent = ten + (doi ? ' (' + doi + ')' : '') +
                     (laBien ? ' — nhánh của người này không được vẽ tiếp' : '');
  g.append(nhan);

  return g;
}

/**
 * Ký hiệu người đã mất — Quick Family Tree thiếu cái này, ta nên có.
 *
 * Một góc gấp nhỏ ở mép trên bên trái, màu xám. Cố ý KHÔNG dùng dấu thập:
 * gia phả này không gắn với một tôn giáo nào, ký hiệu cũng không nên gắn.
 *
 * Đọc `living === false` HOẶC có năm mất. Không suy ngược từ năm sinh — một
 * cụ sinh 1890 mà dữ liệu chưa ghi gì thì ta KHÔNG BIẾT, và không biết thì
 * không đánh dấu.
 */
function renderDeceasedMark(node, person) {
  if (!person) return null;
  // doiSongNguoi() chỉ chèn dấu gạch khi CÓ năm mất: "1927 – 2001" hoặc "– 2001".
  // Chỉ có năm sinh thì chuỗi là "1962", không dấu gạch nào.
  const coNamMat = doiSongNguoi(person).indexOf('–') !== -1;
  if (person.living !== false && !coNamMat) return null;

  const c = 11;
  const g = tao('g');
  g.append(tao('path', {
    d: 'M ' + (node.x + VE.bo) + ' ' + node.y +
       ' h ' + c +
       ' L ' + (node.x + VE.bo) + ' ' + (node.y + c) + ' Z',
    fill: VE.chuPhu, 'fill-opacity': 0.55,
  }));
  const nhan = tao('title');
  nhan.textContent = 'Đã mất';
  g.append(nhan);
  return g;
}

/** Viền ô theo giới tính. `sex: "U"` có màu riêng, không lẫn nam cũng không lẫn nữ. */
function mauVien(person) {
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
    // Số đếm đặt ra PHÍA NGOÀI nốt, theo hướng nốt mọc ra — trừ nốt nằm
    // ngang: ngoài nốt ngang là ô người bên cạnh, viết số vào đó là số đè lên
    // tên người. Nốt ngang thì đặt số lên TRÊN.
    const goc = Number(stub.angle) || 0;
    const d   = LAYOUT.stubRadius + 9;
    const ngang = goc === 0 || goc === 180;
    const x = ngang ? stub.x : stub.x + Math.cos(goc * Math.PI / 180) * d;
    const y = ngang ? stub.y - d : stub.y + Math.sin(goc * Math.PI / 180) * d;

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
