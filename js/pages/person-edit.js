// ============================================================
// giapha · js/pages/person-edit.js
// Vai trò  : Form thêm/sửa người, và các thao tác thêm quan hệ
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{person,validate}, services/repo,
//            utils/{graph,text,date}
// Phiên bản: 1.0.0 · Cập nhật: 17/08/2026 23:10
// ============================================================
//
// NGƯỢC với hai màn hình kia: form HIỆN ĐỦ MỌI Ô, kèm chữ mờ gợi ý.
// Không ẩn ô trống — người dùng phải điền được. Thẻ thông tin ẩn hàng trống vì
// nó KỂ về một người; form thì HỎI, mà câu hỏi không hiện ra thì không ai trả
// lời được.
//
// --- Ba luật của màn hình này -------------------------------------------
//
// 1. THỨ ĐƯỢC RÀ PHẢI ĐÚNG LÀ THỨ ĐƯỢC GHI.
//    Bản ghi mới được tính đúng MỘT lần bằng `updatePerson()`, rồi dùng lại cho
//    cả phép rà lẫn lần ghi. Tính hai lần — một lần cho validate, một lần trong
//    hàm sửa của `luuCay()` — là mở đúng cái khe mà một lỗi gõ phím lọt qua
//    được phép rà rồi rơi xuống Drive.
//
// 2. RÀ TRÊN CÂY MỚI, CHỈ MỤC MỚI. `validateAll(..., 'person', {person})` chỉ
//    soi được hai cái ngày của chính người đó; các phép soi QUAN HỆ vẫn đọc
//    `index` và vẫn thấy năm sinh CŨ (ranh giới đã ghi trong `validate.js`,
//    NK-B17). Nên ở đây dựng cây mới, chạy `buildIndex()` lại, rồi mới rà —
//    59 người thì tức thì, và đổi lại là mọi phép rà cùng nhìn một bản dữ liệu.
//
// 3. GIAO DIỆN CHỈ ĐỔI SAU KHI MÁY CHỦ XÁC NHẬN. Form không đụng `state.tree`;
//    `repo.luuCay()` nhận hàm sửa và tự lo phần đó. Máy chủ lắc đầu thì màn
//    hình vẫn đang hiện đúng bản cũ, không có gì phải lùi lại.
//
// --- Máy chủ KHÔNG chạy lại chín luật (chốt 17/08/2026, chat 2.3) --------
//
// Rà soát nghiệp vụ chỉ có ở trình duyệt. `validate.js` là ES Module nạp từ
// GitHub Pages, Apps Script không import được nó, nên "rà thêm ở máy chủ" thực
// chất là chép chín luật sang `Code.gs` thành bản thứ hai — và hai bản sẽ trôi
// khác nhau. Máy chủ giữ đúng lớp gác của nó (`raSoatTruocKhiGhi_` và luật
// không được giảm bản ghi): nó hỏi "thứ này có phải cây gia phả nguyên vẹn
// không", còn chín luật hỏi "gia phả này có hợp lý không" — hai câu khác nhau.
//
// ⚠ Hệ quả phải nói thẳng: người biên tập sửa tay file JSON trên Drive vẫn qua
// mặt được cả chín luật. Đó là lỗ hổng đã biết từ trước (CLAUDE.md mục 11),
// và rà ở máy chủ cũng KHÔNG bịt được — đường đó không đi qua `luuCay()`.
// Ngưỡng mở lại chuyện này: khi có người ngoài nhóm nhỏ hiện nay được cấp
// quyền sửa.

import { state } from '../state.js';
import { updatePerson } from '../domains/person.js';
import { validateAll } from '../domains/validate.js';
import { luuCay, suaDuoc } from '../services/repo.js';
import { buildIndex } from '../utils/graph.js';
import { fullName, coGiaTri } from '../utils/text.js';
import { formatDate, parseLooseDate, stampNow } from '../utils/date.js';

let lopPhu     = null;   // lớp phủ đang mở, hoặc null
let o          = {};     // các ô nhập, tra theo tên trường
let khoiKetQua = null;   // chỗ hiện lỗi, cảnh báo, lời máy chủ
let nutLuu     = null;
let xuLyNgoai  = {};
let dangLuu    = false;
let daXemCanhBao = false;   // đã hiện cảnh báo và người dùng vẫn muốn lưu

const GIOI = [
  { ma: 'M', chu: 'Nam' },
  { ma: 'F', chu: 'Nữ' },
  { ma: 'U', chu: 'Chưa rõ' },
];

/**
 * Mở form sửa hồ sơ một người.
 *
 * @param {string|null} personId  null = thêm mới (chat 2.4, chưa làm)
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *        `onDaLuu` chạy sau khi máy chủ đã ghi xong, để nơi gọi vẽ lại sơ đồ.
 *        Dùng callback thay vì `import` ngược `tree-view.js` — hai file cùng
 *        lớp `pages`, import vòng tròn thì một trong hai thấy hàm của file kia
 *        là `undefined` tuỳ thứ tự nạp, và lỗi ấy chỉ hiện trên GitHub Pages.
 */
export function openPersonForm(personId /* null = thêm mới */, xuLy = {}) {
  closePersonForm();
  xuLyNgoai = xuLy || {};

  if (!personId) {
    console.warn('[person-edit] thêm người mới là việc của chat 2.4');
    return;
  }
  const nguoi = state.index && state.index.personById.get(personId);
  if (!nguoi) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:35;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;width:100%;max-width:380px;' +
    'max-height:86vh;overflow:auto;box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  hop.append(veDauForm(nguoi));
  hop.append(...veCacO(nguoi));

  khoiKetQua = document.createElement('div');
  hop.append(khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChan(nguoi, !canTro));

  // Bấm ra ngoài KHÔNG đóng form. Khác thẻ thông tin có chủ ý: thẻ chỉ để đọc,
  // đóng nhầm thì mở lại là xong; form thì đang giữ những gì người ta vừa gõ,
  // và một cú chạm trượt làm mất cả là chuyện không tha thứ được.
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

export function closePersonForm() {
  if (lopPhu) lopPhu.remove();
  lopPhu       = null;
  o            = {};
  khoiKetQua   = null;
  nutLuu       = null;
  dangLuu      = false;
  daXemCanhBao = false;
}

/**
 * Lý do không cho lưu, biết TRƯỚC khi người dùng gõ chữ nào. Trả về null nếu
 * lưu được.
 *
 * Nói ngay lúc mở form, không đợi tới lúc bấm Lưu: gõ xong cả bản ghi rồi mới
 * nghe "bạn không có quyền" là mất trắng công của người ta.
 */
function canTroLuu() {
  if (!suaDuoc()) {
    return 'Bạn chỉ có quyền xem gia phả nên chưa lưu được. Xem và sửa thử thì ' +
           'vẫn được, chỉ là bấm Lưu sẽ không ghi xuống Google Drive. Cần sửa ' +
           'thật thì nhờ người quản lý đổi quyền trên Drive.';
  }
  if (state.daLocNguoiConSong) {
    return 'Bản gia phả trong máy đang bị ẩn bớt chi tiết người còn sống, nên ' +
           'không được phép lưu đè lên bản gốc.';
  }
  return null;
}

// ============================================================
// Các mảng của form
// ============================================================

function veDauForm(nguoi) {
  const dau = document.createElement('div');

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sửa hồ sơ';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const ten = document.createElement('div');
  ten.textContent = fullName(nguoi) + '  ·  ' + nguoi.id;
  ten.style.cssText = 'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em';

  dau.append(tieuDe, ten);
  return dau;
}

function veCacO(nguoi) {
  const ra = [];
  const ten = mucTenChinh(nguoi);

  ra.push(veNhan('Tên'));
  const hangTen = document.createElement('div');
  hangTen.style.cssText = 'display:flex;gap:6px';
  hangTen.append(
    oChu('surname', 'Họ',  ten.surname, 'Nguyễn', 1),
    oChu('middle',  'Đệm', ten.middle,  'Trọng',  1),
    oChu('given',   'Tên', ten.given,   'Dũng',   1.2),
  );
  ra.push(hangTen);

  ra.push(veNhan('Giới tính'));
  ra.push(veChonGioi(nguoi.sex));

  ra.push(veNhan('Sinh'));
  ra.push(oNgay('birth', nguoi.birth));
  ra.push(oChu('birthPlace', 'Nơi sinh', khoiNgayCua(nguoi.birth).place, 'Làng Vân, Hà Nam'));

  ra.push(veNhan('Mất'));
  ra.push(oNgay('death', nguoi.death));
  ra.push(oChu('deathPlace', 'Nơi mất', khoiNgayCua(nguoi.death).place, ''));
  ra.push(oChu('burialPlace', 'Nơi an táng', nguoi.burialPlace, ''));
  ra.push(veConSong(nguoi.living === true));

  ra.push(veNhan('Ghi chú'));
  ra.push(oNhieuDong('note', nguoi.note,
                     'Chức tước, quê quán, chuyện gia đình cần nhớ…'));

  return ra;
}

function veNhan(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:16px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:#8a8078';
  return d;
}

/** Một ô nhập một dòng. `phan` là tỷ lệ bề rộng khi nằm cùng hàng với ô khác. */
function oChu(khoa, nhan, giaTri, goiY, phan) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px;' + (phan ? 'flex:' + phan + ' 1 0;min-width:0' : '');

  const input = document.createElement('input');
  input.type = 'text';
  input.value = coGiaTri(giaTri) ? String(giaTri) : '';
  input.placeholder = goiY || '';
  input.setAttribute('aria-label', nhan);
  input.style.cssText = KIEU_O;
  o[khoa] = input;

  boc.append(input);
  if (!phan) {
    // Ô đứng một mình thì cần nhãn nhỏ phía trên, vì placeholder biến mất ngay
    // khi người ta gõ chữ đầu tiên — và lúc quay lại sửa thì không còn gì nói
    // cho biết ô này hỏi cái gì.
    boc.prepend(veNhanO(nhan));
  }
  return boc;
}

function oNhieuDong(khoa, giaTri, goiY) {
  const t = document.createElement('textarea');
  t.value = coGiaTri(giaTri) ? String(giaTri) : '';
  t.placeholder = goiY || '';
  t.rows = 4;
  t.style.cssText = KIEU_O + 'resize:vertical;line-height:1.5';
  o[khoa] = t;
  return t;
}

function veNhanO(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:11px;color:#b3aaa0;margin-bottom:3px';
  return d;
}

/**
 * Ô ngày, kèm một dòng nói MÁY ĐỌC ĐƯỢC GÌ từ chữ vừa gõ.
 *
 * Dòng ấy là chỗ duy nhất người dùng nhìn thấy `parseLooseDate()` làm việc, và
 * nó tồn tại vì một lý do cụ thể: gõ "khoảng 1890" thì app lưu năm 1890 vào
 * `iso` để sắp xếp và tính tuổi, nhưng vẫn giữ nguyên chữ "khoảng 1890" để
 * hiển thị. Không nói ra thì người dùng không biết app hiểu mình thế nào, và
 * cũng không biết vì sao thẻ thông tin lại hiện "khoảng 74 tuổi".
 */
function oNgay(khoa, khoiNgay) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const cu = khoiNgayCua(khoiNgay);
  const input = document.createElement('input');
  input.type = 'text';
  input.value = coGiaTri(cu.raw) ? String(cu.raw) : '';
  input.placeholder = '1948  ·  12/3/1948  ·  khoảng 1948';
  input.setAttribute('aria-label', khoa === 'birth' ? 'Ngày sinh' : 'Ngày mất');
  input.style.cssText = KIEU_O;
  o[khoa] = input;

  const doc = document.createElement('div');
  doc.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';

  const capNhat = () => { doc.textContent = mayDocDuocGi(input.value); };
  input.addEventListener('input', capNhat);
  capNhat();

  boc.append(veNhanO(khoa === 'birth' ? 'Ngày sinh' : 'Ngày mất'), input, doc);
  return boc;
}

/** Câu giải thích dưới ô ngày. Chuỗi rỗng thì không nói gì cả. */
function mayDocDuocGi(chu) {
  const s = typeof chu === 'string' ? chu.trim() : '';
  if (s === '') return '';

  const kq = parseLooseDate(s);
  if (!kq.iso) {
    return 'Máy chưa đọc ra năm nào trong chữ này. Vẫn lưu được, và vẫn hiện ' +
           'đúng chữ bạn gõ — chỉ là app không dùng nó để tính tuổi được.';
  }
  const dep = formatDate({ iso: kq.iso, raw: '' });
  if (kq.confident) return 'Máy đọc được: ' + dep + '.';
  return 'Máy đoán là ' + dep + ', nhưng không chắc. Chữ bạn gõ vẫn giữ nguyên.';
}

function veChonGioi(sexHienTai) {
  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px';

  let dangChon = GIOI.some((g) => g.ma === sexHienTai) ? sexHienTai : 'U';
  const cacNut = [];

  const veLai = () => {
    for (const { ma, nut } of cacNut) {
      const chon = ma === dangChon;
      nut.style.cssText = KIEU_NUT_CHON + (chon
        ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
        : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
    }
  };

  for (const g of GIOI) {
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.textContent = g.chu;
    nut.addEventListener('click', () => { dangChon = g.ma; veLai(); });
    cacNut.push({ ma: g.ma, nut });
    hang.append(nut);
  }
  veLai();

  // Đọc bằng hàm chứ không bằng `.value`: giới tính ở đây là ba cái nút, không
  // phải một ô nhập, nên `docO()` không lấy được. Giữ chung một lối đọc cho cả
  // form thì `gomThayDoi()` không phải biết ô nào là loại gì.
  o.sex = { value: '', doc: () => dangChon };
  return hang;
}

function veConSong(dangSong) {
  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:10px;padding:9px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hop = document.createElement('input');
  hop.type = 'checkbox';
  hop.checked = dangSong === true;
  hop.style.cssText = 'width:18px;height:18px;accent-color:#2a2622';
  o.living = hop;

  const chu = document.createElement('span');
  chu.textContent = 'Người này còn sống';

  nhan.append(hop, chu);
  return nhan;
}

function veChan(nguoi, luuDuoc) {
  const chan = document.createElement('div');
  chan.style.cssText =
    'display:flex;gap:8px;margin-top:18px;position:sticky;bottom:-18px;' +
    'padding:10px 0;background:#fffdf9';

  nutLuu = document.createElement('button');
  nutLuu.type = 'button';
  nutLuu.textContent = 'Lưu';
  nutLuu.disabled = !luuDuoc;
  nutLuu.style.cssText = KIEU_NUT_CHAN + 'flex:1 1 auto;' +
    (luuDuoc
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;opacity:.45;cursor:not-allowed');
  if (luuDuoc) nutLuu.addEventListener('click', () => { handleSave(nguoi); });

  const huy = document.createElement('button');
  huy.type = 'button';
  huy.textContent = 'Huỷ';
  huy.style.cssText = KIEU_NUT_CHAN +
    'flex:0 0 auto;background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8';
  huy.addEventListener('click', () => closePersonForm());

  chan.append(nutLuu, huy);
  return chan;
}

// ============================================================
// Đọc form và lưu
// ============================================================

/**
 * Lưu. Trình tự bắt buộc:
 *   1. Chạy validate.validateAll
 *   2. Nếu có error   -> dừng, hiện lỗi
 *   3. Nếu có warning -> hỏi người dùng có tiếp tục không
 *   4. Gọi repo.luuCay
 *   5. Nếu trả về { lyDo:'xungdot' } -> hiện "người khác vừa sửa,
 *      tải lại trước khi lưu", KHÔNG ghi đè
 */
async function handleSave(nguoi) {
  if (dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  // Bản ghi mới tính đúng MỘT lần, dùng cho cả phép rà lẫn lần ghi — luật 1 ở
  // đầu file. `updatePerson` là hàm thuần, `state.tree` không bị đụng tới.
  const kq = updatePerson(state.tree, nguoi.id, gomThayDoi(), { boi, luc });
  if (!kq) { hienNhan('Không tìm thấy bản ghi của người này nữa. Tải lại trang rồi thử lại.', true); return; }

  if (!kq.thayDoi) {
    hienNhan('Chưa có gì thay đổi so với bản đang lưu, nên không cần lưu lại.', false);
    return;
  }

  // Luật 2: rà trên cây MỚI với chỉ mục MỚI. Đưa bản đang gõ dở vào bằng
  // `{ person }` thì các phép soi quan hệ vẫn đọc năm sinh cũ trong `index`.
  const indexMoi = buildIndex(kq.tree);
  const raSoat = validateAll(kq.tree, indexMoi, 'person', { personId: nguoi.id });

  if (!raSoat.canSave) {
    hienNhan('Chưa lưu được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  if (raSoat.warnings.length > 0 && !daXemCanhBao) {
    daXemCanhBao = true;
    nutLuu.textContent = 'Vẫn lưu';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn lưu" nếu bạn biết là đúng:', false,
             raSoat.warnings.map((m) => m.message));
    return;
  }

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  // Luật 3: `repo.luuCay()` nhận HÀM SỬA và chạy nó trên bản sao của cây. Bản
  // ghi thay vào là `kq.person` — đúng bản vừa được rà, không phải một bản
  // tính lại lần nữa.
  const nguoiMoi = kq.person;
  let ketQua;
  try {
    ketQua = await luuCay(
      (cay) => {
        const ds = Array.isArray(cay.persons) ? cay.persons : [];
        const i = ds.findIndex((p) => p && p.id === nguoi.id);
        if (i >= 0) ds[i] = JSON.parse(JSON.stringify(nguoiMoi));
      },
      {
        action: 'update',
        target: nguoi.id,
        note:   'Sửa hồ sơ ' + fullName(nguoiMoi) + ' bằng form nhập liệu.',
        diff:   kq.diff,
      }
    );
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  dangLuu = false;
  if (!lopPhu) return;   // người dùng đã đóng form trong lúc chờ máy chủ

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(nguoi.id);
    return;
  }

  nutLuu.disabled = false;
  nutLuu.style.opacity = '1';

  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa gia phả trong lúc bạn đang gõ, nên app KHÔNG ' +
             'ghi đè lên bản của họ. Thay đổi của bạn chưa được lưu. Chép lại ' +
             'phần vừa gõ ra chỗ khác, tải lại trang, rồi sửa lại.', true);
    return;
  }
  hienNhan((ketQua && ketQua.loi) || 'Chưa lưu được, mà máy chủ không nói rõ vì sao.', true);
}

/**
 * Gom những gì người dùng vừa gõ thành khối `changes` của `updatePerson`.
 *
 * Gửi CẢ những ô không đổi — `updatePerson` tự so với bản cũ và chỉ ghi vào
 * `diff` phần thật sự khác. Nhờ vậy form không phải nhớ giá trị ban đầu của
 * từng ô, và không có đường nào để hai bên nghĩ khác nhau về "cái gì đã đổi".
 */
function gomThayDoi() {
  return {
    name: {
      surname: docO('surname'),
      middle:  docO('middle'),
      given:   docO('given'),
    },
    sex:         docO('sex'),
    living:      !!(o.living && o.living.checked),
    burialPlace: docO('burialPlace'),
    note:        docO('note'),
    birth: { raw: docO('birth'), place: docO('birthPlace') },
    death: { raw: docO('death'), place: docO('deathPlace') },
  };
}

function docO(khoa) {
  const el = o[khoa];
  if (!el) return '';
  if (typeof el.doc === 'function') return el.doc();
  return typeof el.value === 'string' ? el.value : '';
}

/** @param {string[]} [dong] mỗi dòng một lời của bộ rà soát */
function hienNhan(chu, laLoi, dong) {
  if (!khoiKetQua) return;
  khoiKetQua.innerHTML = '';

  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:14px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4');
  khoiKetQua.append(d);

  for (const chuDong of (dong || [])) {
    const m = document.createElement('div');
    m.textContent = '• ' + chuDong;
    m.style.cssText =
      'margin-top:6px;padding:7px 10px;font-size:12px;line-height:1.5;' +
      'border-radius:8px;background:#faf8f5;border:1px solid #f0ebe4;color:#5c554e';
    khoiKetQua.append(m);
  }
}

// ============================================================
// Hàm dùng trong file
// ============================================================

/** Mục tên chính, đọc theo đúng quy tắc của `utils/text.fullName`. */
function mucTenChinh(nguoi) {
  const ds = Array.isArray(nguoi.names) ? nguoi.names : [];
  const muc = ds.find((n) => n && n.type === 'chinh') || ds[0] || {};
  return { surname: muc.surname || '', middle: muc.middle || '', given: muc.given || '' };
}

function khoiNgayCua(khoi) {
  if (!khoi || typeof khoi !== 'object') return { iso: null, raw: '', place: '' };
  return khoi;
}

const KIEU_O =
  'width:100%;box-sizing:border-box;padding:9px 10px;font-size:15px;' +
  'font-family:inherit;color:#2a2622;background:#fff;border:1px solid #e6e0d8;' +
  'border-radius:8px;outline-color:#8a6a3a;';

const KIEU_NUT_CHON =
  'flex:1 1 0;min-height:40px;padding:0 8px;font-size:14px;font-family:inherit;' +
  'border-radius:9px;cursor:pointer;touch-action:manipulation;';

const KIEU_NUT_CHAN =
  'min-height:44px;padding:0 16px;font-size:14px;font-family:inherit;' +
  'border-radius:9px;cursor:pointer;touch-action:manipulation;';

// ============================================================
// CHƯA LÀM — chat 2.4
// ============================================================
//
// Bốn hàm dưới đây đều THÊM bản ghi, và thêm bản ghi thì phải sinh mã mới
// (`utils/id.js`, cũng còn là khung) rồi nối vào `unions`. Đó là một việc trọn
// vẹn của chat 2.4, không phải phần đuôi của chat 2.3.

/** Thêm nhanh bằng vài cú chạm — giống Quick Family Tree. */
export function quickAddParent(childId, sex)   { /* TODO — chat 2.4 */ }
export function quickAddSpouse(personId)       { /* TODO — chat 2.4 */ }
export function quickAddChild(unionId)         { /* TODO — chat 2.4 */ }

/** Nối / gỡ nối với người đã có sẵn trong cây. */
export function linkExisting(personId, targetId, relationType) { /* TODO — chat 2.4 */ }
export function unlink(personId, targetId, relationType)       { /* TODO — chat 2.4 */ }
