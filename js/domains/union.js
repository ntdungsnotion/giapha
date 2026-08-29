// ============================================================
// giapha · js/domains/union.js
// Vai trò  : Nghiệp vụ hôn nhân và quan hệ cha mẹ – con
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/id.js, utils/date.js, config.js
// Phiên bản: 1.9.0 · Cập nhật: 29/08/2026 17:45
// ============================================================
//
// --- BẢN HỢP NHẤT HAI NHÁNH (26/08/2026) --------------------------------
//
// Hai phiên trên claude.ai cùng sửa file này, mỗi phiên một bản 1.6.0 khác
// nhau, cả hai đều mọc từ 1.5.0 và không bản nào push được vì đè lên nhau:
//
//   45W — `rank` (một số) → `ranks` (bảng khoá theo người), cửa đọc `rankCua`
//   46W — `timCapTrung` · `timXungDotGop` · `mergeUnions`, việc GỘP CẶP TRÙNG
//
// Bản 1.7.0 này mang cả hai. Chỗ hai nhánh đụng nhau thật nằm ở hai hàm GỘP:
// chúng viết theo `rank` cũ (một số cho cả cặp), nay phải hỏi và gộp thứ bậc
// THEO TỪNG NGƯỜI — xem ghi chú ở `timXungDotGop` và `mergeUnions`.
//
// NHẮC LẠI HAI ĐIỀU HAY BỊ LẪN:
// - partners là MẢNG, không phải hai trường vợ/chồng riêng. Hôn nhân đồng
//   giới phải chạy. Chỉ ánh xạ sang thẻ GEDCOM lúc xuất, ở domains/gedcom.js.
//   ⚠ partners có thể chỉ có MỘT phần tử — `U0024` trong dữ liệu làm việc là ca
//     thật. Đừng viết `partners[0] && partners[1]` ở bất cứ đâu.
// - partnerOrder = vị trí trái/phải trên sơ đồ.
//   ranks        = thứ bậc vợ cả (1) / vợ thứ (2), KHOÁ THEO NGƯỜI:
//                  `{ "P0034": 2 }` đọc là *"cặp thứ 2 CỦA P0034"*. Vắng khoá
//                  nghĩa là 1. Đọc qua `rankCua(u, personId)`, đừng đọc thẳng.
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
//   reorderChildren · swapPartnerOrder · updateUnion · updateChildRelation
//   listDeletedUnions              kể tên cặp trong THÙNG RÁC (bước 29)
//
// Sau MỌI lần gỡ, nơi gọi phải hỏi thêm một câu mà không hàm gỡ nào tự trả lời:
// ***cặp này còn lý do tồn tại không?*** Câu trả lời là `conLyDoTonTai()`, và nó
// có BA dòng chứ không phải hai — đọc ghi chú của chính hàm ấy trước khi dùng.
// Để hàm gỡ tự xoá cặp thì nó hết thuần theo nghĩa "làm đúng một việc", và nơi
// gọi mất mất cơ hội kể cho người dùng biết là cả cặp sắp biến mất.

import { nextId, sinhUid, maCayCuaCay } from '../utils/id.js';
import { mocNgay, parseLooseDate } from '../utils/date.js';
import { QUAN_HE_CON_NHAN } from '../config.js';

/**
 * Những quan hệ cha mẹ – con mà dữ liệu chấp nhận.
 *
 * ⚠ DẪN XUẤT từ bảng nhãn ở `config.js`, không gõ lại lần thứ hai. Hai danh
 * sách song song thì tới ngày ai đó thêm một mã, một bên nhận nó là hợp lệ còn
 * bên kia hiện trơ cái mã ra giữa thẻ — đúng cái lỗi mà `LOAI_TEN_PHU` đã
 * tránh được bằng cách chỉ có MỘT bảng.
 */
export const QUAN_HE_CON = QUAN_HE_CON_NHAN.map((x) => x.ma);

/**
 * Thứ bậc của cặp `u` xét THEO PHÍA `personId` — vợ cả là 1, vợ thứ là 2…
 * Vắng khoá nghĩa là **1**, không phải "không rõ": cặp duy nhất của một người
 * là cặp thứ nhất của người ấy. Nhờ luật này 23 trên 25 union trong dữ liệu
 * làm việc không cần trường `ranks` nào cả.
 *
 * ⚠ ĐÂY LÀ CỬA ĐỌC DUY NHẤT. Không nơi nào — kể cả trong chính file này —
 * được đọc thẳng `u.ranks[...]` hay `u.rank`. Một cửa là thứ làm cho việc gỡ
 * cầu tạm dưới đây sau này chỉ phải sửa một chỗ.
 *
 * Vì sao con số ấy phải có mốc: `rank` cũ lưu MỘT số cho CẢ HAI phía, mà
 * "thứ mấy" chỉ có nghĩa khi hỏi *"của ai"* — chủ dự án nói gọn hơn mọi đoạn
 * văn ngày 21/08/2026: *"nếu xét góc độ Dũng thì Lan là vợ 2, nếu xét Lan thì
 * Dũng là chồng 1"*. Xem `DAC-TA-RANK_V01.md`.
 */
export function rankCua(u, personId) {
  const r = u && u.ranks && Number(u.ranks[personId]);
  if (Number.isFinite(r) && r > 0) return r;
  // Cầu tạm cho file lưu TRƯỚC 23/08/2026 (bản sao lưu 15/08, file test, và
  // bản trên Drive cho tới khi chủ dự án tải bản mới lên). `rank` cũ không
  // mang mốc, nên chỉ dùng được khi cặp CHỈ có một phía tái hôn — đúng bằng
  // những gì dữ liệu cũ chứa. Gỡ khi mọi file JSON đang dùng đã có `ranks`.
  const cu = u && Number(u.rank);
  return (Number.isFinite(cu) && cu > 0) ? cu : 1;
}

/**
 * Bảng thứ bậc theo người mà bản ghi NÓI RÕ — không có cầu tạm nào.
 *
 * ⚠ Khác `rankCua` một chỗ sống còn: `rankCua` **luôn trả về một số** (vắng là
 * 1, và `rank` cũ dùng cho mọi người trong cặp). Cái đó đúng để HIỂN THỊ, sai
 * để GHI RA FILE: `rank` cũ là một số cho cả cặp, không nói của ai; đem nó gán
 * cho từng người là dựng ra một sự thật bản ghi không chứa — mà xét Dũng thì
 * Lan là vợ 2, xét Lan thì Dũng là chồng 1. Hàm này trả về bảng RỖNG khi bản
 * ghi chỉ có `rank` cũ, để nơi xuất tự chọn cách ghi mơ hồ tương ứng.
 */
export function ranksRoRang(u) {
  const ra = {};
  if (!u || !u.ranks) return ra;
  for (const id of Object.keys(u.ranks)) {
    const n = Number(u.ranks[id]);
    if (Number.isInteger(n) && n > 1) ra[id] = n;
  }
  return ra;
}

/**
 * Lọc một bảng `ranks` thô: chỉ giữ khoá nằm trong `partners` và giá trị là
 * số nguyên > 1. Giá trị 1 KHÔNG lưu — vắng khoá đã có nghĩa là 1, lưu thêm
 * chỉ làm file phình và mở đường cho hai cách viết cùng một sự thật.
 * Khoá lạ (người không ở trong cặp) là dữ liệu hỏng, bỏ đi không báo.
 *
 * @returns {object|undefined} `undefined` khi không còn khoá hợp lệ nào — nơi
 *          gọi ĐỪNG gán trường `ranks` trong ca ấy. Cùng lý do: 23 trên 25 cặp
 *          trong dữ liệu làm việc không cần trường này, và một bảng rỗng nằm
 *          trong mọi bản ghi chỉ làm file to ra mà không nói thêm điều gì.
 */
function locRanks(tho, partners) {
  const ra = {};
  if (!tho || typeof tho !== 'object') return undefined;
  const cho = new Set((Array.isArray(partners) ? partners : []).filter(Boolean));
  for (const khoa of Object.keys(tho)) {
    if (!cho.has(khoa)) continue;
    const n = Number(tho[khoa]);
    if (Number.isFinite(n) && n > 1) ra[khoa] = Math.floor(n);
  }
  return Object.keys(ra).length > 0 ? ra : undefined;
}

/**
 * Tạo một hôn nhân mới.
 *
 * @param {object} tree
 * @param {string[]} partnerIds  một hoặc nhiều mã người, đều phải có thật
 * @param {{ranks?:object, status?:string, note?:string,
 *          marriage?:{iso?:string, raw?:string, place?:string}}} [data]
 * @returns {{tree:object, union:object, diff:object}|null}
 *          null khi danh sách rỗng, có mã trùng nhau, hoặc có mã không tồn tại.
 *
 * `ranks` do NƠI GỌI quyết định, mặc định rỗng — tức cặp thứ nhất của mọi
 * người trong cặp. Hàm này không đoán: muốn biết đây là vợ cả hay vợ thứ thì
 * phải biết ý người dùng, không suy ra được từ số hôn nhân đã có — gia phả cũ
 * chép thứ bậc theo lệ, không theo thứ tự nhập liệu. Khoá phải là mã người
 * NẰM TRONG cặp; `locRanks` bỏ khoá lạ đi.
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
    uid:          sinhUid(maCayCuaCay(tree), ma),
    partners:     ds.slice(),
    // Mặc định đúng bằng `partners`. Chiều trái/phải thật sự do `layout.js`
    // tính theo giới tính (nam trái, nữ phải); `partnerOrder` chỉ được dùng khi
    // hai người cùng giới hoặc thiếu giới — xem QUY-TAC-VE §2.
    partnerOrder: ds.slice(),
    // `ranks` KHÔNG nằm ở đây — nó chỉ được gán bên dưới khi thật sự có khoá.
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

  const ranks = locRanks(d.ranks, ds);
  if (ranks) union.ranks = ranks;   // vắng hẳn khi không có khoá hợp lệ nào

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
 * Sửa quan hệ đẻ/nuôi của MỘT người con đã có trong cặp.
 *
 * @param {object} tree
 * @param {string} unionId
 * @param {string} personId  người con — phải đã nằm trong `union.children[]`
 * @param {string} relation  một mã trong `QUAN_HE_CON`
 * @returns {{tree:object, union:object, diff:object, thayDoi:boolean}|null}
 *          null khi thiếu cặp, hoặc người ấy KHÔNG phải con của cặp này.
 *
 * --- Vì sao chữ ký nhận `personId`, không nhận cả mảng -------------------
 *
 * Bước 33 sửa `names[]` bằng cách gửi CẢ mảng, vì mục trong `names[]` không
 * có mã nào để khớp — hai mục cùng loại, cùng chữ thì không phân biệt được.
 * `children[]` KHÁC ở đúng chỗ ấy: mỗi mục mang `personId`. Có mã thì khớp
 * được từng mục, và gửi cả mảng chỉ tổ mở thêm một cửa đi vòng qua
 * `addChild`/`removeChild` — hai hàm duy nhất được phép làm mảng này dài ra
 * hay ngắn đi, và là hai chỗ duy nhất hỏi tiếp câu `conLyDoTonTai()`.
 *
 * ⚠ HÀM NÀY KHÔNG THÊM, KHÔNG BỚT NGƯỜI. Nó đổi một chữ trong một mục đã có.
 * `order` giữ nguyên: đổi từ con đẻ sang con nuôi không làm ai đổi chỗ trong
 * hàng anh chị em.
 *
 * ⚠ MÃ LẠ RƠI VỀ 'birth', cùng lối với `addChild` và cùng một lý do:
 * `validate.js` bỏ qua phép rà tuổi sinh học với mọi quan hệ KHÁC `'birth'`,
 * nên một chữ gõ sai phải làm phép rà CHẶT hơn, không phải lỏng hơn.
 */
export function updateChildRelation(tree, unionId, personId, relation) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId);
  if (!cu) return null;

  const cacCon = Array.isArray(cu.children) ? cu.children : [];
  const i = cacCon.findIndex((c) => c && c.personId === personId);
  if (i < 0) return null;

  const truoc = cacCon[i].relation || 'birth';
  const sau   = QUAN_HE_CON.indexOf(relation) >= 0 ? relation : 'birth';

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children[i].relation = sau;

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  if (truoc !== sau) {
    diff[unionId + '.children.' + personId + '.relation'] = [truoc, sau];
  }

  return { tree: cayMoi, union: moi, diff, thayDoi: truoc !== sau };
}

/**
 * Sửa các trường của một cặp: `status`, `ranks`, `note`, khối `marriage`.
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

  // `ranks` GHÉP KHOÁ, không thay cả bảng: nơi gọi chỉ biết thứ bậc của NGƯỜI
  // đang mở form (`{ [mocId]: 3 }`), không biết gì về phía bên kia — gửi cả
  // bảng là xoá mất thứ bậc của người kia mà không ai định thế.
  // Cùng lý do với `children[]`: khớp theo `personId`, đừng gửi cả mảng
  // (`NK-B34` mục 2.1). Khác `names[]`, thứ vốn gửi cả mảng.
  //
  // Gửi giá trị 1 nghĩa là XOÁ KHOÁ — vắng khoá đã có nghĩa là 1.
  if (ch.ranks && typeof ch.ranks === 'object') {
    if (!moi.ranks || typeof moi.ranks !== 'object') moi.ranks = {};
    const cho = new Set((Array.isArray(moi.partners) ? moi.partners : []).filter(Boolean));

    // --- Dọn `rank` cũ trước khi ghi, nếu bản ghi này còn mang nó ------------
    // Bản ghi cũ chỉ có MỘT số cho cả cặp, và `rankCua()` cho mọi người trong
    // cặp đọc chung số ấy (cầu tạm). Ghi đè khoá của một người rồi để `rank`
    // nằm lại là mở đường cho một lỗi câm: đặt người ấy VỀ 1 thì khoá bị xoá,
    // cầu tạm sống lại, và con số cũ hiện ra như chưa ai sửa gì.
    //
    // Nên di trú `rank` thành khoá thật rồi xoá nó. Nhưng KHÔNG gán cho mọi
    // người — chủ dự án chỉ ra ngày 26/08/2026 vì sao: cặp `U0005` mang
    // `rank: 2` là nói về ÔNG (hai đời vợ); gán cả cho BÀ là đóng băng vĩnh
    // viễn một câu sai — *"chồng thứ 2"* trong khi bà chỉ có một đời chồng.
    //
    // Mốc suy ra bằng đúng quy tắc ngầm mà bản mã cũ vẫn sống nhờ, nay viết
    // thành lời (`DAC-TA-RANK` mục 1.1): **`rank` cũ nói về người có NHIỀU
    // HƠN MỘT cặp**. Đếm được vì hàm này có cả `tree` trong tay.
    //
    // Ba ca, và cả ba đều xác định:
    //   - đúng một người nhiều cặp  → số ấy là của họ, người kia về 1
    //   - không ai nhiều cặp        → `rank > 1` vô nghĩa, bỏ hẳn
    //   - cả hai đều nhiều cặp      → mơ hồ THẬT, không cứu được bằng suy
    //                                 luận: giữ cho cả hai, đúng như bản ghi
    //                                 cũ vẫn nói mà không phân biệt nổi.
    //                                 Luật 5 của `DAC-TA-RANK` cho phép ca
    //                                 này, `/kiem-tra` cảnh báo chứ không chặn
    const cuMoc = Number(moi.rank);
    if (Number.isFinite(cuMoc) && cuMoc > 1) {
      for (const id of cho) {
        if (demCapCuaNguoi(tree, id, unionId) === 0) continue;   // chỉ một cặp: không phải mốc
        if (moi.ranks[id] === undefined) moi.ranks[id] = cuMoc;
      }
    }
    if (moi.rank !== undefined) {
      // PHẢI ghi vào `diff`, kể cả khi không khoá nào đổi giá trị đọc ra được.
      // Bản ghi đã đổi thật (bỏ `rank`, thêm `ranks`) — không ghi thì
      // `thayDoi` trả về false và nơi gọi bỏ qua không lưu, tức phép di trú
      // chạy rồi mất. Người dùng bấm Lưu, màn hình báo "không có gì thay đổi",
      // và lần mở sau con số cũ vẫn ngồi đó.
      ghi('rank', cuMoc, null);
      delete moi.rank;
    }

    for (const khoa of Object.keys(ch.ranks)) {
      if (!cho.has(khoa)) continue;                 // khoá lạ: bỏ, không ghi
      const n     = Number(ch.ranks[khoa]);
      const sau   = (Number.isFinite(n) && n > 1) ? Math.floor(n) : 1;
      const truoc = rankCua(moi, khoa);
      if (truoc === sau) continue;

      if (sau > 1) moi.ranks[khoa] = sau;
      else         delete moi.ranks[khoa];
      ghi('ranks.' + khoa, truoc, sau);
    }

    // Không để lại bảng RỖNG: vắng trường đã có nghĩa là "ai cũng thứ nhất".
    if (Object.keys(moi.ranks).length === 0) delete moi.ranks;
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
 * Kể ra mọi cặp đang mang cờ `deleted` — thứ màn hình THÙNG RÁC cần.
 *
 * @param {object} tree
 * @returns {{id:string, union:object, partnerIds:string[], childIds:string[]}[]}
 *          xếp theo mã cho thứ tự ổn định; mảng rỗng khi thùng rác không có cặp nào.
 *
 * --- Vì sao hàm này đọc CÂY chứ không đọc CHỈ MỤC -----------------------
 *
 * Cùng một lý do đã làm `person.searchPersons` đọc thẳng `tree.persons`:
 * `buildIndex()` cố ý bỏ qua mọi bản ghi mang cờ `deleted`, nên đi qua chỉ mục
 * thì hàm này luôn trả về mảng rỗng — đúng cái nó sinh ra để tìm lại là thứ
 * chỉ mục không bao giờ có.
 *
 * `union` trả ra là THAM CHIẾU tới bản ghi gốc. Nơi gọi chỉ được đọc; muốn đưa
 * cặp trở lại thì gọi `restoreUnion`, hàm ấy tự chép bản sao.
 */
export function listDeletedUnions(tree) {
  const ds = (tree && Array.isArray(tree.unions)) ? tree.unions : [];
  const ra = [];

  for (const u of ds) {
    if (!u || !u.id || u.deleted !== true) continue;
    ra.push({
      id: u.id,
      union: u,
      partnerIds: (Array.isArray(u.partners) ? u.partners : []).filter(Boolean),
      childIds: (Array.isArray(u.children) ? u.children : [])
        .filter((c) => c && c.personId).map((c) => c.personId),
    });
  }

  ra.sort((a, b) => (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)));
  return ra;
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
 * `partners` dài ba người thì `layout.js`
 * không biết vẽ ai bên trái ai bên phải, và `gedcom.js` không ánh xạ nổi sang
 * cặp `HUSB`/`WIFE`.
 *
 * ⚠ `partnerOrder` được nối thêm ở CUỐI, và được dọn cho khớp `partners` trước
 * đã — hai mảng lệch nhau thì `layout.js` đọc `partnerOrder` ra một mã không
 * còn trong cặp. Nhắc lại: `partnerOrder` là vị trí TRÁI/PHẢI, chỉ được dùng khi
 * hai người cùng giới hoặc thiếu giới (QUY-TAC-VE §2); `ranks` mới là vợ cả/vợ
 * thứ, và nó khoá theo NGƯỜI nên thêm một người vào cặp không đụng gì tới thứ
 * bậc của người đã ở đó.
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
// GỘP CẶP TRÙNG (việc 8, mảnh cuối — chốt 23/08/2026)
// ============================================================
//
// Ba quyết định chủ dự án đã chốt, KHÔNG được tự đổi khi sửa ba hàm dưới đây:
//
//   1. Cặp GIỮ LẠI luôn là cặp mang MÃ SỐ NHỎ HƠN (cũ hơn). Cặp còn lại bị
//      XOÁ MỀM. Không hỏi tay — luật cố định.
//   2. `status` · thứ bậc · `note` · `marriage.raw` · `marriage.place`: bên
//      nào TRỐNG thì tự lấy bên kia (không hỏi). Khác nhau THẬT — cả hai đều
//      có giá trị mà không giống nhau — thì `mergeUnions` không tự chọn, nó
//      đợi `luaChon` từ nơi gọi (màn hình GỘP, hiện cả hai giá trị, người
//      dùng bấm chọn — giống form Sửa cặp). `status` và thứ bậc LUÔN có giá
//      trị mặc định (không có khái niệm "trống"), nên hễ khác nhau là XUNG
//      ĐỘT THẬT — dùng `timXungDotGop` để biết trước khi hiện form.
//      ⚠ Quyết định này chốt ngày 23/08 khi thứ bậc còn là MỘT số cho cả cặp
//      (`rank`). Từ 26/08 nó khoá theo NGƯỜI (`ranks`) — luật không đổi một
//      chữ, chỉ áp cho TỪNG KHOÁ thay vì cho cả bản ghi: hai cặp vênh nhau ở
//      người này mà khớp ở người kia thì chỉ hỏi về người này.
//   3. Ảnh cưới (media gắn `subjectId` là mã union): KHÔNG có luật cố định —
//      chủ dự án chọn "hỏi lại mỗi lần gộp". `luaChon.media` nhận 'chuyen'
//      (đổi `subjectId` sang cặp giữ lại) hoặc bỏ qua/'giu-nguyen' (để
//      nguyên — ảnh vẫn còn trong `media[]`, chỉ không còn cửa nào hiện ra
//      vì cặp chủ của nó đã xoá mềm, đúng lối "không xoá cứng").

/**
 * Dò các cặp TRÙNG NHAU trong toàn bộ cây — cùng một bộ `partners`, hoặc một
 * cặp MỘT NGƯỜI nằm TRỌN trong một cặp có từ hai người trở lên (đúng người ấy
 * là một trong số họ).
 *
 * @param {object} tree
 * @returns {{unionA:string, unionB:string, loai:'trung-het'|'mot-nam-trong-hai'}[]}
 *          `unionA` LUÔN mang mã số NHỎ HƠN `unionB` — khớp sẵn với luật "cặp
 *          cũ hơn được giữ" của `mergeUnions`, nơi gọi khỏi phải so lại.
 *
 * ⚠ Chỉ so cặp CHƯA xoá mềm — cặp đã ở thùng rác không cần dò trùng với ai.
 * ⚠ Union KHÔNG có partner nào (kiểu "mấy anh em ruột", xem `conLyDoTonTai`)
 * không so được — không có gì để so khớp, bỏ qua, dù `children` có trùng.
 * ⚠ HÀM O(n²) theo số union — với gia phả cỡ vài trăm cặp vẫn tức thì; gia
 * phả cỡ nghìn cặp thì nên xét lại, chưa cần bây giờ.
 */
export function timCapTrung(tree) {
  const ds = (tree && Array.isArray(tree.unions))
    ? tree.unions.filter((u) => u && !u.deleted) : [];
  const ra = [];

  for (let i = 0; i < ds.length; i++) {
    for (let j = i + 1; j < ds.length; j++) {
      const loai = soSanhCapTrung(ds[i], ds[j]);
      if (!loai) continue;
      const nhoHon = soMa(ds[i].id) < soMa(ds[j].id);
      ra.push({
        unionA: nhoHon ? ds[i].id : ds[j].id,
        unionB: nhoHon ? ds[j].id : ds[i].id,
        loai,
      });
    }
  }
  return ra;
}

/**
 * Những trường mà hai cặp TRÙNG có giá trị KHÁC NHAU THẬT (cả hai đều có giá
 * trị, và hai giá trị ấy không giống nhau) — CHỈ những trường này màn hình
 * GỘP mới cần hỏi tay. Trường mà một bên trống thì KHÔNG liệt vào đây:
 * `mergeUnions` tự lấy bên có giá trị, không cần hỏi.
 *
 * @param {object} uA
 * @param {object} uB
 * @returns {{status:boolean, ranks:string[], note:boolean,
 *            marriageRaw:boolean, marriagePlace:boolean}}
 *
 * ⚠ `ranks` KHÔNG phải boolean như bốn khoá kia — nó là DANH SÁCH mã người có
 * thứ bậc khác nhau ở hai cặp, mảng rỗng nghĩa là không xung đột. Đừng viết
 * `if (xd.ranks)`: mảng rỗng vẫn đúng. Viết `xd.ranks.length > 0`.
 *
 * Sở dĩ nó là mảng chứ không phải một lá cờ: từ 26/08/2026 thứ bậc khoá theo
 * NGƯỜI (`ranks`, xem `rankCua`), nên hai cặp có thể vênh nhau ở người này mà
 * khớp nhau ở người kia. Màn hình GỘP hỏi riêng từng người — *"Đây là cặp thứ
 * mấy của \<tên\>?"* — đúng khuôn câu hỏi mà form Sửa cặp đang dùng.
 */
export function timXungDotGop(uA, uB) {
  const a = uA || {}, b = uB || {};
  const khacTrong = (x, y) => x !== '' && y !== '' && x !== y;

  // Chỉ hỏi về người CÓ MẶT ở cả hai cặp. Người chỉ đứng trong một cặp thì
  // bên kia không có ý kiến gì về thứ bậc của họ — lấy nguyên, không hỏi.
  const chung = [...boPartner(a)].filter((id) => boPartner(b).has(id));

  return {
    status:        khacTrong(chuoi(a.status), chuoi(b.status)),
    ranks:         chung.filter((id) => rankCua(a, id) !== rankCua(b, id)),
    note:          khacTrong(chuoi(a.note), chuoi(b.note)),
    marriageRaw:   khacTrong(chuoi(a.marriage && a.marriage.raw),
                             chuoi(b.marriage && b.marriage.raw)),
    marriagePlace: khacTrong(chuoi(a.marriage && a.marriage.place),
                             chuoi(b.marriage && b.marriage.place)),
  };
}

/**
 * Gộp hai cặp TRÙNG thành một. Xem ba quyết định chốt ở đầu mục này.
 *
 * @param {object} tree
 * @param {string} unionIdA
 * @param {string} unionIdB
 * @param {{status?:string, ranks?:object, note?:string,
 *          marriage?:{iso?:string, raw?:string, place?:string},
 *          media?:'chuyen'|'giu-nguyen'}} [luaChon]
 *        `ranks` khoá theo `personId`, chỉ cần mang những người mà
 *        `timXungDotGop().ranks` đã kể tên.
 *        GIÁ TRỊ ĐÃ CHỌN cho những trường xung đột thật — nơi gọi phải chạy
 *        `timXungDotGop` và hỏi người dùng TRƯỚC, rồi mới gọi hàm này. Trường
 *        không xung đột thì KHÔNG cần truyền — hàm tự lấy bên có giá trị.
 * @returns {{tree:object, union:object, unionXoa:string, diff:object}|null}
 *          null khi thiếu một trong hai cặp, hai mã trùng nhau, hoặc hai cặp
 *          ĐƯA VÀO không phải một cặp trùng thật (gọi `timCapTrung` trước).
 *
 * --- `partners` và `partnerOrder`: HỢP, không phải THAY ---------------------
 * `partners` mới là hợp của hai bộ. `partnerOrder`: ưu tiên dải nào đã đủ số
 * partner sau khi hợp (thường là cặp có 2 người sẵn); thiếu mã nào thì bổ
 * sung vào cuối — không suy đoán trái/phải cho mã mới, `layout.js` xếp theo
 * giới tính nên chỗ đứng đúng ngay cả khi thứ tự mảng chưa gọn.
 *
 * --- `children`: NỐI ĐUÔI, khử trùng theo `personId` ------------------------
 * Người con có ở CẢ HAI cặp: giữ MỘT dòng, ưu tiên quan hệ `'birth'` nếu một
 * bên ghi birth (giữ đúng cái chặt hơn, `validate.js` chỉ nới lỏng phép rà
 * tuổi khi thấy đúng chữ ngoài `'birth'`). Con chỉ có ở cặp bị xoá thì nối
 * vào cuối hàng của cặp giữ lại, đánh `order` tiếp theo — không đánh số lại
 * toàn bộ, cùng luật với `removeChild`.
 *
 * ⚠ HÀM NÀY KHÔNG TỰ DÒ TRÙNG — gọi `timCapTrung(tree)` trước để biết hai mã
 * nào đưa vào là hợp lệ, và dùng `loai` để biết cặp nhỏ có phải cặp một
 * người hay không (cặp một người thường không có ngày cưới hay thứ bậc để
 * xung đột).
 */
export function mergeUnions(tree, unionIdA, unionIdB, luaChon) {
  if (!tree || !Array.isArray(tree.unions) || !unionIdA || !unionIdB) return null;
  if (unionIdA === unionIdB) return null;

  const uA = tree.unions.find((u) => u && u.id === unionIdA && !u.deleted);
  const uB = tree.unions.find((u) => u && u.id === unionIdB && !u.deleted);
  if (!uA || !uB) return null;
  if (!soSanhCapTrung(uA, uB)) return null;   // không phải một cặp trùng thật

  const nhoHon   = soMa(uA.id) < soMa(uB.id);
  const giu      = nhoHon ? uA : uB;
  const boDi     = nhoHon ? uB : uA;
  const lc       = luaChon || {};

  const moi = JSON.parse(JSON.stringify(giu));

  // --- partners + partnerOrder ---------------------------------------------
  const boPGiu  = boPartner(giu);
  const boPBoDi = boPartner(boDi);
  const hopP    = [...new Set([...boPGiu, ...boPBoDi])];
  moi.partners  = hopP;

  const orderGiu  = (Array.isArray(giu.partnerOrder) ? giu.partnerOrder : [])
    .filter((id) => hopP.indexOf(id) >= 0);
  const orderBoDi = (Array.isArray(boDi.partnerOrder) ? boDi.partnerOrder : [])
    .filter((id) => hopP.indexOf(id) >= 0);
  const orderGoc = (orderGiu.length === hopP.length) ? orderGiu
                  : (orderBoDi.length === hopP.length) ? orderBoDi
                  : orderGiu;
  const daCoOrder = new Set(orderGoc);
  moi.partnerOrder = orderGoc.concat(hopP.filter((id) => !daCoOrder.has(id)));

  // --- status: không có khái niệm "trống", khác nhau là xung đột thật -------
  moi.status = (lc.status !== undefined) ? (chuoi(lc.status) || 'married') : giu.status;

  // --- ranks: HỢP hai bảng, khoá theo từng người ----------------------------
  // Thứ bậc khoá theo NGƯỜI nên gộp được từng khoá một, không phải chọn cả
  // bảng của một bên: người chỉ đứng trong một cặp thì lấy nguyên số của cặp
  // ấy (bên kia không có ý kiến gì về họ). Chỉ người có mặt ở CẢ HAI cặp mà
  // hai số khác nhau mới là xung đột thật — `timXungDotGop().ranks` liệt đúng
  // những người ấy, và `luaChon.ranks` mang câu trả lời về.
  // Không truyền thì giữ số của cặp GIỮ LẠI, cùng lối với `status`.
  {
    const rMoi = {};
    for (const id of hopP) {
      const coGiu  = boPGiu.has(id);
      const coBoDi = boPBoDi.has(id);
      let n;
      if (lc.ranks && lc.ranks[id] !== undefined)  n = Number(lc.ranks[id]);
      else if (coGiu)                              n = rankCua(giu, id);
      else if (coBoDi)                             n = rankCua(boDi, id);
      else                                         n = 1;
      if (Number.isFinite(n) && n > 1) rMoi[id] = Math.floor(n);
    }
    if (Object.keys(rMoi).length > 0) moi.ranks = rMoi;
    else if (moi.ranks !== undefined)  delete moi.ranks;
    // Cầu tạm của `rankCua` đọc `rank` cũ. Bảng vừa dựng đã mang đủ sự thật
    // của cả hai cặp, nên để `rank` nằm lại là để một con số không mốc có cơ
    // hội nói chen — xoá đi.
    if (moi.rank !== undefined) delete moi.rank;
  }

  // --- note: có thể trống — bên trống tự lấy bên kia --------------------
  {
    const gN = chuoi(giu.note), bN = chuoi(boDi.note);
    moi.note = (lc.note !== undefined) ? chuoi(lc.note) : (gN !== '' ? gN : bN);
  }

  // --- marriage: raw/place có thể trống; iso tính lại theo raw cuối cùng ---
  {
    const gM = giu.marriage || {}, bM = boDi.marriage || {};
    const gRaw = chuoi(gM.raw), bRaw = chuoi(bM.raw);
    const gPlace = chuoi(gM.place), bPlace = chuoi(bM.place);

    const rawSau = (lc.marriage && lc.marriage.raw !== undefined)
      ? chuoi(lc.marriage.raw) : (gRaw !== '' ? gRaw : bRaw);
    const placeSau = (lc.marriage && lc.marriage.place !== undefined)
      ? chuoi(lc.marriage.place) : (gPlace !== '' ? gPlace : bPlace);

    let isoSau;
    if (lc.marriage && lc.marriage.iso !== undefined) {
      isoSau = chuoi(lc.marriage.iso) || null;
    } else if (rawSau === gRaw) {
      isoSau = (gM.iso === undefined ? null : gM.iso);
    } else if (rawSau === bRaw) {
      isoSau = (bM.iso === undefined ? null : bM.iso);
    } else {
      isoSau = parseLooseDate(rawSau).iso;
    }
    moi.marriage = { iso: isoSau, raw: rawSau, place: placeSau };
  }

  // --- children: nối đuôi, khử trùng theo personId --------------------------
  const conGiu  = (Array.isArray(giu.children) ? giu.children : []).filter((c) => c && c.personId);
  const conBoDi = (Array.isArray(boDi.children) ? boDi.children : []).filter((c) => c && c.personId);

  const conGiuBanSao = conGiu.map((c) => Object.assign({}, c));
  const theoMa = new Map(conGiuBanSao.map((c) => [c.personId, c]));
  let lonNhat = conGiuBanSao.reduce((m, c) => Math.max(m, Number(c.order) || 0), 0);
  const conThem = [];

  for (const c of conBoDi) {
    const daCoDong = theoMa.get(c.personId);
    if (daCoDong) {
      if (daCoDong.relation !== 'birth' && c.relation === 'birth') daCoDong.relation = 'birth';
      continue;
    }
    lonNhat += 1;
    const dong = { personId: c.personId, relation: c.relation || 'birth', order: lonNhat };
    theoMa.set(c.personId, dong);
    conThem.push(dong);
  }
  moi.children = conGiuBanSao.concat(conThem);

  // --- cặp bị gộp: xoá mềm ---------------------------------------------------
  const boDiMoi = JSON.parse(JSON.stringify(boDi));
  boDiMoi.deleted = true;

  // --- ảnh cưới (media gắn subjectId = mã cặp bị gộp) -----------------------
  let media = Array.isArray(tree.media) ? tree.media : [];
  if (lc.media === 'chuyen') {
    media = media.map((m) => (m && m.subjectId === boDi.id)
      ? Object.assign({}, m, { subjectId: giu.id }) : m);
  }

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => {
      if (u && u.id === giu.id)  return moi;
      if (u && u.id === boDi.id) return boDiMoi;
      return u;
    }),
    media,
  });

  const diff = {};
  diff[giu.id + '.partners'] = [boPGiu.size + ' người', hopP.length + ' người'];
  diff[giu.id + '.children'] = [conGiu.length + ' con', moi.children.length + ' con'];
  diff[boDi.id + '.deleted'] = [false, true];
  if (lc.media === 'chuyen') diff['media.subjectId'] = [boDi.id, giu.id];

  return { tree: cayMoi, union: moi, unionXoa: boDi.id, diff };
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
 *
 * ⚠ `rank` trả ra là thứ bậc XÉT THEO PHÍA `personId` — người đang HỎI, không
 * phải người được kể tên. Hỏi "vợ của ông Cương là những ai" thì con số phải
 * đọc theo phía ông Cương: bà cả 1, bà thứ 2. Lấy mốc là người bạn đời thì
 * câu chữ đổi phía và một nửa số ca sẽ sai (`DAC-TA-RANK_V01` mục 1).
 */
export function getSpouses(index, personId) {
  const ra = [];
  for (const u of getPartnerUnions(index, personId)) {
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (!id || id === personId || !index.personById.has(id)) continue;
      ra.push({
        personId: id,
        unionId:  u.id,
        rank:     rankCua(u, personId),
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

/**
 * Đếm số cặp KHÁC (chưa xoá mềm) mà `personId` đứng làm vợ/chồng, không kể
 * cặp `trUnionId`. Dùng đúng một chỗ: đoán mốc của `rank` cũ khi di trú sang
 * `ranks` — xem ghi chú trong `updateUnion`.
 *
 * ⚠ Không phải phép duyệt đồ thị nên không cần `visited`: nó đọc thẳng mảng
 * `unions` một lượt rồi dừng, không đi tiếp từ ai cả.
 */
function demCapCuaNguoi(tree, personId, trUnionId) {
  const ds = (tree && Array.isArray(tree.unions)) ? tree.unions : [];
  let n = 0;
  for (const u of ds) {
    if (!u || u.deleted || u.id === trUnionId) continue;
    if (Array.isArray(u.partners) && u.partners.indexOf(personId) >= 0) n++;
  }
  return n;
}

/** Bộ partner (khử rỗng, khử trùng) của một union — dùng cho dò/gộp cặp trùng. */
function boPartner(u) {
  return new Set((u && Array.isArray(u.partners) ? u.partners : []).filter(Boolean));
}

/**
 * So hai union có phải một cặp TRÙNG hay không.
 * @returns {'trung-het'|'mot-nam-trong-hai'|null}
 */
function soSanhCapTrung(a, b) {
  const pa = boPartner(a), pb = boPartner(b);
  if (pa.size === 0 || pb.size === 0) return null;   // không có gì để so khớp

  if (pa.size === pb.size && [...pa].every((id) => pb.has(id))) return 'trung-het';
  if (pa.size === 1 && [...pa].every((id) => pb.has(id))) return 'mot-nam-trong-hai';
  if (pb.size === 1 && [...pb].every((id) => pa.has(id))) return 'mot-nam-trong-hai';
  return null;
}

/** Phần số của một mã (`'U0018'` → `18`). Mã hỏng thì coi là 0. */
function soMa(id) {
  const n = Number(String(id || '').replace(/^\D+/, ''));
  return Number.isFinite(n) ? n : 0;
}

/** `order` của một người con; thiếu thì đẩy xuống cuối, không đẩy lên đầu. */
function soOrder(con) {
  const n = Number(con && con.order);
  return Number.isFinite(n) ? n : 9999;
}
