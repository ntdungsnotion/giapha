// ============================================================
// giapha · js/pages/person-edit.js
// Vai trò  : Form thêm/sửa người và SỬA CẶP, ảnh đại diện, thêm quan hệ,
//            SẮP THỨ TỰ ANH CHỊ EM, xoá · hoàn tác · đưa trở lại từ thùng rác
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{person,union,validate,media,render},
//            services/{repo,gas}, utils/{graph,text,date,image}
// Phiên bản: 1.10.0 · Cập nhật: 21/08/2026 09:40
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
//
// --- NỐI VÀ GỠ NỐI: hai luật của bước 26 (20/08/2026, chat 2.5c) --------
//
// 9. QUAN HỆ CHA MẸ – CON ĐI QUA CẶP, KHÔNG NỐI THẲNG NGƯỜI VỚI NGƯỜI. Nên hai
//    việc mà người dùng tưởng là một thì thật ra là một, và phải nói ra:
//      · gỡ một người khỏi hàng VỢ/CHỒNG của một cặp còn con ⟹ người ấy đồng
//        thời thôi làm cha/mẹ của TẤT CẢ những người con của cặp ấy;
//      · gỡ nối với "cha" ⟹ không có cách nào giữ lại "mẹ", vì thứ bị gỡ là
//        mối nối tới CẶP. Nên màn hình này kể cha mẹ theo CẶP, mỗi cặp một
//        dòng, không kể theo từng người — một nút bấm phải bằng đúng một việc.
//    Muốn bỏ hôn nhân mà giữ quan hệ cha con thì thứ phải đổi là `status` của
//    cặp (`'divorced'`), không phải `partners`.
//
// 10. GỠ XONG PHẢI HỎI TIẾP: *"CẶP NÀY CÒN KHẲNG ĐỊNH ĐƯỢC ĐIỀU GÌ KHÔNG?"*
//    Câu trả lời là `union.conLyDoTonTai()`, và hộp xác nhận phải KỂ RA trước
//    khi làm khi câu trả lời là không — vì lúc ấy cả cặp bị xoá mềm theo, và đó
//    là một việc lớn hơn nhiều so với thứ người dùng vừa bấm. Cùng đúng tinh
//    thần của luật 8: một lần bấm không được gây ra thứ gì mà hộp chưa kể tên.

import { state } from '../state.js';
import { updatePerson, createPerson,
         softDeletePerson, restorePerson } from '../domains/person.js';
import { createUnion, addChild, addPartner, removeChild, removePartner,
         softDeleteUnion, restoreUnion, conLyDoTonTai, reorderChildren,
         thuTuConTheoTuoi, updateUnion, swapPartnerOrder,
         getParentUnions, getPartnerUnions, getSpouses, getChildren } from '../domains/union.js';
import { validateAll, checkOrphanNode } from '../domains/validate.js';
import { datAnhDaiDien, clearPortrait } from '../domains/media.js';
import { mauVien } from '../domains/render.js';
import { luuCay, suaDuoc } from '../services/repo.js';
import { taiAnh } from '../services/gas.js';
import { buildIndex } from '../utils/graph.js';
import { fullName, coGiaTri } from '../utils/text.js';
import { formatDate, parseLooseDate, stampNow, mocNgay } from '../utils/date.js';
import { compressImage, driveThumbUrl, anhMacDinhUri, dataUri, moTaCo }
  from '../utils/image.js';

let lopPhu     = null;   // lớp phủ đang mở, hoặc null
let o          = {};     // các ô nhập, tra theo tên trường
let khoiKetQua = null;   // chỗ hiện lỗi, cảnh báo, lời máy chủ
let nutLuu     = null;
let xuLyNgoai  = {};
let dangLuu    = false;
let daXemCanhBao = false;   // đã hiện cảnh báo và người dùng vẫn muốn lưu
// 'sua' · 'themCon' · 'themChaMe' · 'themBanDoi' · 'xoa' · 'chon' · 'noi' · 'go'
// · 'suaCap' (bước 29) · 'sapThuTu' (21/08/2026)
let cheDo      = 'sua';
// themCon    : { unionId } hoặc { chaMeId }
// themChaMe  : { childId, unionId, gioi }   — unionId rỗng = tạo cặp cha mẹ mới
// themBanDoi : { banDoiId, unionId }        — unionId rỗng = tạo cặp mới
let noiVao     = null;
let daXemThuTu = false;  // đã trả lời câu hỏi thứ tự anh chị em
let sapXepLai  = false;  // câu trả lời ấy có phải "sắp xếp lại theo tuổi" không
let xoaHT      = null;   // chế độ xoa: kết quả doHauQuaXoa() của lần mở này
let noiCtx     = null;   // chế độ noi: { personId, targetId, loai, unionId }
let goHT       = null;   // chế độ go : kết quả doHauQuaGoNoi() của lần mở này
let capDangSua = null;   // chế độ suaCap: mã cặp đang mở trong form

// --- SẮP THỨ TỰ ANH CHỊ EM (21/08/2026) ---------------------------------
let sapCtx = null;   // { unionId, mocId, laCon, thuTu[] } — thứ tự đang sắp DỞ
let sapDay = null;   // khối chứa dãy thẻ, để vẽ lại một mình nó
let sapKeo = null;   // { tu:number } — đang kéo thẻ thứ mấy, null là không kéo

// --- ẢNH ĐẠI DIỆN (bước 28) ---------------------------------------------
//
// ⚠ **Ảnh lên Drive NGAY khi chọn, còn hồ sơ chỉ đổi khi bấm Lưu.** Hai việc
// ấy KHÔNG gộp được: tải ảnh là một lần gọi máy chủ riêng, không đi qua
// `luuCay()`. Hệ quả phải nói ra, và app nói thẳng bằng chữ ngay dưới nút:
//
//   Chọn ảnh rồi ĐÓNG FORM mà không lưu → tấm ảnh vẫn nằm lại trên Drive,
//   chỉ là không ai trỏ tới nó. Vài chục KB, không hỏng gì.
//
// Đường ngược lại — lưu hồ sơ trước rồi mới tải ảnh — tệ hơn nhiều: máy chủ
// nhận hồ sơ xong mà ảnh hỏng giữa chừng thì `photoFileId` trỏ vào một file
// không tồn tại, và ô sơ đồ mang một khoảng trống không ai giải thích được.
let khoiAnh = null;   // tham chiếu tới khối, để vẽ lại một mình nó
let anhChon = null;   // { fileId, xemTruoc, ten, co } — vừa tải lên xong
let anhBo   = false;  // người dùng đã bấm "Bỏ ảnh"
let anhDangTai = false;

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
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-nguoi';   // mốc cho bài kiểm hành vi, xem kiem-noi-go.mjs
  hop.style.cssText = KIEU_HOP;

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
  noiCtx       = null;
  goHT         = null;
  capDangSua   = null;
  sapCtx       = null;
  sapDay       = null;
  sapKeo       = null;
  khoiAnh      = null;
  anhChon      = null;
  anhBo        = false;
  anhDangTai   = false;
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

/** Ba chế độ dựng một bản ghi MỚI. Chế độ 'sua' đọc một bản ghi đã có. */
function laCheDoThem() {
  return cheDo === 'themCon' || cheDo === 'themChaMe' || cheDo === 'themBanDoi';
}

/**
 * Tiêu đề form. Chế độ thêm cha mẹ nói rõ CHA hay MẸ khi biết — người dùng vừa
 * bấm đúng một trong hai nút ấy, nên tiêu đề nói lại "Thêm cha / mẹ" là làm họ
 * phải kiểm lại xem mình bấm trúng chưa.
 */
function tieuDeForm() {
  if (cheDo === 'themCon')    return 'Thêm người con';
  if (cheDo === 'themBanDoi') return 'Thêm vợ / chồng';
  // Không còn "Thêm cha" / "Thêm mẹ" riêng: từ 20/08/2026 chính ô GIỚI TÍNH
  // trong form là chỗ nói ra điều đó, và tiêu đề không được nói trước một thứ
  // người dùng chưa chọn.
  if (cheDo === 'themChaMe') return 'Thêm cha / mẹ';
  return 'Sửa hồ sơ';
}

function veDauForm(nguoi) {
  const dau = document.createElement('div');
  const them = laCheDoThem();

  const tieuDe = document.createElement('div');
  tieuDe.textContent = tieuDeForm();
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

  if (cheDo === 'themChaMe') {
    if (!noiVao.unionId) {
      return 'Cha / mẹ của ' + tenNguoi(noiVao.childId) +
             ' — app sẽ tạo thêm một cặp cha mẹ mới rồi nối ' +
             tenNguoi(noiVao.childId) + ' vào đó làm con.';
    }
    return 'Cha / mẹ của ' + tenNguoi(noiVao.childId) +
           ' — đứng chung cặp với ' + keTenPartner(noiVao.unionId) +
           '  ·  ' + noiVao.unionId;
  }

  if (cheDo === 'themBanDoi') {
    return 'Vợ / chồng của ' + tenNguoi(noiVao.banDoiId) +
           ' — app tạo một cặp mới cho hai người. Người này KHÔNG tự thành ' +
           'cha/mẹ của con sẵn có của ' + tenNguoi(noiVao.banDoiId) + '.';
  }

  if (noiVao.chaMeId) {
    return 'Con của ' + tenNguoi(noiVao.chaMeId) +
           ' — người này chưa có vợ/chồng nào trong gia phả, nên app sẽ tạo ' +
           'thêm một cặp mới cho riêng họ.';
  }

  return 'Con của ' + keTenPartner(noiVao.unionId) + '  ·  ' + noiVao.unionId;
}

/** Tên những người đang đứng trong một cặp. Cặp một người thì ra đúng một tên. */
function keTenPartner(unionId) {
  const u = state.index && state.index.unionById.get(unionId);
  const ds = (Array.isArray(u && u.partners) ? u.partners : [])
    .filter((id) => id && state.index.personById.has(id))
    .map(tenNguoi);
  return ds.length > 0 ? ds.join('  và  ') : '(cặp chưa có ai)';
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
    ra.push(veConNuoi('Là con nuôi (không phải con đẻ)'));
  }
  // Chỉ hỏi khi đang TẠO cặp cha mẹ mới. Nối thêm một người vào cặp đã có thì
  // quan hệ đẻ/nuôi của người con với cặp ấy đã ghi từ trước, và hỏi lại ở đây
  // là mời người dùng đổi một thứ họ không định đụng tới.
  if (cheDo === 'themChaMe' && !noiVao.unionId) {
    ra.push(veNhan('Quan hệ với ' + tenNguoi(noiVao.childId)));
    ra.push(veConNuoi('Là cha / mẹ NUÔI (không phải cha mẹ đẻ)'));
  }

  // Ảnh chỉ hiện ở chế độ SỬA hồ sơ, cố ý. Ở các chế độ thêm người, bản ghi
  // chưa tồn tại nên chưa có mã để gắn ảnh vào, mà dựng đường gắn ảnh cho một
  // người chưa có mã là mở thêm một nhánh nữa trong một hàm lưu vốn đã nhiều
  // nhánh. Thêm người xong, mở lại hồ sơ rồi gắn ảnh — thêm đúng một cú chạm.
  if (cheDo === 'sua') {
    ra.push(veNhan('Ảnh đại diện'));
    ra.push(veKhoiAnh(nguoi));
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
  // Thêm vợ/chồng: giới tính suy ra được từ người kia, nên điền sẵn và KHOÁ.
  // Thêm cha/mẹ: KHÔNG khoá — từ bước 27 chính ô này là chỗ nói đây là cha hay
  // là mẹ, nên khoá nó là bịt mất câu hỏi duy nhất của cả cái form.
  const khoaGioi = cheDo === 'themBanDoi' && !!(noiVao && noiVao.gioiNguoc);
  ra.push(veChonGioi(nguoi.sex, khoaGioi));
  if (khoaGioi) ra.push(veDongGioi(noiVao.gioiMoc, noiVao.gioiNguoc, tenNguoi(noiVao.banDoiId)));

  ra.push(veNhan('Sinh'));
  ra.push(oNgay('birth', nguoi.birth));
  ra.push(oChu('birthPlace', 'Nơi sinh', khoiNgayCua(nguoi.birth).place, 'Làng Vân, Hà Nam'));

  ra.push(veNhan('Mất'));
  ra.push(oNgay('death', nguoi.death));
  ra.push(oChu('deathPlace', 'Nơi mất', khoiNgayCua(nguoi.death).place, ''));
  ra.push(oChu('burialPlace', 'Nơi an táng', nguoi.burialPlace, ''));
  // Ngày giỗ là ngày ÂM LỊCH và app KHÔNG suy ra nó từ ngày mất dương lịch —
  // xem `utils/text.ngayGio()`. Nên đây là ô CHỮ TỰ DO, chữ mờ dạy cách gõ.
  ra.push(oChu('gio', 'Ngày giỗ (âm lịch)',
               (nguoi.vn && nguoi.vn.gio) || '', '20 tháng Chạp'));
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

// ============================================================
// Khối ẢNH ĐẠI DIỆN — bước 28
// ============================================================

function veKhoiAnh(nguoi) {
  khoiAnh = document.createElement('div');
  veLaiKhoiAnh(nguoi);
  return khoiAnh;
}

/**
 * Vẽ lại một mình khối ảnh, không đụng tới các ô khác.
 *
 * ⚠ **Không dựng lại cả form.** Người dùng có thể đã gõ dở tên, ngày tháng,
 * ghi chú; dựng lại cả form là xoá sạch những thứ ấy. Đây đúng là cái bẫy mà
 * `settings.js` đã tránh bằng cách giữ tham chiếu tới từng khối.
 */
function veLaiKhoiAnh(nguoi) {
  const khoi = khoiAnh;
  if (!khoi) return;
  khoi.innerHTML = '';

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:12px;align-items:center';

  hang.append(veXemTruocAnh(nguoi));

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px';

  cot.append(nutChonAnh(nguoi));
  if (coAnhSauKhiLuu(nguoi)) cot.append(nutBoAnh(nguoi));

  hang.append(cot);
  khoi.append(hang);

  const loi = document.createElement('div');
  loi.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:8px';
  loi.textContent = moTaTrangThaiAnh(nguoi);
  khoi.append(loi);
}

/** Ảnh đang xem trước: ảnh vừa chọn > ảnh cũ > bóng người. */
function veXemTruocAnh(nguoi) {
  const co = 72;
  const boc = document.createElement('div');
  boc.style.cssText =
    'flex:0 0 auto;width:' + co + 'px;height:' + co + 'px;border-radius:50%;' +
    'overflow:hidden;box-shadow:0 0 0 1.5px #fff, 0 0 0 3px ' + mauVien(nguoi) + '55;' +
    'opacity:' + (anhDangTai ? '0.5' : '1');

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoi && nguoi.sex, mauVien(nguoi));
  boc.append(im);

  if (anhChon) {
    // Xem trước bằng chính chuỗi vừa nén ở máy này — không đợi Drive dựng
    // thumbnail, và không tốn một lần tải nào.
    im.src = dataUri(anhChon.xemTruoc);
  } else if (!anhBo) {
    const cu = nguoi && typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId.trim() : '';
    if (cu) {
      const duong = driveThumbUrl(cu, co * 2);
      const thu = new Image();
      thu.onload = () => {
        if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
      };
      thu.src = duong;
    }
  }

  return boc;
}

function nutChonAnh(nguoi) {
  const batDuoc = suaDuoc() && !anhDangTai && !dangLuu;

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:block;min-height:40px;padding:10px 12px;box-sizing:border-box;' +
    'font-size:14px;text-align:center;border-radius:9px;border:1px solid #e6e0d8;' +
    'background:#faf8f5;line-height:1.3;' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45');
  nhan.textContent = anhDangTai ? 'Đang tải lên…' : (anhChon ? 'Chọn ảnh khác' : 'Chọn ảnh');

  const oFile = document.createElement('input');
  oFile.type = 'file';
  oFile.accept = 'image/*';
  oFile.disabled = !batDuoc;
  oFile.style.cssText = 'display:none';
  oFile.addEventListener('change', () => {
    const f = oFile.files && oFile.files[0];
    if (f) chonVaTaiAnh(f, nguoi);
  });

  nhan.append(oFile);
  return nhan;
}

function nutBoAnh(nguoi) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Bỏ ảnh';
  b.disabled = anhDangTai || dangLuu;
  b.style.cssText =
    'min-height:36px;padding:7px 12px;font-size:13px;font-family:inherit;' +
    'border-radius:9px;border:1px solid #e6e0d8;background:#fffdf9;color:#8a3a2a;' +
    'cursor:pointer;touch-action:manipulation';
  b.addEventListener('click', () => {
    anhChon = null;
    anhBo   = true;
    veLaiKhoiAnh(nguoi);
  });
  return b;
}

/** Sau khi bấm Lưu thì người này còn ảnh hay không. */
function coAnhSauKhiLuu(nguoi) {
  if (anhChon) return true;
  if (anhBo) return false;
  return !!(nguoi && typeof nguoi.photoFileId === 'string' && nguoi.photoFileId.trim());
}

/**
 * Câu tường thuật dưới khối ảnh.
 *
 * Nói ra điều KHÔNG hiển nhiên: ảnh đã nằm trên Drive rồi, nhưng hồ sơ thì
 * chưa đổi. Không nói thì người dùng đóng form và đinh ninh là xong.
 */
function moTaTrangThaiAnh(nguoi) {
  if (anhDangTai) return 'Đang nén và tải ảnh lên Google Drive…';
  if (anhChon) {
    return 'Ảnh đã lên Drive (' + moTaCo(anhChon.co) + '). ' +
           'Bấm "Lưu" ở cuối form thì nó mới thành ảnh đại diện của ' +
           fullName(nguoi) + '.';
  }
  if (anhBo) {
    return 'Bấm "Lưu" thì ô sơ đồ của ' + fullName(nguoi) + ' quay về bóng người. ' +
           'Tấm ảnh cũ vẫn nằm nguyên trên Drive và trong kho ảnh của gia phả — ' +
           'app không xoá ảnh bao giờ.';
  }
  const cu = nguoi && typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId.trim() : '';
  if (cu) return 'Đang dùng một ảnh có sẵn. Chọn ảnh khác để thay.';
  return 'Chưa có ảnh. Sơ đồ đang vẽ bóng người theo giới tính. ' +
         'Ảnh được nén nhỏ lại trước khi gửi đi, không tải nguyên file gốc.';
}

/**
 * Nén rồi tải một tấm ảnh lên Drive.
 *
 * ⚠ Hàm này **không** đụng tới `state.tree`, không gọi `luuCay()`. Nó chỉ đổi
 * `anhChon`. Cả cây chỉ đổi ở đúng một chỗ: `handleSave()`.
 */
async function chonVaTaiAnh(file, nguoi) {
  anhDangTai = true;
  veLaiKhoiAnh(nguoi);

  try {
    const nen = await compressImage(file);
    const ten = 'anh_' + nguoi.id + '_' + stampNow().replace(/[^0-9]/g, '') + '.jpg';
    const kq  = await taiAnh(nen.base64, ten);

    if (!kq || !kq.ok) {
      throw new Error((kq && kq.loi) ||
        'Máy chủ không nhận ảnh mà không nói rõ vì sao.');
    }

    anhChon = {
      fileId:   kq.fileId,
      xemTruoc: nen.base64,
      ten:      kq.ten,
      co:       kq.coByte,
    };
    anhBo = false;
    anhDangTai = false;
    veLaiKhoiAnh(nguoi);
    // Dọn lời nhắn cũ, KHÔNG gọi `hienNhan('')` — hàm ấy dựng ra một cái hộp
    // xám rỗng, trông như app vừa định nói gì đó rồi thôi.
    if (khoiKetQua) khoiKetQua.innerHTML = '';
  } catch (e) {
    anhDangTai = false;
    veLaiKhoiAnh(nguoi);
    hienNhan('Chưa tải được ảnh lên: ' + (e && e.message ? e.message : String(e)), true);
  }
}

/**
 * Áp thay đổi ảnh lên một cây ĐÃ SỬA XONG phần hồ sơ.
 *
 * Chạy SAU `updatePerson` và trên chính cây nó trả về, vì `attachMedia` sinh mã
 * `M….` từ cây — sinh trên cây cũ rồi ghép vào cây mới là đúng cái bẫy mà
 * `utils/id.js` đã dặn ở đầu file.
 *
 * @returns {{tree, person, media, diff}|null} null khi lần lưu này không đụng ảnh
 */
function apThayDoiAnh(cay, personId, ghiNhan) {
  if (anhChon) {
    const kq = datAnhDaiDien(cay, personId, anhChon.fileId, '', ghiNhan);
    return kq ? { tree: kq.tree, person: kq.person, media: kq.media, diff: kq.diff } : null;
  }
  if (anhBo) {
    const kq = clearPortrait(cay, personId, ghiNhan);
    if (!kq || Object.keys(kq.diff).length === 0) return null;
    return { tree: kq.tree, person: kq.person, media: null, diff: kq.diff };
  }
  return null;
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

/**
 * Ba nút giới tính. `biKhoa` = bày ra nhưng không bấm được.
 *
 * Khoá dùng ở đúng MỘT chỗ: thêm vợ/chồng cho người đã biết giới tính. Lúc ấy
 * giới tính của người mới **suy ra được** — và một ô mà app đã biết câu trả lời
 * thì để mở là mời gõ vào một mâu thuẫn. Nhưng khoá cứng thì hôn nhân đồng giới
 * hết đường ghi, nên bên cạnh luôn có công tắc mở khoá (`veDongGioi`).
 *
 * ⚠ Khoá là **bày ra rồi làm mờ**, KHÔNG phải giấu đi. Giấu thì người dùng
 * không biết app đã tự quyết một trường của bản ghi họ sắp lưu.
 */
function veChonGioi(sexHienTai, biKhoa) {
  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px';

  let dangChon = GIOI.some((g) => g.ma === sexHienTai) ? sexHienTai : 'U';
  let khoa = !!biKhoa;
  const cacNut = [];

  const veLai = () => {
    for (const { ma, nut } of cacNut) {
      const chon = ma === dangChon;
      nut.disabled = khoa;
      nut.style.cssText = KIEU_NUT_CHON +
        (khoa ? 'cursor:not-allowed;opacity:.5;' : '') +
        (chon
          ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
          : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
    }
  };

  for (const g of GIOI) {
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.textContent = g.chu;
    nut.addEventListener('click', () => { if (!khoa) { dangChon = g.ma; veLai(); } });
    cacNut.push({ ma: g.ma, nut });
    hang.append(nut);
  }
  veLai();

  // Đọc bằng hàm chứ không bằng `.value`: giới tính ở đây là ba cái nút, không
  // phải một ô nhập, nên `docO()` không lấy được. Giữ chung một lối đọc cho cả
  // form thì `gomThayDoi()` không phải biết ô nào là loại gì.
  o.sex = {
    value: '',
    doc: () => dangChon,
    datKhoa: (dong, ma) => { khoa = !!dong; if (ma) dangChon = ma; veLai(); },
  };
  return hang;
}

/**
 * Công tắc HÔN NHÂN ĐỒNG GIỚI. Chỉ có ở chế độ thêm vợ/chồng, và chỉ khi biết
 * giới tính của người kia.
 *
 * Không phải một trường dữ liệu — gia phả **không lưu** cờ "đồng giới" ở đâu
 * cả. Nó chỉ mở khoá ba cái nút giới tính, vì `partners` vốn là MẢNG hai chiều
 * bình đẳng và hôn nhân đồng giới ghi được từ đầu (HIEN-PHAP mục dữ liệu). Cái
 * duy nhất cần bỏ là **giả định mặc định**, và giả định thì bỏ bằng một cú chạm.
 *
 * Tích vào thì giới tính nhảy sang **cùng giới** với người kia — đó là ý của
 * chữ "đồng giới", và người dùng vẫn đổi lại được. Bỏ tích thì khoá lại và trả
 * về giới tính ngược.
 */
function veDongGioi(gioiMoc, gioiNguoc, tenMoc) {
  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hop = document.createElement('input');
  hop.type = 'checkbox';
  hop.checked = false;
  hop.style.cssText = 'width:18px;height:18px;accent-color:#2a2622';
  hop.addEventListener('change', () => {
    if (o.sex && typeof o.sex.datKhoa === 'function') {
      o.sex.datKhoa(!hop.checked, hop.checked ? gioiMoc : gioiNguoc);
    }
  });
  o.dongGioi = hop;

  const chu = document.createElement('span');
  chu.textContent = 'Hôn nhân đồng giới — cùng giới với ' + tenMoc;

  nhan.append(hop, chu);
  return nhan;
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
function veConNuoi(chuNhan) {
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
  chu.textContent = chuNhan || 'Là con nuôi (không phải con đẻ)';

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
  nutLuu.textContent = laCheDoThem() ? tieuDeForm() : 'Lưu';
  nutLuu.disabled = !luuDuoc;
  nutLuu.style.cssText = KIEU_NUT_CHAN + 'flex:1 1 auto;' +
    (luuDuoc
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;opacity:.45;cursor:not-allowed');
  if (luuDuoc) {
    nutLuu.addEventListener('click', () => {
      if (cheDo === 'suaCap') handleSaveUnion();
      else if (cheDo === 'themCon') handleAddChild();
      else if (cheDo === 'themChaMe' || cheDo === 'themBanDoi') handleAddNguoiThan();
      else handleSave(nguoi);
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

  // Ảnh áp SAU hồ sơ, trên chính cây mà `updatePerson` vừa trả về — xem
  // `apThayDoiAnh()`. Từ đây trở xuống chỉ dùng bốn biến `…Cuoi`.
  const anh       = apThayDoiAnh(kq.tree, nguoi.id, { boi, luc });
  const cayCuoi   = anh ? anh.tree   : kq.tree;
  const nguoiCuoi = anh ? anh.person : kq.person;
  const diffCuoi  = anh ? Object.assign({}, kq.diff, anh.diff) : kq.diff;

  // ⚠ Đổi MỖI ảnh cũng là một thay đổi. Xét `kq.thayDoi` một mình thì bấm Lưu
  // sau khi chọn ảnh sẽ nghe câu "chưa có gì thay đổi" — mà ảnh thì đã nằm
  // trên Drive rồi, nên người dùng có mọi lý do để tin là mình vừa mất nó.
  if (!kq.thayDoi && !anh) {
    hienNhan('Chưa có gì thay đổi so với bản đang lưu, nên không cần lưu lại.', false);
    return;
  }

  // Luật 2: rà trên cây MỚI với chỉ mục MỚI. Đưa bản đang gõ dở vào bằng
  // `{ person }` thì các phép soi quan hệ vẫn đọc năm sinh cũ trong `index`.
  const indexMoi = buildIndex(cayCuoi);
  const raSoat = validateAll(cayCuoi, indexMoi, 'person', { personId: nguoi.id });

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
  // ghi thay vào là `nguoiCuoi` — đúng bản vừa được rà, không phải một bản
  // tính lại lần nữa.
  //
  // Luật 4: MỘT lần lưu duy nhất, mang cả bản ghi người lẫn bản ghi ảnh. Lưu
  // hai lần thì lần thứ hai hỏng sẽ để lại `photoFileId` trỏ vào một tấm ảnh
  // không có trong kho.
  const nguoiMoi = nguoiCuoi;
  const anhMoi   = anh && anh.media ? anh.media : null;
  let ketQua;
  try {
    ketQua = await luuCay(
      (cay) => {
        const ds = Array.isArray(cay.persons) ? cay.persons : [];
        const i = ds.findIndex((p) => p && p.id === nguoi.id);
        if (i >= 0) ds[i] = JSON.parse(JSON.stringify(nguoiMoi));

        if (anhMoi) {
          if (!Array.isArray(cay.media)) cay.media = [];
          // Chốt chặn cuối, cùng lý lẽ với mã người ở `handleAddChild`: mã ảnh
          // sinh từ cây lúc bấm Lưu, còn hàm này chạy trên bản sao của cây LÚC
          // GỬI. Hai cây lệch nhau thì thà hỏng lần lưu còn hơn ghi hai bản ghi
          // ảnh trùng mã.
          if (cay.media.some((m) => m && m.id === anhMoi.id)) {
            throw new Error('Mã ảnh ' + anhMoi.id + ' vừa được dùng cho một tấm khác. ' +
                            'Tải lại trang rồi gắn ảnh lại.');
          }
          cay.media.push(JSON.parse(JSON.stringify(anhMoi)));
        }
      },
      {
        action: 'update',
        target: nguoi.id,
        note:   'Sửa hồ sơ ' + fullName(nguoiMoi) + ' bằng form nhập liệu.' +
                (anhChon ? ' Đổi ảnh đại diện.' : (anhBo ? ' Bỏ ảnh đại diện.' : '')),
        diff:   diffCuoi,
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
    gio:         docO('gio'),
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

// Lớp phủ và hộp trắng: MỘT chỗ định nghĩa cho cả file. Trước bước 26 đoạn này
// được chép ba lần, và ba bản ấy chỉ cần lệch nhau một con số `z-index` là có
// hai hộp của cùng file này chồng lên nhau mà không ai biết vì sao.
const KIEU_LOP_PHU =
  'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:35;' +
  'display:flex;align-items:center;justify-content:center;padding:20px;' +
  'font-family:system-ui,sans-serif;color:#2a2622';

const KIEU_HOP =
  'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
  'width:100%;max-width:380px;' +
  'max-height:86vh;overflow:auto;box-shadow:0 8px 32px rgba(42,38,34,.28);' +
  '-webkit-overflow-scrolling:touch';

// ============================================================
// XOÁ NGƯỜI — luật 8
// ============================================================

/**
 * Mở hộp xác nhận xoá một người, và lo cả đường hoàn tác.
 *
 * @param {string} personId
 * @param {{onDaXoa?:function(string), onDaHoanTac?:function(string),
 *          onDaDoi?:function(string), nguoiThayThe?:string}} [xuLy]
 *        `onDaDoi` chạy khi bản ghi ĐỔI mà người ấy VẪN CÒN trong cây (lối
 *        "giữ lại làm mắt xích"). Tách khỏi `onDaXoa` vì nơi gọi chỉ được dời
 *        người trung tâm đi khi người ấy thật sự biến mất.
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
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.style.cssText = KIEU_HOP;

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

    // Lối thoát thứ ba, chỉ mọc ra khi có người THẬT SỰ mất đường về. Không có
    // ai bị cắt đứt thì đừng bày thêm nút — mỗi nút thừa là một lần người dùng
    // phải đọc và loại trừ.
    if (xoaHT.thanhLe.length > 0) {
      chan.append(nutChanXoa('Giữ lại làm mắt xích không tên', false,
                             () => chayGiuMatXich(personId)));
    }
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
    // ⚠ Câu này từng kết thúc bằng "app CHƯA có màn hình danh sách để mở họ lên
    // và nối lại". Đúng lúc viết (bước 21), SAI từ bước 24 — nút 🔍 mở đúng màn
    // hình ấy, và bước 26 cho nó đường "Kết nối" để nối lại. Một lời cảnh báo
    // nói quá mức thì cũng làm người ta quyết định sai y như một lời nói giảm.
    dong.push('⚠ ' + tenNguoi(id) + ' sẽ MẤT ĐƯỜNG VỀ. Sau khi xoá, không sơ đồ ' +
              'nào còn vẽ ra họ nữa, kể cả sơ đồ của chính họ hàng gần nhất. Bản ' +
              'ghi vẫn nguyên vẹn trong file: tìm lại bằng nút 🔍 ở góc trên phải, ' +
              'rồi nối lại bằng "Kết nối" trong menu. Cân nhắc nối họ vào chỗ khác ' +
              'trước, rồi hãy xoá.');
  }

  if (xoaHT.thanhLe.length > 0) {
    dong.push('CÓ LỐI KHÁC: nút "Giữ lại làm mắt xích không tên" xoá sạch tên, ' +
              'ngày và ghi chú của người này, nhưng GIỮ bản ghi cùng mọi mối nối. ' +
              'Sơ đồ còn lại một ô trống mang mã ' + personId + ', và ' +
              xoaHT.thanhLe.map(tenNguoi).join(' · ') + ' vẫn về được với ông bà. ' +
              'Dùng khi bạn tin là CÓ một người ở chỗ này, chỉ chưa biết là ai. ' +
              '(Giới tính và tình trạng còn sống giữ nguyên — đó là thuộc tính, ' +
              'không phải danh tính, và giới tính quyết định chỗ đứng trái/phải.)');
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

/**
 * Lối thoát thứ ba: KHÔNG xoá người, mà xoá sạch danh tính của họ.
 *
 * Bản ghi ở lại, mọi mối nối ở lại, nên người con không mất đường về ông bà —
 * huyết thống vẫn là huyết thống dù ta quên mất tên người ở giữa. Trên sơ đồ
 * còn một ô mang mã người (`render.js` lấy mã làm nhãn khi không có tên).
 *
 * --- Vì sao là bản ghi THẬT chứ không phải một nét vẽ ẩn hình -------------
 *
 * Cám dỗ là để `layout.js` tự nối thẳng cháu lên ông bà rồi vẽ một nốt mờ ở
 * giữa. Bốn chỗ hỏng:
 *
 * 1. Nét ấy KHÔNG có trong dữ liệu, nên xuất GEDCOM ra là mất sạch — người
 *    nhận file thấy đứa cháu mồ côi y như cũ. Một `INDI` với `NAME` rỗng thì
 *    ghi được và đọc lại được. (Con trỏ `@VOID@` của GEDCOM không thay được:
 *    nó chỉ giữ chỗ trong danh sách con của MỘT gia đình, không mang nổi mối
 *    nối xuống gia đình của đứa cháu.)
 * 2. Nốt mờ không bấm được, nên ngày có người nhớ ra tên cụ ấy thì không có
 *    chỗ nào để điền vào.
 * 3. `layout.js` phải học một loại nút thứ ba. Năm lần liên tiếp lỗi bố cục
 *    chỉ lộ ra khi nhìn hình — đừng thêm khái niệm vào file đó nếu tránh được.
 * 4. Và quan trọng nhất: nét tự suy là app KHẲNG ĐỊNH một điều không ai nhập.
 *    Bản ghi trống nói đúng thứ ta biết: *có một người ở đây, chưa rõ là ai.*
 *
 * ⚠ Giữ mắt xích cũng là một LỜI KHẲNG ĐỊNH: rằng cha/mẹ của đứa cháu đúng là
 * con của cặp ông bà ấy. Sai chỗ đó thì cái sai nằm im trong dữ liệu. Chỉ dùng
 * khi tin chắc quan hệ, chỉ không chắc con người.
 */
async function chayGiuMatXich(personId) {
  if (dangLuu) return;

  const cu = state.index && state.index.personById.get(personId);
  if (!cu) {
    hienNhan('Không tìm thấy bản ghi này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }
  // Chép nguyên bản CŨ để hoàn tác trả lại đúng từng ô, không phải dựng lại từ
  // `diff` — dựng lại thì mỗi trường thêm vào sau này là một trường bị quên.
  const banCu = JSON.parse(JSON.stringify(cu));

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  // `sex` và `living` KHÔNG nằm trong danh sách: chúng là thuộc tính, không phải
  // danh tính — và `sex` còn quyết định chỗ đứng trái/phải trên sơ đồ.
  const kq = updatePerson(state.tree, personId, {
    name:        { surname: '', middle: '', given: '' },
    burialPlace: '',
    note:        '',
    birth:       { raw: '', place: '' },
    death:       { raw: '', place: '' },
  }, { boi, luc });

  if (!kq) {
    hienNhan('Không sửa được bản ghi này. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    hienNhan('Hồ sơ này vốn đã trống sẵn — nó đang là một mắt xích không tên rồi.', false);
    return;
  }

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang xoá thông tin…', false);

  const tenCu = tenNguoi(personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'update',
    target: personId,
    note:   'Xoá danh tính của ' + tenCu + ', giữ lại làm mắt xích không tên.',
    diff:   kq.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    nutLuu.disabled = false;
    nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hồ sơ này CHƯA bị đụng tới.');
    return;
  }

  // `onDaDoi`, KHÔNG phải `onDaXoa`: người này vẫn còn trong cây, nên nơi gọi
  // tuyệt đối không được dời người trung tâm đi chỗ khác.
  if (xuLyNgoai.onDaDoi) xuLyNgoai.onDaDoi(personId);

  nutLuu = null;
  hienNhan('Đã xoá thông tin của ' + tenCu + '. Ô ' + personId +
           ' nay là một mắt xích không tên.', false,
           ['Con cháu phía dưới vẫn nối được lên ông bà qua ô này.',
            'Mai kia nhớ ra tên thì mở thẻ thông tin của ô ấy, bấm "Sửa hồ sơ".']);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — trả lại hồ sơ cũ', true, () => chayTraLaiHoSo(personId, banCu, tenCu)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  khoiKetQua.append(hang);
}

/** Hoàn tác của `chayGiuMatXich`: đặt nguyên bản ghi cũ trở lại. */
async function chayTraLaiHoSo(personId, banCu, tenCu) {
  if (dangLuu) return;
  dangLuu = true;
  hienNhan('Đang trả lại hồ sơ cũ…', false);

  const ketQua = await ghiMotNguoi(banCu, {
    action: 'restore',
    target: personId,
    note:   'Hoàn tác: trả lại hồ sơ của ' + tenCu + '.',
    diff:   {},
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Hồ sơ VẪN đang trống.');
    return;
  }

  if (xuLyNgoai.onDaDoi) xuLyNgoai.onDaDoi(personId);

  hienNhan('Đã trả lại hồ sơ của ' + tenCu + '.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
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
// HỘP KHÔNG CÓ Ô NHẬP — dùng chung cho chọn cặp, nối, gỡ nối
// ============================================================
//
// Ba việc của bước 26 đều bắt đầu bằng cùng một hình: một hộp trắng, một câu
// hỏi, vài nút xếp dọc, nút Huỷ ở chân. Gom một chỗ vì lý do đã nói ở
// `KIEU_LOP_PHU`: chép ra ba bản thì ba bản trôi lệch nhau, mà thứ trôi lệch
// đầu tiên bao giờ cũng là `z-index` — và hai hộp của cùng file này chồng lên
// nhau thì người dùng bấm vào cái phía dưới mà không hiểu vì sao không ăn.

/**
 * Dựng lớp phủ + hộp trắng + khối kết quả + hàng nút chân.
 * @returns {HTMLElement} hàng nút chân, để nơi gọi append tiếp vào đó.
 */
function moHopTrang(che, xuLy, tieuDe, phu) {
  closePersonForm();
  xuLyNgoai = xuLy || {};
  cheDo     = che;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-hop-viec';   // mốc cho bài kiểm hành vi, xem kiem-noi-go.mjs
  hop.style.cssText = KIEU_HOP;

  const t = document.createElement('div');
  t.textContent = tieuDe;
  t.style.cssText = 'font-size:19px;font-weight:600';
  hop.append(t);

  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText =
      'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';
    hop.append(d);
  }

  khoiKetQua = document.createElement('div');
  hop.append(khoiKetQua);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  hop.append(chan);

  lopPhu.append(hop);
  document.body.append(lopPhu);
  return chan;
}

/**
 * Một dòng bấm được: dòng trên là việc, dòng dưới là chi tiết.
 *
 * Cả dòng là MỘT đích chạm, không bao giờ hai nút cạnh nhau — cùng luật với
 * `pages/person-list.js`: trên điện thoại hai đích sát nhau trong một dòng cao
 * 44px là mời bấm nhầm.
 */
function nutMuc(muc) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.muc = muc.ma || '';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 12px;font-family:inherit;' +
    'font-size:14px;border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (muc.nguyHiem
      ? 'color:#8a3a2a;border:1px solid #f0d8d0;background:#fbf0ec'
      : 'color:#2a2622;border:1px solid #e6e0d8;background:#fff');

  const d1 = document.createElement('div');
  d1.textContent = muc.chu;
  nut.append(d1);

  if (coGiaTri(muc.phu)) {
    const d2 = document.createElement('div');
    d2.textContent = muc.phu;
    d2.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px;line-height:1.4';
    nut.append(d2);
  }

  nut.addEventListener('click', muc.chay);
  return nut;
}

/** Hộp trắng + một câu hỏi + danh sách nút dọc + nút Huỷ. */
function moHopChon(che, xuLy, c) {
  const chan = moHopTrang(che, xuLy, c.tieuDe, c.phu);
  hienNhan(c.cauMo, false, c.cacDong);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  for (const m of c.cacMuc) hang.append(nutMuc(m));
  khoiKetQua.append(hang);

  chan.append(nutChanXoa(c.chuHuy || 'Huỷ', false, () => closePersonForm()));
}

/** Hộp chỉ để báo một câu rồi đóng. Dùng cho mọi ngõ cụt. */
function moHopBao(tieuDe, cau, laLoi, dong) {
  const chan = moHopTrang('chon', {}, tieuDe, '');
  hienNhan(cau, !!laLoi, dong);
  chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
}

/** Số người đang đứng trong `partners` — ĐẾM TRÊN BẢN GHI, để khớp `addPartner`. */
function soPartner(u) {
  return (Array.isArray(u && u.partners) ? u.partners : []).filter(Boolean).length;
}

/** Một dòng mô tả cặp, dùng lại ở cả bốn hộp chọn. */
function moTaCap(u) {
  const soCon = (Array.isArray(u.children) ? u.children : []).length;
  return [soCon > 0 ? soCon + ' con' : 'chưa có con', u.id]
    .filter(coGiaTri).join('  ·  ');
}

// ============================================================
// CHỌN CẶP — một hàm cho cả bốn đường (thêm/nối × cha mẹ/vợ chồng/con)
// ============================================================

/**
 * Hỏi mối nối này treo vào CẶP nào, rồi gọi tiếp `tiep(unionId)`.
 * `unionId` rỗng nghĩa là *"tạo một cặp mới"*.
 *
 * @param {'chaMe'|'banDoi'|'con'} vaiTro  vai trò của NGƯỜI SẮP ĐƯỢC NỐI VÀO
 * @param {string} mocId  người đang đứng giữa việc này
 *
 * --- Khi nào đi thẳng, khi nào phải hỏi ---------------------------------
 *
 * Ba nhánh, và nhánh giữa là chỗ dễ làm ẩu nhất:
 *
 *   · KHÔNG có cặp nào nhận được  → tạo cặp mới, đi thẳng, không hỏi. Hỏi một
 *     câu chỉ có một câu trả lời là bắt người ta đọc để rồi bấm cái duy nhất.
 *   · ĐÚNG MỘT cặp nhận được, và người ấy không có cặp nào khác cùng loại →
 *     đi thẳng vào cặp ấy.
 *   · còn lại                     → PHẢI HỎI. Đoán hộ ở đây là nối vào nhầm
 *     đời vợ, và cái sai ấy nằm im trong dữ liệu cho tới lúc có người xem sơ đồ
 *     quanh đúng người ấy. `U0004`/`U0005` — hai đời vợ ông Cương — là ca thật
 *     đang có sẵn trong dữ liệu làm việc.
 *
 * ⚠ Riêng `'banDoi'` KHÔNG có nhánh giữa: hễ có một cặp một người nhận được là
 * hỏi. Lý do là hệ quả, không phải sự cẩn thận suông — thêm vợ/chồng vào một
 * cặp ĐANG CÓ CON thì người mới đồng thời thành cha/mẹ của mấy người con ấy
 * (luật 9). Một việc kéo theo một việc khác thì không được làm lặng lẽ.
 */
function chonCap(vaiTro, mocId, xuLy, tiep) {
  const index = state.index;
  if (!index) return;

  const tatCa = (vaiTro === 'chaMe')
    ? getParentUnions(index, mocId)
    : getPartnerUnions(index, mocId);

  // 'con' nhận mọi cặp của người ấy; hai vai kia cần một chỗ trống trong hàng
  // vợ/chồng, vì người sắp nối vào sẽ đứng ở đó.
  const nhanDuoc = (vaiTro === 'con') ? tatCa : tatCa.filter((u) => soPartner(u) < 2);

  // Đi thẳng CHỈ khi người ấy chưa có cặp nào cùng loại. Có cặp mà cặp nào cũng
  // đã đủ người thì VẪN PHẢI HỎI: lặng lẽ dựng thêm một cặp thứ hai là lặng lẽ
  // khẳng định "đây là cha mẹ NUÔI / KẾ", hoặc "đây là cuộc hôn nhân thứ hai" —
  // hai điều lớn mà người dùng chưa nói câu nào.
  if (tatCa.length === 0) { tiep(''); return; }
  if (vaiTro !== 'banDoi' && nhanDuoc.length === 1 && tatCa.length === 1) {
    tiep(nhanDuoc[0].id);
    return;
  }

  const cacMuc = nhanDuoc.map((u) => ({
    ma: u.id,
    chu: (vaiTro === 'chaMe' || vaiTro === 'banDoi')
      ? 'Đứng chung cặp với ' + keTenPartner(u.id)
      : 'Con của ' + keTenPartner(u.id),
    phu: moTaCap(u),
    chay: () => tiep(u.id),
  }));

  cacMuc.push({
    ma: 'moi',
    chu: vaiTro === 'chaMe' ? 'Tạo một cặp cha mẹ MỚI' : 'Tạo một cặp MỚI',
    phu: vaiTro === 'chaMe'
      ? 'Dùng khi đây là cha mẹ nuôi / kế, khác với cặp đã có ở trên.'
      : 'Dùng khi đây là một cuộc hôn nhân khác, không phải cặp đã có ở trên.',
    chay: () => tiep(''),
  });

  // Kể cả những cặp KHÔNG nhận được, chỉ để đọc. Không kể thì người dùng nhìn
  // danh sách thiếu mất cặp họ đang nghĩ tới và tưởng app quên mất nó.
  const dayRoi = tatCa.filter((u) => nhanDuoc.indexOf(u) < 0);
  const cacDong = dayRoi.map((u) =>
    'Cặp ' + u.id + ' (' + keTenPartner(u.id) + ') đã đủ hai người nên không ' +
    'nhận thêm được — trong gia phả này nhiều vợ / nhiều chồng là NHIỀU CẶP, ' +
    'không phải một cặp ba người.');

  moHopChon('chon', xuLy, {
    tieuDe: 'Nối vào cặp nào?',
    phu:    tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  nhanDuoc.length === 0
      ? (vaiTro === 'chaMe'
        ? tenNguoi(mocId) + ' đã có đủ cha mẹ trong gia phả, nên người này sẽ ' +
          'thành một cặp cha mẹ THỨ HAI — cha mẹ nuôi hoặc cha mẹ kế.'
        : tenNguoi(mocId) + ' đã có đủ vợ/chồng trong mọi cặp đang có, nên đây ' +
          'sẽ là một cuộc hôn nhân KHÁC.')
      : (vaiTro === 'chaMe'
        ? 'Cha mẹ của ' + tenNguoi(mocId) + ' được ghi theo CẶP. Chọn cặp:'
        : (vaiTro === 'banDoi'
          ? 'Chọn chỗ đứng cho người vợ / chồng này:'
          : 'Người con này thuộc về cặp nào của ' + tenNguoi(mocId) + '?')),
    cacDong,
    cacMuc,
  });
}

// ============================================================
// THÊM CHA / MẸ và THÊM VỢ / CHỒNG — người MỚI
// ============================================================

/**
 * Thêm một người cha hoặc mẹ mới cho `childId`.
 *
 * @param {string} childId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *
 * ⚠ **KHÔNG hỏi "thêm cha hay thêm mẹ" nữa** (chủ dự án chốt 20/08/2026, ngay
 * sau bước 26). Câu ấy hỏi đúng một thứ mà form ngay sau đó lại hỏi lần thứ
 * hai: **ô giới tính**. Chọn "Nam" trong form *là* nói "đây là cha" — không có
 * cách nào chọn "Nam" mà lại ra người mẹ. Hỏi trước rồi hỏi lại là bắt người ta
 * trả lời hai lần cho một câu, và tệ hơn: hai câu trả lời có thể lệch nhau, lúc
 * ấy app phải chọn tin cái nào.
 *
 * ⚠ Chữ ký khung 15/08 ghi `quickAddParent(childId, sex)`. Nay **không còn
 * `sex`** — và cũng chưa bao giờ có `xuLy` như khung ghi. Cùng loại đính chính
 * với `updatePerson` (bước 18) và `searchPersons` (bước 24): khung là điểm khởi
 * hành, không phải hợp đồng.
 */
export function quickAddParent(childId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(childId)) return;

  chonCap('chaMe', childId, xuLy, (unionId) => {
    moForm('themChaMe', NGUOI_TRONG, { childId, unionId }, xuLy);
  });
}

/** Giới tính còn lại của một cặp nam–nữ. Trả rỗng khi không suy ra được. */
const GIOI_NGUOC = { M: 'F', F: 'M' };

/**
 * Thêm một người vợ / chồng mới cho `personId`.
 *
 * ⚠ **KHÔNG hỏi "nối vào cặp nào" nữa, và LUÔN tạo một cặp mới** (chủ dự án
 * chốt 20/08/2026). Cú chạm giữ đã chỉ đúng một người, nên hai người ấy là một
 * cặp — không còn gì để hỏi.
 *
 * Và câu hỏi bị bỏ đi ấy hoá ra còn **nguy hiểm**: lối duy nhất nó mở ra là
 * *"cho người mới vào cặp một người đang có con"*, mà làm thế là **lặng lẽ
 * khẳng định người mới là cha/mẹ của mấy người con đó** — đúng thứ luật 9 cấm.
 * Bỏ câu hỏi vừa gọn tay vừa đóng luôn cái cửa ấy.
 *
 * ⚠ Ca *"bà mẹ nay đã nhớ ra tên chồng"* — cặp một người có con — vẫn làm được,
 * chỉ là **đi từ phía người con**: mở thẻ người con → *Thêm cha / mẹ* → cặp ấy
 * còn một chỗ trống nên vào thẳng. Đó mới là lối đúng, vì ở đó người dùng đang
 * nhìn chính đứa con mà mình sắp gán thêm một người cha.
 *
 * **Giới tính người mới điền sẵn NGƯỢC với người kia, và ô ấy bị khoá** — mở
 * lại bằng công tắc *"hôn nhân đồng giới"*. Người kia mang `sex: 'U'` thì không
 * suy ra được gì: để ô mở, không khoá, không bày công tắc.
 */
export function quickAddSpouse(personId, xuLy = {}) {
  const index = state.index;
  const moc = index && index.personById.get(personId);
  if (!moc) return;

  const gioiNguoc = GIOI_NGUOC[moc.sex] || '';

  moForm('themBanDoi',
         Object.assign({}, NGUOI_TRONG, { sex: gioiNguoc || 'U' }),
         { banDoiId: personId, unionId: '', gioiMoc: moc.sex, gioiNguoc },
         xuLy);
}

/**
 * Lưu của hai chế độ `themChaMe` và `themBanDoi`.
 *
 * Cùng đúng trình tự của `handleAddChild` (luật 1 · 2 · 4 · 5), chỉ khác bộ hàm
 * dựng cây và bộ nhánh rà soát. Không có câu hỏi thứ tự anh chị em — người vừa
 * thêm là cha mẹ hoặc vợ chồng, không đứng trong hàng anh em nào.
 */
async function handleAddNguoiThan() {
  if (dangLuu) return;

  const luc    = stampNow();
  const boi    = (state.phien && state.phien.email) || '';
  const quanHe = (o.conNuoi && o.conNuoi.checked) ? 'adopted' : 'birth';
  const laChaMe = cheDo === 'themChaMe';

  const dung = laChaMe
    ? dungCayThemChaMe(state.tree, gomThayDoi(), quanHe, { boi, luc })
    : dungCayThemBanDoi(state.tree, gomThayDoi(), { boi, luc });

  if (!dung) {
    hienNhan('Không nối được người này vào chỗ đã chọn. Có thể gia phả vừa thay ' +
             'đổi trong lúc form đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }

  // Luật 2: rà trên CÂY MỚI với chỉ mục MỚI — người vừa dựng chưa hề có trong
  // `state.index`, nên rà bằng chỉ mục cũ thì mọi phép soi quan hệ mù hết.
  const indexMoi = buildIndex(dung.tree);
  let raSoat = gopRaSoat(
    validateAll(dung.tree, indexMoi, 'person', { personId: dung.person.id }),
    validateAll(dung.tree, indexMoi, 'union',  { unionId: dung.union.id })
  );
  if (laChaMe) {
    raSoat = gopRaSoat(raSoat, validateAll(dung.tree, indexMoi, 'child',
      { childId: noiVao.childId, parentId: dung.person.id }));
  }

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
             'lỗi, nên app không chặn — bấm "Vẫn thêm" nếu bạn biết là đúng:',
             false, canhBao);
    return;
  }

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const nguoiMoi = dung.person;
  const tenMoi   = coGiaTri(fullName(nguoiMoi)) ? fullName(nguoiMoi) : nguoiMoi.id;
  const vai      = laChaMe
    ? (noiVao.gioi === 'F' ? 'mẹ' : (noiVao.gioi === 'M' ? 'cha' : 'cha/mẹ'))
    : 'vợ/chồng';
  const moc      = laChaMe ? noiVao.childId : noiVao.banDoiId;

  const ketQua = await ghiBanGhi(nguoiMoi, [dung.union], {
    action: 'create',
    target: nguoiMoi.id,
    note:   'Thêm ' + vai + ' ' + tenMoi + ' cho ' + tenNguoi(moc) +
            ' vào ' + dung.union.id +
            (dung.laUnionMoi ? ' (cặp mới, tạo cùng lúc)' : '') + '.',
    diff:   dung.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;   // người dùng đã đóng form trong lúc chờ máy chủ

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(nguoiMoi.id);
    return;
  }

  nutLuu.disabled = false;
  nutLuu.style.opacity = '1';
  hienLoiGhi(ketQua, 'Người này CHƯA được thêm.');
}

/**
 * Cây mới cho `themChaMe`, bằng các hàm thuần nối đuôi nhau.
 *
 * ⚠ THỨ TỰ BẮT BUỘC, và lý do y hệt `dungCayThemChaMe`'s họ hàng ở
 * `dungCayThemCon`: `nextId()` đọc cây, nên mỗi hàm phải nhận CÂY TRẢ VỀ của
 * hàm trước. Chạy hai hàm tạo trên cùng một cây cũ là sinh hai bản ghi trùng mã.
 *
 * @returns {{tree, person, union, laUnionMoi, diff}|null}
 */
function dungCayThemChaMe(cay, thayDoi, quanHe, ghiNhan) {
  if (!cay || !noiVao || !noiVao.childId) return null;

  const kqP = createPerson(cay, thayDoi, ghiNhan);
  if (!kqP) return null;

  let tree = kqP.tree;
  const diff = Object.assign({}, kqP.diff);

  // Cặp có sẵn: người mới đứng vào chỗ trống trong hàng vợ/chồng. Quan hệ của
  // người con với cặp ấy đã ghi từ trước, không đụng tới.
  if (noiVao.unionId) {
    const kqA = addPartner(tree, noiVao.unionId, kqP.person.id);
    if (!kqA) return null;
    Object.assign(diff, kqA.diff);
    return { tree: kqA.tree, person: kqP.person, union: kqA.union,
             laUnionMoi: false, diff };
  }

  // Cặp mới: tạo cặp một người rồi treo người con vào. Hai việc, một lần lưu —
  // luật 4. Lưu nửa chừng là để lại một cặp vô hình (`conLyDoTonTai` là sai).
  const kqU = createUnion(tree, [kqP.person.id], {});
  if (!kqU) return null;
  tree = kqU.tree;
  Object.assign(diff, kqU.diff);

  const kqC = addChild(tree, kqU.union.id, noiVao.childId, quanHe);
  if (!kqC) return null;
  Object.assign(diff, kqC.diff);

  return { tree: kqC.tree, person: kqP.person, union: kqC.union,
           laUnionMoi: true, diff };
}

/** Cây mới cho `themBanDoi`. @returns {{tree, person, union, laUnionMoi, diff}|null} */
function dungCayThemBanDoi(cay, thayDoi, ghiNhan) {
  if (!cay || !noiVao || !noiVao.banDoiId) return null;

  const kqP = createPerson(cay, thayDoi, ghiNhan);
  if (!kqP) return null;

  const tree = kqP.tree;
  const diff = Object.assign({}, kqP.diff);

  if (noiVao.unionId) {
    const kqA = addPartner(tree, noiVao.unionId, kqP.person.id);
    if (!kqA) return null;
    Object.assign(diff, kqA.diff);
    return { tree: kqA.tree, person: kqP.person, union: kqA.union,
             laUnionMoi: false, diff };
  }

  const kqU = createUnion(tree, [noiVao.banDoiId, kqP.person.id], {});
  if (!kqU) return null;
  Object.assign(diff, kqU.diff);

  return { tree: kqU.tree, person: kqP.person, union: kqU.union,
           laUnionMoi: true, diff };
}

// ============================================================
// KẾT NỐI hai người ĐÃ CÓ SẴN
// ============================================================

const TEN_QUAN_HE = { parent: 'cha / mẹ', spouse: 'vợ / chồng', child: 'con' };

/**
 * Nối `targetId` vào `personId` theo một quan hệ.
 *
 * @param {string} personId    người đang mở thẻ — mọi câu chữ nói từ phía họ
 * @param {string} targetId    người vừa được chọn ở màn hình Danh sách người
 * @param {'parent'|'spouse'|'child'|''} relationType  rỗng = hỏi người dùng
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *
 * ⚠ Chỗ CHỌN NGƯỜI không nằm trong file này. `pages/person-list.js` cũng thuộc
 * lớp `pages`, và hai file `pages` không import lẫn nhau (chốt 17/08/2026) —
 * nên `tree-view.js` mở danh sách, đóng nó lại, rồi mới gọi hàm này với mã
 * người đã chọn xong. Cách ấy còn tránh được hai lớp phủ chồng nhau.
 */
export function linkExisting(personId, targetId, relationType, xuLy = {}) {
  const index = state.index;
  if (!index) return;

  const a = index.personById.get(personId);
  const b = index.personById.get(targetId);
  if (!a || !b) {
    moHopBao('Kết nối', 'Không tìm thấy một trong hai người. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (personId === targetId) {
    moHopBao('Kết nối', 'Không nối một người với chính họ được. Chọn một người khác.', true);
    return;
  }

  if (!TEN_QUAN_HE[relationType]) {
    hoiQuanHeNoi(personId, targetId, xuLy);
    return;
  }

  // Nối lại thứ đã nối rồi thì nói ngay, đừng để người dùng đi hết ba bước rồi
  // mới nghe "không làm được".
  const daNoi = quanHeDaCo(personId, targetId);
  if (daNoi) {
    moHopBao('Kết nối',
      tenNguoi(targetId) + ' đã là ' + daNoi + ' của ' + tenNguoi(personId) +
      ' trong gia phả rồi.', false,
      ['Muốn bỏ mối nối ấy thì dùng "Gỡ nối" trong menu, không phải "Kết nối".']);
    return;
  }

  const vaiTro = relationType === 'parent' ? 'chaMe'
               : (relationType === 'spouse' ? 'banDoi' : 'con');

  chonCap(vaiTro, personId, xuLy, (unionId) => {
    moHopXacNhanNoi({ personId, targetId, loai: relationType, unionId }, xuLy);
  });
}

/** Ba nút, ba câu nói từ phía người đang mở thẻ. Không dùng chữ "quan hệ 1". */
function hoiQuanHeNoi(personId, targetId, xuLy) {
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);

  moHopChon('chon', xuLy, {
    tieuDe: 'Kết nối',
    phu:    A + '  ·  ' + personId + '   ←→   ' + B + '  ·  ' + targetId,
    cauMo:  'Hai người này là gì của nhau?',
    cacMuc: [
      { ma: 'parent', chu: B + ' là CHA / MẸ của ' + A,
        phu: 'B sẽ đứng vào một cặp cha mẹ của A.',
        chay: () => linkExisting(personId, targetId, 'parent', xuLy) },
      { ma: 'spouse', chu: B + ' là VỢ / CHỒNG của ' + A,
        phu: 'Hai người thành một cặp.',
        chay: () => linkExisting(personId, targetId, 'spouse', xuLy) },
      { ma: 'child', chu: B + ' là CON của ' + A,
        phu: 'B thành người con của một cặp của A.',
        chay: () => linkExisting(personId, targetId, 'child', xuLy) },
    ],
  });
}

/**
 * Quan hệ đã có sẵn giữa hai người, hoặc chuỗi rỗng.
 * Đọc đúng MỘT bước từ `personId` — không phải phép duyệt đồ thị, không cần
 * `visited`.
 */
function quanHeDaCo(personId, targetId) {
  const index = state.index;
  for (const m of getSpouses(index, personId))  if (m.personId === targetId) return 'vợ/chồng';
  for (const m of getChildren(index, personId)) if (m.personId === targetId) return 'con';
  for (const u of getParentUnions(index, personId)) {
    if ((Array.isArray(u.partners) ? u.partners : []).indexOf(targetId) >= 0) return 'cha/mẹ';
  }
  return '';
}

/**
 * Hộp xác nhận của đường NỐI. Có ô "con nuôi" khi mối nối ấy là cha mẹ – con.
 *
 * ⚠ `noiCtx` phải đặt SAU `moHopTrang()`, không được đặt trước. `moHopTrang` mở
 * đầu bằng `closePersonForm()`, mà hàm ấy dọn sạch MỌI ngữ cảnh của file này —
 * kể cả `noiCtx`. Bản đầu đặt trước và hộp ngã ngay lần mở thứ nhất; bài kiểm
 * hành vi bắt được, còn Node thì không, vì lỗi nằm trọn trong lớp `pages`.
 */
function moHopXacNhanNoi(ctx, xuLy) {
  const chan = moHopTrang('noi', xuLy, 'Kết nối',
                          tenNguoi(ctx.personId) + '  ←→  ' + tenNguoi(ctx.targetId));
  noiCtx = ctx;
  const { personId, targetId, loai, unionId } = ctx;

  const canTro = canTroLuu();
  if (canTro) {
    hienNhan(canTro, true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Nối xong thì:', false, cauKeNoi());

  // Ô "con nuôi" chỉ mọc khi mối nối SẮP TẠO RA là quan hệ cha mẹ – con mới.
  // Nối thêm một người vào cặp cha mẹ đã có thì quan hệ đẻ/nuôi của người con
  // với cặp ấy đã ghi từ trước — hỏi lại là mời đổi một thứ không ai định đụng.
  const hoiNuoi = (loai === 'child') || (loai === 'parent' && !unionId);
  if (hoiNuoi) {
    khoiKetQua.append(veConNuoi(loai === 'child'
      ? 'Là con nuôi (không phải con đẻ)'
      : 'Là cha / mẹ NUÔI (không phải cha mẹ đẻ)'));
  } else {
    o.conNuoi = null;
  }

  nutLuu = nutChanXoa('Nối hai người này', false, () => chayNoi());
  chan.append(nutLuu, nutChanXoa('Không nối', false, () => closePersonForm()));
}

/** Từng dòng hậu quả của đường NỐI. Nối chỉ THÊM cạnh, nên không ai mất gì. */
function cauKeNoi() {
  const { personId, targetId, loai, unionId } = noiCtx;
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);
  const dong = [];

  if (loai === 'spouse') {
    dong.push(A + ' và ' + B + ' thành vợ chồng' +
              (unionId ? ' trong cặp ' + unionId + '.' : ' trong một cặp mới.'));
    if (unionId) {
      const u = state.index.unionById.get(unionId);
      const cacCon = (Array.isArray(u && u.children) ? u.children : [])
        .map((c) => c && c.personId).filter((id) => id && state.index.personById.has(id));
      if (cacCon.length > 0) {
        dong.push('⚠ Cặp ' + unionId + ' đang có ' + cacCon.length + ' người con (' +
                  cacCon.map(tenNguoi).join(' · ') + '), nên ' + B +
                  ' đồng thời thành cha/mẹ của họ. Trong gia phả này quan hệ cha ' +
                  'mẹ – con đi QUA cặp, không nối thẳng người với người.');
      }
    }
  } else if (loai === 'child') {
    dong.push(B + ' thành người con của ' +
              (unionId ? keTenPartner(unionId) + '  ·  ' + unionId
                       : A + ' (app tạo thêm một cặp mới cho riêng họ)') + '.');
  } else {
    dong.push(B + ' thành cha / mẹ của ' + A +
              (unionId ? ', đứng chung cặp ' + unionId + ' với ' + keTenPartner(unionId) + '.'
                       : ' trong một cặp cha mẹ mới.'));
  }

  dong.push('Không ai bị xoá, và không mối nối nào đang có bị bỏ đi. Nối nhầm ' +
            'thì mở lại menu và dùng "Gỡ nối".');
  return dong;
}

/**
 * Dựng cây cho đường NỐI, rồi rà và ghi.
 *
 * Cây được dựng LẠI ở đây chứ không dựng sẵn lúc mở hộp — khác luật 8 của đường
 * xoá, và cố ý: ô "con nuôi" đổi được sau khi hộp đã mở, nên cây dựng lúc mở là
 * cây của một lựa chọn có thể đã cũ. Luật 1 vẫn đứng nguyên: thứ được rà ngay
 * dưới đây đúng là thứ được ghi ở cuối hàm.
 */
async function chayNoi() {
  if (dangLuu || !noiCtx) return;

  const quanHe = (o.conNuoi && o.conNuoi.checked) ? 'adopted' : 'birth';
  const dung = dungCayNoi(quanHe);
  if (!dung) {
    hienNhan('Không nối được hai người này. Có thể gia phả vừa thay đổi trong lúc ' +
             'hộp đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }

  const { personId, targetId, loai } = noiCtx;
  const indexMoi = buildIndex(dung.tree);

  let raSoat = validateAll(dung.tree, indexMoi, 'union', { unionId: dung.union.id });
  if (loai === 'child') {
    raSoat = gopRaSoat(raSoat, validateAll(dung.tree, indexMoi, 'child',
      { childId: targetId, unionId: dung.union.id }));
  } else if (loai === 'parent') {
    raSoat = gopRaSoat(raSoat, validateAll(dung.tree, indexMoi, 'child',
      { childId: personId, parentId: targetId }));
  }

  if (!raSoat.canSave) {
    hienNhan('Chưa nối được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  const canhBao = raSoat.warnings.map((m) => m.message);
  if (canhBao.length > 0 && !daXemCanhBao) {
    daXemCanhBao = true;
    nutLuu.textContent = 'Vẫn nối';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn nối" nếu bạn biết là đúng:',
             false, canhBao);
    return;
  }

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang nối…', false);

  const ketQua = await ghiBanGhi(null, [dung.union], {
    action: 'update',
    target: dung.union.id,
    note:   'Nối ' + tenNguoi(targetId) + ' làm ' + TEN_QUAN_HE[loai] + ' của ' +
            tenNguoi(personId) + ' qua ' + dung.union.id +
            (dung.laUnionMoi ? ' (cặp mới, tạo cùng lúc)' : '') + '.',
    diff:   dung.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    nutLuu.disabled = false;
    nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hai người này CHƯA được nối.');
    return;
  }

  if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(targetId);

  nutLuu = null;
  hienNhan('Đã nối ' + tenNguoi(targetId) + ' làm ' + TEN_QUAN_HE[loai] +
           ' của ' + tenNguoi(personId) + '.', false);

  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Xong', true, () => closePersonForm()));
  khoiKetQua.append(hang);
}

/** @returns {{tree, union, laUnionMoi, diff}|null} */
function dungCayNoi(quanHe) {
  const { personId, targetId, loai, unionId } = noiCtx;
  let tree = state.tree;
  const diff = {};

  if (loai === 'spouse') {
    if (unionId) {
      const kq = addPartner(tree, unionId, targetId);
      if (!kq) return null;
      return { tree: kq.tree, union: kq.union, laUnionMoi: false, diff: kq.diff };
    }
    const kq = createUnion(tree, [personId, targetId], {});
    if (!kq) return null;
    return { tree: kq.tree, union: kq.union, laUnionMoi: true, diff: kq.diff };
  }

  if (loai === 'child') {
    let uid = unionId;
    let laMoi = false;
    if (!uid) {
      const kqU = createUnion(tree, [personId], {});
      if (!kqU) return null;
      tree = kqU.tree; uid = kqU.union.id; laMoi = true;
      Object.assign(diff, kqU.diff);
    }
    const kqC = addChild(tree, uid, targetId, quanHe);
    if (!kqC) return null;
    Object.assign(diff, kqC.diff);
    return { tree: kqC.tree, union: kqC.union, laUnionMoi: laMoi, diff };
  }

  // 'parent'
  if (unionId) {
    const kq = addPartner(tree, unionId, targetId);
    if (!kq) return null;
    return { tree: kq.tree, union: kq.union, laUnionMoi: false, diff: kq.diff };
  }
  const kqU = createUnion(tree, [targetId], {});
  if (!kqU) return null;
  tree = kqU.tree;
  Object.assign(diff, kqU.diff);
  const kqC = addChild(tree, kqU.union.id, personId, quanHe);
  if (!kqC) return null;
  Object.assign(diff, kqC.diff);
  return { tree: kqC.tree, union: kqC.union, laUnionMoi: true, diff };
}

// ============================================================
// GỠ NỐI — luật 9 và luật 10
// ============================================================

/**
 * Mở danh sách mối nối của một người để chọn cái cần gỡ.
 *
 * ⚠ CHA MẸ ĐƯỢC KỂ THEO CẶP, MỖI CẶP MỘT DÒNG — không kể từng người một. Đây là
 * luật 9 hiện ra thành hình: thứ gỡ được là mối nối tới CẶP, nên hai dòng
 * *"gỡ nối với cha"* và *"gỡ nối với mẹ"* sẽ làm đúng cùng một việc. Hai nút
 * khác chữ mà cùng kết quả là thứ làm người dùng tin sai về dữ liệu của mình.
 *
 * Vợ/chồng và con thì ngược lại: mỗi người là một mối nối riêng, gỡ được riêng.
 */
export function goNoiNguoi(personId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;

  const cacMuc = [];

  for (const u of getParentUnions(index, personId)) {
    cacMuc.push({
      ma: 'parent:' + u.id,
      chu: 'Cha mẹ: ' + keTenPartner(u.id),
      phu: 'Gỡ khỏi CẢ CẶP — không tách riêng cha hay mẹ được  ·  ' + u.id,
      nguyHiem: true,
      chay: () => unlink(personId, '', 'parent', Object.assign({ unionId: u.id }, xuLy)),
    });
  }

  for (const m of getSpouses(index, personId)) {
    cacMuc.push({
      ma: 'spouse:' + m.personId,
      chu: 'Vợ / chồng: ' + tenNguoi(m.personId),
      phu: moTaCap(index.unionById.get(m.unionId) || {}),
      nguyHiem: true,
      chay: () => unlink(personId, m.personId, 'spouse',
                         Object.assign({ unionId: m.unionId }, xuLy)),
    });
  }

  for (const m of getChildren(index, personId)) {
    cacMuc.push({
      ma: 'child:' + m.personId,
      chu: 'Con: ' + tenNguoi(m.personId),
      phu: (m.relation === 'adopted' ? 'con nuôi  ·  ' : '') + m.unionId,
      nguyHiem: true,
      chay: () => unlink(personId, m.personId, 'child',
                         Object.assign({ unionId: m.unionId }, xuLy)),
    });
  }

  if (cacMuc.length === 0) {
    moHopBao('Gỡ nối', tenNguoi(personId) + ' chưa nối với ai trong gia phả, nên ' +
             'không có mối nối nào để gỡ.', false,
             ['Muốn nối họ vào gia phả thì dùng "Kết nối" trong menu.']);
    return;
  }

  moHopChon('chon', xuLy, {
    tieuDe: 'Gỡ nối',
    phu:    tenNguoi(personId) + '  ·  ' + personId,
    cauMo:  'Bỏ mối nối nào? Không ai bị xoá khỏi gia phả — chỉ mối nối mất đi.',
    cacMuc,
  });
}

/**
 * Gỡ một mối nối, có hộp xác nhận kể tên hậu quả và có đường hoàn tác.
 *
 * @param {string} personId
 * @param {string} targetId  người bên kia. RỖNG khi `relationType === 'parent'`,
 *        vì thứ bị gỡ ở đó là mối nối tới cả CẶP chứ không tới một người (luật 9).
 * @param {'parent'|'spouse'|'child'} relationType
 * @param {{unionId?:string, onDaLuu?:function(string)}} [xuLy]
 *        `unionId` chỉ đúng cặp cần gỡ. Bỏ trống thì hàm tự tìm, và HỎI khi có
 *        nhiều hơn một cặp khớp — `P0020` có hai bộ cha mẹ là ca thật.
 */
export function unlink(personId, targetId, relationType, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;
  if (!TEN_QUAN_HE[relationType]) return;

  const hop = capKhopVoi(personId, targetId, relationType);

  if (hop.length === 0) {
    moHopBao('Gỡ nối', 'Không tìm thấy mối nối này nữa. Có thể gia phả vừa thay ' +
             'đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  const daChon = xuLy.unionId && hop.indexOf(xuLy.unionId) >= 0 ? xuLy.unionId
               : (hop.length === 1 ? hop[0] : '');

  if (!daChon) {
    moHopChon('chon', xuLy, {
      tieuDe: 'Gỡ nối',
      phu:    tenNguoi(personId) + '  ·  ' + personId,
      cauMo:  'Mối nối này có ở ' + hop.length + ' cặp. Gỡ khỏi cặp nào?',
      cacMuc: hop.map((uid) => ({
        ma: uid,
        chu: keTenPartner(uid),
        phu: moTaCap(index.unionById.get(uid) || {}),
        nguyHiem: true,
        chay: () => unlink(personId, targetId, relationType,
                           Object.assign({}, xuLy, { unionId: uid })),
      })),
    });
    return;
  }

  moHopXacNhanGo(personId, targetId, relationType, daChon, xuLy);
}

/** Mã những cặp mang đúng mối nối được hỏi. */
function capKhopVoi(personId, targetId, loai) {
  const index = state.index;
  const ra = [];

  if (loai === 'parent') {
    for (const u of getParentUnions(index, personId)) ra.push(u.id);
  } else if (loai === 'spouse') {
    for (const m of getSpouses(index, personId)) if (m.personId === targetId) ra.push(m.unionId);
  } else {
    for (const m of getChildren(index, personId)) if (m.personId === targetId) ra.push(m.unionId);
  }
  return ra.filter((id, i) => ra.indexOf(id) === i);
}

function moHopXacNhanGo(personId, targetId, loai, unionId, xuLy) {
  const chan = moHopTrang('go', xuLy, 'Gỡ nối',
                          tenNguoi(personId) + '  ·  ' + personId);

  // Luật 8, dùng lại nguyên vẹn cho đường này: dựng cây đã gỡ NGAY BÂY GIỜ, đọc
  // hậu quả từ chính nó, rồi giữ đúng bản ghi ấy để lát nữa ghi xuống. Tính một
  // lần, dùng hai việc — không có khe nào cho hai bên nghĩ khác nhau.
  goHT = doHauQuaGoNoi(personId, targetId, loai, unionId);

  const canTro = canTroLuu();
  if (canTro || !goHT) {
    hienNhan(canTro || 'Không dựng được bản ghi đã gỡ. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Gỡ xong thì:', false, cauKeHauQuaGoNoi(personId, targetId, loai, unionId));

  nutLuu = nutChanXoa('Gỡ mối nối này', true, () => chayGoNoi(personId, targetId, loai));
  chan.append(nutLuu, nutChanXoa('Không gỡ', false, () => closePersonForm()));
}

/**
 * Dựng cây đã gỡ, rồi đọc ra hậu quả bằng cách SO hai chỉ mục.
 *
 * @returns {{tree, union, banCu, diff, capChet, thanhLe, conMatChaMe}|null}
 *
 * `banCu` là bản chép nguyên vẹn của cặp TRƯỚC khi gỡ — đường hoàn tác ghi
 * thẳng bản ấy trở lại, không dựng lại từ `diff`. Dựng lại từ `diff` thì mỗi
 * trường thêm vào sau này là một trường bị quên.
 *
 * `thanhLe` — ai sau lần gỡ này không còn nối với ai. Chạy `checkOrphanNode`
 * hai lượt trên hai chỉ mục và chỉ giữ người ĐỔI trạng thái: ai vốn đã đứng lẻ
 * từ trước thì không phải hậu quả của việc hôm nay.
 */
function doHauQuaGoNoi(personId, targetId, loai, unionId) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu = index.unionById.get(unionId);
  if (!cu) return null;
  const banCu = JSON.parse(JSON.stringify(cu));

  const kq = (loai === 'spouse')
    ? removePartner(state.tree, unionId, targetId)
    : removeChild(state.tree, unionId, loai === 'child' ? targetId : personId);
  if (!kq) return null;

  let tree  = kq.tree;
  let union = kq.union;
  const diff = Object.assign({}, kq.diff);

  // Luật 10: gỡ xong phải hỏi tiếp *"cặp này còn khẳng định được điều gì không"*.
  let capChet = false;
  if (!conLyDoTonTai(union)) {
    const kqX = softDeleteUnion(tree, unionId);
    if (kqX) {
      tree = kqX.tree; union = kqX.union; capChet = true;
      Object.assign(diff, kqX.diff);
    }
  }

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không gỡ còn hơn gỡ mù
  }

  // Chỉ những người CÓ MẶT trong cặp cũ mới có thể đổi trạng thái vì lần gỡ này.
  // Đúng MỘT bước từ cặp ấy, nên không phải phép duyệt đồ thị, không cần `visited`.
  const lienQuan = new Set([personId, targetId]);
  for (const id of (Array.isArray(banCu.partners) ? banCu.partners : [])) {
    if (id) lienQuan.add(id);
  }
  for (const c of (Array.isArray(banCu.children) ? banCu.children : [])) {
    if (c && c.personId) lienQuan.add(c.personId);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  // Luật 9: gỡ một người khỏi hàng vợ/chồng của cặp CÒN CON thì họ đồng thời
  // thôi làm cha/mẹ của những người con ấy.
  const conMatChaMe = (loai === 'spouse')
    ? (Array.isArray(banCu.children) ? banCu.children : [])
        .map((c) => c && c.personId)
        .filter((id) => id && index.personById.has(id))
    : [];

  return { tree, union, banCu, diff, capChet, thanhLe, conMatChaMe };
}

/** Từng dòng hậu quả của đường GỠ, viết cho người không lập trình đọc. */
function cauKeHauQuaGoNoi(personId, targetId, loai, unionId) {
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);
  const dong = [];

  if (loai === 'spouse') {
    dong.push(B + ' và ' + A + ' thôi là vợ chồng. Hai bản ghi người vẫn còn ' +
              'nguyên trong gia phả, không ai bị xoá.');
    if (goHT.conMatChaMe.length > 0) {
      dong.push('⚠ ' + B + ' đồng thời thôi làm cha/mẹ của ' +
                goHT.conMatChaMe.map(tenNguoi).join(' · ') +
                '. Trong gia phả này quan hệ cha mẹ – con đi QUA cặp, nên không ' +
                'tách riêng được. Nếu bạn chỉ muốn ghi là hai người đã ly hôn mà ' +
                'vẫn giữ quan hệ cha con thì ĐỪNG gỡ nối ở đây.');
    }
  } else if (loai === 'child') {
    dong.push(B + ' thôi là con của ' + keTenPartner(unionId) + '. Bản ghi của ' +
              B + ' vẫn còn nguyên, không bị xoá.');
  } else {
    dong.push(A + ' thôi là con của ' + keTenPartner(unionId) + ' — CẢ CẶP, ' +
              'không tách riêng cha hay mẹ được.');
  }

  if (goHT.capChet) {
    dong.push('Cặp ' + unionId + ' sau đó không còn nói lên điều gì nữa (không ' +
              'còn đủ hai vợ chồng, cũng không còn quan hệ cha mẹ – con nào), ' +
              'nên app xoá luôn cặp ấy. Bản ghi cặp vẫn nằm trong file, mang dấu ' +
              '"đã xoá", và "Hoàn tác" đưa lại được nguyên vẹn.');
  }

  for (const id of goHT.thanhLe) {
    dong.push('⚠ ' + tenNguoi(id) + ' sẽ MẤT ĐƯỜNG VỀ. Sau khi gỡ, không sơ đồ ' +
              'nào còn vẽ ra họ nữa. Bản ghi vẫn nguyên vẹn, và tìm lại được ' +
              'bằng nút 🔍 ở góc trên phải rồi nối lại bằng "Kết nối" — nhưng ' +
              'nếu bạn không định làm thế thì cân nhắc nối họ vào chỗ khác trước.');
  }

  dong.push('Bấm "Hoàn tác" ngay sau đó là trả lại mối nối cũ, nguyên vẹn.');
  return dong;
}

async function chayGoNoi(personId, targetId, loai) {
  if (dangLuu || !goHT) return;

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang gỡ…', false);

  const unionId = goHT.union.id;
  const banCu   = goHT.banCu;
  const cau     = (loai === 'spouse')
    ? 'Gỡ ' + tenNguoi(targetId) + ' khỏi hàng vợ/chồng của ' + unionId
    : (loai === 'child'
      ? 'Gỡ ' + tenNguoi(targetId) + ' khỏi hàng con của ' + unionId
      : 'Gỡ ' + tenNguoi(personId) + ' khỏi hàng con của ' + unionId);

  const ketQua = await ghiBanGhi(null, [goHT.union], {
    action: 'update',
    target: unionId,
    note:   cau + (goHT.capChet ? ', và xoá mềm cặp ấy vì nó không còn nói lên gì.' : '.'),
    diff:   goHT.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    nutLuu.disabled = false;
    nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Mối nối này CHƯA bị gỡ.');
    return;
  }

  // Vẽ lại ngay, trong lúc hộp vẫn mở: người dùng nhìn thấy kết quả rồi mới
  // quyết định có hoàn tác hay không. Cùng lối của đường xoá (bước 21).
  if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(personId);

  nutLuu = null;
  hienNhan('Đã gỡ mối nối.', false,
           goHT.capChet
             ? ['Cặp ' + unionId + ' cũng đã được xoá mềm cùng lúc.']
             : []);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — nối lại như cũ', true, () => chayHoanTacGoNoi(personId, banCu)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  khoiKetQua.append(hang);
}

/**
 * Hoàn tác của đường gỡ: đặt NGUYÊN bản ghi cặp cũ trở lại.
 *
 * Một lần ghi, không phải hai, kể cả khi lần gỡ đã làm hai việc (gỡ mối nối +
 * xoá mềm cặp): cả hai việc ấy đều nằm trong đúng MỘT bản ghi cặp, nên ghi đè
 * bản cũ là hoàn nguyên cả hai. Đây chính là món lợi của việc `softDeleteUnion`
 * chỉ lật một cờ chứ không dọn mảng nào.
 */
async function chayHoanTacGoNoi(personId, banCu) {
  if (dangLuu) return;
  dangLuu = true;
  hienNhan('Đang nối lại…', false);

  const ketQua = await ghiBanGhi(null, [banCu], {
    action: 'restore',
    target: banCu.id,
    note:   'Hoàn tác: trả lại nguyên trạng cặp ' + banCu.id + '.',
    diff:   {},
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Mối nối VẪN đang bị gỡ.');
    return;
  }

  if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(personId);

  hienNhan('Đã nối lại như cũ.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  khoiKetQua.append(hang);
}

// ============================================================
// Ghi xuống Drive
// ============================================================

/**
 * Thay/thêm một người và nhiều cặp trong CÙNG MỘT lần `luuCay()` — luật 4.
 *
 * Không tìm thấy mã người cần THÊM mà nó đã có sẵn thì NÉM LỖI thay vì ghi đè:
 * hàm sửa chạy trên bản sao của cây LÚC LƯU, khác cây lúc mở hộp, và hai người
 * trùng mã thì `buildIndex()` ném lỗi — lúc ấy app không mở lại được nữa.
 *
 * Cặp thì ngược lại, được phép ghi đè: mọi đường đi tới đây đều vừa đọc cặp ấy
 * ra khỏi `state.tree` và sửa trên bản sao của nó, nên bản mang xuống là bản
 * đầy đủ chứ không phải một mảnh. Người khác sửa cặp ấy cùng lúc thì dấu vân
 * tay của `luuCay()` chặn lại, không phải chỗ này.
 */
async function ghiBanGhi(nguoiThem, cacUnion, moTa) {
  try {
    return await luuCay((cay) => {
      if (!Array.isArray(cay.persons)) cay.persons = [];
      if (!Array.isArray(cay.unions))  cay.unions  = [];

      if (nguoiThem) {
        if (cay.persons.some((p) => p && p.id === nguoiThem.id)) {
          throw new Error('Mã ' + nguoiThem.id + ' vừa được dùng cho một người ' +
                          'khác. Tải lại trang rồi làm lại.');
        }
        cay.persons.push(JSON.parse(JSON.stringify(nguoiThem)));
      }

      for (const u of (cacUnion || [])) {
        if (!u || !u.id) continue;
        const i = cay.unions.findIndex((x) => x && x.id === u.id);
        if (i >= 0) cay.unions[i] = JSON.parse(JSON.stringify(u));
        else        cay.unions.push(JSON.parse(JSON.stringify(u)));
      }
    }, moTa);
  } catch (e) {
    return { ok: false, loi: e && e.message ? e.message : String(e) };
  }
}

// ============================================================
// SỬA CẶP — bước 29
// ============================================================
//
// `updateUnion` và `swapPartnerOrder` viết ở bước 26 cho đủ bộ, có phép kiểm,
// mà chưa nút nào gọi. Đây là nút của chúng.
//
// --- BỐN quyết định của form sửa cặp -------------------------------------
//
// 1. **Form này KHÔNG đụng `partners` và `children`.** Thêm hay bớt người trong
//    cặp đã có đường riêng — *Kết nối* và *Gỡ nối* của bước 26 — và mỗi lần
//    chạm vào hai mảng ấy còn phải hỏi tiếp câu *"cặp này còn lý do tồn tại
//    không"* (`conLyDoTonTai`). Cho form này sửa luôn hai mảng ấy là mở một cửa
//    thứ hai đi vòng qua câu hỏi đó — đúng điều `domains/union.js` dặn.
//
// 2. **Đổi chỗ trái/phải là một CÔNG TẮC trong form, không phải một nút riêng.**
//    Nút riêng thì mỗi lần bấm là một lần ghi xuống Drive, và người dùng thử
//    ba lần là ba mục trong `changeLog`. Công tắc thì cả form đi xuống trong
//    MỘT lần lưu — luật 4 của đường ghi dữ liệu.
//
// 3. **Và công tắc ấy nói trước rằng nó có thể không đổi được gì.**
//    `layout.js` xếp nam bên trái, nữ bên phải theo GIỚI TÍNH; `partnerOrder`
//    chỉ có tác dụng khi hai người CÙNG GIỚI hoặc thiếu giới (QUY-TAC-VE §2).
//    Không nói ra thì người dùng bấm, lưu, nhìn sơ đồ không nhúc nhích, và kết
//    luận là app hỏng.
//
// 4. **`rank` và `partnerOrder` là HAI THỨ KHÁC NHAU, và form nói rõ điều đó.**
//    `rank` là thứ bậc vợ cả / vợ thứ — một sự thật về gia đình. `partnerOrder`
//    là vị trí trái/phải trên hình — một chuyện của cái sơ đồ. Gộp hai cái là
//    nói sai về gia đình người ta.

/**
 * Mở form sửa cặp của một người. Người ấy có nhiều cặp thì hỏi cặp nào trước.
 *
 * @param {string} mocId  người đang đứng giữa việc này
 * @param {{onDaLuu?:function(string)}} [xuLy]
 */
export function openUnionForm(mocId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(mocId)) return;

  const ds = getPartnerUnions(index, mocId);

  if (ds.length === 0) {
    moHopBao('Chưa có cặp nào để sửa',
             tenNguoi(mocId) + ' chưa đứng trong cặp vợ chồng nào, nên chưa có ' +
             'ngày cưới hay thứ bậc nào để ghi. Thêm vợ/chồng hoặc Kết nối ' +
             'trước đã — hai mục ấy nằm ở vòng tròn.', false);
    return;
  }

  if (ds.length === 1) { moFormCap(ds[0].id, xuLy); return; }

  moHopChon('chon', xuLy, {
    tieuDe: 'Sửa cặp nào?',
    phu:    tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  tenNguoi(mocId) + ' đứng trong ' + ds.length + ' cặp. Mỗi cặp có ' +
            'ngày cưới và thứ bậc riêng:',
    cacMuc: ds.map((u) => ({
      ma:  u.id,
      chu: 'Cặp với ' + keTenPartner(u.id),
      phu: moTaCap(u),
      chay: () => moFormCap(u.id, xuLy),
    })),
  });
}

function moFormCap(unionId, xuLy) {
  const u = state.index && state.index.unionById.get(unionId);
  if (!u) return;

  closePersonForm();
  xuLyNgoai  = xuLy || {};
  cheDo      = 'suaCap';
  capDangSua = unionId;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-cap';   // mốc cho bài kiểm hành vi, xem kiem-thung-rac.mjs
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sửa cặp';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = keTenPartner(unionId) + '  ·  ' + unionId;
  phu.style.cssText =
    'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  hop.append(tieuDe, phu);
  hop.append(...veCacOCap(u));

  khoiKetQua = document.createElement('div');
  hop.append(khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChan(null, !canTro));

  // Bấm ra ngoài KHÔNG đóng — cùng lý do với form hồ sơ: nó đang giữ những gì
  // người ta vừa gõ.
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

function veCacOCap(u) {
  const ra = [];

  ra.push(veNhan('Ngày cưới'));
  ra.push(oNgayCuoi(u));
  ra.push(oChu('marriagePlace', 'Nơi cưới', (u.marriage || {}).place, 'Làng, xã, tỉnh'));

  ra.push(veNhan('Cặp này bây giờ'));
  ra.push(veChonTrangThai(u));

  ra.push(veNhan('Thứ bậc'));
  ra.push(oThuBac(u));

  ra.push(veNhan('Chỗ đứng trên sơ đồ'));
  ra.push(veDoiChoTraiPhai(u));

  ra.push(veNhan('Ghi chú về cặp này'));
  ra.push(oNhieuDong('note', u.note, 'Cưới ở quê, cụ Bá làm chủ hôn…'));

  return ra;
}

/**
 * Ô ngày cưới, kèm đúng dòng *"máy đọc được gì"* của ô ngày sinh — `raw` là sự
 * thật, `iso` chỉ là thứ máy đọc được, và người dùng phải nhìn thấy chỗ ấy làm
 * việc (chốt 18/08/2026).
 */
function oNgayCuoi(u) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const m = (u && typeof u.marriage === 'object' && u.marriage) ? u.marriage : {};
  const input = document.createElement('input');
  input.type = 'text';
  input.value = coGiaTri(m.raw) ? String(m.raw) : '';
  input.placeholder = '1972  ·  12/3/1972  ·  khoảng 1972';
  input.setAttribute('aria-label', 'Ngày cưới');
  input.style.cssText = KIEU_O;
  o.marriage = input;

  const doc = document.createElement('div');
  doc.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';
  const capNhat = () => { doc.textContent = mayDocDuocGi(input.value); };
  input.addEventListener('input', capNhat);
  capNhat();

  boc.append(input, doc);
  return boc;
}

/** Hai nút: đang là vợ chồng, hay đã ly hôn. */
function veChonTrangThai(u) {
  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px;margin-top:6px';

  const CAC = [
    { ma: 'married',  chu: 'Đang là vợ chồng' },
    { ma: 'divorced', chu: 'Đã ly hôn' },
  ];
  let dangChon = u.status === 'divorced' ? 'divorced' : 'married';
  const cacNut = [];

  const veLai = () => {
    for (const { ma, nut } of cacNut) {
      nut.style.cssText = KIEU_NUT_CHON +
        (ma === dangChon
          ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
          : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
    }
  };

  for (const c of CAC) {
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.textContent = c.chu;
    nut.dataset.trangThai = c.ma;
    nut.addEventListener('click', () => { dangChon = c.ma; veLai(); });
    cacNut.push({ ma: c.ma, nut });
    hang.append(nut);
  }
  veLai();

  // Đọc bằng hàm, cùng lối với ô giới tính — xem `veChonGioi`.
  o.trangThai = { value: '', doc: () => dangChon };

  const nhac = document.createElement('div');
  nhac.textContent =
    'Ly hôn KHÔNG gỡ ai ra khỏi cặp: hai người vẫn là cha mẹ của những người ' +
    'con đứng dưới, và sơ đồ vẫn vẽ đúng như thế.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';

  const boc = document.createElement('div');
  boc.append(hang, nhac);
  return boc;
}

/**
 * `rank` — vợ cả là 1, vợ thứ là 2, 3… KHÔNG phải vị trí trái/phải trên sơ đồ.
 *
 * Ô số chứ không phải danh sách chọn: gia phả cũ có cụ bốn đời vợ, và một danh
 * sách cứng thì lần nào cũng thiếu đúng cái con số người ta cần.
 */
function oThuBac(u) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.value = String(thuBacHienTai(u));
  input.setAttribute('aria-label', 'Thứ bậc của cặp này');
  input.style.cssText = KIEU_O;
  o.rank = input;

  const nhac = document.createElement('div');
  nhac.textContent =
    '1 là vợ cả / chồng đầu, 2 là vợ thứ hai… Đây là thứ bậc trong gia đình, ' +
    'không phải chỗ đứng trái phải trên hình.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';

  boc.append(input, nhac);
  return boc;
}

/** Thiếu `rank` thì coi như 1 — cặp duy nhất của một người là cặp thứ nhất. */
function thuBacHienTai(u) {
  return (typeof u.rank === 'number' && u.rank > 0) ? u.rank : 1;
}

/**
 * Công tắc đổi chỗ trái/phải, kèm lời nói trước rằng nó có thể không đổi được
 * gì — quyết định 3 ở đầu mục.
 */
function veDoiChoTraiPhai(u) {
  const boc = document.createElement('div');

  const ds = (Array.isArray(u.partners) ? u.partners : []).filter(Boolean);
  if (ds.length < 2) {
    const mot = document.createElement('div');
    mot.textContent =
      'Cặp này mới có một người, nên chưa có chỗ trái phải nào để đổi.';
    mot.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
    boc.append(mot);
    o.doiCho = null;
    return boc;
  }

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hopChon = document.createElement('input');
  hopChon.type = 'checkbox';
  hopChon.checked = false;
  hopChon.style.cssText = 'width:18px;height:18px;accent-color:#2a2622';
  o.doiCho = hopChon;

  const chu = document.createElement('span');
  chu.textContent = 'Đổi chỗ trái ↔ phải trên sơ đồ';

  nhan.append(hopChon, chu);
  boc.append(nhan);

  if (khacGioi(ds)) {
    const canh = document.createElement('div');
    canh.textContent =
      'Hai người này khác giới, mà sơ đồ luôn xếp nam bên trái, nữ bên phải. ' +
      'Đổi thì dữ liệu có đổi thật, nhưng hình sẽ đứng nguyên như cũ.';
    canh.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';
    boc.append(canh);
  }

  return boc;
}

/** Đúng hai người, một nam một nữ — lúc ấy `partnerOrder` không đổi được hình. */
function khacGioi(partnerIds) {
  const gioi = partnerIds
    .map((id) => state.index.personById.get(id))
    .filter(Boolean)
    .map((p) => p.sex);
  return gioi.indexOf('M') >= 0 && gioi.indexOf('F') >= 0;
}

/**
 * Lưu cặp. Cùng trình tự với `handleSave`: rà trên cây MỚI, một lần ghi duy
 * nhất, giao diện chỉ đổi sau khi máy chủ gật.
 *
 * ⚠ Chỉ gửi vào `changes` những gì THẬT SỰ khác bản đang lưu. `updateUnion` tự
 * so sánh, nhưng nó so với giá trị đã chuẩn hoá: cặp chưa có `status` mà gửi
 * `'married'` xuống thì nó thấy `undefined !== 'married'` và ghi một dòng
 * `changeLog` cho một việc chẳng ai làm. Mở form rồi bấm Lưu ngay phải là một
 * việc KHÔNG để lại dấu vết.
 */
async function handleSaveUnion() {
  if (dangLuu) return;

  const u = state.index && state.index.unionById.get(capDangSua);
  if (!u) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  const changes = {
    note: docO('note'),
    marriage: { raw: docO('marriage'), place: docO('marriagePlace') },
  };

  const ttMoi   = o.trangThai ? o.trangThai.doc() : 'married';
  const ttCu    = u.status === 'divorced' ? 'divorced' : (u.status || 'married');
  if (ttMoi !== ttCu) changes.status = ttMoi;

  const bacMoi = Number(String(docO('rank')).trim());
  if (Number.isFinite(bacMoi) && bacMoi > 0 && bacMoi !== thuBacHienTai(u)) {
    changes.rank = bacMoi;
  }

  const kq = updateUnion(state.tree, capDangSua, changes);
  if (!kq) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  // Đổi chỗ NỐI ĐUÔI vào cây mà `updateUnion` vừa trả về — hai hàm chạy trên
  // hai cây khác nhau thì cây gửi lên chỉ mang một trong hai thay đổi.
  const doiCho = !!(o.doiCho && o.doiCho.checked);
  const kqDoi  = doiCho ? swapPartnerOrder(kq.tree, capDangSua) : null;

  const cayCuoi  = kqDoi ? kqDoi.tree  : kq.tree;
  const capCuoi  = kqDoi ? kqDoi.union : kq.union;
  const diffCuoi = kqDoi ? Object.assign({}, kq.diff, kqDoi.diff) : kq.diff;

  if (Object.keys(diffCuoi).length === 0) {
    hienNhan('Chưa có gì thay đổi so với bản đang lưu, nên không cần lưu lại.', false);
    return;
  }

  // Phạm vi `'union'` chạy đúng một phép: khoảng cách tuổi vợ chồng. Nó không
  // nói về ngày cưới — nhưng nó nói về chính cặp vừa đụng vào, nên vẫn chạy,
  // vẫn theo luật 2 (rà trên cây MỚI với chỉ mục MỚI).
  const indexMoi = buildIndex(cayCuoi);
  const raSoat = validateAll(cayCuoi, indexMoi, 'union', { unionId: capDangSua });

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

  const ketQua = await ghiBanGhi(null, [capCuoi], {
    action: 'update',
    target: capDangSua,
    note:   'Sửa cặp ' + keTenPartner(capDangSua) + '.',
    diff:   diffCuoi,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    nutLuu.disabled = false;
    nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Cặp này VẪN như cũ.');
    return;
  }

  if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(capDangSua);
  closePersonForm();
}

// ============================================================
// SẮP THỨ TỰ ANH CHỊ EM (21/08/2026)
// ============================================================
//
// `reorderChildren()` viết ở bước 19, có phép kiểm, mà tới nay chưa nút nào
// gọi. Đây là cái tay cầm của nó.
//
// --- SÁU quyết định của màn hình này -------------------------------------
//
// 1. **KÉO TAY LÀ ĐƯỜNG CHÍNH; SẮP THEO TUỔI CHỈ LÀ ĐƯỜNG PHỤ.** Chủ dự án nêu
//    hai ca thật (21/08/2026) và cả hai đều làm phép sắp theo tuổi cho kết quả
//    SAI: nhiều người con không còn ai nhớ năm sinh, và **con thứ được giao
//    trưởng họ thì phải đứng bên trái các anh**. Nên `thuTuConTheoTuoi()` ở đây
//    chỉ XẾP THỬ các thẻ trong hộp — phải bấm *Xong* mới ghi xuống Drive.
//
// 2. **Hộp riêng, KHÔNG kéo thẳng trên sơ đồ.** Kéo trên sơ đồ nhìn đẹp hơn,
//    nhưng phải tạm khoá cử chỉ kéo và phóng của `tree-view.js` trong lúc sắp,
//    và một hàng tám chín người con thì chạy ra ngoài mép màn hình điện thoại —
//    đúng lúc người dùng cần nhìn thấy cả hàng để biết mình đang đổi cái gì.
//
// 3. **Các thẻ XUỐNG DÒNG, không cuộn ngang.** Cuộn ngang và kéo ngang là hai
//    cử chỉ giống hệt nhau trên màn hình chạm; đặt cạnh nhau thì trình duyệt
//    phải đoán, và nó sẽ đoán sai. Xuống dòng thì không còn gì để đoán. Đổi
//    lại, mỗi thẻ phải mang một CON SỐ — khi hàng đã xuống dòng thì *"bên
//    trái"* hết là câu trả lời rõ ràng.
//
// 4. **Mỗi thẻ có thêm hai nút ◀ ▶.** Kéo là một cử chỉ, mà luật chat 1.6 đòi
//    mọi cử chỉ phải có một cái nút đi kèm. Và tay run thì nút vẫn bấm được.
//
// 5. **Người trong THÙNG RÁC vẫn hiện, mờ đi.** `reorderChildren()` từ chối
//    thẳng danh sách không phải một hoán vị ĐẦY ĐỦ, mà xoá mềm thì CỐ Ý không
//    gỡ mã người ra khỏi `union.children` (xem `person.softDeletePerson`). Giấu
//    họ đi là gửi lên một danh sách thiếu, hàm trả về `null`, và người dùng chỉ
//    nghe *"không lưu được"* mà không có lý do nào đọc được.
//
// 6. **KHÔNG chạy `validateAll`.** Đã soát `validate.js` ngày 21/08/2026: chín
//    luật rà **không luật nào đọc `order`**, nên đảo chỗ anh em không sinh ra
//    được một vi phạm mới. Chạy phạm vi `'union'` ở đây chỉ moi ra lời cảnh báo
//    về khoảng cách tuổi vợ chồng — chuyện chẳng liên quan gì tới cú kéo người
//    dùng vừa làm — rồi chặn nút *Xong* lại sau một câu *"Vẫn lưu"* khó hiểu.

/**
 * Mở màn hình sắp thứ tự, từ MỘT trong hai cửa:
 *
 * @param {string} mocId  người đang đứng giữa việc này
 * @param {'anhChiEm'|'con'} vai
 *        `'anhChiEm'` — cửa CHẠM GIỮ trên ô sơ đồ. Sắp hàng anh chị em của
 *                       người ấy, tức sắp con của cặp CHA MẸ họ.
 *        `'con'`      — cửa NÚT trong thẻ thông tin. Sắp con của cặp mà chính
 *                       người ấy làm vợ/chồng.
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *
 * Hai vai hỏi hai câu khác nhau nhưng ghi cùng một chỗ: `union.children[].order`.
 */
export function openSapThuTu(mocId, vai, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(mocId)) return;

  const laCon = vai === 'con';
  const tatCa = laCon ? getPartnerUnions(index, mocId) : getParentUnions(index, mocId);
  const sapDuoc = tatCa.filter((u) => soConConLai(u) >= 2);

  if (sapDuoc.length === 0) { baoKhongCoGiDeSap(mocId, laCon, tatCa); return; }
  if (sapDuoc.length === 1) { moManSap(sapDuoc[0].id, mocId, laCon, xuLy); return; }

  // Từ hai cặp trở lên thì PHẢI hỏi — cùng câu hỏi mà `chonCap()` đã trả lời
  // cho bốn đường khác. Người có hai bộ cha mẹ là ca thật trong dữ liệu làm
  // việc; đoán hộ ở đây là sắp lại nhầm một hàng anh em không ai đụng tới.
  moHopChon('chon', xuLy, {
    tieuDe: laCon ? 'Sắp thứ tự con của cặp nào?' : 'Sắp trong cặp cha mẹ nào?',
    phu:    tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  laCon
      ? tenNguoi(mocId) + ' có ' + sapDuoc.length + ' cặp có từ hai người con ' +
        'trở lên. Mỗi cặp giữ một thứ tự riêng:'
      : tenNguoi(mocId) + ' có ' + sapDuoc.length + ' bộ cha mẹ, và thứ tự anh ' +
        'chị em được ghi trong TỪNG cặp. Chọn cặp:',
    cacMuc: sapDuoc.map((u) => ({
      ma:  u.id,
      chu: 'Con của ' + keTenPartner(u.id),
      phu: soConConLai(u) + ' người con  ·  ' + u.id,
      chay: () => moManSap(u.id, mocId, laCon, xuLy),
    })),
  });
}

/**
 * Ngõ cụt: không có hàng nào để sắp. **Phải nói ra bằng chữ.**
 *
 * Một cử chỉ ẩn mà không sinh ra gì là thứ làm người dùng tưởng máy chưa nhận
 * cú chạm, rồi giữ lại lần nữa, lâu hơn. Ba câu cho ba ca khác nhau, vì ba ca
 * ấy dẫn tới ba việc khác nhau người dùng nên làm tiếp.
 */
function baoKhongCoGiDeSap(mocId, laCon, tatCa) {
  const ten = tenNguoi(mocId);

  if (tatCa.length === 0) {
    moHopBao('Chưa có hàng nào để sắp',
      laCon
        ? ten + ' chưa đứng trong cặp vợ chồng nào, nên chưa có người con nào ' +
          'để sắp thứ tự.'
        : ten + ' chưa nối với cha mẹ nào, nên chưa có hàng anh chị em nào để ' +
          'sắp thứ tự. Muốn nối thì bấm nút ⓘ ở góc dưới phải rồi chọn ' +
          '"+ Cha mẹ".', false);
    return;
  }

  const dong = tatCa.map((u) =>
    'Cặp ' + keTenPartner(u.id) + ' (' + u.id + ') mới có ' + soConConLai(u) +
    ' người con trong gia phả.');

  moHopBao('Chỉ có một mình, không có thứ tự nào để sắp',
    laCon
      ? ten + ' mới có một người con, nên chưa có thứ tự nào để sắp. Thêm con ' +
        'thì bấm nút ⓘ rồi chọn "+ Con".'
      : ten + ' là con một, nên không có ai để đứng trước hay đứng sau. Thứ tự ' +
        'anh chị em chỉ sắp được khi cặp cha mẹ có từ hai người con trở lên.',
    false, dong);
}

/** Số người con của một cặp mà HIỆN CÒN trong gia phả — người trong thùng rác không tính. */
function soConConLai(u) {
  const index = state.index;
  return (Array.isArray(u && u.children) ? u.children : [])
    .filter((c) => c && c.personId && index && index.personById.has(c.personId))
    .length;
}

/**
 * Thứ tự ĐANG HIỆN TRÊN SƠ ĐỒ của các con trong một cặp.
 *
 * ⚠ Sắp theo `order` rồi mới lấy mã, KHÔNG đọc thẳng thứ tự của mảng —
 * `layout.js` dòng "children.sort((a,b) => a.order - b.order)" mới là thứ quyết
 * định ai đứng trái ai đứng phải. Hai thứ ấy lệch nhau thì hộp này bày ra một
 * hàng khác với hàng người dùng vừa nhìn thấy, và mọi cú kéo đều thành sai chỗ.
 *
 * ⚠ Và nó lấy CẢ người trong thùng rác — xem quyết định 5 ở đầu mục.
 */
function thuTuDangCo(u) {
  return (Array.isArray(u && u.children) ? u.children : [])
    .filter((c) => c && c.personId)
    .slice()
    .sort((a, b) => (soThuTuCon(a) - soThuTuCon(b)) || (a.personId < b.personId ? -1 : 1))
    .map((c) => c.personId);
}

/** Giống hệt `soOrder()` trong `domains/union.js` — thiếu `order` thì xếp cuối. */
function soThuTuCon(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

function moManSap(unionId, mocId, laCon, xuLy) {
  const u = timCapTrongCay(unionId);
  if (!u) return;

  closePersonForm();
  xuLyNgoai = xuLy || {};
  cheDo     = 'sapThuTu';
  sapCtx    = { unionId, mocId, laCon, thuTu: thuTuDangCo(u) };

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-sap-thu-tu';   // mốc cho bài kiểm hành vi
  hop.style.cssText = KIEU_HOP;

  const t = document.createElement('div');
  t.textContent = laCon ? 'Sắp thứ tự các con' : 'Sắp thứ tự anh chị em';
  t.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = 'Con của ' + keTenPartner(unionId) + '  ·  ' + unionId;
  phu.style.cssText =
    'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  const chiDan = document.createElement('div');
  chiDan.textContent =
    'Số 1 là anh/chị cả, số cuối cùng là em út. Kéo một thẻ sang chỗ khác, ' +
    'hoặc bấm ◀ ▶ để dịch từng nấc. Chưa có gì được ghi cho tới lúc bấm Xong.';
  chiDan.style.cssText = 'margin-top:12px;font-size:12px;line-height:1.5;color:#8a8078';

  sapDay = document.createElement('div');
  sapDay.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
  sapDay.addEventListener('pointermove',   keoDi);
  sapDay.addEventListener('pointerup',     keoLen);
  sapDay.addEventListener('pointercancel', keoLen);

  hop.append(t, phu, chiDan, sapDay);
  veDayCon();

  khoiKetQua = document.createElement('div');
  hop.append(khoiKetQua);

  const hangPhu = document.createElement('div');
  hangPhu.style.cssText = 'margin-top:14px';
  hangPhu.append(nutChon('Xếp thử theo tuổi', false, sapTheoTuoi));
  hop.append(hangPhu);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
  nutLuu = nutChanDam('Xong', () => handleSaveThuTu());
  if (canTro) { nutLuu.disabled = true; nutLuu.style.opacity = '.45'; }
  chan.append(nutLuu, nutChanXoa('Huỷ', false, () => closePersonForm()));
  hop.append(chan);

  // Bấm ra ngoài KHÔNG đóng — cùng lý do với form: hộp đang giữ một thứ tự
  // người dùng vừa sắp bằng tay mà chưa lưu.
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

/** Vẽ lại toàn bộ dãy thẻ từ `sapCtx.thuTu`. Rẻ: một cặp hiếm khi quá mười con. */
function veDayCon() {
  if (!sapDay || !sapCtx) return;
  sapDay.innerHTML = '';
  sapCtx.thuTu.forEach((id, i) => sapDay.append(veTheCon(id, i)));
}

/**
 * Một thẻ con: SỐ THỨ TỰ · ảnh tròn · tên · năm sinh · hai nút ◀ ▶.
 *
 * ⚠ `touch-action:none` đặt trên THẺ, không đặt trên cả dãy: đặt trên dãy thì
 * hộp hết cuộn dọc được bằng ngón tay, mà hàng chín người con thì thẻ đã đẩy
 * nút *Xong* xuống dưới mép màn hình.
 */
function veTheCon(id, i) {
  const p = timNguoiTrongCay(id);
  const conTrong = !!(state.index && state.index.personById.has(id));
  const dangKeo  = !!(sapKeo && sapKeo.tu === i);

  const the = document.createElement('div');
  the.dataset.ma    = id;          // mốc cho bài kiểm hành vi
  the.dataset.viTri = String(i);
  the.style.cssText =
    'flex:0 0 78px;box-sizing:border-box;padding:6px 4px 5px;border-radius:10px;' +
    'display:flex;flex-direction:column;align-items:center;gap:2px;' +
    'touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;' +
    (id === sapCtx.mocId
      ? 'background:#fdf6ec;border:1.5px solid #c07a3e;'
      : 'background:#fff;border:1px solid #e6e0d8;') +
    (conTrong ? '' : 'opacity:.45;') +
    (dangKeo ? 'opacity:.4;' : '');

  const so = document.createElement('div');
  so.textContent = String(i + 1);
  so.style.cssText =
    'font-size:11px;font-weight:600;color:#8a8078;line-height:1';
  the.append(so);

  const tron = document.createElement('div');
  tron.style.cssText =
    'width:38px;height:38px;border-radius:50%;overflow:hidden;' +
    'box-shadow:0 0 0 2px #ffffff, 0 0 0 3px ' + mauVien(p) + '66';
  const im = document.createElement('img');
  im.src = anhMacDinhUri(p && p.sex, mauVien(p));
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  tron.append(im);
  const anhThat = p && typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, 120);
    const thu = new Image();
    thu.onload = () => { if (thu.naturalWidth > 0) im.src = duong; };
    thu.src = duong;
  }
  the.append(tron);

  const ten = document.createElement('div');
  ten.textContent = p ? (fullName(p) || id) : id;
  ten.style.cssText =
    'font-size:11px;line-height:1.25;text-align:center;color:#2a2622;' +
    'word-break:break-word';
  the.append(ten);

  const phu = conTrong ? namSinhNgan(p) : 'trong thùng rác';
  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText = 'font-size:10px;line-height:1.2;color:#8a8078;text-align:center';
    the.append(d);
  }

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:3px;margin-top:3px';
  hang.append(nutDich('◀', 'trai', i > 0, () => dichCho(i, -1)));
  hang.append(nutDich('▶', 'phai', i < sapCtx.thuTu.length - 1, () => dichCho(i, 1)));
  the.append(hang);

  the.addEventListener('pointerdown', (e) => keoXuong(e, i));
  return the;
}

function nutDich(chu, huong, bat, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.dataset.dich = huong;        // mốc cho bài kiểm hành vi
  nut.disabled = !bat;
  nut.style.cssText =
    'width:30px;height:26px;padding:0;font-size:11px;font-family:inherit;' +
    'border-radius:6px;border:1px solid #e6e0d8;background:#faf8f5;color:#2a2622;' +
    'touch-action:manipulation;' +
    'cursor:' + (bat ? 'pointer' : 'not-allowed') + ';opacity:' + (bat ? '1' : '.35') + ';';
  if (bat) nut.addEventListener('click', chay);
  return nut;
}

/** Năm sinh, ngắn gọn — thẻ rộng 78px không chứa nổi cả dòng đời sống. */
function namSinhNgan(p) {
  const moc = p ? mocNgay(p.birth) : null;
  return (moc && Number.isFinite(Number(moc.nam))) ? String(moc.nam) : '';
}

// --- Kéo thẻ -------------------------------------------------------------
//
// Bắt con trỏ trên CẢ DÃY chứ không trên thẻ: mỗi lần đổi chỗ là `veDayCon()`
// dựng lại toàn bộ thẻ, nên cái thẻ đang bị kéo biến mất giữa chừng và mọi sự
// kiện sau đó rơi vào hư không. Dãy thì sống suốt cú kéo.

function keoXuong(e, i) {
  // Hai nút ◀ ▶ nằm ngay trong thẻ. Không chừa chúng ra thì mỗi cú bấm nút
  // cũng mở đầu một cú kéo, và thẻ nhảy hai nấc thay vì một.
  if (e.target && e.target.closest && e.target.closest('button')) return;
  if (!sapCtx || sapCtx.thuTu.length < 2) return;

  sapKeo = { tu: i };
  try { sapDay.setPointerCapture(e.pointerId); } catch (loi) { /* trình duyệt cũ */ }
  veDayCon();
  e.preventDefault();
}

function keoDi(e) {
  if (!sapKeo || !sapCtx) return;
  const den = theGanNhat(e.clientX, e.clientY);
  if (den < 0 || den === sapKeo.tu) return;

  const ds = sapCtx.thuTu;
  ds.splice(den, 0, ds.splice(sapKeo.tu, 1)[0]);
  sapKeo.tu = den;
  veDayCon();
}

function keoLen(e) {
  if (!sapKeo) return;
  sapKeo = null;
  try { sapDay.releasePointerCapture(e.pointerId); } catch (loi) { /* đã nhả rồi */ }
  veDayCon();
}

/**
 * Thẻ có TÂM gần con trỏ nhất. Đo bằng khoảng cách hai chiều chứ không chỉ đo
 * bề ngang, vì dãy thẻ XUỐNG DÒNG — kéo xuống dòng dưới cũng phải đổi chỗ được.
 */
function theGanNhat(x, y) {
  if (!sapDay) return -1;
  let tot = -1;
  let gan = Infinity;
  const cac = sapDay.children;
  for (let i = 0; i < cac.length; i += 1) {
    const r = cac[i].getBoundingClientRect();
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (d < gan) { gan = d; tot = i; }
  }
  return tot;
}

function dichCho(i, buoc) {
  if (!sapCtx) return;
  const j = i + buoc;
  if (j < 0 || j >= sapCtx.thuTu.length) return;
  const ds = sapCtx.thuTu;
  const tam = ds[i]; ds[i] = ds[j]; ds[j] = tam;
  veDayCon();
}

/**
 * Xếp thử theo tuổi. KHÔNG ghi gì — chỉ đổi chỗ các thẻ trong hộp.
 *
 * ⚠ `thuTuConTheoTuoi()` đọc thứ tự ĐANG LƯU trong `state.tree`, không đọc dãy
 * thẻ đang bày ra. Nên bấm nút này sau khi đã kéo tay là **bỏ hết những gì vừa
 * kéo**. App nói thẳng điều ấy ra thay vì để người dùng tự phát hiện.
 */
function sapTheoTuoi() {
  if (!sapCtx) return;

  const kq = thuTuConTheoTuoi(state.tree, sapCtx.unionId);
  if (!kq) {
    hienNhan('Chưa xếp theo tuổi được: cặp này có chưa tới hai người con còn ' +
             'ghi năm sinh. Kéo tay hoặc bấm ◀ ▶ để sắp.', false);
    return;
  }
  if (kq.hopLe) {
    hienNhan('Thứ tự đang LƯU đã đúng theo tuổi rồi, nên phép này không đổi ' +
             'được chỗ nào.', false);
    return;
  }

  sapCtx.thuTu = kq.thuTuMoi.slice();
  veDayCon();
  hienNhan('Đã xếp thử theo tuổi. Người thiếu năm sinh giữ nguyên chỗ cũ. ' +
           'Phép này tính từ thứ tự ĐANG LƯU nên nó bỏ qua những gì bạn vừa ' +
           'kéo bằng tay. Xem lại rồi bấm Xong mới ghi.', false);
}

/**
 * Ghi thứ tự mới. Một lần `luuCay()`, mang đúng một bản ghi cặp.
 *
 * Không chạy `validateAll` — xem quyết định 6 ở đầu mục.
 */
async function handleSaveThuTu() {
  if (dangLuu || !sapCtx) return;

  const unionId = sapCtx.unionId;
  const cu = timCapTrongCay(unionId);
  if (!cu) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  if (thuTuDangCo(cu).join('|') === sapCtx.thuTu.join('|')) {
    hienNhan('Chưa đổi chỗ ai cả, nên không có gì để lưu.', false);
    return;
  }

  const kq = reorderChildren(state.tree, unionId, sapCtx.thuTu);
  if (!kq) {
    hienNhan('Không ghi được thứ tự này — danh sách người con vừa đổi ở nơi ' +
             'khác. Tải lại trang rồi sắp lại.', true);
    return;
  }

  dangLuu = true;
  nutLuu.disabled = true;
  nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'update',
    target: unionId,
    note:   'Sắp lại thứ tự anh chị em trong cặp ' + keTenPartner(unionId) + '.',
    diff:   kq.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;   // người dùng đã đóng hộp trong lúc chờ máy chủ

  if (!(ketQua && ketQua.ok)) {
    nutLuu.disabled = false;
    nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Thứ tự anh chị em VẪN như cũ.');
    return;
  }

  if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(unionId);
  closePersonForm();
}

// ============================================================
// THÙNG RÁC — đưa trở lại (bước 29)
// ============================================================
//
// Hai hàm dưới đây là chỗ đến của hai callback trong `pages/person-list.js`.
// Chúng ở đây chứ không ở đó vì cùng một lý do đã đặt mọi hộp xác nhận của
// bước 26 vào file này: **đường ghi xuống Drive chỉ có một chỗ.**
//
// ⚠ Cả hai đọc thẳng `state.tree`, KHÔNG đọc `state.index`. `buildIndex()` bỏ
// qua mọi bản ghi mang cờ `deleted`, nên tra chỉ mục ở đây là luôn không thấy gì.

/**
 * Đưa một người đã xoá trở lại gia phả.
 *
 * @param {string} personId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 */
export function khoiPhucNguoi(personId, xuLy = {}) {
  const nguoi = timNguoiTrongCay(personId);
  if (!nguoi) {
    moHopBao('Không tìm thấy bản ghi',
             'Không còn ai mang mã ' + personId + ' trong gia phả. Tải lại ' +
             'trang rồi mở lại thùng rác.', true);
    return;
  }
  if (nguoi.deleted !== true) {
    moHopBao('Người này đang ở trong gia phả',
             tenTrongCay(state.tree, personId) + ' không nằm trong thùng rác ' +
             'nữa — có thể người khác vừa đưa họ trở lại. Tải lại trang để thấy ' +
             'bản mới nhất.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Đưa trở lại gia phả',
                          tenTrongCay(state.tree, personId) + '  ·  ' + personId);
  hienNhan('Người này sẽ hiện lại trên sơ đồ, đúng chỗ cũ — xoá mềm không gỡ ' +
           'một mối nối nào, nên không có gì phải nối lại.',
           false, cauKeKhiTroLai(personId));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayKhoiPhucNguoi(personId)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Những gì người dùng cần biết TRƯỚC khi bấm. Hai câu, và câu thứ hai là câu
 * hay gặp: người bị xoá vì gỡ nối thì cặp của họ cũng nằm trong thùng rác, và
 * đưa mỗi người trở lại thì sơ đồ vẫn chưa vẽ ra họ.
 */
function cauKeKhiTroLai(personId) {
  const cacCap = (Array.isArray(state.tree.unions) ? state.tree.unions : [])
    .filter((u) => u && coMatTrongCap(u, personId));
  if (cacCap.length === 0) {
    return ['Người này không đứng trong cặp nào, nên sau khi trở lại vẫn chưa ' +
            'nối với ai. Tìm họ ở màn hình Danh sách người.'];
  }

  const capXoa = cacCap.filter((u) => u.deleted === true);
  if (capXoa.length === cacCap.length) {
    return ['Mọi cặp của người này cũng đang nằm trong thùng rác (' +
            capXoa.map((u) => u.id).join(', ') + '), nên sơ đồ vẫn chưa vẽ ra ' +
            'họ. Đưa nốt mấy cặp ấy trở lại thì mối nối mới sống lại.'];
  }
  return [];
}

function coMatTrongCap(u, personId) {
  const laPartner = (Array.isArray(u.partners) ? u.partners : []).indexOf(personId) >= 0;
  const laCon = (Array.isArray(u.children) ? u.children : [])
    .some((c) => c && c.personId === personId);
  return laPartner || laCon;
}

async function chayKhoiPhucNguoi(personId) {
  if (dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';
  const kq  = restorePerson(state.tree, personId, { boi, luc });
  if (!kq) {
    hienNhan('Không đưa trở lại được — bản ghi vừa đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ten = tenTrongCay(kq.tree, personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'restore',
    target: personId,
    note:   'Đưa ' + ten + ' trở lại gia phả từ thùng rác.',
    diff:   kq.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Người này VẪN đang trong thùng rác.');
    return;
  }

  if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(personId);
  baoXongMotViec('Đã đưa ' + ten + ' trở lại gia phả.');
}

/**
 * Đưa một cặp đã xoá trở lại.
 *
 * @param {string} unionId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 */
export function khoiPhucCap(unionId, xuLy = {}) {
  const u = timCapTrongCay(unionId);
  if (!u) {
    moHopBao('Không tìm thấy cặp',
             'Không còn cặp nào mang mã ' + unionId + '. Tải lại trang rồi mở ' +
             'lại thùng rác.', true);
    return;
  }
  if (u.deleted !== true) {
    moHopBao('Cặp này đang ở trong gia phả',
             'Cặp ' + unionId + ' không nằm trong thùng rác nữa — có thể người ' +
             'khác vừa đưa nó trở lại. Tải lại trang để thấy bản mới nhất.', false);
    return;
  }

  const ten = (Array.isArray(u.partners) ? u.partners : [])
    .filter(Boolean).map((id) => tenTrongCay(state.tree, id));

  const chan = moHopTrang('chon', xuLy, 'Đưa cặp trở lại',
                          (ten.length > 0 ? ten.join('  ↔  ') : 'Cặp chưa có ai') +
                          '  ·  ' + unionId);
  hienNhan('Cặp trở lại là mọi mối nối của nó trở lại cùng một lúc: vợ chồng, ' +
           'và cả quan hệ cha mẹ – con của những người con đứng dưới.',
           false, cauKeKhiCapTroLai(u));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayKhoiPhucCap(unionId)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/** Cặp sống lại mà người trong cặp vẫn nằm trong thùng rác thì phải nói ra. */
function cauKeKhiCapTroLai(u) {
  const ra = [];

  const conXoa = (Array.isArray(u.partners) ? u.partners : [])
    .filter(Boolean)
    .filter((id) => {
      const p = timNguoiTrongCay(id);
      return p && p.deleted === true;
    });

  if (conXoa.length > 0) {
    ra.push('Vẫn còn ' + conXoa.map((id) => tenTrongCay(state.tree, id)).join(', ') +
            ' đang nằm trong thùng rác, nên sơ đồ chưa vẽ ra cặp này. Đưa nốt ' +
            'họ trở lại thì mới thấy.');
  }

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId).length;
  if (soCon > 0) {
    ra.push(soCon + ' người con sẽ có lại cha mẹ trên sơ đồ.');
  }
  return ra;
}

async function chayKhoiPhucCap(unionId) {
  if (dangLuu) return;

  const kq = restoreUnion(state.tree, unionId);
  if (!kq) {
    hienNhan('Không đưa trở lại được — cặp vừa đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'restore',
    target: unionId,
    note:   'Đưa cặp ' + unionId + ' trở lại gia phả từ thùng rác.',
    diff:   kq.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Cặp này VẪN đang trong thùng rác.');
    return;
  }

  if (xuLyNgoai.onDaLuu) xuLyNgoai.onDaLuu(unionId);
  baoXongMotViec('Đã đưa cặp ' + unionId + ' trở lại gia phả.');
}

/** Báo xong, và để lại đúng một nút Đóng — cùng khuôn với đường hoàn tác. */
function baoXongMotViec(cau) {
  hienNhan(cau, false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  khoiKetQua.append(hang);
}

/** Nút chân màu đậm — việc CHÍNH của hộp. `nutChanXoa` chỉ có nhạt và đỏ. */
function nutChanDam(chu, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText = KIEU_NUT_CHAN + 'flex:1 1 45%;text-align:center;' +
    'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600';
  nut.addEventListener('click', chay);
  return nut;
}

function timNguoiTrongCay(personId) {
  const ds = (state.tree && Array.isArray(state.tree.persons)) ? state.tree.persons : [];
  return ds.find((p) => p && p.id === personId) || null;
}

function timCapTrongCay(unionId) {
  const ds = (state.tree && Array.isArray(state.tree.unions)) ? state.tree.unions : [];
  return ds.find((u) => u && u.id === unionId) || null;
}
