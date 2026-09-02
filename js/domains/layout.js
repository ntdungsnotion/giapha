// ============================================================
// giapha · js/domains/layout.js
// Vai trò  : Tính TOẠ ĐỘ các ô người, đường nối và nốt cụt. Không vẽ gì cả.
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: config (LAYOUT, PHOTO)
// Phiên bản: 1.19.0 · Cập nhật: 02/09/2026 (bước 86b — luật BA KHỐI là luật ĐỆ QUY: mỗi cặp đứng giữa hai khối tổ tiên của mình)
// ============================================================
//
// Tách khỏi render.js có chủ ý: chỉnh giao diện (màu, phông, bo góc) không
// được đụng vào thuật toán bố trí. Ngược lại, MỌI phép tính toạ độ nằm ở đây
// — render.js chỉ nhận mảng điểm rồi vẽ, không tự tính lấy một pixel nào.
//
// Chiều cao ô CỐ ĐỊNH (LAYOUT.nodeHeight), dù người đó có một dòng hay hai.
// Để ô co theo nội dung thì các ô cùng một đời sẽ so le, sơ đồ nhìn gãy.
//
// ============================================================
// BỐN RÀNG BUỘC ĐÃ BIẾT TRƯỚC KHI VIẾT — đừng "đơn giản hoá" mất cái nào
// ============================================================
//
// 1. KHÔNG ĐƯỢC GIẢ ĐỊNH VỢ CHỒNG CÙNG MỘT HÀNG — NHƯNG CŨNG KHÔNG ĐƯỢC ĐỂ
//    HỌ LỆCH HÀNG BỪA. Đây là hai nửa của một luật, và chat 1.6 chỉ có nửa đầu.
//
//    Nét chéo CHỈ đúng khi hai người KẾT HÔN TRONG HỌ, tức có tổ tiên chung.
//    U0023: ông "11" (P0044, đời 4) cưới bà "29" (P0053, đời 5), chung cụ
//    P0034 — hai người mỗi người đứng dưới cha mẹ mình, nét vợ chồng vẽ CHÉO.
//    Đó là sự thật về gia đình ấy, phải vẽ ra.
//
//    Hai người KHÁC dòng họ thì phải CÙNG HÀNG, dù mỗi người có bao nhiêu đời
//    tổ tiên trong sơ đồ. Ca thật: ông Dũng (P0012) cưới bà Hương Lan (P0020),
//    không một tổ tiên chung nào; nhánh ông có 3 đời, nhánh bà có 6, và trước
//    chat 1.7 hai người bị vẽ lệch nhau ĐÚNG 3 hàng với một nét chéo cắt ngang
//    cả sơ đồ. Xem canNhanh().
//
//    ⚠ Luật này đã nằm trong `KE-HOACH` từ 16/08 (mục "Bẫy khi đo lệch đời":
//    *chỉ báo lệch đời khi hai người có tổ tiên chung*), nhưng chỉ được nghĩ
//    cho phía RÀ SOÁT DỮ LIỆU, không ai cài cho phía VẼ HÌNH. Cùng một luật,
//    hai phía.
//
// 2. ĐỜI = ĐƯỜNG ĐI DÀI NHẤT, không phải ngắn nhất. Xem ganMucDoi().
//    Đây là lý do layout.js KHÔNG dùng lại bfsLevels() của chat 1.2 —
//    bfsLevels cho đường NGẮN NHẤT.
//
// 3. NỐT CỤT NEO VÀO unionId, KHÔNG NEO VÀO NGƯỜI. Ông Cương có hai đời vợ;
//    cắt bớt một bà thì nốt cụt phải nằm cạnh ĐÚNG cái hôn nhân bị cắt. Mỗi
//    union có mức nét riêng, nên hai nốt cụt cùng hướng ngang không đè nhau.
//
// 4. KHÔNG NHÂN BẢN Ô NGƯỜI. Hai nhánh cưới nhau thì người đó vẫn chỉ có một
//    ô; đường nối dài ra chứ ô không nhân đôi. Bài kiểm tra của dự án đếm SỐ
//    NGƯỜI — có ô nhân bản là số đếm mất nghĩa.
//
// ============================================================
// AI ĐỨNG Ở ĐÂU — ba luật quyết định toàn bộ bố cục
// ============================================================
//
// A. NGƯỜI CÓ CHA MẸ HIỂN THỊ thì đứng dưới cha mẹ mình, không bao giờ bị kéo
//    vào dải của vợ/chồng. Nếu không, họ bị tách khỏi anh chị em ruột.
//    Người có HAI bộ cha mẹ (con nuôi P0010) đứng dưới bộ ĐẺ; bộ nuôi nối tới
//    bằng một đường dài, nét đứt. Quy tắc này bỏ hẳn tính phụ thuộc thứ tự —
//    kết quả không đổi dù duyệt từ đâu.
//
// B. NGƯỜI KHÔNG CÓ CHA MẸ HIỂN THỊ (dâu/rể lấy vào, nút biên) được HẤP THỤ
//    vào dải của bạn đời — đứng kề bên, cùng hàng.
//
// C. CHIỀU TRÁI/PHẢI theo giới tính, không theo huyết thống: nam trái, nữ
//    phải (QUY-TAC-VE §2). Quy tắc theo huyết thống KHÔNG ổn định — đổi người
//    trung tâm là một nửa số cặp đảo chỗ. Cùng giới hoặc thiếu giới thì theo
//    `partnerOrder`.
//
// ============================================================
// ĐẦU RA — render.js chỉ việc vẽ, không tính gì thêm
// ============================================================
//
//   nodes  [{ id, x, y, w, h, kind, gen, laTrungTam }]   x,y = GÓC TRÊN TRÁI
//   unions [{ id, x, y, busY, kieu, neoId, partnerIds }] điểm treo chùm con
//   links  [{ kind, relation, points, from, to, unionId, dai, cheo }]
//   stubs  [{ personId, unionId, direction, hiddenCount, x, y, x1, y1,
//             angle, nguon }]                            x,y = TÂM NỐT TRÒN
//   bounds { minX, minY, maxX, maxY }
//
// `points` là mảng [[x,y], …] — đường gấp khúc vẽ thẳng, không phải đường
// cong. Ba loại nét cố định (QUY-TAC-VE §8) đọc từ `kind` + `relation`:
//   kind 'spouse'                  → nét liền mảnh
//   kind 'child', relation 'birth' → nét liền
//   kind 'child', relation khác    → nét ĐỨT (con nuôi)
//   nốt cụt                        → nét gạch-chấm, do render.js lo

import { LAYOUT, PHOTO } from '../config.js';
import { rankCua } from './union.js';

const RONG = LAYOUT.nodeWidth;
const DEM  = 24;                  // lề quanh sơ đồ khi tính bounds

/**
 * Chiều cao ô ĐANG DÙNG.
 *
 * ⚠ **`let`, không phải `const`, và `computeLayout()` gán lại nó ở dòng đầu
 * tiên mỗi lần chạy.** Trước bước 28 đây là `const CAO = LAYOUT.nodeHeight`,
 * chụp một lần lúc nạp module — và cái bẫy ấy đã sập thật: phép đo
 * `kiem-thu/do-o-co-anh.mjs` đổi `LAYOUT.nodeHeight` rồi gọi lại
 * `computeLayout`, nhận về **+0% cho cả bốn phương án**, một kết quả trông rất
 * gọn gàng mà sai hoàn toàn.
 *
 * Từ bước 28 nó phải đọc lại thật, vì công tắc *"Ngày giỗ"* đổi chiều cao ô
 * ngay lúc chạy: bật thì mọi ô cao thêm một hàng chữ.
 *
 * Mọi hàm phụ trong file này đều chạy BÊN TRONG `computeLayout()`, nên đến lúc
 * chúng đọc `CAO` thì giá trị đã đúng.
 */
let CAO = LAYOUT.nodeHeight;

/**
 * MỨC NÉT VỢ CHỒNG bên trong ô — đo từ nóc ô xuống.
 *
 * ⚠ **Đúng bằng TÂM VÒNG ẢNH, không phải tâm ô.** Đây là chỗ mọi nét vợ chồng
 * bám vào, và cũng là chỗ chùm con treo lên.
 *
 * Trước bước 28 nó là `CAO / 2` — tâm ô — và lúc ấy đúng, vì ô có VIỀN và có
 * NỀN ĐẶC nên nét chỉ lộ ra ở khe 16px giữa hai ô, ngang tầm mắt nhìn. Bước 28
 * bỏ viền ô (chủ dự án: *"khung bao quanh tên và ảnh làm app rất xấu"*), và
 * lúc đó `CAO / 2` rơi đúng vào DÒNG TÊN: đoạn nét ngắn nối hai người sẽ chạy
 * ngang giữa hai cái tên. Ở tâm vòng ảnh thì nét nối hai khuôn mặt — đúng thứ
 * Quick Family Tree làm, và đọc ra ngay không phải học.
 *
 * Lấy từ `PHOTO` chứ không gõ lại con số: hai hằng số phải khớp nhau mà nằm
 * hai nơi thì sớm muộn cũng lệch, và lúc lệch thì nét vợ chồng cắt ngang mặt
 * người chứ không có gì báo lỗi.
 */
const MUC_NET = PHOTO.leTrenO + PHOTO.banKinhTrenO;

/**
 * Khoảng từ MÉP Ô tới MÉP VÒNG ẢNH theo chiều ngang — 26px với ô rộng 120 và
 * vòng ảnh bán kính 34. Vòng ảnh nằm giữa ô nên hai bên bằng nhau.
 *
 * Dùng để nét vợ chồng chạm được vào khuôn mặt, xem `themNetVoChong()`.
 *
 * ⚠ Tính từ `PHOTO.banKinhTrenO`, đừng gõ lại con số: bán kính đổi ở bước 80
 * (26 → 34) và nếu chỗ này còn giữ 40 thì nét vợ chồng dừng lại cách khuôn mặt
 * 14px, trôi lơ lửng giữa hai ô mà không có gì báo lỗi.
 */
const LE_ANH = RONG / 2 - PHOTO.banKinhTrenO;

/**
 * Bố trí toàn bộ sơ đồ quanh một người trung tâm.
 *
 * `stubPoints` là tham số THÊM so với chữ ký công bố ở khung mã, để trống thì
 * chỉ mất phần nốt cụt chứ không hỏng gì. Lý do truyền vào chứ không tự gọi:
 * `findStubPoints()` nằm ở `domains/bloodline.js`, mà theo luật lớp thì
 * `domains` chỉ được gọi `utils` và `config`. Nơi gọi (pages/tree-view.js)
 * làm ba bước liền nhau:
 *
 *   const visible = computeVisibleSet(index, focus, scope);
 *   const stubs   = findStubPoints(index, visible, scope);
 *   const layout  = computeLayout(index, focus, visible, scope, stubs);
 *
 * @param {object} index                     từ utils/graph.buildIndex
 * @param {string} focusPersonId
 * @param {Map<string,'full'|'edge'>} visibleSet   từ computeVisibleSet
 * @param {object} [scope]                   chưa dùng — giữ cho khớp chữ ký
 * @param {Array<object>} [stubPoints]       từ findStubPoints
 * @param {{hienNgayGio?:boolean}} [tuyChon]
 *        `hienNgayGio` — CHỪA CHỖ cho hàng ngày giỗ, tức mọi ô cao thêm một
 *        hàng chữ. Phải khớp với cờ cùng tên đưa vào `renderTree()`: chỗ này
 *        chừa chỗ, chỗ kia vẽ. Lệch nhau thì hàng giỗ hoặc tràn ra khỏi ô,
 *        hoặc để lại một khoảng trống không ai giải thích được.
 * @returns {{nodes:Array, unions:Array, links:Array, stubs:Array,
 *            bounds:{minX:number,minY:number,maxX:number,maxY:number}}}
 */
export function computeLayout(index, focusPersonId, visibleSet, scope, stubPoints, tuyChon) { // eslint-disable-line no-unused-vars
  // Đọc lại chiều cao ô TRƯỚC MỌI THỨ KHÁC — xem ghi chú `CAO` ở đầu file.
  CAO = (tuyChon && tuyChon.hienNgayGio)
    ? LAYOUT.nodeHeightNgayGio
    : LAYOUT.nodeHeight;

  const rong = {
    nodes: [], unions: [], links: [], stubs: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };
  if (!index || !index.personById || !visibleSet || visibleSet.size === 0) return rong;

  const ct = dungNguCanh(index, visibleSet);
  if (ct.dsNguoi.length === 0) return rong;
  ct.tamId = focusPersonId || null;

  ganMucDoi(ct);
  hapThuCapTrongHo(ct);            // PHẢI sau ganMucDoi — nó cần biết đời
  const viTriX = datMoiKhoi(ct);
  keoKhoiVeGanBanDoi(ct, viTriX);
  canChumConVaoGiua(ct, viTriX);
  keoKhoiPhuVeGanCon(ct, viTriX);
  canCapVaoGiuaOngBa(ct, viTriX);

  const nodes = [];
  const nodeById = new Map();
  for (const id of ct.dsNguoi) {
    const gen = ct.muc.get(id) || 0;
    const nut = {
      id,
      x: viTriX.has(id) ? viTriX.get(id) : 0,
      y: gen * (CAO + LAYOUT.vGap),
      w: RONG,
      h: CAO,
      kind: visibleSet.get(id) || 'full',
      gen,
      laTrungTam: id === focusPersonId,
    };
    nodes.push(nut);
    nodeById.set(id, nut);
  }
  ct.nodeById = nodeById;

  // Phải chạy SAU khi mọi `x` đã chốt: nó đo khoảng cách thật tới hàng xóm.
  ganRongTenToiDa(nodes);

  const unions = dungDiemTreo(ct, stubPoints);
  const links  = dungDuongNoi(ct, unions);
  const stubs  = dungNotCut(ct, unions, stubPoints);

  return { nodes, unions, links, stubs, bounds: tinhBounds(nodes, links, stubs) };
}

/**
 * BỀ RỘNG TỐI ĐA CỦA BẢNG TÊN, tính riêng cho từng ô — thêm ở bước 80, việc E.
 *
 * ⚠ **Vì sao con số này nằm ở `layout.js` chứ không ở `render.js`.** Nó là một
 * phép đo KHOẢNG CÁCH GIỮA HAI Ô, mà toàn bộ toạ độ ô chỉ file này biết
 * (QUY-TAC-VE §11: *"Mọi phép tính toạ độ nằm ở `layout.js`; `render.js` chỉ
 * vẽ"*). `render.js` đọc con số ra rồi tự trừ lề bảng của nó.
 *
 * Nghĩa của con số: **bề rộng ô DÀNH CHO BẢNG TÊN**, tính cả lề bảng, căn giữa
 * theo tâm ô. Không nới được thì nó đúng bằng `w` — nên `render.js` viết
 * `node.rongTenToiDa || node.w` là chạy đúng cả với layout cũ.
 *
 * Cách đo: hàng xóm gần nhất CÙNG MỘT ĐỜI, bên trái và bên phải. Khe giữa hai
 * ô chia đôi cho hai bên, sau khi đã chừa `kheBangTen`. Người ngoài cùng một
 * hàng không có hàng xóm ở phía ấy, nhưng vẫn bị `noiTenToiDa` chặn — nếu
 * không thì một người đứng lẻ giữa sơ đồ nhận một cái bảng dài ngoẵng.
 *
 * ⚠ Chỉ xét CÙNG ĐỜI. Ô hai đời khác nhau không bao giờ đè bảng tên nhau: bảng
 * tên nằm trong dải `y` riêng của ô mình, mà hai đời cách nhau `vGap`.
 *
 * ⚠ Bảng nới ra ĐƯỢC PHÉP đè lên đoạn nét kẻ dọc — luật vẽ hai lượt (§7) lo
 * phần che, và nốt cụt vẽ ở lượt 3 nên không bao giờ bị bảng tên nuốt mất.
 */
function ganRongTenToiDa(nodes) {
  const theoHang = new Map();
  for (const n of nodes) {
    if (!theoHang.has(n.gen)) theoHang.set(n.gen, []);
    theoHang.get(n.gen).push(n);
  }

  const tran = LAYOUT.noiTenToiDa;
  for (const [, ds] of theoHang) {
    ds.sort((a, b) => a.x - b.x);
    for (let i = 0; i < ds.length; i++) {
      const n = ds[i];
      let khe = Infinity;
      if (i > 0)              khe = Math.min(khe, n.x - (ds[i - 1].x + ds[i - 1].w));
      if (i < ds.length - 1)  khe = Math.min(khe, ds[i + 1].x - (n.x + n.w));

      const noi = Number.isFinite(khe)
        ? Math.max(0, (khe - LAYOUT.kheBangTen) / 2)
        : tran;
      n.rongTenToiDa = n.w + 2 * Math.min(noi, tran);
    }
  }
}

// ============================================================
// 1 · NGỮ CẢNH — lọc dữ liệu thô về đúng tập đang hiển thị
// ============================================================

/**
 * Mọi hàm phía dưới chỉ đọc `ct`, không đọc thẳng `index` nữa. Nhờ vậy không
 * bao giờ lỡ tay bố trí một người không nằm trong tập hiển thị.
 */
function dungNguCanh(index, visibleSet) {
  const ct = {
    index,
    visibleSet,
    dsNguoi:       [],           // mảng, để thứ tự duyệt luôn xác định
    unionHT:       new Map(),    // unionId -> { id, partners[], children[] } đã lọc
    unionLamVo:    new Map(),    // personId -> [unionId] làm vợ/chồng, sắp theo
                                  // rankCua(u, personId) — mốc là CHÍNH personId
                                  // của khoá này, không phải người bạn đời
    unionLamCon:   new Map(),    // personId -> [unionId] làm con, chỉ union hiển thị
    unionSoHuu:    new Map(),    // personId -> unionId ĐẶT CHỖ cho người này
    hapThuBoi:     new Map(),    // personId -> { unionId, neoId }
    roiChoCha:     new Set(),    // người CÓ cha mẹ hiển thị mà vẫn bị hấp thụ
                                  // vào dải bạn đời (hôn nhân trong họ, b81):
                                  // cha mẹ ruột thôi ĐẶT CHỖ, nhưng vẫn là cha
                                  // mẹ ruột — nét nối giữ nguyên loại
    dai:           new Map(),    // neoId -> mô tả dải (xem layDai)
    muc:           new Map(),
    toTien:        new Map(),    // personId -> Set tổ tiên hiển thị (đệm, xem toTienDong)
    cumCon:        new Map(),    // unionId -> [personId] cả cụm con cháu đặt dưới union đó
    thanhVienKhoi: new Map(),    // neoId của khối gốc -> [personId] mọi người trong khối
    khoiPhuCon:    new Map(),    // neoId của KHỐI PHỤ -> personId người con nó nối tới
                                  // (`canCapVaoGiuaOngBa()` cần: dịch một cặp thì khối
                                  //  tổ tiên treo dưới cặp ấy phải dịch theo)
    tamId:         null,         // người trung tâm — khối chứa họ không bao giờ là khối phụ
    daDat:         new Set(),
  };

  for (const id of visibleSet.keys()) {
    if (index.personById.has(id)) ct.dsNguoi.push(id);
  }
  ct.dsNguoi.sort();
  const trongTap = new Set(ct.dsNguoi);

  // --- Union nào được vẽ ---------------------------------------------------
  // Cần ít nhất một partner hiển thị, và cần có thứ để nối: hoặc partner thứ
  // hai, hoặc một người con. Union chỉ còn một partner mà không con thì không
  // vẽ gì cả — phần "còn ai đó bị ẩn" đã do nốt cụt lo.
  for (const [uid, u] of index.unionById) {
    const partners = [];
    for (const pid of Array.isArray(u.partners) ? u.partners : []) {
      if (trongTap.has(pid) && partners.indexOf(pid) === -1) partners.push(pid);
    }
    if (partners.length === 0) continue;

    const children = [];
    for (const con of Array.isArray(u.children) ? u.children : []) {
      const cid = con && con.personId;
      if (!cid || !trongTap.has(cid)) continue;
      if (children.some((c) => c.personId === cid)) continue;
      children.push({
        personId: cid,
        relation: con.relation || 'birth',
        order:    Number.isFinite(Number(con.order)) ? Number(con.order) : 9999,
      });
    }
    if (partners.length < 2 && children.length === 0) continue;

    children.sort((a, b) => (a.order - b.order) || (a.personId < b.personId ? -1 : 1));
    ct.unionHT.set(uid, { id: uid, partners, children });
  }

  // --- Bảng tra ngược ------------------------------------------------------
  for (const id of ct.dsNguoi) { ct.unionLamVo.set(id, []); ct.unionLamCon.set(id, []); }
  for (const [uid, u] of ct.unionHT) {
    for (const pid of u.partners) ct.unionLamVo.get(pid).push(uid);
    for (const c of u.children)   ct.unionLamCon.get(c.personId).push(uid);
  }
  // Mốc PHẢI là người đang sắp (`id`, khoá của chính vòng lặp này), không phải
  // một con số chung của union — đây đúng là chỗ lỗi VẼ mà DAC-TA-RANK mục 1.2
  // chỉ ra: mốc lệch thì vợ cả bị vẽ ra ngoài vợ thứ. Đọc `rankCua` từ union
  // THẬT qua `index.unionById`, không phải từ `ct.unionHT` — bản trong `ct` đã
  // lọc bớt trường, không còn `ranks`/`rank`.
  for (const [id, ds] of ct.unionLamVo) {
    ds.sort((a, b) =>
      (rankCua(index.unionById.get(a), id) - rankCua(index.unionById.get(b), id)) ||
      (a < b ? -1 : 1));
  }

  // --- Luật A: union nào ĐẶT CHỖ cho một người con -------------------------
  // Ưu tiên bộ cha mẹ ĐẺ. Con nuôi còn cha mẹ đẻ thì đứng dưới cha mẹ đẻ, bộ
  // nuôi nối tới bằng đường dài nét đứt (KE-HOACH: "vẽ cả hai đường dẫn lên").
  for (const id of ct.dsNguoi) {
    const ds = ct.unionLamCon.get(id);
    if (ds.length === 0) continue;
    const deIsBirth = ds.find((uid) =>
      ct.unionHT.get(uid).children.some((c) => c.personId === id && c.relation === 'birth'));
    ct.unionSoHuu.set(id, deIsBirth || ds.slice().sort()[0]);
  }

  // --- Luật B: ai bị hấp thụ vào dải của ai --------------------------------
  // `tuDung` = người tự có chỗ đứng riêng. Người có cha mẹ hiển thị luôn tự
  // đứng. Cặp mà cả hai đều không cha mẹ thì một người được chọn làm neo.
  const tuDung = new Set();
  for (const id of ct.dsNguoi) if (ct.unionSoHuu.has(id)) tuDung.add(id);

  const dsUnionSapXep = [...ct.unionHT.keys()].sort();
  for (const uid of dsUnionSapXep) {
    const u = ct.unionHT.get(uid);
    if (u.partners.length < 2) continue;

    let neoU = u.partners.find((p) => tuDung.has(p) && !ct.hapThuBoi.has(p));
    if (!neoU) {
      const ungVien = u.partners.filter((p) => !ct.hapThuBoi.has(p));
      if (ungVien.length === 0) continue;   // cả cặp đã bị hấp thụ nơi khác → nét dài
      // Cả cặp đều không có cha mẹ hiển thị. NGƯỜI CÓ NHIỀU BẠN ĐỜI giữ dải.
      // Ca thật: bà "2" (P0034) hai đời chồng. Lấy bừa người đầu danh sách thì
      // bà bị hấp thụ vào dải ông chồng thứ nhất, ông thứ hai văng ra xa nối
      // bằng nét dài — trong khi QUY-TAC-VE §3 nói các ô bạn đời xếp ra xa dần
      // Ô NGƯỜI ĐÓ, tức người đó mới là người giữ dải.
      neoU = ungVien.reduce((a, b) =>
        (ct.unionLamVo.get(b).length > ct.unionLamVo.get(a).length ? b : a));
      tuDung.add(neoU);
    }
    for (const p of u.partners) {
      if (p === neoU || tuDung.has(p) || ct.hapThuBoi.has(p)) continue;
      ct.hapThuBoi.set(p, { unionId: uid, neoId: neoU });   // mỗi người MỘT lần
    }
  }

  // ⚠ Ca "CẢ HAI vợ chồng đều tự đứng được" KHÔNG xử ở đây — nó cần biết ĐỜI,
  // mà đời thì `ganMucDoi()` chạy sau. Xem `hapThuCapTrongHo()`.
  return ct;
}

// soRank() đã BỎ (Vòng 2 của DAC-TA-RANK_V01) — đọc thứ bậc nay đi qua
// `rankCua()` nhập từ `./union.js`, đúng MỘT cửa cho cả app.

// ============================================================
// 2 · ĐỜI — đường đi dài nhất, rồi cân bằng lại
// ============================================================

/**
 * Xếp mỗi người vào một HÀNG. Hai ràng buộc, nới dần từ 0 tới khi hết đổi:
 *
 *   (a) mọi người trong CÙNG MỘT DẢI phải cùng hàng — dâu/rể lấy vào không có
 *       cha mẹ trong tập vẽ nên tự thân họ ở mức 0;
 *   (b) con LUÔN nằm dưới mọi người cha mẹ hiển thị của nó.
 *
 * Hai vế phải nới XEN KẼ, không làm tuần tự được: (a) kéo bà mẹ lấy vào xuống
 * đời 3, thì con của bà với một người chồng KHÔNG hiển thị vẫn còn kẹt ở đời 1
 * cho tới khi (b) chạy lại.
 *
 * Vì mức chỉ TĂNG và bị chặn trên bởi số người, vòng lặp chắc chắn dừng. Điểm
 * dừng của nó chính là **đời = độ dài đường đi DÀI NHẤT** — nghiệm nhỏ nhất
 * thoả (b) — nên không ai bị vẽ nằm trên tổ tiên của chính mình. Đó là ràng
 * buộc số 2 ở đầu file, và là lý do KHÔNG dùng `bfsLevels()`: nó cho đường
 * NGẮN nhất, và con của cặp kết hôn trong họ sẽ bị vẽ ngang hàng với mẹ nó.
 *
 * ⚠ Riêng vòng NỚI DẦN không phải một phép duyệt đồ thị, nên không phá luật
 * "chỉ `utils/graph.js` được viết vòng lặp duyệt": nó chỉ nới đi nới lại trên
 * các danh sách đã dựng sẵn ở `dungNguCanh()`, không đi tìm đường, không cần
 * tập `visited`.
 *
 * ⚠ NHƯNG `toTienDong()` thêm ở chat 1.7 thì CÓ đi tìm đường, và nó **bắt buộc
 * có `visited`** — bản dữ liệu làm việc có sẵn hai vòng. Nó vẫn nằm ở đây chứ
 * không chuyển sang `utils/graph.js` vì nó đi lên bằng `ct.unionSoHuu`, tức
 * theo ĐÚNG BỘ CHA MẸ ĐÃ ĐẶT CHỖ cho từng người — một khái niệm chỉ có nghĩa
 * bên trong phép bố trí này, không phải một phép duyệt gia phả dùng chung.
 *
 * ⚠ Đã thử khởi tạo bằng một hàm sắp thứ tự tô-pô trong `utils/graph.js` cho
 * hội tụ nhanh. Đo trên cây bịa tới 2046 người: kết quả **giống hệt** trên cả
 * 89 sơ đồ của hai file dữ liệu, mà lại **chậm hơn 10–20%** — cây gia phả chỉ
 * sâu 8–9 đời nên vòng này vốn đã hội tụ sau chừng ấy vòng, còn sắp tô-pô thì
 * tốn hơn phần tiết kiệm được. Đã gỡ bỏ. Đừng thêm lại.
 *
 * `tran` chỉ là dây bảo hiểm cho dữ liệu hỏng có vòng có hướng (ai đó là tổ
 * tiên của chính mình) — một hàm bố trí sơ đồ không được phép treo trình duyệt
 * vì dữ liệu xấu.
 */
function ganMucDoi(ct) {
  const muc = new Map();
  for (const id of ct.dsNguoi) muc.set(id, 0);

  let m = canNhanh(ct, noiDan(ct, muc));

  // Kéo các GỐC TRÔI xuống sát ngay trên con của họ, rồi nới lại. Mỗi lượt chỉ
  // ĐẨY XUỐNG nên vòng này đơn điệu và chắc chắn dừng; `tran` là dây bảo hiểm.
  const tran = ct.dsNguoi.length + 2;
  for (let vong = 0; vong < tran; vong++) {
    const mKeo = keoGocTroiXuong(ct, m);
    if (!mKeo) break;
    m = canNhanh(ct, noiDan(ct, mKeo));
  }

  ct.muc = m;
}

/**
 * GỐC TRÔI: người không có cha mẹ hiển thị, không bị hấp thụ vào dải ai, mà
 * con của họ lại nằm sâu tít dưới. Kéo họ xuống đúng một hàng trên người con
 * NÔNG NHẤT của mình.
 *
 * --- Ca đã sinh ra luật này (18/08/2026, chủ dự án nhìn ảnh) --------------
 *
 * Bà Hương Lan (`P0020`) có hai bộ cha mẹ: bộ ĐẺ `U0013` và bộ NUÔI `U0025`
 * (ông Vượng, bà Loan). Luật A cho bà đứng dưới bộ ĐẺ, ở đời 6. Ông Vượng và bà
 * Loan thì **không có một tổ tiên nào trong sơ đồ**, nên vòng nới dần — vốn chỉ
 * biết ĐẨY XUỐNG — để nguyên hai người ở đời 0, ngang hàng cụ tổ sinh năm 1850.
 * Ràng buộc *"con phải sâu hơn cha mẹ"* vẫn thoả (6 > 0), nên **không bất biến
 * nào kêu**: sơ đồ đúng, chỉ là xấu và nói sai về gia đình ấy — nét đứt chạy
 * suốt sáu đời khiến người xem tưởng hai người là tổ tiên xa của cả họ.
 *
 * Luật: **đời của một người không có tổ tiên hiển thị thì do CON họ quyết
 * định, không phải do đỉnh sơ đồ.** Cùng tinh thần với luật B (người không có
 * cha mẹ hiển thị được hấp thụ vào dải bạn đời) — chỉ khác là ở đây không có
 * bạn đời nào để bám, nên bám vào con.
 *
 * Lấy người con NÔNG NHẤT (`min`), không phải sâu nhất: có nhiều con thì phải
 * đứng trên **tất cả**, và `min - 1` là hàng thấp nhất còn thoả điều đó.
 *
 * @returns {Map|null} bản đồ mức mới, hoặc null khi không ai phải dịch.
 */
function keoGocTroiXuong(ct, mucVao) {
  const muc = new Map(mucVao);
  let coDoi = false;

  for (const id of ct.dsNguoi) {
    if (ct.unionSoHuu.has(id)) continue;   // có cha mẹ hiển thị → đã có chỗ neo thật
    if (ct.hapThuBoi.has(id))  continue;   // đã bám vào dải bạn đời → luật B lo

    let nongNhat = Infinity;
    for (const uid of ct.unionLamVo.get(id) || []) {
      const u = ct.unionHT.get(uid);
      if (!u) continue;
      for (const c of u.children) {
        const mc = muc.get(c.personId);
        if (mc !== undefined && mc < nongNhat) nongNhat = mc;
      }
    }
    if (!Number.isFinite(nongNhat)) continue;   // chưa có người con nào hiển thị

    if (nongNhat - 1 > (muc.get(id) || 0)) { muc.set(id, nongNhat - 1); coDoi = true; }
  }

  return coDoi ? muc : null;
}

/**
 * Vòng nới dần: đẩy mọi người xuống cho tới khi hết ràng buộc bị vi phạm.
 *
 * Hai ràng buộc, cả hai chỉ ĐẨY XUỐNG, không bao giờ kéo lên — nhờ vậy vòng
 * lặp đơn điệu và chắc chắn dừng:
 *   - con phải sâu hơn MỌI cha mẹ đúng một bậc trở lên (luật A)
 *   - người bị hấp thụ đứng cùng hàng người neo (luật B)
 */
function noiDan(ct, mucVao) {
  const muc  = new Map(mucVao);
  const tran = ct.dsNguoi.length + 2;

  for (let vong = 0; vong < tran; vong++) {
    let coDoi = false;

    for (const [pid, ht] of ct.hapThuBoi) {
      const m = Math.max(muc.get(pid) || 0, muc.get(ht.neoId) || 0);
      if ((muc.get(pid) || 0) !== m)      { muc.set(pid, m);      coDoi = true; }
      if ((muc.get(ht.neoId) || 0) !== m) { muc.set(ht.neoId, m); coDoi = true; }
    }

    for (const [, u] of ct.unionHT) {
      let mCha = -1;
      for (const pid of u.partners) mCha = Math.max(mCha, muc.get(pid) || 0);
      if (mCha < 0) continue;
      for (const c of u.children) {
        if ((muc.get(c.personId) || 0) <= mCha) { muc.set(c.personId, mCha + 1); coDoi = true; }
      }
    }

    if (!coDoi) break;
  }
  return muc;
}

/**
 * Tổ tiên hiển thị của một người, KỂ CẢ chính người đó.
 *
 * Đi lên bằng `unionSoHuu` — đúng một bộ cha mẹ mỗi người, chính bộ đã ĐẶT CHỖ
 * cho họ ở luật A. Con nuôi còn cha mẹ đẻ thì đi theo bộ ĐẺ, khớp với chỗ họ
 * thật sự đứng trên sơ đồ.
 *
 * ⚠ CÓ `visited` — gia phả là đồ thị, bản dữ liệu làm việc có sẵn hai vòng.
 *
 * Kết quả không phụ thuộc `muc`, nên nhớ đệm lại một lần cho cả lượt bố trí:
 * `canNhanh()` gọi hàm này nhiều lần trên cùng một người.
 */
function toTienDong(ct, start) {
  if (ct.toTien.has(start)) return ct.toTien.get(start);

  const visited = new Set([start]);
  const hangDoi = [start];
  while (hangDoi.length) {
    const id  = hangDoi.shift();
    const uid = ct.unionSoHuu.get(id);
    if (!uid) continue;
    for (const p of ct.unionHT.get(uid).partners) {
      if (visited.has(p)) continue;
      visited.add(p);
      hangDoi.push(p);
    }
  }

  ct.toTien.set(start, visited);
  return visited;
}

/** Hai người này có tổ tiên chung không — tức có phải KẾT HÔN TRONG HỌ không. */
function chungDongHo(ct, a, b) {
  const ttA = toTienDong(ct, a);
  const ttB = toTienDong(ct, b);
  // Duyệt tập NHỎ HƠN: một bên thường chỉ có vài người, bên kia có thể cả nhánh.
  const [nho, lon] = ttA.size <= ttB.size ? [ttA, ttB] : [ttB, ttA];
  for (const x of nho) if (lon.has(x)) return true;
  return false;
}

/**
 * Căn hai nhánh KHÁC dòng họ về cùng một hàng (chat 1.7).
 *
 * Cặp CÓ tổ tiên chung thì để yên — nét chéo của họ là sự thật, xem luật 1 ở
 * đầu file. Cặp KHÔNG có tổ tiên chung mà đang lệch hàng thì dịch cả NHÁNH TỔ
 * TIÊN của người nông hơn xuống cho bằng người kia.
 *
 * Dịch cả nhánh chứ không dịch mỗi một người: kéo riêng ông Dũng xuống 3 hàng
 * thì mẹ ông vẫn đứng nguyên và nét dọc nối hai người dài suốt 4 đời. Cái phải
 * dịch là cả nhánh ông ấy đi lên.
 *
 * Dịch xong CHẠY LẠI `noiDan()`: cha mẹ xuống thì con cháu phải theo kịp. Vòng
 * nới dần chỉ đẩy xuống nên nó phục hồi được luật A mà không phá cái vừa căn —
 * hai người vừa cho bằng nhau thì không ai bị đẩy riêng ra nữa.
 *
 * Lặp tới khi ổn định. Mỗi lần dịch đưa đúng một cặp về chênh lệch 0, và số
 * cặp là hữu hạn, nên vòng lặp dừng; `tran` chỉ là lưới an toàn cho dữ liệu lạ.
 */
function canNhanh(ct, mucVao) {
  let muc = mucVao;
  const tran = ct.unionHT.size + 4;

  for (let vong = 0; vong < tran; vong++) {
    let coDoi = false;

    for (const [, u] of ct.unionHT) {
      if (u.partners.length < 2) continue;

      for (let i = 0; i < u.partners.length; i++) {
        for (let j = i + 1; j < u.partners.length; j++) {
          const a = u.partners[i];
          const b = u.partners[j];
          if (muc.get(a) === muc.get(b)) continue;
          if (chungDongHo(ct, a, b)) continue;

          const nong = muc.get(a) < muc.get(b) ? a : b;
          const buoc = Math.abs(muc.get(a) - muc.get(b));
          for (const x of toTienDong(ct, nong)) muc.set(x, muc.get(x) + buoc);
          coDoi = true;
        }
      }
    }

    if (!coDoi) break;
    muc = noiDan(ct, muc);
  }

  // Kéo hàng trên cùng về 0. Đời là THỨ TỰ HÀNG, không phải con số tuyệt đối —
  // và `tinhBounds()` ở cuối tính lề từ toạ độ thật, nên bỏ bước này thì cả sơ
  // đồ trôi xuống đúng bằng số hàng vừa dịch.
  let min = Infinity;
  for (const v of muc.values()) if (v < min) min = v;
  if (min !== 0 && Number.isFinite(min)) {
    for (const id of ct.dsNguoi) muc.set(id, muc.get(id) - min);
  }
  return muc;
}

/**
 * HÔN NHÂN TRONG HỌ — kéo cặp về đứng LIỀN NHAU. Thêm ở bước 81.
 *
 * ⚠ **Ca này trước bước 81 không ai được hấp thụ, và đó là lỗi chủ dự án chỉ
 * ra khi xem app thật:** *"bản chất Trọng Dũng và Hương Lan là 1 cặp, tại sao
 * cứ bị lỗi hoài vậy?"* Luật B cho *"người có cha mẹ hiển thị thì tự đứng"*,
 * nên khi CẢ HAI vợ chồng đều có cha mẹ trên hình thì không ai nhường ai —
 * mỗi người đứng dưới cha mẹ mình, và cặp bị tách ra hai đầu sơ đồ.
 *
 * Đo trên ba cây (`kiem-thu/do-cap-roi-nhau.mjs`): ca này hiếm — 4 cặp trong
 * cây hợp nhất 73 người, **2 cặp trong cả cây Nguyễn Phúc 681 người**. Nhưng
 * hễ gặp thì sai rất lộ, vì nó tách đúng cái cặp mà mắt người tìm đầu tiên.
 *
 * ⚠ **CÁI GIÁ, và nó KHÔNG tránh được:** một người chỉ đứng được MỘT chỗ. Kéo
 * bà về cạnh chồng thì **nét từ cha mẹ RUỘT của bà thành nét đi xa**. Không có
 * cách bố trí nào giữ ngắn cả ba mối nối cùng lúc — gia phả là ĐỒ THỊ, và hôn
 * nhân trong họ chính là chỗ đồ thị lộ ra là không phải cây.
 *
 * ⚠ **BA RÀO CHẮN. Bỏ bớt một là hỏng một luật khác, cả ba đều có ca kiểm:**
 *
 *   1. **CÙNG ĐỜI.** Lệch đời thì để nguyên — `QUY-TAC-VE §9` LUẬT LỆCH HÀNG.
 *      Ca kiểm: `U0023`, ông "11" (`P0044`, đời 4) cưới bà "29" (`P0053`, đời
 *      5). Bản đầu của bước 81 bỏ quên rào này và **kéo bà lên ngang hàng
 *      ông** — bốn bất biến của `chay.mjs` đỏ ngay. Thứ bậc đời trong gia phả
 *      Việt là thông tin thật, không phải chi tiết trình bày.
 *      ⚠ Vì rào này mà hàm phải chạy SAU `ganMucDoi()`, chứ không gộp được
 *      vào Luật B trong `dungNguCanh()`: lúc ấy chưa ai biết đời.
 *   2. **NGƯỜI BỊ KÉO chỉ có ĐÚNG MỘT union hiển thị.** Người nhiều bạn đời là
 *      NGƯỜI GIỮ DẢI của chính họ (§3); kéo họ sang dải người khác thì những
 *      union kia mất neo và chùm con của chúng rơi vào lưới an toàn của
 *      `datMoiKhoi()`, tức đứng lạc chỗ.
 *   3. **ĐÚNG HAI người trong union.** Ba người trở lên thì "ai nhường ai"
 *      không còn một câu trả lời; để nguyên cách cũ.
 *
 * Ai giữ dải: người có NHIỀU bạn đời hơn (cùng lý lẽ với Luật B), hoà thì lấy
 * người đứng trước trong `partners` — thứ tự ấy đến từ `partnerOrder`, tức thứ
 * người dùng hoán được bằng tay.
 */
function hapThuCapTrongHo(ct) {
  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u = ct.unionHT.get(uid);
    if (u.partners.length !== 2) continue;                       // rào 3

    const [a, b] = u.partners;
    if (!ct.unionSoHuu.has(a) || !ct.unionSoHuu.has(b)) continue;  // không phải ca này
    if (ct.hapThuBoi.has(a) || ct.hapThuBoi.has(b)) continue;      // đã yên chỗ
    if (ct.muc.get(a) !== ct.muc.get(b)) continue;                 // rào 1

    const soA = (ct.unionLamVo.get(a) || []).length;
    const soB = (ct.unionLamVo.get(b) || []).length;
    const neo = soB > soA ? b : a;
    const kia = neo === a ? b : a;
    if ((ct.unionLamVo.get(kia) || []).length !== 1) continue;     // rào 2

    ct.roiChoCha.add(kia);        // cha mẹ ruột thôi ĐẶT CHỖ, vẫn là cha mẹ ruột
    ct.hapThuBoi.set(kia, { unionId: uid, neoId: neo });
  }
}

// ============================================================
// 3 · DẢI — một người cùng mọi bạn đời được hấp thụ, trên MỘT hàng
// ============================================================

/**
 * QUY-TAC-VE §3: khung tên luôn cùng một hàng đời, không xếp dọc. Các ô bạn
 * đời xếp RA XA DẦN ô người neo theo `rankCua(u, neoId)` — mốc luôn là CHÍNH
 * người neo của dải này; nam thì vợ cả sát bên phải, nữ
 * thì soi gương lại, chồng cả sát bên trái.
 *
 * Trả về toạ độ TƯƠNG ĐỐI trong dải (mép trái dải = 0), nên tính một lần rồi
 * dùng lại được ở cả bước đặt khối lẫn bước dựng đường nối.
 *
 * `khe` là điểm treo chùm con của từng union — QUY-TAC-VE §4: tâm khe hở giữa
 * ô người neo và ô bạn đời thứ k. Union không có bạn đời nào trong dải (hôn
 * nhân một người — ông Thục ở U0024) thì điểm treo là TÂM Ô người duy nhất,
 * tuyệt đối không bịa thêm một ô "không rõ" làm người phối ngẫu.
 */
function layDai(ct, neoId) {
  if (ct.dai.has(neoId)) return ct.dai.get(neoId);

  const buoc     = RONG + LAYOUT.spouseGap;
  const dsUnion  = (ct.unionLamVo.get(neoId) || []).filter((uid) => ct.unionHT.has(uid));
  const banDoi   = [];
  for (const uid of dsUnion) {
    for (const sid of ct.unionHT.get(uid).partners) {
      if (sid === neoId) continue;
      const ht = ct.hapThuBoi.get(sid);
      if (ht && ht.neoId === neoId && ht.unionId === uid) banDoi.push({ unionId: uid, spouseId: sid });
    }
  }

  const huong = tinhHuong(ct, neoId, banDoi);
  const n     = banDoi.length;
  const dxP   = huong > 0 ? 0 : n * buoc;

  const dx     = new Map([[neoId, dxP]]);
  const khe    = new Map();
  const mucNet = new Map();
  banDoi.forEach((bd, i) => {
    dx.set(bd.spouseId, dxP + huong * (i + 1) * buoc);
    khe.set(bd.unionId, huong > 0
      ? i * buoc + RONG + LAYOUT.spouseGap / 2
      : dxP - LAYOUT.spouseGap / 2 - i * buoc);
    mucNet.set(bd.unionId, i);
  });
  for (const uid of dsUnion) {
    if (khe.has(uid)) continue;
    khe.set(uid, dxP + RONG / 2);
    mucNet.set(uid, 0);
  }

  // Độ cao mỗi nấc — chia đều, đừng cộng dồn. Cộng dồn cứng 8px thì đến người
  // thứ tư nét tràn ra khỏi khung.
  const buocNet = n > 1
    ? Math.min(LAYOUT.spouseStepMax, (MUC_NET - LAYOUT.spouseStepPadTop) / (n - 1))
    : 0;

  const kq = {
    neoId, huong, n, dx, khe, mucNet, dxP, buocNet,
    rong: (n + 1) * buoc - LAYOUT.spouseGap,
    thuTuUnion: dsUnion,
    banDoi,
  };
  ct.dai.set(neoId, kq);
  return kq;
}

/**
 * QUY-TAC-VE §2 — NAM TRÁI, NỮ PHẢI. Trả +1 nghĩa là bạn đời xếp sang PHẢI ô
 * người neo (người neo là nam), -1 là sang TRÁI (người neo là nữ).
 *
 * Cùng giới, hoặc thiếu giới tính (`sex: "U"` — hai ô xám "7b" và "28" trong
 * dữ liệu thử), thì rơi về `partnerOrder`, đúng thứ người dùng hoán được tay.
 */
function tinhHuong(ct, neoId, banDoi) {
  const gt = gioiTinh(ct, neoId);
  if (banDoi.length === 0) return gt === 'F' ? -1 : 1;

  const gtS = gioiTinh(ct, banDoi[0].spouseId);
  if (gt === 'M' && gtS === 'F') return 1;
  if (gt === 'F' && gtS === 'M') return -1;

  const u  = ct.index.unionById.get(banDoi[0].unionId);
  const po = (u && Array.isArray(u.partnerOrder) && u.partnerOrder.length)
    ? u.partnerOrder
    : ((u && u.partners) || []);
  const iP = po.indexOf(neoId);
  const iS = po.indexOf(banDoi[0].spouseId);
  if (iP >= 0 && iS >= 0) return iS > iP ? 1 : -1;
  return gt === 'F' ? -1 : 1;
}

function gioiTinh(ct, id) {
  const p = ct.index.personById.get(id);
  return (p && p.sex) || 'U';
}

// ============================================================
// 4 · ĐẶT KHỐI — đệ quy xuống, rồi căn cha mẹ vào giữa đàn con
// ============================================================

/**
 * Mỗi khối gói trọn một dải cùng toàn bộ hậu duệ của nó. Khối con được ghép
 * ngang theo BAO HÌNH CHỮ NHẬT của chúng, không lồng đường viền vào nhau —
 * rộng hơn cách tối ưu vài chục pixel, đổi lại KHÔNG BAO GIỜ chồng ô, và đọc
 * lại được. QUY-TAC-VE §9 đã chốt: đừng viết thuật toán tối ưu chỗ này.
 *
 * `daDat` vừa là trạng thái "đã có toạ độ", vừa là cái chặn đệ quy: hai nhánh
 * cưới nhau làm một người có hai đường dẫn tới, không có nó thì khối bị nhân
 * bản (đồ thị, không phải cây — xem HIEN-PHAP mục 7). Trả `null` chính là câu
 * "người này đã đứng chỗ khác rồi, hãy nối tới bằng một đường dài".
 *
 * @returns {{w:number, neoX:number, items:Array<{id:string,x:number}>}|null}
 */
/**
 * BẠN ĐờI CỦA NGƯỜI NÀY ĐỨNG BÊN NÀO — đọc từ DẢI, không đọc từ toạ độ
 * (lúc gọi chưa ai có toạ độ). Trả +1 nếu bạn đời ở BÊN PHẢI, −1 nếu ở
 * BÊN TRÁI, 0 nếu không có bạn đời hiển thị.
 *
 * Dùng để biết tổ tiên của người này phải né sang phía nào — xem `datCum()`.
 */
function phiaBanDoi(ct, id) {
  const ht = ct.hapThuBoi.get(id);
  if (ht) {
    const d = layDai(ct, ht.neoId);
    const a = d.dx.get(id), b = d.dx.get(ht.neoId);
    return (a === undefined || b === undefined || a === b) ? 0 : (b > a ? 1 : -1);
  }
  const d = layDai(ct, id);
  return d.n > 0 ? d.huong : 0;
}

function datCum(ct, neoId) {
  if (ct.daDat.has(neoId)) return null;
  ct.daDat.add(neoId);

  const dai = layDai(ct, neoId);
  for (const id of dai.dx.keys()) ct.daDat.add(id);

  // --- Đệ quy xuống trước, cha mẹ căn theo con sau -------------------------
  const chum = [];
  for (const uid of dai.thuTuUnion) {
    const khoi = [];
    for (const c of ct.unionHT.get(uid).children) {
      if (ct.unionSoHuu.get(c.personId) !== uid) continue;   // bộ cha mẹ kia đặt chỗ
      // Hôn nhân trong họ (b81): người này đã theo bạn đời sang dải bên kia,
      // cha mẹ ruột không còn đặt chỗ cho họ nữa. Không lọc ở đây thì họ bị
      // đặt HAI lần, và lần nào thắng là tuỳ thứ tự đệ quy — tức bố cục đổi
      // theo mã người, một loại lỗi không ai lần ra được.
      if (ct.roiChoCha.has(c.personId)) continue;
      const k = datCum(ct, c.personId);
      if (k) khoi.push({ ...k, conId: c.personId });
    }
    if (khoi.length > 0) {
      chum.push({ unionId: uid, khoi });
      const ids = [];
      for (const k of khoi) for (const it of k.items) ids.push(it.id);
      ct.cumCon.set(uid, ids);
    }
  }

  if (chum.length === 0) {
    const items = [];
    for (const [id, ddx] of dai.dx) items.push({ id, x: ddx });
    return { w: dai.rong, neoX: dai.dxP + RONG / 2, items };
  }

  // Chùm con xếp cùng chiều với các bà — nếu không, nét treo con của bà thứ
  // phải bắc chéo qua nét treo con của bà cả.
  const thuTu   = dai.huong > 0 ? chum : chum.slice().reverse();
  const itemCon = [];
  const tamChum = [];
  let x = 0;
  for (const c of thuTu) {
    const neoXs = [];
    for (const k of c.khoi) {
      for (const it of k.items) itemCon.push({ id: it.id, x: it.x + x });
      neoXs.push(x + k.neoX);
      x += k.w + LAYOUT.hGap;
    }
    tamChum.push({ unionId: c.unionId, tam: (neoXs[0] + neoXs[neoXs.length - 1]) / 2 });
  }
  const rongCon = x - LAYOUT.hGap;

  // Căn dải vào giữa đàn con: khớp trung điểm giữa chùm ngoài cùng trái và
  // chùm ngoài cùng phải với trung điểm giữa hai KHE tương ứng. Một chùm duy
  // nhất (gần như mọi ca thật) thì thành "khe nằm đúng giữa chùm con".
  const trai = tamChum[0];
  const phai = tamChum[tamChum.length - 1];
  let lech = (trai.tam + phai.tam) / 2 - (dai.khe.get(trai.unionId) + dai.khe.get(phai.unionId)) / 2;

  // ⚠ **CẶP CHỈ CÓ MỘT NGƯỜI CON: CĂN MÉP, KHÔNG CĂN GIỮA — bước 85e.**
  //
  // Căn giữa xong, một chùm con duy nhất gồm đúng MỘT khối thì KHE của cặp rơi
  // trúng tâm ô người con — nét cha mẹ – con thành đường thẳng một mạch, và
  // tệ hơn: **dải cha mẹ nằm chình ình lên cả chỗ của người bạn đời**, nên tổ
  // tiên bên kia không còn chỗ và bị đẩy sang tận đầu kia sơ đồ.
  //
  // Chủ dự án chỉ ra luật đúng khi đối chiếu `tai-lieu/anh-qft/so do 3 khoi.png`
  // — sơ đồ Quick Family Tree quanh cặp `10 × 9` chia làm **BA KHỐI**:
  //
  //   khối 1 · cặp 10–9 và các con
  //   khối 2 · tổ tiên của 10 — **người tận cùng bên PHẢI thẳng với 10**
  //   khối 3 · tổ tiên của  9 — **người tận cùng bên TRÁI  thẳng với  9**
  //
  // Nói cách khác: tổ tiên của mỗi người **né sang phía đối diện bạn đời**, để
  // hai nhánh nội và ngoại không tranh nhau chỗ ngay trên đầu cặp vợ chồng.
  //
  //     CĂN GIỮA (tới b85d)              CĂN MÉP (b85e)
  //
  //        a ── b                    a ── b        7 ── 8
  //        └──┬──┘                   └──┬──┘       └──┬─┘
  //          10 ── 9   ← 7,8 hết chỗ    10 ─────── 9
  //
  // Áp dụng nhiều đời thì thành hình BẬC THANG, đúng như ảnh QFT: mỗi đời tổ
  // tiên lùi thêm nửa dải ra phía ngoài.
  //
  // ⚠ Người con **không có bạn đời hiển thị** thì không có phía nào để né —
  // giữ luật b85b: đẩy nửa bước bạn đời cho con đứng dưới NGƯỜI NEO, đủ để nét
  // có khuỷu.
  if (chum.length === 1 && chum[0].khoi.length === 1) {
    const phia = phiaBanDoi(ct, chum[0].khoi[0].conId);
    if (phia > 0)      lech = trai.tam - (dai.rong - RONG / 2);   // mép PHẢI ⟂ ô con
    else if (phia < 0) lech = trai.tam - RONG / 2;                // mép TRÁI ⟂ ô con
    else               lech += dai.khe.get(chum[0].unionId) - dai.dxP - RONG / 2;
  }

  const bienTrai = Math.min(0, lech);
  const bienPhai = Math.max(rongCon, lech + dai.rong);
  const dich     = -bienTrai;

  const items = [];
  for (const it of itemCon)   items.push({ id: it.id, x: it.x + dich });
  for (const [id, ddx] of dai.dx) items.push({ id, x: ddx + lech + dich });

  return {
    w: bienPhai - bienTrai,
    neoX: dai.dxP + lech + dich + RONG / 2,
    items,
  };
}

/**
 * Mỗi người không có cha mẹ hiển thị và không bị hấp thụ là gốc của một khối.
 * Trong sơ đồ quanh một người trung tâm thường chỉ có MỘT gốc; nhiều gốc xảy
 * ra khi tập hiển thị gồm những nhánh chưa nối được với nhau.
 */
/**
 * MỌI NGƯỜI KHỐI NÀY SẼ CHỨA, tính TRƯỚC khi đặt toạ độ.
 *
 * Đi đúng đường `datCum()` đi: dải của người neo, rồi đệ quy xuống những người
 * con mà union ấy THẬT SỰ đặt chỗ. Thành viên không phụ thuộc thứ tự đặt khối
 * — mỗi người chỉ có đúng một union đặt chỗ cho mình — nên tính sớm được.
 *
 * ⚠ CÓ `daVao`: gia phả là ĐỒ THỊ. Hai nhánh cưới nhau làm một người có hai
 * đường dẫn tới, thiếu tập này là đệ quy không đáy.
 */
function thanhVienDuKien(ct, neoId, ra = new Set(), daVao = new Set()) {
  if (daVao.has(neoId)) return ra;
  daVao.add(neoId);

  const dai = layDai(ct, neoId);
  for (const id of dai.dx.keys()) ra.add(id);
  for (const uid of dai.thuTuUnion) {
    const u = ct.unionHT.get(uid);
    if (!u) continue;
    for (const c of u.children) {
      if (ct.unionSoHuu.get(c.personId) !== uid) continue;
      if (ct.roiChoCha.has(c.personId)) continue;
      thanhVienDuKien(ct, c.personId, ra, daVao);
    }
  }
  return ra;
}

/**
 * KHỐI PHỤ là khối chỉ nối với phần còn lại của sơ đồ bằng **nét cha mẹ tới một
 * người con đứng nhờ chỗ khác** — cha mẹ ruột của người bị hấp thụ (§9b, b81),
 * hoặc cha mẹ nuôi (§10b, b20). Nó không đặt chỗ cho ai ngoài chính nó.
 *
 * ⚠ **Hỏi trên CẢ KHỐI, không hỏi mỗi cái dải của người neo.** Bản đầu của b85c
 * chỉ xét dải người neo, nên một **chuỗi tổ tiên nhiều đời** (cụ → ông → cha)
 * bị coi là khối CHÍNH chỉ vì cụ có đặt chỗ cho ông. Hình sai: cả nhánh tổ tiên
 * của bà vợ bị vẽ sang hẳn bên trái, ngược bên với bà — chủ dự án bắt được khi
 * đối chiếu ảnh `tai-lieu/anh-qft/so do 3 khoi.png` (bước 85e).
 *
 * Khối chứa NGƯỜI TRUNG TÂM không bao giờ là khối phụ: sơ đồ vẽ quanh người ấy
 * thì người ấy đứng yên, mọi thứ khác chạy tới.
 *
 * Trả `null` nếu là khối chính. Nếu là khối phụ thì kèm `ben` và `chaMeIds`:
 *   +1 · đứng BÊN PHẢI phần còn lại   −1 · BÊN TRÁI   0 · không biết (cha mẹ nuôi)
 *
 * `chaMeIds` là **CỬA của khối** — đúng hai người (cha và mẹ) mà nét cha mẹ – con
 * mọc ra từ đó. Xem `datMoiKhoi()`: khối tổ tiên nhiều đời phải căn theo CỬA,
 * không căn theo bao hình.
 *
 * ⚠ **`ben` đọc từ DẢI, không đọc từ toạ độ** — lúc gọi chưa ai có toạ độ.
 * Người bị hấp thụ đứng bên nào của người neo thì cha mẹ ruột của họ đứng bên
 * ấy; không thì nét từ cha mẹ tới con bắt chéo qua cha mẹ của người kia.
 */
function khoiPhuBen(ct, neoId) {
  const tv = thanhVienDuKien(ct, neoId);
  if (ct.tamId && tv.has(ct.tamId)) return null;

  let la = false, ben = 0, conId = null, chaMeIds = [];
  for (const id of tv) {
    for (const uid of ct.unionLamVo.get(id) || []) {
      const u = ct.unionHT.get(uid);
      if (!u) continue;
      for (const c of u.children) {
        if (tv.has(c.personId)) continue;          // con nằm trong khối → không tính
        la = true;
        const ht = ct.hapThuBoi.get(c.personId);
        if (!ht || ben !== 0) continue;
        conId = c.personId;
        chaMeIds = (u.partners || []).filter((x) => tv.has(x));
        const daiCon = layDai(ct, ht.neoId);
        const dCon = daiCon.dx.get(c.personId);
        const dNeo = daiCon.dx.get(ht.neoId);
        if (dCon === undefined || dNeo === undefined || dCon === dNeo) continue;
        ben = dCon > dNeo ? 1 : -1;
      }
    }
  }
  return la ? { ben, conId, chaMeIds } : null;
}

/**
 * KHOÁ THỨ TỰ TỔ TIÊN — mỗi người một dãy 0/1, đọc từ người trung tâm đi LÊN.
 *
 * `0` = người này đứng bên TRÁI bạn đời, `1` = bên PHẢI. Đi lên một đời thì
 * nối thêm một số vào đuôi. So hai khoá theo lối từ điển thì ra đúng **thứ tự
 * trái–phải mà luật BA KHỐI đòi**: toàn bộ nhánh của người bên trái đứng trước
 * toàn bộ nhánh của người bên phải, ở MỌI đời — vì đó chính là luật đệ quy.
 *
 * Ca đã sinh ra nó (`cu bị day ra ria.ged`, bước 86b): trước đó `datMoiKhoi()`
 * xếp khối tổ tiên theo TOẠ ĐỘ người con. Toạ độ ấy đo ở những HÀNG KHÁC NHAU
 * (bà Hương Lan ở hàng 5, bà Thịnh ở hàng 3) nên so với nhau là vô nghĩa: khối
 * cụ của bà Thịnh bị xếp sau khối cụ của bà Hương Lan, trong khi bà Thịnh
 * thuộc nhánh bên trái. Kết quả là hai nhánh cài răng lược vào nhau ở hàng cụ,
 * và không cặp nào ở dưới còn xê dịch được nữa.
 *
 * ⚠ Có tập đã-thăm (`khoa` chính là nó): gia phả là ĐỒ THỊ, hai nhánh cưới
 * nhau làm một người có hai đường đi tới. Thiếu nó là lặp không đáy.
 */
function khoaToTien(ct) {
  const khoa = new Map();
  const tam  = ct.tamId;
  if (!tam || !ct.visibleSet.has(tam)) return khoa;

  const ben = (id) => (phiaBanDoi(ct, id) > 0 ? 0 : 1);

  // Người trung tâm có bạn đời hiển thị thì CẢ CẶP là gốc — hai nhánh tổ tiên
  // của họ là hai khối con 2 và 3 của chính cặp ấy.
  const uVo = (ct.unionLamVo.get(tam) || [])
    .find((uid) => (ct.unionHT.get(uid) || { partners: [] }).partners.length === 2);
  const hang = [];
  if (uVo) {
    for (const p of ct.unionHT.get(uVo).partners) {
      if (khoa.has(p)) continue;
      khoa.set(p, [ben(p)]);
      hang.push(p);
    }
  } else {
    khoa.set(tam, []);
    hang.push(tam);
  }

  for (let i = 0; i < hang.length; i++) {
    const c  = hang[i];
    const pu = ct.unionSoHuu.get(c);
    const u  = pu ? ct.unionHT.get(pu) : null;
    if (!u) continue;
    for (const p of u.partners) {
      if (khoa.has(p)) continue;
      khoa.set(p, khoa.get(c).concat(ben(p)));
      hang.push(p);
    }
  }
  return khoa;
}

/** So hai khoá tổ tiên theo lối từ điển. Không có khoá thì xếp sau cùng. */
function soKhoa(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

function datMoiKhoi(ct) {
  const viTri = new Map();
  let xPhai = 0, xTrai = 0;

  const ghi = (id, k, x) => {
    for (const it of k.items) viTri.set(it.id, it.x + x);
    // Nhớ ai thuộc khối nào: `keoKhoiPhuVeGanCon()` cần dịch cả khối một lượt,
    // và cần biết khối nào to hơn khối nào.
    ct.thanhVienKhoi.set(id, k.items.map((it) => it.id));
  };

  const datMot = (id, ben) => {
    const k = datCum(ct, id);
    if (!k) return;
    const x = ben < 0 ? xTrai - LAYOUT.blockGap - k.w : xPhai;
    ghi(id, k, x);
    if (ben < 0) xTrai = x; else xPhai = x + k.w + LAYOUT.blockGap;
  };

  // ⚠ **KHỐI CHÍNH TRƯỚC, KHỐI PHỤ SAU — VÀ ĐẶT THẲNG VÀO ĐÚNG CHỖ. b85c/f.**
  //
  // Trước b85 thứ tự xếp khối là thứ tự người trong file dữ liệu, và mọi khối
  // nối đuôi nhau sang phải. Khối phụ nào tình cờ đứng trước thì bị **kẹt giữa
  // hai khối chính**, và `keoKhoiPhuVeGanCon()` không cứu được: nó chỉ trượt
  // trong chỗ trống, không được phép chui qua khối khác. Hình sai chủ dự án bắt
  // được từ ảnh: cả nhánh tổ tiên của bà vợ bị vẽ sang hẳn bên trái, ngược bên
  // với bà, nét bắt chéo qua nhánh tổ tiên của ông chồng.
  //
  // Nay ba việc, thiếu một là vẫn sai:
  //   1. khối phụ đặt SAU mọi khối chính, để lúc ấy đã biết toạ độ thật của
  //      người con mà nó phải chạy tới;
  //   2. **thử đặt THẲNG vào đúng chỗ** — căn MÉP GẦN của khối trùng tâm ô con,
  //      đúng luật ba khối ở §9 (`tai-lieu/anh-qft/so do 3 khoi.png`);
  //   3. chỗ ấy có ô khác chiếm thì mới nối vào rìa, rồi để
  //      `keoKhoiPhuVeGanCon()` trượt lại gần nhất có thể.
  const goc = [];
  for (const id of ct.dsNguoi) {
    if (ct.unionSoHuu.has(id) || ct.hapThuBoi.has(id)) continue;
    goc.push({ id, phu: khoiPhuBen(ct, id) });
  }
  for (const g of goc) if (!g.phu) datMot(g.id, 1);

  // ⚠ **THỨ TỰ ĐẶT KHỐI PHỤ THEO CHỖ ĐỨNG CỦA NGƯỜI CON — bước 86b.**
  //
  // Trước b86 thứ tự là thứ tự người trong file dữ liệu. Khối nào tình cờ đứng
  // trước thì chiếm chỗ trước, nên hàng cụ xếp lộn so với hàng ông bà bên dưới:
  // ở ca `cu bị day ra ria.ged`, cha mẹ bà Hương Lan chen vào GIỮA cha mẹ ông
  // Hùng và cha mẹ bà Bích, trong khi bà Hương Lan đứng ngoài cùng bên phải.
  // Nét cha mẹ – con bắt chéo qua nhau.
  //
  // Luật: khối phụ chạy sang PHẢI thì phục vụ người con TRÁI NHẤT trước; chạy
  // sang trái thì ngược lại. Đặt từng cái một rồi hỏi lại, vì người con của
  // khối này có thể nằm trong khối vừa đặt xong (chuỗi tổ tiên nhiều đời).
  const khoa = khoaToTien(ct);
  const khoaKhoi = (g) => {
    let k = null;
    for (const id of g.phu.chaMeIds || []) {
      const kk = khoa.get(id);
      if (kk && (k === null || soKhoa(kk, k) < 0)) k = kk;
    }
    return k;
  };
  const conLai = goc.filter((g) => g.phu);
  conLai.sort((a, b) => {
    if (a.phu.ben !== b.phu.ben) return a.phu.ben - b.phu.ben;
    const d = soKhoa(khoaKhoi(a), khoaKhoi(b));
    if (d !== 0) return a.phu.ben < 0 ? -d : d;
    return a.id < b.id ? -1 : 1;
  });
  for (const g of conLai) {
    ct.khoiPhuCon.set(g.id, g.phu.conId);
    const ben = g.phu.ben;
    const xCon = g.phu.conId === null ? undefined : viTri.get(g.phu.conId);

    if (ben === 0 || xCon === undefined) { datMot(g.id, ben); continue; }

    const k = datCum(ct, g.id);
    if (!k) continue;

    // ⚠ **ĐO TỪ CỬA CỦA KHỐI, KHÔNG ĐO TỪ BAO HÌNH — bước 86.**
    //
    // "Cửa" là đúng hai người mà nét cha mẹ – con mọc ra từ đó. Với khối hai
    // người (cha mẹ nuôi, b20) cửa CHÍNH LÀ bao hình, nên luật cũ đúng. Với
    // một **chuỗi tổ tiên nhiều đời** thì hai thứ ấy khác nhau **136px mỗi
    // đời**: bao hình bắt đầu ở CỤ TỔ trên cùng, còn người phải đứng trên đầu
    // đứa con lại là người CUỐI chuỗi, tức mép của bậc thang ở tận đáy.
    //
    //     BAO HÌNH (tới b85)            CỬA (b86)
    //     ┌─ cụ ─┐  ← mép trái          ┌─ cụ ─┐
    //       ┌─ ông ─┐                     ┌─ ông ─┐
    //         ┌─ cha ─┐                     ┌ cha ─┐   ← mép trái ĐO Ở ĐÂY
    //     con                                con
    //
    // Ca thật `tai-lieu/cu bị day ra ria.ged`: nhánh ngoại của bà Hương Lan
    // dài 5 đời, nên khối bị đặt lệch đúng 4 × 136 = 544px sang phải, rồi nó
    // chiếm mất chỗ của khối cụ bên nội và đẩy khối ấy ra tận rìa sơ đồ.
    //
    // ⚠ Và **chỉ tìm chỗ về ĐÚNG BÊN**. Luật ba khối (§9) nói tổ tiên né sang
    // phía đối diện bạn đời; quét sang cả hai bên thì chỗ trống bên kia gần
    // hơn vài chục pixel là cả nhánh nhảy sang bên sai, nét bắt chéo qua nhánh
    // bên kia. Đo được: quét hai bên làm `cu bị day ra ria` có 4 lần cha mẹ
    // đứng NGƯỢC BÊN với con, quét một bên thì 0.
    const cua = new Set(g.phu.chaMeIds || []);
    let lo = Infinity, hi = -Infinity;
    for (const it of k.items) {
      if (cua.size && !cua.has(it.id)) continue;
      if (it.x < lo) lo = it.x;
      if (it.x > hi) hi = it.x;
    }
    const x = ben > 0 ? xCon - lo : xCon - hi;

    // Đúng chỗ ấy có người rồi thì **dắt sang chỗ trống GẦN NHẤT**, chứ không
    // đẩy ra tận rìa. Hai khối ông bà nội và ngoại của một cặp luôn lệch nhau
    // đúng `hGap` — không có cách nào khác, xem §9b — nên hủy cả phép đặt chỉ vì
    // vướng vài pixel là hỏng to.
    let xDat = null;
    if (Number.isFinite(x)) {
      for (let b = 0; b <= 900 && xDat === null; b += 4) {
        for (const thu of (b === 0 ? [x] : [x + ben * b])) {
          if (!deChoNay(ct, viTri, k, thu)) { xDat = thu; break; }
        }
      }
    }
    if (xDat !== null) {
      ghi(g.id, k, xDat);
      if (xDat < xTrai) xTrai = xDat;
      if (xDat + k.w + LAYOUT.blockGap > xPhai) xPhai = xDat + k.w + LAYOUT.blockGap;
      continue;
    }
    // Chỗ ấy có người rồi → nối vào rìa như cũ.
    const xr = ben < 0 ? xTrai - LAYOUT.blockGap - k.w : xPhai;
    ghi(g.id, k, xr);
    if (ben < 0) xTrai = xr; else xPhai = xr + k.w + LAYOUT.blockGap;
  }

  // Lưới an toàn: dữ liệu lạ có thể để sót ai đó. Thà lệch chỗ còn hơn mất ô.
  for (const id of ct.dsNguoi) if (!ct.daDat.has(id)) datMot(id, 1);

  // Khối đặt bên trái đẩy toạ độ xuống âm — kéo cả sơ đồ về mốc 0 cho gọn.
  if (xTrai < 0) for (const [id, x] of viTri) viTri.set(id, x - xTrai);

  return viTri;
}

/** Đặt khối `k` ở toạ độ `x` thì có ô nào đè lên ô đã đặt không? */
function deChoNay(ct, viTri, k, x) {
  for (const it of k.items) {
    const m = ct.muc.get(it.id);
    const t = it.x + x, p = t + RONG;
    for (const [kh, xk] of viTri) {
      if (ct.muc.get(kh) !== m) continue;
      if (t < xk + RONG + LAYOUT.hGap && xk < p + LAYOUT.hGap) return true;
    }
  }
  return false;
}

/**
 * Căn chùm con vào GIỮA HAI VỢ CHỒNG khi hai người đứng rời nhau (chat 1.7).
 *
 * `datCum()` đặt chùm con ngay dưới dải của người NEO, vì lúc đệ quy nó chưa
 * biết người kia sẽ nằm ở đâu — người kia thuộc một nhánh khác, do một lượt
 * đệ quy khác đặt chỗ. Với cặp kề nhau thì không sao: người kia nằm ngay trong
 * dải. Với cặp RỜI NHAU, chùm con dính hẳn về phía một người và trông như con
 * của riêng người ấy.
 *
 * Chạy SAU `datMoiKhoi()` vì lúc đó mới biết đủ toạ độ cả hai vợ chồng.
 *
 * Dịch cả CỤM con cháu, không dịch riêng mấy ô con: dịch mỗi hàng con thì cháu
 * chắt ở dưới đứng nguyên và nét nối gãy chéo hết.
 *
 * ⚠ Dịch xong phải KIỂM CHỒNG Ô rồi mới nhận. Khoảng trống giữa hai nhánh
 * không phải lúc nào cũng đủ rộng, và bất biến "không ô nào chồng ô nào" đứng
 * trên tính thẩm mỹ: thà chùm con lệch còn hơn hai cái tên đè lên nhau.
 */
function canChumConVaoGiua(ct, viTriX) {
  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u = ct.unionHT.get(uid);
    if (u.partners.length < 2) continue;

    const ids = ct.cumCon.get(uid);
    if (!ids || ids.length === 0) continue;

    // Cặp kề nhau (một người bị hấp thụ vào dải người kia) đã đúng chỗ rồi.
    const ht = ct.hapThuBoi.get(u.partners[0]) || ct.hapThuBoi.get(u.partners[1]);
    if (ht && ht.unionId === uid) continue;

    const xa = viTriX.get(u.partners[0]);
    const xb = viTriX.get(u.partners[1]);
    if (xa === undefined || xb === undefined) continue;
    const giua = (xa + xb) / 2 + RONG / 2;

    let trai = Infinity, phai = -Infinity;
    for (const id of ids) {
      const x = viTriX.get(id);
      if (x === undefined) continue;
      if (x < trai) trai = x;
      if (x + RONG > phai) phai = x + RONG;
    }
    if (!Number.isFinite(trai)) continue;

    const d = giua - (trai + phai) / 2;
    if (Math.abs(d) < 1) continue;

    const cum = new Set(ids);
    if (deLenNhau(ct, viTriX, cum, d)) continue;
    for (const id of ids) viTriX.set(id, viTriX.get(id) + d);
  }
}

/**
 * Kéo KHỐI của một người về SÁT BẠN ĐỜI đứng ở khối khác (bước 21).
 *
 * --- Ca đã sinh ra luật này ----------------------------------------------
 *
 * Ông Dũng (P0012) cưới bà Hương Lan (P0020), hai người khác dòng họ hoàn
 * toàn. Nhánh bà có 6 đời tổ tiên trong sơ đồ, nhánh ông chỉ có 3 — nên hai
 * nhánh là HAI KHỐI GỐC riêng, và `datMoiKhoi()` xếp chúng nối đuôi nhau
 * theo BAO HÌNH CHỮ NHẬT (quyết định 13). Bao hình của khối bên bà trải hết
 * bề ngang sơ đồ, nên hai vợ chồng bị vẽ cách nhau 652px với một nét vợ chồng
 * chạy ngang gần cả màn hình, trong khi các hàng ở giữa còn trống thênh thang.
 *
 * Rút bớt số đời tổ tiên hiển thị KHÔNG chữa được: bố trí có tính lại thật,
 * nhưng nguyên nhân vẫn nguyên — hai khối vẫn xếp nối đuôi theo bao hình.
 *
 * Luật: **hai người là vợ chồng mà đứng ở hai khối khác nhau thì khối bên này
 * phải chạy về sát người bên kia**, chứ không đứng chờ ở cuối hàng.
 *
 * Bốn điều đã cân nhắc:
 *
 * 1. **Đo theo NGƯỜI, không theo mép khối.** Đây là chỗ khác hẳn
 *    `keoKhoiPhuVeGanCon()`: khối phụ ở đó chỉ có hai ông bà nuôi nên mép khối
 *    cũng chính là họ. Khối bên ông Dũng có cả chùm con cháu thò xuống dưới,
 *    lấy mép khối mà đo thì chạy được 104px rồi dừng, hai vợ chồng vẫn xa.
 * 2. **Khối NHỎ chạy tới khối LỚN**, y như bước 20 — bằng nhau thì khối có
 *    neoId lớn hơn chạy, để đúng một bên nhúc nhích.
 * 3. **Trượt tới đâu đè ô thì dừng ở đó** — dùng lại `dichToiDa()`. Chỗ trống
 *    hết thì khối đứng nguyên; sơ đồ xấu vẫn hơn sơ đồ chồng ô.
 * 4. **Chạy TRƯỚC `canChumConVaoGiua()`.** Chùm con nằm trong khối nên nó dịch
 *    theo cả khối; căn giữa trước rồi mới dịch thì công căn giữa mất trắng.
 */
function keoKhoiVeGanBanDoi(ct, viTriX) {
  if (ct.thanhVienKhoi.size < 2) return;

  const khoiCua = new Map();
  for (const [neo, ids] of ct.thanhVienKhoi) for (const id of ids) khoiCua.set(id, neo);

  for (const neo of [...ct.thanhVienKhoi.keys()].sort()) {
    const ids = ct.thanhVienKhoi.get(neo);
    const cum = new Set(ids);

    // Bạn đời gần nhất đang đứng ở một khối khác.
    let dMuon = null;
    for (const id of ids) {
      const x = viTriX.get(id);
      if (x === undefined) continue;

      for (const uid of ct.unionLamVo.get(id) || []) {
        const u = ct.unionHT.get(uid);
        if (!u) continue;
        for (const bd of u.partners) {
          if (bd === id || cum.has(bd)) continue;
          const khoiBd = khoiCua.get(bd);
          if (!khoiBd || khoiBd === neo) continue;

          // Điều 2: chỉ khối nhỏ chạy tới khối lớn; hoà thì neoId lớn hơn chạy.
          const soBd = (ct.thanhVienKhoi.get(khoiBd) || []).length;
          if (soBd < ids.length) continue;
          if (soBd === ids.length && neo < khoiBd) continue;

          const xb = viTriX.get(bd);
          if (xb === undefined) continue;

          // Điều 1: đo theo NGƯỜI. Bên nào đang đứng thì giữ nguyên bên ấy —
          // nhảy qua bên kia là nét vợ chồng đổi hướng, người xem tưởng sơ đồ
          // vừa nhảy chỗ.
          const d = x < xb
            ? (xb - RONG - LAYOUT.hGap) - x
            : (xb + RONG + LAYOUT.hGap) - x;
          if (dMuon === null || Math.abs(d) < Math.abs(dMuon)) dMuon = d;
        }
      }
    }
    if (dMuon === null || Math.abs(dMuon) < 1) continue;

    const gioiHan = dichToiDa(ct, viTriX, cum, dMuon < 0);
    const d = dMuon < 0 ? Math.max(dMuon, gioiHan) : Math.min(dMuon, gioiHan);
    if (!Number.isFinite(d) || Math.abs(d) < 1) continue;

    for (const id of ids) viTriX.set(id, viTriX.get(id) + d);
  }
}

/** Dịch cụm đi `d` thì có ô nào của cụm đè lên ô ngoài cụm không (cùng hàng)? */
/**
 * Kéo KHỐI PHỤ về sát người con của nó (bước 20, vòng thứ hai).
 *
 * --- Ca đã sinh ra luật này ----------------------------------------------
 *
 * Vẫn bộ cha mẹ NUÔI của bà Hương Lan. Vòng trước đã đưa hai người xuống đúng
 * hàng cha mẹ đẻ, nhưng họ vẫn bị vẽ **tít sang phải, sau toàn bộ sơ đồ**, với
 * một nét đứt chạy ngang cả màn hình.
 *
 * Lý do: hai người ấy không có tổ tiên hiển thị nên họ là một **khối gốc riêng**,
 * và `datMoiKhoi()` xếp các khối gốc **nối đuôi nhau từ trái sang phải** theo
 * bao hình chữ nhật (quyết định 13). Bao hình chữ nhật của khối chính trải hết
 * bề ngang sơ đồ, nên khối phụ bị đẩy ra sau tất cả — kể cả khi hàng của nó
 * còn trống thênh thang.
 *
 * Luật: **khối chỉ nối với phần còn lại bằng nét cha mẹ thứ hai thì phải chạy
 * đến sát người con của nó**, chứ không đứng chờ ở cuối hàng.
 *
 * Ba điều đã cân nhắc:
 *
 * 1. **Khối NHỎ chạy tới khối LỚN, không bao giờ ngược lại.** Nếu không thì một
 *    họ ba trăm người sẽ bị kéo đi vì một cặp cha mẹ nuôi hai người.
 * 2. **Trượt tới đâu đè ô thì dừng ở đó**, không đè lên ai bao giờ — dùng lại
 *    đúng phép đo của `canChumConVaoGiua()`. Chỗ trống hết thì khối đứng nguyên,
 *    và sơ đồ xấu vẫn hơn sơ đồ chồng ô.
 * 3. **Chạy SAU `canChumConVaoGiua()`**, để khối chính đã yên chỗ rồi khối phụ
 *    mới len vào phần trống còn lại.
 */
function keoKhoiPhuVeGanCon(ct, viTriX) {
  if (ct.thanhVienKhoi.size < 2) return;

  const khoiCua = new Map();
  for (const [neo, ids] of ct.thanhVienKhoi) for (const id of ids) khoiCua.set(id, neo);

  for (const neo of [...ct.thanhVienKhoi.keys()].sort()) {
    const ids = ct.thanhVienKhoi.get(neo);
    const cum = new Set(ids);

    // Người con gần nhất mà khối này nối tới bằng nét cha mẹ thứ hai.
    let dMuon = null;
    for (const id of ids) {
      for (const uid of ct.unionLamVo.get(id) || []) {
        const u = ct.unionHT.get(uid);
        if (!u) continue;
        for (const c of u.children) {
          if (cum.has(c.personId)) continue;
          const khoiCon = khoiCua.get(c.personId);
          if (!khoiCon || khoiCon === neo) continue;
          // Điều 1: chỉ khối nhỏ chạy tới khối lớn.
          if ((ct.thanhVienKhoi.get(khoiCon) || []).length <= ids.length) continue;

          // ⚠ **CHA MẸ RUỘT CỦA NGƯỜI BỊ HẤP THỤ ĐỨNG LÊN TRÊN CON, KHÔNG
          // CHỈ ĐỨNG KỀ BÊN CẠNH — bước 85d.**
          //
          // `dichVeGan()` chỉ kéo khối tới **sát cạnh** ô con, tức lệch hẳn
          // một ô so với chỗ đáng lẽ phải đứng. Chủ dự án xem ảnh và hỏi
          // đúng chỗ ấy: *"tại sao bố mẹ Lê Thị Bích bị đẩy tít sang bên
          // phải, tôi thấy không có lý do gì đặc biệt"*. Không có thật —
          // chỗ trống ngay trên đầu bà vẫn còn.
          //
          // Ca cha mẹ NUÔI (b20) thì giữ nguyên `dichVeGan()`: người con ấy
          // đã đứng dưới bộ cha mẹ ĐẺ của mình rồi, bộ nuôi mà leo lên trên
          // đầu con thì hai bộ chồng nhau. Chỉ ca HẤP THỤ (b81) mới có chỗ
          // trống đó, vì cha mẹ ruột của người bị hấp thụ không đặt chỗ cho
          // ai cả.
          //
          // Đích: NGƯỜI NEO của khối phụ đứng đúng trên tâm ô người con —
          // cùng một luật với b85b (*"con đứng dưới người neo của dải cha
          // mẹ"*), nên hai chỗ ra cùng một hình.
          const xNeo = viTriX.get(neo);
          const xCon = viTriX.get(c.personId);
          const d = (ct.hapThuBoi.has(c.personId) && xNeo !== undefined && xCon !== undefined)
            ? xCon - xNeo
            : dichVeGan(viTriX, cum, xCon);
          if (d !== null && (dMuon === null || Math.abs(d) < Math.abs(dMuon))) dMuon = d;
        }
      }
    }
    if (dMuon === null || Math.abs(dMuon) < 1) continue;

    const gioiHan = dichToiDa(ct, viTriX, cum, dMuon < 0);
    let d = dMuon < 0 ? Math.max(dMuon, gioiHan) : Math.min(dMuon, gioiHan);

    // ⚠ **CHỖ ĐẾN TRỐNG THÌ NHẢY THẲNG TỚI, KHÔNG BÒ TỪNG BƯỚC — b85f.**
    //
    // `dichToiDa()` trả về *"trượt được bao xa mà không đụng ai TRÊN ĐƯỜNG"*. Đúng
    // cho một cú trượt thật, nhưng ở đây không có cú trượt nào — chỉ có toạ độ
    // cuối. Khối ông bà ngoại của một người đứng GIỮA sơ đồ có chỗ trống ngay
    // cạnh con mình, nhưng muốn tới đó phải đi qua một khối khác — luật cũ chặn
    // ngay từ bước đầu, và khối ấy nằm lại tận đầu kia sơ đồ.
    //
    // Nay hỏi thêm một câu: **đứng ở ĐÍCH thì có đè ai không?** Không đè thì nhảy
    // thẳng tới. Bất biến *"không ô nào chồng ô nào"* vẫn do `deLenNhau()` gác.
    if (Math.abs(d - dMuon) > 0.5 && !deLenNhau(ct, viTriX, cum, dMuon)) d = dMuon;
    if (!Number.isFinite(d) || Math.abs(d) < 1) continue;

    for (const id of ids) viTriX.set(id, viTriX.get(id) + d);
  }
}

/**
 * CẶP VỢ CHỒNG CÓ ĐỦ ÔNG BÀ NỘI NGOẠI THÌ ĐỨNG GIỮA HAI KHỐI ẤY — bước 86b.
 *
 * --- Ca đã sinh ra luật này ----------------------------------------------
 *
 * `tai-lieu/cu bị day ra ria.ged`, xem ở nấc *không giới hạn số đời*. Ông
 * Nguyễn Quang Hùng và bà Lê Thị Bích mỗi người có một nhánh tổ tiên riêng.
 * Hàng cụ bên trên cần BA khối (6 ô ≈ 888px), hàng ông bà bên dưới chỉ có
 * BỐN ô (≈ 660px). Hàng trên rộng hơn hàng dưới 228px — mà hàng dưới lại bị
 * GHIM vào đúng một khối cụ, nên toàn bộ phần dôi ra dồn hết về một phía và
 * khối cụ bên kia bị đẩy ra rìa sơ đồ.
 *
 * --- Luật -----------------------------------------------------------------
 *
 * Chủ dự án phát biểu: **luật BA KHỐI (§9) là luật ĐỆ QUY.** Quanh mỗi cặp vợ
 * chồng, không riêng cặp ở giữa sơ đồ, lại chia làm ba khối con:
 *
 *   khối con 1 · chính cặp ấy và con cháu       — ở giữa, dưới
 *   khối con 2 · toàn bộ tổ tiên người bên TRÁI — né sang trái
 *   khối con 3 · toàn bộ tổ tiên người bên PHẢI — né sang phải
 *
 * Ở ảnh `tai-lieu/anh/cu bi day ra ria.png`: cặp Hùng × Bích là khối con 1,
 * tổ tiên ông Hùng là khối con 2, tổ tiên bà Bích là khối con 3.
 *
 * Và **khối con 1 nằm GIỮA hai khối kia**, chứ không dính vào một khối. Đo lại
 * trên ảnh `tai-lieu/anh-qft/so do 3 khoi.png` để chắc chắn đây là luật của
 * Quick Family Tree chứ không phải mẹo chữa cháy:
 *
 *   · cặp `a × b` — tâm cặp ở 473,5; tâm cả hàng cụ (128 · 380 · 567 · 820)
 *     ở 474. Lệch NỬA PIXEL.
 *   · cặp `10 × 9` — số 9 ở 1074, đúng bằng trung điểm hai điểm treo của hai
 *     khối cha mẹ (473 và 1675).
 *
 * --- Bốn điều đã cân nhắc --------------------------------------------------
 *
 * 1. **Dịch cặp XUỐNG DƯỚI, không dịch hai khối tổ tiên.** Hai khối ấy đã xếp
 *    khít nhau ở hàng của chúng rồi; kéo chúng lại thì phải đẩy mọi khối khác
 *    cùng hàng. Cặp ở dưới thì hàng của nó thưa hơn hẳn — chỗ trống nằm ở đó.
 * 2. **Dịch cả CON CHÁU và cả KHỐI TỔ TIÊN TREO DƯỚI CON CHÁU.** Bà Hương Lan
 *    là con dâu trong cụm; cả nhánh ngoại năm đời của bà treo vào ô của bà.
 *    Dịch cặp mà bỏ quên nhánh ấy thì nét từ ông Cảnh tới con gái dài thêm
 *    đúng bằng khoảng vừa dịch. `ct.khoiPhuCon` có từ `datMoiKhoi()` là để
 *    trả lời đúng câu hỏi này.
 * 3. **Cha mẹ CỦA CHÍNH CẶP thì đứng yên** — chúng là cái mốc để căn giữa.
 * 4. **Chạy từ ĐỜI TRÊN xuống.** Căn cặp Hùng × Bích xong thì hai ô ấy mới
 *    yên chỗ, lúc đó căn cặp Dũng × Hương Lan mới đo đúng.
 *
 * ⚠ Chỉ áp dụng cho cặp **đứng KỀ NHAU** (§9b). Cặp đứng rời nhau thì nét vợ
 * chồng của họ đã là nét dài đi vòng, và `keoKhoiVeGanBanDoi()` mới là chỗ lo
 * — hai phép cùng kéo một cụm thì chúng giằng nhau.
 *
 * ⚠ Dịch xong phải KIỂM CHỒNG Ô rồi mới nhận, y như mọi phép dịch khác trong
 * file này. Bất biến "không ô nào chồng ô nào" đứng trên tính thẩm mỹ.
 */
function canCapVaoGiuaOngBa(ct, viTriX) {
  const khoiTheoCon = new Map();          // personId -> [neoId của khối tổ tiên treo vào]
  for (const [neo, con] of ct.khoiPhuCon) {
    if (!con) continue;
    if (!khoiTheoCon.has(con)) khoiTheoCon.set(con, []);
    khoiTheoCon.get(con).push(neo);
  }

  /** Điểm treo chùm con của một union — tâm khe giữa hai ô cha mẹ. */
  const diemTreo = (uid) => {
    const u = ct.unionHT.get(uid);
    if (!u) return null;
    let lo = Infinity, hi = -Infinity;
    for (const p of u.partners) {
      const x = viTriX.get(p);
      if (x === undefined) continue;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    return Number.isFinite(lo) ? (lo + hi) / 2 + RONG / 2 : null;
  };

  const doiCua = (uid) => {
    let m = Infinity;
    for (const p of ct.unionHT.get(uid).partners) {
      const d = ct.muc.get(p);
      if (d !== undefined && d < m) m = d;
    }
    return Number.isFinite(m) ? m : 0;
  };

  const dsUnion = [...ct.unionHT.keys()]
    .filter((uid) => ct.unionHT.get(uid).partners.length === 2)
    .sort((a, b) => (doiCua(a) - doiCua(b)) || (a < b ? -1 : 1));

  for (const uid of dsUnion) {
    const u = ct.unionHT.get(uid);
    const [A, B] = u.partners;
    const xA = viTriX.get(A), xB = viTriX.get(B);
    if (xA === undefined || xB === undefined) continue;

    // Ghi chú ⚠ ở trên: chỉ ca cặp KỀ NHAU.
    if (Math.abs(xA - xB) > RONG + LAYOUT.spouseGap + 1) continue;

    const pA = ct.unionSoHuu.get(A), pB = ct.unionSoHuu.get(B);
    if (!pA || !pB || pA === pB) continue;
    if (!ct.unionHT.has(pA) || !ct.unionHT.has(pB)) continue;

    // ⚠ **HAI BỘ CHA MẸ PHẢI LÀ HAI NHÀ KHÁC NHAU.** Ca hôn nhân trong họ ở cây
    // Nguyễn Phúc: hai vợ chồng cùng là con của một người (ông Nguyễn Trọng Nhự
    // hai đời vợ), nên "hai khối ông bà" thật ra chỉ là MỘT dải, hai điểm treo
    // cách nhau 68px. Căn cặp vào giữa hai điểm ấy là kéo họ ra khỏi hàng anh
    // em ruột của chính họ — 23 ca sai ngay ở nấc mặc định. Luật ba khối nói về
    // NỘI và NGOẠI, tức hai nhà; cùng một nhà thì luật căn giữa đàn con (§9)
    // vẫn đúng và phải để yên.
    if (ct.unionHT.get(pA).partners.some((x) => ct.unionHT.get(pB).partners.includes(x))) continue;

    const tA = diemTreo(pA), tB = diemTreo(pB);
    if (tA === null || tB === null) continue;

    const dMuon = (tA + tB) / 2 - ((xA + xB) / 2 + RONG / 2);
    if (Math.abs(dMuon) < 1) continue;

    // Điều 2 và 3: cặp + con cháu + mọi khối tổ tiên treo dưới con cháu ấy,
    // TRỪ hai khối tổ tiên của chính cặp này.
    const cum = new Set([A, B]);
    for (const id of ct.cumCon.get(uid) || []) cum.add(id);
    let them = true;
    while (them) {
      them = false;
      for (const [con, dsNeo] of khoiTheoCon) {
        if (con === A || con === B || !cum.has(con)) continue;
        for (const neo of dsNeo) {
          for (const id of ct.thanhVienKhoi.get(neo) || []) {
            if (!cum.has(id)) { cum.add(id); them = true; }
          }
        }
      }
    }

    const gioiHan = dichToiDa(ct, viTriX, cum, dMuon < 0);
    let d = dMuon < 0 ? Math.max(dMuon, gioiHan) : Math.min(dMuon, gioiHan);
    if (Math.abs(d - dMuon) > 0.5 && !deLenNhau(ct, viTriX, cum, dMuon)) d = dMuon;
    if (!Number.isFinite(d) || Math.abs(d) < 1) continue;

    for (const id of cum) viTriX.set(id, viTriX.get(id) + d);
  }
}

/** Khoảng cần dịch để khối đứng kề ngay bên người con, phía nó đang đứng. */
function dichVeGan(viTriX, cum, xCon) {
  if (xCon === undefined) return null;

  let trai = Infinity, phai = -Infinity;
  for (const id of cum) {
    const x = viTriX.get(id);
    if (x === undefined) continue;
    if (x < trai) trai = x;
    if (x + RONG > phai) phai = x + RONG;
  }
  if (!Number.isFinite(trai)) return null;

  // Khối đang ở bên nào của người con thì giữ nguyên bên ấy — nhảy sang bên kia
  // là đường nối đổi hướng, người xem tưởng sơ đồ vừa nhảy chỗ.
  return (trai + phai) / 2 > xCon + RONG / 2
    ? (xCon + RONG + LAYOUT.hGap) - trai
    : (xCon - LAYOUT.hGap) - phai;
}

/**
 * Dịch được xa nhất bao nhiêu mà không ô nào đè ô nào.
 * Trả `±Infinity` khi không có gì chắn đường.
 */
function dichToiDa(ct, viTriX, cum, sangTrai) {
  let gioiHan = sangTrai ? -Infinity : Infinity;

  for (const id of cum) {
    const x = viTriX.get(id);
    const m = ct.muc.get(id);
    if (x === undefined) continue;

    for (const kh of ct.dsNguoi) {
      if (cum.has(kh)) continue;
      if (ct.muc.get(kh) !== m) continue;
      const xk = viTriX.get(kh);
      if (xk === undefined) continue;

      if (sangTrai) {
        if (xk < x) gioiHan = Math.max(gioiHan, (xk + RONG + LAYOUT.hGap) - x);
      } else if (xk > x) {
        gioiHan = Math.min(gioiHan, (xk - RONG - LAYOUT.hGap) - x);
      }
    }
  }
  return gioiHan;
}

function deLenNhau(ct, viTriX, cum, d) {
  for (const id of cum) {
    const x = viTriX.get(id);
    if (x === undefined) continue;
    const m = ct.muc.get(id);
    const t = x + d, p = t + RONG;
    for (const kh of ct.dsNguoi) {
      if (cum.has(kh)) continue;
      if (ct.muc.get(kh) !== m) continue;
      const xk = viTriX.get(kh);
      if (xk === undefined) continue;
      if (t < xk + RONG + LAYOUT.hGap && xk < p + LAYOUT.hGap) return true;
    }
  }
  return false;
}

// ============================================================
// 5 · ĐIỂM TREO CHÙM CON — mỗi union một điểm, không gộp chùm
// ============================================================

/**
 * QUY-TAC-VE §5: `n` union thì `n` chùm con, không gộp. Gộp là mất thông tin
 * mẹ — các ô con giống hệt nhau, không ai đọc được con bà nào.
 *
 * Ba kiểu điểm treo:
 *   'khe'  — cặp đứng kề nhau: tâm khe hở giữa hai ô
 *   'don'  — hôn nhân một người: tâm ô người duy nhất
 *   'cheo' — hai người đứng RỜI NHAU: TRUNG ĐIỂM nét nối, và chùm con thả
 *            xuống từ hàng của người SÂU HƠN
 *
 * ⚠ Tên `'cheo'` có từ chat 1.3, khi hai người đứng rời nhau thì bao giờ cũng
 * lệch hàng nên nét nối bao giờ cũng chéo. Từ chat 1.7 KHÔNG còn đúng: hai
 * nhánh khác dòng họ nay được căn về cùng hàng, nên nét nối của họ là nét
 * NGANG dài đi vòng dưới hai ô, dù kiểu điểm treo vẫn mang tên `'cheo'`.
 * Công thức không đổi (trung điểm vẫn là trung điểm, hàng sâu hơn vẫn là hàng
 * sâu hơn — nay hai hàng bằng nhau), chỉ cái tên là hẹp hơn sự thật.
 */
/**
 * Union này có người phối ngẫu bị ẩn không?
 *
 * ⚠ Đọc từ dữ liệu GỐC chứ không đọc `unionHT` — `unionHT` đã lọc mất đúng
 * những người đang bị ẩn, hỏi nó thì bao giờ cũng nghe "đủ cả".
 */
function thieuBanDoiCua(ct, unionId) {
  const uGoc = ct.index.unionById.get(unionId);
  const ds = (uGoc && Array.isArray(uGoc.partners)) ? uGoc.partners : [];
  return ds.some((pid) => pid && !ct.visibleSet.has(pid));
}

/**
 * NHỮNG UNION SẼ MỌC NỐT CỤT "CẶP ĐỦ, THIẾU CON" — trả `Map<unionId, hướng>`.
 *
 * ⚠ **Vì sao `xepMucThanhNgang()` phải biết trước.** Nốt cụt ấy nối tiếp thanh
 * ngang gom con và chạy thêm ra ngoài ô con ngoài cùng (b83), tức nó KÉO DÀI
 * thanh ngang thêm `RONG/2 + hGap` px về phía ấy. Không đếm phần kéo dài thì
 * phép xếp mức tưởng hai thanh không đè nhau, mà trên hình thì có: bài kiểm
 * `kiem-buoc-80.mjs` nhóm 10 bắt được đúng ca này (P0631, U0072 ∩ U0180 chồng
 * 40px) trong khi phép đo chỉ nhìn đường nối nói 0 cặp.
 *
 * Điều kiện phải KHỚP `viTriNotCut()`, nếu không hai nơi tính hai hình khác
 * nhau — xem nếp 68 của b83.
 */
function unionCoNotNeXuong(ct, stubPoints) {
  const ra = new Map();
  if (!Array.isArray(stubPoints)) return ra;

  for (const sp of stubPoints) {
    if (!sp || sp.direction === 'up') continue;
    const u = ct.unionHT.get(sp.unionId);
    if (!u || thieuBanDoiCua(ct, sp.unionId)) continue;
    if (!u.children.some((c) => ct.nodeById.has(c.personId))) continue;
    const dai = ct.dai.get(sp.personId);
    ra.set(sp.unionId, dai ? dai.huong : 1);
  }
  return ra;
}

/**
 * BỀ NGANG THANH NGANG GOM CON của một union — trả `null` nếu union ấy không
 * vẽ đoạn ngang nào (con duy nhất nằm đúng dưới điểm treo, hoặc chưa con nào
 * hiển thị).
 *
 * ⚠ Bỏ qua con của BỘ CHA MẸ THỨ HAI (`netDai`): đoạn ngang của họ chạy cao
 * hơn `lechNetDai` pixel, tức đã ở một mức khác rồi.
 */
/**
 * ĐOẠN NGANG CỦA NỐT CỤT "cặp đủ, thiếu con" — nó nối tiếp thanh ngang gom con
 * nên phải tính chung với thanh ngang ở mọi phép đo.
 *
 * ⚠ **Một chỗ tính, hai chỗ dùng.** `viTriNotCut()` dùng để VẼ, còn
 * `nhipThanhNgang()` dùng để XẾP MỨC. Trước b85 hai chỗ tự tính riêng, và khi
 * luật đặt nốt đổi thì phép xếp mức vẫn đo theo luật cũ — hai thanh ngang lại
 * đè nhau, đúng cái lỗi bước 84 vừa dẹp xong.
 *
 * @returns {{goc:number, x:number}|null}  `goc` = chỗ rẽ ra khỏi thanh ngang,
 *          `x` = toạ độ ngang của nốt. `null` khi cặp chưa vẽ được con nào.
 */
function nhipNotCut(ct, u, xTreo, huong) {
  let lo = xTreo, hi = xTreo, coCon = false;
  for (const c of u.children) {
    const con = ct.nodeById.get(c.personId);
    if (!con) continue;
    coCon = true;
    const cx = con.x + RONG / 2;
    if (cx < lo) lo = cx;
    if (cx > hi) hi = cx;
  }
  if (!coCon) return null;

  let ra, goc;
  if (xTreo >= hi - 0.5)      { ra =  1; goc = hi; }
  else if (xTreo <= lo + 0.5) { ra = -1; goc = lo; }
  else                        { ra = huong; goc = huong > 0 ? hi : lo; }

  return { goc, x: goc + ra * (RONG / 2 + LAYOUT.hGap) };
}

function nhipThanhNgang(ct, t, neXuong) {
  const u = ct.unionHT.get(t.id);
  if (!u) return null;

  let a = t.x, b = t.x, co = false;
  for (const c of u.children) {
    const con = ct.nodeById.get(c.personId);
    if (!con) continue;
    if (ct.unionSoHuu.get(c.personId) !== t.id) continue;   // netDai → mức khác
    const cx = con.x + RONG / 2;
    if (Math.abs(t.x - cx) <= 0.5) continue;                // nét thả thẳng
    a = Math.min(a, cx);
    b = Math.max(b, cx);
    co = true;
  }

  // Nốt cụt "cặp đủ, thiếu con" kéo thanh ngang chạy thêm ra ngoài — xem
  // `unionCoNotNeXuong()`. Đo bằng ĐÚNG hàm mà `viTriNotCut()` dùng để vẽ.
  if (neXuong && neXuong.has(t.id)) {
    const nhip = nhipNotCut(ct, u, t.x, neXuong.get(t.id));
    if (nhip) {
      a = Math.min(a, nhip.goc, nhip.x);
      b = Math.max(b, nhip.goc, nhip.x);
      co = true;
    }
  }

  return co ? { a, b } : null;
}

/**
 * XẾP MỨC CHO THANH NGANG GOM CON — bước 84, chỉ đụng union nào THẬT SỰ đè
 * nhau. Sửa `busY` tại chỗ.
 *
 * ⚠ **Lỗi được sửa.** Hai union của cùng một người có hai chùm con xếp cạnh
 * nhau, nhưng cái DẢI (ông cùng các bà) lại được căn vào GIỮA cả hai chùm —
 * nên hai điểm treo nằm sát nhau ở giữa, còn hai chùm con toả ra hai bên. Hai
 * thanh ngang vì thế **bắc chéo qua nhau**, và vì cùng một mức nên chúng chồng
 * lên nhau thành MỘT nét liền: đo được **770 cặp** trên cây Nguyễn Phúc 681
 * người, chỗ trùm dài nhất **608px** (NK-B83 mục 2.3). Người xem đọc ra một
 * chùm con chung, tức mất đúng thông tin mẹ mà QUY-TAC-VE §5 sinh ra để giữ.
 *
 * ⚠ **Xếp theo BỀ NGANG THẬT, không theo "người này có mấy vợ".** Bản đầu của
 * bước 84 phát mức theo thứ tự các bà trong dải, và nó **sót một ca**: bà
 * P0313 vừa là vợ trong dải của ông P0311 (U0072) vừa có cuộc hôn nhân riêng
 * U0180 nằm NGOÀI dải ấy — hai union không chung một dải nên không ai phát mức
 * cho chúng, mà thanh ngang thì vẫn trùm nhau 228px. Hỏi thẳng *"hai đoạn này
 * có đè nhau không"* thì mọi ca đều lọt, kể cả ca chưa ai nghĩ ra.
 *
 * ⚠ **Union không đè ai thì KHÔNG bị hạ.** Người một vợ — 99% số ca — giữ
 * nguyên từng pixel như trước bước 84. Hạ cả những union đang đứng yên chỗ tốt
 * là bắt cả sơ đồ trả giá cho một ca hiếm.
 *
 * Cách xếp là tô màu đồ thị khoảng: sắp theo mép trái rồi lấy mức thấp nhất
 * còn trống. Với đồ thị khoảng, cách tham lam này cho SỐ MỨC ÍT NHẤT có thể.
 *
 * ⚠ Bước tự CO khi một hàng cần từ ba mức — xem ghi chú `buocThanhNgang` ở
 * `config.js`. Đó là van an toàn, không phải thiết kế: ba đường cách nhau 4px
 * là *"bóng đôi"* chủ dự án đã bác ở b80. Ca ấy chưa từng xảy ra trên dữ liệu
 * thật.
 */
function xepMucThanhNgang(ct, unions, neXuong) {
  // Trần: mép TRÊN của nốt cụt hướng lên mọc từ hàng dưới, trừ 2px hở.
  const tran = LAYOUT.vGap - LAYOUT.stubLength - LAYOUT.stubRadius - 2;

  const theoHang = new Map();              // busY gốc -> các thanh ngang cùng mức
  for (const t of unions) {
    const nhip = nhipThanhNgang(ct, t, neXuong);
    if (!nhip) continue;
    const khoa = Math.round(t.busY);
    if (!theoHang.has(khoa)) theoHang.set(khoa, []);
    theoHang.get(khoa).push({ t, a: nhip.a, b: nhip.b, muc: 0 });
  }

  for (const [, ds] of theoHang) {
    ds.sort((p, q) => (p.a - q.a) || (p.t.id < q.t.id ? -1 : 1));

    const daXep = [];                      // mức -> các thanh đã nhận mức ấy
    let caoNhat = 0;
    for (const it of ds) {
      let m = 0;
      while (daXep[m] && daXep[m].some(
        (k) => Math.min(it.b, k.b) - Math.max(it.a, k.a) > 0.5)) m += 1;
      if (!daXep[m]) daXep[m] = [];
      daXep[m].push(it);
      it.muc = m;
      if (m > caoNhat) caoNhat = m;
    }
    if (caoNhat === 0) continue;

    const buoc = Math.min(LAYOUT.buocThanhNgang,
                          (tran - LAYOUT.khoangSatChu) / caoNhat);
    for (const it of ds) it.t.busY += it.muc * buoc;
  }
}

function dungDiemTreo(ct, stubPoints) {
  const neoTheoUnion = new Map();          // unionId -> neoId, dựng một lần
  for (const [, ht] of ct.hapThuBoi) neoTheoUnion.set(ht.unionId, ht.neoId);

  const ra = [];
  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u = ct.unionHT.get(uid);
    let neoId = neoTheoUnion.get(uid) || null;

    let x, y, busY, kieu;
    if (neoId && ct.dai.has(neoId)) {
      const dai = ct.dai.get(neoId);
      const nut = ct.nodeById.get(neoId);
      x    = nut.x - dai.dxP + dai.khe.get(uid);
      y    = nut.y + MUC_NET - (dai.mucNet.get(uid) || 0) * dai.buocNet;
      busY = nut.y + CAO + LAYOUT.khoangSatChu;
      kieu = dai.n > 0 ? 'khe' : 'don';
    } else if (u.partners.length === 1) {
      const nut = ct.nodeById.get(u.partners[0]);
      x    = nut.x + RONG / 2;
      y    = nut.y + MUC_NET;
      busY = nut.y + CAO + LAYOUT.khoangSatChu;
      kieu = 'don';
      neoId = u.partners[0];
    } else {
      const a = ct.nodeById.get(u.partners[0]);
      const b = ct.nodeById.get(u.partners[1]);
      x    = (a.x + b.x) / 2 + RONG / 2;
      // Hai người RỜI NHAU mà CÙNG HÀNG thì nét vợ chồng không đi tâm → tâm,
      // nó VÕNG xuống dưới hai ô (xem themNetVoChong). Điểm treo chùm con phải
      // nằm đúng trên cái võng ấy, chứ không phải ở tâm hàng: tại trung điểm
      // giữa hai ô không có ô nào che, nên đoạn kẻ từ tâm hàng xuống sẽ thò
      // hẳn ra ngoài và treo lơ lửng phía trên nét vợ chồng.
      y    = a.y === b.y ? mucVong(a, b) : (a.y + b.y) / 2 + MUC_NET;
      busY = Math.max(a.y, b.y) + CAO + LAYOUT.khoangSatChu;
      kieu = 'cheo';
      neoId = u.partners[0];
    }

    ra.push({ id: uid, x, y, busY, kieu, neoId, partnerIds: u.partners.slice() });
  }

  // Mọi `busY` mới xong ở MỨC GỐC; giờ mới hạ những thanh đang đè nhau.
  xepMucThanhNgang(ct, ra, unionCoNotNeXuong(ct, stubPoints));
  return ra;
}

// ============================================================
// 6 · ĐƯỜNG NỐI
// ============================================================

function dungDuongNoi(ct, unions) {
  const links = [];
  const treoCua = new Map(unions.map((t) => [t.id, t]));

  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u   = ct.unionHT.get(uid);
    const treo = treoCua.get(uid);

    // --- Nét vợ chồng ------------------------------------------------------
    for (let i = 1; i < u.partners.length; i++) {
      themNetVoChong(ct, links, uid, u.partners[0], u.partners[i]);
    }

    // --- Nét cha mẹ – con --------------------------------------------------
    for (const c of u.children) {
      const con = ct.nodeById.get(c.personId);
      if (!con) continue;

      // Bộ cha mẹ THỨ HAI (con nuôi còn cha mẹ đẻ) phải né đường của bộ đặt
      // chỗ, nếu không hai nét chồng khít lên nhau ở đoạn cuối và người xem chỉ
      // thấy MỘT đường. Né hai chiều, đúng như chủ dự án chỉ ra khi xem ảnh:
      //   - đoạn DỌC lệch sang bên, về phía bộ cha mẹ ấy đang đứng;
      //   - đoạn NGANG chạy cao hơn, ở một phần tư khe thay vì giữa khe.
      // Vào ô ở 1/4 hay 3/4 bề ngang chứ không vào chính giữa: chỗ ấy vẫn nằm
      // trên nóc ô nên nét không hụt ra ngoài, mà mắt nhìn ra ngay là hai
      // đường khác nhau.
      const netDai = ct.unionSoHuu.get(c.personId) !== uid;
      const cxGiua = con.x + RONG / 2;
      const cx   = netDai ? (treo.x > cxGiua ? con.x + RONG * 0.75 : con.x + RONG * 0.25)
                          : cxGiua;
      const busY = netDai
        ? Math.min(treo.busY - LAYOUT.lechNetDai, con.y - 1)
        : Math.min(treo.busY, con.y - 1);

      const points = [[treo.x, treo.y]];
      if (Math.abs(treo.x - cx) > 0.5) { points.push([treo.x, busY]); points.push([cx, busY]); }
      points.push([cx, con.y + chamVongAnh(cx - cxGiua)]);

      links.push({
        kind: 'child',
        relation: c.relation,
        unionId: uid,
        from: uid,
        to: c.personId,
        points,
        netDai,                                          // bộ cha mẹ thứ hai
        cheo: false,
      });
    }
  }

  return links;
}

/**
 * NÉT ĐI TỪ TRÊN XUỐNG CHẠM VÀO ĐÂU — thêm ở bước 80, việc A.
 *
 * Trả về khoảng cách từ NÓC Ô xuống chỗ nét chạm vào VÒNG ẢNH, khi nét vào ô
 * lệch tâm `dx` pixel.
 *
 * ⚠ **Đây là lỗi việc A, và nó không tự khỏi khi vòng ảnh to lên.** §10b bảo
 * nét của bộ cha mẹ thứ hai vào ô ở 1/4 hay 3/4 bề ngang, kèm lý do: *"chỗ ấy
 * vẫn nằm trên nóc ô nên nét không hụt ra ngoài"*. Câu ấy đúng cho tới bước 28
 * — rồi bước 28 **bỏ viền ô**, và từ đó "nóc ô" chỉ còn là một toạ độ, không
 * còn là một đường kẻ ai nhìn thấy. Thứ mắt thấy ở đầu ô nay là VÒNG ẢNH, mà
 * vòng ảnh là hình TRÒN: ở chỗ lệch tâm 30px nó thấp hơn nóc ô hẳn 18px.
 *
 *     lệch  0px  →  chạm ngay nóc ô          (nét treo con thường, không đổi)
 *     lệch 30px, R = 34  →  34 − √(34²−30²) = 34 − 16 = 18px dưới nóc ô
 *     lệch 30px, R = 26  →  30 > 26, không có vòng ảnh nào ở đó cả
 *
 * Dòng cuối là bản trước bước 80: nét kết thúc giữa khoảng không, cách vòng
 * ảnh một quãng — đúng chỗ hở chủ dự án chỉ ra ở ca Nguyễn Thị Hương Lan
 * (`P0020`, union cha mẹ nuôi `U0025`). Vòng ảnh to lên **thu hẹp** chỗ hở từ
 * "hụt hẳn" xuống 18px, nên nhìn qua tưởng đã khỏi — đo mới thấy còn.
 *
 * Lệch quá bán kính thì kẹp về mép vòng: thà chạm ngang hông vòng ảnh còn hơn
 * treo lơ lửng. Nay không xảy ra (30 < 34) nhưng hạ `banKinhTrenO` là xảy ra
 * ngay, và lúc ấy không có gì báo.
 */
function chamVongAnh(dx) {
  const R = PHOTO.banKinhTrenO;
  const d = Math.min(Math.abs(dx), R);
  return PHOTO.leTrenO + R - Math.sqrt(R * R - d * d);
}

/**
 * Hai ca khác hẳn nhau:
 *
 * KỀ NHAU — bạn đời được hấp thụ vào dải: nét ngang ở đúng mức nấc của union
 * đó, chạy từ mép ô này sang mép ô kia. Với bà thứ hai trở đi nét CHUI SAU ô
 * bà trước; luật vẽ hai lượt (QUY-TAC-VE §7 — hết đường nối rồi mới đến ô,
 * nền ô đặc) lo phần che.
 *
 * RỜI NHAU — hai nhánh trong họ cưới nhau, mỗi người đứng dưới cha mẹ mình:
 *   - khác đời  → nét CHÉO tâm → tâm, tự chạy ra ngoài dải khung
 *   - cùng đời  → nét tâm → tâm sẽ trông y hệt nét nấc của người nhiều vợ,
 *                 nên cho VÕNG xuống dưới dải khung rồi vòng lên. Luật đọc
 *                 bằng mắt: nét trong dải = cặp kề nhau, nét ngoài dải = kết
 *                 hôn trong họ.
 *
 * Nét chéo có thể rất dài và KHÔNG rút ngắn được: thứ tự anh em đã bị `order`
 * khoá, thứ tự các nhánh đã bị `ranks` khoá. Chấp nhận nét dài.
 */
function themNetVoChong(ct, links, uid, aId, bId) {
  const a = ct.nodeById.get(aId);
  const b = ct.nodeById.get(bId);
  if (!a || !b) return;

  const htA = ct.hapThuBoi.get(aId);
  const htB = ct.hapThuBoi.get(bId);
  const keNhau = (htA && htA.unionId === uid) || (htB && htB.unionId === uid);

  if (keNhau) {
    const neoId = htA && htA.unionId === uid ? htA.neoId : htB.neoId;
    const dai   = ct.dai.get(neoId);
    const neo   = ct.nodeById.get(neoId);
    const kia   = neoId === aId ? b : a;
    const y     = neo.y + MUC_NET - (dai.mucNet.get(uid) || 0) * dai.buocNet;
    // Nét chạy từ MÉP VÒNG ẢNH sang mép vòng ảnh, không từ mép ô sang mép ô.
    //
    // ⚠ Trước bước 28 hai thứ ấy là một, vì mép ô có viền và đó là chỗ mắt
    // nhìn thấy ô kết thúc. Bỏ viền rồi thì mép ô nằm cách khuôn mặt 40px về
    // mỗi bên, và nét vợ chồng thành một đoạn 16px trôi lơ lửng ở khoảng giữa,
    // không chạm vào ai. Ảnh chụp phóng to bắt được; ở cỡ thật thì nó chỉ
    // trông như sơ đồ hơi rời rạc.
    const x1    = dai.huong > 0 ? neo.x + RONG - LE_ANH : neo.x + LE_ANH;
    const x2    = dai.huong > 0 ? kia.x + LE_ANH        : kia.x + RONG - LE_ANH;
    links.push({ kind: 'spouse', relation: null, unionId: uid, from: neoId, to: kia.id,
                 points: [[x1, y], [x2, y]], netDai: false, cheo: false });
    return;
  }

  const ax = a.x + RONG / 2, ay = a.y + MUC_NET;
  const bx = b.x + RONG / 2, by = b.y + MUC_NET;

  if (a.gen !== b.gen) {
    links.push({ kind: 'spouse', relation: null, unionId: uid, from: aId, to: bId,
                 points: [[ax, ay], [bx, by]], netDai: true, cheo: true });
    return;
  }

  const vong = mucVong(a, b);
  links.push({ kind: 'spouse', relation: null, unionId: uid, from: aId, to: bId,
               points: [[ax, ay], [ax, vong], [bx, vong], [bx, by]], netDai: true, cheo: false });
}

/**
 * Mức nét vợ chồng VÕNG xuống, khi hai người cùng hàng mà đứng rời nhau.
 *
 * Một công thức, HAI nơi dùng: `themNetVoChong()` vẽ nét, `dungDiemTreo()` đặt
 * điểm treo chùm con lên đúng nét đó. Tách ra làm hằng số dùng chung vì hai
 * chỗ ấy lệch nhau đúng một lần là sinh ra đoạn kẻ treo lơ lửng giữa sơ đồ —
 * lỗi thật của chat 1.7, chủ dự án nhìn ảnh mới thấy.
 *
 * ⚠ **BA con số trong hai ngày, và cả ba đều do chủ dự án nhìn app thật.**
 *
 *     tới b80   `CAO + vGap × 0,3` = CAO + 10,2, còn thanh ngang ở CAO + 17
 *               → HAI đường kẻ song song cách nhau 7px, chủ dự án gọi là
 *                 bóng đôi (ảnh `loi ke ngang trong dung - huong lan…jpg`)
 *     b80       gộp làm một: `CAO + khoangSatChu`
 *               → **hỏng kiểu khác**: nét vợ chồng biến mất vào đúng thanh
 *                 ngang gom con, cặp đọc ra thành hai nét dọc rời rạc.
 *                 *"thiếu nét kẻ từ Trọng Dũng sang Hương Lan"*
 *     b81       mức RIÊNG `CAO + khoangNetVong` = CAO + 5
 *               → nằm lọt giữa hàng chữ (CAO − 1,6) và thanh ngang (CAO + 12)
 *
 * ⚠ Bài học đứng sau ba con số ấy: **gộp hai đường kẻ vì chúng "gần nhau quá"
 * là chữa triệu chứng.** Hai đường ấy mang hai nghĩa khác nhau — một là *"hai
 * người này là vợ chồng"*, một là *"đây là các con của họ"* — nên chúng phải ở
 * hai mức, chỉ là mức phải chọn cho đúng. Cái sai ban đầu không phải khoảng
 * cách, mà là **cả hai đều quá xa hàng chữ** vì `nodeHeight` thừa chỗ.
 *
 * ⚠ Từ b81, nét này chỉ còn dùng cho cặp mà **một người đã bị hấp thụ vào dải
 * ở nơi khác** — điển hình là người có hai đời chồng/vợ. Ca *"cả hai đều có
 * cha mẹ hiển thị"* nay không rơi vào đây nữa: Luật B kéo một người về đứng
 * cạnh bạn đời. Xem `dungNguCanh()`.
 */
function mucVong(a, b) {
  return Math.max(a.y, b.y) + CAO + LAYOUT.khoangNetVong;
}

// ============================================================
// 7 · NỐT CỤT
// ============================================================

/**
 * `findStubPoints()` nói CÁI GÌ bị ẩn; chỗ này nói NÓ NẰM Ở ĐÂU.
 *
 *   'up'   — còn một bộ cha mẹ chưa vẽ  → mọc thẳng lên từ nóc ô
 *   'side' — union bị cắt bớt, hai ca khác nhau:
 *              thiếu hẳn người phối ngẫu → mọc NGANG ra khỏi mép ngoài dải,
 *                ở đúng mức nấc của union đó, nên hai đời vợ bị cắt thì hai
 *                nốt không đè lên nhau (đây là lý do nốt cụt neo vào unionId)
 *              cặp đủ nhưng thiếu con    → mọc XUỐNG, tránh sang bên cạnh
 *                chùm con đang vẽ để khỏi đè lên nét treo con
 *
 * QUY-TAC-VE §8: nhiều nốt cụt rơi đúng một điểm thì GỘP thành một nốt kèm số
 * đếm. Ca thật: người có hai bộ cha mẹ mà cả hai bộ đều còn thiếu người —
 * hai nốt 'up' cùng nằm trên nóc một ô. `nguon` giữ đủ từng mục để render
 * dựng danh sách chọn người trung tâm mới khi bấm vào nốt.
 */
function dungNotCut(ct, unions, stubPoints) {
  if (!Array.isArray(stubPoints) || stubPoints.length === 0) return [];
  const treoCua = new Map(unions.map((t) => [t.id, t]));
  const gop = new Map();

  for (const sp of stubPoints) {
    const nut = ct.nodeById.get(sp && sp.personId);
    if (!nut) continue;
    const diem = viTriNotCut(ct, treoCua, sp, nut);
    if (!diem) continue;

    const khoa = Math.round(diem.x) + '|' + Math.round(diem.y);
    if (gop.has(khoa)) {
      const cu = gop.get(khoa);
      cu.hiddenCount += sp.hiddenCount || 0;
      cu.nguon.push({ personId: sp.personId, unionId: sp.unionId,
                      direction: sp.direction, hiddenCount: sp.hiddenCount });
      continue;
    }
    gop.set(khoa, {
      personId: sp.personId,
      unionId:  sp.unionId,
      direction: sp.direction,
      hiddenCount: sp.hiddenCount || 0,
      x: diem.x, y: diem.y, x1: diem.x1, y1: diem.y1, angle: diem.angle,
      duong: diem.duong || null,      // đường gấp khúc, chỉ có ở nốt đã né
      nguon: [{ personId: sp.personId, unionId: sp.unionId,
                direction: sp.direction, hiddenCount: sp.hiddenCount }],
    });
  }

  return [...gop.values()];
}

function viTriNotCut(ct, treoCua, sp, nut) {
  const L = LAYOUT.stubLength;

  if (sp.direction === 'up') {
    const x = nut.x + RONG / 2;
    return { x, y: nut.y - L, x1: x, y1: nut.y, angle: -90 };
  }

  const u    = ct.unionHT.get(sp.unionId);
  const treo = treoCua.get(sp.unionId);
  const dai  = ct.dai.get(sp.personId);

  const thieuBanDoi = thieuBanDoiCua(ct, sp.unionId);

  if (thieuBanDoi || !u) {
    // HAI thứ phải đúng cùng lúc, thiếu một là nốt tròn nằm đè lên ô người
    // bên cạnh (16/08/2026, chat 1.4 — đo được 14/120 nốt hỏng, đúng bằng
    // TOÀN BỘ số nốt nằm ngang; sáu bất biến của chat 1.3 chỉ xét ô với ô nên
    // không bắt được, lỗi chỉ lộ ra khi xem ảnh chụp):
    //
    // 1. ĐỘ DÀI RIÊNG. Chiều dọc có vGap = 90px để mọc ra, chiều ngang chỉ có
    //    hGap = 28px giữa hai khối anh em. Dùng chung stubLength = 34 thì nốt
    //    rơi hẳn sang khối bên cạnh.
    // 2. MỌC RA TỪ MÉP NGOÀI CỦA CẢ DẢI, không phải mép ô người đó. Người bị
    //    HẤP THỤ vào dải của bạn đời thì ngay cạnh họ là ô bạn đời, chỉ cách
    //    spouseGap = 16px — hẹp hơn cả hGap.
    const LN = LAYOUT.stubLengthNgang;

    const ht     = ct.hapThuBoi.get(sp.personId);
    const neoId  = ct.dai.has(sp.personId) ? sp.personId : (ht ? ht.neoId : null);
    const daiNg  = neoId ? ct.dai.get(neoId) : null;
    const nutNeo = neoId ? ct.nodeById.get(neoId) : null;

    const huong = daiNg ? daiNg.huong : (gioiTinh(ct, sp.personId) === 'F' ? -1 : 1);
    const mepDai = (daiNg && nutNeo)
      ? (huong > 0 ? nutNeo.x - daiNg.dxP + daiNg.rong : nutNeo.x - daiNg.dxP)
      : (huong > 0 ? nut.x + RONG : nut.x);
    const y = dai
      ? nut.y + MUC_NET - (dai.mucNet.get(sp.unionId) || 0) * dai.buocNet
      : nut.y + MUC_NET;
    return { x: mepDai + huong * LN, y, x1: mepDai, y1: y, angle: huong > 0 ? 0 : 180 };
  }

  // Cặp đủ, thiếu con.
  //
  // ⚠ **NỐT CỤT LÀ MỘT CHỖ CON NỮA NỐI TIẾP THANH NGANG: CHẠY NGANG RA KHỎI
  // ĐẦU NGOÀI CỦA THANH NGANG, RỒI MỚI THẢ DỌC XUỐNG NỐT.**
  //
  // Chốt ở bước 85, theo đúng hình chủ dự án vẽ lại bằng Photoshop:
  // `tai-lieu/anh/net cut - con.jpg` — bản phần mềm vẽ nằm bên TRÁI, bản chủ
  // dự án vẽ lại nằm bên PHẢI (đoạn tô đỏ chính là nét cụt phải vẽ thế nào).
  //
  // Luật cũ đặt nốt **cạnh ô con NGOÀI CÙNG theo chiều dải**, cách một chỗ
  // `RONG/2 + hGap`. Nó đúng khi điểm treo và ô con nằm gần nhau, và sai hẳn
  // khi **điểm treo ở xa hẳn một bên chùm con**: lúc ấy thanh ngang gom con
  // trải dài từ ô con tới tận điểm treo, mà chỗ né lại rơi vào **KHOẢNG GIỮA**
  // đoạn ấy:
  //
  //     SAI (tới b84)                     ĐÚNG (b85)
  //
  //     Trác ⎯⎯ Thịnh                     Trác ⎯⎯ Thịnh
  //        ┌───────┘                         ┌──────┼──────┐
  //        │   ╵ ●3                          │      (khuỷu) ╵ ●3
  //      Bích                              Bích
  //
  // Nốt mọc ra từ **giữa một nét liền** thì mắt đọc thành *"chỗ này rẽ đi đâu
  // đó"*, chứ không đọc ra *"cặp còn 3 người con chưa vẽ"*.
  //
  // Luật mới, một câu: **đoạn ngang của nốt cụt nối tiếp thanh ngang từ ĐẦU
  // NGOÀI của nó, đi tiếp một chỗ con nữa (`RONG/2 + hGap`), rồi thả dọc.**
  // Thanh ngang tính cả điểm treo, nên đầu ngoài thường CHÍNH LÀ điểm treo —
  // khi ấy hình ra đúng như bản vẽ tay: nét ngang chạy quá điểm treo một đoạn
  // rồi mới có nét dọc cụt.
  const huong = dai ? dai.huong : 1;
  const xTreo = treo ? treo.x : nut.x + RONG / 2;
  const y1    = treo ? treo.y : nut.y + MUC_NET;
  const busY  = treo ? treo.busY : nut.y + MUC_NET;

  // ⚠ **NỐT PHẢI NẰM GỌN TRONG KHE GIỮA HAI ĐỜI.** Công thức cũ là
  // `CAO + vGap/2 + L` và nó đúng suốt từ chat 1.4 — nhưng chỉ đúng khi
  // `vGap/2 + L <= vGap`, tức khi `L <= vGap/2`. Với bộ số cũ (vGap 90,
  // L 34) thì thoả, nên không ai thấy gì.
  //
  // Bước 28b hạ vGap xuống 48 mà giữ L = 34: 24 + 34 = 58 > 48, và nốt thò
  // **10px vào hàng dưới**. Đo được 6/538 nốt đè lên ô người khác — chỉ 6, nên
  // nhìn ảnh chụp một sơ đồ thường không gặp; `kiem-thu/do-not-de-o.mjs` quét
  // cả hai file dữ liệu × bốn nấc `ancestors` mới lôi ra được.
  //
  // Nay chặn thẳng bằng trần: mép DƯỚI của nốt tròn phải còn cách nóc ô hàng
  // dưới ít nhất 2px. Chặn ở đây chứ không chặn bằng cách bắt người chỉnh
  // config phải nhớ một bất đẳng thức — cái phải nhớ thì sớm muộn cũng quên.
  //
  // ⚠ **Bước 84: nốt này nằm SÁT SÀN khe, không còn treo `stubLength` dưới
  // thanh ngang.** Hai công thức ấy cho cùng một kết quả suốt từ b28 tới b83
  // vì trần luôn thắng (`khoangSatChu 12 + L 14 = 26 = vGap 34 − r 6 − 2`),
  // nên không ai phải chọn. `vGap` nới lên 42 thì chúng tách ra, và bài kiểm
  // nhóm 8 chỉ ngay chỗ sai: giữ công thức cũ thì nốt đứng ở CAO + 26, mà
  // thanh ngang MỨC 1 của một union khác chạy qua đúng CAO + 20 — nốt lại bị
  // xâu vào dây, đúng lỗi b82 vừa sửa xong.
  //
  // Chọn sàn vì nghĩa của nốt: nó **thay cho một người con chưa vẽ**, mà con
  // thì ở hàng dưới. Bám sàn thì mọi thứ trong khe giữ nguyên khoảng cách tới
  // hàng dưới dù `vGap` có nới bao nhiêu, và nốt tự tránh được mọi mức thanh
  // ngang — mức sâu nhất còn cách mép trên nốt 8px.
  const tranY = nut.y + CAO + LAYOUT.vGap - LAYOUT.stubRadius - 2;
  const yDay  = tranY;

  // Mọi phép đo đoạn ngang của nốt cụt đều đi qua `nhipNotCut()` — xem ghi chú
  // ở hàm đó: trước b85 chỗ Vẽ và chỗ XẾP MỨC tự tính riêng, và chúng đã lệch nhau.
  const nhip = nhipNotCut(ct, u, xTreo, huong);

  // Ca chưa vẽ được người con nào: không có thanh ngang, nên đoạn kẻ đi thẳng
  // từ ĐIỂM TREO giữa hai vòng ảnh xuống nốt — lúc này chính nó thay cho cả
  // chùm con.
  if (!nhip) return { x: xTreo, y: yDay, x1: xTreo, y1, angle: 90 };

  return {
    x: nhip.x, y: yDay, x1: nhip.goc, y1: busY, angle: 90,
    duong: [[nhip.goc, busY], [nhip.x, busY], [nhip.x, yDay]],
  };
}

// ============================================================
// 8 · KHUNG BAO
// ============================================================

function tinhBounds(nodes, links, stubs) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const nhet = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const n of nodes) { nhet(n.x, n.y); nhet(n.x + n.w, n.y + n.h); }
  for (const l of links) for (const p of l.points) nhet(p[0], p[1]);
  for (const s of stubs) {
    nhet(s.x - LAYOUT.stubRadius, s.y - LAYOUT.stubRadius);
    nhet(s.x + LAYOUT.stubRadius, s.y + LAYOUT.stubRadius);
  }

  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX: minX - DEM, minY: minY - DEM, maxX: maxX + DEM, maxY: maxY + DEM };
}
