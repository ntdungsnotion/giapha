// ============================================================
// giapha · js/domains/bloodline.js
// Vai trò  : TÍNH NĂNG CỐT LÕI — xác định ai được vẽ đầy đủ quanh người
//            trung tâm, ai chỉ là nút biên, và nhánh nào thu về nốt cụt.
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/graph
// Phiên bản: 1.1.0 · Cập nhật: 01/09/2026 16:20
// ============================================================
//
// ⚠ ĐẶC TẢ CŨ ĐÃ BỊ CHỨNG MINH SAI bằng dữ liệu thật (xem NK-B04):
//   nó kéo cả 32/32 người vào tập vẽ, tức không sinh ra nốt cụt nào.
//   Bản dưới đây theo KE-HOACH_V12. Hàm cũ computeBloodline() và
//   classifyNodes() đã bỏ — tên "bloodline" không còn đúng nghĩa, tập vẽ
//   là "huyết thống trong phạm vi k", không phải toàn bộ huyết thống.
//
// THUẬT TOÁN (đừng "tối ưu" thành đệ quy không visited):
//
//   1. ĐI LÊN — dựng tập tổ tiên, có visited
//      BFS từ focus qua cạnh con → cha mẹ.
//      Mỗi union đi qua lấy MỌI partner.
//      Gán số đời: focus = 0, cha mẹ = 1, ông bà = 2 …
//
//   2. XÁC ĐỊNH UNION TRỰC HỆ
//      Một union là "trực hệ đời d" khi MỌI partner đều trong tập tổ tiên.
//      d = số đời LỚN NHẤT trong các partner.
//      ⚠ "MỌI partner", không phải "cả hai partner" (sửa ở KE-HOACH_V11):
//      hôn nhân một người — người độc thân nhận con nuôi — chỉ có một phần
//      tử trong `partners`. Viết `partners[0] && partners[1]` thì
//      `partners[1]` không tồn tại, điều kiện thành sai, và NGƯỜI CON NUÔI
//      BIẾN MẤT KHỎI SƠ ĐỒ mà không báo lỗi gì.
//      ⚠ CHỖ DỄ SAI THỨ HAI: viết thành "mọi union mà cha là partner" thì con
//      riêng của cha với người vợ khác bị kéo vào tập vẽ. Anh chị em được mở
//      ngang là anh chị em CÙNG CHA CÙNG MẸ; cùng cha khác mẹ thuộc nốt cụt.
//
//   3. DỰNG TẬP VẼ ĐẦY ĐỦ (kind = 'full')
//      full = tập tổ tiên
//           ∪ hậu duệ(focus)
//           ∪ hậu duệ(mọi con của union trực hệ có d ≤ k)
//      Mọi lần đi xuống đều qua cạnh cha mẹ → con, có visited.
//
//   4. NÚT BIÊN (kind = 'edge')
//      Xét từng union. Lấy partner chưa nằm trong full khi:
//        - union đó là union của chính người trung tâm, HOẶC
//        - union đó có con nằm trong full VÀ đã có sẵn một partner trong full
//      Vẽ ô người bình thường, nhưng KHÔNG đi tiếp từ họ.
//      Vế thứ hai bắt buộc phải có: thiếu nó thì khi người dùng giới hạn số
//      đời, cha mẹ vừa bị cắt sẽ bị kéo ngược vào làm nút biên.
//      Nói cho dễ nhớ: NÚT BIÊN CHỈ CÓ THỂ LÀ NGƯỜI PHỐI NGẪU CÒN THIẾU,
//      KHÔNG BAO GIỜ LÀ CHA MẸ.
//
//   5. NỐT CỤT — chỉ vẽ khi thật sự CÓ bản ghi ở hướng đó. Xem findStubPoints.
//
// BÀI KIỂM TRA BẮT BUỘC (chat 1.2) — chạy trên giapha-doi-chieu-qft.json,
// KHÔNG phải bản làm việc 55 người. Năm con số dưới đây chỉ đúng trên bản
// đối chiếu, vì chúng được đối chiếu tay với bốn ảnh chụp QFT.
// k = 1, ancestors = 0, descendants = 0:
//
//   P0011 Nguyễn Bá Long        -> 7
//   P0007 Nguyễn Bá Cương       -> 9
//   P0012 Nguyễn Trọng Dũng     -> 15
//   P0020 Nguyễn Thị Hương Lan  -> 14
//   P0011 với ancestors = 2     -> 5   (ca duy nhất bắt được lỗi nút biên)
//
// Không đủ năm con số thì thuật toán sai, đừng đi tiếp sang chat 1.3.
// Vế thứ hai của điểm dừng: chạy trên giapha-nguyen-trong-bac.json (2 vòng)
// mà KHÔNG TREO.

import { bfsLevels } from '../utils/graph.js';

/**
 * Tập người được vẽ, kèm cách vẽ từng người.
 * @param {object} index  chỉ mục từ utils/graph.buildIndex
 * @param {string} focusPersonId
 * @param {{ancestors:number, descendants:number,
 *          spouseOfDescendants:boolean, k:number}} scope
 * @returns {Map<string, 'full'|'edge'>}
 */
export function computeVisibleSet(index, focusPersonId, scope) {
  const ketQua = new Map();
  if (!index || !index.personById || !index.personById.has(focusPersonId)) {
    // Người trung tâm không còn tồn tại (đã xoá mềm, hoặc mã cũ lưu ở kho
    // cài đặt riêng). Trả tập rỗng để nơi gọi hiện lời nhắn, chứ đừng ném lỗi.
    return ketQua;
  }
  const s = chuanHoaScope(scope);

  // --- BƯỚC 1 — đi lên, có visited nằm sẵn trong bfsLevels -----------------
  const doiToTien = bfsLevels(
    focusPersonId,
    (id) => chaMeCua(index, id),
    s.ancestors,                 // 0 = không giới hạn
  );

  // --- BƯỚC 2 — union trực hệ ---------------------------------------------
  const trucHe = new Map();      // unionId -> d
  for (const personId of doiToTien.keys()) {
    for (const unionId of danhSachUnionLamVoChong(index, personId)) {
      if (trucHe.has(unionId)) continue;
      const cacPartner = danhSachPartner(index, unionId);
      if (cacPartner.length === 0) continue;

      let moiPartnerDeuLaToTien = true;
      let d = 0;
      for (const pid of cacPartner) {
        if (!doiToTien.has(pid)) { moiPartnerDeuLaToTien = false; break; }
        d = Math.max(d, doiToTien.get(pid));
      }
      if (moiPartnerDeuLaToTien) trucHe.set(unionId, d);
    }
  }

  // --- BƯỚC 3 — tập vẽ đầy đủ ---------------------------------------------
  const full = new Set(doiToTien.keys());

  themHauDue(index, [focusPersonId], s.descendants, full);

  for (const [unionId, d] of trucHe) {
    if (d > s.k) continue;

    // ⚠ d = 0 LÀ UNION CỦA CHÍNH NGƯỜI TRUNG TÂM, và nó phải đứng ngoài vòng
    // này. Sửa 01/09/2026 — lỗi chủ dự án gặp trên gia phả Nguyễn Phúc 681
    // người: chọn "chỉ hiện đời con" mà app vẫn vẽ TẤT CẢ hậu duệ.
    //
    // Vì sao d = 0 lọt được vào `trucHe`: điều kiện là *mọi* partner đều nằm
    // trong tập tổ tiên, mà một UNION MỘT NGƯỜI của chính focus thoả điều
    // kiện ấy — partner duy nhất là focus, đời 0. Loại union này không hiếm:
    // đường nhập Excel sinh ra nó mỗi khi người cha có nhiều vợ mà dòng con
    // không nói rõ mẹ nào (56 union một người trong file thật của chủ dự án).
    //
    // Rơi vào đó thì công thức dưới đây cho `sauNhat = descendants + 0 - 1`,
    // tức 0 khi người dùng chọn "chỉ đời con" — mà **0 trong `bfsLevels`
    // nghĩa là KHÔNG GIỚI HẠN**, đúng cái ngược lại điều họ vừa bấm. Đây là
    // một con số đúng về số học nhưng sai về mã hoá: "còn 0 bước nữa" và
    // "không giới hạn" dùng chung một ký hiệu.
    //
    // Bỏ qua ở đây KHÔNG mất người nào: hậu duệ của chính focus đã do
    // `themHauDue(index, [focusPersonId], s.descendants, full)` ở trên lo
    // trọn, và `conCuaNguoi()` đi qua MỌI union của một người, kể cả union
    // một người.
    if (d === 0) continue;

    // Con của union trực hệ đời d nằm ở đời (d - 1) tính từ người trung tâm:
    // d = 1 là anh chị em ruột, cùng đời với focus. Muốn xuống tới đúng
    // `descendants` đời DƯỚI focus thì phải đi thêm (d - 1) bước.
    const sauNhat = s.descendants > 0 ? s.descendants + d - 1 : 0;
    themHauDue(index, conCua(index, unionId), sauNhat, full);
  }

  // --- BƯỚC 4 — nút biên ---------------------------------------------------
  const nutBien = new Set();
  const unionCuaFocus = new Set(danhSachUnionLamVoChong(index, focusPersonId));

  for (const unionId of index.unionById.keys()) {
    const cacPartner = danhSachPartner(index, unionId);
    const conThieu   = cacPartner.filter((pid) => !full.has(pid));
    if (conThieu.length === 0) continue;

    let duocLay = false;
    if (unionCuaFocus.has(unionId)) {
      // Vợ/chồng của chính người trung tâm: luôn vẽ.
      duocLay = true;
    } else if (s.spouseOfDescendants) {
      const daCoMotPartnerTrongFull = cacPartner.some((pid) => full.has(pid));
      const coConTrongFull = conCua(index, unionId).some((cid) => full.has(cid));
      duocLay = daCoMotPartnerTrongFull && coConTrongFull;
    }
    if (!duocLay) continue;

    for (const pid of conThieu) nutBien.add(pid);
  }

  // --- Gộp lại -------------------------------------------------------------
  for (const id of full)    ketQua.set(id, 'full');
  for (const id of nutBien) if (!ketQua.has(id)) ketQua.set(id, 'edge');
  return ketQua;
}

/**
 * Bốn chỗ gắn nốt cụt:
 *   - trên đầu một nút biên              : người đó có cha mẹ trong dữ liệu
 *   - trên đầu người ở đời ngoài cùng    : cha mẹ bị cắt do chạm giới hạn ancestors
 *   - trên đầu người có hai bộ cha mẹ    : chỉ một bộ được vẽ, bộ kia chưa
 *   - cạnh union trực hệ có d > k        : union đó còn con chưa vẽ
 *   - cạnh một người trong full          : người đó còn union khác không đủ điều kiện vẽ
 *
 * Ba dòng đầu quy về CÙNG MỘT phép thử: người đang được vẽ có một bộ cha mẹ
 * mà bộ đó chưa vẽ đủ. Hai dòng cuối cũng quy về một phép thử: xét từng
 * union rồi hỏi hướng đó còn bản ghi nào chưa vẽ không.
 *
 * CHỈ VẼ KHI THẬT SỰ CÓ BẢN GHI Ở HƯỚNG ĐÓ. Bà Lê Thị Thái có nốt cụt trên
 * đầu vì cha mẹ bà bị cắt; ông Nguyễn Bá Toàn ngay cạnh thì không, vì dữ liệu
 * không hề có cha mẹ ông.
 *
 * `unionId` là phần thêm so với đặc tả: nốt cụt phải neo vào đúng một chỗ
 * trên sơ đồ, mà chỗ đó là cái union bị cắt chứ không phải con người.
 * `hiddenCount` đếm SỐ BẢN GHI KỀ NGAY bị ẩn ở hướng đó (cha mẹ chưa vẽ, hoặc
 * vợ/chồng + con chưa vẽ), không đếm cả nhánh phía sau.
 *
 * @param {object} index
 * @param {Map<string,'full'|'edge'>} visibleSet  từ computeVisibleSet
 * @param {object} [scope]  chưa dùng tới — giữ cho khớp chữ ký đã công bố
 * @returns {Array<{personId:string, unionId:string,
 *                  direction:'up'|'side', hiddenCount:number}>}
 */
export function findStubPoints(index, visibleSet, scope) { // eslint-disable-line no-unused-vars
  const ketQua = [];
  const daGhi  = new Set();      // chống ghi trùng một chỗ hai lần

  const dangVe = (id) => visibleSet.has(id);

  // --- Hướng LÊN: còn một bộ cha mẹ chưa vẽ -------------------------------
  for (const personId of visibleSet.keys()) {
    for (const unionId of danhSachUnionLamCon(index, personId)) {
      const chuaVe = danhSachPartner(index, unionId).filter((pid) => !dangVe(pid));
      if (chuaVe.length === 0) continue;   // bộ cha mẹ này đã vẽ đủ
      ghiNotCut(ketQua, daGhi, personId, unionId, 'up', chuaVe.length);
    }
  }

  // --- Hướng NGANG: union bị cắt bớt --------------------------------------
  for (const unionId of index.unionById.keys()) {
    const cacPartner = danhSachPartner(index, unionId);
    if (cacPartner.length === 0) continue;

    const partnerChuaVe = cacPartner.filter((pid) => !dangVe(pid));
    const conChuaVe     = conCua(index, unionId).filter((cid) => !dangVe(cid));

    if (partnerChuaVe.length === 0) {
      // Cả cặp đều đang vẽ. Thiếu con thì gắn nốt cụt ngay cạnh union —
      // đây là ca "union trực hệ có d > k còn con chưa vẽ".
      if (conChuaVe.length === 0) continue;
      const moc = cacPartner.find((pid) => visibleSet.get(pid) === 'full')
               || cacPartner[0];
      ghiNotCut(ketQua, daGhi, moc, unionId, 'side', conChuaVe.length);
    } else {
      // Union chưa vẽ đủ cặp. Chỉ gắn cho người thuộc `full`: nút biên không
      // được mọc thêm nhánh, nếu không sơ đồ lan ra vô hạn qua các đời rể dâu.
      for (const pid of cacPartner) {
        if (visibleSet.get(pid) !== 'full') continue;
        ghiNotCut(ketQua, daGhi, pid, unionId, 'side',
                  partnerChuaVe.length + conChuaVe.length);
      }
    }
  }

  return ketQua;
}

// ============================================================
// Hàm phụ — đều thuần, đều lọc theo chỉ mục
// ============================================================

/** Điền giá trị thiếu, ép về đúng kiểu. Không sửa object của nơi gọi. */
function chuanHoaScope(scope) {
  const s = scope || {};
  return {
    ancestors:           soKhongAm(s.ancestors),
    descendants:         soKhongAm(s.descendants),
    spouseOfDescendants: s.spouseOfDescendants !== false,   // thiếu -> true
    k:                   soKhongAm(s.k === undefined ? 1 : s.k),
  };
}

function soKhongAm(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * MỌI partner của một union, đã bỏ người không còn trong chỉ mục.
 * Người bị xoá mềm không còn là một con người trên sơ đồ, nên cũng không
 * được tính khi xét "mọi partner đều là tổ tiên".
 */
function danhSachPartner(index, unionId) {
  const u = index.unionById.get(unionId);
  if (!u || !Array.isArray(u.partners)) return [];
  const ra = [];
  for (const pid of u.partners) {
    if (pid && index.personById.has(pid) && ra.indexOf(pid) === -1) ra.push(pid);
  }
  return ra;
}

/** Mọi con của một union. `children` là mảng object, không phải mảng mã. */
function conCua(index, unionId) {
  const u = index.unionById.get(unionId);
  if (!u || !Array.isArray(u.children)) return [];
  const ra = [];
  for (const con of u.children) {
    const cid = con && con.personId;
    if (cid && index.personById.has(cid) && ra.indexOf(cid) === -1) ra.push(cid);
  }
  return ra;
}

function danhSachUnionLamVoChong(index, personId) {
  return index.unionsAsPartner.get(personId) || [];
}

/** MẢNG, vì con nuôi có thể có hai bộ cha mẹ. */
function danhSachUnionLamCon(index, personId) {
  return index.unionsAsChild.get(personId) || [];
}

/** Cạnh đi lên: con → MỌI partner của MỌI union mà người đó làm con. */
function chaMeCua(index, personId) {
  const ra = [];
  for (const unionId of danhSachUnionLamCon(index, personId)) {
    for (const pid of danhSachPartner(index, unionId)) {
      if (pid !== personId && ra.indexOf(pid) === -1) ra.push(pid);
    }
  }
  return ra;
}

/** Cạnh đi xuống: người → con của MỌI union mà người đó làm vợ/chồng. */
function conCuaNguoi(index, personId) {
  const ra = [];
  for (const unionId of danhSachUnionLamVoChong(index, personId)) {
    for (const cid of conCua(index, unionId)) {
      if (cid !== personId && ra.indexOf(cid) === -1) ra.push(cid);
    }
  }
  return ra;
}

/**
 * Thả mọi hậu duệ của `batDauIds` vào `tapDich`. Bản thân các điểm xuất phát
 * cũng vào tập — chúng nằm ở độ sâu 0.
 */
function themHauDue(index, batDauIds, sauNhat, tapDich) {
  const dau = batDauIds.filter((id) => index.personById.has(id));
  if (dau.length === 0) return;
  const dat = bfsLevels(dau, (id) => conCuaNguoi(index, id), sauNhat);
  for (const id of dat.keys()) tapDich.add(id);
}

function ghiNotCut(ketQua, daGhi, personId, unionId, direction, hiddenCount) {
  if (hiddenCount <= 0) return;
  const khoa = personId + '|' + unionId + '|' + direction;
  if (daGhi.has(khoa)) return;
  daGhi.add(khoa);
  ketQua.push({ personId, unionId, direction, hiddenCount });
}
