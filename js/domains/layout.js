// ============================================================
// giapha · js/domains/layout.js
// Vai trò  : Tính TOẠ ĐỘ các ô người, đường nối và nốt cụt. Không vẽ gì cả.
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: config (LAYOUT, PHOTO)
// Phiên bản: 1.8.0 · Cập nhật: 20/08/2026 17:20
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
 * Khoảng từ MÉP Ô tới MÉP VÒNG ẢNH theo chiều ngang — 40px với ô rộng 120 và
 * vòng ảnh bán kính 20. Vòng ảnh nằm giữa ô nên hai bên bằng nhau.
 *
 * Dùng để nét vợ chồng chạm được vào khuôn mặt, xem `themNetVoChong()`.
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

  ganMucDoi(ct);
  const viTriX = datMoiKhoi(ct);
  keoKhoiVeGanBanDoi(ct, viTriX);
  canChumConVaoGiua(ct, viTriX);
  keoKhoiPhuVeGanCon(ct, viTriX);

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

  const unions = dungDiemTreo(ct);
  const links  = dungDuongNoi(ct, unions);
  const stubs  = dungNotCut(ct, unions, stubPoints);

  return { nodes, unions, links, stubs, bounds: tinhBounds(nodes, links, stubs) };
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
    unionLamVo:    new Map(),    // personId -> [unionId] làm vợ/chồng, sắp theo rank
    unionLamCon:   new Map(),    // personId -> [unionId] làm con, chỉ union hiển thị
    unionSoHuu:    new Map(),    // personId -> unionId ĐẶT CHỖ cho người này
    hapThuBoi:     new Map(),    // personId -> { unionId, neoId }
    dai:           new Map(),    // neoId -> mô tả dải (xem layDai)
    muc:           new Map(),
    toTien:        new Map(),    // personId -> Set tổ tiên hiển thị (đệm, xem toTienDong)
    cumCon:        new Map(),    // unionId -> [personId] cả cụm con cháu đặt dưới union đó
    thanhVienKhoi: new Map(),    // neoId của khối gốc -> [personId] mọi người trong khối
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
    ct.unionHT.set(uid, { id: uid, rank: soRank(u), partners, children });
  }

  // --- Bảng tra ngược ------------------------------------------------------
  for (const id of ct.dsNguoi) { ct.unionLamVo.set(id, []); ct.unionLamCon.set(id, []); }
  for (const [uid, u] of ct.unionHT) {
    for (const pid of u.partners) ct.unionLamVo.get(pid).push(uid);
    for (const c of u.children)   ct.unionLamCon.get(c.personId).push(uid);
  }
  for (const [, ds] of ct.unionLamVo) {
    ds.sort((a, b) => (ct.unionHT.get(a).rank - ct.unionHT.get(b).rank) || (a < b ? -1 : 1));
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

  return ct;
}

function soRank(u) {
  const n = Number(u && u.rank);
  return Number.isFinite(n) ? n : 9999;
}

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

// ============================================================
// 3 · DẢI — một người cùng mọi bạn đời được hấp thụ, trên MỘT hàng
// ============================================================

/**
 * QUY-TAC-VE §3: khung tên luôn cùng một hàng đời, không xếp dọc. Các ô bạn
 * đời xếp RA XA DẦN ô người neo theo `rank` — nam thì vợ cả sát bên phải, nữ
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
      const k = datCum(ct, c.personId);
      if (k) khoi.push(k);
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
  const lech = (trai.tam + phai.tam) / 2 - (dai.khe.get(trai.unionId) + dai.khe.get(phai.unionId)) / 2;

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
function datMoiKhoi(ct) {
  const viTri = new Map();
  let x = 0;

  const datMot = (id) => {
    const k = datCum(ct, id);
    if (!k) return;
    for (const it of k.items) viTri.set(it.id, it.x + x);
    // Nhớ ai thuộc khối nào: `keoKhoiPhuVeGanCon()` cần dịch cả khối một lượt,
    // và cần biết khối nào to hơn khối nào.
    ct.thanhVienKhoi.set(id, k.items.map((it) => it.id));
    x += k.w + LAYOUT.blockGap;
  };

  for (const id of ct.dsNguoi) {
    if (ct.unionSoHuu.has(id) || ct.hapThuBoi.has(id)) continue;
    datMot(id);
  }
  // Lưới an toàn: dữ liệu lạ có thể để sót ai đó. Thà lệch chỗ còn hơn mất ô.
  for (const id of ct.dsNguoi) if (!ct.daDat.has(id)) datMot(id);

  return viTri;
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

          const d = dichVeGan(viTriX, cum, viTriX.get(c.personId));
          if (d !== null && (dMuon === null || Math.abs(d) < Math.abs(dMuon))) dMuon = d;
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
function dungDiemTreo(ct) {
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
      busY = nut.y + CAO + LAYOUT.vGap / 2;
      kieu = dai.n > 0 ? 'khe' : 'don';
    } else if (u.partners.length === 1) {
      const nut = ct.nodeById.get(u.partners[0]);
      x    = nut.x + RONG / 2;
      y    = nut.y + MUC_NET;
      busY = nut.y + CAO + LAYOUT.vGap / 2;
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
      busY = Math.max(a.y, b.y) + CAO + LAYOUT.vGap / 2;
      kieu = 'cheo';
      neoId = u.partners[0];
    }

    ra.push({ id: uid, x, y, busY, kieu, neoId, partnerIds: u.partners.slice() });
  }
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
        ? Math.min(treo.busY - LAYOUT.vGap / 4, con.y - 1)
        : Math.min(treo.busY, con.y - 1);

      const points = [[treo.x, treo.y]];
      if (Math.abs(treo.x - cx) > 0.5) { points.push([treo.x, busY]); points.push([cx, busY]); }
      points.push([cx, con.y]);

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
 * khoá, thứ tự các nhánh đã bị `rank` khoá. Chấp nhận nét dài.
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
 * Nằm TRÊN `busY` (= vGap/2) nên chùm con vẫn thả xuống được bình thường.
 */
function mucVong(a, b) {
  return Math.max(a.y, b.y) + CAO + LAYOUT.vGap * 0.3;
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
  const uGoc = ct.index.unionById.get(sp.unionId);

  // Thiếu hẳn người phối ngẫu? Đọc từ dữ liệu gốc chứ không đọc `unionHT` —
  // `unionHT` đã lọc mất đúng những người đang bị ẩn.
  const partnersGoc = (uGoc && Array.isArray(uGoc.partners)) ? uGoc.partners : [];
  const thieuBanDoi = partnersGoc.some((pid) => pid && !ct.visibleSet.has(pid));

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

  // Cặp đủ, thiếu con. Né sang bên cạnh chùm con đang vẽ nếu có.
  const huong = dai ? dai.huong : 1;
  let x = treo ? treo.x : nut.x + RONG / 2;
  const y1 = treo ? treo.y : nut.y + MUC_NET;
  if (u.children.length > 0) {
    let mep = null;
    for (const c of u.children) {
      const cn = ct.nodeById.get(c.personId);
      if (!cn) continue;
      const cx = cn.x + RONG / 2;
      if (mep === null || (huong > 0 ? cx > mep : cx < mep)) mep = cx;
    }
    if (mep !== null) x = mep + huong * (RONG / 2 + LAYOUT.hGap);
  }

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
  const tranY = nut.y + CAO + LAYOUT.vGap - LAYOUT.stubRadius - 2;
  const yDay  = Math.min(nut.y + CAO + LAYOUT.vGap / 2 + L, tranY);
  return { x, y: yDay, x1: x, y1, angle: 90 };
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
