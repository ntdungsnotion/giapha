// ============================================================
// giapha · js/utils/id.js
// Vai trò  : Sinh ID bất biến cho person / union / media / source
// Lớp      : utils — được gọi bởi: services, domains, pages
// Phụ thuộc: (không)
// Phiên bản: 1.0.0 · Cập nhật: 18/08/2026 08:53
// ============================================================
//
// HÀM THUẦN. Không đọc đồng hồ máy, không sinh số ngẫu nhiên: cùng một cây thì
// luôn ra cùng một mã. Nhờ vậy bài kiểm so được kết quả với một chuỗi cố định.
//
// --- VÌ SAO PHẢI QUÉT CẢ `changeLog` ------------------------------------
//
// App KHÔNG xoá cứng (chốt 17/08/2026, chat 2.1): xoá là đặt cờ `deleted`, bản
// ghi vẫn nằm nguyên trong mảng. Nên chỉ quét `persons` là đã tránh được phần
// lớn chuyện trùng mã — nhưng chưa đủ.
//
// Chỗ hở là những bản ghi đã rời khỏi mảng bằng đường KHÁC: người biên tập sửa
// tay file JSON trên Drive rồi xoá hẳn một dòng (lỗ hổng đã biết, CLAUDE.md mục
// 11), hoặc một lần nhập file ở giai đoạn 3 thay cả mảng. Dấu vết duy nhất còn
// lại của những bản ghi ấy là `changeLog` — thứ CỐ Ý không bao giờ cắt bớt.
//
// Cấp lại một mã đã dùng là kiểu hỏng tệ nhất trong gia phả: không có gì báo
// lỗi, chỉ là mọi câu chuyện cũ về mã ấy lặng lẽ dính sang một người khác.
//
// Quét `target` và các khoá của `diff`, KHÔNG quét `note`. `note` là văn xuôi
// người viết; một câu như "gộp nhánh P0033–P0053" thì hai mã ấy đằng nào cũng
// nằm trong mảng, còn một câu bàn về mã tưởng tượng thì đẩy bộ đếm nhảy vọt vô
// cớ. `target` và khoá `diff` là chỗ mã ĐƯỢC GHI CÓ CẤU TRÚC, nên chỉ quét đó.
//
// ⚠ `nextId()` đọc CÂY, nên gọi hai lần trên CÙNG một cây ra CÙNG một mã. Thêm
// hai bản ghi liền nhau thì phải chèn cái thứ nhất vào cây rồi mới sinh mã cho
// cái thứ hai — đó là lý do `createPerson`/`createUnion` đều trả về CÂY MỚI.

const TIEN_TO   = ['P', 'U', 'M', 'S'];
const MANG      = ['persons', 'unions', 'media', 'sources'];
const SO_CHU_SO = 4;

/** Đúng dạng: một chữ cái tiền tố + ít nhất 4 chữ số. */
const KHUON_ID = /^[PUMS][0-9]{4,}$/;

/** Bắt mọi mã lẫn trong một chuỗi: 'U0004/U0005' ra hai mã. */
const MOI_MA = /[PUMS][0-9]{4,}/g;

/**
 * Sinh ID kế tiếp chưa từng dùng.
 *
 * @param {'P'|'U'|'M'|'S'} prefix
 * @param {object} tree  cây gia phả (object gốc của file JSON)
 * @returns {string} ví dụ 'P0060'
 * @throws {Error} khi tiền tố không phải một trong bốn chữ đã quy ước
 *
 * Ném lỗi chứ không lặng lẽ rơi về 'P': gõ nhầm tiền tố mà vẫn sinh ra mã thì
 * bản ghi hôn nhân mang mã người, và cái sai ấy chỉ lộ ra rất lâu sau đó.
 */
export function nextId(prefix, tree) {
  const chu = String(prefix == null ? '' : prefix).trim().toUpperCase();
  if (TIEN_TO.indexOf(chu) === -1) {
    throw new Error('Tiền tố ID không hợp lệ: "' + prefix + '". ' +
                    'Chỉ có P (người), U (hôn nhân), M (ảnh), S (nguồn).');
  }
  const so = soLonNhatDaDung(chu, tree) + 1;
  let phanSo = String(so);
  while (phanSo.length < SO_CHU_SO) phanSo = '0' + phanSo;
  return chu + phanSo;
}

/**
 * Kiểm tra chuỗi có đúng dạng ID hay không.
 * Không kiểm mã ấy có tồn tại trong cây không — đó là việc của `buildIndex`.
 */
export function isValidId(id) {
  return typeof id === 'string' && KHUON_ID.test(id);
}

/**
 * Số lớn nhất đã từng dùng với tiền tố này, tính cả bản ghi mang cờ `deleted`
 * và cả mã chỉ còn dấu vết trong `changeLog`. Chưa dùng mã nào thì trả 0.
 */
function soLonNhatDaDung(chu, tree) {
  let lonNhat = 0;
  const nhin = (chuoi) => {
    if (typeof chuoi !== 'string' || chuoi === '') return;
    const cacMa = chuoi.match(MOI_MA);
    if (!cacMa) return;
    for (const ma of cacMa) {
      if (ma.charAt(0) !== chu) continue;
      const n = Number(ma.slice(1));
      if (Number.isFinite(n) && n > lonNhat) lonNhat = n;
    }
  };

  if (!tree || typeof tree !== 'object') return lonNhat;

  // 1. Mọi bản ghi đang nằm trong cây, KỂ CẢ bản ghi đã xoá mềm.
  for (const ten of MANG) {
    const ds = Array.isArray(tree[ten]) ? tree[ten] : [];
    for (const banGhi of ds) if (banGhi) nhin(banGhi.id);
  }

  // 2. Dấu vết của những bản ghi không còn trong cây nữa.
  const nhatKy = Array.isArray(tree.changeLog) ? tree.changeLog : [];
  for (const muc of nhatKy) {
    if (!muc || typeof muc !== 'object') continue;
    nhin(muc.target);
    if (muc.diff && typeof muc.diff === 'object') {
      for (const khoa of Object.keys(muc.diff)) nhin(khoa);
    }
  }

  return lonNhat;
}
