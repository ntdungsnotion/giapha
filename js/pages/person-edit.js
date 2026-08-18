// ============================================================
// giapha · js/pages/person-edit.js
// Vai trò  : Form thêm/sửa người, và các thao tác thêm quan hệ
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{person,union,validate}, services/repo,
//            utils/{graph,text,date}
// Phiên bản: 1.3.1 · Cập nhật: 18/08/2026 16:25
// ============================================================
//
// NGƯỢC với hai màn hình kia: form HIỆN ĐỦ MỌI Ô, kèm chữ mờ gợi ý.
// Không ẩn ô trống — người dùng phải điền được. Thẻ thông tin ẩn hàng trống vì
// nó KỂ về một người; form thì HỎI, mà câu hỏi không hiện ra thì không ai trả
// lời được.
//
// --- TÁM luật của màn hình này (3 · 4–7 · 8, theo ba đợt) ---------------
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
//
// --- THÊM NGƯỜI: ba điều của chat 2.4 (18/08/2026) ----------------------
//
// 4. MỘT LẦN LƯU, KHÔNG PHẢI HAI. Thêm một người con là ba việc — tạo bản ghi
//    người, (đôi khi) tạo một union, nối con vào union — và cả ba đi trong ĐÚNG
//    MỘT lần `luuCay()`. Lưu ba lần thì mỗi lần là một cơ hội để lần sau hỏng:
//    lưu được người rồi mất mạng là gia phả có một người lơ lửng không nối với
//    ai, mà app CHƯA có đường xoá (`softDeletePerson` vẫn là khung).
//
// 5. RÀ CẢ HAI CÂU HỎI. `validateAll(…, 'person')` hỏi *"bản ghi này có ổn
//    không"*; `validateAll(…, 'child')` hỏi *"mối nối này có ổn không"*. Trên
//    cây mới thì hai nhánh chồng lấn nhau gần hết, nhưng gọi cả hai là cách duy
//    nhất không phải NGẦM tin rằng nhánh này đã bao hết nhánh kia — và nhánh
//    `'child'` viết từ bước 17 đến đây mới chạy lần đầu trong app thật. Lời
//    trùng nhau bị gộp lại trước khi hiện (`gopRaSoat`).
//
// 6. CHƯA CÓ ĐƯỜNG XOÁ, NÊN THÊM NHẦM LÀ VẾT VĨNH VIỄN. Vì thế form tự thêm một
//    lời nhắc của RIÊNG nó khi người dùng bấm thêm mà chưa gõ một chữ tên nào.
//    Lời ấy KHÔNG phải phép rà thứ mười: chín luật sống ở `domains/validate.js`
//    và chỉ ở đó. Đây là lời của màn hình, và nó nói rõ mình là ai.
//
// 7. THỨ TỰ ANH CHỊ EM CÓ BA LỰA CHỌN, KHÔNG PHẢI HAI. Người con vừa thêm mà
//    lớn tuổi hơn một anh chị em đang đứng trước thì app hỏi: vẫn thêm · thêm
//    và sắp xếp lại theo tuổi · huỷ bỏ. Không chặn, vì thứ tự anh em không phải
//    lúc nào cũng theo tuổi (con vợ cả chép trước con vợ thứ là lệ có thật);
//    cũng không tự sắp, vì tự sắp là lặng lẽ đổi một thứ người ta đã chép tay.
//    Phép sắp lại chạy TRƯỚC phép rà — luật 1 đòi thứ được rà đúng là thứ được ghi.
//
// --- XOÁ NGƯỜI: luật thứ tám (18/08/2026, chat 2.5a) --------------------
//
// 8. XOÁ THÌ PHẢI KỂ TÊN HẬU QUẢ, VÀ HẬU QUẢ ĐỌC TỪ CÂY MỚI. Xoá một người
//    không tạo ra dữ liệu mới nào để chín luật rà, nên hộp xác nhận KHÔNG chạy
//    `validateAll`. Thứ nó phải nói ra là chuyện khác: xoá người này thì AI bị
//    ảnh hưởng, và ảnh hưởng thế nào. Câu đó chỉ trả lời được bằng cách dựng cây
//    đã xoá rồi `buildIndex()` lại và so hai bên — cùng đúng cái lối của luật 2,
//    và cùng một lý do: đoán bằng chỉ mục CŨ thì đoán sai.
//
//    Một dòng cảnh báo chung ("người này còn quan hệ, chắc chắn xoá?") thì ai
//    cũng bấm qua. Một dòng gọi đúng tên — *"xoá xong thì bà Nhàn không còn nối
//    với ai"* — mới là thứ người ta dừng lại đọc.

import { state } from '../state.js';
import { updatePerson, createPerson,
         softDeletePerson, restorePerson } from '../domains/person.js';
import { createUnion, addChild, reorderChildren,
         thuTuConTheoTuoi } from '../domains/union.js';
import { validateAll, checkOrphanNode } from '../domains/validate.js';
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
let cheDo      = 'sua';  // 'sua' | 'themCon' | 'xoa'
let noiVao     = null;   // chế độ themCon: { unionId } hoặc { chaMeId }
let daXemThuTu = false;  // đã trả lời câu hỏi thứ tự anh chị em
let sapXepLai  = false;  // câu trả lời ấy có phải "sắp xếp lại theo tuổi" không
let xoaHT      = null;   // chế độ xoa: kết quả doHauQuaXoa() của lần mở này

/**
 * Bản ghi rỗng để form thêm người có cái mà vẽ ra các ô trống.
 *
 * `living: true` — chủ dự án chốt 18/08/2026 sau lần thử đầu. Người được thêm
 * bằng tay gần như luôn là người đang sống: người đã khuất thì đã có sẵn trong
 * gia phả từ đợt nhập liệu hàng loạt. Ô này vẫn bỏ dấu được bằng một cú chạm.
 */
const NGUOI_TRONG = {
  names: [], sex: 'U',
  birth: { iso: null, raw: '', place: '' },
  death: { iso: null, raw: '', place: '' },
  burialPlace: '', living: true, note: '',
};

const GIOI = [
  { ma: 'M', chu: 'Nam' },
  { ma: 'F', chu: 'Nữ' },
  { ma: 'U', chu: 'Chưa rõ' },
];

/**
 * Mở form sửa hồ sơ một người. Thêm người mới đi bằng `quickAddChild()`.
 *
 * @param {string} personId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *        `onDaLuu` chạy sau khi máy chủ đã ghi xong, để nơi gọi vẽ lại sơ đồ.
 *        Dùng callback thay vì `import` ngược `tree-view.js` — hai file cùng
 *        lớp `pages`, import vòng tròn thì một trong hai thấy hàm của file kia
 *        là `undefined` tuỳ thứ tự nạp, và lỗi ấy chỉ hiện trên GitHub Pages.
 */
export function openPersonForm(personId, xuLy = {}) {
  const nguoi = personId && state.index && state.index.personById.get(personId);
  if (!nguoi) return;
  moForm('sua', nguoi, null, xuLy);
}

/**
 * Mở form THÊM MỘT NGƯỜI CON.
 *
 * @param {string|{unionId?:string, chaMeId?:string}} vao
 *        mã union để nối con vào; hoặc `{ chaMeId }` khi người ấy chưa có cặp
 *        nào — lúc đó form tạo luôn một union MỘT NGƯỜI trong cùng lần lưu.
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *
 * Nhận cả chuỗi lẫn object: bản khung 15/08 ghi `quickAddChild(unionId)`, và
 * đường ấy vẫn chạy. Chỉ thêm dạng object cho ca người chưa có vợ/chồng — ca
 * rất thường gặp trong gia phả cũ, nơi rất nhiều bà mẹ không còn ai nhớ tên.
 */
export function quickAddChild(vao, xuLy = {}) {
  const nv = chuanNoiVao(vao);
  if (!nv) return;
  moForm('themCon', NGUOI_TRONG, nv, xuLy);
}

/** Đọc và kiểm chỗ nối. Trả null nếu chỗ ấy không có thật trong chỉ mục. */
function chuanNoiVao(vao) {
  const index = state.index;
  if (!index) return null;

  const v = (typeof vao === 'string') ? { unionId: vao } : (vao || {});
  if (v.unionId && index.unionById.has(v.unionId)) return { unionId: v.unionId };
  if (v.chaMeId && index.personById.has(v.chaMeId)) return { chaMeId: v.chaMeId };
  return null;
}

function moForm(che, nguoi, chonNoi, xuLy) {
  closePersonForm();
  xuLyNgoai = xuLy || {};
  cheDo     = che;
  noiVao    = chonNoi;

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
  cheDo        = 'sua';
  noiVao       = null;
  daXemThuTu   = false;
  sapXepLai    = false;
  xoaHT        = null;
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
  const them = cheDo === 'themCon';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = them ? 'Thêm người con' : 'Sửa hồ sơ';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const ten = document.createElement('div');
  ten.textContent = them ? moTaChoNoi() : (fullName(nguoi) + '  ·  ' + nguoi.id);
  ten.style.cssText = 'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  dau.append(tieuDe, ten);
  return dau;
}

/**
 * Câu nói rõ người con này sẽ được nối vào đâu.
 *
 * Phải nói ra, vì đây là thứ duy nhất người dùng kiểm được trước khi bấm: mã
 * union không hiện ở đâu khác trên màn hình, và nối nhầm cặp thì cái sai nằm im
 * trong dữ liệu cho tới lần ai đó xem sơ đồ quanh đúng người ấy.
 */
function moTaChoNoi() {
  const index = state.index;
  if (!noiVao || !index) return '';

  if (noiVao.chaMeId) {
    return 'Con của ' + tenNguoi(noiVao.chaMeId) +
           ' — người này chưa có vợ/chồng nào trong gia phả, nên app sẽ tạo ' +
           'thêm một cặp mới cho riêng họ.';
  }

  const u = index.unionById.get(noiVao.unionId);
  const ten = (Array.isArray(u && u.partners) ? u.partners : [])
    .map(tenNguoi).join('  và  ');
  return 'Con của ' + ten + '  ·  ' + noiVao.unionId;
}

function tenNguoi(personId) {
  const p = state.index && state.index.personById.get(personId);
  const ten = p ? fullName(p) : '';
  return coGiaTri(ten) ? ten : '(chưa có tên)';
}

function veCacO(nguoi) {
  const ra = [];
  const ten = mucTenChinh(nguoi);

  if (cheDo === 'themCon') {
    ra.push(veNhan('Quan hệ với cặp này'));
    ra.push(veConNuoi());
  }

  ra.push(veNhan('Tên'));
  const hangTen = document.createElement('div');
  hangTen.style.cssText = 'display:flex;gap:6px';
  // Chữ mờ là TÊN CỦA Ô, không phải một cái tên ví dụ. Bản đầu gợi ý "Nguyễn ·
  // Trọng · Dũng" — tên một người có thật trong họ — và chủ dự án nêu ngay sau
  // lần thử đầu: chữ mờ ở ba ô liền nhau ghép lại thành một cái tên trọn vẹn
  // thì người dùng đọc ra "app đang mặc định là người này", chứ không đọc ra
  // "đây là ví dụ". Ô ngày thì khác — ở đó chữ mờ dạy CÁCH GÕ, nên giữ nguyên.
  hangTen.append(
    oChu('surname', 'Họ',  ten.surname, 'Họ',  1),
    oChu('middle',  'Đệm', ten.middle,  'Đệm', 1),
    oChu('given',   'Tên', ten.given,   'Tên', 1.2),
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

/**
 * Công tắc con nuôi. Chỉ có ở chế độ thêm con.
 *
 * Không phải chuyện hình thức: `validate.js` bỏ qua MỌI phép rà tuổi sinh học
 * khi thấy đúng chữ `'adopted'` (cha mẹ nuôi trẻ hơn con nuôi là hợp lệ). Đánh
 * dấu sai ở đây là tắt mất bốn phép rà, hoặc bật nhầm bốn phép rà lên một quan
 * hệ không mang ràng buộc nào.
 */
function veConNuoi() {
  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hop = document.createElement('input');
  hop.type = 'checkbox';
  hop.checked = false;
  hop.style.cssText = 'width:18px;height:18px;accent-color:#2a2622';
  o.conNuoi = hop;

  const chu = document.createElement('span');
  chu.textContent = 'Là con nuôi (không phải con đẻ)';

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
  nutLuu.textContent = cheDo === 'themCon' ? 'Thêm người con' : 'Lưu';
  nutLuu.disabled = !luuDuoc;
  nutLuu.style.cssText = KIEU_NUT_CHAN + 'flex:1 1 auto;' +
    (luuDuoc
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;opacity:.45;cursor:not-allowed');
  if (luuDuoc) {
    nutLuu.addEventListener('click', () => {
      if (cheDo === 'themCon') handleAddChild(); else handleSave(nguoi);
    });
  }

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
 * Thêm một người con. Trình tự giống `handleSave`, khác ba chỗ:
 *   - dựng cây mới bằng BA hàm domains nối đuôi nhau (`dungCayThemCon`);
 *   - rà bằng CẢ HAI nhánh `'person'` và `'child'` — luật 5 ở đầu file;
 *   - gửi lên MỘT lần lưu duy nhất, mang cả người lẫn union — luật 4.
 */
async function handleAddChild() {
  if (dangLuu) return;

  const luc    = stampNow();
  const boi    = (state.phien && state.phien.email) || '';
  const quanHe = (o.conNuoi && o.conNuoi.checked) ? 'adopted' : 'birth';

  const dung = dungCayThemCon(state.tree, gomThayDoi(), quanHe, { boi, luc });
  if (!dung) {
    hienNhan('Không nối được người con vào chỗ này. Có thể gia phả vừa thay đổi ' +
             'trong lúc form đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }

  // Thứ tự anh chị em: tính TRƯỚC phép rà, và nếu người dùng đã chọn "sắp xếp
  // lại" thì áp dụng ngay tại đây — luật 1 đòi thứ được rà phải đúng là thứ
  // được ghi, nên không được sắp xếp sau khi rà xong.
  const thuTu = thuTuConTheoTuoi(dung.tree, dung.union.id);
  const lechThuTu = !!(thuTu && !thuTu.hopLe && thuTu.daDoi.indexOf(dung.person.id) >= 0);

  if (lechThuTu && sapXepLai) {
    const kqSap = reorderChildren(dung.tree, dung.union.id, thuTu.thuTuMoi);
    if (kqSap) {
      dung.tree  = kqSap.tree;
      dung.union = kqSap.union;
      Object.assign(dung.diff, kqSap.diff);
    }
  }

  // Luật 2 vẫn nguyên giá trị: rà trên CÂY MỚI với chỉ mục MỚI. Ở đây nó còn
  // bắt buộc hơn lúc sửa — người con này chưa hề tồn tại trong `state.index`,
  // nên rà bằng chỉ mục cũ thì mọi phép soi quan hệ đều không thấy gì.
  const indexMoi = buildIndex(dung.tree);
  const raSoat = gopRaSoat(
    validateAll(dung.tree, indexMoi, 'person', { personId: dung.person.id }),
    validateAll(dung.tree, indexMoi, 'child',
                { childId: dung.person.id, unionId: dung.union.id })
  );

  if (!raSoat.canSave) {
    hienNhan('Chưa thêm được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  const canhBao = loiNhacCuaForm().concat(raSoat.warnings.map((m) => m.message));
  if (canhBao.length > 0 && !daXemCanhBao) {
    daXemCanhBao = true;
    nutLuu.textContent = 'Vẫn thêm';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn thêm" nếu bạn biết là đúng:', false, canhBao);
    return;
  }

  // Câu hỏi thứ tự anh chị em: BA lựa chọn, không phải hai — nên nó có khối
  // riêng chứ không đi chung đường "Vẫn thêm" ở trên.
  if (lechThuTu && !daXemThuTu) {
    hoiThuTuAnhEm(thuTu, dung);
    return;
  }

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const nguoiMoi = dung.person;
  const unionMoi = dung.union;
  const tenMoi   = coGiaTri(fullName(nguoiMoi)) ? fullName(nguoiMoi) : nguoiMoi.id;

  let ketQua;
  try {
    ketQua = await luuCay(
      (cay) => {
        if (!Array.isArray(cay.persons)) cay.persons = [];
        if (!Array.isArray(cay.unions))  cay.unions  = [];

        // Chốt chặn cuối: mã người mới được sinh từ cây lúc mở form, còn hàm này
        // chạy trên bản sao của cây LÚC LƯU. Hai cây ấy lệch nhau thì thà hỏng
        // lần lưu còn hơn ghi hai người trùng mã — `buildIndex()` ném lỗi khi
        // gặp mã trùng, và lúc đó app không mở lại được nữa.
        if (cay.persons.some((p) => p && p.id === nguoiMoi.id)) {
          throw new Error('Mã ' + nguoiMoi.id + ' vừa được dùng cho một người khác. ' +
                          'Tải lại trang rồi thêm lại.');
        }
        cay.persons.push(JSON.parse(JSON.stringify(nguoiMoi)));

        const i = cay.unions.findIndex((u) => u && u.id === unionMoi.id);
        if (i >= 0) cay.unions[i] = JSON.parse(JSON.stringify(unionMoi));
        else        cay.unions.push(JSON.parse(JSON.stringify(unionMoi)));
      },
      {
        action: 'create',
        target: nguoiMoi.id,
        note:   'Thêm ' + (quanHe === 'adopted' ? 'con nuôi ' : 'người con ') + tenMoi +
                ' vào ' + unionMoi.id +
                (dung.laUnionMoi ? ' (cặp mới, tạo cùng lúc)' : '') + ' bằng form nhập liệu.',
        diff:   dung.diff,
      }
    );
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  dangLuu = false;
  if (!lopPhu) return;   // người dùng đã đóng form trong lúc chờ máy chủ

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(nguoiMoi.id);
    return;
  }

  nutLuu.disabled = false;
  nutLuu.style.opacity = '1';

  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa gia phả trong lúc bạn đang gõ, nên app KHÔNG ' +
             'ghi đè lên bản của họ. Người con này CHƯA được thêm. Chép lại ' +
             'phần vừa gõ ra chỗ khác, tải lại trang, rồi thêm lại.', true);
    return;
  }
  hienNhan((ketQua && ketQua.loi) || 'Chưa thêm được, mà máy chủ không nói rõ vì sao.', true);
}

/**
 * Dựng cây mới mang đủ ba thay đổi, bằng ba hàm thuần nối đuôi nhau.
 *
 * ⚠ THỨ TỰ LÀ BẮT BUỘC và không hoán được: `nextId()` đọc cây, nên mỗi hàm phải
 * nhận CÂY TRẢ VỀ của hàm trước. Chạy cả ba trên cùng một cây cũ thì `addChild`
 * không tìm thấy union vừa tạo.
 *
 * @returns {{tree:object, person:object, union:object,
 *            laUnionMoi:boolean, diff:object}|null}
 */
function dungCayThemCon(cay, thayDoi, quanHe, ghiNhan) {
  if (!cay || !noiVao) return null;

  let tree = cay;
  let unionId = noiVao.unionId || '';
  const diff = {};

  if (!unionId) {
    const kqU = createUnion(tree, [noiVao.chaMeId], {});
    if (!kqU) return null;
    tree = kqU.tree;
    unionId = kqU.union.id;
    Object.assign(diff, kqU.diff);
  }

  const kqP = createPerson(tree, thayDoi, ghiNhan);
  if (!kqP) return null;
  tree = kqP.tree;
  Object.assign(diff, kqP.diff);

  const kqC = addChild(tree, unionId, kqP.person.id, quanHe);
  if (!kqC) return null;
  tree = kqC.tree;
  Object.assign(diff, kqC.diff);

  return {
    tree,
    person:     kqP.person,
    union:      kqC.union,
    laUnionMoi: !noiVao.unionId,
    diff,
  };
}

/**
 * Gộp kết quả của hai lượt rà thành một.
 *
 * Hai nhánh `'person'` và `'child'` chồng lấn nhau, nên cùng một lỗi hiện ra
 * hai lần nếu không gộp — mà một danh sách kể hai lần cùng một chuyện thì người
 * đọc tưởng gia phả có hai chỗ hỏng.
 *
 * ⚠ `counts` ở đây là TỔNG của hai lượt, tức có đếm trùng. Nó dùng để gỡ lỗi,
 * KHÔNG dùng làm con số của bản báo cáo rà soát — bản báo cáo chạy nhánh
 * `'tree'` một lượt duy nhất và mới là chỗ con số có nghĩa.
 */
function gopRaSoat(a, b) {
  const ra = {
    canSave: a.canSave && b.canSave,
    errors: [], warnings: [], skipped: [],
    counts: { total: 0, ok: 0, error: 0, warning: 0, skip: 0 },
  };

  for (const ten of ['errors', 'warnings', 'skipped']) {
    const daThay = new Set();
    for (const muc of a[ten].concat(b[ten])) {
      const khoa = muc.check + '|' + muc.message;
      if (daThay.has(khoa)) continue;
      daThay.add(khoa);
      ra[ten].push(muc);
    }
  }
  for (const khoa of Object.keys(ra.counts)) {
    ra.counts[khoa] = (a.counts[khoa] || 0) + (b.counts[khoa] || 0);
  }
  return ra;
}

/**
 * Câu hỏi thứ tự anh chị em — BA lựa chọn.
 *
 * Hiện ra khi người con vừa thêm **lớn tuổi hơn** một anh chị em đang đứng
 * trước mình. Không chặn: thứ tự anh em trong gia phả không phải lúc nào cũng
 * theo tuổi (con vợ cả chép trước con vợ thứ là lệ có thật), nên app hỏi chứ
 * không tự quyết.
 *
 * Nút thứ hai sắp lại **cả union**, không chỉ chỗ người mới — sắp nửa vời thì
 * lần sau lại phải hỏi tiếp. Người con **không đọc được năm sinh thì không bị
 * dịch chỗ**, xem ghi chú của `thuTuConTheoTuoi`.
 */
function hoiThuTuAnhEm(thuTu, dung) {
  const ten = (id) => tenTrongCay(dung.tree, id);
  const nam = (id) => (thuTu.nam.has(id) ? thuTu.nam.get(id) : null);
  const ke  = (ds) => ds.map((id) => ten(id) + (nam(id) ? ' (' + nam(id) + ')' : ''))
                        .join('  ·  ');

  const moiId  = dung.person.id;
  const namMoi = nam(moiId);
  const dungTruoc = thuTu.thuTuHienTai
    .slice(0, thuTu.thuTuHienTai.indexOf(moiId))
    .filter((id) => nam(id) !== null && namMoi !== null && nam(id) > namMoi);

  const cau = ten(moiId) + (namMoi ? ' sinh năm ' + namMoi : '') +
              ', lớn tuổi hơn ' +
              (dungTruoc.length === 1 ? ten(dungTruoc[0]) : dungTruoc.length + ' người') +
              ' đang đứng trước trong hàng anh chị em. Bạn muốn làm gì?';

  hienNhan(cau, false, [
    'Thứ tự hiện nay: ' + ke(thuTu.thuTuHienTai),
    'Nếu sắp lại theo tuổi: ' + ke(thuTu.thuTuMoi),
  ]);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';

  hang.append(
    nutChon('Vẫn thêm, giữ nguyên thứ tự', true, () => {
      daXemThuTu = true; sapXepLai = false; handleAddChild();
    }),
    nutChon('Thêm và sắp xếp lại theo tuổi', false, () => {
      daXemThuTu = true; sapXepLai = true; handleAddChild();
    }),
    nutChon('Huỷ bỏ — quay lại sửa', false, () => {
      // KHÔNG đóng form: người ta vừa gõ xong cả bản ghi, và nhiều khả năng chỉ
      // muốn sửa lại một con số năm sinh. Đóng form ở đây là lấy mất công của họ.
      daXemThuTu   = false;
      sapXepLai    = false;
      daXemCanhBao = false;
      nutLuu.textContent = 'Thêm người con';
      hienNhan('Chưa thêm gì cả. Sửa lại rồi bấm "Thêm người con".', false);
    }),
  );
  khoiKetQua.append(hang);
}

/** Một nút trong khối kết quả. `chinh` = nút được khuyên dùng. */
function nutChon(chu, chinh, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText = KIEU_NUT_CHAN + 'width:100%;text-align:center;' +
    (chinh
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  nut.addEventListener('click', chay);
  return nut;
}

/** Tên một người đọc từ CÂY ĐANG DỰNG — người vừa thêm chưa có trong `index`. */
function tenTrongCay(cay, personId) {
  const p = (cay && Array.isArray(cay.persons))
    ? cay.persons.find((x) => x && x.id === personId) : null;
  const ten = p ? fullName(p) : '';
  return coGiaTri(ten) ? ten : personId;
}

/**
 * Lời nhắc của RIÊNG màn hình này — không phải phép rà thứ mười.
 *
 * Chín luật sống ở `domains/validate.js` và chỉ ở đó. Cái này thuộc về form vì
 * nó nói về một chuyện chỉ form biết: người dùng vừa bấm thêm mà chưa gõ chữ
 * nào. Bản ghi không tên là HỢP LỆ trong gia phả — *"con thứ ba của cụ Bá"* là
 * bản ghi thật — nên không được chặn. Nhưng app chưa có đường xoá người, nên
 * một cú chạm nhầm để lại một cái ô trống vĩnh viễn giữa sơ đồ.
 */
function loiNhacCuaForm() {
  const coTen = ['surname', 'middle', 'given'].some((k) => coGiaTri(docO(k)));
  if (coTen) return [];
  return ['Bạn chưa gõ tên nào cả. Người không tên vẫn ghi được — gia phả cũ ' +
          'có thật những người chỉ còn nhớ là "con thứ ba của cụ" — nhưng app ' +
          'chưa có cách xoá người đã thêm, nên xin xem lại một lần nữa.'];
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
// XOÁ NGƯỜI — luật 8
// ============================================================

/**
 * Mở hộp xác nhận xoá một người, và lo cả đường hoàn tác.
 *
 * @param {string} personId
 * @param {{onDaXoa?:function(string), onDaHoanTac?:function(string),
 *          nguoiThayThe?:string}} [xuLy]
 *        `onDaXoa` chạy NGAY sau khi máy chủ ghi xong, trong lúc hộp vẫn còn mở
 *        — để sơ đồ phía sau vẽ lại và người dùng thấy tận mắt điều vừa xảy ra
 *        trước khi quyết định có hoàn tác hay không.
 *        `nguoiThayThe` là người mà nơi gọi sẽ đưa ra giữa sơ đồ nếu người bị
 *        xoá đang đứng giữa. Truyền vào để hộp GỌI ĐÚNG TÊN họ; hộp này không
 *        tự chọn, vì chọn ai làm trung tâm là việc của `tree-view.js`.
 *
 * Đây KHÔNG phải một form: không ô nào để gõ, nên nó không đi qua `moForm()`.
 * Nhưng nó dùng chung lớp phủ và `closePersonForm()` với form, để không bao giờ
 * có hai lớp phủ của cùng một file chồng lên nhau.
 */
export function xoaNguoi(personId, xuLy = {}) {
  const nguoi = personId && state.index && state.index.personById.get(personId);
  if (!nguoi) return;

  closePersonForm();
  xuLyNgoai = xuLy || {};
  cheDo     = 'xoa';

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  // Luật 8: dựng cây đã xoá NGAY BÂY GIỜ, đọc hậu quả từ chính nó, rồi giữ lại
  // đúng bản ghi ấy để lát nữa ghi xuống. Tính một lần, dùng hai việc — cùng lối
  // của luật 1.
  xoaHT = doHauQuaXoa(personId, { boi, luc });

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

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Xoá khỏi gia phả';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const ten = document.createElement('div');
  ten.textContent = tenNguoi(personId) + '  ·  ' + personId;
  ten.style.cssText = 'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em';

  hop.append(tieuDe, ten);

  khoiKetQua = document.createElement('div');
  hop.append(khoiKetQua);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  hop.append(chan);

  const canTro = canTroLuu();
  if (canTro || !xoaHT) {
    hienNhan(canTro || 'Không dựng được bản ghi đã xoá. Tải lại trang rồi thử lại.', true);
  } else {
    hienNhan('Xoá xong thì:', false, cauKeHauQua(personId));

    nutLuu = nutChanXoa('Xoá người này', true, () => chayXoa(personId));
    chan.append(nutLuu);
  }
  chan.append(nutChanXoa('Không xoá', false, () => closePersonForm()));

  lopPhu.append(hop);
  document.body.append(lopPhu);
}

/**
 * Dựng cây đã xoá, rồi đọc ra ba loại hậu quả bằng cách SO hai chỉ mục.
 *
 * @returns {{kq:object, indexMoi:object, soHangXom:number,
 *            thanhLe:string[], mocCoi:{unionId:string, cacCon:string[]}[]}|null}
 *
 * `thanhLe` — những người mà sau lần xoá này không còn nối với ai. Đọc bằng
 * `checkOrphanNode` của `domains/validate.js`, chạy hai lần trên hai chỉ mục và
 * chỉ giữ ai ĐỔI trạng thái: người vốn đã đứng lẻ từ trước thì không phải hậu
 * quả của việc hôm nay, và kể tên họ ra chỉ làm loãng danh sách.
 *
 * `mocCoi` — những cặp không còn partner nào hiện trên sơ đồ mà vẫn còn con.
 * Đây là chỗ duy nhất một lần xoá đụng tới người KHÁC trên hình: mấy người con
 * ấy vẫn nguyên vẹn trong dữ liệu, chỉ là phía trên đầu họ trống.
 */
function doHauQuaXoa(personId, ghiNhan) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const kq = softDeletePerson(state.tree, personId, ghiNhan);
  if (!kq) return null;

  let indexMoi;
  try {
    indexMoi = buildIndex(kq.tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không xoá còn hơn xoá mù
  }

  const cacUnion = (index.unionsAsPartner.get(personId) || [])
    .concat(index.unionsAsChild.get(personId) || []);

  // Hàng xóm: mọi người đứng chung một union với người này. Đúng MỘT bước, nên
  // không cần tập `visited` — xem ghi chú cùng ý ở đầu `domains/union.js`.
  const hangXom = new Set();
  for (const uid of cacUnion) {
    const u = index.unionById.get(uid);
    if (!u) continue;
    for (const pid of Array.isArray(u.partners) ? u.partners : []) {
      if (pid && pid !== personId && index.personById.has(pid)) hangXom.add(pid);
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      const cid = c && c.personId;
      if (cid && cid !== personId && index.personById.has(cid)) hangXom.add(cid);
    }
  }

  const thanhLe = [];
  for (const id of hangXom) {
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  const mocCoi = [];
  for (const uid of index.unionsAsPartner.get(personId) || []) {
    const u = indexMoi.unionById.get(uid);
    if (!u) continue;
    const conSong = (Array.isArray(u.partners) ? u.partners : [])
      .filter((pid) => pid && indexMoi.personById.has(pid));
    const cacCon = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && c.personId && indexMoi.personById.has(c.personId))
      .map((c) => c.personId);
    if (conSong.length === 0 && cacCon.length > 0) mocCoi.push({ unionId: uid, cacCon });
  }

  return { kq, indexMoi, soHangXom: hangXom.size, thanhLe, mocCoi };
}

/** Từng dòng hậu quả, viết cho người không lập trình đọc. */
function cauKeHauQua(personId) {
  const dong = [];

  dong.push('Bản ghi KHÔNG mất khỏi file. Nó chỉ mang thêm một dấu "đã xoá" và ' +
            'biến mất khỏi sơ đồ. Bấm "Hoàn tác" ngay sau đó là đưa lại được.');

  if (xoaHT.soHangXom > 0) {
    dong.push('Người này đang nối với ' + xoaHT.soHangXom + ' người. KHÔNG ai ' +
              'trong số họ bị xoá theo — con cháu vẫn còn nguyên.');
  }

  // ⚠ Hai khối dưới đây nói về hai chuyện KHÁC HẲN NHAU về mức độ, nên người
  // nào đã bị kể ở khối trên thì khối dưới phải bỏ qua. Bản đầu kể cả hai, và
  // dòng thứ hai hạ nhẹ mức độ của dòng thứ nhất — đúng một người, hai giọng.
  const daKe = new Set(xoaHT.thanhLe);

  for (const id of xoaHT.thanhLe) {
    dong.push('⚠ ' + tenNguoi(id) + ' sẽ MẤT ĐƯỜNG VỀ. Sau khi xoá, không sơ đồ ' +
              'nào còn vẽ ra họ nữa, kể cả sơ đồ của chính họ hàng gần nhất. Bản ' +
              'ghi vẫn nguyên vẹn trong file, và Cài đặt → Rà soát dữ liệu sẽ kể ' +
              'tên họ ra, nhưng app CHƯA có màn hình danh sách để mở họ lên và ' +
              'nối lại. Cân nhắc nối họ vào chỗ khác trước, rồi hãy xoá.');
  }

  for (const m of xoaHT.mocCoi) {
    const conKhac = m.cacCon.filter((id) => !daKe.has(id));
    if (conKhac.length === 0) continue;
    dong.push(conKhac.map(tenNguoi).join(' · ') + ' sẽ không còn cha mẹ nào hiện ' +
              'trên sơ đồ (cặp ' + m.unionId + '). Họ vẫn nối được với người khác ' +
              'nên vẫn tìm tới được, chỉ là phía trên đầu họ trống.');
  }

  if (state.focusPersonId === personId) {
    const thay = xuLyNgoai.nguoiThayThe;
    dong.push('Đây đang là người đứng giữa sơ đồ, nên xoá xong app sẽ chuyển sang ' +
              (thay ? tenNguoi(thay) : 'một người khác') + '.');
  }

  if (state.phien && state.phien.nguoiTrungTamMacDinh === personId) {
    dong.push('Đây còn đang là người trung tâm mặc định của bạn. Sau khi xoá, màn ' +
              'hình Cài đặt sẽ báo mã này không còn ai mang — vào đó đặt lại một ' +
              'người khác.');
  }

  return dong;
}

async function chayXoa(personId) {
  if (dangLuu || !xoaHT) return;

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang xoá…', false);

  // Đúng bản ghi đã dùng để đọc hậu quả ở trên, không phải một bản tính lại.
  const nguoiMoi = xoaHT.kq.person;
  const ten = tenNguoi(personId);

  const ketQua = await ghiMotNguoi(nguoiMoi, {
    action: 'delete',
    target: personId,
    note:   'Xoá mềm ' + ten + ' khỏi gia phả.',
    diff:   xoaHT.kq.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    nutLuu.disabled = false;
    nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Người này CHƯA bị xoá.');
    return;
  }

  // Sơ đồ vẽ lại ngay, trong lúc hộp vẫn mở: người dùng nhìn thấy kết quả rồi
  // mới quyết định có hoàn tác hay không.
  if (xuLyNgoai.onDaXoa) xuLyNgoai.onDaXoa(personId);

  nutLuu = null;
  hienNhan('Đã xoá ' + ten + ' khỏi sơ đồ.', false,
           ['Bản ghi vẫn nằm trong file gia phả, mang dấu "đã xoá".']);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — đưa ' + ten + ' trở lại', true, () => chayHoanTac(personId)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  khoiKetQua.append(hang);
}

async function chayHoanTac(personId) {
  if (dangLuu) return;

  // Dựng lại từ `state.tree` LÚC NÀY, không dùng lại cây cũ: lần xoá vừa rồi đã
  // thay `state.tree` bằng bản của máy chủ, và trong lúc hộp còn mở thì người
  // khác cũng có thể đã ghi thêm.
  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';
  const kq  = restorePerson(state.tree, personId, { boi, luc });

  if (!kq) {
    hienNhan('Không tìm thấy bản ghi để đưa trở lại. Tải lại trang rồi kiểm lại.', true);
    return;
  }

  dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ten = tenTrongCay(kq.tree, personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'restore',
    target: personId,
    note:   'Hoàn tác: đưa ' + ten + ' trở lại gia phả.',
    diff:   kq.diff,
  });
  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Người này VẪN đang bị xoá.');
    return;
  }

  if (xuLyNgoai.onDaHoanTac) xuLyNgoai.onDaHoanTac(personId);

  hienNhan('Đã đưa ' + ten + ' trở lại gia phả.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  khoiKetQua.append(hang);
}

/**
 * Thay đúng MỘT bản ghi người trong cây, qua `repo.luuCay()`.
 *
 * Không tìm thấy mã ấy thì NÉM LỖI thay vì im lặng bỏ qua: hàm sửa chạy trên
 * bản sao của cây LÚC LƯU, khác cây lúc mở hộp. Lặng lẽ không làm gì thì máy chủ
 * vẫn gật, `revision` vẫn tăng, và màn hình báo "đã xoá" cho một việc chưa hề
 * xảy ra.
 */
async function ghiMotNguoi(nguoiMoi, moTa) {
  try {
    return await luuCay((cay) => {
      const ds = Array.isArray(cay.persons) ? cay.persons : [];
      const i = ds.findIndex((p) => p && p.id === nguoiMoi.id);
      if (i < 0) {
        throw new Error('Không còn ai mang mã ' + nguoiMoi.id +
                        ' trong bản trên Drive. Tải lại trang rồi làm lại.');
      }
      ds[i] = JSON.parse(JSON.stringify(nguoiMoi));
    }, moTa);
  } catch (e) {
    return { ok: false, loi: e && e.message ? e.message : String(e) };
  }
}

/** Lời báo khi máy chủ từ chối. `hienTrang` nói rõ dữ liệu đang ở trạng thái nào. */
function hienLoiGhi(ketQua, hienTrang) {
  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa gia phả trong lúc hộp này đang mở, nên app KHÔNG ' +
             'ghi đè lên bản của họ. ' + hienTrang + ' Tải lại trang rồi làm lại.', true);
    return;
  }
  hienNhan((ketQua && ketQua.loi) || 'Máy chủ không nói rõ vì sao. ' + hienTrang, true);
}

/** Nút của hộp xoá. `nguyHiem` = nút màu đỏ, chỉ dùng cho đúng nút xoá. */
function nutChanXoa(chu, nguyHiem, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText = KIEU_NUT_CHAN + 'flex:1 1 45%;text-align:center;' +
    (nguyHiem
      ? 'background:#8a3a2a;color:#fffdf9;border:1px solid #8a3a2a;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  nut.addEventListener('click', chay);
  return nut;
}

// ============================================================
// CHƯA LÀM — chat 2.5b trở đi
// ============================================================
//
// `quickAddChild` đã chạy thật (bước 19), `xoaNguoi` chạy thật từ bước 21. Bốn
// hàm còn lại đi cùng MENU VÒNG TRÒN của thẻ thông tin, nên để cùng một chat —
// dựng nút bây giờ thì có nút mà không có chỗ bấm.
//
// Chúng dùng lại đúng bộ đồ nghề đã có: `createPerson` + `createUnion` +
// `addChild` nối đuôi nhau trên cây, một lần `luuCay()` duy nhất. Riêng `unlink`
// còn cần `removeChild`/`softDeleteUnion` — vẫn là khung — và câu hỏi kèm theo
// đã có câu trả lời, chốt 18/08/2026 ở bước 21:
//
//   Gỡ người con CUỐI CÙNG ra khỏi một union MỘT NGƯỜI thì union ấy hết lý do
//   tồn tại, và phải được xoá mềm TRONG CÙNG lần lưu ấy.
//
// Lý do nằm sẵn trong `layout.js`: union nào có `partners.length < 2` mà
// `children.length === 0` thì sơ đồ bỏ qua, không vẽ. Union một người sinh ra là
// để TREO CON vào (xem ghi chú của `createUnion`); gỡ hết con thì nó thành một
// bản ghi vô hình — không vẽ ra, không sửa được, mà vẫn hiện trong danh sách
// "thêm con vào cặp nào" của thẻ thông tin như một lựa chọn rỗng.
//
// ⚠ Union từ HAI người trở lên thì NGƯỢC LẠI: gỡ hết con vẫn phải giữ. Một cuộc
// hôn nhân là chuyện có thật dù không có con, và sơ đồ vẫn vẽ nó ra.

/** Thêm nhanh bằng vài cú chạm — giống Quick Family Tree. */
export function quickAddParent(childId, sex)   { /* TODO — chat 2.5 */ }
export function quickAddSpouse(personId)       { /* TODO — chat 2.5 */ }

/** Nối / gỡ nối với người đã có sẵn trong cây. */
export function linkExisting(personId, targetId, relationType) { /* TODO — chat 2.5 */ }
export function unlink(personId, targetId, relationType)       { /* TODO — chat 2.5 */ }
