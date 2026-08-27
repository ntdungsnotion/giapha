// ============================================================
// giapha · js/pages/person-edit.js
// Vai trò  : Form thêm/sửa người, thêm quan hệ, SỬA QUAN HỆ ĐÃ CÓ;
//            + NỀN DÙNG CHUNG cho cả nhóm `form-*.js` (đang tách, xem
//            `tai-lieu/BAN-DO-TACH_V01.md`) và XUẤT LẠI mọi tên đã dời đi
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/form-{thung-rac,sap-thu-tu,go-noi,sua-con,gia-dinh,cap,
//            xoa,anh}.js, state,
//            domains/{person,union,validate,media,purge,render},
//            services/{repo,gas}, utils/{graph,text,date,image,avatar}, config
// Phiên bản: 1.37.0 · Cập nhật: 27/08/2026 22:15
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
//    `union.ranks` — nên không lần nào phải hỏi câu ấy.
//
//    Hệ quả: `status` và thứ bậc (qua `ranks`/`rankCua()`) bây giờ sửa được từ
//    HAI CỬA — form Sửa cặp (bước 29) và khối này. Được, và chỉ được vì cả hai
//    gọi ĐÚNG MỘT hàm `union.updateUnion()`. Chép logic so sánh sang đây là
//    dựng bản thứ hai, và hai bản sẽ trôi lệch nhau đúng như chín luật rà soát
//    sẽ trôi lệch nếu chép sang `Code.gs`.
//
//    ⚠ Thứ bậc SỬA Ở ĐÂY luôn khoá theo NGƯỜI ĐANG MỞ MÀN HÌNH này (`mocId`) —
//    xem `DAC-TA-RANK_V01.md`. Đây không phải hệ quả phụ, mà là chính lý do
//    lược đồ đổi từ `rank` sang `ranks`: "thứ mấy" chỉ có nghĩa từ MỘT phía.
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
//
// --- HỎI THỨ BẬC NGAY LÚC NHẬP: luật thứ mười hai (27/08/2026) ----------
//
// 12. CUỘC HÔN NHÂN THỨ HAI PHẢI ĐƯỢC HỎI, KHÔNG ĐƯỢC ĐOÁN — VÀ CHỈ HỎI KHI
//    NÓ LÀ THỨ HAI. Trước hôm nay mọi đường tạo cặp đều gọi
//    `createUnion(…, {})`, tức lặng lẽ ghi *"cặp thứ 1"* cho cả hai phía. Thêm
//    ông D làm chồng bà C — bà đã có một đời chồng — thì gia phả nhận một câu
//    sai mà không ai báo gì, và người dùng phải tự nhớ để vào sửa lại.
//
//    Nay ô ấy mọc ra ngay trong form / trong hộp Kết nối, nhưng **chỉ với người
//    ĐÃ đứng trong ít nhất một cặp khác**. Lấy vợ/chồng lần đầu thì không hỏi
//    gì cả: hỏi một câu chỉ có một câu trả lời là bắt người ta đọc rồi gõ lại
//    đúng con số app vừa điền — cùng lý lẽ đã dùng cho `chonCap()`.
//
//    ⚠ SỐ ĐIỀN SẴN LÀ GỢI Ý, KHÔNG PHẢI KẾT LUẬN. App điền *"số cặp đang có
//    + 1"* vì đó là ca thường gặp, nhưng ô để MỞ: gia phả cũ chép thứ bậc theo
//    lệ chứ không theo thứ tự nhập liệu — có nhà bà cưới sau vẫn là chính thất.
//
//    ⚠ HỎI THEO TỪNG NGƯỜI, VÀ CÓ THỂ HỎI HAI LẦN TRONG MỘT HỘP. Nối hai người
//    đều đã có cặp thì hộp mọc HAI ô, mỗi ô một cái mốc. Đó không phải giao
//    diện rườm rà mà là chính điều `ranks` sinh ra để chứa: *"vợ 1 / vợ 2"* của
//    ông A có thể là CÙNG THỜI (vợ cả / vợ thứ), còn *"chồng 1 / chồng 2"* của
//    bà C là NỐI TIẾP (hai đời chồng) — cùng một con số, hai nghĩa, và chỉ
//    chứa nổi cả hai khi con số gắn với NGƯỜI. Ví dụ A–B–C–D ở `KE-HOACH_V43`
//    là bài nghiệm thu của đúng chỗ này.
//
//    ⚠ GÕ SAI THÌ KHÔNG ĐOÁN HỘ, VÀ FORM PHẢI NÓI RA — cùng đúng luật của ô
//    Đời (bước 32). Ô để trống hay gõ chữ thì app ghi thứ 1 và kể ra điều đó
//    trong khối cảnh báo, chứ không lặng lẽ chọn một con số nào khác.

// ⚠ Nhập từ các file `form-*.js` đã tách ra: vòng nhập hai chiều, và nó CỐ Ý.
// Chạy được vì mọi lời gọi nằm trong thân hàm, không ở top-level — xem
// `tai-lieu/BAN-DO-TACH_V01.md` mục 7.
import { donDepSapThuTu } from './form-sap-thu-tu.js';
// `unlink` còn được hai cụm chưa tách (sửa con · gia đình) gọi tới — bỏ khỏi
// dòng này khi hai cụm ấy ra file riêng.
import { donDepGoNoi, unlink } from './form-go-noi.js';
import { donDepSuaCon } from './form-sua-con.js';
import { donDepGiaDinh } from './form-gia-dinh.js';
import { donDepCap, handleSaveUnion } from './form-cap.js';
import { donDepXoa, xoaNguoi } from './form-xoa.js';
import { donDepAnh, veKhoiAnh, apThayDoiAnh, keThayDoiAnh } from './form-anh.js';
import { state } from '../state.js';
import { updatePerson, createPerson,
         softDeletePerson, restorePerson } from '../domains/person.js';
import { createUnion, addChild, addPartner, removeChild, removePartner,
         softDeleteUnion, restoreUnion, conLyDoTonTai, reorderChildren,
         thuTuConTheoTuoi, updateUnion, updateChildRelation, swapPartnerOrder,
         getParentUnions, getPartnerUnions, getSpouses, getChildren,
         rankCua } from '../domains/union.js';
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
         chuThichQuanHe, TRANG_THAI_CAP, nhanTrangThaiCap,
         rongHop, caoHop, leLopPhu,
         RONG_NUT_TOI_DA } from '../config.js';

// --- TRẠNG THÁI CỦA LỚP PHỦ, gom vào MỘT object -------------------------
//
// ⚠ Bảy thứ này là trạng thái dùng chung của MỌI màn hình trong file — và từ
// việc tách file (27/08/2026) là của mọi màn hình trong CẢ NHÓM `form-*.js`.
// Chúng phải nằm trong một object chứ không phải bảy biến rời: ES Modules gốc
// KHÔNG cho hai file cùng ghi vào một biến `let` của nhau, nhưng thuộc tính
// của một object thì dùng chung được. Đây là điều kiện để tách file mà không
// dựng ra bản trạng thái thứ hai.
const N = {
  lopPhu:       null,   // lớp phủ đang mở, hoặc null
  khoiKetQua:   null,   // chỗ hiện lỗi, cảnh báo, lời máy chủ
  nutLuu:       null,
  xuLyNgoai:    {},
  dangLuu:      false,
  daXemCanhBao: false,  // đã hiện cảnh báo và người dùng vẫn muốn lưu
  // 'sua' · 'themCon' · 'themChaMe' · 'themBanDoi' · 'xoa' · 'chon' · 'noi' · 'go'
  // · 'suaCap' (bước 29) · 'sapThuTu' (21/08/2026) · 'chuyenCon' (22/08/2026)
  // · 'giaDinh' · 'chonNguoi' · 'doiNguoi' (màn hình Sửa thông tin gia đình)
  cheDo:        'sua',
};

// Các ô nhập, tra theo tên trường. KHÔNG BAO GIỜ gán lại object này — nơi dọn
// (`closePersonForm`) xoá từng khoá, để mọi file cùng nhìn đúng một cái bảng.
const o = {};
// themCon    : { unionId } hoặc { chaMeId }
// themChaMe  : { childId, unionId, gioi }   — unionId rỗng = tạo cặp cha mẹ mới
// themBanDoi : { banDoiId, unionId }        — unionId rỗng = tạo cặp mới
let noiVao     = null;
let daXemThuTu = false;  // đã trả lời câu hỏi thứ tự anh chị em
let sapXepLai  = false;  // câu trả lời ấy có phải "sắp xếp lại theo tuổi" không
let noiCtx     = null;   // chế độ noi: { personId, targetId, loai, unionId }

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

// THỨ BẬC HỎI LÚC NHẬP (luật 12). Mỗi mục là { mocId, input } — một cái ô, và
// NGƯỜI làm mốc cho con số trong ô ấy. Mảng, không phải một ô: nối hai người
// đều đã có cặp thì hộp hỏi cả hai phía.
//
// ⚠ Giữ THAM CHIẾU tới ô, không đọc ngược từ `document`. `hienNhan()` xoá sạch
// `N.khoiKetQua` mỗi lần nó nói một câu mới, nên sau khối cảnh báo thì mấy cái ô
// này không còn nằm trong trang nữa — nhưng tham chiếu vẫn sống và vẫn giữ
// đúng con số người dùng đã gõ. Cùng cơ chế mà `o.conNuoi` đã sống nhờ.
let thuBacNhap = [];


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
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = che;
  noiVao    = chonNoi;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-nguoi';   // mốc cho bài kiểm hành vi, xem kiem-noi-go.mjs
  hop.style.cssText = KIEU_HOP;

  hop.append(veDauForm(nguoi));
  hop.append(...veCacO(nguoi));

  hop.append(...veKhoiXoaNguoi(nguoi));

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChan(nguoi, !canTro));

  // Bấm ra ngoài KHÔNG đóng form. Khác thẻ thông tin có chủ ý: thẻ chỉ để đọc,
  // đóng nhầm thì mở lại là xong; form thì đang giữ những gì người ta vừa gõ,
  // và một cú chạm trượt làm mất cả là chuyện không tha thứ được.
  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

export function closePersonForm() {
  if (N.lopPhu) N.lopPhu.remove();
  N.lopPhu       = null;
  for (const k of Object.keys(o)) delete o[k];
  N.khoiKetQua   = null;
  N.nutLuu       = null;
  N.dangLuu      = false;
  N.daXemCanhBao = false;
  N.cheDo        = 'sua';
  noiVao       = null;
  daXemThuTu   = false;
  sapXepLai    = false;
  noiCtx       = null;
  // ⚠ MỖI MÀN HÌNH ĐÃ TÁCH RA FILE RIÊNG PHẢI CÓ ĐÚNG MỘT DÒNG Ở ĐÂY.
  // `closePersonForm` không với tới biến `let` của file khác được (ES Modules
  // gốc), nên file ấy xuất ra một hàm dọn và ta gọi nó. Quên một dòng thì
  // trạng thái đang làm dở của màn hình ấy sống sót qua lần đóng hộp — và
  // hiện lại ở lần mở sau, giữa một việc khác.
  donDepSapThuTu();
  donDepGoNoi();
  donDepSuaCon();
  donDepGiaDinh();
  donDepCap();
  donDepXoa();
  donDepAnh();
  tenPhu       = [];
  khoiTenPhu   = null;
  quanHe       = null;
  thuBacNhap   = [];
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
  return N.cheDo === 'themCon' || N.cheDo === 'themChaMe' || N.cheDo === 'themBanDoi';
}

/**
 * Tiêu đề form. Chế độ thêm cha mẹ nói rõ CHA hay MẸ khi biết — người dùng vừa
 * bấm đúng một trong hai nút ấy, nên tiêu đề nói lại "Thêm cha / mẹ" là làm họ
 * phải kiểm lại xem mình bấm trúng chưa.
 */
function tieuDeForm() {
  if (N.cheDo === 'themCon')    return 'Thêm người con';
  if (N.cheDo === 'themBanDoi') return 'Thêm vợ / chồng';
  // Không còn "Thêm cha" / "Thêm mẹ" riêng: từ 20/08/2026 chính ô GIỚI TÍNH
  // trong form là chỗ nói ra điều đó, và tiêu đề không được nói trước một thứ
  // người dùng chưa chọn.
  if (N.cheDo === 'themChaMe') return 'Thêm cha / mẹ';
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

  if (N.cheDo === 'themChaMe') {
    if (!noiVao.unionId) {
      return 'Cha / mẹ của ' + tenNguoi(noiVao.childId) +
             ' — app sẽ tạo thêm một cặp cha mẹ mới rồi nối ' +
             tenNguoi(noiVao.childId) + ' vào đó làm con.';
    }
    return 'Cha / mẹ của ' + tenNguoi(noiVao.childId) +
           ' — đứng chung cặp với ' + keTenPartner(noiVao.unionId) +
           '  ·  ' + noiVao.unionId;
  }

  if (N.cheDo === 'themBanDoi') {
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

  if (N.cheDo === 'themCon') {
    ra.push(veNhan('Quan hệ với cặp này'));
    ra.push(veConNuoi('Là con nuôi (không phải con đẻ)'));
  }
  // Chỉ hỏi khi đang TẠO cặp cha mẹ mới. Nối thêm một người vào cặp đã có thì
  // quan hệ đẻ/nuôi của người con với cặp ấy đã ghi từ trước, và hỏi lại ở đây
  // là mời người dùng đổi một thứ họ không định đụng tới.
  if (N.cheDo === 'themChaMe' && !noiVao.unionId) {
    ra.push(veNhan('Quan hệ với ' + tenNguoi(noiVao.childId)));
    ra.push(veConNuoi('Là cha / mẹ NUÔI (không phải cha mẹ đẻ)'));
  }

  // Luật 12. Đứng ĐẦU form, cùng chỗ với hai ô quan hệ ở trên và cùng một lý
  // do: nó nói về CHỖ ĐỨNG của người sắp thêm, không nói về bản thân họ. Người
  // vừa được thêm luôn là cặp thứ nhất của chính họ, nên chỉ hỏi phía kia.
  if (N.cheDo === 'themBanDoi' && !noiVao.unionId) {
    ra.push(...khoiHoiThuBac(noiVao.banDoiId, ''));
  }

  // Ảnh chỉ hiện ở chế độ SỬA hồ sơ, cố ý. Ở các chế độ thêm người, bản ghi
  // chưa tồn tại nên chưa có mã để gắn ảnh vào, mà dựng đường gắn ảnh cho một
  // người chưa có mã là mở thêm một nhánh nữa trong một hàm lưu vốn đã nhiều
  // nhánh. Thêm người xong, mở lại hồ sơ rồi gắn ảnh — thêm đúng một cú chạm.
  if (N.cheDo === 'sua') {
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
  const khoaGioi = N.cheDo === 'themBanDoi' && !!(noiVao && noiVao.gioiNguoc);
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
  if (N.cheDo === 'sua') ra.push(...veKhoiQuanHe(nguoi));

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
    // `maTrangThaiCap` giữ đúng phép chuẩn hoá của `handleSaveUnion`: thiếu
    // `status` thì coi là 'married', nhưng một mã khác hai mã quen thì GIỮ
    // NGUYÊN chứ không ép về 'married' — cùng lối với mã loại tên lạ ở bước 33.
    const ttCu = maTrangThaiCap(u);
    ra.banDoi.push({
      unionId: u.id,
      ten:     tenBanDoiTrongCap(index, u, personId),
      ttCu, ttMoi: ttCu,
      bacCu:  rankCua(u, personId),
      bacMoi: String(rankCua(u, personId)),
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

  const CAC = TRANG_THAI_CAP.slice();
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
  // Nhãn nêu TÊN NGƯỜI LÀM MỐC, không phải số thứ tự của hàng: hàng này đứng
  // cạnh tên người BẠN ĐỜI, nên "Thứ bậc của cặp 2" trống không thì đọc lên
  // dễ thành thứ bậc của người bạn đời ấy — đúng nửa sai mà `DAC-TA-RANK`
  // mục 1 mô tả. Mốc luôn là người đang mở màn hình này (`quanHe.mocId`),
  // cùng một câu chữ với form Sửa cặp (`oThuBac`).
  bac.setAttribute('aria-label',
    'Đây là cặp thứ mấy của ' + tenNguoi(quanHe ? quanHe.mocId : '') + '?');
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
    if (Number.isFinite(n) && n > 0 && n !== m.bacCu) changes.ranks = { [quanHe.mocId]: n };

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

  N.nutLuu = document.createElement('button');
  N.nutLuu.type = 'button';
  N.nutLuu.textContent = laCheDoThem() ? tieuDeForm() : 'Lưu';
  N.nutLuu.disabled = !luuDuoc;
  N.nutLuu.style.cssText = KIEU_NUT_CHAN +
    'flex:1 1 auto;max-width:' + RONG_NUT_TOI_DA + ';' +
    (luuDuoc
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;opacity:.45;cursor:not-allowed');
  if (luuDuoc) {
    N.nutLuu.addEventListener('click', () => {
      if (N.cheDo === 'suaCap') handleSaveUnion();
      else if (N.cheDo === 'themCon') handleAddChild();
      else if (N.cheDo === 'themChaMe' || N.cheDo === 'themBanDoi') handleAddNguoiThan();
      else handleSave(nguoi);
    });
  }

  const huy = document.createElement('button');
  huy.type = 'button';
  huy.textContent = 'Huỷ';
  huy.style.cssText = KIEU_NUT_CHAN +
    'flex:0 0 auto;background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8';
  huy.addEventListener('click', () => closePersonForm());

  chan.append(N.nutLuu, huy);
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
  if (N.cheDo !== 'sua' || !nguoi || !nguoi.id) return [];
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

  // ⚠ Giữ lấy `N.xuLyNgoai` TRƯỚC khi đóng form: `closePersonForm()` đặt nó về
  // rỗng, nên đọc sau đó thì đường `onDaLuu` biến mất và sơ đồ không vẽ lại.
  nut.addEventListener('click', () => {
    const xuLy = N.xuLyNgoai;
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
  if (N.dangLuu) return;

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

  if (raSoat.warnings.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn lưu';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn lưu" nếu bạn biết là đúng:', false,
             raSoat.warnings.map((m) => m.message));
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
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

  N.dangLuu = false;
  if (!N.lopPhu) return;   // người dùng đã đóng form trong lúc chờ máy chủ

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(nguoi.id);
    return;
  }

  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';

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
  if (N.dangLuu) return;

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
  if (canhBao.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn thêm';
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

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
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

  N.dangLuu = false;
  if (!N.lopPhu) return;   // người dùng đã đóng form trong lúc chờ máy chủ

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(nguoiMoi.id);
    return;
  }

  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';

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
      N.daXemCanhBao = false;
      N.nutLuu.textContent = 'Thêm người con';
      hienNhan('Chưa thêm gì cả. Sửa lại rồi bấm "Thêm người con".', false);
    }),
  );
  N.khoiKetQua.append(hang);
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
  const ra = [];
  const coTen = ['surname', 'middle', 'given'].some((k) => coGiaTri(docO(k)));
  if (!coTen) {
    ra.push('Bạn chưa gõ tên nào cả. Người không tên vẫn ghi được — gia phả cũ ' +
            'có thật những người chỉ còn nhớ là "con thứ ba của cụ" — nhưng app ' +
            'chưa có cách xoá người đã thêm, nên xin xem lại một lần nữa.');
  }
  // Luật 12: ô thứ bậc gõ sai thì nói ra, đừng lặng lẽ ghi thứ 1.
  return ra.concat(loiThuBacGoSai());
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
  if (!N.khoiKetQua) return;
  N.khoiKetQua.innerHTML = '';

  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:14px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4');
  N.khoiKetQua.append(d);

  for (const chuDong of (dong || [])) {
    const m = document.createElement('div');
    m.textContent = '• ' + chuDong;
    m.style.cssText =
      'margin-top:6px;padding:7px 10px;font-size:12px;line-height:1.5;' +
      'border-radius:8px;background:#faf8f5;border:1px solid #f0ebe4;color:#5c554e';
    N.khoiKetQua.append(m);
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
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = che;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

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

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  hop.append(chan);

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
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
  N.khoiKetQua.append(hang);

  chan.append(nutChanXoa(c.chuHuy || 'Huỷ', false, () => closePersonForm()));
}

/**
 * Gài mấy phần tử vào hộp việc, NGAY TRÊN hàng nút.
 *
 * ⚠ Vì sao không `N.khoiKetQua.append()` như ô "con nuôi" vẫn làm: `hienNhan()`
 * XOÁ SẠCH `N.khoiKetQua` mỗi lần nó nói một câu mới. Với ô thứ bậc thì đó là
 * một cái bẫy — câu app nói ra chính là *"ô ấy gõ sai, sửa lại đi"*, mà lúc
 * người dùng đọc được câu ấy thì cái ô đã bị chính nó xoá mất. Nên ô này sống
 * NGOÀI tầm với của `hienNhan`.
 *
 * (Ô "con nuôi" vẫn nằm trong `N.khoiKetQua` và vẫn biến mất sau một lời cảnh
 * báo. Không đúng, nhưng khác việc: ở đó lời cảnh báo không bao giờ nói về
 * chính cái ô ấy. Ghi lại ở nhật ký bước này, chưa sửa trong cùng phiên.)
 */
function gaiTruocChan(chan, cacEl) {
  const hop = chan && chan.parentElement;
  if (!hop) return;
  for (const el of cacEl) hop.insertBefore(el, chan);
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
// HỎI THỨ BẬC NGAY LÚC NHẬP — luật 12 (27/08/2026)
// ============================================================
//
// Ba đường tạo ra một cuộc hôn nhân MỚI, và cả ba đi qua đúng hai hàm dưới đây:
//
//   · form *Thêm vợ / chồng*            → `dungCayThemBanDoi`
//   · Kết nối hai người, cặp MỚI        → `dungCayNoi`, nhánh `createUnion`
//   · Kết nối hai người, vào cặp CÓ SẴN → `dungCayNoi`, nhánh `addPartner`
//
// Đường thứ ba cần thêm một bước: `addPartner` cố ý KHÔNG nhận `ranks` (nó chỉ
// làm đúng một việc — đưa một người vào hàng vợ/chồng), nên thứ bậc ghi bằng
// `updateUnion` nối đuôi ngay sau. Cùng đúng lối `updateUnion` + `swapPartnerOrder`
// đã nối đuôi nhau ở form Sửa cặp.
//
// ⚠ BỐN chỗ `createUnion` còn lại KHÔNG hỏi, và đó là chủ ý: cả bốn tạo ra một
// cặp MỘT NGƯỜI để treo người con vào (`dungCayThemCon`, `dungCayThemChaMe`, và
// hai nhánh `'child'`/`'parent'` của `dungCayNoi`). Một cặp chưa có ai làm
// vợ/chồng thì không có vợ cả vợ thứ nào để mà hỏi — con số ấy chỉ sinh ra khi
// có người bước vào, và lúc đó chính đường thứ ba ở trên sẽ hỏi.

/**
 * Ô hỏi *"đây là cặp thứ mấy của X?"* cho một cuộc hôn nhân SẮP TẠO RA.
 *
 * @param {string} mocId       người làm mốc cho con số
 * @param {string} [boQuaCapId] cặp đang được nối vào — không tính vào số cặp
 *        đang có, vì nó chính là cặp sắp thành cặp mới của người ấy
 * @returns {HTMLElement[]} rỗng khi KHÔNG phải hỏi (người ấy chưa có cặp nào)
 *
 * Khác `oThuBac()` ở form Sửa cặp đúng một chỗ, và chỗ ấy quan trọng: ở kia có
 * một cặp thật để `rankCua()` đọc ra con số đang lưu, ở đây thì chưa có gì cả
 * nên app phải GỢI Ý. Vì thế hai hàm không gộp được, và cũng không nên gộp.
 */
function khoiHoiThuBac(mocId, boQuaCapId) {
  const index = state.index;
  if (!index || !mocId || !index.personById.has(mocId)) return [];

  const dsCap = getPartnerUnions(index, mocId).filter((u) => u.id !== boQuaCapId);
  if (dsCap.length === 0) return [];   // cặp đầu tiên của người này: không hỏi

  const goiY = dsCap.length + 1;
  const ten  = tenNguoi(mocId);

  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.value = String(goiY);
  input.dataset.thuBacCua = mocId;   // mốc cho bài kiểm, xem kiem-thu-bac-nhap.mjs
  input.setAttribute('aria-label', 'Đây là cặp thứ mấy của ' + ten + '?');
  input.style.cssText = KIEU_O;

  const nhac = document.createElement('div');
  nhac.textContent =
    '1 là vợ cả / chồng đầu, 2 là vợ thứ hai… tính riêng theo phía ' + ten +
    '. App điền sẵn ' + goiY + ' vì ' + ten + ' đang có ' + dsCap.length +
    ' cặp, nhưng SỬA ĐƯỢC: gia phả cũ chép thứ bậc theo lệ chứ không theo thứ ' +
    'tự nhập liệu, có nhà bà cưới sau vẫn là chính thất.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';

  // Kể ra những cặp đang có, kèm thứ bậc ĐANG LƯU của chính người này. Không kể
  // thì con số gợi ý là một lời khẳng định không có căn cứ nhìn thấy được, và
  // người dùng không có cách nào kiểm nó đúng hay sai trước khi bấm.
  //
  // Kể tên NGƯỜI KIA, không gọi `keTenPartner()`: câu ấy kể cả cặp, tức đọc lên
  // thành *"Đang có: Ông A và Bà B"* trong khi mốc chính là Ông A. Người đọc
  // cần biết *"đã có với AI"*, còn tên mình thì đang nằm ngay trên nhãn.
  const dsCu = document.createElement('div');
  dsCu.textContent = 'Đang có: ' + dsCap
    .map((u) => tenBanDoiTrongCap(index, u, mocId) +
                ' (thứ ' + rankCua(u, mocId) + ')')
    .join('  ·  ');
  dsCu.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:3px';

  thuBacNhap.push({ mocId, input });
  boc.append(input, nhac, dsCu);

  return [veNhan('Đây là cặp thứ mấy của ' + ten + '?'), boc];
}

/**
 * Bảng `ranks` đọc từ những ô vừa hỏi, đúng khuôn `createUnion`/`updateUnion`.
 *
 * Giá trị 1 và mọi thứ gõ sai đều KHÔNG sinh ra khoá — vắng khoá đã có nghĩa là
 * 1 (`union.locRanks`). Chỗ nói ra chuyện gõ sai là `loiThuBacGoSai()`, không
 * phải ở đây: hàm này chỉ đọc, không mắng.
 */
function docThuBacNhap() {
  const ra = {};
  for (const m of thuBacNhap) {
    const n = Number(String(m.input.value || '').trim());
    if (Number.isFinite(n) && n > 1) ra[m.mocId] = Math.floor(n);
  }
  return ra;
}

/**
 * Lời nhắc khi ô thứ bậc mang thứ không đọc ra số được — một dòng cho mỗi ô.
 *
 * Cùng luật với ô Đời (bước 32): app KHÔNG đoán hộ, và form phải NÓI RA rằng
 * mình không đoán. Im lặng ghi thứ 1 cho một ô người dùng vừa gõ nhầm là đúng
 * cái lỗi mà cả việc này sinh ra để chữa.
 */
function loiThuBacGoSai() {
  const ra = [];
  for (const m of thuBacNhap) {
    const chu = String(m.input.value || '').trim();
    const n   = Number(chu);
    if (chu !== '' && Number.isFinite(n) && n >= 1 && Math.floor(n) === n) continue;
    ra.push('Ô "đây là cặp thứ mấy của ' + tenNguoi(m.mocId) + '" đang mang "' +
            chu + '", không phải một số nguyên từ 1 trở lên. App sẽ ghi là ' +
            'thứ 1. Muốn con số khác thì sửa lại ô ấy rồi bấm lần nữa.');
  }
  return ra;
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
  if (N.dangLuu) return;

  const luc    = stampNow();
  const boi    = (state.phien && state.phien.email) || '';
  const quanHe = (o.conNuoi && o.conNuoi.checked) ? 'adopted' : 'birth';
  const laChaMe = N.cheDo === 'themChaMe';

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
  if (canhBao.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn thêm';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn thêm" nếu bạn biết là đúng:',
             false, canhBao);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
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

  N.dangLuu = false;
  if (!N.lopPhu) return;   // người dùng đã đóng form trong lúc chờ máy chủ

  if (ketQua && ketQua.ok) {
    closePersonForm();
    if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(nguoiMoi.id);
    return;
  }

  N.nutLuu.disabled = false;
  N.nutLuu.style.opacity = '1';
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

  // Thứ bậc do người dùng trả lời, không do app đoán (luật 12). Ô chỉ mọc ra
  // khi `noiVao.banDoiId` đã có cặp khác, nên ca thường gặp — lấy vợ/chồng lần
  // đầu — vẫn đi qua đây với một bảng rỗng, đúng như trước.
  const kqU = createUnion(tree, [noiVao.banDoiId, kqP.person.id],
                          { ranks: docThuBacNhap() });
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
    N.khoiKetQua.append(veConNuoi(loai === 'child'
      ? 'Là con nuôi (không phải con đẻ)'
      : 'Là cha / mẹ NUÔI (không phải cha mẹ đẻ)'));
  } else {
    o.conNuoi = null;
  }

  // Luật 12 — chỉ đường VỢ/CHỒNG mới sinh ra một cuộc hôn nhân. Hai vai kia nối
  // quan hệ cha mẹ – con, thứ không có thứ bậc vợ cả vợ thứ nào.
  //
  // Cặp có sẵn: chỉ người BƯỚC VÀO mới có thứ bậc mới — người đang đứng trong
  // đó đã có con số của mình từ trước, hỏi lại là mời họ đổi một thứ không ai
  // định đụng. Cặp mới: hỏi cả hai phía, và `khoiHoiThuBac` tự im với người
  // chưa có cặp nào.
  if (loai === 'spouse') {
    const ds = unionId
      ? [aiVaoCap(unionId, personId, targetId)]
      : [personId, targetId];
    for (const id of ds) gaiTruocChan(chan, khoiHoiThuBac(id, unionId));
  }

  N.nutLuu = nutChanXoa('Nối hai người này', false, () => chayNoi());
  chan.append(N.nutLuu, nutChanXoa('Không nối', false, () => closePersonForm()));
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
  if (N.dangLuu || !noiCtx) return;

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

  const canhBao = loiThuBacGoSai().concat(raSoat.warnings.map((m) => m.message));
  if (canhBao.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn nối';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn nối" nếu bạn biết là đúng:',
             false, canhBao);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang nối…', false);

  const ketQua = await ghiBanGhi(null, [dung.union], {
    action: 'update',
    target: dung.union.id,
    note:   'Nối ' + tenNguoi(targetId) + ' làm ' + TEN_QUAN_HE[loai] + ' của ' +
            tenNguoi(personId) + ' qua ' + dung.union.id +
            (dung.laUnionMoi ? ' (cặp mới, tạo cùng lúc)' : '') + '.',
    diff:   dung.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hai người này CHƯA được nối.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(targetId);

  N.nutLuu = null;
  hienNhan('Đã nối ' + tenNguoi(targetId) + ' làm ' + TEN_QUAN_HE[loai] +
           ' của ' + tenNguoi(personId) + '.', false);

  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Xong', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}

/** @returns {{tree, union, laUnionMoi, diff}|null} */
function dungCayNoi(quanHe) {
  const { personId, targetId, loai, unionId } = noiCtx;
  let tree = state.tree;
  const diff = {};

  if (loai === 'spouse') {
    const bac = docThuBacNhap();   // luật 12; rỗng khi không có ô nào phải hỏi

    if (unionId) {
      // Cặp ấy có thể là cặp của NGƯỜI KIA (`chonCap` nay gom cả hai phía), nên
      // người bước vào là người chưa đứng trong đó — không mặc định là `targetId`.
      const kq = addPartner(tree, unionId, aiVaoCap(unionId, personId, targetId));
      if (!kq) return null;
      Object.assign(diff, kq.diff);

      // `addPartner` cố ý không nhận `ranks`, nên thứ bậc ghi bằng một hàm nữa
      // NỐI ĐUÔI ngay sau — trên cây MỚI, không phải cây cũ. Khoá phải là người
      // đã nằm trong `partners`, mà `updateUnion` chỉ thấy điều đó sau khi
      // `addPartner` chạy xong.
      if (Object.keys(bac).length === 0) {
        return { tree: kq.tree, union: kq.union, laUnionMoi: false, diff };
      }
      const kqR = updateUnion(kq.tree, unionId, { ranks: bac });
      if (!kqR) return null;
      Object.assign(diff, kqR.diff);
      return { tree: kqR.tree, union: kqR.union, laUnionMoi: false, diff };
    }

    const kq = createUnion(tree, [personId, targetId], { ranks: bac });
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


/**
 * Thứ tự một người con trong hàng anh chị em. Thiếu số thì XUỐNG CUỐI, không
 * lên đầu — cùng phép với thẻ gia đình: chưa ai xếp họ thì họ đứng sau người
 * đã được xếp.
 *
 * ⚠ Ở lại NỀN khi `form-sua-con.js` tách ra (27/08/2026): thẻ gia đình và
 * `form-gia-dinh.js` cũng đọc nó.
 */
function thuTuCon(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

/**
 * Mã trạng thái đang lưu của một cặp, đã chuẩn hoá.
 *
 * Cùng đúng phép mà `docQuanHe` và `handleSaveUnion` dùng: thiếu `status` thì
 * coi là `married`, nhưng một mã LẠ thì giữ nguyên chứ không ép về `married` —
 * ép là lặng lẽ đổi một thứ gia phả đã chép.
 */
function maTrangThaiCap(u) {
  return u && u.status === 'divorced' ? 'divorced' : ((u && u.status) || 'married');
}


// ============================================================
// NỀN DÙNG CHUNG cho cả nhóm `form-*.js`
// ============================================================
//
// Mấy hàm dưới đây và object `N` ở trên KHÔNG thuộc riêng màn hình nào — mọi
// màn hình đã tách ra file riêng đều dùng. Chúng còn nằm ở đây vì việc tách
// đang làm dở: **đợt 7** của `tai-lieu/BAN-DO-TACH_V01.md` sẽ dời cả nền sang
// `pages/form-nen.js`, và lúc ấy các file `form-*.js` chỉ phải đổi một dòng
// nhập. Đừng thêm màn hình mới vào file này — thêm một file `form-*.js`.

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


// ============================================================
// HAI KHỐI XUẤT RA — nền cho nhóm `form-*.js`, và xuất lại các màn hình đã dời
// ============================================================
//
// ⚠ **Khối thứ hai là điều kiện để tách được file này.** `tree-view.js` và MƯỜI
// HAI bài kiểm trong `kiem-thu/` nhập thẳng từ `pages/person-edit.js`, nên mọi
// tên đã dời sang file khác phải còn ra được từ đúng đường dẫn ấy. Nhờ nó, cả
// việc tách không phải sửa một dòng nào ở nơi khác.
//
// ⚠ Xuất một hàm nền ra đây KHÔNG có nghĩa nó thành cửa công khai của app. Nó
// là cửa cho nhóm `form-*.js` — và đợt 7 sẽ chuyển cả nhóm ấy sang
// `form-nen.js`, lúc đó khối thứ nhất biến mất khỏi đây.

export { N, o, KIEU_O, KIEU_NUT_CHON, KIEU_NUT_CHAN, KIEU_LOP_PHU, KIEU_HOP,
         TEN_QUAN_HE,
         moForm, moHopTrang, moHopChon, moHopBao, hienNhan, hienLoiGhi,
         nutChon, nutChanXoa, nutChanDam, nutMuc, gaiTruocChan, veNhan, veNhanO,
         oChu, oNhieuDong, docO, mayDocDuocGi, veChan, canTroLuu, gopRaSoat,
         ghiBanGhi, ghiMotNguoi, tenNguoi, tenTrongCay, keTenPartner,
         tenBanDoiTrongCap, soPartner, moTaCap, thuTuCon, maTrangThaiCap,
         chonCap, khoiHoiThuBac, docThuBacNhap, loiThuBacGoSai,
         timNguoiTrongCay, timCapTrongCay };

export { khoiPhucNguoi, khoiPhucCap, donThungRac, khoiPhucNhieu,
         chuyenVaoThungRac } from './form-thung-rac.js';
export { openSapThuTu } from './form-sap-thu-tu.js';
export { goNoiNguoi, unlink } from './form-go-noi.js';
export { openSuaCon } from './form-sua-con.js';
export { openFamilyForm } from './form-gia-dinh.js';
export { openUnionForm } from './form-cap.js';
export { xoaNguoi } from './form-xoa.js';
