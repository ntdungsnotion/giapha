// ============================================================
// giapha · js/domains/media.js
// Vai trò  : Nghiệp vụ ảnh và tư liệu (không tự tải lên — việc đó của services)
// Lớp      : domains — HÀM THUẦN, được gọi bởi: pages · được phép gọi: utils
// Phụ thuộc: utils/id, utils/text
// Phiên bản: 1.1.0 · Cập nhật: 01/09/2026 11:40
// ============================================================
//
// BỐN LUẬT CỦA FILE NÀY
//
// 1. HÀM THUẦN. Không gọi `services`, không chạm DOM, không đọc đồng hồ máy.
//    Mọi hàm sửa dữ liệu đều trả về **CÂY MỚI**, cây cũ nguyên vẹn — cùng nếp
//    với `person.js` và `union.js`. Nhờ vậy máy chủ từ chối một lần lưu thì
//    màn hình vẫn đang hiện đúng thứ đang có thật trên Drive.
//
// 2. **`person.photoFileId` là CON TRỎ, `media[]` là KHO.** Hai thứ khác nhau,
//    và đây là chỗ duy nhất được phép ghi cả hai:
//
//      · `media[]`      giữ MỌI tấm ảnh từng gắn cho một người, kể cả ảnh cũ
//                       đã thôi làm đại diện. Đây là tư liệu, không xoá.
//      · `photoFileId`  chỉ nói *"tấm nào đang làm đại diện"*. Sơ đồ đọc thẳng
//                       trường này, không phải quét cả mảng `media` cho 60 ô.
//
//    ⚠ **Đừng sửa `photoFileId` ở bất kỳ file nào khác.** Sửa một mình nó thì
//    sơ đồ hiện một tấm mà kho ảnh không có tấm nào tương ứng — và cái sai ấy
//    không có gì báo lỗi cả.
//
// 3. KHÔNG XOÁ CỨNG, cùng luật với người và hôn nhân. Gỡ một tấm ảnh là đặt cờ
//    `deleted`. Ảnh gốc vẫn nằm trên Drive: app **cố ý không xoá file Drive** —
//    xoá nhầm một tấm ảnh cụ ông chụp năm 1950 là mất vĩnh viễn, còn để thừa
//    một file thì chỉ tốn vài chục KB.
//
// 4. KHÔNG DUYỆT ĐỒ THỊ. File này chỉ tra theo mã trong hai mảng phẳng, nên
//    không có chỗ nào cần tập `visited`. Nếu về sau có hàm đi theo quan hệ
//    (ví dụ "gom mọi ảnh của cả một chi"), hàm đó BẮT BUỘC phải có `visited`.

import { nextId, loaiCua } from '../utils/id.js';
import { coGiaTri } from '../utils/text.js';

/**
 * Ghi một tấm ảnh ĐÃ TẢI LÊN DRIVE vào kho ảnh của cây.
 *
 * Hàm này KHÔNG tải gì lên — lúc gọi tới đây thì `driveFileId` đã có thật,
 * do `services/gas.taiAnh()` trả về. Ranh giới ấy là cố ý: đổi cả tầng lưu trữ
 * thì file này không phải sửa một chữ.
 *
 * `subjectId` nhận cả mã người (`P…`) lẫn mã hôn nhân (`U…`) — ảnh cưới thuộc
 * về một cặp, không thuộc về riêng ai.
 *
 * @param {object} tree
 * @param {string} subjectId
 * @param {string} driveFileId
 * @param {string} [caption]
 * @param {{boi?:string, luc?:string}} [ghiNhan]
 * @returns {{tree:object, media:object, diff:object}|null}
 *          null khi thiếu mã, hoặc khi `subjectId` không có trong cây.
 */
export function attachMedia(tree, subjectId, driveFileId, caption, ghiNhan, driveFileIdLon) {
  if (!tree || !coGiaTri(subjectId) || !coGiaTri(driveFileId)) return null;
  if (!coChuThe(tree, subjectId)) return null;

  const ds = Array.isArray(tree.media) ? tree.media : [];
  const ma = nextId('M', tree);
  const luc = (ghiNhan && coGiaTri(ghiNhan.luc)) ? String(ghiNhan.luc) : '';
  const boi = (ghiNhan && coGiaTri(ghiNhan.boi)) ? String(ghiNhan.boi) : '';

  const muc = {
    id:          ma,
    subjectId:   String(subjectId),
    driveFileId: String(driveFileId),
    // ⚠ **Bản LỚN, chỉ để in và để xem ảnh to** (01/09/2026, xem `PHOTO` ở
    // `config.js` về vì sao lưu hai file thay vì nhờ kho cắt nhỏ một file).
    // RỖNG là hợp lệ: ảnh tải lên trước ngày này không có bản lớn, và một lần
    // tải mà bản lớn hỏng thì bản nhỏ vẫn được giữ. Mọi nơi đọc trường này
    // phải chịu được rỗng — `driveFileIdLon || driveFileId`.
    driveFileIdLon: coGiaTri(driveFileIdLon) ? String(driveFileIdLon) : '',
    caption:     coGiaTri(caption) ? String(caption).trim() : '',
    year:        null,
    deleted:     false,
    meta:        { createdAt: luc, updatedAt: luc, updatedBy: boi },
  };

  const cayMoi = Object.assign({}, tree, { media: ds.concat([muc]) });
  const diff = {};
  diff[ma + '.driveFileId'] = ['', muc.driveFileId];
  if (muc.driveFileIdLon) diff[ma + '.driveFileIdLon'] = ['', muc.driveFileIdLon];

  return { tree: cayMoi, media: muc, diff };
}

/**
 * Gỡ một tấm ảnh khỏi kho: đặt cờ `deleted`, KHÔNG xoá bản ghi, KHÔNG xoá file
 * trên Drive.
 *
 * ⚠ Gỡ đúng tấm đang làm đại diện thì phải **xoá luôn con trỏ** `photoFileId`
 * của người ấy, nếu không sơ đồ vẫn vẽ một tấm mà kho đã coi là bỏ. Đây chính
 * là loại lỗi mà luật 2 ở đầu file sinh ra để chặn.
 *
 * @returns {{tree:object, media:object, diff:object}|null}
 */
export function detachMedia(tree, mediaId, ghiNhan) {
  if (!tree || !Array.isArray(tree.media) || !coGiaTri(mediaId)) return null;

  const cu = tree.media.find((m) => m && m.id === mediaId);
  if (!cu || cu.deleted === true) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.deleted = true;
  datMeta(moi, ghiNhan);

  const diff = {};
  diff[moi.id + '.deleted'] = [false, true];

  let persons = tree.persons;
  const chuThe = tra(tree, moi.subjectId);
  if (chuThe && chuThe.photoFileId === moi.driveFileId) {
    const nguoiMoi = JSON.parse(JSON.stringify(chuThe));
    nguoiMoi.photoFileId = '';
    datMeta(nguoiMoi, ghiNhan);
    diff[nguoiMoi.id + '.photoFileId'] = [moi.driveFileId, ''];
    persons = tree.persons.map((p) => (p && p.id === nguoiMoi.id ? nguoiMoi : p));
  }

  const cayMoi = Object.assign({}, tree, {
    media: tree.media.map((m) => (m && m.id === moi.id ? moi : m)),
    persons,
  });

  return { tree: cayMoi, media: moi, diff };
}

/**
 * Đặt một tấm ảnh CÓ SẴN TRONG KHO làm ảnh đại diện của một người.
 *
 * Chỉ nhận ảnh của chính người ấy. Đặt ảnh của người khác làm đại diện là một
 * lỗi gõ mã, và một gia phả để lọt lỗi ấy sẽ hiện mặt ông bác trên ô của cháu.
 *
 * @returns {{tree:object, person:object, media:object, diff:object}|null}
 */
export function setPortrait(tree, personId, mediaId, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !coGiaTri(personId)) return null;

  const nguoi = tree.persons.find((p) => p && p.id === personId);
  if (!nguoi) return null;

  const anh = (Array.isArray(tree.media) ? tree.media : [])
    .find((m) => m && m.id === mediaId && m.deleted !== true);
  if (!anh) return null;
  if (anh.subjectId !== personId) return null;

  const truoc = typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId : '';
  if (truoc === anh.driveFileId) {
    // Đã là ảnh đại diện rồi. Trả về CÂY CŨ, `diff` rỗng — nơi gọi nhìn `diff`
    // để biết có cần gọi máy chủ hay không, và một lần lưu không đổi gì là một
    // mục changeLog nói dối.
    return { tree, person: nguoi, media: anh, diff: {} };
  }

  const nguoiMoi = JSON.parse(JSON.stringify(nguoi));
  nguoiMoi.photoFileId = anh.driveFileId;
  datMeta(nguoiMoi, ghiNhan);

  const diff = {};
  diff[personId + '.photoFileId'] = [truoc, anh.driveFileId];

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? nguoiMoi : p)),
  });

  return { tree: cayMoi, person: nguoiMoi, media: anh, diff };
}

/**
 * Bỏ ảnh đại diện, GIỮ NGUYÊN tấm ảnh trong kho.
 *
 * Khác `detachMedia` một chuyện quan trọng: đây chỉ nói *"đừng dùng tấm này
 * làm mặt nữa"*, không nói *"tấm này bỏ đi"*. Ảnh cưới của cụ vẫn là tư liệu
 * kể cả khi không dùng làm ảnh đại diện.
 *
 * @returns {{tree:object, person:object, diff:object}|null}
 */
export function clearPortrait(tree, personId, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !coGiaTri(personId)) return null;

  const nguoi = tree.persons.find((p) => p && p.id === personId);
  if (!nguoi) return null;

  const truoc = typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId : '';
  if (!truoc) return { tree, person: nguoi, diff: {} };

  const nguoiMoi = JSON.parse(JSON.stringify(nguoi));
  nguoiMoi.photoFileId = '';
  datMeta(nguoiMoi, ghiNhan);

  const diff = {};
  diff[personId + '.photoFileId'] = [truoc, ''];

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? nguoiMoi : p)),
  });

  return { tree: cayMoi, person: nguoiMoi, diff };
}

/**
 * Đường đi thường ngày của màn hình sửa hồ sơ: vừa tải một tấm ảnh lên Drive
 * xong, giờ ghi nó vào kho VÀ đặt luôn làm ảnh đại diện.
 *
 * Gộp hai bước làm một hàm vì tách ra thì nơi gọi phải nhớ thứ tự, và quên
 * bước hai thì ảnh nằm trong kho mà không ai thấy. `attachMedia` sinh mã từ
 * cây, nên bước hai BẮT BUỘC chạy trên cây MỚI của bước một — chính là cái bẫy
 * mà `utils/id.js` đã dặn ở đầu file.
 *
 * @returns {{tree:object, person:object, media:object, diff:object}|null}
 */
export function datAnhDaiDien(tree, personId, driveFileId, caption, ghiNhan) {
  const gan = attachMedia(tree, personId, driveFileId, caption, ghiNhan);
  if (!gan) return null;

  const dat = setPortrait(gan.tree, personId, gan.media.id, ghiNhan);
  if (!dat) return null;

  return {
    tree:   dat.tree,
    person: dat.person,
    media:  gan.media,
    diff:   Object.assign({}, gan.diff, dat.diff),
  };
}

/**
 * Mọi tấm ảnh còn hiệu lực của một người hoặc một cặp, MỚI NHẤT ĐỨNG TRƯỚC.
 *
 * "Mới nhất" ở đây là **thứ tự thêm vào**, không phải năm chụp: `year` phần
 * lớn bản ghi để trống, mà xếp theo một trường trống thì thứ tự trở thành ngẫu
 * nhiên. Mảng `media` giữ nguyên thứ tự thêm, nên đảo ngược nó là đủ.
 */
export function getMediaFor(tree, subjectId) {
  if (!tree || !Array.isArray(tree.media) || !coGiaTri(subjectId)) return [];
  return tree.media
    .filter((m) => m && m.subjectId === subjectId && m.deleted !== true)
    .reverse();
}

/**
 * Bản ghi ảnh đang làm đại diện của một người, hoặc null.
 *
 * Tra NGƯỢC từ `photoFileId` sang `media[]`. Trả null khi con trỏ trỏ vào chỗ
 * không có gì — chuyện xảy ra được với bản ghi nhập từ GEDCOM, hoặc với file
 * bị sửa tay ngoài app. Lúc ấy sơ đồ vẫn vẽ được ảnh (nó chỉ cần `photoFileId`),
 * chỉ là không có chú thích nào để hiện.
 */
export function getPortrait(tree, personId) {
  if (!tree || !Array.isArray(tree.media)) return null;
  const nguoi = (Array.isArray(tree.persons) ? tree.persons : [])
    .find((p) => p && p.id === personId);
  const ma = nguoi && typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId : '';
  if (!ma) return null;
  return tree.media.find(
    (m) => m && m.subjectId === personId && m.driveFileId === ma && m.deleted !== true
  ) || null;
}

// ============================================================
// Phần trong nhà
// ============================================================

/** Người hoặc hôn nhân mang mã này, hoặc null. */
function tra(tree, id) {
  if (!coGiaTri(id)) return null;
  const ds = loaiCua(id) === 'U'
    ? (Array.isArray(tree.unions) ? tree.unions : [])
    : (Array.isArray(tree.persons) ? tree.persons : []);
  return ds.find((x) => x && x.id === id) || null;
}

/**
 * Mã này có thật trong cây không.
 *
 * Kiểm TRƯỚC KHI ghi, chứ không ghi rồi sửa sau: một bản ghi ảnh trỏ vào mã
 * không tồn tại thì không màn hình nào hiện nó ra, nên không ai phát hiện —
 * nó chỉ nằm đó làm bẩn dữ liệu.
 */
function coChuThe(tree, id) {
  return !!tra(tree, id);
}

/** Ghi dấu người sửa và thời điểm. Nơi gọi đưa đồng hồ vào — hàm này thuần. */
function datMeta(banGhi, ghiNhan) {
  if (!banGhi.meta || typeof banGhi.meta !== 'object') banGhi.meta = {};
  if (ghiNhan && coGiaTri(ghiNhan.luc)) banGhi.meta.updatedAt = String(ghiNhan.luc);
  if (ghiNhan && coGiaTri(ghiNhan.boi)) banGhi.meta.updatedBy = String(ghiNhan.boi);
}
