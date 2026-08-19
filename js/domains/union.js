// ============================================================
// giapha · js/domains/union.js
// Vai trò  : Nghiệp vụ hôn nhân và quan hệ cha mẹ – con
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/id.js, utils/date.js
// Phiên bản: 1.3.0 · Cập nhật: 20/08/2026 09:30
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
//
// --- BỐN CẶP ĐỐI XỨNG, và một câu hỏi đi kèm (bước 26) ------------------
//
//   addChild   ↔ removeChild        con của một cặp
//   addPartner ↔ removePartner      vợ/chồng của một cặp
//   createUnion ↔ softDeleteUnion   ( ↔ restoreUnion để hoàn tác )
//   reorderChildren · swapPartnerOrder · updateUnion
//
// Sau MỌI lần gỡ, nơi gọi phải hỏi thêm một câu mà không hàm gỡ nào tự trả lời:
// ***cặp này còn lý do tồn tại không?*** Câu trả lời là `conLyDoTonTai()`, và nó
// có BA dòng chứ không phải hai — đọc ghi chú của chính hàm ấy trước khi dùng.
// Để hàm gỡ tự xoá cặp thì nó hết thuần theo nghĩa "làm đúng một việc", và nơi
// gọi mất mất cơ hội kể cho người dùng biết là cả cặp sắp biến mất.

import { nextId } from '../utils/id.js';
import { mocNgay, parseLooseDate } from '../utils/date.js';

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

/**
 * Sửa các trường của một cặp: `status`, `rank`, `note`, khối `marriage`.
 *
 * @returns {{tree:object, union:object, diff:object, thayDoi:boolean}|null}
 *
 * Cùng khuôn với `person.updatePerson`, kể cả chỗ `marriage.iso` tính lại từ
 * `marriage.raw` mỗi khi `raw` đổi: `raw` là SỰ THẬT người ta chép được, `iso`
 * chỉ là thứ máy đọc được. Nơi gọi đưa thẳng `iso` vào thì hàm tin nơi gọi.
 *
 * ⚠ KHÔNG đụng tới `partners` và `children`. Hai mảng ấy có hàm riêng
 * (`addPartner`/`removePartner`, `addChild`/`removeChild`) vì mỗi lần chạm vào
 * chúng còn phải hỏi tiếp câu *"cặp này còn lý do tồn tại không"* — xem
 * `conLyDoTonTai`. Cho `updateUnion` nhận luôn hai mảng ấy là mở một cửa thứ hai
 * đi vòng qua câu hỏi đó.
 */
export function updateUnion(tree, unionId, changes) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId);
  if (!cu) return null;

  const moi  = JSON.parse(JSON.stringify(cu));
  const diff = {};
  const ch   = changes || {};
  const ghi  = (duong, truoc, sau) => { diff[unionId + '.' + duong] = [truoc, sau]; };

  if (ch.status !== undefined) {
    const sau = chuoi(ch.status) || 'married';
    if (moi.status !== sau) { ghi('status', moi.status, sau); moi.status = sau; }
  }

  if (ch.rank !== undefined) {
    const n   = Number(ch.rank);
    const sau = (Number.isFinite(n) && n > 0) ? n : 1;
    if (moi.rank !== sau) { ghi('rank', moi.rank, sau); moi.rank = sau; }
  }

  if (ch.note !== undefined) {
    const sau   = chuoi(ch.note);
    const truoc = typeof moi.note === 'string' ? moi.note : '';
    if (truoc !== sau) { ghi('note', truoc, sau); moi.note = sau; }
  }

  if (ch.marriage && typeof ch.marriage === 'object') {
    if (!moi.marriage || typeof moi.marriage !== 'object') {
      moi.marriage = { iso: null, raw: '', place: '' };
    }
    const m = moi.marriage;

    if (ch.marriage.raw !== undefined) {
      const sau   = chuoi(ch.marriage.raw);
      const truoc = typeof m.raw === 'string' ? m.raw : '';
      if (truoc !== sau) {
        ghi('marriage.raw', truoc, sau);
        m.raw = sau;

        const isoCu  = (m.iso === undefined || m.iso === null || m.iso === '') ? null : m.iso;
        const isoMoi = ch.marriage.iso !== undefined
          ? (chuoi(ch.marriage.iso) || null)
          : parseLooseDate(sau).iso;
        if (isoCu !== isoMoi) { ghi('marriage.iso', isoCu, isoMoi); m.iso = isoMoi; }
      }
    }

    if (ch.marriage.place !== undefined) {
      const sau   = chuoi(ch.marriage.place);
      const truoc = typeof m.place === 'string' ? m.place : '';
      if (truoc !== sau) { ghi('marriage.place', truoc, sau); m.place = sau; }
    }
  }

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  return { tree: cayMoi, union: moi, diff, thayDoi: Object.keys(diff).length > 0 };
}

/**
 * Xoá mềm: đặt cờ deleted. KHÔNG xoá khỏi mảng.
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi không có cặp ấy, hoặc khi cờ đã đúng sẵn.
 */
export function softDeleteUnion(tree, unionId) { return datCoXoaUnion(tree, unionId, true); }

/** Hoàn tác của `softDeleteUnion`: lật cờ ngược lại. */
export function restoreUnion(tree, unionId) { return datCoXoaUnion(tree, unionId, false); }

function datCoXoaUnion(tree, unionId, co) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId);
  if (!cu) return null;
  if ((cu.deleted === true) === co) return null;   // cờ đã đúng sẵn

  const moi = JSON.parse(JSON.stringify(cu));
  moi.deleted = co;

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.deleted'] = [cu.deleted === true, co];

  return { tree: cayMoi, union: moi, diff };
}

/**
 * Gỡ một người con ra khỏi một cặp.
 *
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi thiếu cặp, hoặc người ấy VỐN không phải con của cặp này.
 *
 * ⚠ KHÔNG đánh số lại `order` của những người con còn lại. Cám dỗ là dồn về
 * 1…n cho gọn; đừng. `layout.js` chỉ SẮP theo `order`, nên một lỗ hổng trong
 * dãy số không hại gì — còn đánh số lại thì mỗi anh chị em không hề bị đụng tới
 * cũng có một dòng trong `diff`, và lịch sử `changeLog` kể rằng cả nhà vừa đổi
 * chỗ trong khi thật ra chỉ một người rời đi. `addChild` lấy số lớn nhất cộng
 * một nên lỗ hổng ấy cũng không bao giờ sinh ra hai người trùng số.
 *
 * ⚠ Hàm này KHÔNG tự xoá cặp khi gỡ mất người con cuối cùng — nó là hàm thuần
 * làm đúng một việc. Câu hỏi *"cặp này còn lý do tồn tại không"* là việc của nơi
 * gọi, và câu trả lời nằm ở `conLyDoTonTai` ngay dưới đây.
 */
export function removeChild(tree, unionId, personId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const cacCon = (Array.isArray(cu.children) ? cu.children : []).filter((c) => c && c.personId);
  if (!cacCon.some((c) => c.personId === personId)) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children = (Array.isArray(cu.children) ? cu.children : [])
    .filter((c) => !(c && c.personId === personId));

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.children'] = [
    cacCon.map((c) => c.personId).join(' + '),
    moi.children.map((c) => c && c.personId).filter(Boolean).join(' + '),
  ];

  return { tree: cayMoi, union: moi, diff };
}

/**
 * Thêm một người đã có sẵn vào một cặp, với tư cách VỢ/CHỒNG.
 *
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi thiếu cặp, thiếu người, người ấy đã ở trong cặp, hoặc cặp
 *          đã đủ HAI người.
 *
 * ⚠ Chặn ở hai người là cố ý, và nó KHÔNG phải một phán xét về đa thê: trong mô
 * hình dữ liệu này **đa thê là NHIỀU CẶP**, không phải một cặp ba người —
 * `U0004`/`U0005`, hai đời vợ ông Cương, là ca thật đang có trong dữ liệu. Cho
 * `partners` dài ba người thì `rank` (vợ cả / vợ thứ) hết chỗ bám, `layout.js`
 * không biết vẽ ai bên trái ai bên phải, và `gedcom.js` không ánh xạ nổi sang
 * cặp `HUSB`/`WIFE`.
 *
 * ⚠ `partnerOrder` được nối thêm ở CUỐI, và được dọn cho khớp `partners` trước
 * đã — hai mảng lệch nhau thì `layout.js` đọc `partnerOrder` ra một mã không
 * còn trong cặp. Nhắc lại: `partnerOrder` là vị trí TRÁI/PHẢI, chỉ được dùng khi
 * hai người cùng giới hoặc thiếu giới (QUY-TAC-VE §2); `rank` mới là vợ cả/vợ thứ.
 */
export function addPartner(tree, unionId, personId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;
  if (!Array.isArray(tree.persons)) return null;
  if (!tree.persons.some((p) => p && p.id === personId && !p.deleted)) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const ds = (Array.isArray(cu.partners) ? cu.partners : []).filter(Boolean);
  if (ds.indexOf(personId) >= 0) return null;
  if (ds.length >= 2) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.partners = ds.concat([personId]);
  moi.partnerOrder = (Array.isArray(cu.partnerOrder) ? cu.partnerOrder : [])
    .filter((id) => id && moi.partners.indexOf(id) >= 0)
    .concat([personId]);

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.partners'] = [ds.join(' + '), moi.partners.join(' + ')];

  return { tree: cayMoi, union: moi, diff };
}

/**
 * Gỡ một người ra khỏi hàng VỢ/CHỒNG của một cặp.
 *
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi thiếu cặp, hoặc người ấy vốn không phải partner của cặp này.
 *
 * ⚠ HỆ QUẢ PHẢI NÓI RA TRƯỚC KHI GỌI, và nó lớn hơn vẻ ngoài của việc: quan hệ
 * cha mẹ – con trong mô hình này đi QUA cặp, chứ không nối thẳng người với
 * người. Nên gỡ một người ra khỏi `partners` của một cặp CÒN CON thì người ấy
 * đồng thời thôi làm cha/mẹ của tất cả những người con ấy. Không có cách nào
 * tách hai việc — muốn giữ quan hệ cha con mà bỏ quan hệ vợ chồng thì thứ phải
 * đổi là `status` của cặp (`'divorced'`), không phải `partners`. Nơi gọi phải kể
 * tên từng người con ra trước khi hỏi (`pages/person-edit.js`, luật 9).
 */
export function removePartner(tree, unionId, personId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const ds = (Array.isArray(cu.partners) ? cu.partners : []).filter(Boolean);
  if (ds.indexOf(personId) < 0) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.partners = ds.filter((id) => id !== personId);
  moi.partnerOrder = (Array.isArray(cu.partnerOrder) ? cu.partnerOrder : [])
    .filter((id) => id && id !== personId && moi.partners.indexOf(id) >= 0);

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.partners'] = [ds.join(' + '), moi.partners.join(' + ')];

  return { tree: cayMoi, union: moi, diff };
}

/**
 * Cặp này còn KHẲNG ĐỊNH được điều gì không? Không thì nơi gọi phải xoá mềm nó.
 *
 * Gọi sau MỌI lần gỡ, dù gỡ người con hay gỡ vợ/chồng.
 *
 *   · từ 2 partner trở lên       → GIỮ — *"hai người này là vợ chồng"*. Đúng dù
 *     chưa có người con nào, và `layout.js` vẫn vẽ cặp ấy ra.
 *   · 1 partner và từ 1 con      → GIỮ — *"người này là cha/mẹ của mấy người
 *     kia"*. Gia phả cũ đầy những bà mẹ không còn ai nhớ tên chồng.
 *   · 0 partner và từ 2 con      → GIỮ — *"mấy người này là anh em ruột"*. Một
 *     `FAM` chỉ có `CHIL`, không `HUSB` lẫn `WIFE`, là hợp lệ theo GEDCOM và
 *     đúng cảnh đời trên cùng của gia phả cũ, nơi chỉ còn nhớ được mấy anh em.
 *   · còn lại (0–1 partner, 0 con · 0 partner, 1 con) → hết khẳng định, XOÁ MỀM.
 *
 * --- ĐÍNH CHÍNH luật đã chốt ở bước 21 -----------------------------------
 *
 * `NK-INDEX` chép luật ấy thành ba dòng: *"≥2 partner → giữ; 0–1 partner mà ≥2
 * con → giữ; 0–1 partner mà ≤1 con → XOÁ MỀM."* Dòng cuối **quét nhầm** ca
 * **1 partner + 1 con** — mà đó là ca `layout.js` VẼ RA (điều kiện bỏ qua của nó
 * là `partners.length < 2` **và** `children.length === 0`, hai vế cùng lúc). Xoá
 * cặp ấy là bẻ gãy một quan hệ cha/mẹ – con có thật, chỉ vì cặp có mỗi một người
 * con và người cha thì goá.
 *
 * Luật cũ viết ra khi đang nhìn đúng MỘT ca — *gỡ người con cuối cùng ra khỏi
 * một cặp một người*, tức ca `con === 0` sau khi gỡ. Áp cho ca ấy thì nó đúng.
 * Lại đúng cái họ lỗi mà dự án này ghi đi ghi lại: **quy tắc phát biểu qua ví dụ
 * điển hình của nó** (`QUY-TAC-VE §7` bước 12, `§9` bước 15, luật B bước 20,
 * ghi chú `raSoatMotNguoi` bước 18). Nên câu hỏi ở đây được viết lại cho khỏi
 * phải liệt kê ca: ***cặp này còn khẳng định được điều gì không?***
 *
 * ⚠ Hàm ĐẾM TRÊN BẢN GHI, không đếm qua chỉ mục. Người mang cờ `deleted` vẫn
 * nằm nguyên trong `partners`/`children` (xoá mềm cố ý không dọn hai mảng ấy —
 * xem `person.softDeletePerson`), nên một cặp mà mọi người đã bị xoá mềm vẫn
 * được tính là còn khẳng định. Đúng ý: hoàn tác một người là họ hiện lại ngay,
 * không phải dựng lại cả cặp.
 */
export function conLyDoTonTai(union) {
  if (!union) return false;

  const soPartner = (Array.isArray(union.partners) ? union.partners : [])
    .filter(Boolean).length;
  const soCon = (Array.isArray(union.children) ? union.children : [])
    .filter((c) => c && c.personId).length;

  if (soPartner >= 2) return true;                    // hai người này là vợ chồng
  if (soPartner === 1 && soCon >= 1) return true;     // người này là cha/mẹ của…
  return soPartner === 0 && soCon >= 2;               // mấy người này là anh em ruột
}

/**
 * Đổi vị trí trái/phải của hai vợ chồng trên sơ đồ.
 *
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi cặp không có, hoặc chưa đủ hai người để mà đổi chỗ.
 *
 * ⚠ Chỉ đổi `partnerOrder`, tuyệt đối không đụng `partners`: thứ tự trong
 * `partners` không mang nghĩa gì cả, còn `partnerOrder` mới là vị trí trên hình.
 *
 * ⚠ Và phải biết trước khi trông đợi vào nó: `layout.js` xếp nam bên trái, nữ
 * bên phải theo GIỚI TÍNH, nên `partnerOrder` chỉ có tác dụng khi hai người
 * CÙNG GIỚI hoặc thiếu giới (QUY-TAC-VE §2). Gọi hàm này cho một cặp nam–nữ thì
 * dữ liệu đổi thật mà hình không nhúc nhích — đúng ý, nhưng nơi gọi phải nói
 * trước, nếu không người dùng bấm rồi tưởng app hỏng.
 */
export function swapPartnerOrder(tree, unionId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const dsPartner = (Array.isArray(cu.partners) ? cu.partners : []).filter(Boolean);
  if (dsPartner.length < 2) return null;

  // `partnerOrder` thiếu hoặc lệch thì lấy `partners` làm gốc — thà đổi chỗ trên
  // một dải dựng lại còn hơn đọc một dải kể tên người không còn trong cặp.
  const cuOrder = (Array.isArray(cu.partnerOrder) ? cu.partnerOrder : [])
    .filter((id) => id && dsPartner.indexOf(id) >= 0);
  const goc = (cuOrder.length === dsPartner.length) ? cuOrder : dsPartner;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.partnerOrder = goc.slice().reverse();

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.partnerOrder'] = [goc.join(' + '), moi.partnerOrder.join(' + ')];

  return { tree: cayMoi, union: moi, diff };
}

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
//
// ⚠ BỐN HÀM DƯỚI ĐÂY CHỈ TRẢ VỀ NGƯỜI CÒN TRONG CHỈ MỤC (sửa 18/08/2026, bước
// 21). `buildIndex` bỏ người mang cờ `deleted` ra khỏi `personById`, nhưng mã họ
// VẪN nằm nguyên trong `partners`/`children` của union — xoá mềm cố ý không dọn
// mấy mảng ấy, để hoàn tác chỉ phải lật lại một cờ (xem `person.softDeletePerson`).
// Nên đọc thẳng `u.partners` mà không lọc là kể tên một người đã bị xoá như thể
// họ vẫn còn. Từ bước 19 trở về trước lỗi này không lộ ra được, đơn giản vì
// chưa có bản ghi nào mang cờ ấy; phép thử `chat-2-5a` bắt được nó ngay lần
// chạy đầu.

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
      if (id && id !== personId && index.personById.has(id)) {
        ra.push({ personId: id, unionId: u.id, relation });
      }
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
      if (!c || !c.personId || !index.personById.has(c.personId)) continue;
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
      if (!index.personById.has(c.personId)) continue;
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
      if (!id || id === personId || !index.personById.has(id)) continue;
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
