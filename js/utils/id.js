// ============================================================
// giapha · js/utils/id.js
// Vai trò  : Sinh ID bất biến cho person / union / media / source
// Lớp      : utils — được gọi bởi: services, domains, pages
// Phụ thuộc: utils/text.js
// Phiên bản: 1.2.0 · Cập nhật: 29/08/2026 17:30
// ============================================================
//
// HÀM THUẦN. Không đọc đồng hồ máy, không sinh số ngẫu nhiên: cùng một cây thì
// luôn ra cùng một mã. Nhờ vậy bài kiểm so được kết quả với một chuỗi cố định.
// `sinhMaCay()` cũng thuần — phần "ngẫu nhiên" của nó là một phép băm trên
// chuỗi hạt giống người gọi đưa vào, nên hai máy khác nhau cùng đưa một hạt
// giống thì ra cùng một mã.
//
// --- HAI DẠNG MÃ, CẢ HAI ĐỀU ĐÚNG ---------------------------------------
//
// Từ 29/08/2026 mã người có tiền tố mã cây:  `NTBK7R3_P0060`
// Mã sinh trước ngày ấy KHÔNG có tiền tố:    `P0004`
//
// Chủ dự án chốt 29/08/2026: **mã đang có để nguyên, chỉ mã sinh MỚI mang
// tiền tố.** Nên một cây chạy lâu sẽ chứa cả hai dạng, và đó là trạng thái
// bình thường chứ không phải dữ liệu hỏng. Mọi hàm ở đây đọc được cả hai.
//
// Vì sao có tiền tố: hai gia phả khác nhau đều bắt đầu từ `P0001`, nên khi
// xuất ra GEDCOM rồi nhập vào nhau, mã của cây này đụng mã của cây kia. Tiền
// tố làm mã **tự nó** nói nó sinh ra ở cây nào. Xem `NK-B59` mục 4.
//
// Khuôn tiền tố hợp lệ ở CẢ HAI bản chuẩn GEDCOM (5.5.1 và 7.0): chỉ chữ hoa,
// chữ số và gạch dưới. Gạch nối `-` thì 7.0 không nhận — đừng đổi sang.
// Thân mã trong xref 5.5.1 tối đa 20 ký tự; `NTBK7R3_P0060` là 13.
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
// ⚠ BỘ ĐẾM KHÔNG ĐẶT LẠI THEO TIỀN TỐ. Cây đang có `P0059` thì người tiếp theo
// là `NTBK7R3_P0060`, không phải `NTBK7R3_P0001`. Đánh số lại từ đầu là cấp một
// con số đã dùng cho một người khác — chỉ khác cái tiền tố, mà hai mã trông
// khác nhau thì không ai đi kiểm xem chúng có cùng một số hay không.
//
// ⚠ `nextId()` đọc CÂY, nên gọi hai lần trên CÙNG một cây ra CÙNG một mã. Thêm
// hai bản ghi liền nhau thì phải chèn cái thứ nhất vào cây rồi mới sinh mã cho
// cái thứ hai — đó là lý do `createPerson`/`createUnion` đều trả về CÂY MỚI.

import { removeDiacritics } from './text.js';

const TIEN_TO   = ['P', 'U', 'M', 'S'];
const MANG      = ['persons', 'unions', 'media', 'sources'];
const SO_CHU_SO = 4;

/** Khuôn UID: 8-4-4-4-12 chữ số hex, chữ thường. */
const KHUON_UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Khuôn mã cây đứng một mình: chữ hoa mở đầu, rồi chữ hoa hoặc số. */
const KHUON_MA_CAY = /^[A-Z][A-Z0-9]{0,13}$/;

/** Đúng dạng: mã cây (có thể không có) + một chữ cái tiền tố + ít nhất 4 chữ số. */
const KHUON_ID = /^(?:[A-Z][A-Z0-9]{0,13}_)?[PUMS][0-9]{4,}$/;

/** Bắt mọi mã lẫn trong một chuỗi: 'U0004/NTBK7R3_U0005' ra hai mã. */
const MOI_MA = /(?:[A-Z][A-Z0-9]{0,13}_)?[PUMS][0-9]{4,}/g;

/**
 * Tách một mã thành ba phần. Không đúng khuôn thì trả `null`.
 *
 * @param {string} id
 * @returns {{maCay:string, loai:string, so:number}|null}
 *          `maCay` là chuỗi rỗng với mã đời cũ (`P0004`).
 */
export function tachMa(id) {
  if (typeof id !== 'string' || !KHUON_ID.test(id)) return null;
  const vach = id.lastIndexOf('_');
  const than = vach === -1 ? id : id.slice(vach + 1);
  return {
    maCay: vach === -1 ? '' : id.slice(0, vach),
    loai:  than.charAt(0),
    so:    Number(than.slice(1)),
  };
}

/**
 * Loại của một mã: 'P' người · 'U' hôn nhân · 'M' ảnh · 'S' nguồn.
 * Mã không đúng khuôn trả chuỗi rỗng.
 *
 * ⚠ Dùng hàm này thay cho `id.charAt(0)`. Từ khi mã mang tiền tố, chữ đầu của
 * `NTBK7R3_U0005` là `N` chứ không phải `U` — mọi phép so bằng `charAt(0)` đều
 * lặng lẽ trả lời sai, và sai theo kiểu không có gì báo lỗi.
 */
export function loaiCua(id) {
  const p = tachMa(id);
  return p ? p.loai : '';
}

/**
 * Mã cây đã sinh ra mã này. Mã đời cũ không mang tiền tố nên trả chuỗi rỗng —
 * *"không biết cây nào"*, chứ không phải *"cây khác"*.
 */
export function maCayCua(id) {
  const p = tachMa(id);
  return p ? p.maCay : '';
}

/**
 * Sinh ID kế tiếp chưa từng dùng.
 *
 * @param {'P'|'U'|'M'|'S'} prefix
 * @param {object} tree  cây gia phả (object gốc của file JSON)
 * @returns {string} ví dụ 'NTBK7R3_P0060', hoặc 'P0060' nếu cây chưa có mã cây
 * @throws {Error} khi tiền tố không phải một trong bốn chữ đã quy ước
 *
 * Ném lỗi chứ không lặng lẽ rơi về 'P': gõ nhầm tiền tố mà vẫn sinh ra mã thì
 * bản ghi hôn nhân mang mã người, và cái sai ấy chỉ lộ ra rất lâu sau đó.
 *
 * Cây thiếu `tree.treeCode` thì sinh mã đời cũ, không tự bịa ra một mã cây.
 * Việc điền mã cây là của `services/repo.js` lúc nạp, nơi biết đủ thứ để điền
 * một lần rồi ghi xuống — chứ không phải của một hàm thuần gọi mỗi lần thêm
 * người, vì mỗi lần đoán một kiểu là mỗi lần một tiền tố khác.
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

  const maCay = maCayCuaCay(tree);
  return (maCay ? maCay + '_' : '') + chu + phanSo;
}

/**
 * Kiểm tra chuỗi có đúng dạng ID hay không.
 * Không kiểm mã ấy có tồn tại trong cây không — đó là việc của `buildIndex`.
 */
export function isValidId(id) {
  return typeof id === 'string' && KHUON_ID.test(id);
}

/** Mã cây đang gắn với cây này, hoặc chuỗi rỗng. */
export function maCayCuaCay(tree) {
  const t = tree && typeof tree === 'object' ? tree.tree : null;
  const ma = t && typeof t.treeCode === 'string' ? t.treeCode : '';
  return KHUON_MA_CAY.test(ma) ? ma : '';
}

// ============================================================
// Sinh mã cây
// ============================================================
//
// Mã cây ghép hai phần, và hai phần ấy làm hai việc khác nhau:
//
//   NTB      K7R3
//   ↑        ↑
//   đọc được  phân biệt
//
// Phần đọc được lấy chữ đầu các từ trong tên cây, để người mở file `.ged` bằng
// Notepad còn đoán ra được nó là cây nào. Phần đọc được MỘT MÌNH thì không đủ:
// "Nguyễn Trọng Bắc" và "Nguyễn Trọng Bình" cùng ra `NTB`, mà đó lại đúng là
// hai cây dễ bị nhập nhầm vào nhau nhất. Nên có thêm bốn ký tự băm ra từ hạt
// giống.
//
// ⚠ BỐN KÝ TỰ ẤY XEN KẼ CHỮ–SỐ–CHỮ–SỐ, và đó KHÔNG phải chuyện thẩm mỹ. Bộ
// đếm mã quét mọi chuỗi khớp `[PUMS]` + bốn số trở lên. Một mã cây như
// `LVTS1234` sẽ tự nó khớp `S1234`, và bộ đếm nguồn nhảy lên 1235 vì một cái
// tên. Xen kẽ thì trong mã cây không bao giờ có nổi hai chữ số liền nhau, nên
// ca ấy không xảy ra được — chặn bằng cấu trúc, không bằng lời dặn.

const CHU_BAM = 'ABCDEFGHJKLMNPQRTVWXYZ';   // bỏ I, O, S, U — dễ nhầm khi đọc
const SO_BAM  = '23456789';                 // bỏ 0, 1 — dễ nhầm với O, I

/** Từ chung trong tên gia phả, không mang thông tin phân biệt. */
const TU_BO = ['gia', 'pha', 'ho', 'dong', 'toc', 'cua', 'chi', 'nhanh',
               'ban', 'cay', 'family', 'tree'];

/**
 * Sinh mã cây từ tên gia phả và một chuỗi hạt giống.
 *
 * @param {string} ten  tên gia phả, có dấu cũng được
 * @param {string} hat  chuỗi bất kỳ nhưng phải ỔN ĐỊNH theo cây — cùng một cây
 *                      thì mọi máy, mọi lần gọi đều phải đưa vào cùng một hạt.
 *                      `repo.js` dùng `createdAt` + tên.
 * @returns {string} ví dụ 'NTBK7R3'
 *
 * Hàm THUẦN: không `Math.random()`, không đọc đồng hồ. Hai người mở app cùng
 * lúc trên cùng một cây phải ra cùng một mã, nếu không thì ai lưu trước sẽ đặt
 * một tiền tố, người kia đặt tiền tố khác, và cây mọc ra hai tiền tố.
 */
export function sinhMaCay(ten, hat) {
  return phanDocDuoc(ten) + phanPhanBiet(String(hat == null ? '' : hat));
}

/** Chữ đầu của tối đa bốn từ có nghĩa trong tên cây. Không còn gì thì 'GP'. */
function phanDocDuoc(ten) {
  const sach = removeDiacritics(String(ten == null ? '' : ten))
    .replace(/\([^)]*\)/g, ' ')     // bỏ phần trong ngoặc: "(bản hợp nhất…)"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!sach) return 'GP';

  const chuCai = [];
  for (const tu of sach.split(' ')) {
    if (!tu || TU_BO.indexOf(tu) !== -1) continue;
    const c = tu.charAt(0).toUpperCase();
    if (c >= 'A' && c <= 'Z') chuCai.push(c);
    if (chuCai.length === 4) break;
  }
  return chuCai.length ? chuCai.join('') : 'GP';
}

/** Bốn ký tự xen kẽ chữ–số–chữ–số, băm ra từ hạt giống. */
function phanPhanBiet(hat) {
  const h = bam(hat, 2166136261);
  const lay = (bang, dich) => bang.charAt(Math.floor(h / dich) % bang.length);
  return lay(CHU_BAM, 1) + lay(SO_BAM, 32) +
         lay(CHU_BAM, 512) + lay(SO_BAM, 16384);
}

// ============================================================
// UID — điểm neo đi theo CON NGƯỜI, không theo cây
// ============================================================
//
// Mã người (`NTBK6W4_P0060`) chỉ neo được trong nhà: nó nói *"bản ghi này ở ô
// nào của cây này"*. Nhập từ phần mềm khác thì mã ấy vô nghĩa — PAF gọi cùng
// một con người là `@I1@`, Gramps gọi là `@I0001@`, và app ta cấp cho cả hai
// một mã mới của riêng mình.
//
// UID là tầng neo trên: một mã sinh MỘT LẦN rồi đi theo bản ghi qua mọi phần
// mềm nào chịu giữ nó (`_UID` ở GEDCOM 5.5.1, `UID` ở 7.0). Cùng con người ấy
// dù nằm trong file của phần mềm nào cũng mang đúng một UID.
//
// ⚠ SINH RA THÌ TÍNH ĐƯỢC, NHƯNG PHẢI CẤT ĐI. Mã sinh từ `maCay` + mã người
// nên tính lại lúc nào cũng ra thế — tiện cho bài kiểm, và cho việc điền bù
// hàng loạt mà hai máy vẫn ra cùng kết quả. Nhưng bản ghi nhập từ cây khác
// vào sẽ ĐƯỢC CẤP MÃ MỚI, mà UID của nó thì phải giữ nguyên cái cũ — tính lại
// từ mã mới là bịa ra một con người khác. Nên `uid` luôn được GHI XUỐNG file,
// không bao giờ suy ra lúc cần.
//
// Dạng UUID phiên bản 8 (RFC 9562 — "dành cho cách sinh riêng của từng nơi").
// Không ghi 4: phiên bản 4 nghĩa là sinh ngẫu nhiên, mà mã này thì không.

/**
 * Sinh UID cho một bản ghi. HÀM THUẦN.
 *
 * @param {string} maCay  mã cây đang giữ bản ghi, ví dụ 'NTBK6W4'
 * @param {string} id     mã bản ghi, ví dụ 'NTBK6W4_P0060' hoặc 'P0004'
 * @returns {string} ví dụ '3f2a9c1e-7b4d-8a6f-9e3c-5d1a2b4c6e80'
 *
 * Duy nhất trên toàn cầu nhờ `maCay` duy nhất — hai cây khác nhau không bao
 * giờ đưa vào cùng một cặp tham số.
 */
export function sinhUid(maCay, id) {
  const hat = String(maCay == null ? '' : maCay) + '|' + String(id == null ? '' : id);
  const k = [bam(hat, 2166136261), bam(hat, 271828183),
             bam(hat, 314159265), bam(hat, 987654321)];
  const hex = k.map((n) => n.toString(16).padStart(8, '0')).join('');

  // Nibble 13 là số phiên bản, nibble 17 là biến thể — hai chỗ RFC quy định
  // cứng. Đặt thẳng chứ không mong phép băm tình cờ ra đúng.
  const c = hex.split('');
  c[12] = '8';
  c[16] = '89ab'.charAt(parseInt(c[16], 16) % 4);
  const h = c.join('');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
         h.slice(16, 20) + '-' + h.slice(20, 32);
}

/** Chuỗi có đúng dạng UID không. Nhận cả dạng 32 hex không gạch nối. */
export function laUid(x) {
  return typeof x === 'string' && KHUON_UID.test(x);
}

/**
 * Đưa UID của phần mềm khác về dạng chuẩn của app, hoặc trả rỗng.
 *
 * Nhận ba dạng đang gặp ngoài đời: có gạch nối; 32 hex trơn; và 36 hex trơn —
 * dạng cuối là 32 hex cộng bốn chữ số kiểm của mấy phần mềm đời PAF, phần
 * kiểm ấy KHÔNG thuộc về mã nên cắt bỏ. Cắt nhầm thì hai bản ghi cùng người
 * mang hai UID khác nhau, tức mất neo — nên chỉ cắt đúng ca 36.
 */
export function chuanUid(x) {
  const s = String(x == null ? '' : x).trim().toLowerCase();
  if (KHUON_UID.test(s)) return s;
  const tron = s.replace(/[^0-9a-f]/g, '');
  const h = tron.length === 36 ? tron.slice(0, 32) : tron;
  if (h.length !== 32) return '';
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
         h.slice(16, 20) + '-' + h.slice(20, 32);
}

/** Băm FNV-1a 32 bit, hạt mở đầu đổi được để lấy nhiều đoạn khác nhau. */
function bam(chuoi, mo) {
  let h = mo >>> 0;
  for (let i = 0; i < chuoi.length; i++) {
    h ^= chuoi.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Số lớn nhất đã từng dùng với tiền tố này, tính cả bản ghi mang cờ `deleted`
 * và cả mã chỉ còn dấu vết trong `changeLog`. Chưa dùng mã nào thì trả 0.
 *
 * Đếm CHUNG cho mọi mã cây: `P0059` và `NTBK7R3_P0060` nằm cùng một dãy số.
 */
function soLonNhatDaDung(chu, tree) {
  let lonNhat = 0;
  const nhin = (chuoi) => {
    if (typeof chuoi !== 'string' || chuoi === '') return;
    const cacMa = chuoi.match(MOI_MA);
    if (!cacMa) return;
    for (const ma of cacMa) {
      const p = tachMa(ma);
      if (!p || p.loai !== chu) continue;
      if (Number.isFinite(p.so) && p.so > lonNhat) lonNhat = p.so;
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
