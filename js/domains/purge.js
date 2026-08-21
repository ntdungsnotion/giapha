// ============================================================
// giapha · js/domains/purge.js
// Vai trò  : XOÁ THẬT — tính hệ quả của một lần dọn, cả tất lẫn từng dòng
// Lớp      : domains — HÀM THUẦN, được gọi bởi: pages · được phép gọi: utils, domains
// Phụ thuộc: domains/union.js (conLyDoTonTai)
// Phiên bản: 1.1.0 · Cập nhật: 21/08/2026 23:10
// ============================================================
//
// --- Vì sao file này tồn tại RIÊNG ---------------------------------------
//
// Suốt từ bước 21 tới nay, mọi đường xoá của app đều cố ý tránh đúng hai mảng
// `partners` và `children`. Xoá mềm chỉ lật một cái cờ; mối nối vẫn nằm nguyên,
// và chính nhờ vậy mà "đưa trở lại" chỉ là lật cờ ngược lại.
//
// Xoá thật **không phải xoá mềm mạnh hơn — nó là một việc khác hẳn.** Bỏ một
// bản ghi người ra khỏi `persons` mà không gỡ mã họ khỏi `partners`/`children`
// của mọi cặp thì file còn lại những mã trỏ vào hư không, và `buildIndex()` sẽ
// dựng ra một chỉ mục có lỗ. Cái việc "chạm vào hai mảng nguy hiểm nhất" ấy
// đáng có chỗ đứng riêng, tách khỏi `person.js` và `union.js` — hai file mà
// mọi hàm đều hứa ngược lại.
//
// --- BỐN LUẬT CỦA FILE NÀY -----------------------------------------------
//
// 1. HÀM THUẦN, cùng nếp với `person.js` · `union.js` · `media.js`: trả về
//    CÂY MỚI, cây cũ nguyên vẹn. Máy chủ từ chối lần lưu thì màn hình vẫn đang
//    hiện đúng thứ có thật trên Drive.
//
// 2. **`planPurge` chỉ ĐẾM, `applyPurge` mới XOÁ.** Hộp xác nhận phải nói ra
//    con số TRƯỚC khi người dùng bấm, và con số ấy phải là con số thật chứ
//    không phải một lời ước lượng viết tay ở `pages`. Đếm và xoá dùng chung
//    một `planPurge` nên hai bên không bao giờ nói khác nhau.
//
// 3. **KHÔNG DUYỆT ĐỒ THỊ, nên không có tập `visited` nào.** Mọi vòng lặp ở
//    đây đi qua ba MẢNG PHẲNG — `persons`, `unions`, `media` — chứ không đi
//    theo quan hệ cha–con. Nếu về sau có hàm nào đi theo quan hệ (ví dụ *"dọn
//    cả một chi đã xoá"*), hàm đó BẮT BUỘC phải có `visited`: gia phả là đồ
//    thị, không phải cây, và thiếu `visited` là treo trình duyệt.
//
// 4. **KHÔNG XOÁ FILE trên Drive.** File này không biết Drive là gì — nó chỉ
//    kể ra `fileIds` cần xoá. Việc xoá thật nằm ở `services/gas.js`, và chạy
//    SAU khi máy chủ đã gật cho lần ghi. Xoá file trước rồi ghi hỏng là mất
//    ảnh mà bản ghi vẫn còn — hỏng theo kiểu tệ nhất.
//
// --- BỐN BƯỚC, KHÔNG ĐẢO THỨ TỰ ------------------------------------------
//
//   1. Sao lưu TRƯỚC        — máy chủ làm, không hỏi (`Code.gs.luuCay`)
//   2. Gỡ mã khỏi unions    — partners · children của MỌI cặp, kể cả cặp đã xoá
//   3. Xoá bản ghi          — persons · unions · media mang cờ deleted
//   4. Xoá FILE ẢNH trên Drive
//
// Bước 2 và 3 là `applyPurge` dưới đây. Bước 1 và 4 nằm ngoài, ở hai đầu.

import { conLyDoTonTai } from './union.js';

/**
 * ĐẾM trước, không đụng vào gì.
 *
 * @param {object} tree
 * @param {string[]|null} [chiNhung]
 *        `null` (mặc định) = dọn MỌI thứ đang mang cờ `deleted`.
 *        Một mảng mã = **chỉ dọn đúng những mã ấy**, thứ còn lại nằm nguyên
 *        trong thùng rác.
 *
 *        ⚠ Hai đường này KHÔNG chỉ khác nhau ở số lượng, và đây là chỗ dễ làm
 *        sai nhất của cả file: **ảnh đã gỡ khỏi kho không có mặt trong thùng
 *        rác**, vì thùng rác chỉ kể người và cặp. Nên chọn từng dòng thì không
 *        cách nào chọn tới chúng, và chúng phải được để yên — dọn kèm là xoá
 *        một thứ người dùng không hề thấy mình đang xoá. Chỉ đường *Chọn tất
 *        cả* (`chiNhung === null`) mới dọn cả ảnh rác, và hộp xác nhận kể ra
 *        con số ấy.
 *
 *        Ngoại lệ giữ nguyên ở cả hai đường: ảnh mất theo CHỦ THỂ vừa bị xoá.
 * @returns {{
 *   personIds: string[],   người sẽ mất hẳn khỏi `persons`
 *   unionIds:  string[],   cặp sẽ mất hẳn khỏi `unions`
 *   mediaIds:  string[],   bản ghi ảnh sẽ mất hẳn khỏi `media`
 *   fileIds:   string[],   file trên Drive cần xoá — đã lọc trùng và đã trừ
 *                          file mà một bản ghi ảnh CÒN LẠI vẫn đang trỏ tới
 *   capPhaiGo: string[],   cặp CÒN TRONG gia phả bị gỡ mất mã người
 *   capHetLyDo:string[],   cặp còn lại mà gỡ xong thì không còn lý do tồn tại
 *   anhLacChu: string[],   bản ghi ảnh phải xoá theo vì chủ thể biến mất
 *   trong: boolean         thùng rác rỗng, không có gì để dọn
 * }}
 */
export function planPurge(tree, chiNhung) {
  const persons = mang(tree && tree.persons);
  const unions  = mang(tree && tree.unions);
  const media   = mang(tree && tree.media);

  // `null` là *"dọn tất"*, mảng RỖNG là *"chưa chọn gì"* — hai điều khác hẳn
  // nhau. Gộp chúng lại (`!chiNhung || chiNhung.length === 0`) thì người dùng
  // bấm *Xoá vĩnh viễn* khi chưa chọn dòng nào sẽ xoá sạch cả thùng rác.
  const loc = Array.isArray(chiNhung) ? new Set(chiNhung) : null;
  const nhan = (id) => loc === null || loc.has(id);

  const personIds = persons.filter(daXoa).map((p) => p.id).filter(nhan);
  const unionIds  = unions.filter(daXoa).map((u) => u.id).filter(nhan);

  const boNguoi = new Set(personIds);
  const boCap   = new Set(unionIds);

  // Ảnh phải xoá theo ba đường, và đường thứ hai là đường dễ quên nhất:
  //   · chính nó mang cờ `deleted` — người dùng đã gỡ nó khỏi kho. ⚠ CHỈ khi
  //     dọn tất: ảnh đã gỡ không có mặt trong thùng rác nên không ai chọn tới
  //     chúng được, và dọn kèm là xoá thứ người dùng không thấy mình đang xoá;
  //   · CHỦ THỂ của nó sắp biến mất, dù bản thân tấm ảnh còn "sống". Để lại là
  //     để lại một `subjectId` trỏ vào hư không — đúng thứ mà cả file này sinh
  //     ra để chặn. Đường này chạy ở CẢ HAI kiểu dọn.
  const anhLacChu = [];
  const mediaIds  = [];
  for (const m of media) {
    if (!m || !m.id) continue;
    if (daXoa(m)) { if (nhan(m.id)) mediaIds.push(m.id); continue; }
    if (boNguoi.has(m.subjectId) || boCap.has(m.subjectId)) {
      mediaIds.push(m.id);
      anhLacChu.push(m.id);
    }
  }

  // File trên Drive: chỉ xoá file mà SAU khi dọn không còn bản ghi nào trỏ tới.
  // Hai bản ghi ảnh trỏ chung một file là chuyện có thật — cùng một tấm ảnh
  // cưới gắn cho cả cặp lẫn cho một người trong cặp — và xoá file ấy đi thì
  // bản ghi còn lại hiện ra một ô ảnh vỡ.
  const boMedia = new Set(mediaIds);
  const conDung = new Set();
  for (const m of media) {
    if (!m || !m.id || boMedia.has(m.id)) continue;
    if (m.driveFileId) conDung.add(m.driveFileId);
  }
  const fileIds = [];
  const daKe = new Set();
  for (const m of media) {
    if (!m || !boMedia.has(m.id)) continue;
    const f = m.driveFileId;
    if (!f || daKe.has(f) || conDung.has(f)) continue;
    daKe.add(f);
    fileIds.push(f);
  }

  // Cặp CÒN TRONG gia phả mà đang giữ mã của người sắp biến mất. Mối nối ấy
  // hôm nay đã không vẽ ra trên sơ đồ — `buildIndex()` bỏ qua người mang cờ
  // `deleted` — nên dọn xong sơ đồ KHÔNG đổi. Cái đổi là: từ giờ không đưa họ
  // trở lại được nữa.
  const capPhaiGo  = [];
  const capHetLyDo = [];
  for (const u of unions) {
    if (!u || !u.id || boCap.has(u.id)) continue;
    if (!capCoNguoi(u, boNguoi)) continue;
    capPhaiGo.push(u.id);
    if (!conLyDoTonTai(goNguoiKhoiCap(u, boNguoi))) capHetLyDo.push(u.id);
  }

  return {
    personIds, unionIds, mediaIds, fileIds,
    capPhaiGo, capHetLyDo, anhLacChu,
    trong: personIds.length === 0 && unionIds.length === 0 && mediaIds.length === 0,
  };
}

/**
 * XOÁ THẬT: bước 2 và bước 3 của bốn bước, đúng thứ tự ấy.
 *
 * Trả `null` khi không có gì để dọn — nơi gọi phải phân biệt được *"đã dọn,
 * sạch rồi"* với *"chưa dọn được"*, và một cây mới y hệt cây cũ thì không nói
 * ra được điều đó.
 *
 * @param {object} tree
 * @param {string[]|null} [chiNhung]  xem `planPurge`
 * @returns {{tree:object, ke:object, diff:object}|null}
 */
export function applyPurge(tree, chiNhung) {
  if (!tree) return null;
  const ke = planPurge(tree, chiNhung);
  if (ke.trong) return null;

  const boNguoi = new Set(ke.personIds);
  const boCap   = new Set(ke.unionIds);
  const boMedia = new Set(ke.mediaIds);
  const boFile  = new Set(ke.fileIds);

  // --- BƯỚC 2: gỡ mã khỏi unions ----------------------------------------
  // Chạy trên MỌI cặp còn lại. Cặp đã mang cờ `deleted` thì biến mất ở bước 3
  // nên không cần gỡ, nhưng cặp CÒN SỐNG thì bắt buộc.
  const unions = mang(tree.unions)
    .filter((u) => u && u.id && !boCap.has(u.id))
    .map((u) => (capCoNguoi(u, boNguoi) ? goNguoiKhoiCap(u, boNguoi) : u));

  // --- BƯỚC 3: xoá bản ghi ----------------------------------------------
  // Người còn lại mà đang trỏ ảnh đại diện vào một file sắp bị xoá thì phải
  // xoá luôn con trỏ — luật 2 của `media.js`: sơ đồ đọc thẳng `photoFileId`,
  // để nguyên là vẽ ra một ô ảnh vỡ mà không gì báo lỗi.
  const persons = mang(tree.persons)
    .filter((p) => p && p.id && !boNguoi.has(p.id))
    .map((p) => (p.photoFileId && boFile.has(p.photoFileId)
      ? Object.assign({}, p, { photoFileId: '' })
      : p));

  const media = mang(tree.media).filter((m) => m && m.id && !boMedia.has(m.id));

  const cayMoi = Object.assign({}, tree, { persons, unions, media });

  const diff = {};
  diff['persons'] = [mang(tree.persons).length, persons.length];
  diff['unions']  = [mang(tree.unions).length,  unions.length];
  diff['media']   = [mang(tree.media).length,   media.length];
  if (ke.personIds.length) diff['nguoiXoaHan'] = ['', ke.personIds.join(' ')];
  if (ke.unionIds.length)  diff['capXoaHan']   = ['', ke.unionIds.join(' ')];
  if (ke.fileIds.length)   diff['anhXoaHan']   = ['', ke.fileIds.join(' ')];

  return { tree: cayMoi, ke, diff };
}

/**
 * Một câu tóm tắt cho hộp xác nhận và cho `changeLog`.
 *
 * Trường trống thì không kể ra hàng đó — luật chung của cả dự án. "0 tấm ảnh"
 * trong một câu cảnh báo chỉ làm loãng hai con số đứng trước nó.
 */
export function moTaKePurge(ke) {
  const phan = [];
  if (ke.personIds.length) phan.push(ke.personIds.length + ' người');
  if (ke.unionIds.length)  phan.push(ke.unionIds.length + ' cặp');
  if (ke.mediaIds.length)  phan.push(ke.mediaIds.length + ' bản ghi ảnh');
  if (phan.length === 0) return 'không có gì';
  if (phan.length === 1) return phan[0];
  return phan.slice(0, -1).join(', ') + ' và ' + phan[phan.length - 1];
}

// ============================================================
// Bếp núc
// ============================================================

function mang(x) { return Array.isArray(x) ? x : []; }

function daXoa(x) { return !!x && x.deleted === true; }

function capCoNguoi(u, boNguoi) {
  const coPartner = mang(u.partners).some((id) => boNguoi.has(id));
  const coCon = mang(u.children).some((c) => c && boNguoi.has(c.personId));
  return coPartner || coCon;
}

/**
 * Bản sao của một cặp, đã gỡ hết mã người trong `boNguoi`.
 *
 * ⚠ `partnerOrder` phải gỡ theo `partners`, không thì nó giữ lại một mã không
 * còn ai mang — và `layout.js` đọc mảng ấy để xếp trái/phải.
 */
function goNguoiKhoiCap(u, boNguoi) {
  const moi = JSON.parse(JSON.stringify(u));
  moi.partners = mang(moi.partners).filter((id) => id && !boNguoi.has(id));
  if (Array.isArray(moi.partnerOrder)) {
    moi.partnerOrder = moi.partnerOrder.filter((id) => id && !boNguoi.has(id));
  }
  moi.children = mang(moi.children).filter((c) => c && !boNguoi.has(c.personId));
  return moi;
}
