// ============================================================
// giapha · js/pages/person-edit.js
// Vai trò  : Form thêm/sửa người và SỬA CẶP, ảnh đại diện, thêm quan hệ,
//            SỬA QUAN HỆ ĐÃ CÓ, SẮP THỨ TỰ ANH CHỊ EM, SỬA MỘT NGƯỜI CON
//            (đổi quan hệ · chuyển sang gia đình khác), MÀN HÌNH SỬA THÔNG
//            TIN GIA ĐÌNH (mọi quan hệ của một người), xoá · hoàn tác ·
//            thùng rác: khôi phục · xoá thật · gom rác, cả loạt một lần
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{person,union,validate,media,purge,render},
//            services/{repo,gas}, utils/{graph,text,date,image,avatar}, config
// Phiên bản: 1.25.0 · Cập nhật: 22/08/2026 20:10
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
//
// --- SỬA QUAN HỆ: luật thứ mười một (21/08/2026, việc 3) ----------------
//
// 11. FORM NÀY SỬA QUAN HỆ ĐÃ CÓ, KHÔNG THÊM VÀ KHÔNG BỚT QUAN HỆ NÀO. Ranh
//    giới ấy là thứ giữ cho luật 9 và 10 còn nguyên giá trị: thêm hay gỡ một
//    mối nối là chạm vào `partners`/`children`, và mỗi lần chạm còn phải hỏi
//    tiếp câu *"cặp này còn lý do tồn tại không"*. Khối Quan hệ chỉ đổi CHỮ
//    trong những mục đã có — `children[].relation`, `union.status`,
//    `union.rank` — nên không lần nào phải hỏi câu ấy.
//
//    Hệ quả: `status` và `rank` bây giờ sửa được từ HAI CỬA — form Sửa cặp
//    (bước 29) và khối này. Được, và chỉ được vì cả hai gọi ĐÚNG MỘT hàm
//    `union.updateUnion()`. Chép logic so sánh sang đây là dựng bản thứ hai,
//    và hai bản sẽ trôi lệch nhau đúng như chín luật rà soát sẽ trôi lệch nếu
//    chép sang `Code.gs`.
//
//    ⚠ `relation` THUỘC VỀ CẶP, KHÔNG THUỘC VỀ NGƯỜI. Sửa *"đứa này là con
//    nuôi"* từ phía người cha là sửa đúng cùng một trường mà thẻ của người con
//    cũng đọc. Nên đổi ở đây thì thẻ của CẢ HAI người đổi theo — đó là đúng,
//    không phải lỗi.
//
//    ⚠ VÀ ĐÁNH DẤU SAI Ở ĐÂY LÀ TẮT PHÉP RÀ, KHÔNG PHẢI BÁO LỖI.
//    `validate.js` bỏ qua mọi phép rà tuổi sinh học với quan hệ khác
//    `'birth'`. Ghi nhầm một người con đẻ thành con nuôi không hiện ra thành
//    một lời nào — nó chỉ làm mấy phép rà im lặng. Vì thế mặc định của mọi ô
//    chọn ở đây là thứ ĐANG LƯU, không bao giờ là một giá trị app tự đoán.

import { state } from '../state.js';
import { updatePerson, createPerson,
         softDeletePerson, restorePerson } from '../domains/person.js';
import { createUnion, addChild, addPartner, removeChild, removePartner,
         softDeleteUnion, restoreUnion, conLyDoTonTai, reorderChildren,
         thuTuConTheoTuoi, updateUnion, updateChildRelation, swapPartnerOrder,
         getParentUnions, getPartnerUnions, getSpouses, getChildren } from '../domains/union.js';
import { validateAll, checkOrphanNode,
         checkNoAncestorCycle, checkParentAge } from '../domains/validate.js';
import { attachMedia, detachMedia, setPortrait, clearPortrait,
         getMediaFor, getPortrait } from '../domains/media.js';
import { planPurge, applyPurge, moTaKePurge } from '../domains/purge.js';
import { mauVien } from '../domains/render.js';
import { luuCay, suaDuoc } from '../services/repo.js';
import { taiAnh, xoaAnhThat } from '../services/gas.js';
import { buildIndex } from '../utils/graph.js';
import { fullName, coGiaTri, removeDiacritics, doiSongNguoi } from '../utils/text.js';
import { formatDate, parseLooseDate, stampNow, mocNgay } from '../utils/date.js';
import { compressImage, driveThumbUrl, dataUri, moTaCo }
  from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';
import { LOAI_TEN_PHU, nhanLoaiTenPhu, QUAN_HE_CON_NHAN, nhanQuanHeCon,
         chuThichQuanHe, rongHop, caoHop, leLopPhu,
         RONG_NUT_TOI_DA } from '../config.js';

let lopPhu     = null;   // lớp phủ đang mở, hoặc null
let o          = {};     // các ô nhập, tra theo tên trường
let khoiKetQua = null;   // chỗ hiện lỗi, cảnh báo, lời máy chủ
let nutLuu     = null;
let xuLyNgoai  = {};
let dangLuu    = false;
let daXemCanhBao = false;   // đã hiện cảnh báo và người dùng vẫn muốn lưu
// 'sua' · 'themCon' · 'themChaMe' · 'themBanDoi' · 'xoa' · 'chon' · 'noi' · 'go'
// · 'suaCap' (bước 29) · 'sapThuTu' (21/08/2026) · 'chuyenCon' (22/08/2026)
// · 'giaDinh' · 'chonNguoi' · 'doiNguoi' (màn hình Sửa thông tin gia đình)
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
let chuyenHT   = null;   // chế độ chuyenCon: kết quả doHauQuaChuyenCon() của lần mở này
let giaDinhCua = null;   // chế độ giaDinh  : màn hình đang mở của AI
let doiHT      = null;   // chế độ doiNguoi : kết quả doHauQuaDoiNguoi() của lần mở này

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
// TÊN PHỤ (nửa B của bộ trường thông dụng). `tenPhu` là bản làm việc của form,
// tách hẳn khỏi cây: mỗi mục là { type, goc:{surname,middle,given}, chu }.
let tenPhu    = [];
let khoiTenPhu = null;   // khối chứa các hàng, để vẽ lại một mình nó

// QUAN HỆ (việc 3). Cùng lối với `tenPhu`: form giữ RIÊNG một bản làm việc,
// không đọc ngược từ DOM. Xem ghi chú đầu khối Quan hệ.
let quanHe    = null;

// KHO ẢNH (việc 5, nửa A). Cùng lối với `tenPhu` và `quanHe`: form giữ RIÊNG
// một bản làm việc, không đọc ngược từ DOM và không đụng `state.tree` cho tới
// lúc bấm Lưu.
//
// ⚠ **`khoa` không phải `mediaId`.** Một tấm vừa tải lên chưa có mã `M….` —
// mã ấy chỉ sinh ra lúc `attachMedia` chạy, mà `attachMedia` thì chạy lúc lưu.
// Nhưng người dùng phải chỉ được vào tấm ấy NGAY để đặt nó làm đại diện. Nên
// mỗi mục mang một `khoa` riêng, sống suốt đời cái form: mã `M….` thật với ảnh
// đã có trong cây, và `moi-1`, `moi-2`… với ảnh vừa tải lên. `anhDaiDienKhoa`
// trỏ vào `khoa`, không trỏ vào `mediaId` — có thế thì chọn một tấm chưa có mã
// làm đại diện mới nói được thành lời.
let khoiAnh = null;        // tham chiếu tới khối, để vẽ lại một mình nó
let khoAnh = [];           // [{ khoa, mediaId, driveFileId, caption, xemTruoc, laMoi, boDi }]
let anhDaiDienKhoa = '';   // khoá của tấm đang làm đại diện; '' là không dùng tấm nào
let anhDangXet = '';       // khoá của tấm vừa bấm, để hàng nút mọc ngay dưới dải
let demAnhMoi = 0;         // sinh khoá tạm; KHÔNG dùng lại số đã cấp trong một lần mở form

// Kho ảnh đang mở là CỦA AI, và chủ thể ấy có ảnh đại diện hay không.
//
// ⚠ **Một CẶP không có ảnh đại diện, và đó không phải chuyện bỏ sót.**
// `photoFileId` là trường của bản ghi NGƯỜI — sơ đồ vẽ mặt người trong ô, còn
// một cặp thì không có ô nào của riêng nó để mà vẽ mặt. Nên với cặp, kho ảnh
// chỉ còn hai việc: thêm và gỡ. Để nguyên đường đại diện rồi trông chờ
// `setPortrait` trả `null` là dựa vào một sự tình cờ: giao diện vẫn hiện dấu ✓
// và nút *Bỏ ảnh đại diện* cho một thứ không bao giờ có ảnh đại diện.
let anhCuaAi = '';         // mã chủ thể: `P….` hoặc `U….`
let anhCoDaiDien = true;   // false với một CẶP
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

  hop.append(...veKhoiXoaNguoi(nguoi));

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
  chuyenHT     = null;
  giaDinhCua   = null;
  doiHT        = null;
  sapCtx       = null;
  sapDay       = null;
  sapKeo       = null;
  tenPhu       = [];
  khoiTenPhu   = null;
  quanHe       = null;
  khoiAnh      = null;
  khoAnh       = [];
  anhCuaAi     = '';
  anhCoDaiDien = true;
  anhDaiDienKhoa = '';
  anhDangXet   = '';
  demAnhMoi    = 0;
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
    ra.push(veNhan('Ảnh'));
    ra.push(veKhoiAnh(nguoi.id, nguoi));
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

  // TÊN PHỤ đứng NGAY DƯỚI tên chính, không xuống cuối form cùng bộ thông
  // dụng: nó là tên của cùng một người, và ai vừa gõ xong ba ô Họ · Đệm · Tên
  // thì tên huý đang ở ngay trong đầu họ.
  ra.push(veNhan('Tên khác'));
  ra.push(veKhoiTenPhu(nguoi));

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

  // --- BỘ THÔNG DỤNG của gia phả Việt (CAU-TRUC-DU-LIEU_V03) -------------
  //
  // ⚠ **Đặt SAU khối Mất, TRƯỚC Ghi chú — không xen vào giữa những khối cũ.**
  // Người đã quen form này tìm Tên · Giới tính · Sinh · Mất ở đúng chỗ cũ; tám
  // ô mới mọc thêm ở cuối thì không ai phải học lại thứ gì.
  //
  // ⚠ **Chữ mờ ở đây là VÍ DỤ, cố ý, và KHÔNG mâu thuẫn với luật bước 19.**
  // Luật ấy cấm chữ mờ ví dụ ở BA Ô TÊN liền nhau, vì ba ví dụ ghép lại thành
  // tên một người có thật và người dùng đọc ra "app đang mặc định người này".
  // Ô "Nghề nghiệp" thì không có cách nào ghép với ô bên cạnh thành một điều
  // khẳng định về ai cả — ở đây ví dụ dạy đúng thứ cần dạy: ô này chứa cái gì.
  //
  // ⚠ **KHÔNG có danh sách chọn cho Tôn giáo và Nghề nghiệp.** Gia phả cũ chép
  // bằng chữ của người chép — *"làm ruộng"*, *"thợ rèn"*, *"thờ cúng tổ tiên"*
  // — và ép vào danh sách là bắt người nhập chọn cái gần đúng rồi quên mất chữ
  // gốc. Cái giá: *"Phật giáo"* và *"đạo Phật"* máy không biết là một. Chấp
  // nhận, vì app này không thống kê theo tôn giáo.
  ra.push(veNhan('Đời và chi'));
  ra.push(oChu('doi', 'Đời thứ mấy', doiHienTai(nguoi), '5'));
  ra.push(oChu('chi', 'Chi / nhánh',
               (nguoi.vn && nguoi.vn.branch) || '', 'Chi Giáp'));

  ra.push(veNhan('Cuộc đời'));
  ra.push(oChu('title',      'Chức tước, phẩm hàm', nguoi.title,      'Cử nhân, Chánh tổng'));
  ra.push(oChu('occupation', 'Nghề nghiệp',         nguoi.occupation, 'Làm ruộng, dạy học'));
  ra.push(oChu('education',  'Học vấn',             nguoi.education,  'Tú tài'));
  ra.push(oChu('religion',   'Tôn giáo',            nguoi.religion,   'Thờ cúng tổ tiên'));
  // "khác nơi sinh" nằm ngay trong nhãn, không nằm ở một dòng chú thích riêng:
  // nơi sinh là MỘT ĐIỂM, nơi ở là chỗ sống phần đời — hai ô này gần giống nhau
  // đến mức không nói ra thì người dùng điền trùng, và bản xuất GEDCOM sau này
  // có `BIRT/PLAC` và `RESI` chép y hệt nhau.
  ra.push(oChu('residence',  'Quê quán / nơi ở (khác nơi sinh)', nguoi.residence,
               'Hà Nam — nơi sống lâu nhất'));
  ra.push(oChu('nationality', 'Dân tộc',            nguoi.nationality, 'Kinh'));

  // ⚠ Chữ mờ của ô này đã ĐỔI ngày 21/08/2026, và lý do đáng ghi lại: bản cũ
  // mời người dùng gõ *"Chức tước, quê quán"* vào đây — đúng hai thứ vừa có ô
  // riêng ngay phía trên. Để nguyên là dạy người ta chép chức tước vào ô ghì chú,
  // rồi bản xuất GEDCOM không có được một thẻ `TITL` nào.
  //
  // Không phép kiểm nào bắt được chỗ này — chữ mờ sai vẫn là một chuỗi hợp lệ.
  // Nó lộ ra khi CHỤP ẢNH cái form (`kiem-thu/xem-truong-moi.mjs`, tm-2.png).
  ra.push(veNhan('Ghi chú'));
  ra.push(oNhieuDong('note', nguoi.note,
                     'Chuyện gia đình cần nhớ, điều không có ô riêng…'));

  // QUAN HỆ đứng CUỐI CÙNG, cùng lý lẽ đã dùng cho bộ thông dụng ở bước 32:
  // người đã quen form này tìm Tên · Giới tính · Sinh · Mất ở đúng chỗ cũ, còn
  // thứ mọc thêm ở cuối thì không ai phải học lại gì.
  //
  // Chỉ có ở chế độ SỬA, cùng lý do với khối ảnh: ở các chế độ thêm người, bản
  // ghi chưa có mã, mà quan hệ thì tra theo mã.
  if (cheDo === 'sua') ra.push(...veKhoiQuanHe(nguoi));

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
// Khối TÊN PHỤ — huý · tự · thụy · pháp danh · thường gọi
// ============================================================
//
// Thẻ thông tin ĐỌC RA những tên này từ bước 14 (`person.getAlternateNames`),
// còn form thì chưa bao giờ sửa được — treo lâu nhất trong bộ trường thông
// dụng, và là nửa B của việc 2 trong bảng giai đoạn 3.
//
// --- Vì sao MỘT ô chữ, không phải ba ô Họ · Đệm · Tên -------------------
//
// Schema cho tên phụ đúng cùng khuôn với tên chính (`surname`·`middle`·`given`),
// nhưng tên huý là *"Bá"*, pháp danh là *"Thích Minh Tâm"* — không ai tách
// chúng ra làm họ với đệm. Ba ô thì hai ô luôn trống, và ô trống trong form là
// một câu hỏi không ai trả lời được. Nên form hỏi MỘT ô, và ghi chữ ấy vào
// `given`; `fullName()` ghép lại đọc ra y nguyên.
//
// ⚠ **Chữ KHÔNG ĐỔI thì ba phần cũ được giữ nguyên** — xem `phanTenPhu()`.
// Ca thật sẽ đến ở việc 10 (nhập GEDCOM): file nước ngoài mang tên phụ đã tách
// sẵn `SURN`/`GIVN`, và mở form ra xem một lượt rồi bấm Lưu mà app dồn hết vào
// `given` là làm mất một phần dữ liệu người ta đã có.
//
// --- Vì sao form GIỮ RIÊNG một mảng, không đọc ngược từ DOM -------------
//
// Hàng thêm/bớt được thì DOM là thứ bị vẽ lại; đọc ngược từ nó là mỗi lần vẽ
// lại một lần phải khớp hàng cũ với hàng mới. Mảng `tenPhu` là bản làm việc,
// mọi ô ghi thẳng vào nó, và `gomThayDoi()` chỉ việc gửi cả mảng đi.

function veKhoiTenPhu(nguoi) {
  tenPhu = docTenPhu(nguoi);
  khoiTenPhu = document.createElement('div');
  veLaiTenPhu();
  return khoiTenPhu;
}

/** Tên phụ đang lưu, đọc thành bản làm việc của form. */
function docTenPhu(nguoi) {
  const ds = Array.isArray(nguoi.names) ? nguoi.names : [];
  // Cùng quy tắc chọn tên chính với `utils/text.fullName`: có 'chinh' thì lấy
  // nó, không có thì mục ĐẦU TIÊN. Chọn khác đi là form hiện tên chính của một
  // người trong danh sách tên phụ của chính họ.
  const chinh = ds.find((n) => n && n.type === 'chinh') || ds[0] || null;
  return ds
    .filter((n) => n && n !== chinh)
    .map((n) => ({
      type: coGiaTri(n.type) ? String(n.type) : 'khac',
      goc:  { surname: n.surname || '', middle: n.middle || '', given: n.given || '' },
      chu:  fullName(n),
    }));
}

function veLaiTenPhu() {
  if (!khoiTenPhu) return;
  khoiTenPhu.innerHTML = '';

  tenPhu.forEach((muc, i) => khoiTenPhu.append(veHangTenPhu(muc, i)));

  const them = document.createElement('button');
  them.type = 'button';
  them.textContent = '+ Thêm tên khác';
  them.setAttribute('aria-label', 'Thêm tên khác');
  them.style.cssText = KIEU_NUT_CHAN + 'width:100%;margin-top:6px;text-align:center;' +
    'background:#faf8f5;color:#2a2622;border:1px dashed #ddd5ca';
  them.addEventListener('click', () => {
    // Loại mặc định là TÊN HUÝ, không phải "Tên khác": gia phả Việt ghi tên huý
    // nhiều hơn hẳn bốn loại kia gộp lại, nên đoán như vậy đúng phần lớn số lần
    // — và đoán sai thì đổi mất một cú chạm.
    tenPhu.push({ type: 'huy', goc: { surname: '', middle: '', given: '' }, chu: '' });
    veLaiTenPhu();
    const oCuoi = khoiTenPhu.querySelector('input[data-ten-phu="' + (tenPhu.length - 1) + '"]');
    if (oCuoi) oCuoi.focus();
  });
  khoiTenPhu.append(them);
}

function veHangTenPhu(muc, i) {
  const hang = document.createElement('div');
  // ⚠ `flex-wrap` + `flex-basis:140px` ở ô chữ, KHÔNG dùng media query. Màn
  // hình hẹp (hộp form co xuống 280px) thì ba thứ trên một hàng không đủ chỗ,
  // và thứ bị bóp là ô chữ: ảnh `tp-2.png` cho thấy "Thích Minh Tâm" hiện ra
  // thành "Thích |". Ô chọn loại bị bóp thì còn bấm ra xem được; ô chữ bị bóp
  // là người ta gõ xong mà không đọc lại được thứ mình vừa gõ.
  //
  // Với `flex:1 1 140px`, hễ hàng còn dưới 140px cho ô chữ thì nó tự xuống
  // dòng — loại tên đứng một mình dòng trên, ô chữ và nút ✕ dòng dưới. Rộng
  // rãi thì cả ba nằm một hàng như cũ.
  //
  // ⚠ Khe GIỮA hai hàng (12px) phải rộng gấp đôi khe TRONG một hàng (6px).
  // Để cả hai bằng nhau thì lúc xuống dòng, ba hàng đọc lên thành sáu dòng
  // đều tăm tắp và không còn nhìn ra ô loại nào đi với ô chữ nào — ảnh
  // `tp-2.png` bản đầu là đúng cảnh ấy.
  hang.style.cssText =
    'display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;align-items:center';

  const chon = document.createElement('select');
  chon.setAttribute('aria-label', 'Loại tên khác ' + (i + 1));
  chon.style.cssText = KIEU_O + 'width:auto;flex:0 1 auto;min-width:0;padding-right:6px';
  const danhSach = LOAI_TEN_PHU.slice();
  // Mã lạ — dữ liệu cũ, hoặc file GEDCOM nhập từ phần mềm khác — được thêm vào
  // danh sách chứ không bị thay bằng một mã trong bảng. Không thêm thì cái
  // `<select>` tự nhảy về mục đầu tiên, và người dùng chỉ mở form ra xem cũng
  // đủ làm mất loại tên mà file gốc đã ghi rõ.
  if (!danhSach.some((x) => x.ma === muc.type)) {
    danhSach.push({ ma: muc.type, chu: nhanLoaiTenPhu(muc.type) });
  }
  for (const loai of danhSach) {
    const op = document.createElement('option');
    op.value = loai.ma;
    op.textContent = loai.chu;
    if (loai.ma === muc.type) op.selected = true;
    chon.append(op);
  }
  chon.addEventListener('change', () => { muc.type = chon.value; });

  const o1 = document.createElement('input');
  o1.type = 'text';
  o1.value = muc.chu;
  o1.placeholder = 'Bá';
  o1.setAttribute('aria-label', 'Tên khác ' + (i + 1));
  o1.setAttribute('data-ten-phu', String(i));
  o1.style.cssText = KIEU_O + 'flex:1 1 140px;min-width:0';
  o1.addEventListener('input', () => { muc.chu = o1.value; });

  const bo = document.createElement('button');
  bo.type = 'button';
  bo.textContent = '✕';
  bo.setAttribute('aria-label', 'Bỏ tên khác ' + (i + 1));
  bo.style.cssText =
    'flex:0 0 auto;width:38px;height:38px;font-size:15px;font-family:inherit;' +
    'border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    'background:#faf8f5;color:#8a8078;border:1px solid #e6e0d8';
  // Bỏ NGAY, không hỏi lại. Hàng này chưa được ghi xuống Drive — bỏ nhầm thì
  // bấm "+ Thêm tên khác" gõ lại, còn một hộp hỏi cho mỗi cú bấm là bắt người
  // ta trả lời một câu hỏi không đáng hỏi.
  bo.addEventListener('click', () => { tenPhu.splice(i, 1); veLaiTenPhu(); });

  hang.append(chon, o1, bo);
  return hang;
}

/**
 * Một hàng trong form thành một mục `names[]`.
 *
 * Chữ không đổi so với lúc mở form thì trả lại ĐÚNG ba phần cũ — xem ghi chú
 * đầu khối. Chữ đã đổi thì cả câu vào `given`, hai phần kia trống: người vừa
 * gõ lại tên ấy đang gõ một cái tên liền, không gõ một cấu trúc ba phần.
 */
function phanTenPhu(muc) {
  const chu = String(muc.chu || '').trim();
  if (chu === fullName(muc.goc)) {
    return Object.assign({ type: muc.type }, muc.goc);
  }
  return { type: muc.type, surname: '', middle: '', given: chu };
}

// ============================================================
// Khối QUAN HỆ — việc 3 (21/08/2026)
// ============================================================
//
// Ba nhóm, đúng ba câu chủ dự án hỏi: quan hệ với CHA MẸ · trạng thái và thứ
// bậc của từng cặp VỢ CHỒNG · quan hệ với từng người CON.
//
// --- Vì sao nhóm nào rỗng thì bỏ hẳn nhóm ấy ---------------------------
//
// Trái với luật "form HIỆN ĐỦ MỌI Ô" ở đầu file, và có chủ ý. Luật ấy nói về ô
// trống — một câu hỏi chưa ai trả lời. Ở đây khác: người chưa nối với cha mẹ
// nào thì KHÔNG CÓ câu hỏi nào để hỏi, và vẽ ra một nhóm rỗng là mời người
// dùng đi tìm cái nút thêm cha mẹ ở một khối vốn không có nút nào như thế.
// Cả ba nhóm cùng rỗng thì bỏ luôn cả khối.
//
// --- Vì sao giữ riêng một bản làm việc, không đọc ngược từ DOM ----------
//
// Cùng lý lẽ với `tenPhu` ở bước 33, cộng một lý do riêng: các ô ở đây tra
// theo `unionId` và `personId`, mà DOM chỉ giữ được chỉ số hàng. Đọc ngược
// là mỗi lần đọc một lần phải dựng lại phép khớp hàng → mã người, và đó đúng
// là chỗ để lọt một cú ghi nhầm sang người bên cạnh.
//
// ⚠ `cu` giữ nguyên giá trị lúc MỞ form. Mọi so sánh "có đổi gì không" đều so
// với `cu`, không so với cây — đúng tinh thần ghi chú của `handleSaveUnion`:
// mở form rồi bấm Lưu ngay phải là một việc KHÔNG để lại dấu vết.

function veKhoiQuanHe(nguoi) {
  const index = state.index;
  if (!index || !index.personById.has(nguoi.id)) return [];

  quanHe = docQuanHe(index, nguoi.id);
  if (quanHe.chaMe.length === 0 && quanHe.banDoi.length === 0 &&
      quanHe.con.length === 0) {
    quanHe = null;
    return [];
  }

  const ra = [veNhan('Quan hệ')];

  const nhac = document.createElement('div');
  nhac.textContent =
    'Ở đây chỉ SỬA những quan hệ đã có. Thêm hoặc gỡ một người nằm ở vòng ' +
    'tròn — mục Kết nối và Gỡ nối.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:2px';
  ra.push(nhac);

  if (quanHe.chaMe.length > 0) {
    ra.push(veNhanNhom('Cha mẹ'));
    quanHe.chaMe.forEach((m, i) => ra.push(veHangChaMe(m, i)));
  }

  if (quanHe.banDoi.length > 0) {
    ra.push(veNhanNhom('Vợ / chồng'));
    quanHe.banDoi.forEach((m, i) => ra.push(veHangBanDoi(m, i)));
    const nhacBac = document.createElement('div');
    nhacBac.textContent =
      'Ô số là THỨ BẬC: 1 là vợ cả / chồng đầu, 2 là vợ thứ hai… Không phải ' +
      'chỗ đứng trái phải trên sơ đồ.';
    nhacBac.style.cssText =
      'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';
    ra.push(nhacBac);
  }

  if (quanHe.con.length > 0) {
    ra.push(veNhanNhom('Con'));
    quanHe.con.forEach((m, i) => ra.push(veHangCon(m, i)));
  }

  return ra;
}

/**
 * Bản làm việc của khối, đọc từ chỉ mục.
 *
 * ⚠ ĐÂY KHÔNG PHẢI MỘT PHÉP DUYỆT ĐỒ THỊ, nên không cần tập `visited`: nó đi
 * đúng MỘT bước từ người đang sửa — sang các cặp cha mẹ, các cặp của chính họ,
 * các người con — rồi DỪNG, không đi tiếp từ những người tìm được. Ai sửa hàm
 * này mà cho nó đi sâu thêm một bậc (ví dụ "sửa luôn quan hệ của các cháu")
 * thì phải thêm `visited` — gia phả là đồ thị có vòng, và bản dữ liệu làm việc
 * đang có sẵn hai vòng.
 *
 * ⚠ Đọc qua bốn hàm `get*` của `domains/union.js` chứ không tự duyệt
 * `u.partners`: bốn hàm ấy lọc người mang cờ `deleted` ra, còn mã họ thì vẫn
 * nằm nguyên trong `partners`/`children` (xoá mềm cố ý không dọn hai mảng
 * ấy). Tự duyệt là bày ra một ô chọn cho một người đã nằm trong thùng rác.
 */
function docQuanHe(index, personId) {
  const ra = { mocId: personId, chaMe: [], banDoi: [], con: [] };

  for (const u of getParentUnions(index, personId)) {
    const muc = (Array.isArray(u.children) ? u.children : [])
      .find((c) => c && c.personId === personId);
    const cu = (muc && muc.relation) || 'birth';
    ra.chaMe.push({ unionId: u.id, ten: keTenPartner(u.id), cu, moi: cu });
  }

  for (const u of getPartnerUnions(index, personId)) {
    // Cùng phép chuẩn hoá với `handleSaveUnion`: thiếu `status` thì coi là
    // 'married', nhưng một mã khác hai mã quen thì GIỮ NGUYÊN chứ không ép về
    // 'married' — cùng lối với mã loại tên lạ ở bước 33.
    const ttCu = u.status === 'divorced' ? 'divorced' : (u.status || 'married');
    ra.banDoi.push({
      unionId: u.id,
      ten:     tenBanDoiTrongCap(index, u, personId),
      ttCu, ttMoi: ttCu,
      bacCu:  thuBacHienTai(u),
      bacMoi: String(thuBacHienTai(u)),
    });
  }

  for (const m of getChildren(index, personId)) {
    ra.con.push({
      unionId:  m.unionId,
      personId: m.personId,
      ten:      tenNguoi(m.personId),
      cu:       m.relation,
      moi:      m.relation,
    });
  }

  return ra;
}

/**
 * Tên người kia trong cặp. Cặp MỘT NGƯỜI (`U0024` là ca thật) thì không có
 * người kia — nói thẳng ra thay vì để trống, vì một hàng không tên trông y hệt
 * một lỗi nạp dữ liệu.
 */
function tenBanDoiTrongCap(index, u, personId) {
  const ds = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== personId && index.personById.has(id))
    .map(tenNguoi);
  return ds.length > 0 ? ds.join('  và  ') : '(cặp mới có một người)';
}

/**
 * Nhãn của một NHÓM trong khối Quan hệ — Cha mẹ · Vợ/chồng · Con.
 *
 * Không mượn `veNhanO`: nhãn ấy là nhãn của MỘT Ô (11px, xám rất nhạt, sát
 * ngay trên ô của nó). Ba chữ này là đầu đề của cả một nhóm, và ở bản đầu mượn
 * `veNhanO` thì ảnh `qh-0.png` cho thấy chúng chìm nghỉm giữa các hàng — mắt
 * không tìm ra đâu là chỗ nhóm Vợ/chồng bắt đầu.
 */
function veNhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:16px;margin-bottom:2px;font-size:11px;font-weight:600;' +
    'letter-spacing:.04em;color:#8a8078';
  return d;
}

/**
 * Một mục trong khối Quan hệ: TÊN một dòng, các ô một dòng dưới.
 *
 * ⚠ HAI DÒNG CỐ ĐỊNH, không phải một hàng ngang biết tự xuống dòng. Bản đầu
 * xếp tên và ô trên cùng một hàng `flex-wrap` — cùng lối với hàng tên phụ —
 * và ảnh `qh-0.png` cho thấy vì sao lối ấy không dùng lại được ở đây:
 *
 *   · tên người Việt đủ ba phần dài hơn hẳn một cái tên huý, nên hàng gãy ngay
 *     ở khổ 360px chứ không đợi tới 280px — tức là nó gãy LÚC NÀO là tuỳ vào
 *     tên ai đang đứng đó, và hai mục cạnh nhau trông không giống nhau;
 *   · hàng Vợ/chồng có BA thứ, nên khi gãy thì ô số thứ bậc rơi xuống một dòng
 *     riêng, đứng lơ lửng một mình bên trái, không còn nói lên nó là thứ bậc
 *     của cặp nào.
 *
 * Hai dòng cố định thì mọi mục trông như nhau ở mọi khổ, và hai ô của một cặp
 * luôn dính nhau.
 */
function veMucQuanHe(ten, cacO) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:12px';

  const d = document.createElement('div');
  d.textContent = ten;
  d.style.cssText =
    'font-size:13px;line-height:1.4;color:#2a2622;margin-bottom:4px;' +
    'overflow-wrap:anywhere';

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px;align-items:center';
  hang.append(...cacO);

  boc.append(d, hang);
  return boc;
}

/**
 * Ô chọn quan hệ đẻ/nuôi.
 *
 * ⚠ Mã lạ — dữ liệu cũ, hoặc file GEDCOM nhập từ phần mềm khác — được THÊM vào
 * danh sách chứ không bị thay bằng một mã trong bảng. Đúng bài học của bước 33:
 * không thêm thì `<select>` tự nhảy về mục đầu tiên, và người dùng chỉ mở form
 * ra xem cũng đủ biến một quan hệ lạ thành 'birth' — mà 'birth' là quan hệ BẬT
 * lại bốn phép rà tuổi sinh học.
 */
function oChonQuanHe(nhan, maCu, phia, khiDoi) {
  const chon = document.createElement('select');
  chon.setAttribute('aria-label', nhan);
  chon.style.cssText = KIEU_O + 'width:auto;flex:1 1 auto;min-width:0;padding-right:6px';

  const ds = QUAN_HE_CON_NHAN.slice();
  if (!ds.some((x) => x.ma === maCu)) ds.push({ ma: maCu, con: maCu, chaMe: maCu });

  for (const q of ds) {
    const op = document.createElement('option');
    op.value = q.ma;
    op.textContent = nhanQuanHeCon(q.ma, phia);
    if (q.ma === maCu) op.selected = true;
    chon.append(op);
  }
  chon.addEventListener('change', () => khiDoi(chon.value));
  return chon;
}

function veHangChaMe(m, i) {
  return veMucQuanHe(m.ten, [
    oChonQuanHe('Quan hệ với cha mẹ ' + (i + 1), m.cu, 'chaMe',
                (ma) => { m.moi = ma; }),
  ]);
}

function veHangCon(m, i) {
  return veMucQuanHe(m.ten, [
    oChonQuanHe('Quan hệ với con ' + (i + 1), m.cu, 'con', (ma) => { m.moi = ma; }),
  ]);
}

function veHangBanDoi(m, i) {
  const chon = document.createElement('select');
  chon.setAttribute('aria-label', 'Cặp ' + (i + 1) + ' bây giờ');
  chon.style.cssText = KIEU_O + 'width:auto;flex:1 1 auto;min-width:0;padding-right:6px';

  const CAC = [
    { ma: 'married',  chu: 'Đang là vợ chồng' },
    { ma: 'divorced', chu: 'Đã ly hôn' },
  ];
  if (!CAC.some((x) => x.ma === m.ttCu)) CAC.push({ ma: m.ttCu, chu: m.ttCu });

  for (const c of CAC) {
    const op = document.createElement('option');
    op.value = c.ma;
    op.textContent = c.chu;
    if (c.ma === m.ttCu) op.selected = true;
    chon.append(op);
  }
  chon.addEventListener('change', () => { m.ttMoi = chon.value; });

  const bac = document.createElement('input');
  bac.type = 'text';
  bac.inputMode = 'numeric';
  bac.value = m.bacMoi;
  bac.setAttribute('aria-label', 'Thứ bậc của cặp ' + (i + 1));
  bac.style.cssText = KIEU_O + 'flex:0 0 56px;width:56px;min-width:0;text-align:center';
  bac.addEventListener('input', () => { m.bacMoi = bac.value; });

  return veMucQuanHe(m.ten, [chon, bac]);
}

/**
 * Áp mọi thay đổi quan hệ lên cây, NỐI ĐUÔI nhau.
 *
 * @param {object} cay  cây mà `updatePerson` (và phép áp ảnh) vừa trả về
 * @returns {{tree:object, diff:object, capDoi:object[]}}
 *
 * ⚠ NỐI ĐUÔI là bắt buộc, không phải cho gọn: mỗi hàm trả về một CÂY MỚI, nên
 * chạy hai hàm trên cùng một cây cũ là cây gửi lên chỉ mang một trong hai thay
 * đổi. Cùng cái bẫy mà `handleSaveUnion` đã gặp với `swapPartnerOrder`.
 *
 * ⚠ Một cặp có thể bị đụng HAI LẦN (đổi quan hệ một người con, rồi đổi luôn
 * trạng thái của chính cặp ấy). Gom theo mã cặp, bản sau đè bản trước — mà bản
 * sau chạy trên cây đã mang thay đổi trước, nên nó là bản ĐỦ CẢ HAI.
 */
function apThayDoiQuanHe(cay) {
  const ra = { tree: cay, diff: {}, capDoi: [] };
  if (!quanHe) return ra;

  const theoMa = new Map();
  const nhan = (kq) => {
    if (!kq || !kq.thayDoi) return;
    ra.tree = kq.tree;
    Object.assign(ra.diff, kq.diff);
    theoMa.set(kq.union.id, kq.union);
  };

  for (const m of quanHe.chaMe) {
    if (m.moi === m.cu) continue;
    nhan(updateChildRelation(ra.tree, m.unionId, quanHe.mocId, m.moi));
  }

  for (const m of quanHe.con) {
    if (m.moi === m.cu) continue;
    nhan(updateChildRelation(ra.tree, m.unionId, m.personId, m.moi));
  }

  for (const m of quanHe.banDoi) {
    // Chỉ gửi thứ THẬT SỰ khác bản đang lưu — đúng ghi chú của
    // `handleSaveUnion`: `updateUnion` so với giá trị đã chuẩn hoá, nên cặp
    // chưa có `status` mà gửi 'married' xuống là một dòng changeLog cho một
    // việc chẳng ai làm.
    const changes = {};
    if (m.ttMoi !== m.ttCu) changes.status = m.ttMoi;

    const n = Number(String(m.bacMoi).trim());
    if (Number.isFinite(n) && n > 0 && n !== m.bacCu) changes.rank = n;

    if (Object.keys(changes).length === 0) continue;
    nhan(updateUnion(ra.tree, m.unionId, changes));
  }

  ra.capDoi = [...theoMa.values()];
  return ra;
}

/** Một câu kể những gì khối Quan hệ vừa đổi, để đưa vào `changeLog`. */
function keThayDoiQuanHe(qh) {
  if (!qh || qh.capDoi.length === 0) return '';
  const n = qh.capDoi.length;
  return ' Sửa quan hệ ở ' + n + ' cặp.';
}

// ============================================================
// KHO ẢNH của một người — bước 28 (một ảnh đại diện) · việc 5 nửa A (cả kho)
// ============================================================
//
// NĂM QUYẾT ĐỊNH CỦA KHO ẢNH — chốt 21/08/2026
//
// 1. **Kho ảnh nằm NGAY TRONG form, không phải một màn hình riêng.** Người vào
//    đây để sửa hồ sơ một con người, mà ảnh là một phần của hồ sơ ấy. Dựng thêm
//    một màn hình nữa là bắt người dùng nhớ thêm một chỗ đứng, đổi lại chẳng
//    được gì — kho ảnh của một người trong gia phả này đếm trên đầu ngón tay.
//
// 2. **Ảnh vừa thêm LUÔN thành đại diện.** Giữ nguyên hành vi của bước 28: chọn
//    một tấm rồi Lưu là mặt người ấy đổi trên sơ đồ. Muốn thêm vào kho mà không
//    đổi mặt thì bấm tấm cũ đặt lại làm đại diện — một cú chạm, và nó nói ra
//    được bằng lời, khác hẳn một cái ô đánh dấu "dùng làm đại diện" nằm im.
//
// 3. **Bấm một tấm KHÔNG đặt nó làm đại diện ngay — nó mở một hàng nút.** Một
//    tấm ảnh mang hai việc khác hẳn nhau (làm mặt · bỏ khỏi kho) mà chỉ có một
//    cử chỉ để bấm. Cùng lối với bảng chọn phụ của menu vòng tròn: câu hỏi phụ
//    mọc ra ngay cạnh cái vừa bấm. Và nút thì cao 40px, còn một dấu ✕ nhét vào
//    góc tấm ảnh 56px thì không đích chạm nào đủ rộng.
//
// 4. **Gỡ khỏi kho KHÔNG xoá gì cả.** `detachMedia` đặt cờ `deleted`, file trên
//    Drive nằm nguyên. Xoá nhầm một tấm ảnh cụ ông chụp năm 1950 là mất vĩnh
//    viễn — luật 3 của `domains/media.js`.
//
// 5. ⚠ **Ảnh đại diện LẺ là một ca thật, không phải dữ liệu hỏng.** Một bản ghi
//    có `photoFileId` mà `media[]` không có tấm nào tương ứng — nhập từ GEDCOM,
//    hoặc file bị sửa tay ngoài app. Bản làm việc giữ nó thành một mục mang cờ
//    `laLe`, hiện ra trong dải kèm chú thích. **Bỏ mục ấy đi là sai:** lúc lưu,
//    kho ảnh sẽ đọc ra thành "người này không dùng tấm nào làm đại diện" rồi
//    lặng lẽ xoá mất `photoFileId` của một người mà không ai đụng vào.

/**
 * @param {string} subjectId  mã người `P….` hoặc mã hôn nhân `U….`
 * @param {object|null} nen   bản ghi người, CHỈ để lấy màu viền và bóng người.
 *                            Cặp truyền `null` — `mauVien(null)` ra màu "chưa
 *                            rõ", đúng thứ cần cho một tấm ảnh của hai người.
 */
function veKhoiAnh(subjectId, nen) {
  khoiAnh = document.createElement('div');
  anhCuaAi = String(subjectId);
  anhCoDaiDien = anhCuaAi.charAt(0) !== 'U';
  docKhoAnh(nen);
  veLaiKhoiAnh(nen);
  return khoiAnh;
}

/**
 * Dựng bản làm việc từ cây. Chạy MỘT lần lúc mở form.
 *
 * `getMediaFor` trả về mới nhất đứng trước, và dải ảnh giữ đúng thứ tự ấy: tấm
 * vừa thêm nằm đầu, chỗ mắt nhìn tới trước.
 */
function docKhoAnh(nguoi) {
  const cay = state.tree;

  khoAnh = getMediaFor(cay, anhCuaAi).map((m) => ({
    khoa:        m.id,
    mediaId:     m.id,
    driveFileId: m.driveFileId,
    caption:     m.caption || '',
    xemTruoc:    '',
    laMoi:       false,
    laLe:        false,
    boDi:        false,
  }));

  if (!anhCoDaiDien) { anhDangXet = ''; demAnhMoi = 0; anhDaiDienKhoa = ''; return; }

  const dd = getPortrait(cay, anhCuaAi);
  anhDaiDienKhoa = dd ? dd.id : '';

  // Quyết định 5: con trỏ trỏ vào chỗ kho không có gì.
  const conTro = nguoi && typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId.trim() : '';
  if (!dd && conTro) {
    khoAnh.unshift({
      khoa: 'le', mediaId: '', driveFileId: conTro, caption: '',
      xemTruoc: '', laMoi: false, laLe: true, boDi: false,
    });
    anhDaiDienKhoa = 'le';
  }

  anhDangXet = '';
  demAnhMoi  = 0;
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

  // Vòng ảnh tròn ở đầu khối là ẢNH ĐẠI DIỆN — cặp không có, nên không vẽ.
  if (anhCoDaiDien) hang.append(veXemTruocAnh(nguoi));

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px';

  cot.append(nutChonAnh(nguoi));
  if (mucDaiDien()) cot.append(nutBoAnh(nguoi));

  hang.append(cot);
  khoi.append(hang);

  if (khoAnh.length > 0) khoi.append(veDaiAnh(nguoi));

  const loi = document.createElement('div');
  loi.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:8px';
  loi.textContent = moTaTrangThaiAnh(nguoi);
  khoi.append(loi);
}

/** Mục đang làm đại diện trong bản làm việc, hoặc null. */
function mucDaiDien() {
  if (!anhCoDaiDien || !anhDaiDienKhoa) return null;
  return khoAnh.find((a) => a.khoa === anhDaiDienKhoa && !a.boDi) || null;
}

/** Đường dẫn xem một tấm: ảnh vừa tải lên xem bằng chuỗi ở máy, ảnh cũ nhờ Drive. */
function duongXemAnh(muc, co) {
  return muc.xemTruoc ? dataUri(muc.xemTruoc) : driveThumbUrl(muc.driveFileId, co * 2);
}

/** Ảnh đang xem trước: tấm đang làm đại diện, hoặc bóng người. */
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

  const dd = mucDaiDien();
  if (dd) datAnhKhiTaiXong(im, duongXemAnh(dd, co));

  return boc;
}

/**
 * Đổi `src` CHỈ KHI ảnh tải xong thật.
 *
 * Gán thẳng `im.src` thì lúc Drive từ chối — ảnh chưa mở quyền xem, hoặc mạng
 * hỏng — cái đang hiện là **biểu tượng ảnh vỡ**, chứ không phải bóng người mà
 * bước 28 đã dựng ra để đứng ở đúng chỗ ấy. Một ô sơ đồ mang hình ảnh vỡ đọc ra
 * thành "app hỏng", còn bóng người đọc ra thành "chưa có ảnh".
 */
function datAnhKhiTaiXong(im, duong) {
  if (!duong) return;
  if (duong.indexOf('data:') === 0) { im.src = duong; return; }
  const thu = new Image();
  thu.onload = () => {
    if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
  };
  thu.src = duong;
}

// ============================================================
// Dải ảnh — mọi tấm trong kho
// ============================================================

function veDaiAnh(nguoi) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:12px';

  const nhan = document.createElement('div');
  nhan.textContent = 'Kho ảnh (' + khoAnh.filter((a) => !a.boDi).length + ')';
  nhan.style.cssText = 'font-size:12px;font-weight:600;color:#8a8078;margin-bottom:6px';
  boc.append(nhan);

  const dai = document.createElement('div');
  dai.id = 'giapha-dai-anh';   // mốc cho bài kiểm hành vi
  dai.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
  for (const muc of khoAnh) dai.append(veTamAnh(muc, nguoi));
  boc.append(dai);

  const xet = khoAnh.find((a) => a.khoa === anhDangXet);
  if (xet) boc.append(veHangNutAnh(xet, nguoi));

  return boc;
}

function veTamAnh(muc, nguoi) {
  const co = 56;
  const laDD  = muc.khoa === anhDaiDienKhoa && !muc.boDi;
  const laXet = muc.khoa === anhDangXet;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.anh = muc.khoa;
  nut.disabled = anhDangTai || dangLuu;
  nut.style.cssText =
    'position:relative;width:' + co + 'px;height:' + co + 'px;padding:0;' +
    'border-radius:10px;overflow:hidden;cursor:pointer;touch-action:manipulation;' +
    'background:#faf8f5;' +
    'border:2px solid ' + (laDD ? mauVien(nguoi) : (laXet ? '#8a8078' : '#e6e0d8')) + ';' +
    'opacity:' + (muc.boDi ? '.35' : '1') + ';';

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoi && nguoi.sex, mauVien(nguoi));
  datAnhKhiTaiXong(im, duongXemAnh(muc, co));
  nut.append(im);

  // Dấu hiệu đọc được KHÔNG CẦN MÀU: người phân biệt màu kém vẫn phải thấy tấm
  // nào đang làm mặt. Viền màu một mình thì không đủ.
  if (laDD) nut.append(dauGocAnh('✓', mauVien(nguoi)));
  if (muc.boDi) nut.append(dauGocAnh('✕', '#8a3a2a'));

  nut.addEventListener('click', () => {
    anhDangXet = (anhDangXet === muc.khoa) ? '' : muc.khoa;
    veLaiKhoiAnh(nguoi);
  });
  return nut;
}

function dauGocAnh(chu, mau) {
  const d = document.createElement('span');
  d.textContent = chu;
  d.style.cssText =
    'position:absolute;left:0;bottom:0;min-width:18px;height:18px;' +
    'display:flex;align-items:center;justify-content:center;font-size:12px;' +
    'color:#fffdf9;background:' + mau + ';border-radius:0 8px 0 8px';
  return d;
}

/**
 * Hàng nút mọc ra dưới dải, cho tấm vừa bấm.
 *
 * Không hiện nút nào mà bấm vào không xảy ra gì: tấm đang làm đại diện thì
 * không có nút *Đặt làm đại diện*, tấm đã đánh dấu bỏ thì nút đổi thành *Giữ
 * lại*. Một hàng nút lúc nào cũng đủ ba cái, trong đó có cái bấm không ăn, là
 * cùng loại lỗi với nút chết ở menu vòng tròn (bước 26).
 */
function veHangNutAnh(muc, nguoi) {
  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;padding:10px;' +
    'background:#faf8f5;border-radius:10px';

  const batDuoc = suaDuoc() && !anhDangTai && !dangLuu;

  if (muc.boDi) {
    hang.append(nutNhoAnh('Giữ lại tấm này', batDuoc, false, () => {
      muc.boDi = false;
      veLaiKhoiAnh(nguoi);
    }));
  } else {
    if (anhCoDaiDien && muc.khoa !== anhDaiDienKhoa) {
      hang.append(nutNhoAnh('Đặt làm ảnh đại diện', batDuoc, false, () => {
        anhDaiDienKhoa = muc.khoa;
        veLaiKhoiAnh(nguoi);
      }));
    }
    // Mục LẺ không có bản ghi trong kho để mà gỡ — việc duy nhất làm được với
    // nó là thôi dùng làm đại diện, và nút "Bỏ ảnh đại diện" ở trên đã lo.
    if (!muc.laLe) {
      hang.append(nutNhoAnh('Gỡ khỏi kho ảnh', batDuoc, true, () => {
        muc.boDi = true;
        if (anhDaiDienKhoa === muc.khoa) anhDaiDienKhoa = '';
        veLaiKhoiAnh(nguoi);
      }));
    }
  }

  hang.append(nutNhoAnh('Thôi', true, false, () => {
    anhDangXet = '';
    veLaiKhoiAnh(nguoi);
  }));

  return hang;
}

function nutNhoAnh(chu, batDuoc, laDo, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'min-height:40px;padding:0 12px;font-size:13px;font-family:inherit;' +
    'border-radius:9px;border:1px solid #e6e0d8;background:#fffdf9;' +
    'color:' + (laDo ? '#8a3a2a' : '#2a2622') + ';' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '.45') + ';touch-action:manipulation';
  if (batDuoc) b.addEventListener('click', chay);
  return b;
}

// ============================================================
// Thêm một tấm mới
// ============================================================

function nutChonAnh(nguoi) {
  const batDuoc = suaDuoc() && !anhDangTai && !dangLuu;

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:block;min-height:40px;padding:10px 12px;box-sizing:border-box;' +
    'font-size:14px;text-align:center;border-radius:9px;border:1px solid #e6e0d8;' +
    'background:#faf8f5;line-height:1.3;max-width:' + RONG_NUT_TOI_DA + ';' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45');
  nhan.textContent = anhDangTai
    ? 'Đang tải lên…'
    : (khoAnh.some((a) => !a.boDi) ? 'Thêm ảnh' : 'Chọn ảnh');

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
  b.textContent = 'Bỏ ảnh đại diện';
  b.disabled = anhDangTai || dangLuu;
  b.style.cssText =
    'min-height:36px;padding:7px 12px;font-size:13px;font-family:inherit;' +
    'border-radius:9px;border:1px solid #e6e0d8;background:#fffdf9;color:#8a3a2a;' +
    'cursor:pointer;touch-action:manipulation;max-width:' + RONG_NUT_TOI_DA + ';';
  b.addEventListener('click', () => {
    anhDaiDienKhoa = '';
    veLaiKhoiAnh(nguoi);
  });
  return b;
}

/** Sau khi bấm Lưu thì người này còn ảnh đại diện hay không. */
function coAnhSauKhiLuu() {
  return !!mucDaiDien();
}

/**
 * Câu tường thuật dưới khối ảnh.
 *
 * Nói ra điều KHÔNG hiển nhiên: ảnh đã nằm trên Drive rồi, nhưng hồ sơ thì
 * chưa đổi. Không nói thì người dùng đóng form và đinh ninh là xong.
 */
function moTaTrangThaiAnh(nguoi) {
  if (anhDangTai) return 'Đang nén và tải ảnh lên Google Drive…';

  const moi = khoAnh.filter((a) => a.laMoi && !a.boDi).length;
  const bo  = khoAnh.filter((a) => a.boDi && !a.laMoi).length;
  const dd  = mucDaiDien();

  const cau = [];
  if (moi > 0) {
    cau.push(moi === 1
      ? 'Một tấm đã lên Drive nhưng chưa vào gia phả.'
      : moi + ' tấm đã lên Drive nhưng chưa vào gia phả.');
  }
  if (bo > 0) {
    cau.push(bo === 1
      ? 'Một tấm sẽ được gỡ khỏi kho — bản ghi vẫn nằm lại trong file, file ảnh vẫn nằm nguyên trên Drive.'
      : bo + ' tấm sẽ được gỡ khỏi kho — bản ghi vẫn nằm lại trong file, file ảnh vẫn nằm nguyên trên Drive.');
  }
  if (dd && dd.laLe) {
    cau.push('Ảnh đại diện hiện nay không có bản ghi nào trong kho — bản ghi này ' +
             'nhập từ nơi khác, hoặc file đã bị sửa tay ngoài app.');
  }
  if (cau.length > 0) {
    cau.push('Bấm "Lưu" ở cuối form thì những việc trên mới thành thật.');
    return cau.join(' ');
  }

  if (khoAnh.length === 0) {
    return 'Chưa có ảnh. Sơ đồ đang vẽ bóng người theo giới tính. ' +
           'Ảnh được nén nhỏ lại trước khi gửi đi, không tải nguyên file gốc.';
  }
  if (!anhCoDaiDien) {
    return 'Ảnh của cặp này — ảnh cưới, ảnh cả nhà. Một cặp không có ảnh đại ' +
           'diện: sơ đồ vẽ mặt từng người, không vẽ ô nào của riêng cặp.';
  }
  if (!dd) {
    return 'Kho còn ảnh, nhưng không tấm nào đang làm đại diện — sơ đồ vẽ bóng ' +
           'người. Bấm một tấm rồi chọn "Đặt làm ảnh đại diện".';
  }
  return 'Bấm một tấm trong kho để đặt nó làm ảnh đại diện, hoặc gỡ nó ra.';
}

/**
 * Nén rồi tải một tấm ảnh lên Drive.
 *
 * ⚠ Hàm này **không** đụng tới `state.tree`, không gọi `luuCay()`. Nó chỉ đổi
 * bản làm việc `khoAnh`. Cả cây chỉ đổi ở đúng một chỗ: `handleSave()`.
 */
async function chonVaTaiAnh(file, nguoi) {
  anhDangTai = true;
  veLaiKhoiAnh(nguoi);

  try {
    const nen = await compressImage(file);
    const ten = 'anh_' + anhCuaAi + '_' + stampNow().replace(/[^0-9]/g, '') + '.jpg';
    const kq  = await taiAnh(nen.base64, ten);

    if (!kq || !kq.ok) {
      throw new Error((kq && kq.loi) ||
        'Máy chủ không nhận ảnh mà không nói rõ vì sao.');
    }

    demAnhMoi += 1;
    const khoa = 'moi-' + demAnhMoi;
    khoAnh.unshift({
      khoa, mediaId: '', driveFileId: kq.fileId, caption: '',
      xemTruoc: nen.base64, laMoi: true, laLe: false, boDi: false,
    });
    // Quyết định 2: tấm vừa thêm luôn thành đại diện — nhưng chỉ khi chủ thể
    // có ảnh đại diện. Ảnh cưới của một cặp thì thêm là thêm, hết.
    if (anhCoDaiDien) anhDaiDienKhoa = khoa;
    anhDangXet = '';

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
 * Áp thay đổi kho ảnh lên một cây ĐÃ SỬA XONG phần hồ sơ.
 *
 * Chạy SAU `updatePerson` và trên chính cây nó trả về, vì `attachMedia` sinh mã
 * `M….` từ cây — sinh trên cây cũ rồi ghép vào cây mới là đúng cái bẫy mà
 * `utils/id.js` đã dặn ở đầu file.
 *
 * ⚠ **BA BƯỚC, ĐÚNG THỨ TỰ NÀY, và mỗi bước NỐI ĐUÔI bước trước.**
 *
 *   1. THÊM trước — vì bước 3 cần mã `M….` thật của tấm vừa thêm, mà mã ấy chỉ
 *      có sau khi `attachMedia` chạy.
 *   2. GỠ tiếp.
 *   3. ĐẠI DIỆN sau cùng — vì `detachMedia` **tự xoá `photoFileId`** khi tấm bị
 *      gỡ đúng là tấm đang làm mặt. Đặt đại diện trước rồi mới gỡ thì bước 2
 *      xoá mất việc bước 3 vừa làm, và cái sai ấy không có gì báo lỗi cả.
 *
 * @returns {{tree, person, themVao, goRa, diff}|null} null khi lần lưu này
 *          không đụng tới ảnh — nơi gọi đọc `null` để biết có gì đổi hay không.
 */
function apThayDoiAnh(cay, subjectId, ghiNhan) {
  const personId = subjectId;
  let tree = cay;
  const themVao = [];   // bản ghi ảnh MỚI, để đẩy sang máy chủ
  const goRa    = [];   // bản ghi ảnh vừa mang cờ `deleted`, cũng phải đẩy sang
  const diff    = {};
  const maThat  = new Map();   // khoá tạm -> mã `M….` thật

  // 1. THÊM
  for (const a of khoAnh) {
    if (!a.laMoi || a.boDi) continue;
    const kq = attachMedia(tree, personId, a.driveFileId, a.caption, ghiNhan);
    if (!kq) continue;
    tree = kq.tree;
    themVao.push(kq.media);
    Object.assign(diff, kq.diff);
    maThat.set(a.khoa, kq.media.id);
  }

  // 2. GỠ. Tấm vừa thêm mà lại bỏ đi ngay thì KHÔNG có gì để gỡ — nó chưa bao
  //    giờ vào cây. File trên Drive nằm lại, cùng lối với "chọn ảnh rồi đóng
  //    form không lưu" của bước 28.
  for (const a of khoAnh) {
    if (a.laMoi || a.laLe || !a.boDi || !a.mediaId) continue;
    const kq = detachMedia(tree, a.mediaId, ghiNhan);
    if (!kq) continue;
    tree = kq.tree;
    goRa.push(kq.media);
    Object.assign(diff, kq.diff);
  }

  // 3. ĐẠI DIỆN — cặp không có bước này, xem `anhCoDaiDien`.
  const dd = anhCoDaiDien ? mucDaiDien() : null;
  if (!anhCoDaiDien) {
    if (Object.keys(diff).length === 0) return null;
    return { tree, person: null, themVao, goRa, diff };
  }
  if (dd && dd.laLe) {
    // Con trỏ đang đúng như cũ, và không có bản ghi nào để trỏ lại. Không làm
    // gì là đúng — xem quyết định 5.
  } else if (dd) {
    const ma = dd.laMoi ? maThat.get(dd.khoa) : dd.mediaId;
    const kq = ma ? setPortrait(tree, personId, ma, ghiNhan) : null;
    if (kq) { tree = kq.tree; Object.assign(diff, kq.diff); }
  } else {
    const kq = clearPortrait(tree, personId, ghiNhan);
    if (kq) { tree = kq.tree; Object.assign(diff, kq.diff); }
  }

  if (Object.keys(diff).length === 0) return null;

  const nguoi = (Array.isArray(tree.persons) ? tree.persons : [])
    .find((p) => p && p.id === personId) || null;

  return { tree, person: nguoi, themVao, goRa, diff };
}

/** Một câu kể những gì kho ảnh vừa đổi, để đưa vào `changeLog`. */
function keThayDoiAnh(anh) {
  if (!anh) return '';
  const phan = [];
  if (anh.themVao.length > 0) phan.push('thêm ' + anh.themVao.length + ' ảnh');
  if (anh.goRa.length > 0)    phan.push('gỡ ' + anh.goRa.length + ' ảnh');
  const doiMat = Object.keys(anh.diff).some((k) => k.endsWith('.photoFileId'));
  if (doiMat) phan.push(coAnhSauKhiLuu() ? 'đổi ảnh đại diện' : 'bỏ ảnh đại diện');
  return phan.length > 0 ? ' Kho ảnh: ' + phan.join(', ') + '.' : '';
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
    'padding:10px 0;background:#fffdf9;justify-content:center';

  nutLuu = document.createElement('button');
  nutLuu.type = 'button';
  nutLuu.textContent = laCheDoThem() ? tieuDeForm() : 'Lưu';
  nutLuu.disabled = !luuDuoc;
  nutLuu.style.cssText = KIEU_NUT_CHAN +
    'flex:1 1 auto;max-width:' + RONG_NUT_TOI_DA + ';' +
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

/**
 * Khối XOÁ ở CUỐI THÂN form sửa hồ sơ (22/08/2026).
 *
 * Chủ dự án: *"trong phần chỉnh sửa mỗi người, gia đình đang chọn cũng có thêm
 * nút xoá"*. Trước hôm nay, xoá một người chỉ tới được từ vành vòng tròn.
 *
 * --- BA quyết định -------------------------------------------------------
 *
 * 1. **KHÔNG đặt nút này vào hàng chân cạnh nút *Lưu*.** Hàng chân của form
 *    này DÍNH ĐÁY (`position:sticky`) và luôn nằm dưới ngón cái suốt lúc
 *    người ta cuộn qua ba chục ô nhập. Một nút xoá nằm sẵn ở đó, cách nút
 *    *Lưu* đúng 8px, là chuyện sớm muộn.
 *
 *    Chỗ đúng là CUỐI THÂN form: phải cuộn hết mọi ô mới tới, và ở đó nó đứng
 *    một mình sau một đường kẻ.
 *
 * 2. **CHỈ mọc ở chế độ SỬA.** Form đang THÊM một người mới thì chưa có bản
 *    ghi nào để mà xoá — nút *Huỷ* mới là thứ đúng, và nó đã có sẵn.
 *
 * 3. **Nó chỉ là CỬA, không phải việc.** Hộp xác nhận, phép đếm hậu quả và
 *    đường hoàn tác đều nằm trong `xoaNguoi()` — luật 8, viết từ bước 21.
 *    Chép một bản thứ hai ở đây là tới ngày một bản được vá còn bản kia không.
 *
 * @returns {HTMLElement[]} rỗng khi không phải chế độ sửa, hoặc không đủ quyền.
 */
function veKhoiXoaNguoi(nguoi) {
  if (cheDo !== 'sua' || !nguoi || !nguoi.id) return [];
  if (!suaDuoc()) return [];

  const vach = document.createElement('div');
  vach.style.cssText = 'margin-top:22px;border-top:1px solid #f0ebe4;padding-top:14px';

  const nhan = document.createElement('div');
  nhan.textContent = 'Xoá khỏi gia phả';
  nhan.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078;margin-bottom:6px';

  const giai = document.createElement('div');
  giai.textContent =
    'Xoá mềm: bản ghi vẫn nằm nguyên trong file, chỉ mang thêm một cái cờ, và ' +
    'sơ đồ thôi vẽ ra. Lấy lại được bất cứ lúc nào từ thùng rác.';
  giai.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-bottom:8px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'xoa-nguoi';
  nut.textContent = 'Xoá ' + tenNguoi(nguoi.id) + ' khỏi gia phả';
  nut.style.cssText = KIEU_NUT_CHAN +
    'width:100%;text-align:center;' +
    'background:#fbf0ec;color:#8a3a2a;border:1px solid #f0d8d0;font-weight:600';

  // ⚠ Giữ lấy `xuLyNgoai` TRƯỚC khi đóng form: `closePersonForm()` đặt nó về
  // rỗng, nên đọc sau đó thì đường `onDaLuu` biến mất và sơ đồ không vẽ lại.
  nut.addEventListener('click', () => {
    const xuLy = xuLyNgoai;
    closePersonForm();
    xoaNguoi(nguoi.id, xuLy);
  });

  vach.append(nhan, giai, nut);
  return [vach];
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

  // ⚠ Ô ĐỜI phải chặn Ở ĐÂY, không chặn trong `domains/person.js`.
  // `datDoi()` cố ý KHÔNG ĐỘNG VÀO khi đọc không ra số — lặng lẽ xoá mất số 5
  // đang có vì một lỗi gõ phím là mất dữ liệu. Nhưng "không động vào" mà không
  // ai nói gì thì người dùng bấm Lưu, thấy báo thành công, và tin rằng mình vừa
  // ghi được Đời. Đây là chỗ nói ra.
  const loiDoi = viSaoDoiSai(docO('doi'));
  if (loiDoi) { hienNhan(loiDoi, true); return; }

  // Bản ghi mới tính đúng MỘT lần, dùng cho cả phép rà lẫn lần ghi — luật 1 ở
  // đầu file. `updatePerson` là hàm thuần, `state.tree` không bị đụng tới.
  const kq = updatePerson(state.tree, nguoi.id, gomThayDoi(), { boi, luc });
  if (!kq) { hienNhan('Không tìm thấy bản ghi của người này nữa. Tải lại trang rồi thử lại.', true); return; }

  // Ảnh áp SAU hồ sơ, trên chính cây mà `updatePerson` vừa trả về — xem
  // `apThayDoiAnh()`. Từ đây trở xuống chỉ dùng bốn biến `…Cuoi`.
  const anh       = apThayDoiAnh(kq.tree, nguoi.id, { boi, luc });
  const sauAnh    = anh ? anh.tree   : kq.tree;
  const nguoiCuoi = anh ? anh.person : kq.person;

  // Khối QUAN HỆ nối đuôi vào cây mà hai bước trên vừa trả về — xem
  // `apThayDoiQuanHe`. Nó KHÔNG đụng bản ghi người, chỉ đụng các cặp.
  const qh        = apThayDoiQuanHe(sauAnh);
  const cayCuoi   = qh.tree;
  const diffCuoi  = Object.assign({}, kq.diff, anh ? anh.diff : null, qh.diff);

  // ⚠ Đổi MỖI ảnh cũng là một thay đổi. Xét `kq.thayDoi` một mình thì bấm Lưu
  // sau khi chọn ảnh sẽ nghe câu "chưa có gì thay đổi" — mà ảnh thì đã nằm
  // trên Drive rồi, nên người dùng có mọi lý do để tin là mình vừa mất nó.
  // Cùng lý lẽ cho quan hệ: đổi MỖI một ô chọn cũng là một thay đổi.
  if (!kq.thayDoi && !anh && qh.capDoi.length === 0) {
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
  const anhThem  = anh ? anh.themVao : [];
  const anhGoRa  = anh ? anh.goRa    : [];
  const capMoi   = qh.capDoi;
  let ketQua;
  try {
    ketQua = await luuCay(
      (cay) => {
        const ds = Array.isArray(cay.persons) ? cay.persons : [];
        const i = ds.findIndex((p) => p && p.id === nguoi.id);
        if (i >= 0) ds[i] = JSON.parse(JSON.stringify(nguoiMoi));

        // Các cặp bị khối Quan hệ đụng tới. THAY THẾ chứ không thêm mới: mọi
        // cặp ở đây đều đã có sẵn trong cây — `updateChildRelation` và
        // `updateUnion` đều trả về null khi không tìm ra cặp, nên không mục
        // nào tới được đây mà chưa tồn tại.
        for (const u of capMoi) {
          if (!Array.isArray(cay.unions)) cay.unions = [];
          const j = cay.unions.findIndex((x) => x && x.id === u.id);
          if (j >= 0) cay.unions[j] = JSON.parse(JSON.stringify(u));
        }

        if (anhThem.length > 0 || anhGoRa.length > 0) {
          if (!Array.isArray(cay.media)) cay.media = [];
        }

        // ẢNH MỚI — thêm vào kho. Chốt chặn cuối, cùng lý lẽ với mã người ở
        // `handleAddChild`: mã ảnh sinh từ cây lúc bấm Lưu, còn hàm này chạy
        // trên bản sao của cây LÚC GỬI. Hai cây lệch nhau thì thà hỏng lần lưu
        // còn hơn ghi hai bản ghi ảnh trùng mã.
        for (const m of anhThem) {
          if (cay.media.some((x) => x && x.id === m.id)) {
            throw new Error('Mã ảnh ' + m.id + ' vừa được dùng cho một tấm khác. ' +
                            'Tải lại trang rồi gắn ảnh lại.');
          }
          cay.media.push(JSON.parse(JSON.stringify(m)));
        }

        // ẢNH GỠ — THAY THẾ bản ghi cũ, không thêm mới và không xoá khỏi mảng:
        // gỡ ảnh là đặt cờ `deleted`, luật 3 của `domains/media.js`. Không tìm
        // ra bản ghi thì bỏ qua, không ném lỗi — người khác vừa gỡ đúng tấm ấy
        // là một cuộc đua vô hại, kết quả cuối vẫn là tấm ảnh bị gỡ.
        for (const m of anhGoRa) {
          const k = cay.media.findIndex((x) => x && x.id === m.id);
          if (k >= 0) cay.media[k] = JSON.parse(JSON.stringify(m));
        }
      },
      {
        action: 'update',
        target: nguoi.id,
        note:   'Sửa hồ sơ ' + fullName(nguoiMoi) + ' bằng form nhập liệu.' +
                keThayDoiAnh(anh) +
                keThayDoiQuanHe(qh),
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

    // TÊN PHỤ đi thành CẢ danh sách, không đi thành từng phép thêm/bớt — lý lẽ
    // ở `domains/person.datTenPhu`. Hàng người dùng bỏ trống chữ được `datTenPhu`
    // loại đi, nên form không phải lọc trước.
    altNames: tenPhu.map(phanTenPhu),
    sex:         docO('sex'),
    living:      !!(o.living && o.living.checked),
    burialPlace: docO('burialPlace'),
    gio:         docO('gio'),
    note:        docO('note'),

    // Bộ thông dụng (V03). `doi` và `chi` đi vào `vn.generation`/`vn.branch`;
    // sáu cái còn lại nằm phẳng trên `person`. Việc ánh xạ ấy là của
    // `domains/person.updatePerson`, không phải của form.
    title:       docO('title'),
    occupation:  docO('occupation'),
    education:   docO('education'),
    religion:    docO('religion'),
    residence:   docO('residence'),
    nationality: docO('nationality'),
    doi:         docO('doi'),
    chi:         docO('chi'),
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

/**
 * Đời đang lưu, đọc ra CHỮ để điền vào ô. Không có thì ô trống — không điền
 * số 0, vì đời 0 không có nghĩa gì và người dùng sẽ tưởng gia phả đã ghi vậy.
 */
function doiHienTai(nguoi) {
  const n = nguoi && nguoi.vn ? Number(nguoi.vn.generation) : NaN;
  return (Number.isFinite(n) && n > 0) ? String(n) : '';
}

/**
 * Lý do ô Đời không dùng được, hoặc null nếu dùng được. Ô TRỐNG là hợp lệ —
 * phần lớn bản ghi trong một cuốn gia phả cũ không ai đánh số đời.
 */
function viSaoDoiSai(chu) {
  const t = String(chu || '').trim();
  if (t === '') return null;

  const n = Number(t);
  if (!Number.isFinite(n)) {
    return 'Ô "Đời thứ mấy" chỉ nhận một con số — bạn đang gõ "' + t + '". ' +
           'Chưa biết đời thứ mấy thì để trống ô ấy.';
  }
  if (Math.floor(n) !== n) {
    return 'Đời phải là số nguyên, không có đời ' + t + '.';
  }
  if (n <= 0) {
    return 'Đời phải lớn hơn 0. Đời đầu tiên của một dòng họ là đời 1.';
  }
  return null;
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
  'display:flex;align-items:center;justify-content:center;' +
  'padding:' + leLopPhu() + ';' +
  'font-family:system-ui,sans-serif;color:#2a2622';

const KIEU_HOP =
  'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
  'width:100%;max-width:' + rongHop(380, 640) + ';' +
  'max-height:' + caoHop(86) + ';overflow:auto;' +
  'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
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

/**
 * Lời báo khi máy chủ từ chối. `hienTrang` nói rõ dữ liệu đang ở trạng thái nào.
 *
 * ⚠ `hienTrang` LUÔN được ghép vào, kể cả khi máy chủ đã có câu giải thích
 * riêng. Bản cũ chỉ dùng nó ở nhánh "không nói rõ vì sao", và đó là một lỗ:
 * câu của máy chủ giải thích *vì sao hỏng*, còn `hienTrang` trả lời câu hỏi
 * khác hẳn — *bây giờ dữ liệu đang ra sao*. Với đường xoá thật thì câu thứ hai
 * mới là câu người dùng cần: họ vừa bấm một nút không lùi được và phải biết
 * ngay là nó đã chạy hay chưa.
 */
function hienLoiGhi(ketQua, hienTrang) {
  if (ketQua && ketQua.lyDo === 'xungdot') {
    hienNhan('Người khác vừa sửa gia phả trong lúc hộp này đang mở, nên app KHÔNG ' +
             'ghi đè lên bản của họ. ' + hienTrang + ' Tải lại trang rồi làm lại.', true);
    return;
  }
  const cua = (ketQua && ketQua.loi) || 'Máy chủ không nói rõ vì sao.';
  hienNhan(hienTrang + ' ' + cua, true);
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
 * @param {string} [doiTacId]  người kia của đường NỐI — xem mục dưới
 *
 * --- ⚠ QUAN HỆ VỢ CHỒNG ĐỐI XỨNG, MÃ THÌ TỪNG KHÔNG (vá 22/08/2026) ------
 *
 * Bản cũ chỉ nhìn cặp của `mocId`. Hệ quả đo được bằng
 * `kiem-thu/chan-doan-gia-dinh.mjs`: nối vợ–chồng từ thẻ CHỒNG thì app hỏi và
 * kể rõ *"1 con · U0026"*; từ thẻ VỢ thì nó **im lặng dựng cặp mới**, dù cặp
 * kia đang có con và còn đúng một chỗ trống. Cùng hai con người, cùng một mối
 * nối, hai kết quả khác nhau — chỉ vì người dùng mở thẻ nào trước.
 *
 * Nay `'banDoi'` gom cặp của **cả hai phía**. Một cặp chỉ nhận được khi nó còn
 * chỗ trống, và người điền vào chỗ ấy là người CHƯA đứng trong cặp — `dungCayNoi`
 * tự tìm ra, không cần truyền thêm gì.
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
function chonCap(vaiTro, mocId, xuLy, tiep, doiTacId = '') {
  const index = state.index;
  if (!index) return;

  let tatCa = (vaiTro === 'chaMe')
    ? getParentUnions(index, mocId)
    : getPartnerUnions(index, mocId);

  // Cặp của người KIA, chỉ ở vai vợ/chồng. Cặp nào cả hai đã cùng đứng thì
  // không kể — `quanHeDaCo()` đã chặn đường ấy từ trước khi tới đây.
  if (vaiTro === 'banDoi' && doiTacId) {
    const daCo = new Set(tatCa.map((u) => u.id));
    for (const u of getPartnerUnions(index, doiTacId)) {
      if (!daCo.has(u.id)) { daCo.add(u.id); tatCa = tatCa.concat([u]); }
    }
  }

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

  // Cặp một người có con là ca dễ chọn nhầm nhất: bước vào đó là đồng thời
  // nhận mấy người con ấy làm con mình (luật 9). Nói ngay trên chính cái nút.
  if (vaiTro === 'banDoi') {
    for (const m of cacMuc) {
      const u = nhanDuoc.find((x) => x.id === m.ma);
      const soCon = (u && Array.isArray(u.children)) ? u.children.length : 0;
      if (soCon > 0) {
        m.phu = m.phu + '  ·  ⚠ bước vào cặp này là nhận luôn ' + soCon +
                ' người con ấy làm con mình';
      }
    }
  }

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
    phu:    doiTacId
      ? tenNguoi(mocId) + '  ←→  ' + tenNguoi(doiTacId)
      : tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  nhanDuoc.length === 0
      ? (vaiTro === 'chaMe'
        ? tenNguoi(mocId) + ' đã có đủ cha mẹ trong gia phả, nên người này sẽ ' +
          'thành một cặp cha mẹ THỨ HAI — cha mẹ nuôi hoặc cha mẹ kế.'
        : tenNguoi(mocId) + ' đã có đủ vợ/chồng trong mọi cặp đang có, nên đây ' +
          'sẽ là một cuộc hôn nhân KHÁC.')
      : (vaiTro === 'chaMe'
        ? 'Cha mẹ của ' + tenNguoi(mocId) + ' được ghi theo CẶP. Chọn cặp:'
        : (vaiTro === 'banDoi'
          ? (doiTacId
            ? 'Hai người này đứng chung cặp nào? Cặp kể dưới đây là cặp của ' +
              'CẢ HAI phía, và cặp nào cũng còn đúng một chỗ trống.'
            : 'Chọn chỗ đứng cho người vợ / chồng này:')
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
  }, targetId);
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

/**
 * Ai là người BƯỚC VÀO cặp `unionId` — người chưa đứng sẵn trong đó.
 * Cần vì `chonCap('banDoi')` nay kể cả cặp của người kia (vá 22/08/2026).
 */
function aiVaoCap(unionId, personId, targetId) {
  const u = state.index && state.index.unionById.get(unionId);
  const cac = (u && Array.isArray(u.partners)) ? u.partners : [];
  return cac.indexOf(targetId) >= 0 ? personId : targetId;
}

/**
 * ⚠ Người con này ĐÃ CÓ cha mẹ ở cặp khác — dòng cảnh báo, hoặc chuỗi rỗng.
 *
 * Lỗ hổng thứ hai của đường kết nối (đo được 21/08/2026): từ thẻ VỢ chọn
 * *"C là CON của tôi"*, app nối C vào cặp mới **mà không nói C đã có cha mẹ ở
 * cặp khác** — kết quả là hai cặp cha mẹ chung một người cha, đúng loại dữ liệu
 * bẩn mà màn Rà soát phải đi nhặt về sau.
 *
 * Chỉ NÓI RA, không chặn: hai cặp cha mẹ là chuyện thật khi có cha mẹ nuôi hoặc
 * cha mẹ kế. Thứ sai là làm việc ấy mà người dùng không biết mình đang làm.
 */
function loiConDaCoChaMe(childId, unionId) {
  const index = state.index;
  if (!index || !childId) return '';
  const khac = getParentUnions(index, childId).filter((u) => u.id !== unionId);
  if (khac.length === 0) return '';

  return '⚠ ' + tenNguoi(childId) + ' ĐÃ CÓ cha mẹ trong gia phả: ' +
         khac.map((u) => keTenPartner(u.id) + '  ·  ' + u.id).join('   |   ') +
         '. Nối xong thì người này có ' + (khac.length + 1) + ' cặp cha mẹ — ' +
         'đúng khi đó là cha mẹ NUÔI hoặc cha mẹ KẾ, còn nếu chỉ là một cặp ghi ' +
         'trùng thì hãy "Không nối", gỡ cặp cũ trước rồi nối lại.';
}

/** Từng dòng hậu quả của đường NỐI. Nối chỉ THÊM cạnh, nên không ai mất gì. */
function cauKeNoi() {
  const { personId, targetId, loai, unionId } = noiCtx;
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);
  const dong = [];

  if (loai === 'spouse') {
    const vao = unionId ? aiVaoCap(unionId, personId, targetId) : targetId;
    dong.push(A + ' và ' + B + ' thành vợ chồng' +
              (unionId ? ' trong cặp ' + unionId + ' — ' + tenNguoi(vao) +
                         ' là người bước vào cặp đang có.'
                       : ' trong một cặp mới.'));
    if (unionId) {
      const u = state.index.unionById.get(unionId);
      const cacCon = (Array.isArray(u && u.children) ? u.children : [])
        .map((c) => c && c.personId).filter((id) => id && state.index.personById.has(id));
      if (cacCon.length > 0) {
        dong.push('⚠ Cặp ' + unionId + ' đang có ' + cacCon.length + ' người con (' +
                  cacCon.map(tenNguoi).join(' · ') + '), nên ' + tenNguoi(vao) +
                  ' đồng thời thành cha/mẹ của họ. Trong gia phả này quan hệ cha ' +
                  'mẹ – con đi QUA cặp, không nối thẳng người với người.');
      }
    }
  } else if (loai === 'child') {
    dong.push(B + ' thành người con của ' +
              (unionId ? keTenPartner(unionId) + '  ·  ' + unionId
                       : A + ' (app tạo thêm một cặp mới cho riêng họ)') + '.');
    const canhBao = loiConDaCoChaMe(targetId, unionId);
    if (canhBao) dong.push(canhBao);
  } else {
    dong.push(B + ' thành cha / mẹ của ' + A +
              (unionId ? ', đứng chung cặp ' + unionId + ' với ' + keTenPartner(unionId) + '.'
                       : ' trong một cặp cha mẹ mới.'));
    const canhBao = loiConDaCoChaMe(personId, unionId);
    if (canhBao) dong.push(canhBao);
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
      // Cặp ấy có thể là cặp của NGƯỜI KIA (`chonCap` nay gom cả hai phía), nên
      // người bước vào là người chưa đứng trong đó — không mặc định là `targetId`.
      const kq = addPartner(tree, unionId, aiVaoCap(unionId, personId, targetId));
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
    // Cùng phép sửa với thẻ thông tin (21/08/2026): đọc CẢ NĂM mã, không riêng
    // 'adopted'. Bản cũ để `step` · `foster` · `thua_tu` rơi vào nhánh rỗng,
    // và hộp Gỡ nối kể một đứa con riêng y hệt một đứa con đẻ.
    const chuThich = chuThichQuanHe(m.relation, 'con');
    cacMuc.push({
      ma: 'child:' + m.personId,
      chu: 'Con: ' + tenNguoi(m.personId),
      phu: (chuThich ? chuThich + '  ·  ' : '') + m.unionId,
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
async function ghiBanGhi(nguoiThem, cacUnion, moTa, anh) {
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

      // ẢNH — cùng hai vòng lặp với `handleSave`, cùng chốt chặn mã trùng.
      if (anh) {
        if (!Array.isArray(cay.media)) cay.media = [];
        for (const m of anh.themVao) {
          if (cay.media.some((x) => x && x.id === m.id)) {
            throw new Error('Mã ảnh ' + m.id + ' vừa được dùng cho một tấm khác. ' +
                            'Tải lại trang rồi gắn ảnh lại.');
          }
          cay.media.push(JSON.parse(JSON.stringify(m)));
        }
        for (const m of anh.goRa) {
          const k = cay.media.findIndex((x) => x && x.id === m.id);
          if (k >= 0) cay.media[k] = JSON.parse(JSON.stringify(m));
        }
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
 * @param {{onDaLuu?:function(string), unionId?:string}} [xuLy]
 *        `unionId` — nơi gọi ĐÃ BIẾT cặp nào, nên bỏ hẳn bước hỏi. Thẻ gia
 *        đình (việc 4) vào bằng đường này: nó đang mở đúng một cặp, và hỏi lại
 *        *"cặp nào"* ngay sau khi người ta bấm Sửa trên chính cặp ấy là hỏi
 *        một câu vừa được trả lời.
 */
export function openUnionForm(mocId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(mocId)) return;

  if (xuLy.unionId && index.unionById.has(xuLy.unionId)) {
    moFormCap(xuLy.unionId, xuLy);
    return;
  }

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

  // ẢNH CƯỚI — việc 5 nửa B. Đứng CUỐI form, sau mọi ô chữ: nó là thứ nặng
  // nhất trên màn hình, mà người mở form ra thì thường để sửa ngày cưới hay
  // thứ bậc. Đặt nó lên trên là mỗi lần sửa một con số lại phải cuộn qua một
  // dải ảnh. Trên THẺ thì ngược lại — ở đó ảnh đứng ngay dưới đầu thẻ, vì
  // thẻ là để XEM.
  ra.push(veNhan('Ảnh của cặp này'));
  ra.push(veKhoiAnh(u.id, null));

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

  // Dấu thời gian và người sửa, cho kho ảnh — `updateUnion` ở đây không nhận
  // `ghiNhan`, nhưng `attachMedia` và `detachMedia` thì có.
  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

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

  const sauDoi   = kqDoi ? kqDoi.tree  : kq.tree;
  const capCuoi  = kqDoi ? kqDoi.union : kq.union;

  // ẢNH nối đuôi vào cây mà hai bước trên vừa trả về — cùng lý lẽ với
  // `handleSave`: `attachMedia` sinh mã `M….` từ cây.
  const anh      = apThayDoiAnh(sauDoi, capDangSua, { boi, luc });
  const cayCuoi  = anh ? anh.tree : sauDoi;
  const diffCuoi = Object.assign({}, kq.diff, kqDoi ? kqDoi.diff : null,
                                 anh ? anh.diff : null);

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
    note:   'Sửa cặp ' + keTenPartner(capDangSua) + '.' + keThayDoiAnh(anh),
    diff:   diffCuoi,
  }, anh);

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
// SỬA MỘT NGƯỜI CON TRONG MỘT CẶP — nửa sau việc 8 (22/08/2026)
// ============================================================
//
// Lỗ hổng 3 của đường kết nối, đo được 21/08/2026: ***không có chỗ nào nhìn
// thấy CẶP***. Mô hình đặt quan hệ cha mẹ – con ở **cặp**, còn mọi thao tác lại
// đi từ **một con người** — nên dời một đứa con sang gia đình khác phải làm hai
// việc rời nhau (Gỡ nối, rồi Kết nối lại), và giữa hai việc ấy gia phả thật
// trên Drive có một lúc SAI.
//
// --- NĂM quyết định --------------------------------------------------------
//
// 1. **KHÔNG dựng thêm một "màn hình gia đình" thứ hai.** Thẻ gia đình
//    (`person-detail.openUnionDetail`, việc 4) ĐÃ LÀ màn hình xem một cặp: hai
//    người, ngày cưới, danh sách con. Thứ nó thiếu không phải một cái khung mới
//    mà là mấy cái VIỆC. Dựng khung thứ hai là có hai chỗ cùng nói về một gia
//    đình, và tới ngày hai chỗ ấy lệch nhau thì không ai biết chỗ nào đúng.
//
// 2. **CHUYỂN LÀ MỘT VIỆC, KHÔNG PHẢI HAI.** `removeChild` ở cặp cũ và
//    `addChild` ở cặp mới NỐI ĐUÔI trên cùng một cây rồi đi xuống trong MỘT lần
//    `luuCay()` — luật 4 của đường ghi dữ liệu. Chia làm hai lần lưu thì giữa
//    hai lần ấy đứa bé là người mồ côi trong dữ liệu thật, và lần lưu thứ hai
//    hỏng là nó ở luôn trạng thái ấy.
//
// 3. **KHÔNG thêm hàm `moveChild` vào `domains/union.js`.** File ấy dặn rõ:
//    `addChild`/`removeChild` là HAI hàm duy nhất được phép làm `children[]`
//    dài ra hay ngắn đi, và là hai chỗ duy nhất buộc nơi gọi hỏi tiếp câu
//    `conLyDoTonTai()`. Một hàm `moveChild` gộp sẵn là cửa THỨ BA đi vòng qua
//    câu hỏi đó. Ghép hai hàm ấy ở đây, đúng lối `dungCayNoi()` đã ghép
//    `createUnion` + `addChild`.
//
// 4. **QUAN HỆ ĐI THEO NGƯỜI CON SANG CẶP MỚI.** Con nuôi của cặp này chuyển
//    sang cặp kia thì vẫn là con nuôi — app không tự đổi thành con đẻ. Muốn đổi
//    thì có mục *"Đổi quan hệ với cha mẹ"* ngay cạnh, và mục ấy ghi được CẢ NĂM
//    mã, không riêng `adopted` như ô tích của hộp Kết nối.
//
// 5. **CỬA VÀO LÀ MỘT NÚT RIÊNG MỘT DÒNG DƯỚI NHÓM CON**, không phải một đích
//    chạm thứ hai nhét vào dòng tên đứa bé. Hai đích chạm sát nhau trong một
//    dòng cao 44px là mời bấm nhầm — luật đã chốt ở `pages/person-list.js` và
//    nhắc lại ở `nutXemGiaDinh`.
//
// ⚠ **GỠ con khỏi cặp KHÔNG viết lại ở đây.** `unlink(…, 'child', …)` đã làm
// đúng việc ấy, kèm hộp kể hậu quả và đường hoàn tác. Mục *"Gỡ khỏi gia đình
// này"* dưới đây gọi thẳng vào nó — chép ra bản thứ hai là tới ngày một bản
// được vá còn bản kia không.

/**
 * Mở đường sửa MỘT người con của một cặp.
 *
 * @param {string} unionId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *
 * Cặp có đúng một người con thì BỎ HẲN bước hỏi *"người con nào"* — cùng lối
 * `openUnionForm` bỏ bước hỏi *"cặp nào"* khi người ấy chỉ có một cặp.
 */
export function openSuaCon(unionId, xuLy = {}) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  if (cacCon.length === 0) {
    moHopBao('Sửa người con',
             keTenPartner(unionId) + ' chưa có người con nào trong gia phả, nên ' +
             'chưa có ai để sửa.', false,
             ['Thêm con thì dùng nút "Thêm một người con vào gia đình này" ngay ' +
              'trên thẻ gia đình.']);
    return;
  }

  if (cacCon.length === 1) { moHopViecCon(unionId, cacCon[0].personId, xuLy); return; }

  moHopChon('chon', xuLy, {
    tieuDe: 'Sửa người con nào?',
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Gia đình này có ' + cacCon.length + ' người con. Chọn một người:',
    cacMuc: cacCon.map((c) => ({
      ma:  c.personId,
      chu: tenNguoi(c.personId),
      phu: [chuThichQuanHe(c.relation || 'birth', 'con'), c.personId]
             .filter(coGiaTri).join('  ·  '),
      chay: () => moHopViecCon(unionId, c.personId, xuLy),
    })),
  });
}

/**
 * Thứ tự một người con trong hàng anh chị em. Thiếu số thì XUỐNG CUỐI, không
 * lên đầu — cùng phép với thẻ gia đình: chưa ai xếp họ thì họ đứng sau người
 * đã được xếp.
 */
function thuTuCon(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

/**
 * Ba việc làm được với một người con đã có trong cặp.
 *
 * ⚠ Mục *"Gỡ khỏi gia đình này"* chỉ mọc khi cặp CÓ ÍT NHẤT MỘT người vợ/chồng.
 * `unlink(personId, targetId, 'child', …)` nhận `personId` là người CHA/MẸ, nên
 * một cặp không có ai đứng ở hàng vợ/chồng — dữ liệu chấp nhận, `conLyDoTonTai`
 * gọi đó là *"mấy người này là anh em ruột"* — thì không có mốc để gọi hàm ấy.
 * Thà không mọc nút còn hơn mọc một nút bấm vào không ăn (điểm dừng bước 26).
 */
function moHopViecCon(unionId, conId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u || !index.personById.has(conId)) return;

  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === conId);
  const qh = (muc && muc.relation) || 'birth';

  const cacMuc = [];

  cacMuc.push({
    ma:  'quan-he',
    chu: 'Đổi quan hệ với cha mẹ',
    phu: 'Đang ghi: ' + nhanQuanHeCon(qh, 'con') + '. Ở đây đổi được cả NĂM mức, ' +
         'không riêng con nuôi như ô tích của hộp Kết nối.',
    chay: () => moHopDoiQuanHe(unionId, conId, xuLy),
  });

  const dich = capChuyenDuoc(unionId, conId);
  cacMuc.push({
    ma:  'chuyen',
    chu: 'Chuyển sang gia đình khác',
    phu: dich.length > 0
      ? 'Có ' + dich.length + ' gia đình nhận được. Gỡ khỏi cặp này và nối vào ' +
        'cặp kia trong CÙNG một lần lưu.'
      : 'Chưa có gia đình nào khác nhận được — bấm vào để nghe vì sao.',
    chay: () => moHopChonCapDich(unionId, conId, xuLy),
  });

  const moc = mocCuaCap(unionId);
  if (moc) {
    cacMuc.push({
      ma:  'go',
      chu: 'Gỡ khỏi gia đình này',
      phu: tenNguoi(conId) + ' thôi là con của cặp này. KHÔNG bị xoá khỏi gia phả.',
      nguyHiem: true,
      chay: () => unlink(moc, conId, 'child', Object.assign({}, xuLy, { unionId })),
    });
  }

  moHopChon('chon', xuLy, {
    tieuDe: 'Người con: ' + tenNguoi(conId),
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Làm gì với ' + tenNguoi(conId) + ' trong gia đình này?',
    cacMuc,
  });
}

/** Một người đứng ở hàng vợ/chồng của cặp, để làm mốc cho `unlink`. */
function mocCuaCap(unionId) {
  const u = state.index && state.index.unionById.get(unionId);
  const cac = (Array.isArray(u && u.partners) ? u.partners : [])
    .filter((id) => id && state.index.personById.has(id));
  return cac.length > 0 ? cac[0] : '';
}

// --- ĐỔI QUAN HỆ ĐẺ / NUÔI / RIÊNG / NUÔI DƯỠNG / THỪA TỰ ----------------

/**
 * Năm mức quan hệ, đọc từ `QUAN_HE_CON_NHAN` — MỘT bảng cho cả app.
 *
 * ⚠ Đây là chỗ vá cái hạn chế đo được 21/08/2026: ô tích *"con nuôi"* trong hộp
 * Kết nối chỉ ghi nổi mã `adopted`, trong khi lược đồ có NĂM mã. Muốn ghi *mẹ
 * kế* (`step`) thì trước nay phải vòng qua form hồ sơ.
 */
function moHopDoiQuanHe(unionId, conId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === conId);
  const dang = (muc && muc.relation) || 'birth';

  moHopChon('chon', xuLy, {
    tieuDe: 'Đổi quan hệ',
    phu:    tenNguoi(conId) + '  ·  ' + conId,
    cauMo:  tenNguoi(conId) + ' là gì của ' + keTenPartner(unionId) + '?',
    cacDong: [
      'Đang ghi: ' + nhanQuanHeCon(dang, 'con') + '.',
      '⚠ Ghi một người CON ĐẺ thành con nuôi thì app THÔI rà tuổi sinh học của ' +
      'cạnh này — không có lời báo nào cả, mấy phép rà chỉ lặng đi. Chọn đúng ' +
      'thứ gia phả chép, đừng chọn cho xong.',
    ],
    cacMuc: QUAN_HE_CON_NHAN.map((x) => ({
      ma:  x.ma,
      chu: x.con + (x.ma === dang ? '   ← đang ghi' : ''),
      phu: 'Đọc từ phía cha mẹ: ' + x.chaMe,
      chay: () => chayDoiQuanHe(unionId, conId, x.ma, xuLy),
    })),
  });
}

/**
 * Ghi ngay, không qua hộp xác nhận: việc này chỉ đổi MỘT chữ trong một mục đã
 * có, không thêm không bớt ai, và chọn lại mức cũ là lùi được. Hộp xác nhận
 * dành cho thứ không lùi được — xoá, gỡ, chuyển.
 */
async function chayDoiQuanHe(unionId, conId, maMoi, xuLy) {
  const kq = updateChildRelation(state.tree, unionId, conId, maMoi);

  if (!kq) {
    moHopBao('Không đổi được',
             'Không tìm thấy ' + tenNguoi(conId) + ' trong cặp này nữa. Có thể gia ' +
             'phả vừa thay đổi trong lúc hộp đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    moHopBao('Không có gì đổi',
             tenNguoi(conId) + ' vốn đã được ghi là ' + nhanQuanHeCon(maMoi, 'con') +
             ' của ' + keTenPartner(unionId) + '.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Đổi quan hệ',
                          tenNguoi(conId) + '  ·  ' + conId);

  const canTro = canTroLuu();
  if (canTro) {
    hienNhan(canTro, true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  dangLuu = true;
  hienNhan('Đang ghi…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'update',
    target: unionId,
    note:   'Ghi ' + tenNguoi(conId) + ' là ' + nhanQuanHeCon(maMoi, 'con') +
            ' của ' + keTenPartner(unionId) + '.',
    diff:   kq.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Quan hệ VẪN như cũ.');
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (xuLy.onDaLuu) xuLy.onDaLuu(conId);

  hienNhan('Đã ghi ' + tenNguoi(conId) + ' là ' + nhanQuanHeCon(maMoi, 'con') + '.', false);
  chan.append(nutChon('Xong', true, () => closePersonForm()));
}

// --- CHUYỂN SANG GIA ĐÌNH KHÁC -------------------------------------------

/**
 * Những cặp NHẬN được người con này.
 *
 * Hai cặp bị loại, và cả hai đều vì cùng một lý do — nối vào là dựng ra một
 * điều không thể có thật:
 *
 *   · cặp đã có sẵn đứa bé trong hàng con (`addChild` cũng trả `null`);
 *   · cặp mà chính đứa bé đang đứng ở hàng VỢ/CHỒNG — không ai vừa là con vừa
 *     là cha/mẹ của cùng một gia đình.
 *
 * ⚠ Cặp ĐÃ XOÁ MỀM cũng bị loại: nó đang nằm trong thùng rác, và chuyển con
 * vào một cặp trong thùng rác là giấu đứa bé đi.
 *
 * Còn vòng tổ tiên thì KHÔNG lọc ở đây mà để `checkNoAncestorCycle` bắt lúc rà:
 * lọc sẵn là làm mất một dòng chữ giải thích vì sao không được, và người dùng
 * chỉ thấy cặp mình cần biến mất khỏi danh sách mà không hiểu tại sao.
 */
function capChuyenDuoc(unionId, conId) {
  const index = state.index;
  const ra = [];
  if (!index) return ra;

  const goc = index.unionById.get(unionId);
  const nguoiGoc = new Set(
    (Array.isArray(goc && goc.partners) ? goc.partners : []).filter(Boolean));

  for (const u of index.unionById.values()) {
    if (!u || u.id === unionId || u.deleted) continue;

    const cac = Array.isArray(u.partners) ? u.partners : [];
    if (cac.indexOf(conId) >= 0) continue;

    const daLaCon = (Array.isArray(u.children) ? u.children : [])
      .some((c) => c && c.personId === conId);
    if (daLaCon) continue;

    ra.push({ union: u, chung: cac.filter((id) => id && nguoiGoc.has(id)) });
  }

  // Cặp CÙNG CHA hoặc CÙNG MẸ với cặp hiện nay lên trước. Đó đúng là ca chủ dự
  // án gặp thật 21/08: nút "+ Vợ chồng" dựng thêm một cặp riêng cho người vợ,
  // rồi đứa con nằm lại ở cặp cũ của người chồng. Cặp cần tìm bao giờ cũng là
  // cặp chung một người với cặp đang đứng — để nó lẫn giữa danh sách là bắt
  // người ta đọc từng dòng.
  ra.sort((a, b) => b.chung.length - a.chung.length);
  return ra;
}

/**
 * Hộp chọn gia đình nhận, HAI TẦNG.
 *
 * @param {boolean} [caDanhSach]  bung hết mọi cặp, kể cả cặp không chung ai.
 *
 * ⚠ **Tầng một chỉ kể cặp CHUNG NGƯỜI với gia đình hiện nay.** Ảnh `sc-2.png`
 * của bản một tầng cho thấy vì sao: bản dữ liệu làm việc có 26 cặp, và cả 26
 * đổ ra thành một danh sách dài hơn 1300px trên một cái hộp rộng 360px. Sắp
 * đúng thứ tự thôi thì chưa đủ — người ta vẫn phải đọc qua 26 dòng để tin rằng
 * mình không bỏ sót cái nào.
 *
 * Mà ca thật thì luôn là cặp chung người: nút *+ Vợ chồng* dựng thêm một cặp
 * riêng cho người vợ, rồi đứa con nằm lại ở cặp cũ của người chồng — hai cặp
 * ấy chung đúng người chồng. Tầng một trong ca ấy dài đúng MỘT dòng.
 *
 * Tầng hai không bị giấu đi: nó nằm sau một nút kể rõ còn bao nhiêu cặp nữa.
 * Và khi KHÔNG có cặp nào chung người thì bung thẳng cả danh sách — chia tầng
 * lúc ấy là bắt bấm thêm một cú để xem đúng thứ mình vừa hỏi.
 */
function moHopChonCapDich(unionId, conId, xuLy, caDanhSach) {
  const dich = capChuyenDuoc(unionId, conId);

  if (dich.length === 0) {
    moHopBao('Chưa chuyển được',
             'Gia phả chưa có gia đình nào khác nhận được ' + tenNguoi(conId) + '. ' +
             'Chuyển con là dời từ một cặp ĐÃ CÓ sang một cặp ĐÃ CÓ — muốn dựng ' +
             'một gia đình mới thì phải có cha hoặc mẹ trước đã.', false,
             ['Cách làm: mở thẻ của ' + tenNguoi(conId) + ' → "Kết nối" → chọn ' +
              'người cha hoặc mẹ mới. App tự dựng cặp cho họ.']);
    return;
  }

  const gan = dich.filter((m) => m.chung.length > 0);
  const bung = !!caDanhSach || gan.length === 0;
  const hien = bung ? dich : gan;
  const conLai = bung ? 0 : dich.length - gan.length;

  const cacMuc = hien.map((m) => ({
    ma:  m.union.id,
    chu: keTenPartner(m.union.id),
    phu: [m.chung.length > 0
            ? 'Cùng ' + m.chung.map(tenNguoi).join(' và ') + ' với gia đình hiện nay'
            : '',
          moTaCap(m.union)].filter(coGiaTri).join('  ·  '),
    chay: () => moHopXacNhanChuyen(unionId, conId, m.union.id, xuLy),
  }));

  if (conLai > 0) {
    cacMuc.push({
      ma:  'ca-danh-sach',
      chu: 'Xem cả ' + conLai + ' gia đình khác',
      phu: 'Những gia đình không chung ai với gia đình hiện nay.',
      chay: () => moHopChonCapDich(unionId, conId, xuLy, true),
    });
  }

  const cacDong = ['Cặp cũ và cặp mới cùng đổi trong MỘT lần lưu — không có lúc ' +
                   'nào ' + tenNguoi(conId) + ' bị treo giữa hai nhà.'];

  moHopChon('chon', xuLy, {
    tieuDe: 'Chuyển sang gia đình nào?',
    phu:    tenNguoi(conId) + '  ·  ' + conId,
    cauMo:  tenNguoi(conId) + ' đang là con của ' + keTenPartner(unionId) +
            (bung
              ? '. Chọn gia đình nhận:'
              : '. Những gia đình CHUNG NGƯỜI với gia đình hiện nay — gần như ' +
                'lúc nào cũng là một trong số này:'),
    cacDong,
    cacMuc,
  });
}

function moHopXacNhanChuyen(unionId, conId, capMoi, xuLy) {
  const chan = moHopTrang('chuyenCon', xuLy, 'Chuyển sang gia đình khác',
                          tenNguoi(conId) + '  ·  ' + conId);

  // Luật 8, dùng lại nguyên vẹn: dựng cây đã chuyển NGAY BÂY GIỜ, đọc hậu quả
  // từ chính nó, rồi giữ đúng bản ghi ấy để lát nữa ghi xuống. Tính một lần,
  // dùng hai việc — không có khe nào cho hai bên nghĩ khác nhau.
  chuyenHT = doHauQuaChuyenCon(unionId, conId, capMoi);

  const canTro = canTroLuu();
  if (canTro || !chuyenHT) {
    hienNhan(canTro || 'Không dựng được bản ghi sau khi chuyển. Có thể gia phả ' +
             'vừa thay đổi. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (!chuyenHT.raSoat.canSave) {
    hienNhan('Chưa chuyển được — có chỗ không thể đúng được:', true,
             chuyenHT.raSoat.errors.map((m) => m.message));
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  // ⚠ Cảnh báo nằm CHUNG một danh sách với hậu quả, không tách ra một lượt bấm
  // thứ hai như đường Kết nối. Đường ấy có nút *Lưu* của một cái form, nên chèn
  // được một bước "Vẫn nối"; ở đây cả cái hộp đã LÀ một hộp xác nhận rồi, và
  // bắt xác nhận hai lượt cho một việc là dạy người ta bấm qua mà không đọc.
  hienNhan('Chuyển xong thì:', false, cauKeChuyenCon(unionId, conId, capMoi));

  nutLuu = nutChanXoa('Chuyển sang gia đình này', true,
                      () => chayChuyenCon(unionId, conId, capMoi, xuLy, chan));
  chan.append(nutLuu, nutChanXoa('Không chuyển', false, () => closePersonForm()));
}

/**
 * Dựng cây đã chuyển, rồi đọc hậu quả bằng cách SO hai chỉ mục.
 *
 * @returns {{tree, quanHe, unionNguon, unionDich, diff, nguonChet, thanhLe,
 *            raSoat}|null}
 *
 * ⚠ BA hàm NỐI ĐUÔI trên cùng một cây: `removeChild` → (`softDeleteUnion`) →
 * `addChild`. Chạy hàm sau trên cây CŨ là mất việc của hàm trước — đúng điều
 * `domains/union.js` dặn ở đầu file.
 */
function doHauQuaChuyenCon(unionId, conId, capMoi) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu  = index.unionById.get(unionId);
  const moi = index.unionById.get(capMoi);
  if (!cu || !moi) return null;

  const mucCon = (Array.isArray(cu.children) ? cu.children : [])
    .find((c) => c && c.personId === conId);
  if (!mucCon) return null;
  const quanHe = mucCon.relation || 'birth';

  const banCuNguon = JSON.parse(JSON.stringify(cu));

  const kqGo = removeChild(state.tree, unionId, conId);
  if (!kqGo) return null;
  let tree = kqGo.tree;
  let unionNguon = kqGo.union;
  const diff = Object.assign({}, kqGo.diff);

  // Luật 10: gỡ xong phải hỏi tiếp *"cặp này còn khẳng định được điều gì không"*.
  let nguonChet = false;
  if (!conLyDoTonTai(unionNguon)) {
    const kqX = softDeleteUnion(tree, unionId);
    if (kqX) {
      tree = kqX.tree; unionNguon = kqX.union; nguonChet = true;
      Object.assign(diff, kqX.diff);
    }
  }

  const kqThem = addChild(tree, capMoi, conId, quanHe);
  if (!kqThem) return null;
  tree = kqThem.tree;
  Object.assign(diff, kqThem.diff);

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không chuyển còn hơn chuyển mù
  }

  let raSoat = validateAll(tree, indexMoi, 'union', { unionId: capMoi });
  raSoat = gopRaSoat(raSoat, validateAll(tree, indexMoi, 'child',
    { childId: conId, unionId: capMoi }));
  // Cặp nguồn chỉ rà khi nó CÒN SỐNG. Rà một cặp vừa vào thùng rác là chắc chắn
  // nghe `checkUnionPointless` kêu đúng cái điều mình vừa cố ý làm.
  if (!nguonChet) {
    raSoat = gopRaSoat(raSoat, validateAll(tree, indexMoi, 'union', { unionId }));
  }

  // Ai thành người đứng lẻ VÌ lần chuyển này. Chỉ người có mặt trong cặp nguồn
  // mới đổi được trạng thái, và đó là đúng MỘT bước từ cặp ấy — không phải phép
  // duyệt đồ thị nên không cần tập `visited`.
  const lienQuan = new Set([conId]);
  for (const id of (Array.isArray(banCuNguon.partners) ? banCuNguon.partners : [])) {
    if (id) lienQuan.add(id);
  }
  for (const c of (Array.isArray(banCuNguon.children) ? banCuNguon.children : [])) {
    if (c && c.personId) lienQuan.add(c.personId);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  return { tree, quanHe, unionNguon, unionDich: kqThem.union,
           diff, nguonChet, thanhLe, raSoat };
}

/** Từng dòng hậu quả của đường CHUYỂN, viết cho người không lập trình đọc. */
function cauKeChuyenCon(unionId, conId, capMoi) {
  const A = tenNguoi(conId);
  const dong = [];

  dong.push(A + ' thôi là con của ' + keTenPartner(unionId) + '  ·  ' + unionId +
            ', và thành con của ' + keTenPartner(capMoi) + '  ·  ' + capMoi + '.');

  dong.push('Quan hệ GIỮ NGUYÊN: ' + A + ' vẫn được ghi là ' +
            nhanQuanHeCon(chuyenHT.quanHe, 'con') + ' ở gia đình mới. Muốn đổi ' +
            'thì dùng mục "Đổi quan hệ với cha mẹ".');

  dong.push(A + ' xuống CUỐI hàng anh chị em của gia đình mới. Muốn xếp lại thì ' +
            'mở thẻ gia đình ấy rồi bấm "Sắp thứ tự các con".');

  if (chuyenHT.nguonChet) {
    dong.push('⚠ ' + keTenPartner(unionId) + '  ·  ' + unionId + ' hết lý do tồn ' +
              'tại sau khi ' + A + ' đi, nên CẶP ẤY VÀO THÙNG RÁC. Không ai bị ' +
              'xoá — chỉ cái cặp mất đi, và lấy lại được ở Thùng rác.');
  }

  if (chuyenHT.thanhLe.length > 0) {
    dong.push('⚠ Sau việc này ' + chuyenHT.thanhLe.map(tenNguoi).join(' · ') +
              ' không còn nối với ai trong gia phả. Họ vẫn còn nguyên trong sổ, ' +
              'nhưng sơ đồ vẽ họ đứng lẻ một mình.');
  }

  for (const m of chuyenHT.raSoat.warnings) dong.push('⚠ ' + m.message);

  dong.push('Không ai bị xoá khỏi gia phả. Chuyển nhầm thì chuyển ngược lại, và ' +
            'nếu cặp cũ đã vào thùng rác thì lấy nó ra trước.');
  return dong;
}

async function chayChuyenCon(unionId, conId, capMoi, xuLy, chan) {
  if (dangLuu || !chuyenHT) return;

  const tenCon = tenNguoi(conId);
  const tenMoi = keTenPartner(capMoi);

  dangLuu = true;
  if (nutLuu) { nutLuu.disabled = true; nutLuu.style.opacity = '.45'; }
  hienNhan('Đang chuyển…', false);

  const ketQua = await ghiBanGhi(null, [chuyenHT.unionNguon, chuyenHT.unionDich], {
    action: 'update',
    target: capMoi,
    note:   'Chuyển ' + tenCon + ' từ cặp ' + unionId + ' sang cặp ' + capMoi +
            (chuyenHT.nguonChet
              ? ' (cặp ' + unionId + ' hết lý do tồn tại, vào thùng rác)' : '') + '.',
    diff:   chuyenHT.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    if (nutLuu) { nutLuu.disabled = false; nutLuu.style.opacity = '1'; }
    hienLoiGhi(ketQua, tenCon + ' VẪN là con của cặp cũ.');
    return;
  }

  // Dọn hẳn hàng nút xác nhận đi, không chỉ bỏ tham chiếu `nutLuu`: cái nút đỏ
  // ấy vẫn nằm trên màn hình và vẫn bấm được, mà bấm lần thứ hai là ghi lần thứ
  // hai một việc đã xong.
  chuyenHT = null;
  nutLuu   = null;
  chan.innerHTML = '';

  if (xuLy.onDaLuu) xuLy.onDaLuu(conId);

  hienNhan('Đã chuyển ' + tenCon + ' sang gia đình của ' + tenMoi + '.', false);
  chan.append(nutChon('Xong', true, () => closePersonForm()));
}


// ============================================================
// SỬA THÔNG TIN GIA ĐÌNH — một màn hình cho MỌI quan hệ của một người
// ============================================================
//
// Chủ dự án, 22/08/2026, sau khi dùng thử: *"hiện tại rất khó sử dụng"*. Đường
// sửa quan hệ trước hôm nay là *thẻ người → Các việc khác → vòng tròn → Kết nối
// / Gỡ nối*, mà hai mục cuối lại hỏi từ phía MỘT CON NGƯỜI chứ không từ phía
// gia đình. Bốn cú chạm để tới, rồi vẫn phải tự dựng lại trong đầu xem người ấy
// đang đứng ở những nhà nào.
//
// Màn hình này trả lời đúng một câu: ***người này đứng ở những gia đình nào, và
// mỗi nhà có những ai?*** — rồi cho sửa ngay tại đó.
//
// --- SÁU quyết định --------------------------------------------------------
//
// 1. **HIỆN HẾT TRÊN MỘT MÀN, KHÔNG HỎI "GIA ĐÌNH NÀO" TRƯỚC** (chủ dự án chọn
//    22/08/2026). Mọi cặp người ấy dính tới đổ ra thành từng khối, cuộn xuống
//    sửa từng cái. Hỏi trước thì người dùng phải biết mình muốn sửa nhà nào
//    *trước khi* nhìn thấy các nhà — mà phần lớn lần mở màn hình này là để
//    nhìn cho ra chỗ đang sai.
//
// 2. **CHA/MẸ VÀ VỢ/CHỒNG LÀ CÙNG MỘT THAO TÁC.** Cả hai đều là `partners` của
//    một cặp; khác nhau chỉ ở chỗ ta nhìn cặp ấy từ phía nào — từ phía người
//    CON thì hàng ấy đọc là *cha/mẹ*, từ phía người VỢ thì đọc là *chồng*. Nhờ
//    thế cả màn hình này chỉ cần MỘT bộ quy tắc (`xetNguoiVaoCap`) chứ không
//    phải hai bộ trôi lệch nhau.
//
// 3. **KHÔNG CÓ NÚT LƯU.** Mỗi việc tự đi xuống Drive ngay, có hộp xác nhận kể
//    hậu quả của riêng nó. Gom năm việc vào một nút Lưu thì hộp hậu quả phải kể
//    năm chuyện chồng lên nhau — và một cái cặp có thể vừa được thêm người vừa
//    hết lý do tồn tại trong cùng một lượt. Đây là màn hình ĐIỀU HƯỚNG, không
//    phải một cái form.
//
// 4. **CẢ DÒNG LÀ MỘT ĐÍCH CHẠM**, mở ra một hộp vài việc — không nhét nút
//    *[đổi]* vào cạnh cái tên. Hai đích chạm sát nhau trong một dòng cao 44px
//    là mời bấm nhầm; luật đã chốt ở `pages/person-list.js`, nhắc lại ở
//    `nutXemGiaDinh` và ở khối *Sửa một người con*.
//
// 5. **HÀNG CON GỌI THẲNG VÀO `moHopViecCon`** của nửa sau việc 8, không viết
//    lại. Ở đó đã có đủ đổi quan hệ · chuyển sang nhà khác · gỡ khỏi cặp.
//
// 6. **CHẶN CÁI KHÔNG THỂ, CẢNH BÁO CÁI LẠ** (chủ dự án chọn 22/08/2026). Danh
//    sách chọn người hiện ĐỦ MỌI NGƯỜI, kèm dấu ⛔ hoặc ⚠ ngay trên dòng. Lọc
//    sẵn cho khuất mắt thì người dùng chỉ thấy người mình cần biến mất khỏi
//    danh sách mà không hiểu vì sao — mất luôn cái dòng chữ giải thích.

/**
 * Mở màn hình *Sửa thông tin gia đình* của một người.
 *
 * @param {string} personId
 * @param {{onDaLuu?:function(string), onThemCon?:function(string),
 *          onKetNoi?:function(string), onSuaNguoi?:function(string),
 *          onChonNguoi?:function(string), onXemCap?:function(string)}} [xuLy]
 *        `onXemCap` — mở THẺ GIA ĐÌNH của một cặp. Từ 22/08/2026 đây là cửa
 *        DUY NHẤT đi thường ngày tới ngày cưới · ảnh cưới · ghi chú của cặp, và
 *        tới màn hình *Sắp thứ tự các con*: hai nút cũ trên thẻ NGƯỜI đã gỡ đi
 *        vì chúng nói lại đúng những điều màn hình này nói.
 */
export function openFamilyForm(personId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;

  closePersonForm();
  xuLyNgoai = xuLy || {};
  cheDo     = 'giaDinh';
  giaDinhCua = personId;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-gia-dinh';   // mốc cho bài kiểm hành vi
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sửa thông tin gia đình';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = tenNguoi(personId) + '  ·  ' + personId;
  phu.style.cssText =
    'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  hop.append(tieuDe, phu);

  const capChaMe = getParentUnions(index, personId);
  const capVo    = getPartnerUnions(index, personId);

  for (const u of capChaMe) hop.append(veKhoiChaMe(u, personId, xuLy));
  for (const u of capVo)    hop.append(veKhoiVoChong(u, personId, xuLy));

  if (capChaMe.length === 0) hop.append(veKhoiChuaCoChaMe(personId, xuLy));
  if (capVo.length === 0)    hop.append(veKhoiChuaCoVoChong(personId, xuLy));

  khoiKetQua = document.createElement('div');
  hop.append(khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  chan.append(nutChon('Xong', true, () => closePersonForm()));
  hop.append(chan);

  lopPhu.append(hop);
  document.body.append(lopPhu);
}

/** Mở lại chính màn hình này sau khi một việc con vừa ghi xong. */
function moLaiFormGiaDinh(personId, xuLy) {
  closePersonForm();
  openFamilyForm(personId, xuLy);
}

// --- Các khối của màn hình ----------------------------------------------

function veNhanKhoiGD(chu, phu) {
  const nhan = document.createElement('div');
  nhan.style.cssText =
    'margin-top:18px;margin-bottom:6px;padding-bottom:4px;' +
    'border-bottom:1px solid #f0ebe4';

  const t = document.createElement('div');
  t.textContent = chu;
  t.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078';
  nhan.append(t);

  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText = 'font-size:11px;color:#b3aaa0;margin-top:2px';
    nhan.append(d);
  }
  return nhan;
}

/**
 * Một dòng người trong màn hình này. CẢ DÒNG là một đích chạm — quyết định 4.
 *
 * @param {string} vai   chữ đứng trước tên: 'Cha' · 'Vợ' · 'Con'…
 * @param {string} id    mã người, hoặc rỗng khi đây là một CHỖ TRỐNG
 * @param {string} [chuChinh]  đè lên dòng chữ lớn, thay cho tên người.
 *        Dùng cho hàng *Quan hệ*: ở đó `id` là CHÍNH CHỦ của màn hình, mà tên
 *        họ đã nằm ngay trên đầu — in lại lần nữa là ba dòng để nói một chữ
 *        (thấy trên ảnh `fg-1.png`). `id` vẫn phải truyền vào vì dòng ấy cần
 *        biết bấm vào thì mở việc của AI.
 */
function veDongNguoi(vai, id, ghiChu, chay, chuChinh) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.vai = vai;
  nut.dataset.nguoi = id || '';
  nut.style.cssText =
    'display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;' +
    'padding:9px 11px;margin-top:6px;font-family:inherit;font-size:14px;' +
    'border-radius:8px;cursor:pointer;touch-action:manipulation;' +
    (id
      ? 'color:#2a2622;border:1px solid #e6e0d8;background:#fff'
      : 'color:#8a8078;border:1px dashed #e6e0d8;background:none');

  const nhan = document.createElement('span');
  nhan.textContent = vai;
  nhan.style.cssText =
    'flex:0 0 62px;font-size:12px;color:#8a8078;letter-spacing:.03em';
  nut.append(nhan);

  const cot = document.createElement('span');
  cot.style.cssText = 'flex:1 1 auto;min-width:0';

  const ten = document.createElement('span');
  ten.style.cssText = 'display:block';
  ten.textContent = coGiaTri(chuChinh) ? chuChinh
    : (id ? tenNguoi(id) : '(chưa có — bấm để chọn)');
  cot.append(ten);

  if (coGiaTri(ghiChu)) {
    const d = document.createElement('span');
    d.textContent = ghiChu;
    d.style.cssText = 'display:block;font-size:12px;color:#8a8078;margin-top:2px';
    cot.append(d);
  }

  nut.append(cot);
  nut.addEventListener('click', chay);
  return nut;
}

/** Nút gạch đứt một dòng, dùng cho *thêm con* và *chọn cha mẹ*. */
function nutGachDut(chu, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:9px 11px;margin-top:6px;' +
    'font-family:inherit;font-size:13px;color:#8a8078;border:1px dashed #e6e0d8;' +
    'border-radius:8px;background:none;cursor:pointer;touch-action:manipulation';
  nut.textContent = chu;
  nut.addEventListener('click', chay);
  return nut;
}

/**
 * Khối *LÀ CON của* — một cặp cha mẹ của người đang xem.
 *
 * ⚠ Người đang xem KHÔNG có mặt trong khối này với tư cách con: họ là chủ của
 * cả màn hình, tên họ đã nằm ở đầu. Nhưng ANH CHỊ EM thì có — nhìn ra mình
 * đứng thứ mấy trong nhà là một nửa lý do người ta mở màn hình này.
 */
function veKhoiChaMe(u, personId, xuLy) {
  const index = state.index;
  const boc = document.createElement('div');

  const cacChaMe = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && index.personById.has(id));

  boc.append(veNhanKhoiGD('LÀ CON của', keTenPartner(u.id) + '  ·  ' + u.id));

  for (const id of cacChaMe) {
    boc.append(veDongNguoi(vaiChaMe(id), id, doiSongNguoi(index.personById.get(id)),
      () => moHopViecNguoiTrongCap(u.id, id, personId, xuLy)));
  }

  // Chỗ trống: cặp cha mẹ mới có một người.
  if (cacChaMe.length < 2) {
    boc.append(veDongNguoi(vaiConThieu(cacChaMe), '', '',
      () => moHopChonNguoiVaoCap(u.id, '', personId, xuLy)));
  }

  // Quan hệ của CHÍNH người đang xem với cặp cha mẹ này.
  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === personId);
  const qh = (muc && muc.relation) || 'birth';
  boc.append(veDongNguoi('Quan hệ', personId, '',
    () => moHopViecCon(u.id, personId, xuLyCon(personId, xuLy)),
    nhanQuanHeCon(qh, 'con')));

  // Anh chị em — đọc được, bấm được, nhưng KHÔNG lẫn vào hàng cha mẹ.
  const anhEm = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && c.personId !== personId &&
                   index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  for (const c of anhEm) {
    boc.append(veDongNguoi('Anh / em', c.personId,
      [chuThichQuanHe(c.relation || 'birth', 'con'),
       doiSongNguoi(index.personById.get(c.personId))].filter(coGiaTri).join('  ·  '),
      () => moHopViecCon(u.id, c.personId, xuLyCon(personId, xuLy))));
  }

  boc.append(...nutTheCap(u, xuLy));
  return boc;
}

/** Khối *LÀ VỢ / CHỒNG* — một gia đình mà chính người đang xem lập ra. */
function veKhoiVoChong(u, personId, xuLy) {
  const index = state.index;
  const boc = document.createElement('div');

  const kia = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== personId && index.personById.has(id));

  boc.append(veNhanKhoiGD('LÀ ' + vaiCuaMinh(personId).toUpperCase() + ' trong',
                          keTenPartner(u.id) + '  ·  ' + u.id));

  for (const id of kia) {
    boc.append(veDongNguoi(vaiBanDoi(id), id, doiSongNguoi(index.personById.get(id)),
      () => moHopViecNguoiTrongCap(u.id, id, personId, xuLy)));
  }

  if (kia.length === 0) {
    boc.append(veDongNguoi(vaiBanDoiThieu(personId), '', '',
      () => moHopChonNguoiVaoCap(u.id, '', personId, xuLy)));
  }

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  for (const c of cacCon) {
    boc.append(veDongNguoi('Con', c.personId,
      [chuThichQuanHe(c.relation || 'birth', 'con'),
       doiSongNguoi(index.personById.get(c.personId))].filter(coGiaTri).join('  ·  '),
      () => moHopViecCon(u.id, c.personId, xuLyCon(personId, xuLy))));
  }

  if (suaDuoc() && xuLy.onThemCon) {
    boc.append(nutGachDut('+ Thêm một người con vào gia đình này',
      () => { closePersonForm(); xuLy.onThemCon(u.id); }));
  }

  boc.append(...nutTheCap(u, xuLy));
  return boc;
}

/**
 * Cửa sang THẺ GIA ĐÌNH của một cặp — nơi có ngày cưới, ảnh cưới, ghi chú, và
 * nút *Sắp thứ tự các con*.
 *
 * ⚠ **Nút này gánh HAI đường vừa gỡ khỏi thẻ người** (22/08/2026), nên nó
 * KHÔNG được biến mất khi thiếu quyền sửa: thẻ gia đình là màn hình ĐỌC, và
 * ngày cưới là thứ người chỉ có quyền xem vẫn phải xem được.
 *
 * ⚠ Và nó là cửa nhìn thấy được của cử chỉ CHẠM GIỮ trên ô sơ đồ (luật chat
 * 1.6). Bỏ nó đi là để *Sắp thứ tự các con* chỉ còn tới được bằng một cử chỉ
 * mà không chỗ nào trên màn hình nói ra rằng nó tồn tại.
 *
 * @returns {HTMLElement[]} rỗng khi nơi gọi không nhận việc này — không mọc ra
 *          nút chết nào.
 */
function nutTheCap(u, xuLy) {
  if (!xuLy || !xuLy.onXemCap) return [];

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;

  return [nutGachDut(
    soCon >= 2
      ? 'Ngày cưới · ảnh cưới · sắp thứ tự các con →'
      : 'Ngày cưới · ảnh cưới · ghi chú của gia đình này →',
    () => { closePersonForm(); xuLy.onXemCap(u.id); })];
}

function veKhoiChuaCoChaMe(personId, xuLy) {
  const boc = document.createElement('div');
  boc.append(veNhanKhoiGD('LÀ CON của', 'chưa nối với cha mẹ nào'));

  const d = document.createElement('div');
  d.textContent = tenNguoi(personId) + ' chưa có cha mẹ trong gia phả.';
  d.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
  boc.append(d);

  if (suaDuoc() && xuLy.onKetNoi) {
    boc.append(nutGachDut('+ Chọn cha mẹ cho ' + tenNguoi(personId),
      () => { closePersonForm(); xuLy.onKetNoi(personId); }));
  }
  return boc;
}

function veKhoiChuaCoVoChong(personId, xuLy) {
  const boc = document.createElement('div');
  boc.append(veNhanKhoiGD('GIA ĐÌNH RIÊNG', 'chưa lập gia đình nào'));

  const d = document.createElement('div');
  d.textContent = tenNguoi(personId) + ' chưa đứng trong cặp vợ chồng nào, nên ' +
                  'chưa có nhà riêng để ghi con cái.';
  d.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
  boc.append(d);

  if (suaDuoc() && xuLy.onKetNoi) {
    boc.append(nutGachDut('+ Chọn vợ / chồng cho ' + tenNguoi(personId),
      () => { closePersonForm(); xuLy.onKetNoi(personId); }));
  }
  return boc;
}

/**
 * Bộ xử lý truyền xuống các việc của MỘT NGƯỜI CON: ghi xong thì quay lại
 * chính màn hình này, không rơi ra sơ đồ trống.
 */
function xuLyCon(personId, xuLy) {
  return Object.assign({}, xuLy, {
    onDaLuu: (id) => {
      if (xuLy.onDaLuu) xuLy.onDaLuu(id);
      moLaiFormGiaDinh(personId, xuLy);
    },
  });
}

// --- Đọc VAI ra chữ ------------------------------------------------------
//
// ⚠ Giới tính KHÔNG rõ thì ghi cả hai vai, không đoán. Ghi bừa "Cha" cho một
// người chưa rõ giới là app tự bịa một sự thật mà gia phả không chép.

function vaiChaMe(id) {
  const p = state.index && state.index.personById.get(id);
  const s = p && p.sex;
  return s === 'M' ? 'Cha' : (s === 'F' ? 'Mẹ' : 'Cha / mẹ');
}

function vaiBanDoi(id) {
  const p = state.index && state.index.personById.get(id);
  const s = p && p.sex;
  return s === 'M' ? 'Chồng' : (s === 'F' ? 'Vợ' : 'Vợ / chồng');
}

/** Vai của CHÍNH người đang xem trong gia đình riêng của họ. */
function vaiCuaMinh(personId) {
  const p = state.index && state.index.personById.get(personId);
  const s = p && p.sex;
  return s === 'M' ? 'Chồng' : (s === 'F' ? 'Vợ' : 'Vợ / chồng');
}

/** Chỗ trống trong cặp CHA MẸ: đoán theo người đã có, không đoán theo con. */
function vaiConThieu(daCo) {
  if (daCo.length === 0) return 'Cha / mẹ';
  const p = state.index.personById.get(daCo[0]);
  const s = p && p.sex;
  return s === 'M' ? 'Mẹ' : (s === 'F' ? 'Cha' : 'Cha / mẹ');
}

/** Chỗ trống bên cạnh chính mình. */
function vaiBanDoiThieu(personId) {
  const p = state.index && state.index.personById.get(personId);
  const s = p && p.sex;
  return s === 'M' ? 'Vợ' : (s === 'F' ? 'Chồng' : 'Vợ / chồng');
}


// --- BA VIỆC với một người ở hàng vợ/chồng --------------------------------

/**
 * @param {string} unionId
 * @param {string} nguoiId   người đang đứng ở hàng ấy
 * @param {string} personId  chủ của màn hình, để quay về đúng chỗ
 */
function moHopViecNguoiTrongCap(unionId, nguoiId, personId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u || !index.personById.has(nguoiId)) return;

  const laChaMe = (Array.isArray(u.children) ? u.children : [])
    .some((c) => c && c.personId === personId);
  const vai = laChaMe ? vaiChaMe(nguoiId) : vaiBanDoi(nguoiId);

  const cacMuc = [];

  if (suaDuoc()) {
    cacMuc.push({
      ma:  'doi',
      chu: 'Đổi sang người khác',
      phu: 'Bỏ ' + tenNguoi(nguoiId) + ' ra và đưa người khác vào đúng chỗ ấy, ' +
           'trong CÙNG một lần lưu.',
      chay: () => moHopChonNguoiVaoCap(unionId, nguoiId, personId, xuLy),
    });
  }

  if (xuLy.onSuaNguoi) {
    cacMuc.push({
      ma:  'ho-so',
      chu: 'Mở hồ sơ của ' + tenNguoi(nguoiId),
      phu: 'Sửa tên, ngày sinh, ảnh — những thứ của riêng một con người.',
      chay: () => { closePersonForm(); xuLy.onSuaNguoi(nguoiId); },
    });
  }

  if (suaDuoc()) {
    const conLai = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => id && id !== nguoiId && index.personById.has(id));

    cacMuc.push({
      ma:  'bo',
      chu: 'Bỏ ' + tenNguoi(nguoiId) + ' khỏi gia đình này',
      phu: tenNguoi(nguoiId) + ' KHÔNG bị xoá khỏi gia phả — chỉ thôi đứng ở ' +
           'gia đình này.',
      nguyHiem: true,
      // Cặp còn người khác thì gỡ đúng người ấy ra khỏi hàng vợ/chồng. Cặp chỉ
      // có mình họ thì thứ mất đi là cả MỐI NỐI CHA MẸ của người đang xem —
      // luật 9, và `unlink` đã có sẵn cả hai đường.
      chay: () => (conLai.length > 0
        ? unlink(conLai[0], nguoiId, 'spouse',
                 Object.assign({}, xuLy, { unionId, onDaLuu: veLaiSauKhiGhi(personId, xuLy) }))
        : unlink(personId, '', 'parent',
                 Object.assign({}, xuLy, { unionId, onDaLuu: veLaiSauKhiGhi(personId, xuLy) }))),
    });
  }

  if (cacMuc.length === 0) {
    moHopBao(vai + ': ' + tenNguoi(nguoiId),
             'Bạn chỉ có quyền xem gia phả nên chưa sửa được gì ở đây.', false);
    return;
  }

  moHopChon('chon', xuLy, {
    tieuDe: vai + ': ' + tenNguoi(nguoiId),
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Làm gì với ' + tenNguoi(nguoiId) + ' trong gia đình này?',
    cacMuc,
  });
}

/** Ghi xong thì quay lại đúng màn hình gia đình vừa đứng, không rơi ra sơ đồ. */
function veLaiSauKhiGhi(personId, xuLy) {
  return (id) => {
    if (xuLy.onDaLuu) xuLy.onDaLuu(id);
    moLaiFormGiaDinh(personId, xuLy);
  };
}

// --- QUY TẮC: chặn cái không thể, cảnh báo cái lạ -------------------------

/**
 * Đưa `ungVienId` vào hàng vợ/chồng của cặp `unionId` thì có được không?
 *
 * @param {string} boQuaId  người sắp bị BỎ RA khỏi cặp trong cùng lượt ấy —
 *        khi đang *đổi người*. Không tính họ vào chỗ đang chiếm, nếu không thì
 *        mọi cặp đủ hai người đều báo "đã đủ hai người" và không đổi được ai.
 * @returns {{muc:'khoa'|'canhbao'|'duoc', lyDo:string[]}}
 *
 * --- Vì sao MỘT hàm cho cả cha/mẹ lẫn vợ/chồng ---------------------------
 *
 * Quyết định 2 ở đầu mục: hai vai ấy là CÙNG MỘT thao tác trên dữ liệu —
 * `addPartner` vào `union.partners`. Ai bước vào hàng vợ/chồng của một cặp thì
 * ĐỒNG THỜI thành cha/mẹ của mọi người con đang đứng dưới cặp ấy, bất kể ta gọi
 * hàng ấy là gì trên màn hình. Viết hai hàm là tới ngày một hàm được vá còn hàm
 * kia không.
 *
 * --- Vì sao KHÔNG dựng lại cây cho từng ứng viên -------------------------
 *
 * `checkNoAncestorCycle` và `checkParentAge` đều nhận `index` HIỆN TẠI cộng hai
 * mã người, và trả lời đúng câu *"nối hai người này thì sao"* — chúng được viết
 * cho đúng việc ấy (xem ghi chú của chính hai hàm). Dựng một cây mới cho mỗi
 * người trong danh sách sáu chục người là làm sáu chục lần `buildIndex` để
 * nhận về cùng một câu trả lời.
 *
 * ⚠ Phép lệch tuổi VỢ CHỒNG không có mặt ở đây, và đó là cố ý:
 * `checkSpouseAgeGap` đọc một cặp ĐÃ CÓ cả hai người, nên nó chỉ chạy được ở
 * hộp XÁC NHẬN, nơi cây đã dựng xong. Ở đó nó chạy thật — xem `doHauQuaDoiNguoi`.
 */
function xetNguoiVaoCap(unionId, ungVienId, boQuaId) {
  const index = state.index;
  const ra = { muc: 'duoc', lyDo: [] };
  const u = index && index.unionById.get(unionId);
  if (!u) return { muc: 'khoa', lyDo: ['Không tìm thấy gia đình này nữa.'] };

  const khoa    = (chu) => { ra.muc = 'khoa'; ra.lyDo.push(chu); };
  const canhBao = (chu) => { if (ra.muc !== 'khoa') ra.muc = 'canhbao'; ra.lyDo.push(chu); };

  const dangCo = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== boQuaId && index.personById.has(id));

  if (dangCo.indexOf(ungVienId) >= 0) {
    khoa(tenNguoi(ungVienId) + ' đã đứng sẵn trong gia đình này.');
  }
  if (dangCo.length >= 2) {
    khoa('Gia đình này đã đủ hai người. Trong gia phả này một người có nhiều ' +
         'đời vợ là NHIỀU GIA ĐÌNH, không phải một nhà ba người.');
  }

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .map((c) => c && c.personId)
    .filter((id) => id && index.personById.has(id));

  if (cacCon.indexOf(ungVienId) >= 0) {
    khoa(tenNguoi(ungVienId) + ' đang là CON của chính gia đình này — không ai ' +
         'vừa là con vừa là cha mẹ của một nhà.');
  }

  // Vào hàng vợ/chồng là ĐỒNG THỜI thành cha/mẹ của mọi người con của cặp.
  // Nên mọi phép rà cạnh cha–con phải chạy cho từng đứa.
  for (const conId of cacCon) {
    if (conId === ungVienId) continue;

    const v = checkNoAncestorCycle(index, conId, ungVienId);
    if (v && v.level === 'error') khoa(v.message);

    const t = checkParentAge(index, ungVienId, conId);
    if (t && t.level === 'error') khoa(t.message);
    else if (t && t.level === 'warning') canhBao(t.message);
  }

  return ra;
}

// --- HỘP CHỌN NGƯỜI, có ô tìm và có dấu ⛔ / ⚠ ---------------------------

/**
 * Chọn một người vào hàng vợ/chồng của một cặp.
 *
 * @param {string} nguoiCuId  rỗng = điền vào CHỖ TRỐNG; có = ĐỔI người ấy đi.
 *
 * ⚠ **Có Ô TÌM, khác mọi hộp chọn khác của file này.** Những hộp kia liệt kê
 * vài mối nối của một người — nhiều nhất là năm sáu dòng. Hộp này nhìn vào CẢ
 * GIA PHẢ, và ảnh `sc-2.png` của việc 8 đã cho thấy một danh sách sáu chục
 * dòng đọc ra sao trên màn hình điện thoại: không ai đọc, người ta cuộn đại.
 *
 * ⚠ **HIỆN ĐỦ MỌI NGƯỜI, kể cả người đang bị khoá** (chủ dự án chốt
 * 22/08/2026). Lọc cho khuất mắt thì người dùng chỉ thấy đúng người mình cần
 * biến mất khỏi danh sách, và mất luôn dòng chữ nói vì sao.
 */
function moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const chan = moHopTrang('chonNguoi', xuLy,
    nguoiCuId ? 'Đổi sang người khác' : 'Chọn người vào gia đình này',
    keTenPartner(unionId) + '  ·  ' + unionId);

  const dan = document.createElement('div');
  dan.textContent = nguoiCuId
    ? 'Ai vào thay ' + tenNguoi(nguoiCuId) + '?'
    : 'Ai đứng vào chỗ còn trống của gia đình này?';
  dan.style.cssText =
    'margin-top:14px;padding:9px 11px;font-size:12px;line-height:1.5;' +
    'border-radius:8px;color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4';
  khoiKetQua.append(dan);

  const nhac = document.createElement('div');
  nhac.textContent =
    '⛔ là không nối được — nối vào thì gia phả nói ra một điều không thể có ' +
    'thật. ⚠ là đáng xem lại, nhưng vẫn nối được: gia phả cũ có chuyện thật mà ' +
    'nghe như lỗi.';
  nhac.style.cssText =
    'margin-top:6px;padding:7px 10px;font-size:11px;line-height:1.5;' +
    'border-radius:8px;color:#5c554e;background:#faf8f5;border:1px solid #f0ebe4';
  khoiKetQua.append(nhac);

  const oTim = document.createElement('input');
  oTim.type = 'text';
  oTim.placeholder = 'Gõ tên để tìm…';
  oTim.setAttribute('aria-label', 'Tìm người');
  oTim.dataset.viec = 'tim-nguoi';
  oTim.style.cssText = KIEU_O + 'margin-top:10px';
  khoiKetQua.append(oTim);

  const day = document.createElement('div');
  day.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px';
  khoiKetQua.append(day);

  const demDong = document.createElement('div');
  demDong.style.cssText = 'font-size:11px;color:#b3aaa0;margin-top:8px';
  khoiKetQua.append(demDong);

  // Xét MỘT LẦN cho cả gia phả, không xét lại mỗi lần gõ một chữ: bộ quy tắc
  // không phụ thuộc vào chữ đang tìm, mà `checkNoAncestorCycle` thì có duyệt
  // đồ thị bên trong.
  const tatCa = [];
  for (const p of index.personById.values()) {
    if (!p || p.id === personId) continue;   // chính chủ màn hình
    tatCa.push({
      id:  p.id,
      ten: fullName(p),
      tim: removeDiacritics(fullName(p)).toLowerCase(),
      doi: doiSongNguoi(p),
      xet: xetNguoiVaoCap(unionId, p.id, nguoiCuId),
    });
  }
  // ⚠ **XẾP THEO TÊN, KHÔNG XẾP THEO HẠNG.** Bản đầu đẩy người bị ⛔ xuống
  // cuối danh sách cho "gọn mắt". Bài kiểm bắt được ngay: cộng với phép cắt 40
  // dòng bên dưới, người bị khoá RƠI HẲN ra khỏi tầm nhìn trên một gia phả 65
  // người — tức đúng cái "lọc cho khuất mắt" mà quyết định 6 vừa cấm, chỉ là
  // làm bằng một đường vòng. Người dùng đi tìm đúng người ấy sẽ kết luận là
  // gia phả không có họ, thay vì đọc được câu giải thích vì sao không nối được.
  //
  // Xếp theo abc thì thứ tự không nói gì về việc nối được hay không — mà đó
  // đúng là điều cái dấu ⛔ trên từng dòng phải nói, chứ không phải chỗ đứng.
  tatCa.sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));

  const veLaiDay = () => {
    day.innerHTML = '';
    const chu = removeDiacritics(oTim.value || '').toLowerCase().trim();
    const hop = chu === '' ? tatCa : tatCa.filter((m) => m.tim.indexOf(chu) >= 0);

    // ⚠ CẮT chỉ khi CHƯA GÕ GÌ. Đã gõ tên mà người mình vừa gõ vẫn bị ẩn là
    // vô lý — và số người khớp một chuỗi chữ thì luôn nhỏ.
    const CAT = chu === '' ? 40 : hop.length;

    for (const m of hop.slice(0, CAT)) day.append(veDongUngVien(m, () => {
      if (m.xet.muc === 'khoa') { moHopVaoLoi(unionId, nguoiCuId, personId, m, xuLy); return; }
      moHopXacNhanDoiNguoi(unionId, nguoiCuId, m.id, personId, xuLy);
    }));

    demDong.textContent = hop.length === 0
      ? 'Không có ai tên như thế trong gia phả.'
      : (hop.length > CAT
          ? 'Đang hiện ' + CAT + ' người đầu trong ' + hop.length +
            '. Gõ tên vào ô trên để tìm đúng người bạn cần.'
          : hop.length + ' người');
  };

  oTim.addEventListener('input', veLaiDay);
  veLaiDay();

  chan.append(nutChanXoa('Huỷ', false, () => closePersonForm()));
}

/** Một dòng ứng viên, mang sẵn dấu ⛔ hoặc ⚠ trên mặt nó. */
function veDongUngVien(m, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.muc = m.id;
  nut.dataset.xet = m.xet.muc;
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 12px;font-family:inherit;' +
    'font-size:14px;border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (m.xet.muc === 'khoa'
      ? 'color:#8a3a2a;border:1px solid #f0d8d0;background:#fbf0ec'
      : (m.xet.muc === 'canhbao'
          ? 'color:#2a2622;border:1px solid #e8dcc4;background:#fdfaf2'
          : 'color:#2a2622;border:1px solid #e6e0d8;background:#fff'));

  const d1 = document.createElement('div');
  d1.textContent = (m.xet.muc === 'khoa' ? '⛔  ' : (m.xet.muc === 'canhbao' ? '⚠  ' : '')) + m.ten;
  nut.append(d1);

  // ⚠ **CHỈ dòng ⛔ mới in LÝ DO ra ngay trên mặt nó.** Ảnh `fg-3.png` của bản
  // đầu cho thấy vì sao: cặp U0008 có một người con sinh 2015, nên gần như MỌI
  // người sinh trước 2000 trong gia phả đều lĩnh một dấu ⚠ kèm ba dòng chữ
  // *"khoảng 111 tuổi khi sinh…"*. Nửa danh sách vàng khè. Cảnh báo mà cái gì
  // cũng cảnh báo thì người dùng học đúng một điều: bỏ qua nó.
  //
  // Dấu ⚠ vẫn còn trên dòng — nó vẫn làm được việc của nó là *chậm tay người
  // ta lại*. Còn lý do thì không mất đi đâu cả: hộp XÁC NHẬN in đủ mọi lời của
  // bộ rà soát (`doiHT.raSoat.warnings` trong `cauKeDoiNguoi`), và đó mới là
  // lúc người ta cần đọc — lúc sắp bấm nút, không phải lúc đang lướt tìm tên.
  //
  // ⛔ thì ngược lại, và giữ nguyên: những dòng ấy ít, và lý do in sẵn là thứ
  // ngăn người ta bấm vào một cái không bao giờ nối được.
  const phu = [m.doi, m.xet.muc === 'khoa' ? (m.xet.lyDo[0] || '') : '']
    .filter(coGiaTri).join('  ·  ');
  if (coGiaTri(phu)) {
    const d2 = document.createElement('div');
    d2.textContent = phu;
    d2.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px;line-height:1.4';
    nut.append(d2);
  }

  nut.addEventListener('click', chay);
  return nut;
}

/**
 * Bấm vào một người ĐANG BỊ KHOÁ. Không nối, nhưng phải nói ra vì sao.
 *
 * ⚠ Một dòng khoá vẫn BẤM ĐƯỢC, cố ý. Nút bấm vào không ăn gì cả là thứ làm
 * người ta tưởng app hỏng; còn một câu giải thích thì trả lời đúng cái điều họ
 * vừa hỏi bằng cú bấm ấy.
 */
function moHopVaoLoi(unionId, nguoiCuId, personId, m, xuLy) {
  const chan = moHopTrang('chon', xuLy, 'Không nối được',
                          m.ten + '  ·  ' + m.id);
  hienNhan('Không đưa ' + m.ten + ' vào ' + keTenPartner(unionId) + ' được:',
           true, m.xet.lyDo);
  chan.append(
    nutChanXoa('Chọn người khác', true,
               () => moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy)),
    nutChanXoa('Đóng', false, () => closePersonForm()));
}

// --- XÁC NHẬN và GHI -----------------------------------------------------

function moHopXacNhanDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy) {
  const chan = moHopTrang('doiNguoi', xuLy,
    nguoiCuId ? 'Đổi sang người khác' : 'Thêm người vào gia đình',
    tenNguoi(ungVienId) + '  ·  ' + ungVienId);

  // Luật 8: dựng cây đã đổi NGAY BÂY GIỜ, đọc hậu quả từ chính nó, rồi giữ đúng
  // bản ghi ấy để lát nữa ghi xuống.
  doiHT = doHauQuaDoiNguoi(unionId, nguoiCuId, ungVienId);

  const canTro = canTroLuu();
  if (canTro || !doiHT) {
    hienNhan(canTro || 'Không dựng được bản ghi sau khi đổi. Có thể gia phả vừa ' +
             'thay đổi. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (!doiHT.raSoat.canSave) {
    hienNhan('Chưa nối được — có chỗ không thể đúng được:', true,
             doiHT.raSoat.errors.map((x) => x.message));
    chan.append(
      nutChanXoa('Chọn người khác', true,
                 () => moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy)),
      nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Đổi xong thì:', false,
           cauKeDoiNguoi(unionId, nguoiCuId, ungVienId));

  nutLuu = nutChanXoa(nguoiCuId ? 'Đổi người' : 'Thêm vào gia đình', true,
    () => chayDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy, chan));
  chan.append(nutLuu, nutChanXoa('Thôi', false, () => closePersonForm()));
}

/**
 * Dựng cây đã đổi, rồi đọc hậu quả bằng cách SO hai chỉ mục.
 *
 * ⚠ HAI hàm NỐI ĐUÔI: `removePartner` → `addPartner`. Chạy hàm sau trên cây CŨ
 * là mất việc của hàm trước.
 *
 * ⚠ Ở ĐÂY mới chạy `checkSpouseAgeGap` được — nó đọc một cặp đã có đủ hai
 * người, mà tới dòng này thì cây mới đã có. Hộp chọn phía trước không chạy nổi
 * phép ấy, và ghi chú của `xetNguoiVaoCap` nói rõ chỗ đó.
 */
function doHauQuaDoiNguoi(unionId, nguoiCuId, ungVienId) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu = index.unionById.get(unionId);
  if (!cu) return null;
  const banCu = JSON.parse(JSON.stringify(cu));

  let tree = state.tree;
  const diff = {};

  if (nguoiCuId) {
    const kqG = removePartner(tree, unionId, nguoiCuId);
    if (!kqG) return null;
    tree = kqG.tree;
    Object.assign(diff, kqG.diff);
  }

  const kqT = addPartner(tree, unionId, ungVienId);
  if (!kqT) return null;
  tree = kqT.tree;
  Object.assign(diff, kqT.diff);

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không đổi còn hơn đổi mù
  }

  const cacCon = (Array.isArray(banCu.children) ? banCu.children : [])
    .map((c) => c && c.personId)
    .filter((id) => id && indexMoi.personById.has(id));

  let raSoat = validateAll(tree, indexMoi, 'union', { unionId });
  for (const conId of cacCon) {
    raSoat = gopRaSoat(raSoat,
      validateAll(tree, indexMoi, 'child', { childId: conId, unionId }));
  }

  // Ai thành người đứng lẻ vì lần đổi này. Đúng MỘT bước từ cặp ấy, không phải
  // phép duyệt đồ thị nên không cần tập `visited`.
  const lienQuan = new Set([ungVienId]);
  if (nguoiCuId) lienQuan.add(nguoiCuId);
  for (const id of (Array.isArray(banCu.partners) ? banCu.partners : [])) {
    if (id) lienQuan.add(id);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  return { tree, union: kqT.union, diff, raSoat, thanhLe, cacCon };
}

/** Từng dòng hậu quả của đường ĐỔI NGƯỜI, viết cho người không lập trình đọc. */
function cauKeDoiNguoi(unionId, nguoiCuId, ungVienId) {
  const B = tenNguoi(ungVienId);
  const dong = [];

  if (nguoiCuId) {
    dong.push(tenNguoi(nguoiCuId) + ' thôi đứng trong ' + keTenPartner(unionId) +
              '  ·  ' + unionId + ', và ' + B + ' đứng vào đúng chỗ ấy. Cả hai ' +
              'bản ghi người vẫn còn nguyên, không ai bị xoá.');
  } else {
    dong.push(B + ' đứng vào chỗ còn trống của ' + keTenPartner(unionId) +
              '  ·  ' + unionId + '.');
  }

  if (doiHT.cacCon.length > 0) {
    dong.push('⚠ Gia đình này đang có ' + doiHT.cacCon.length + ' người con (' +
              doiHT.cacCon.map(tenNguoi).join(' · ') + '), nên ' + B +
              ' ĐỒNG THỜI thành cha/mẹ của họ. Trong gia phả này quan hệ cha mẹ ' +
              '– con đi QUA cặp, không nối thẳng người với người.');
    if (nguoiCuId) {
      dong.push('⚠ Và ' + tenNguoi(nguoiCuId) + ' đồng thời THÔI làm cha/mẹ của ' +
                'những người con ấy, cùng một lý do.');
    }
  }

  if (doiHT.thanhLe.length > 0) {
    dong.push('⚠ Sau việc này ' + doiHT.thanhLe.map(tenNguoi).join(' · ') +
              ' không còn nối với ai trong gia phả. Họ vẫn còn nguyên trong sổ, ' +
              'nhưng sơ đồ vẽ họ đứng lẻ một mình.');
  }

  for (const m of doiHT.raSoat.warnings) dong.push('⚠ ' + m.message);

  dong.push('Không ai bị xoá khỏi gia phả. Đổi nhầm thì đổi ngược lại.');
  return dong;
}

async function chayDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy, chan) {
  if (dangLuu || !doiHT) return;

  const B = tenNguoi(ungVienId);
  dangLuu = true;
  if (nutLuu) { nutLuu.disabled = true; nutLuu.style.opacity = '.45'; }
  hienNhan('Đang ghi…', false);

  const ketQua = await ghiBanGhi(null, [doiHT.union], {
    action: 'update',
    target: unionId,
    note:   (nguoiCuId
              ? 'Đổi ' + tenNguoi(nguoiCuId) + ' thành ' + B + ' trong cặp ' + unionId
              : 'Thêm ' + B + ' vào cặp ' + unionId) + '.',
    diff:   doiHT.diff,
  });

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    if (nutLuu) { nutLuu.disabled = false; nutLuu.style.opacity = '1'; }
    hienLoiGhi(ketQua, 'Gia đình này VẪN như cũ.');
    return;
  }

  // Dọn hẳn hàng nút đi, không chỉ bỏ tham chiếu `nutLuu`: nút cũ vẫn nằm trên
  // màn hình và vẫn bấm được, mà bấm lần hai là ghi lần hai một việc đã xong.
  doiHT  = null;
  nutLuu = null;
  chan.innerHTML = '';

  if (xuLy.onDaLuu) xuLy.onDaLuu(personId);

  hienNhan('Xong. ' + B + ' nay đứng trong ' + keTenPartner(unionId) + '.', false);
  chan.append(nutChon('Về màn hình gia đình', true,
                      () => moLaiFormGiaDinh(personId, xuLy)));
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
  // Nhãn là "Xếp theo tuổi", KHÔNG phải "Xếp thử theo tuổi" (chủ dự án chốt
  // 21/08/2026). Bản đầu nhét chữ *thử* lên mặt nút để nói trước rằng nó không
  // ghi ngay; chữ ấy làm nhãn dài ra mà việc cảnh báo thì đã có hai thứ khác
  // gánh, cả hai đều rõ hơn: nút *Xong* nằm ngay dưới, và câu nhắc hiện ra
  // NGAY SAU cú bấm nói thẳng "bấm Xong mới ghi".
  hangPhu.append(nutChon('Xếp theo tuổi', false, sapTheoTuoi));
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
 * Xếp lại các thẻ theo tuổi. KHÔNG ghi gì — chỉ đổi chỗ các thẻ trong hộp,
 * phải bấm *Xong* mới xuống Drive.
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

// ============================================================
// DỌN THÙNG RÁC — XOÁ THẬT (việc 6B)
// ============================================================
//
// --- Vì sao chỉ có ĐÚNG MỘT CỬA ------------------------------------------
//
// Yêu cầu *"cần có chức năng xoá thật, nếu không sau này db sẽ tràn ngập rác"*
// đi ngược một luật đã chốt từ đầu dự án: *không xoá cứng, xoá là đặt cờ*.
// Hai thứ hoà được, và cách hoà quyết định toàn bộ chỗ đứng của mã dưới đây:
//
//   > Đường xoá THƯỜNG giữ nguyên xoá mềm. Xoá thật CHỈ có một cửa: nút
//   > *Dọn thùng rác* trong chính màn hình Thùng rác.
//
// Người bấm *"Xoá khỏi gia phả"* giữa lúc đang xem sơ đồ KHÔNG ở tâm thế dọn
// dẹp — họ đang sửa một bản ghi. Đặt một thao tác không lùi được vào giữa dòng
// công việc bình thường là cách chắc chắn nhất để có ngày mất dữ liệu thật.
//
// --- BỐN BƯỚC, KHÔNG ĐẢO THỨ TỰ ------------------------------------------
//
//   1. Sao lưu TRƯỚC       — MÁY CHỦ làm, không hỏi, và với lệnh này nó là
//                            ĐIỀU KIỆN: không cất được bản cũ thì không dọn
//   2. Gỡ mã khỏi unions   — `applyPurge`, hàm thuần
//   3. Xoá bản ghi         — cùng `applyPurge`, cùng một lần `luuCay`
//   4. Xoá FILE ẢNH Drive  — SAU khi máy chủ đã gật, không bao giờ trước
//
// ⚠ Bước 4 phải đứng sau bước 3, và đây là chỗ dễ làm ngược nhất. Xoá file
// trước rồi lần ghi hỏng thì ảnh mất mà bản ghi vẫn còn trỏ vào nó — hỏng theo
// kiểu tệ nhất, vì màn hình vẫn nói mọi thứ bình thường.

/**
 * Hộp xác nhận dọn thùng rác. Nói ra CON SỐ trước khi người dùng bấm.
 *
 * @param {{onDaLuu?:function()}} [xuLy]
 */
export function donThungRac(xuLy = {}, chiNhung = null) {
  if (!state.tree) {
    moHopBao('Chưa mở được gia phả',
             'Chưa nạp được gia phả nên chưa dọn được gì. Tải lại trang rồi thử lại.',
             true);
    return;
  }

  const ke = planPurge(state.tree, chiNhung);
  if (ke.trong) {
    moHopBao('Không có gì để xoá',
             Array.isArray(chiNhung)
               ? 'Những dòng vừa chọn không còn nằm trong thùng rác — có thể ' +
                 'người khác vừa dọn. Tải lại trang rồi mở lại thùng rác.'
               : 'Thùng rác trống. Nó chỉ chứa thứ đã bị xoá, mà hiện chưa có ' +
                 'bản ghi nào mang cờ ấy.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy,
                          Array.isArray(chiNhung) ? 'Xoá vĩnh viễn' : 'Dọn cả thùng rác',
                          'Xoá vĩnh viễn  ·  ' + moTaKePurge(ke));
  hienNhan('Xoá vĩnh viễn ' + moTaKePurge(ke) + '. KHÔNG hoàn tác được từ ' +
           'trong app.', true, cauKeKhiDonRac(ke));

  chan.append(
    nutChanXoa('Xoá vĩnh viễn', true, () => chayDonThungRac(xuLy, chiNhung)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Những gì người dùng phải biết TRƯỚC khi bấm. **BỐN dòng, không hơn.**
 *
 * Kể TÊN chứ không chỉ kể số. Người ta nhớ mình vừa xoá ai, không nhớ mình vừa
 * xoá mấy bản ghi — và cái tên là thứ duy nhất cho họ nhận ra mình đang sắp
 * xoá nhầm.
 *
 * ⚠ CON SỐ BỐN LÀ MỘT RÀNG BUỘC BỐ CỤC, KHÔNG PHẢI SỞ THÍCH. Bản đầu của hàm
 * này kể SÁU dòng, mỗi ý một dòng — đọc mã thì thấy đầy đủ và chu đáo. Ảnh
 * chụp khung 390px cho thấy sáu dòng ấy đẩy nút *Xoá vĩnh viễn* xuống quá mép
 * dưới: người dùng phải cuộn đi tìm nút, và người đi tìm nút thì không đọc
 * dòng nào cả. Tức là hộp càng kể kỹ thì càng ít người đọc — đúng ngược lại
 * điều nó sinh ra để làm.
 *
 * Nên ba cặp ý được gộp lại: cặp phải gỡ + cặp thành thừa, file ảnh + ảnh mất
 * theo chủ. Thêm ý mới vào đây thì phải gộp bớt chỗ khác, và **chụp lại
 * `xem-don-rac.mjs` mà nhìn**, không kết luận bằng cách đọc mã.
 */
function cauKeKhiDonRac(ke) {
  const ra = [];

  if (ke.personIds.length > 0) {
    const ten = ke.personIds.slice(0, 4)
      .map((id) => tenTrongCay(state.tree, id) || id);
    ra.push(ten.join(', ') +
            (ke.personIds.length > 4 ? ' và ' + (ke.personIds.length - 4) + ' người nữa' : '') +
            '.');
  }

  if (ke.capPhaiGo.length > 0) {
    ra.push(ke.capPhaiGo.length + ' cặp còn trong gia phả đang giữ mã của họ; ' +
            'mã ấy được gỡ đi, sơ đồ không đổi.' +
            (ke.capHetLyDo.length > 0
              ? ' ' + ke.capHetLyDo.length + ' cặp thành cặp thừa (' +
                ke.capHetLyDo.join(', ') + ') — dọn nốt ở màn hình Rà soát.'
              : ''));
  }

  if (ke.fileIds.length > 0) {
    ra.push(ke.fileIds.length + ' file ảnh vào thùng rác Drive, nằm đó thêm 30 ngày.' +
            (ke.anhLacChu.length > 0
              ? ' ' + ke.anhLacChu.length + ' tấm mất theo chủ, dù chưa ai gỡ.'
              : ''));
  }

  ra.push('Máy chủ tự cất bản sao lưu trước khi xoá. Không cất được thì không dọn.');
  return ra;
}

async function chayDonThungRac(xuLy, chiNhung) {
  if (dangLuu) return;

  const ke = planPurge(state.tree, chiNhung);
  if (ke.trong) {
    hienNhan('Thùng rác vừa trống — có thể người khác đã dọn. Không còn gì để làm.',
             false);
    return;
  }

  dangLuu = true;
  hienNhan('Đang sao lưu rồi dọn…', false);

  // BƯỚC 2 + 3, trong MỘT lần lưu. `applyPurge` chạy lại trên BẢN NHÁP chứ
  // không dùng cây đã tính lúc mở hộp: bản nháp là bản mới nhất, và tính lại
  // trên chính nó là cách duy nhất để không ghi xuống một kết quả cũ. Người
  // khác vừa đổi gì thì dấu vân tay của `luuCay()` chặn cả lần ghi.
  let ketQua;
  try {
    ketQua = await luuCay((cay) => {
      const kq = applyPurge(cay, chiNhung);
      if (!kq) {
        throw new Error('Bản trên Drive không còn thứ nào trong số vừa chọn. ' +
                        'Tải lại trang rồi mở lại thùng rác.');
      }
      cay.persons = kq.tree.persons;
      cay.unions  = kq.tree.unions;
      cay.media   = kq.tree.media;
    }, {
      action: 'purge',
      target: '',
      note:   (Array.isArray(chiNhung) ? 'Thùng rác: xoá vĩnh viễn '
                                       : 'Dọn cả thùng rác: xoá vĩnh viễn ') +
              moTaKePurge(ke) + '.',
      diff:   { persons: [state.tree.persons.length, state.tree.persons.length - ke.personIds.length],
                unions:  [state.tree.unions.length,  state.tree.unions.length  - ke.unionIds.length] },
    });
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'CHƯA xoá gì cả — mọi thứ vẫn nằm nguyên trong thùng rác.');
    return;
  }

  // BƯỚC 4 — và chỉ tới đây mới được chạm vào file trên Drive.
  const anh = await donAnhTrenDrive(ke.fileIds);

  if (xuLy && xuLy.onDaLuu) xuLy.onDaLuu();
  if (!lopPhu) return;

  baoXongMotViec('Đã xoá vĩnh viễn ' + moTaKePurge(ke) + '.',
                 cauKetQuaDonRac(ketQua, ke, anh));
}

/**
 * Bước 4. Trả về `null` khi không có ảnh nào phải dọn — nơi gọi phải phân biệt
 * *"không có ảnh nào"* với *"có ảnh mà xoá hỏng"*.
 *
 * ⚠ Hỏng ở đây KHÔNG làm hỏng cả việc dọn. Bản ghi đã xoá xong và đã ghi
 * xuống Drive rồi; một file ảnh còn nằm lại chỉ tốn vài chục KB, còn báo đỏ
 * lên màn hình lúc này sẽ khiến người dùng tưởng cả lần dọn đã hỏng.
 */
async function donAnhTrenDrive(fileIds) {
  if (!fileIds || fileIds.length === 0) return null;
  try {
    return await xoaAnhThat(fileIds);
  } catch (e) {
    return { ok: false, soXoa: 0, soHong: fileIds.length,
             loi: e && e.message ? e.message : String(e) };
  }
}

/** Mấy dòng kể lại việc vừa xong. Bản sao lưu đứng đầu — nó là đường lùi. */
function cauKetQuaDonRac(ketQua, ke, anh) {
  const ra = [];

  if (ketQua && ketQua.saoLuu) {
    ra.push('Bản sao lưu trước khi xoá: ' + ketQua.saoLuu +
            ' — nằm trong thư mục Sao_luu trên Drive.');
  }

  if (anh === null) {
    // Không có ảnh nào: không kể ra hàng đó. Trường trống thì không vẽ.
  } else if (anh && anh.soHong === 0) {
    ra.push(anh.soXoa + ' file ảnh đã vào thùng rác Drive, giữ thêm 30 ngày.');
  } else if (anh) {
    ra.push(anh.soXoa + ' file ảnh đã vào thùng rác Drive; ' + anh.soHong +
            ' file không xoá được (có thể đã bị xoá tay từ trước). Bản ghi ' +
            'trong gia phả thì đã sạch — chỗ này chỉ còn là file thừa trên Drive.');
  }

  if (ke.capHetLyDo.length > 0) {
    ra.push('Còn ' + ke.capHetLyDo.length + ' cặp không còn lý do tồn tại. ' +
            'Mở Danh sách người → Rà soát để dọn nốt.');
  }
  return ra;
}

// ============================================================
// CHỌN NHIỀU DÒNG — khôi phục hàng loạt, và gom rác vào thùng rác (bước 38)
// ============================================================
//
// Thùng rác từ bước 38 làm việc theo lối quen thuộc của mọi thùng rác: **chọn
// một, chọn nhiều, hoặc chọn tất cả**, rồi mới quyết định *Khôi phục* hay *Xoá
// vĩnh viễn*. Hai hàm dưới đây là chỗ đến của hai nút ấy.
//
// ⚠ **Chọn ĐÚNG MỘT dòng thì đi lại đường cũ của bước 29**, chứ không dùng hộp
// gộp. Hộp cũ kể được những thứ hộp gộp không kể nổi: *"mọi cặp của người này
// cũng đang trong thùng rác, đưa mỗi họ trở lại thì sơ đồ vẫn chưa vẽ ra"*, hay
// *"3 người con sẽ có lại cha mẹ"*. Gộp hết vào một hộp chung là đánh đổi mất
// những câu ấy để lấy một nhánh mã ít hơn — đổi sai chiều.

/**
 * Đưa NHIỀU người và cặp trở lại gia phả trong MỘT lần lưu.
 *
 * @param {string[]} ids  mã người (`P…`) và mã cặp (`U…`) lẫn lộn
 * @param {{onDaLuu?:function()}} [xuLy]
 */
export function khoiPhucNhieu(ids, xuLy = {}) {
  const ds = locMaDaXoa(ids);
  if (ds.length === 0) {
    moHopBao('Không còn gì để đưa trở lại',
             'Những dòng vừa chọn không còn nằm trong thùng rác. Tải lại trang ' +
             'rồi mở lại thùng rác.', false);
    return;
  }

  // Một dòng thì trả về đúng hộp của bước 29 — xem ghi chú ở đầu khối.
  if (ds.length === 1) {
    if (ds[0][0] === 'U') khoiPhucCap(ds[0], xuLy);
    else                  khoiPhucNguoi(ds[0], xuLy);
    return;
  }

  const soNguoi = ds.filter((id) => id[0] !== 'U').length;
  const soCap   = ds.length - soNguoi;

  const chan = moHopTrang('chon', xuLy, 'Đưa trở lại gia phả', moTaSoLuong(soNguoi, soCap));
  hienNhan('Cả ' + ds.length + ' bản ghi sẽ hiện lại đúng chỗ cũ — xoá mềm ' +
           'không gỡ một mối nối nào, nên không có gì phải nối lại.',
           false, keTenVaiDong(ds));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayNhieuBanGhi(ds, xuLy, false)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Gom rác vào thùng rác: XOÁ MỀM nhiều bản ghi trong MỘT lần lưu.
 *
 * Đây là chỗ đến của nút *Cho vào thùng rác* ở màn hình Rà soát. Nó **không
 * xoá thật** — thùng rác mới là nơi quyết định điều đó, và đó chính là lý do
 * quy trình này an toàn: người dùng gom cả nắm rác bằng một cú bấm, rồi ngồi
 * xem lại từng dòng ở thùng rác trước khi xoá hẳn.
 *
 * @param {string[]} ids
 * @param {{onDaLuu?:function()}} [xuLy]
 */
export function chuyenVaoThungRac(ids, xuLy = {}) {
  const ds = locMaConSong(ids);
  if (ds.length === 0) {
    moHopBao('Không còn gì để cho vào thùng rác',
             'Những dòng vừa chọn đã nằm trong thùng rác, hoặc không còn trong ' +
             'gia phả. Bấm *Rà lại* để xem bản mới nhất.', false);
    return;
  }

  const soNguoi = ds.filter((id) => id[0] !== 'U').length;
  const soCap   = ds.length - soNguoi;

  const chan = moHopTrang('chon', xuLy, 'Cho vào thùng rác', moTaSoLuong(soNguoi, soCap));
  hienNhan('Xoá mềm: bản ghi vẫn nằm nguyên trong file, chỉ mang thêm một cái ' +
           'cờ, và sơ đồ thôi vẽ ra chúng. Lấy lại được bất cứ lúc nào từ ' +
           'thùng rác.', false,
           keTenVaiDong(ds).concat([
             'Muốn xoá hẳn thì vào thùng rác chọn rồi bấm Xoá vĩnh viễn — đó là ' +
             'cửa duy nhất xoá được thật.',
           ]));

  chan.append(
    nutChanDam('Cho vào thùng rác', () => chayNhieuBanGhi(ds, xuLy, true)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Lật cờ `deleted` cho cả loạt trong MỘT lần lưu — luật 4 của đường ghi.
 *
 * ⚠ Bốn hàm `softDelete*`/`restore*` đều trả về CÂY MỚI, nên phải nối đuôi
 * nhau: cây ra của bản ghi này là cây vào của bản ghi kế. Chạy từng cái trên
 * `cay` gốc rồi gán lần lượt thì chỉ bản ghi cuối cùng sống sót — mà máy chủ
 * vẫn gật, `revision` vẫn tăng, và màn hình vẫn báo "đã xong" cho một việc làm
 * được đúng một phần.
 *
 * @param {boolean} vaoThungRac  true = xoá mềm · false = đưa trở lại
 */
async function chayNhieuBanGhi(ds, xuLy, vaoThungRac) {
  if (dangLuu) return;

  dangLuu = true;
  hienNhan(vaoThungRac ? 'Đang cho vào thùng rác…' : 'Đang đưa trở lại…', false);

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  let ketQua;
  try {
    ketQua = await luuCay((cay) => {
      let t = cay;
      let daLam = 0;
      for (const id of ds) {
        const kq = id[0] === 'U'
          ? (vaoThungRac ? softDeleteUnion(t, id)  : restoreUnion(t, id))
          : (vaoThungRac ? softDeletePerson(t, id, { boi, luc })
                         : restorePerson(t, id, { boi, luc }));
        if (kq) { t = kq.tree; daLam++; }
      }
      if (daLam === 0) {
        throw new Error('Bản trên Drive không còn bản ghi nào trong số vừa chọn ' +
                        'ở đúng trạng thái ấy. Tải lại trang rồi làm lại.');
      }
      cay.persons = t.persons;
      cay.unions  = t.unions;
    }, {
      action: vaoThungRac ? 'delete' : 'restore',
      target: '',
      note:   (vaoThungRac ? 'Cho vào thùng rác ' : 'Đưa trở lại từ thùng rác ') +
              ds.length + ' bản ghi: ' + ds.join(' ') + '.',
      diff:   {},
    });
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  dangLuu = false;
  if (!lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, vaoThungRac
      ? 'CHƯA cho gì vào thùng rác cả.'
      : 'Mọi thứ VẪN đang nằm trong thùng rác.');
    return;
  }

  if (xuLy && xuLy.onDaLuu) xuLy.onDaLuu();
  baoXongMotViec(vaoThungRac
    ? 'Đã cho ' + ds.length + ' bản ghi vào thùng rác.'
    : 'Đã đưa ' + ds.length + ' bản ghi trở lại gia phả.');
}

/** Chỉ giữ mã đang MANG cờ `deleted` — thứ thùng rác làm việc trên đó. */
function locMaDaXoa(ids) {
  return locMa(ids, true);
}

/** Chỉ giữ mã đang CÒN trong gia phả — thứ màn hình Rà soát làm việc trên đó. */
function locMaConSong(ids) {
  return locMa(ids, false);
}

/**
 * ⚠ Đọc thẳng `state.tree`, KHÔNG đọc `state.index`: `buildIndex()` bỏ qua mọi
 * bản ghi mang cờ `deleted`, nên tra chỉ mục ở đây là luôn không thấy gì.
 */
function locMa(ids, mongDaXoa) {
  const ds = Array.isArray(ids) ? ids : [];
  return ds.filter((id) => {
    const x = id && id[0] === 'U' ? timCapTrongCay(id) : timNguoiTrongCay(id);
    return !!x && (x.deleted === true) === mongDaXoa;
  });
}

/** "3 người và 2 cặp" — trường trống thì không kể ra hàng đó. */
function moTaSoLuong(soNguoi, soCap) {
  const phan = [];
  if (soNguoi > 0) phan.push(soNguoi + ' người');
  if (soCap > 0)   phan.push(soCap + ' cặp');
  return phan.join(' và ');
}

/** Vài cái tên đầu, để người đọc nhận ra mình đang làm gì với ai. */
function keTenVaiDong(ds) {
  const ten = ds.slice(0, 4).map((id) => (id[0] === 'U'
    ? 'Cặp ' + id
    : (tenTrongCay(state.tree, id) || id)));
  return [ten.join(', ') +
          (ds.length > 4 ? ' và ' + (ds.length - 4) + ' bản ghi nữa' : '') + '.'];
}

/** Báo xong, và để lại đúng một nút Đóng — cùng khuôn với đường hoàn tác. */
function baoXongMotViec(cau, dong) {
  hienNhan(cau, false, dong);
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
