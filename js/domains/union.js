// ============================================================
// giapha · js/domains/union.js
// Vai trò  : Nghiệp vụ hôn nhân và quan hệ cha mẹ – con
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/id.js, utils/date.js
// Phiên bản: 1.1.0 · Cập nhật: 18/08/2026 10:05
// ============================================================
//
// NHẮC LẠI HAI ĐIỀU HAY BỊ LẪN:
// - partners là MẢNG, không phải hai trường vợ/chồng riêng. Hôn nhân đồng
//   giới phải chạy. Chỉ ánh xạ sang thẻ GEDCOM lúc xuất, ở domains/gedcom.js.
//   ⚠ partners có thể chỉ có MỘT phần tử — `U0024` trong dữ liệu làm việc là ca
//     thật. Đừng viết `partners[0] && partners[1]` ở bất cứ đâu.
// - partnerOrder = vị trí trái/phải trên sơ đồ.
//   rank         = thứ bậc vợ cả (1) / vợ thứ (2).
//   Hai thứ KHÁC NHAU. Không gộp.
//
// --- HAI HÀM TẠO ĐỀU TRẢ VỀ CÂY MỚI -------------------------------------
//
// Cùng khuôn với `domains/person.updatePerson` (chốt 18/08/2026, chat 2.3):
// hàm thuần, trả `{ tree, ..., diff }`, KHÔNG tự đẩy mục nào vào `changeLog` —
// `ts` và `by` do MÁY CHỦ điền, nên mục do trình duyệt tự thêm hoặc bị bỏ, hoặc
// thành mục thứ hai trùng lặp. `diff` trả ra là thứ nơi gọi đưa vào
// `moTa.diff` của `repo.luuCay()`.
//
// Vì thế chữ ký ở đây KHÔNG có `byEmail` như bản khung 15/08 ghi. Cùng lý do đã
// làm `updatePerson` bỏ tham số ấy.
//
// ⚠ Thêm hai bản ghi trong một lần lưu thì phải NỐI ĐUÔI: cây trả về của hàm
// trước là cây đầu vào của hàm sau. `nextId()` đọc cây, nên chạy hai hàm tạo
// trên cùng một cây cũ sẽ ra hai bản ghi TRÙNG MÃ.

import { nextId } from '../utils/id.js';
import { mocNgay } from '../utils/date.js';

/** Những quan hệ cha mẹ – con mà dữ liệu chấp nhận. */
export const QUAN_HE_CON = ['birth', 'adopted', 'step', 'foster', 'thua_tu'];

/**
 * Tạo một hôn nhân mới.
 *
 * @param {object} tree
 * @param {string[]} partnerIds  một hoặc nhiều mã người, đều phải có thật
 * @param {{rank?:number, status?:string, note?:string,
 *          marriage?:{iso?:string, raw?:string, place?:string}}} [data]
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi danh sách rỗng, có mã trùng nhau, hoặc có mã không tồn tại.
 *
 * `rank` do NƠI GỌI quyết định, mặc định 1. Hàm này không đoán: muốn biết đây
 * là vợ cả hay vợ thứ thì phải biết ý người dùng, không suy ra được từ số hôn
 * nhân đã có — gia phả cũ chép thứ bậc theo lệ, không theo thứ tự nhập liệu.
 *
 * ⚠ Union một người mà CHƯA có con thì `layout.js` bỏ qua, không vẽ (dòng
 * "partners.length < 2 && children.length === 0"). Đó là đúng — một cái ô hôn
 * nhân rỗng treo lơ lửng cạnh một người không nói lên điều gì. Nên nơi gọi tạo
 * union một người là để NỐI CON vào, và phải làm cả hai việc trong cùng một lần
 * lưu, nếu không gia phả có một bản ghi vô hình.
 */
export function createUnion(tree, partnerIds, data) {
  if (!tree || !Array.isArray(tree.unions) || !Array.isArray(tree.persons)) return null;

  const ds = Array.isArray(partnerIds) ? partnerIds.filter((id) => !!id) : [];
  if (ds.length === 0) return null;
  if (new Set(ds).size !== ds.length) return null;
  for (const id of ds) {
    if (!tree.persons.some((p) => p && p.id === id && !p.deleted)) return null;
  }

  const d  = data || {};
  const ma = nextId('U', tree);

  const union = {
    id:           ma,
    partners:     ds.slice(),
    // Mặc định đúng bằng `partners`. Chiều trái/phải thật sự do `layout.js`
    // tính theo giới tính (nam trái, nữ phải); `partnerOrder` chỉ được dùng khi
    // hai người cùng giới hoặc thiếu giới — xem QUY-TAC-VE §2.
    partnerOrder: ds.slice(),
    rank:         Number.isFinite(Number(d.rank)) ? Number(d.rank) : 1,
    status:       typeof d.status === 'string' && d.status !== '' ? d.status : 'married',
    marriage: {
      iso:   chuoi(d.marriage && d.marriage.iso),
      raw:   chuoi(d.marriage && d.marriage.raw),
      place: chuoi(d.marriage && d.marriage.place),
    },
    children: [],
    note:     chuoi(d.note),
    deleted:  false,
  };

  const cayMoi = Object.assign({}, tree, { unions: tree.unions.concat([union]) });
  const diff = {};
  diff[ma + '.partners'] = ['', ds.join(' + ')];

  return { tree: cayMoi, union, diff };
}

/**
 * Thêm một người đã có sẵn vào một union, với tư cách người con.
 *
 * @param {object} tree
 * @param {string} unionId
 * @param {string} personId
 * @param {string} [relation]  birth (mặc định) | adopted | step | foster | thua_tu
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi thiếu union, thiếu người, hoặc người ấy ĐÃ là con của union.
 *
 * `order` là thứ tự anh chị em trên sơ đồ, lấy số lớn nhất đang có cộng một —
 * con mới sinh đứng cuối hàng. `layout.js` sắp anh em theo đúng số này.
 *
 * Quan hệ lạ thì rơi về 'birth' chứ không giữ nguyên: `validate.js` chỉ bỏ qua
 * phép rà tuổi sinh học khi thấy đúng chữ 'adopted', nên một chữ gõ sai lẽ ra
 * phải làm phép rà CHẶT hơn, không phải lỏng hơn.
 */
export function addChild(tree, unionId, personId, relation) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;
  if (!Array.isArray(tree.persons)) return null;
  if (!tree.persons.some((p) => p && p.id === personId && !p.deleted)) return null;

  const cacCon = Array.isArray(cu.children) ? cu.children : [];
  if (cacCon.some((c) => c && c.personId === personId)) return null;

  const qh = QUAN_HE_CON.indexOf(relation) >= 0 ? relation : 'birth';

  let lonNhat = 0;
  for (const c of cacCon) {
    const n = Number(c && c.order);
    if (Number.isFinite(n) && n > lonNhat) lonNhat = n;
  }

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children = cacCon.concat([{ personId, relation: qh, order: lonNhat + 1 }]);

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.children'] = [
    cacCon.map((c) => c && c.personId).filter(Boolean).join(' + '),
    moi.children.map((c) => c.personId).join(' + '),
  ];

  return { tree: cayMoi, union: moi, diff };
}

export function updateUnion(tree, unionId, changes) { /* TODO — chat 2.5 */ }

/** Xoá mềm: đặt cờ deleted. KHÔNG xoá khỏi mảng. */
export function softDeleteUnion(tree, unionId) { /* TODO — chat 2.5 */ }

export function removeChild(tree, unionId, personId) { /* TODO — chat 2.5 */ }

/** Đổi vị trí trái/phải của hai vợ chồng trên sơ đồ. */
export function swapPartnerOrder(tree, unionId) { /* TODO — chat 2.5 */ }

/**
 * Đặt lại thứ tự anh chị em.
 *
 * @param {string[]} orderedPersonIds  danh sách ĐẦY ĐỦ, đúng thứ tự mong muốn
 * @returns {{tree:object, union:object, diff:object}|null}
 *
 * ⚠ Từ chối thẳng nếu danh sách không phải một **hoán vị** của đúng những người
 * con đang có: thiếu một mã thì người con ấy biến mất khỏi union, thừa một mã
 * thì một người bị gán làm con của cặp không phải cha mẹ họ. Cả hai đều là mất
 * dữ liệu, và cả hai đều không ném lỗi ở đâu — đúng loại hỏng phải chặn ngay
 * tại cửa.
 */
export function reorderChildren(tree, unionId, orderedPersonIds) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const cacCon = (Array.isArray(cu.children) ? cu.children : []).filter((c) => c && c.personId);
  const moiDs  = Array.isArray(orderedPersonIds) ? orderedPersonIds.filter(Boolean) : [];

  if (moiDs.length !== cacCon.length) return null;
  if (new Set(moiDs).size !== moiDs.length) return null;
  const dangCo = new Set(cacCon.map((c) => c.personId));
  if (!moiDs.every((id) => dangCo.has(id))) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children = moiDs.map((id, i) => {
    const c = cacCon.find((x) => x.personId === id);
    return { personId: id, relation: c.relation || 'birth', order: i + 1 };
  });

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.thuTuCon'] = [
    cacCon.map((c) => c.personId).join(' + '),
    moiDs.join(' + '),
  ];

  return { tree: cayMoi, union: moi, diff };
}

/**
 * Thứ tự anh chị em hiện nay có nghịch với năm sinh không.
 *
 * @returns {{hopLe:boolean, thuTuHienTai:string[], thuTuMoi:string[],
 *            daDoi:string[], nam:Map<string,number>}|null}
 *          null khi union không có, hoặc khi **chưa đủ hai người con đọc được
 *          năm sinh** — lúc ấy không có gì để so, và im lặng mới đúng.
 *
 * --- Hai điều làm hàm này khác một phép sắp xếp thường ---------------------
 *
 * 1. **Người con KHÔNG đọc được năm sinh thì KHÔNG BAO GIỜ bị dịch chỗ.** Họ
 *    giữ nguyên vị trí đang đứng, và những người có năm sinh được xếp vào đúng
 *    những chỗ còn lại. Đây là luật ba kết quả của bộ rà soát, nhìn từ phía thứ
 *    tự: thiếu năm sinh là chuyện BÌNH THƯỜNG của gia phả, không phải dữ liệu
 *    lỗi — mà đoán chỗ cho người thiếu năm sinh thì chính là bịa ra một thứ bậc
 *    anh em không ai nói.
 * 2. **Chỉ so NĂM.** Hai anh em cùng năm thì giữ nguyên thứ tự đang có, không
 *    đảo. Cùng năm là chuyện thật (sinh đôi, hoặc đầu năm và cuối năm), và thứ
 *    tự đang có thường là thứ tự người trong họ đã chép.
 */
export function thuTuConTheoTuoi(tree, unionId) {
  if (!tree || !Array.isArray(tree.unions) || !Array.isArray(tree.persons)) return null;

  const union = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!union) return null;

  const thuTuHienTai = (Array.isArray(union.children) ? union.children : [])
    .filter((c) => c && c.personId)
    .slice()
    .sort((a, b) => (soOrder(a) - soOrder(b)) || (a.personId < b.personId ? -1 : 1))
    .map((c) => c.personId);
  if (thuTuHienTai.length < 2) return null;

  const nam = new Map();
  for (const id of thuTuHienTai) {
    const p = tree.persons.find((x) => x && x.id === id);
    const moc = p ? mocNgay(p.birth) : null;
    if (moc && Number.isFinite(Number(moc.nam))) nam.set(id, Number(moc.nam));
  }
  if (nam.size < 2) return null;

  // Chỗ nào đang là người CÓ năm sinh thì chỗ ấy được xếp lại; chỗ của người
  // thiếu năm sinh giữ nguyên.
  const cho    = [];
  const coNam  = [];
  thuTuHienTai.forEach((id, i) => {
    if (nam.has(id)) { cho.push(i); coNam.push(id); }
  });

  const daSap = coNam.slice().sort((a, b) => {
    const d = nam.get(a) - nam.get(b);
    return d !== 0 ? d : (coNam.indexOf(a) - coNam.indexOf(b));   // cùng năm: giữ nguyên
  });

  const thuTuMoi = thuTuHienTai.slice();
  cho.forEach((viTri, k) => { thuTuMoi[viTri] = daSap[k]; });

  const daDoi = thuTuHienTai.filter((id) => thuTuHienTai.indexOf(id) !== thuTuMoi.indexOf(id));

  return { hopLe: daDoi.length === 0, thuTuHienTai, thuTuMoi, daDoi, nam };
}

// ============================================================
// Truy vấn quan hệ
// ============================================================
//
// ⚠ KHÔNG hàm nào ở đây là phép duyệt đồ thị, nên không hàm nào cần tập
// `visited`: mỗi hàm đi đúng MỘT bước từ người được hỏi rồi dừng, không đi tiếp
// từ những người tìm được. Ai sửa file này mà cho chúng đi sâu thêm một bậc
// ("lấy luôn các cháu") thì phải chuyển sang `utils/graph.bfs()` — gia phả là
// đồ thị, và bản dữ liệu làm việc đang có sẵn hai vòng.

/** Các union mà người này làm CON. Mảng rỗng nếu không có bộ cha mẹ nào. */
export function getParentUnions(index, personId) {
  return dsUnion(index, index && index.unionsAsChild, personId);
}

/** Các union mà người này làm VỢ/CHỒNG. */
export function getPartnerUnions(index, personId) {
  return dsUnion(index, index && index.unionsAsPartner, personId);
}

/**
 * Cha mẹ.
 * @returns {{personId:string, unionId:string, relation:string}[]}
 *
 * `relation` là quan hệ của NGƯỜI ĐƯỢC HỎI trong union ấy — 'adopted' nghĩa là
 * cặp này là cha mẹ NUÔI của họ. Một người có thể có hai bộ cha mẹ (`P0020`),
 * nên danh sách trả về giữ đủ cả bốn người, mỗi người kèm mã union của mình.
 */
export function getParents(index, personId) {
  const ra = [];
  for (const u of getParentUnions(index, personId)) {
    const relation = quanHeCua(u, personId);
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (id && id !== personId) ra.push({ personId: id, unionId: u.id, relation });
    }
  }
  return ra;
}

/**
 * Các con.
 * @returns {{personId:string, unionId:string, relation:string, order:number}[]}
 */
export function getChildren(index, personId) {
  const ra = [];
  for (const u of getPartnerUnions(index, personId)) {
    for (const c of Array.isArray(u.children) ? u.children : []) {
      if (!c || !c.personId) continue;
      ra.push({
        personId: c.personId,
        unionId:  u.id,
        relation: c.relation || 'birth',
        order:    Number.isFinite(Number(c.order)) ? Number(c.order) : 9999,
      });
    }
  }
  return ra;
}

/**
 * Anh chị em: những người CÙNG MỘT UNION cha mẹ.
 *
 * ⚠ Cùng cha khác mẹ thì KHÔNG có trong danh sách này, vì họ thuộc union khác.
 * Đó đúng là ranh giới mà thuật toán tập hiển thị đang dùng (`KE-HOACH`, mục
 * *"điều kiện mọi partner"*): anh em được mở ngang là anh em cùng cha cùng mẹ,
 * còn cùng cha khác mẹ thuộc về nốt cụt. Nới chỗ này ra là kéo cả con riêng của
 * cha vào sơ đồ.
 *
 * @returns {{personId:string, unionId:string, relation:string}[]}
 */
export function getSiblings(index, personId) {
  const ra = [];
  const daCo = new Set([personId]);
  for (const u of getParentUnions(index, personId)) {
    for (const c of Array.isArray(u.children) ? u.children : []) {
      if (!c || !c.personId || daCo.has(c.personId)) continue;
      daCo.add(c.personId);
      ra.push({ personId: c.personId, unionId: u.id, relation: c.relation || 'birth' });
    }
  }
  return ra;
}

/**
 * Vợ/chồng.
 * @returns {{personId:string, unionId:string, rank:number, status:string}[]}
 *
 * Union một người thì không trả về ai — đúng, người ấy chưa có bạn đời nào.
 */
export function getSpouses(index, personId) {
  const ra = [];
  for (const u of getPartnerUnions(index, personId)) {
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (!id || id === personId) continue;
      ra.push({
        personId: id,
        unionId:  u.id,
        rank:     Number.isFinite(Number(u.rank)) ? Number(u.rank) : 1,
        status:   typeof u.status === 'string' ? u.status : '',
      });
    }
  }
  return ra;
}

// ============================================================
// Hàm dùng trong file
// ============================================================

/** Đọc một bảng tra của `buildIndex` thành danh sách bản ghi union. */
function dsUnion(index, bang, personId) {
  if (!index || !index.unionById || !bang || !personId) return [];
  const ra = [];
  for (const unionId of bang.get(personId) || []) {
    const u = index.unionById.get(unionId);
    if (u) ra.push(u);
  }
  return ra;
}

/** Quan hệ của một người con trong một union. Không tìm thấy thì coi là 'birth'. */
function quanHeCua(union, personId) {
  for (const c of Array.isArray(union.children) ? union.children : []) {
    if (c && c.personId === personId) return c.relation || 'birth';
  }
  return 'birth';
}

function chuoi(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

/** `order` của một người con; thiếu thì đẩy xuống cuối, không đẩy lên đầu. */
function soOrder(con) {
  const n = Number(con && con.order);
  return Number.isFinite(n) ? n : 9999;
}
