// ============================================================
// giapha · js/pages/person-detail.js
// Vai trò  : MENU vòng tròn (mở từ nút ⓘ · chuột phải) + THẺ người + THẺ GIA ĐÌNH
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{person,union,render}, services/repo,
//            utils/{text,date,image,avatar,glyph}, config
// Phiên bản: 1.30.1 · Cập nhật: 01/09/2026 11:40
// ============================================================
//
// --- HAI MÀN HÌNH, HAI CÂU HỎI (chốt 20/08/2026) ------------------------
//
// File này xuất ra HAI cửa, và chúng trả lời hai câu khác nhau:
//
//   openPersonMenu()   — *"tôi muốn LÀM GÌ với người này?"*  ⟵ cửa MẶC ĐỊNH
//                        của cú chạm giữ và cú bấm chuột phải. Sáu việc QUAN HỆ
//                        quanh vành, ảnh người ở giữa.
//   openPersonDetail() — *"người này LÀ AI?"*  ngày tháng, tên khác, ba nhóm
//                        quan hệ, và nút **Sửa hồ sơ**. Mở bằng cách bấm vào
//                        ẢNH ở giữa vòng tròn.
//   openUnionDetail()  — *"gia đình này RA SAO?"*  ngày cưới, cặp bây giờ thế
//                        nào, các con theo thứ tự. Mở từ nhóm Vợ/chồng trong
//                        thẻ người. Việc 4, thêm 21/08/2026 — xem mục riêng.
//
// **Trước 20/08 hai thứ này nằm chung một thẻ, và đó là thừa.** Chạm giữ vào
// một ô là hiện ra cả tiểu sử lẫn tám cái nút — mà chín lần trên mười người ta
// chạm giữ vì muốn LÀM một việc, còn đọc tiểu sử thì đã đọc ngay trên sơ đồ.
// Cái thẻ dài ấy bắt cuộn qua ba nhóm quan hệ mới tới được chỗ bấm.
//
// Tách ra thì mỗi màn hình ngắn lại, và đường đi giữa chúng là hai chiều: ảnh
// ở giữa vòng tròn dẫn sang thẻ, nút *"Các việc khác"* dưới thẻ dẫn ngược về
// vòng tròn. Cả hai dùng CHUNG `lopPhu`, nên không bao giờ chồng lên nhau.
//
// ⚠ **Ranh giới giữa hai màn hình là *"nói về CON NGƯỜI"* hay *"nói về QUAN
// HỆ"*.** Sửa hồ sơ nằm ở THẺ vì sửa ngày sinh là sửa cái đang đọc — chỗ đúng
// của nó là ngay dưới thứ nó sắp sửa. Thêm cha mẹ, gỡ nối, xoá thì nằm ở VÀNH.
//
// ⚠ Hai cửa, MỘT bộ hàm xử lý. Nơi gọi truyền đúng một `xuLy` và nó đi xuyên
// qua cả hai màn hình — thẻ mở menu thì chuyền tiếp, menu mở thẻ cũng vậy. Hai
// bộ khác nhau là thứ đẻ ra cảnh cùng một nút mà lúc chạy lúc không, tuỳ người
// dùng đã đi qua màn hình nào.
//
// --- MỤC CÒN TRỐNG: MẶC ĐỊNH ẨN, CÓ CÔNG TẮC MỞ RA (21/08/2026) --------
//
// Trường trống thì ẨN CẢ HÀNG — luật 14/08/2026, `CLAUDE.md` mục 7, **vẫn còn
// nguyên giá trị và mặc định của thẻ vẫn đúng như thế**. Dùng
// utils/text.coGiaTri(), đừng tự kiểm theo kiểu riêng.
//
// Thêm ngày 21/08/2026, sau khi chủ dự án hỏi *"tại sao bấm ⓘ không hiện đủ
// thông tin như khi sửa hồ sơ"*: dưới bảng có một dòng bấm được —
// **"Còn N mục chưa điền"** — mở ra thì các hàng trống hiện lên đúng CHỖ CỦA
// CHÚNG trong bảng, nhãn mờ và giá trị là một dấu "—".
//
// --- Vì sao là công tắc, không phải đảo hẳn luật -----------------------
//
// Hai nhu cầu thật, ngược nhau, và cái thẻ phải phục vụ cả hai:
//
//   · ĐỌC một người   → hàng trống là nhiễu. Mười ba dòng gạch để tìm ba dòng
//                       có chữ là bắt người ta làm việc của cái máy.
//   · RÀ để đi điền   → hàng trống chính là thứ cần thấy. Thẻ ngắn trông y hệt
//                       dữ liệu bị mất, và người dùng không có cách nào biết
//                       app còn hỏi được những gì.
//
// Ẩn hẳn thì hỏng nhu cầu thứ hai; hiện hẳn thì hỏng nhu cầu thứ nhất. Bản
// ngày 21/08 đã thử hiện hẳn và chụp ảnh (`kiem-thu/td-0.png`) — đọc được,
// nhưng chủ dự án chốt công tắc, và công tắc đúng hơn: nó nói ra CON SỐ mục
// còn thiếu ngay cả khi đang đóng, tức là giải quyết nhu cầu thứ hai mà không
// tốn một dòng nào của nhu cầu thứ nhất.
//
// ⚠ **HÀNG TRỐNG PHẢI NẰM ĐÚNG CHỖ CỦA NÓ, không dồn xuống cuối.** Mở công tắc
// ra mà bảy hàng trống xếp thành một cụm ở đáy thì thứ tự đọc vỡ, và người
// dùng không đối chiếu được với form — mà đối chiếu với form đúng là việc họ
// đang làm. Vì thế bấm công tắc là VẼ LẠI cả bảng, không phải lật `display`.
//
// ⚠ **Trạng thái công tắc nhớ qua các lần mở thẻ, trong cùng một phiên.** Ai
// bật nó lên là đang đi rà cả một loạt người; bắt bật lại cho từng người là
// bắt trả lời một câu hỏi đã trả lời rồi. Tải lại trang thì về mặc định ẩn.
//
// ⚠ **Hàng trống KHÔNG được mang chữ "Không rõ" hay "..."** — nửa ấy của luật
// cũ không bị đụng tới. Dấu "—" là quy ước bảng kê cho ô chưa điền, không phải
// một lời khẳng định về người ta.
//
// Điểm dừng của chat 1.6: "xem xong một người là biết đủ, không phải cuộn
// tìm". Vì thế thẻ này gom cả BA nhóm quan hệ — cha mẹ, vợ/chồng, con — chứ
// không chỉ mấy dòng ngày tháng. Mỗi người trong đó là một nút bấm được.
//
// --- Vì sao thẻ KHÔNG tự gọi setFocusPerson ------------------------------
//
// `tree-view.js` cũng thuộc lớp `pages`, và nó `import` file này. Để file này
// `import` ngược lại là dựng một vòng tròn module — trình duyệt vẫn nạp được,
// nhưng một trong hai file sẽ thấy hàm của file kia là `undefined` tuỳ thứ tự
// nạp, và lỗi ấy chỉ hiện ra trên GitHub Pages chứ không hiện lúc chạy thử.
// Nên nơi gọi truyền vào `onChonNguoi`, thẻ chỉ báo ra ngoài "người dùng vừa
// chọn ai", không tự quyết định.
//
// --- Ảnh người: XONG ở bước 28 ------------------------------------------
//
// Hai chỗ, cùng một hàm `veAnhTron()` trừ tâm vòng tròn (nó tính bề ngang bằng
// phần trăm nên phải dựng riêng): đầu THẺ 60px, và TÂM menu vòng tròn.
//
// ⚠ Cùng một luật hai lớp với `render.js`: bóng người mặc định nằm sẵn trong
// `<img>`, ảnh thật chỉ THAY vào khi đã tải về được. Gán thẳng rồi bắt
// `onerror` thì trên mạng chậm người dùng thấy một ô trống trước đã.

import { state } from '../state.js';
import { suaDuoc } from '../services/repo.js';
import { getAlternateNames } from '../domains/person.js';
import { getParentUnions, rankCua } from '../domains/union.js';
import { getMediaFor } from '../domains/media.js';
import { mauVien } from '../domains/render.js';
import { fullName, coGiaTri, doiSongNguoi, ngayGio } from '../utils/text.js';
import { formatDate, calcAge } from '../utils/date.js';
import { driveThumbUrl } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';
import { veBieuTuongTron } from '../utils/glyph.js';
import { nhanLoaiTenPhu, chuThichQuanHe,
         rongHop, caoHop, leLopPhu } from '../config.js';

let lopPhu = null;   // lớp phủ đang mở, hoặc null

// Thẻ nào đang mở, để dải ảnh vẽ lại được chính nó — xem `veLaiTheDangMo`.
// { loai: 'nguoi' | 'cap', ma, xuLy }
let theDangMo = null;

const GIOI = { M: 'Nam', F: 'Nữ' };   // 'U' cố ý KHÔNG có mặt — xem veHang()

// Công tắc "Còn N mục chưa điền". Nhớ qua các lần mở thẻ trong cùng một phiên
// — xem ghi chú đầu file. KHÔNG dọn nó ở `closePersonDetail`.
let hienMucTrong = false;

// Lớp phủ và hộp trắng: MỘT chỗ định nghĩa cho cả file, dùng chung cho THẺ và
// cho MENU. Chép ra hai bản thì bản đầu tiên trôi lệch bao giờ cũng là
// `z-index`, và hai màn hình của cùng file này chồng lên nhau thì người dùng
// bấm vào cái phía dưới mà không hiểu vì sao không ăn.
//
// ⚠ `box-sizing:border-box` không phải chi tiết trang trí. Thiếu nó thì
// `width:100%` tính trên phần RUỘT, còn 18px đệm mỗi bên cộng thêm ra ngoài —
// trên điện thoại 400px cái hộp thành 396px trong một khung chỉ còn 360px, và
// lớp phủ căn giữa làm nó thò ra 18px MỖI BÊN. Lỗi có từ bước 14, ẩn suốt vì
// hộp cũ toàn chữ chạy sát lề trái nên không ai thấy gì mất.
//
// ⚠ Và một đính chính về CÁCH TÌM RA nó: bước 26 lúc đầu ghi *"ảnh chụp bắt
// được"*. **Sai.** Cái ảnh ấy bị cắt vì Chrome không mở nổi cửa sổ hẹp hơn
// ~500px (đã ghi ở `DOC-TRUOC.md` từ bước 24), nên hộp nằm giữa khung 500px còn
// ảnh thì cắt ở 400px — trông y hệt một lỗi tràn lề. Thứ chứng minh lỗi có thật
// là **phép tính** (396 > 360) và bài kiểm ép bề ngang bằng CSS, không phải bức
// ảnh. Đọc một artefact của công cụ thành một lỗi của mã là chuyện đã xảy ra
// hai lần ở đây: cùng họ với `--window-size` không ăn ở chế độ `--dump-dom`.
const KIEU_LOP_PHU =
  'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
  'display:flex;align-items:center;justify-content:center;' +
  'padding:' + leLopPhu() + ';' +
  'font-family:system-ui,sans-serif;color:#2a2622';

const KIEU_HOP =
  'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
  'width:100%;max-width:' + rongHop(360, 620) + ';' +
  'max-height:' + caoHop(82) + ';overflow:auto;' +
  'box-shadow:0 8px 32px rgba(42,38,34,.28);-webkit-overflow-scrolling:touch;'

/**
 * Mở THẺ THÔNG TIN của một người — trả lời câu *"người này là ai?"*.
 *
 * Không còn là cửa mặc định của cú chạm giữ (đổi 20/08/2026); nay mở từ mục ⓘ
 * trong vòng tròn, hoặc từ một dòng trong màn hình Danh sách người.
 *
 * @param {string} personId
 * @param {{onChonNguoi?:function(string), onSuaNguoi?:function(string),
 *          onThemChaMe?:function(string,string), onThemBanDoi?:function(string),
 *          onThemCon?:function({mocId?:string}),
 *          onKetNoi?:function(string), onGoNoi?:function(string),
 *          onXoaNguoi?:function(string), onSuaCap?:function(string),
 *          onSuaGiaDinh?:function(string)}} [xuLy]
 *        `onSuaGiaDinh` — cửa THỨ HAI của chân thẻ (22/08/2026): màn hình
 *                       *Sửa thông tin gia đình*, nơi cha mẹ · vợ/chồng · con
 *                       cái của người này nằm chung một chỗ và sửa được ngay.
 *        `onChonNguoi`  bấm một người trong phần quan hệ, hoặc nút "Đưa ra giữa
 *                       sơ đồ". Thẻ tự đóng trước khi gọi.
 *        `onSuaNguoi`   nút *"Sửa hồ sơ"* dưới THẺ (không còn ở vòng tròn).
 *        `onThemChaMe`  **chỉ có mã người**. Cha hay mẹ thì ô giới tính trong
 *                       form nói ra, menu không hỏi trước (đổi 20/08/2026).
 *        `onThemBanDoi` chỗ chọn cặp nằm ở `person-edit.js`, không nằm đây.
 *        `onThemCon`    **chỉ có mã người mốc**. Cặp cha mẹ nào thì khối
 *                       *Cha mẹ là ai?* trong form hỏi (bước 65).
 *        `onKetNoi`     nơi gọi mở màn hình Danh sách người để chọn người kia.
 *        `onGoNoi`      nơi gọi mở danh sách mối nối hiện có.
 *        `onXoaNguoi`   thẻ KHÔNG hỏi lại gì.
 *        `onSuaCap`     nút dưới nhóm Vợ/chồng. Chỉ có mã NGƯỜI — người có nhiều
 *                       cặp thì `person-edit.js` hỏi cặp nào (bước 29).
 *        `onSapThuTu`   nút dưới nhóm Con. Cửa NHÌN THẤY ĐƯỢC của cử chỉ chạm
 *                       giữ trên ô sơ đồ (21/08/2026).
 *
 * ⚠ SÁU MỤC CỦA VÒNG TRÒN ĐỀU LÀ CỬA, KHÔNG PHẢI VIỆC. Mọi hộp xác nhận, mọi
 * phép rà, mọi đường ghi và mọi đường hoàn tác nằm ở `person-edit.js` — nơi có
 * sẵn đường tới máy chủ. Thẻ này chỉ báo ra ngoài *"người dùng vừa muốn làm
 * gì"*; mục nào nơi gọi không nhận thì mục ấy mờ đi.
 */
export function openPersonDetail(personId, xuLy = {}) {
  closePersonDetail();

  const index = state.index;
  const p = index && index.personById.get(personId);
  if (!p) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const the = document.createElement('div');
  the.id = 'giapha-the-nguoi';   // mốc cho bài kiểm đo bố cục, xem kiem-vong-tron.mjs
  the.style.cssText = KIEU_HOP;

  theDangMo = { loai: 'nguoi', ma: personId, xuLy };

  the.append(...veDauThe(p), ...veHangThongTin(p));
  the.append(...veDaiAnhThe(personId, p));
  the.append(...veQuanHe(index, p, xuLy));
  the.append(veChanThe(p, xuLy));

  // Bấm ra ngoài thẻ thì đóng — nhưng CHỈ khi bấm trúng đúng lớp phủ, không
  // phải một phần tử con nào đó của thẻ đang nổi lên trên.
  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonDetail(); });
  lopPhu.append(the);
  document.body.append(lopPhu);
}

export function closePersonDetail() {
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  theDangMo = null;
}

// ============================================================
// DẢI ẢNH trên thẻ — việc 5 nửa A
// ============================================================
//
// Màn hình ĐỌC của kho ảnh. Kho sửa được nằm trong form (`person-edit.js`);
// đây chỉ xem.
//
// ⚠ **Phải có mặt ở đây, không được để riêng trong form.** Phần lớn người trong
// họ chỉ có quyền XEM — họ không bao giờ mở form ra. Một kho ảnh mà chỉ người
// sửa được mới thấy thì với đa số người dùng nó không tồn tại.
//
// ⚠ Hàm nhận `subjectId`, không nhận bản ghi người: `media[].subjectId` mang cả
// mã người (`P….`) lẫn mã hôn nhân (`U….`). Nhờ vậy nửa B — ảnh cưới trên thẻ
// gia đình — dùng lại đúng khối này, không chép lần thứ hai.

// Tấm đang mở to, và MỞ TRÊN THẺ CỦA AI.
//
// ⚠ Phải nhớ cả chủ thể, không chỉ mã tấm. Bấm một tấm là vẽ LẠI cả thẻ
// (`veLaiTheDangMo`), mà vẽ lại thì đi qua `closePersonDetail` — nên nếu
// đóng thẻ mà dọn biến này thì cú bấm tự xoá đúng thứ nó vừa đặt, và tấm
// ảnh không bao giờ mở ra được. Để trạng thái sống qua lần vẽ lại, rồi
// **so chủ thể** ở `veDaiAnhThe`: mở thẻ người khác là coi như chưa mở tấm
// nào, không cần ai dọn cả.
let anhDangXemTren = '';   // mã tấm đang mở to; '' là chưa mở tấm nào
let anhDangXemCua  = '';   // mã chủ thể của tấm ấy

/**
 * Dải ảnh của một người hoặc một cặp. Trả về mảng rỗng khi kho không có tấm
 * nào — trường trống thì không vẽ hàng đó.
 *
 * @param {string} subjectId  mã người `P….` hoặc mã hôn nhân `U….`
 * @param {object} [nguoiNen] bản ghi người, chỉ dùng để lấy màu viền và bóng
 *                            người lúc ảnh chưa tải xong
 * @returns {Array<HTMLElement>}
 */
function veDaiAnhThe(subjectId, nguoiNen) {
  const ds = getMediaFor(state.tree, subjectId);
  if (ds.length === 0) return [];

  const boc = document.createElement('div');
  boc.id = 'giapha-dai-anh-the';   // mốc cho bài kiểm hành vi
  boc.style.cssText = 'margin-top:10px';

  const dai = document.createElement('div');
  dai.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
  for (const m of ds) dai.append(veTamAnhThe(m, nguoiNen, subjectId));
  boc.append(dai);

  const mo = (anhDangXemCua === subjectId)
    ? ds.find((m) => m.id === anhDangXemTren)
    : null;
  if (mo) boc.append(veAnhTo(mo, nguoiNen));

  const nhan = document.createElement('div');
  nhan.textContent = 'Ảnh (' + ds.length + ')';
  nhan.style.cssText =
    'margin-top:14px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:#8a8078';

  return [nhan, boc];
}

function veTamAnhThe(m, nguoiNen, subjectId) {
  const co = 56;
  const laMat = laAnhDaiDien(m, subjectId);

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.anh = m.id;
  nut.style.cssText =
    'position:relative;width:' + co + 'px;height:' + co + 'px;padding:0;' +
    'border-radius:10px;overflow:hidden;cursor:pointer;touch-action:manipulation;' +
    'background:#faf8f5;border:2px solid ' +
    (m.id === anhDangXemTren && anhDangXemCua === subjectId
      ? '#8a8078'
      : (laMat ? mauVien(nguoiNen) : '#e6e0d8')) + ';';

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoiNen && nguoiNen.sex, mauVien(nguoiNen));
  taiAnhVaoThe(im, driveThumbUrl(m.driveFileId, co * 2));
  nut.append(im);

  // Dấu hiệu đọc được KHÔNG CẦN MÀU, cùng luật với dải ảnh trong form:
  // viền màu một mình thì người phân biệt màu kém không thấy tấm nào đang
  // làm mặt. Trên thẻ chỉ có MỘT dấu — không có ✕ như trong form, vì thẻ
  // không gỡ được tấm nào.
  if (laMat) {
    const dau = document.createElement('span');
    dau.textContent = '✓';
    dau.style.cssText =
      'position:absolute;left:0;bottom:0;min-width:18px;height:18px;' +
      'display:flex;align-items:center;justify-content:center;font-size:12px;' +
      'color:#fffdf9;background:' + mauVien(nguoiNen) + ';border-radius:0 8px 0 8px';
    nut.append(dau);
  }

  if (coGiaTri(m.caption)) nut.title = String(m.caption);

  nut.addEventListener('click', () => {
    const dangMo = anhDangXemTren === m.id && anhDangXemCua === subjectId;
    anhDangXemTren = dangMo ? '' : m.id;
    anhDangXemCua  = dangMo ? '' : subjectId;
    veLaiTheDangMo();
  });
  return nut;
}

/** Tấm đang mở, to hết bề ngang thẻ. Chú thích nằm dưới, chỉ khi có chữ. */
function veAnhTo(m, nguoiNen) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:8px';

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText =
    'width:100%;max-height:52vh;object-fit:contain;display:block;' +
    'border-radius:10px;background:#faf8f5';
  im.src = anhMacDinhUri(nguoiNen && nguoiNen.sex, mauVien(nguoiNen));
  // ⚠ Xem ảnh TO thì lấy BẢN LỚN (01/09/2026). Ảnh tải lên trước ngày có bản
  // lớn thì `driveFileIdLon` rỗng — rơi về bản nhỏ, vẫn hiện được, chỉ kém nét.
  taiAnhVaoThe(im, driveThumbUrl(m.driveFileIdLon || m.driveFileId, 1200));
  boc.append(im);

  if (coGiaTri(m.caption)) {
    const chu = document.createElement('div');
    chu.textContent = String(m.caption);
    chu.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:5px';
    boc.append(chu);
  }
  return boc;
}

/**
 * Đổi `src` CHỈ KHI ảnh tải xong thật — cùng lý lẽ với `datAnhKhiTaiXong` ở
 * `person-edit.js`: một biểu tượng ảnh vỡ đọc ra thành "app hỏng", còn bóng
 * người đọc ra thành "chưa có ảnh".
 */
function taiAnhVaoThe(im, duong) {
  if (!duong) return;
  const thu = new Image();
  thu.onload = () => {
    if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
  };
  thu.src = duong;
}

/** Tấm này có đang làm ảnh đại diện của chủ thể không. Cặp thì không bao giờ. */
function laAnhDaiDien(m, subjectId) {
  const p = state.index && state.index.personById.get(subjectId);
  if (!p) return false;
  const cu = typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  return !!cu && cu === m.driveFileId;
}

/**
 * Vẽ lại thẻ đang mở, giữ nguyên chỗ đã cuộn tới.
 *
 * ⚠ Dựng lại cả thẻ chứ không vá một khối, vì thẻ này KHÔNG có ô nhập nào —
 * không có gì gõ dở để mất. Ngược hẳn với form, nơi dựng lại là xoá sạch những
 * thứ người dùng đang gõ (xem `veLaiKhoiAnh`).
 */
function veLaiTheDangMo() {
  if (!theDangMo) return;
  const hop = lopPhu && lopPhu.firstElementChild;
  const cuon = hop ? hop.scrollTop : 0;
  const { loai, ma, xuLy } = theDangMo;
  if (loai === 'nguoi') openPersonDetail(ma, xuLy);
  else openUnionDetail(ma, xuLy);
  const hopMoi = lopPhu && lopPhu.firstElementChild;
  if (hopMoi) hopMoi.scrollTop = cuon;
}

// ============================================================
// THẺ GIA ĐÌNH — việc 4 (21/08/2026)
// ============================================================
//
// Màn hình ĐỌC của một CẶP, đứng ngang hàng với thẻ người. Ba màn hình, ba câu
// hỏi: *"làm gì với người này"* (vòng tròn) · *"người này là ai"* (thẻ người) ·
// *"gia đình này ra sao"* (thẻ này).
//
// --- BỐN quyết định của thẻ gia đình ------------------------------------
//
// 1. **CỬA VÀO LÀ NÚT TRONG NHÓM VỢ/CHỒNG CỦA THẺ NGƯỜI, MỘT NÚT MỘT CẶP.**
//    Vành sáu mục KHÔNG bị đụng tới — nó chật rồi, và sáu việc ở đó đều là
//    việc SỬA, còn đây là màn hình ĐỌC.
//
//    Một nút một cặp, chứ không phải một nút chung rồi hỏi *"cặp nào"*: người
//    có hai đời vợ thì hai dòng, mỗi dòng gọi thẳng tên người kia. Hỏi lại là
//    thêm một hộp cho một câu mà cái nút đã trả lời được ngay trên mặt nó.
//
// 2. **NÚT SỬA NẰM TRONG THẺ NÀY, KHÔNG NẰM Ở THẺ NGƯỜI NỮA.** Đúng ranh giới
//    đã chốt 20/08 cho thẻ người: *"sửa ngày sinh là sửa cái đang đọc, nên chỗ
//    đúng của nút Sửa là ngay dưới thứ nó sắp sửa"*. Trước việc 4, nút *"Sửa
//    cặp"* nằm trên thẻ NGƯỜI vì chưa có màn hình nào của cặp để mà đặt nó vào.
//
// 3. **DÙNG CHUNG CÔNG TẮC "Còn N mục chưa điền" VỚI THẺ NGƯỜI.** Một công tắc
//    cho cả hai thẻ, không phải hai cái nhớ hai trạng thái: người đang đi rà
//    thì rà cả người lẫn cặp, và hai công tắc lệch nhau là thứ không ai đoán
//    được đang bật hay tắt.
//
// 4. **CÁC CON XẾP THEO `order`, KHÔNG XẾP THEO TUỔI.** `order` là thứ tự
//    người ta đã chép tay, và `layout.js` vẽ sơ đồ đúng theo nó. Thẻ xếp khác
//    sơ đồ là hai chỗ nói hai điều về cùng một nhà. Muốn đổi thì có màn hình
//    *Sắp thứ tự các con*, và nó ghi `order` xuống dữ liệu.
//
// ⚠ **Chỗ đứng của ẢNH CƯỚI ở việc 5 là thẻ này**, ngay dưới đầu thẻ. Đừng
// treo nó vào thẻ người — một tấm ảnh cưới thuộc về hai người, không thuộc về
// một người.

/**
 * Mở thẻ gia đình của một cặp.
 *
 * @param {string} unionId
 * @param {{onChonNguoi?:function(string), onSuaCap?:function(string,string),
 *          onThemCon?:function(string), onSapThuTu?:function(string),
 *          onXoaCap?:function(string),
 *          onSuaCon?:function(string)}} [xuLy]
 *        `onSuaCon` nhận MÃ CẶP — nửa sau của việc 8 (22/08/2026). Nó là cửa
 *        vào ba việc mà trước nay không có chỗ nào làm được từ phía một GIA
 *        ĐÌNH: đổi quan hệ đẻ/nuôi/kế của một người con, chuyển người con ấy
 *        sang gia đình khác, và gỡ họ khỏi gia đình này.
 *        `onSuaCap` nhận HAI tham số — mã người làm mốc và MÃ CẶP. Tham số thứ
 *        hai là thứ việc 4 thêm vào: từ đây ta đã biết đích xác cặp nào, nên
 *        `openUnionForm` không được hỏi lại *"cặp nào"* một lần nữa.
 */
export function openUnionDetail(unionId, xuLy = {}) {
  closePersonDetail();

  const index = state.index;
  const u = index && index.unionById && index.unionById.get(unionId);
  if (!u) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const the = document.createElement('div');
  the.id = 'giapha-the-cap';   // mốc cho bài kiểm hành vi
  the.style.cssText = KIEU_HOP;

  theDangMo = { loai: 'cap', ma: unionId, xuLy };

  the.append(...veDauTheCap(u));
  // Ảnh CƯỚI đứng ngay dưới đầu thẻ, không đứng cuối như dải ảnh của thẻ
  // người: thẻ người đã có mặt người ấy ở đầu thẻ rồi, còn ở đây tấm ảnh
  // cưới CHÍNH LÀ thứ người ta mở thẻ gia đình ra để xem.
  the.append(...veDaiAnhThe(unionId, null));
  the.append(...veHangThongTinCap(u));
  the.append(...veNguoiTrongCap(index, u, xuLy));
  the.append(veChanTheCap(u, xuLy));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonDetail(); });
  lopPhu.append(the);
  document.body.append(lopPhu);
}

/**
 * Đầu thẻ gia đình: ảnh hai người chồng lên nhau một chút, tên ghép, mã cặp.
 *
 * ⚠ Hai ảnh CHỒNG MÉP chứ không đứng rời: hai vòng tròn cách nhau đọc lên là
 * hai người, chồng mép đọc lên là một cặp — và cặp mới là thứ cái thẻ này nói
 * tới. Cặp một người (`U0024` là ca thật) thì chỉ có một vòng, không có chỗ
 * trống nào giữ chỗ cho người chưa có.
 */
function veDauTheCap(u) {
  const index = state.index;
  const ds = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && index.personById.has(id))
    .map((id) => index.personById.get(id));

  const dau = document.createElement('div');
  dau.style.cssText = 'display:flex;gap:12px;align-items:flex-start';

  if (ds.length > 0) {
    const cumAnh = document.createElement('div');
    cumAnh.style.cssText = 'flex:0 0 auto;display:flex';
    ds.forEach((p, i) => {
      const a = veAnhTron(p, 52);
      if (i > 0) a.style.marginLeft = '-14px';
      cumAnh.append(a);
    });
    dau.append(cumAnh);
  }

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0';

  const ten = document.createElement('div');
  ten.textContent = ds.length > 0
    ? ds.map(fullName).join('  và  ')
    : '(cặp chưa có ai)';
  ten.style.cssText = 'font-size:18px;font-weight:600;line-height:1.3';
  cot.append(ten);

  // ⚠ DÒNG PHỤ LÀ SỐ NGƯỜI CON, KHÔNG PHẢI `ghiChuHonNhan(u)`.
  //
  // Bản đầu dùng `ghiChuHonNhan` — cùng cái hàm mà thẻ người dùng để chú thích
  // một người bạn đời — và ảnh `gd-0.png` cho thấy nó kể "đã ly hôn, thứ 2"
  // ngay trên hai hàng bảng nói y hệt điều ấy. Ba lần một tin trong một khung
  // hình cao 200px.
  //
  // Số người con thì không trùng hàng nào trong bảng, và nó làm thêm một việc
  // nữa: nói ra rằng đây là thẻ của một GIA ĐÌNH. Ca `U0024` — cặp một người
  // — lộ ra nhu cầu ấy, vì đầu thẻ lúc đó là đúng một cái tên, đọc lên không
  // khác gì thẻ người.
  //
  // Cặp CHƯA CÓ CON thì không ghi gì: chỗ nói điều đó là nhóm *Con* phía dưới,
  // ngay cạnh cái nút thêm con — nói ở đây nữa là lại trùng.
  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId)).length;
  if (soCon > 0) {
    const d = document.createElement('div');
    d.textContent = soCon + ' người con';
    d.style.cssText = 'font-size:14px;color:#8a8078;margin-top:2px';
    cot.append(d);
  }

  const ma = document.createElement('div');
  ma.textContent = u.id;
  ma.style.cssText = 'font-size:11px;color:#b3aaa0;margin-top:4px;letter-spacing:.05em';
  cot.append(ma);

  dau.append(cot);
  return [dau];
}

/**
 * Bảng của cặp, cùng công tắc "Còn N mục chưa điền" với thẻ người.
 *
 * ⚠ Hàng *"Tình trạng hôn nhân"* KHÔNG BAO GIỜ trống: thiếu `status` thì coi là
 * đang là vợ chồng, đúng cùng phép chuẩn hoá của `union.updateUnion`. Cho nó
 * rơi vào nhóm "chưa điền" là hỏi người dùng một câu mà dữ liệu đã trả lời.
 */
function veHangThongTinCap(u) {
  const bang = document.createElement('div');
  bang.style.cssText = 'margin-top:14px;display:flex;flex-direction:column;gap:1px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'margin-top:8px;padding:0;font:inherit;font-size:12px;color:#8a6a3a;' +
    'background:none;border:none;text-decoration:underline;cursor:pointer;' +
    'touch-action:manipulation;align-self:flex-start';

  const veLaiBang = () => {
    bang.innerHTML = '';
    let soTrong = 0;
    const hang = (nhan, giaTri, coTheDai) => {
      if (veHang(bang, nhan, giaTri, coTheDai)) soTrong++;
    };

    const m = (u && typeof u.marriage === 'object' && u.marriage) ? u.marriage : {};
    hang('Ngày cưới', ghepNgayNoi(m));
    hang('Tình trạng hôn nhân', u.status === 'divorced' ? 'Đã ly hôn' : 'Đang là vợ chồng');
    hang('Ghi chú', u.note, true);

    nut.style.display = soTrong === 0 ? 'none' : '';
    nut.textContent = hienMucTrong
      ? 'Ẩn ' + soTrong + ' mục chưa điền'
      : 'Còn ' + soTrong + ' mục chưa điền';
    nut.setAttribute('aria-label',
      (hienMucTrong ? 'Ẩn ' : 'Hiện ') + soTrong + ' mục chưa điền');
  };

  nut.addEventListener('click', () => { hienMucTrong = !hienMucTrong; veLaiBang(); });
  veLaiBang();

  return [bang, nut];
}

// --- ⚠ VÌ SAO THẺ GIA ĐÌNH KHÔNG CÓ HÀNG "THỨ BẬC" (chốt 21/08/2026) ----
//
// Bản đầu của việc 4 có hàng ấy, kể ra *"vợ / chồng thứ 2"*. Chủ dự án nhìn
// ảnh `gd-0.png` và bác ngay, bằng một câu gọn hơn mọi thứ viết ở đây:
//
//   *"nếu xét góc độ Dũng thì Lan là vợ 2, nếu xét Lan thì Dũng là chồng 1"*
//
// Thứ bậc là một con số CHỈ CÓ NGHĨA khi đọc từ phía một người: "cặp thứ mấy
// CỦA AI". Thẻ gia đình không đứng về phía ai cả — nó nói về cả cặp — nên ở
// đây con số ấy không có mốc để bám vào, và một con số không mốc thì đọc lên
// thế nào cũng có một nửa sai. Quyết định này KHÔNG đổi dù lược đồ dữ liệu
// đổi (xem ngay dưới): chỗ đúng để đọc thứ bậc mãi mãi là thẻ NGƯỜI, nơi
// người đang xem chính là cái mốc — `ghiChuHonNhan(u, personId)` in nó cạnh
// tên người bạn đời.
//
// --- ĐÃ SỬA (23/08/2026, DAC-TA-RANK_V01, Vòng 1–3) --------------------
//
// Câu của chủ dự án ở trên còn lộ ra một khiếm khuyết LƯỢC ĐỒ, không chỉ
// chuyện thẻ gia đình: `rank` cũ lưu MỘT số cho CẢ HAI phía, nên nếu Lan
// cũng có hai đời chồng thì thẻ của Lan sẽ đọc con số ấy thành "Dũng là
// chồng thứ 2" — sai. Đã chữa bằng cách thay `rank` (một số) bằng `ranks`
// (bảng tra khoá theo `personId`, vắng khoá = 1), đọc qua đúng một cửa
// `rankCua(u, personId)` ở `domains/union.js`. `ghiChuHonNhan()` trong file
// này nay BẮT BUỘC nhận `personId` — người đang xem thẻ — làm mốc; xem hàm
// đó và hai nơi gọi nó ngay dưới. Chi tiết đầy đủ: `DAC-TA-RANK_V01.md`.

/**
 * Hai nhóm của thẻ gia đình: Vợ/chồng và Con.
 *
 * ⚠ Các con xếp theo `order` — quyết định 4 ở đầu mục. Người thiếu `order`
 * xuống cuối chứ không lên đầu: thiếu số thứ tự nghĩa là chưa ai xếp họ, và
 * chưa xếp thì đứng sau người đã xếp.
 */
function veNguoiTrongCap(index, u, xuLy) {
  const ra = [];

  const banDoi = [];
  for (const id of Array.isArray(u.partners) ? u.partners : []) {
    themNguoi(banDoi, index, id, '');
  }

  const con = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId))
    .slice()
    .sort((a, b) => soThuTu(a) - soThuTu(b));

  const dsCon = [];
  for (const c of con) {
    themNguoi(dsCon, index, c.personId, chuThichQuanHe(c.relation || 'birth', 'con'));
  }

  ra.push(...veNhom('Vợ / chồng', banDoi, xuLy));
  ra.push(...veNhom('Con', dsCon, xuLy,
                    nutThemConVaoCap(u, xuLy), nutSuaConTrongCap(u, xuLy)));

  if (dsCon.length === 0) {
    const trong = document.createElement('div');
    trong.textContent = 'Cặp này chưa có người con nào trong gia phả.';
    trong.style.cssText =
      'margin-top:14px;font-size:12px;line-height:1.5;color:#8a8078';
    ra.push(trong);
    const them = nutThemConVaoCap(u, xuLy);
    if (them) { them.style.marginTop = '6px'; ra.push(them); }
  }

  return ra;
}

function soThuTu(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

/** Nút *"Thêm người con"*, dùng lại đúng đường thêm con của vòng tròn. */
function nutThemConVaoCap(u, xuLy) {
  if (!xuLy || !xuLy.onThemCon) return null;
  if (!suaDuoc()) return null;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'them-con';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:9px 11px;font-family:inherit;' +
    'font-size:13px;color:#8a8078;border:1px dashed #e6e0d8;border-radius:8px;' +
    'background:none;cursor:pointer;touch-action:manipulation';
  nut.textContent = 'Thêm một người con vào gia đình này';

  nut.addEventListener('click', () => {
    closePersonDetail();
    xuLy.onThemCon(u.id);
  });
  return nut;
}

/**
 * Nút *"Sửa một người con"* — cửa vào NỬA SAU của việc 8 (22/08/2026).
 *
 * ⚠ **Đây là chỗ duy nhất trong app nhìn một người con TỪ PHÍA GIA ĐÌNH.** Lỗ
 * hổng 3 đo được 21/08/2026: quan hệ cha mẹ – con nằm ở CẶP, mà mọi thao tác
 * lại đi từ MỘT CON NGƯỜI. Hệ quả thật: thêm con trước rồi thêm vợ sau thì
 * không có đường nào dời đứa con sang đúng gia đình, ngoài cách gỡ rồi nối lại
 * — hai lần lưu, và giữa hai lần ấy dữ liệu thật trên Drive đang sai.
 *
 * ⚠ **Một nút RIÊNG một dòng, không phải một đích chạm thứ hai nhét vào dòng
 * tên đứa bé.** Hai đích chạm sát nhau trong một dòng cao 44px là mời bấm nhầm
 * — cùng luật đã chốt ở `pages/person-list.js`.
 * Dòng tên đứa bé giữ nguyên việc cũ của nó: mở hồ sơ người ấy.
 *
 * ⚠ **KHÔNG cho nó lên vành vòng tròn**, cùng lý lẽ đã viết ba lần trong file
 * này: vành co từ tám mục xuống sáu ở bước 26 để mỗi mục có 60° thay vì 45°.
 *
 * @returns {HTMLElement|null} null khi cặp chưa có người con nào, hoặc người
 *          đang xem chỉ có quyền đọc — không mọc nút chết nào.
 */
function nutSuaConTrongCap(u, xuLy) {
  if (!xuLy || !xuLy.onSuaCon) return null;
  if (!suaDuoc()) return null;

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;
  if (soCon === 0) return null;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'sua-con';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:9px 11px;font-family:inherit;' +
    'font-size:13px;color:#8a8078;border:1px dashed #e6e0d8;border-radius:8px;' +
    'background:none;cursor:pointer;touch-action:manipulation';
  nut.textContent = soCon === 1
    ? 'Sửa người con này — chuyển sang gia đình khác, đổi con đẻ / con nuôi'
    : 'Sửa một người con — chuyển sang gia đình khác, đổi con đẻ / con nuôi';

  nut.addEventListener('click', () => {
    closePersonDetail();
    xuLy.onSuaCon(u.id);
  });
  return nut;
}

/** Chân thẻ gia đình: Sửa · Sắp thứ tự các con · Đóng. */
function veChanTheCap(u, xuLy) {
  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:16px';

  const mocId = (Array.isArray(u.partners) ? u.partners : [])
    .find((id) => id && state.index.personById.has(id)) || '';

  if (suaDuoc() && xuLy.onSuaCap && mocId) {
    chan.append(nutChan('Sửa gia đình này', true,
      () => { closePersonDetail(); xuLy.onSuaCap(mocId, u.id); }));
  }

  // Chỉ mọc khi có ÍT NHẤT HAI người con — một mình thì không có thứ tự nào để
  // sắp. Nút cùng điều kiện trên thẻ NGƯỜI đã gỡ 22/08/2026; thẻ GIA ĐÌNH
  // này nay là cửa nhìn thấy được duy nhất của màn hình Sắp thứ tự.
  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;
  if (suaDuoc() && xuLy.onSapThuTu && soCon >= 2 && mocId) {
    chan.append(nutChan('Sắp thứ tự các con', false,
      () => { closePersonDetail(); xuLy.onSapThuTu(mocId, 'con'); }));
  }

  chan.append(nutChan('Đóng', false, () => closePersonDetail()));

  const boc = document.createElement('div');
  boc.append(chan);
  const xoa = nutXoaCap(u, xuLy);
  if (xoa) boc.append(xoa);
  return boc;
}

/**
 * Nút *Xoá gia đình này* — một DÒNG RIÊNG dưới hàng nút đi lại (22/08/2026).
 *
 * ⚠ **Không nhét vào hàng nút cùng với *Đóng*.** Hàng ấy toàn nút đi lại, và
 * *Đóng* là nút người ta bấm theo phản xạ khi xem xong. Một nút đỏ ngồi cạnh
 * nó là mời bấm nhầm — cùng luật đã giữ cho hàng chân của form sửa hồ sơ.
 *
 * ⚠ **Xoá một CẶP KHÔNG xoá ai cả.** Hai người vẫn nguyên trong gia phả, chỉ
 * là thôi làm vợ chồng và thôi làm cha mẹ của những người con đứng dưới. Câu
 * ấy phải nằm ngay trên nút, không đợi tới hộp xác nhận: người bấm cần biết
 * trước khi bấm, chứ không phải sau.
 *
 * ⚠ Nó chỉ là CỬA. Hộp xác nhận và đường ghi nằm ở `chuyenVaoThungRac()` —
 * cùng chỗ với mọi đường ghi khác, và nó đã biết nhận cả mã `U….`
 *
 * @returns {HTMLElement|null}
 */
function nutXoaCap(u, xuLy) {
  if (!xuLy || !xuLy.onXoaCap) return null;
  if (!suaDuoc()) return null;

  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:14px;border-top:1px solid #f0ebe4;padding-top:12px';

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;

  const giai = document.createElement('div');
  giai.textContent = soCon > 0
    ? 'Xoá gia đình này KHÔNG xoá ai cả — hai người vẫn nguyên trong gia phả, ' +
      'chỉ thôi làm vợ chồng và thôi làm cha mẹ của ' + soCon + ' người con ' +
      'đứng dưới. Lấy lại được từ thùng rác.'
    : 'Xoá gia đình này KHÔNG xoá ai cả — hai người vẫn nguyên trong gia phả, ' +
      'chỉ thôi làm vợ chồng. Lấy lại được từ thùng rác.';
  giai.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-bottom:8px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'xoa-cap';
  nut.textContent = 'Xoá gia đình này khỏi gia phả';
  nut.style.cssText =
    'display:block;width:100%;min-height:44px;padding:8px 14px;font-size:14px;' +
    'font-family:inherit;text-align:center;border-radius:9px;cursor:pointer;' +
    'touch-action:manipulation;' +
    'background:#fbf0ec;color:#8a3a2a;border:1px solid #f0d8d0;font-weight:600';

  nut.addEventListener('click', () => { closePersonDetail(); xuLy.onXoaCap(u.id); });

  boc.append(giai, nut);
  return boc;
}

// ============================================================
// Các mảng của thẻ
// ============================================================

/**
 * Đầu thẻ: ảnh, họ tên, đời sống, mã người.
 *
 * @param {object} p
 * @param {boolean} [coAnh]  MENU truyền `false` — tâm vòng tròn của nó đã là
 *        ảnh rồi, xem `openPersonMenu()`.
 */
function veDauThe(p, coAnh = true) {
  const ra = [];

  // Ảnh bên trái, tên và ngày tháng bên phải — bước 28. Xếp ngang chứ không
  // xếp dọc: thẻ này đọc trên điện thoại, mà một tấm ảnh chiếm trọn bề ngang
  // ở đầu thẻ thì đẩy toàn bộ phần quan hệ xuống dưới màn hình.
  const dau = document.createElement('div');
  dau.style.cssText = 'display:flex;gap:12px;align-items:flex-start';

  if (coAnh) dau.append(veAnhTron(p, 60));

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0';

  const ten = document.createElement('div');
  ten.textContent = fullName(p);
  ten.style.cssText = 'font-size:19px;font-weight:600;line-height:1.3';
  cot.append(ten);

  const song = doiSongNguoi(p);
  if (coGiaTri(song)) {
    const d = document.createElement('div');
    d.textContent = song;
    d.style.cssText = 'font-size:14px;color:#8a8078;margin-top:2px';
    cot.append(d);
  }

  // Mã người: nhỏ và mờ, nhưng phải có. Đây là thứ duy nhất phân biệt được hai
  // cụ trùng tên trùng năm sinh, và là thứ chủ dự án đọc khi đối chiếu dữ liệu.
  const ma = document.createElement('div');
  ma.textContent = p.id;
  ma.style.cssText = 'font-size:11px;color:#b3aaa0;margin-top:4px;letter-spacing:.05em';
  cot.append(ma);

  dau.append(cot);
  ra.push(dau);

  return ra;
}

/**
 * VÒNG ẢNH tròn cho màn hình HTML — thẻ thông tin và tâm menu vòng tròn.
 *
 * Cùng một luật hai lớp với `render.js`, nhưng dựng bằng HTML: bóng người mặc
 * định nằm sẵn trong `<img>`, ảnh thật chỉ THAY vào khi đã tải về được.
 *
 * ⚠ **Thử bằng một `Image()` rời, không gán thẳng rồi bắt `onerror`.** Gán
 * thẳng thì trong khoảnh khắc ảnh chưa về (hoặc về hỏng) người dùng thấy một ô
 * trống — và trên mạng chậm, khoảnh khắc ấy dài. Cách này thì bóng người hiện
 * ngay từ đầu, ảnh thật thế chỗ khi nào nó thật sự sẵn sàng.
 *
 * @param {object} p   bản ghi người
 * @param {number} co  đường kính, pixel. Xin Drive bản GẤP ĐÔI — màn hình
 *                     điện thoại có tỷ lệ pixel gấp 2–3 lần.
 */
function veAnhTron(p, co) {
  const boc = document.createElement('div');
  boc.style.cssText =
    'flex:0 0 auto;width:' + co + 'px;height:' + co + 'px;border-radius:50%;' +
    'overflow:hidden;box-shadow:0 0 0 1.5px #ffffff, 0 0 0 3px ' + mauVien(p) + '55';

  const im = document.createElement('img');
  im.src = anhMacDinhUri(p && p.sex, mauVien(p));
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  boc.append(im);

  const anhThat = p && typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, co * 2);
    const thu = new Image();
    thu.onload = () => {
      if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
    };
    thu.src = duong;
  }

  return boc;
}

function veHangThongTin(p) {
  const bang = document.createElement('div');
  bang.style.cssText = 'margin-top:14px;display:flex;flex-direction:column;gap:1px';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'margin-top:8px;padding:0;font:inherit;font-size:12px;color:#8a6a3a;' +
    'background:none;border:none;text-decoration:underline;cursor:pointer;' +
    'touch-action:manipulation;align-self:flex-start';

  const veLaiBang = () => {
    bang.innerHTML = '';
    const soTrong = doDayBang(bang, p);
    // Không thiếu mục nào thì KHÔNG có câu hỏi nào để hỏi — giấu luôn công tắc.
    // Một dòng "Còn 0 mục chưa điền" là một dòng chữ nói rằng không có gì để nói.
    nut.style.display = soTrong === 0 ? 'none' : '';
    nut.textContent = hienMucTrong
      ? 'Ẩn ' + soTrong + ' mục chưa điền'
      : 'Còn ' + soTrong + ' mục chưa điền';
    nut.setAttribute('aria-label',
      (hienMucTrong ? 'Ẩn ' : 'Hiện ') + soTrong + ' mục chưa điền');
  };

  nut.addEventListener('click', () => { hienMucTrong = !hienMucTrong; veLaiBang(); });
  veLaiBang();

  const ra = [bang, nut];

  // "Bị ẩn" KHÔNG phải "còn thiếu" — hai thứ trông giống hệt nhau trên màn
  // hình mà kết luận ngược nhau: một bên app chạy đúng, một bên gia phả cần bổ
  // sung. Câu này là chỗ duy nhất nói được sự khác biệt đó.
  if (state.daLocNguoiConSong && p.living === true) {
    const nhac = document.createElement('div');
    nhac.textContent =
      'Người này còn sống nên máy chủ đã lược bớt chi tiết trước khi gửi về. ' +
      'Đây không phải là gia phả thiếu thông tin.';
    nhac.style.cssText =
      'margin-top:12px;padding:8px 10px;font-size:12px;line-height:1.5;' +
      'color:#8a8078;background:#faf8f5;border-radius:8px';
    ra.push(nhac);
  }

  return ra;
}

/**
 * Đổ mười sáu hàng vào bảng, theo trạng thái công tắc.
 *
 * @returns {number} SỐ MỤC CÒN TRỐNG — đếm đủ cả khi công tắc đang mở, vì con
 *          số ấy là thứ cái nút phải kể ra ở cả hai trạng thái.
 */
function doDayBang(bang, p) {
  let soTrong = 0;
  const hang = (nhan, giaTri, coTheDai) => {
    if (veHang(bang, nhan, giaTri, coTheDai)) soTrong++;
  };

  // ⚠ Nhãn loại tên đọc qua `nhanLoaiTenPhu` chứ KHÔNG in thẳng cái mã ra thẻ.
  // Từ hôm nay form ghi được `phap_danh` xuống dữ liệu, nên bản cũ — in nguyên
  // `n.loai` — sẽ kể ra "Thích Minh Tâm (phap_danh)" giữa một cái thẻ toàn
  // tiếng Việt. Trước hôm nay chưa ai thấy vì chưa bản ghi nào có tên phụ.
  const tenKhac = getAlternateNames(p)
    .map((n) => n.ten + (coGiaTri(n.loai) ? ' (' + nhanLoaiTenPhu(n.loai) + ')' : ''))
    .join(' · ');

  hang('Tên khác', tenKhac);
  hang('Giới tính', GIOI[p.sex] || '');
  hang('Sinh', ghepNgayNoi(p.birth));
  hang('Mất', ghepNgayNoi(p.death));
  hang('An táng', p.burialPlace);
  hang('Ngày giỗ', ngayGio(p));
  hang(tuoiTho(p).nhan, tuoiTho(p).giaTri);

  // --- BỘ THÔNG DỤNG (CAU-TRUC-DU-LIEU_V03) ------------------------------
  //
  // ⚠ Tám hàng này là chỗ luật MỚI tốn nhất: bản ghi nào cũng bỏ trống gần hết
  // chúng. Đó là điều đã cân nhắc và chấp nhận — xem ghi chú đầu file.
  //
  // ⚠ Thứ tự KHÔNG giống thứ tự các ô trong form, và đó là chủ ý. Form HỎI nên
  // xếp theo nhóm câu hỏi; thẻ KỂ nên xếp theo thứ tự người ta muốn biết về một
  // người: làm gì, học gì, ở đâu, thờ ai.
  hang('Chức tước', p.title);
  hang('Nghề nghiệp', p.occupation);
  hang('Học vấn', p.education);
  hang('Quê quán', p.residence);
  hang('Dân tộc', p.nationality);
  hang('Tôn giáo', p.religion);
  hang('Đời', doiCua(p));
  hang('Chi / nhánh', p.vn && p.vn.branch);

  hang('Ghi chú', p.note, true);

  return soTrong;
}

/** "12/03/1927 · Hà Nội" — phần nào trống thì bỏ hẳn, không để dấu chấm lơ lửng. */
/**
 * Đời, kể ra thành chữ. Số 0 hoặc không phải số thì coi như CHƯA AI GHI, và
 * `veHang()` tính hàng ấy là một MỤC CÒN TRỐNG — chứ không kể ra "Đời 0".
 *
 * ⚠ Trả về *"thứ 5"* chứ không phải *"Đời thứ 5"*: nhãn của hàng đã là chữ
 * *Đời* rồi, nên lặp lại nó trong giá trị thành *"Đời — Đời thứ 5"*. Cũng
 * không trả về mỗi con số: *"thứ"* là chữ nói rằng đây là thứ bậc, không
 * phải số lượng.
 */
function doiCua(p) {
  const n = p && p.vn ? Number(p.vn.generation) : NaN;
  return (Number.isFinite(n) && n > 0) ? ('thứ ' + n) : '';
}

function ghepNgayNoi(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return '';
  return [formatDate(khoiNgay), khoiNgay.place].filter(coGiaTri).join(' · ');
}

/**
 * Tuổi thọ. Nhãn đổi theo việc người đó còn sống hay đã mất — "Hưởng thọ 74
 * tuổi" nói về một người đã mất, dùng nhầm cho người đang sống là thất lễ.
 *
 * Không có đủ mốc thì trả về chuỗi rỗng và `veHang` tự ẩn cả hàng.
 */
function tuoiTho(p) {
  const t = calcAge(p.birth, p.death, p.living === true);
  if (!t) return { nhan: 'Tuổi', giaTri: '' };
  return {
    nhan: t.denHomNay ? 'Tuổi' : 'Hưởng thọ',
    giaTri: (t.xapXi ? 'khoảng ' : '') + t.tuoi + ' tuổi',
  };
}

/**
 * Một hàng nhãn — giá trị.
 *
 * @returns {boolean} hàng này có phải MỘT MỤC CÒN TRỐNG không. Nơi gọi cộng
 *          dồn để biết con số kể trên công tắc — xem `doDayBang`.
 *
 * Công tắc đang ĐÓNG thì mục trống không được vẽ gì cả: đó là luật 14/08/2026
 * và nó vẫn là mặc định. Công tắc MỞ thì vẽ, nhãn mờ đi và giá trị là dấu "—".
 *
 * Giới tính `sex: 'U'` rơi vào đúng đường này: `GIOI['U']` là `undefined`,
 * thành chuỗi rỗng, nên nó được TÍNH LÀ một mục còn trống — đúng ý, vì "U"
 * nghĩa là CHƯA BIẾT, và đó là thứ người đi rà cần thấy.
 *
 * ⚠ HÀNG TRỐNG PHẢI NHÌN RA NGAY LÀ HÀNG TRỐNG, không được chỉ hơi nhạt hơn
 * một chút. Nhãn của nó dùng màu mờ nhất trong bảng màu của thẻ; ngay cả khi
 * công tắc mở, đây vẫn là hàng người ta lướt qua để tìm hàng có chữ.
 *
 * `coTheDai` cho phép hàng đó tự thu gọn khi quá dài — xem `thuGonChu`.
 */
function veHang(bang, nhan, giaTri, coTheDai) {
  const trong = !coGiaTri(giaTri);
  if (trong && !hienMucTrong) return true;

  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;gap:10px;align-items:baseline;padding:6px 0;' +
    'border-top:1px solid #f0ebe4';

  const n = document.createElement('div');
  n.textContent = nhan;
  n.style.cssText = 'flex:0 0 72px;font-size:12px;line-height:1.35;' +
    (trong ? 'color:#c4bcb2' : 'color:#8a8078');

  const g = document.createElement('div');
  g.style.cssText = 'flex:1 1 auto;font-size:14px;line-height:1.45;word-break:break-word' +
    (trong ? ';color:#c4bcb2' : '');

  if (trong) {
    g.textContent = '—';
  } else {
    const chu = String(giaTri).trim();
    if (coTheDai) thuGonChu(g, chu); else g.textContent = chu;
  }

  hang.append(n, g);
  bang.append(hang);
  return trong;
}

const DAI_TOI_DA = 180;   // ký tự — quá mức này thì thu gọn

/**
 * Ghi chú dài thì cắt bớt, kèm nút "xem thêm".
 *
 * Điểm dừng của chat 1.6 là *"xem xong một người là biết đủ, không phải cuộn
 * tìm"*. Một ghi chú tiểu sử vài trăm chữ đẩy cả ba nhóm quan hệ xuống dưới
 * đáy thẻ, và người dùng phải cuộn mới thấy con mình là ai — đúng cái điểm
 * dừng ấy hỏng. Ca lộ ra chuyện này là `P0020`, bản ghi mang ghi chú cảnh báo
 * dài nhất trong dữ liệu.
 *
 * Cắt theo RANH GIỚI TỪ, không cắt giữa chữ.
 */
function thuGonChu(vao, chu) {
  if (chu.length <= DAI_TOI_DA) { vao.textContent = chu; return; }

  let cat = chu.lastIndexOf(' ', DAI_TOI_DA);
  if (cat < DAI_TOI_DA / 2) cat = DAI_TOI_DA;

  const doan = document.createElement('span');
  doan.textContent = chu.slice(0, cat) + '… ';

  const them = document.createElement('button');
  them.type = 'button';
  them.textContent = 'xem thêm';
  them.style.cssText =
    'padding:0;font:inherit;font-size:13px;color:#8a6a3a;background:none;' +
    'border:none;text-decoration:underline;cursor:pointer;touch-action:manipulation';
  them.addEventListener('click', () => {
    vao.textContent = chu;   // mở ra rồi thì không thu lại nữa — không ai thu lại
  });

  vao.append(doan, them);
}

// ============================================================
// Ba nhóm quan hệ
// ============================================================

/**
 * Cha mẹ · Vợ/chồng · Con — mỗi người một nút bấm được.
 *
 * Đọc thẳng từ `index`, không gọi `computeVisibleSet`: thẻ nói về CON NGƯỜI
 * đó, không nói về sơ đồ đang vẽ. Người đang bị nốt cụt che vẫn phải hiện ra
 * ở đây — đó chính là lúc người dùng cần biết họ tồn tại nhất.
 *
 * ⚠ Đây KHÔNG phải một phép duyệt đồ thị, nên không cần tập `visited`: nó chỉ
 * đi đúng MỘT bước từ người đang xem và dừng, không đi tiếp từ những người tìm
 * được. Ai sửa file này mà cho nó đi sâu thêm một bậc (ví dụ "hiện luôn các
 * cháu") thì phải thêm `visited` — gia phả là đồ thị có vòng, và bản dữ liệu
 * làm việc đang có sẵn hai vòng.
 */
function veQuanHe(index, p, xuLy) {
  const ra = [];
  const chaMe = [];
  const banDoi = [];
  const con = [];

  for (const unionId of index.unionsAsChild.get(p.id) || []) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    const muc = (Array.isArray(u.children) ? u.children : [])
      .find((c) => c && c.personId === p.id);
    // ⚠ Đọc CẢ NĂM mã, không riêng `'adopted'` (sửa 21/08/2026, việc 3). Bản
    // cũ chỉ nhận ra con nuôi; `step` · `foster` · `thua_tu` rơi vào nhánh
    // rỗng và biến mất khỏi thẻ — người ta đánh dấu "con riêng" trong form rồi
    // mở thẻ ra thấy y hệt con đẻ. Lỗi ấy nằm im được vì tới trước việc 3 chưa
    // đường nào ghi nổi ba mã kia, đúng hình dạng của lỗi tên phụ ở bước 33.
    //
    // `chuThichQuanHe` tự trả chuỗi rỗng cho `birth` — xem ghi chú của nó.
    const ghiChu = chuThichQuanHe((muc && muc.relation) || 'birth', 'chaMe');
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      themNguoi(chaMe, index, id, ghiChu);
    }
  }

  for (const unionId of index.unionsAsPartner.get(p.id) || []) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (id !== p.id) themNguoi(banDoi, index, id, ghiChuHonNhan(u, p.id));
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      themNguoi(con, index, c && c.personId,
                chuThichQuanHe((c && c.relation) || 'birth', 'con'));
    }
  }

  // --- THẺ NGƯỜI CHỈ CÒN ĐỌC (chủ dự án chốt 22/08/2026) ----------------
  //
  // Hai nút *"Xem gia đình với…"* và *"Sắp thứ tự các con"* đã GỠ khỏi đây.
  // Chúng nói lại đúng những điều mà màn hình *Sửa thông tin gia đình* vừa nói,
  // và ba chỗ cùng kể một chuyện là đúng thứ làm app khó dùng.
  //
  // Ba nhóm quan hệ ở dưới GIỮ NGUYÊN, và giữ cả cú bấm: bấm một cái tên là đi
  // tới người ấy. Đó là ĐỌC — đúng việc của thẻ này. Thứ bị gỡ chỉ là hai cửa
  // dẫn sang việc SỬA.
  //
  // ⚠ HAI ĐƯỜNG ẤY KHÔNG MẤT, CHÚNG DỜI CHỖ. Gỡ suông là mất thật hai thứ:
  // ngày cưới / ảnh cưới / ghi chú của một cặp (chỉ còn tới được từ màn Rà
  // soát), và cửa nhìn thấy được của cử chỉ CHẠM GIỮ — mà luật chat 1.6 nói
  // một cử chỉ ẩn phải LUÔN có một cái nút đi kèm. Cả hai nay nằm trong màn
  // hình gia đình, ở nút *"Ngày cưới · ảnh cưới · sắp thứ tự các con"* của
  // từng khối cặp.
  ra.push(...veNhom('Cha mẹ', chaMe, xuLy));
  ra.push(...veNhom('Vợ/chồng', banDoi, xuLy));
  ra.push(...veNhom('Con', con, xuLy));
  return ra;
}

/**
 * Ghi chú cạnh tên bạn đời. Thứ bậc vợ cả/vợ thứ đọc qua `rankCua(u, personId)`
 * — KHÔNG phải `partnerOrder`, thứ chỉ nói vị trí trái/phải trên sơ đồ. Hai
 * cái khác nhau, lẫn vào nhau là nói sai về gia đình người ta.
 *
 * `personId` BẮT BUỘC và PHẢI là người đang xem thẻ — chính người đó là cái
 * mốc. Truyền nhầm thành người bạn đời thì câu chữ đổi phía, đúng lỗi mà
 * DAC-TA-RANK mục 1 mô tả (*"nếu xét Dũng thì Lan là vợ 2, nếu xét Lan thì
 * Dũng là chồng 1"*).
 */
function ghiChuHonNhan(u, personId) {
  const phan = [];
  if (u.status === 'divorced') phan.push('đã ly hôn');
  const th = rankCua(u, personId);
  if (th > 1) phan.push('thứ ' + th);
  return phan.join(', ');
}

function themNguoi(vao, index, id, ghiChu) {
  if (!id || !index.personById.has(id)) return;
  if (vao.some((m) => m.id === id)) return;   // hai bộ cha mẹ chung một người
  vao.push({ id, ghiChu: ghiChu || '' });
}

function veNhom(tieuDe, danhSach, xuLy, ...cacNutPhu) {
  if (danhSach.length === 0) return [];   // nhóm rỗng thì ẩn cả nhóm

  const nhan = document.createElement('div');
  nhan.textContent = tieuDe;
  nhan.style.cssText =
    'margin-top:14px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:#8a8078';

  const hop = document.createElement('div');
  hop.style.cssText = 'display:flex;flex-direction:column;gap:6px';

  for (const muc of danhSach) {
    const p = state.index.personById.get(muc.id);
    const song = doiSongNguoi(p);
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.style.cssText =
      'display:block;width:100%;text-align:left;padding:9px 11px;font-family:inherit;' +
      'font-size:14px;color:#2a2622;border:1px solid #e6e0d8;border-radius:8px;' +
      'background:#fff;cursor:pointer;touch-action:manipulation';

    const ten = document.createElement('div');
    ten.textContent = fullName(p);

    nut.append(ten);
    const phu = [song, muc.ghiChu].filter(coGiaTri).join('  ·  ');
    if (coGiaTri(phu)) {
      const d = document.createElement('div');
      d.textContent = phu;
      d.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px';
      nut.append(d);
    }

    nut.addEventListener('click', () => {
      closePersonDetail();
      if (xuLy.onChonNguoi) xuLy.onChonNguoi(muc.id);
    });
    hop.append(nut);
  }

  for (const n of cacNutPhu) if (n) hop.append(n);
  return [nhan, hop];
}

/**
 * Chân THẺ THÔNG TIN: chỉ ba nút đi lại. Vòng tròn KHÔNG nằm ở đây.
 *
 * Từ 20/08/2026 thẻ thông tin và menu vòng tròn là HAI màn hình, không phải một
 * — xem ghi chú *"Hai màn hình, hai câu hỏi"* ở đầu file. Nút *"Sửa gia phả"*
 * là đường đi từ thẻ sang menu; nó gọi thẳng `openPersonMenu` vì cả hai sống
 * trong cùng file này, không phải một lớp khác.
 */
function veChanThe(p, xuLy) {
  const boc = document.createElement('div');
  const coQuyen = suaDuoc();

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';

  // --- HAI CỬA SỬA, ĐỨNG CẠNH NHAU (chủ dự án chốt 22/08/2026) ----------
  //
  // *"khi bấm thông tin 1 người từ menu vòng tròn sẽ cần 2 nút"*. Trước hôm nay
  // thẻ này chỉ có MỘT nút sửa — *Sửa hồ sơ* — còn mọi việc đụng tới QUAN HỆ
  // thì nằm sau nút *Các việc khác* → vòng tròn → Kết nối / Gỡ nối. Bốn cú chạm
  // để tới, và tới nơi thì hai mục ấy lại hỏi từ phía MỘT CON NGƯỜI chứ không
  // từ phía gia đình.
  //
  // Hai nút này chia đôi đúng theo cách người ta nghĩ về một người trong gia
  // phả, và ranh giới ấy trùng khít với ranh giới của DỮ LIỆU:
  //
  //   · *Sửa thông tin cá nhân* → bản ghi NGƯỜI  — tên, ngày sinh, ảnh, ghi chú
  //   · *Sửa thông tin gia đình* → bản ghi CẶP    — cha mẹ, vợ/chồng, con cái
  //
  // ⚠ Tên cũ *"Sửa hồ sơ"* bỏ hẳn: đứng cạnh *"Sửa thông tin gia đình"* thì
  // "hồ sơ" không nói ra được rằng nó KHÔNG đụng tới quan hệ.
  if (xuLy.onSuaNguoi) {
    chan.append(nutChan(
      coQuyen ? 'Sửa thông tin cá nhân' : 'Sửa thông tin cá nhân — bạn chỉ có quyền xem',
      false,
      () => { closePersonDetail(); xuLy.onSuaNguoi(p.id); },
      !coQuyen,
    ));
  }

  // ⚠ Nút này KHÔNG đòi `suaDuoc()` để mọc ra, khác nút bên cạnh: màn hình gia
  // đình cũng là chỗ ĐỌC ra người này đứng ở những nhà nào, và người chỉ có
  // quyền xem vẫn phải xem được điều đó. Bên trong nó, từng việc sửa mới hỏi
  // quyền — cùng lối đã chốt cho thẻ gia đình.
  if (xuLy.onSuaGiaDinh) {
    chan.append(nutChan('Sửa thông tin gia đình', false,
      () => { closePersonDetail(); xuLy.onSuaGiaDinh(p.id); }));
  }

  // Đường quay về vòng tròn. KHÔNG gọi là "Sửa gia phả" nữa: đứng cạnh
  // "Sửa hồ sơ" thì hai cái tên chỉ khác nhau một chữ, mà việc thì khác hẳn.
  chan.append(nutChan('Các việc khác', false, () => openPersonMenu(p.id, xuLy)));

  chan.append(
    nutChan('Đưa ra giữa sơ đồ', true, () => {
      closePersonDetail();
      if (xuLy.onChonNguoi) xuLy.onChonNguoi(p.id);
    }),
    nutChan('Đóng', false, () => closePersonDetail()),
  );
  boc.append(chan);

  return boc;
}

// ============================================================
// MENU VÒNG TRÒN — tám việc
// ============================================================
//
// Bắt chước Quick Family Tree: người ở GIỮA, sáu việc quanh vành. Hai điều nhớ
// được mà không phải học, và đó là toàn bộ lý do chọn hình tròn thay vì một
// danh sách dọc:
//
//   · TRÊN là cha mẹ, DƯỚI là con — đúng chiều của chính cái sơ đồ đằng sau;
//   · NỬA PHẢI là xem và nối thêm, NỬA TRÁI là sửa và bỏ đi. Hai việc bỏ đi
//     (Gỡ nối · Xoá) nằm gọn một bên và tô đỏ.
//
// ⚠ **TÂM VÒNG TRÒN LÀ ẢNH NGƯỜI, VÀ BẤM VÀO LÀ XEM THÔNG TIN.** Tâm là đích
// chạm dễ trúng nhất, nên nó mang việc làm nhiều nhất — mà việc ấy là XEM. Bấm
// vào mặt một người để xem người ấy là chuyện không phải học. Chữ *"Thông tin"*
// nằm dưới vòng tròn vì **ảnh không tự nói ra rằng nó bấm được**.
//
// ⚠ **Vành chỉ còn những việc đụng tới QUAN HỆ.** *Thông tin* vào tâm, *Sửa hồ
// sơ* vào thẻ — cả hai nói về một mình con người ấy, không nói về chỗ họ đứng
// trong họ. Nhờ đó vành từ tám xuống sáu, và 60° rộng rãi hơn hẳn 45°: bản tám
// mục có ba cặp nhãn đè lên vòng tròn của mục kế, bản sáu mục thì không.
//
// ⚠ Đánh đổi phải nói ra: một danh sách dọc sáu dòng thì DỄ ĐỌC hơn vòng tròn,
// nhất là với chữ Việt có dấu ở cỡ 11px. Đổi lại, vòng tròn cho mỗi việc một
// CHỖ ĐỨNG cố định, và người dùng hằng ngày bấm theo trí nhớ vị trí chứ không
// đọc lại nhãn. Vì thế mọi đích chạm ở đây rộng 70px — vượt mức 44px tối thiểu
// — và nhãn nằm NGOÀI vòng tròn chứ không nhét vào trong.
//
// ⚠ `left` và `top` đều đặt bằng PHẦN TRĂM, cộng `aspect-ratio` giữ chiều cao
// co theo bề ngang. Thẻ rộng 324px trên màn hình 360px nhưng chỉ còn 244px trên
// màn hình 320px; đo theo phần trăm thì hình học GIỐNG NHAU ở mọi bề ngang, nên
// không chồng nhau ở khổ rộng nghĩa là không chồng nhau ở mọi khổ.

const TY_LE_KHUNG = '280 / 320';   // khung chuẩn 280 × 320px
const RONG_MUC    = 25;      // % — 70/280
const RONG_TRON   = 18.57;   // % — 52/280
const RONG_GIUA   = 27.14;   // % — 76/280 (vòng tròn ảnh ở tâm)
const TREN_GIUA   = 33.13;   // % — 106/320

/**
 * SÁU việc quanh vành, cách đều 60°, bán kính 118px. `x` là % bề ngang, `top`
 * là % chiều cao — tính sẵn từ góc để khỏi phải chạy lượng giác trong lúc vẽ.
 *
 *            -90 + Cha mẹ
 *   -150 Xoá              -30 + Vợ chồng
 *            [ẢNH · Thông tin]
 *   +150 Gỡ nối            +30 Kết nối
 *            +90 + Con
 *
 * ⚠ **Vành chỉ giữ những việc đụng tới QUAN HỆ.** *Thông tin* đã vào TÂM,
 * *Sửa hồ sơ* đã vào THẺ — cả hai đều nói về một mình con người ấy, không nói
 * về chỗ họ đứng trong họ. Nhờ đó vành từ tám xuống sáu, và sáu mục cách nhau
 * 60° thì rộng rãi hơn hẳn tám mục cách nhau 45°: hết cảnh nhãn của mục này đè
 * lên vòng tròn của mục kế (ba cặp hỏng ở bản tám mục).
 */
const VANH = [
  { x: 50,   top: 0,     bieuTuong: '⬆', chu: '+ Cha mẹ',   viec: 'chaMe'  },
  { x: 86.5, top: 18.44, bieuTuong: '💍', chu: '+ Vợ chồng', viec: 'banDoi' },
  { x: 86.5, top: 55.31, bieuTuong: '🔗', chu: 'Kết nối',    viec: 'ketNoi' },
  { x: 50,   top: 73.75, bieuTuong: '⬇', chu: '+ Con',      viec: 'con'    },
  { x: 13.5, top: 55.31, bieuTuong: '✂', chu: 'Gỡ nối',     viec: 'goNoi', do: true },
  { x: 13.5, top: 18.44, bieuTuong: '🗑', chu: 'Xoá',       viec: 'xoa',   do: true },
];

/**
 * Mở MENU của một người — cửa mặc định của cú chạm giữ và cú bấm chuột phải.
 *
 * @param {string} personId
 * @param {object} [xuLy] cùng bộ hàm xử lý với `openPersonDetail`
 *
 * ⚠ Dùng chung `lopPhu` và `closePersonDetail()` với thẻ thông tin, nên hai
 * màn hình **không bao giờ chồng lên nhau**: mở cái này là cái kia đóng.
 */
export function openPersonMenu(personId, xuLy = {}) {
  closePersonDetail();

  const index = state.index;
  const p = index && index.personById.get(personId);
  if (!p) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-menu-nguoi';
  hop.style.cssText = KIEU_HOP + 'max-width:' + rongHop(340, 420, 46) + ';';

  // KHÔNG vẽ ảnh ở đầu MENU — tâm vòng tròn ngay bên dưới đã là ảnh. Cùng một
  // khuôn mặt hai lần trong một hộp rộng 340px thì cái ở trên chỉ làm loãng cái
  // ở giữa, mà cái ở giữa mới là nút bấm được.
  hop.append(...veDauThe(p, false));

  // ⚠ KHÔNG còn "chỗ hiện bảng chọn phụ" ở đây (bỏ ở bước 65). Bảng *"Thêm con
  // vào cặp nào?"* từng mọc ra dưới vòng tròn rồi biến mất khi form mở — chọn
  // nhầm thì phải đóng form, mở lại thẻ, bấm lại vành. Nay câu hỏi ấy là một
  // khối TRONG form (`person-edit.js`, luật 13), sửa lại được bất cứ lúc nào
  // trước khi bấm.
  hop.append(renderActionMenu(p, xuLy));

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:14px';
  chan.append(
    nutChan('Đưa ra giữa sơ đồ', true, () => {
      closePersonDetail();
      if (xuLy.onChonNguoi) xuLy.onChonNguoi(p.id);
    }),
    nutChan('Đóng', false, () => closePersonDetail()),
  );
  hop.append(chan);

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonDetail(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);
}

/**
 * Vẽ menu vòng tròn. Trả về một khối luôn vẽ được — không có nhánh nào trả về
 * chuỗi rỗng, vì một cái menu mất hẳn phần hành động thì người dùng tưởng app
 * hỏng chứ không đọc ra "bạn không có quyền".
 *
 * ⚠ Mục nào mà nơi gọi KHÔNG đưa hàm xử lý thì mục ấy mờ đi và không bấm được,
 * chứ không biến mất. Sáu chỗ đứng phải cố định thì trí nhớ vị trí mới dùng
 * được; một vành lúc sáu nút lúc bốn nút là một vành khác nhau mỗi lần mở.
 *
 * ⚠ *Thông tin* ở TÂM là ngoại lệ duy nhất — nó **luôn bấm được**, kể cả khi
 * chỉ có quyền xem, vì nó không sửa gì cả. Sáu mục quanh vành đều ghi dữ liệu.
 */
function renderActionMenu(p, xuLy) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:14px';

  const coQuyen = suaDuoc();

  if (!coQuyen) {
    const nhac = document.createElement('div');
    nhac.textContent =
      'Bạn chỉ có quyền xem gia phả, nên sáu việc quanh vòng tròn chưa dùng ' +
      'được — chỉ còn "Thông tin" ở giữa. Cần sửa thật thì nhờ người quản lý ' +
      'đổi quyền trên Google Drive.';
    nhac.style.cssText =
      'margin-bottom:6px;padding:8px 10px;font-size:12px;line-height:1.5;' +
      'color:#8a8078;background:#faf8f5;border-radius:8px';
    boc.append(nhac);
  }

  const vong = document.createElement('div');
  // Mốc để bài kiểm hành vi tìm ra vòng tròn, và để đo xem có nút nào tràn ra
  // ngoài hộp trên màn hình hẹp không — thứ chỉ đo được trong trình duyệt thật.
  vong.id = 'giapha-vong-tron';
  vong.style.cssText =
    'position:relative;width:100%;max-width:' + rongHop(280, 360, 26) + ';' +
    'margin:0 auto;aspect-ratio:' + TY_LE_KHUNG + ';';

  vong.append(nutTam(p, xuLy));
  for (const m of VANH) vong.append(nutVanh(m, p, xuLy, coQuyen));

  boc.append(vong);
  return boc;
}

/**
 * TÂM vòng tròn: **ẢNH người, và bấm vào là xem Thông tin.**
 *
 * Chốt 20/08/2026. Ba lý do, và lý do thứ ba mới là lý do thật:
 *
 * 1. Tâm là đích chạm **dễ trúng nhất** của cả vòng tròn, nên nó phải mang việc
 *    làm nhiều nhất — mà việc ấy là XEM.
 * 2. Bấm vào MẶT một người để xem người ấy là chuyện không phải học.
 * 3. Trước đó tâm là một khối chữ **không bấm được** nằm giữa sáu bảy cái nút.
 *    Người dùng sẽ chạm vào nó, và không có gì xảy ra — một vùng chết ngay giữa
 *    chỗ dễ trúng nhất là thứ tệ hơn cả một nút xấu.
 *
 * Chữ *"Thông tin"* nằm DƯỚI vòng tròn, cùng khuôn với sáu mục quanh vành: ảnh
 * không tự nói ra rằng nó bấm được, còn cái nhãn thì có.
 *
 * ⚠ **Bước 28 đã thay chỗ này bằng ẢNH THẬT** — đúng như bước 26 đã chừa sẵn,
 * và hình học không phải sửa một dòng nào. Trước đó vòng tròn hiện **tên gọi**
 * (chữ cuối của họ tên, hàm `tenGoi()` nay đã bỏ); nay chỗ dễ trúng nhất của
 * cả vòng tròn mang đúng thứ nó đáng mang là khuôn mặt, còn HỌ TÊN ĐẦY ĐỦ nằm
 * ở nhãn `title`.
 *
 * Người chưa có ảnh thì hiện **bóng người** theo giới tính, không hiện ô trống.
 *
 * ⚠ **Luôn bấm được, kể cả khi chỉ có quyền xem** — nó không sửa gì cả.
 */
function nutTam(p, xuLy) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.viec = 'thongTin';
  nut.style.cssText =
    'position:absolute;left:50%;top:' + TREN_GIUA + '%;transform:translateX(-50%);' +
    'width:' + RONG_GIUA + '%;padding:0;background:none;border:none;font-family:inherit;' +
    'display:flex;flex-direction:column;align-items:center;gap:3px;' +
    'cursor:pointer;touch-action:manipulation';

  // Vòng ảnh chiếm trọn bề ngang của nút và tự vuông theo `aspect-ratio`, nên
  // KHÔNG dùng lại `veAnhTron()` được — hàm ấy nhận đường kính bằng pixel, mà
  // ở đây bề ngang là phần trăm của cả hộp.
  const tron = document.createElement('div');
  tron.style.cssText =
    'width:100%;aspect-ratio:1;border-radius:50%;overflow:hidden;' +
    'box-shadow:0 0 0 2px #ffffff, 0 0 0 3.5px ' + mauVien(p) + '66';

  const im = document.createElement('img');
  im.src = anhMacDinhUri(p && p.sex, mauVien(p));
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  tron.append(im);

  const anhThat = p && typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  if (anhThat) {
    // 240px: vòng tròn ở tâm rộng chừng 76px trên hộp 280px, nhân ba cho màn
    // hình điện thoại.
    const duong = driveThumbUrl(anhThat, 240);
    const thu = new Image();
    thu.onload = () => {
      if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
    };
    thu.src = duong;
  }

  const chu = document.createElement('div');
  chu.textContent = 'Thông tin';
  chu.style.cssText =
    'font-size:11px;line-height:1.2;white-space:nowrap;text-align:center;color:#5c554e';

  const day = (fullName(p) || '').trim();
  if (day) nut.title = day;

  nut.append(tron, chu);
  nut.addEventListener('click', () => openPersonDetail(p.id, xuLy));
  return nut;
}

function nutVanh(m, p, xuLy, coQuyen) {
  const chay = viecCuaVanh(m.viec, p, xuLy);
  // "Thông tin" không sửa gì nên không cần quyền sửa.
  const bat = !!chay && (coQuyen || m.viec === 'thongTin');

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.disabled = !bat;
  nut.dataset.viec = m.viec;
  nut.style.cssText =
    'position:absolute;left:' + m.x + '%;top:' + m.top + '%;transform:translateX(-50%);' +
    'width:' + RONG_MUC + '%;padding:0;background:none;border:none;font-family:inherit;' +
    'display:flex;flex-direction:column;align-items:center;gap:3px;' +
    'touch-action:manipulation;' +
    'cursor:' + (bat ? 'pointer' : 'not-allowed') + ';opacity:' + (bat ? '1' : '.4') + ';';

  const tron = document.createElement('div');
  tron.style.cssText =
    'width:' + (RONG_TRON / RONG_MUC * 100) + '%;aspect-ratio:1;border-radius:50%;' +
    'display:flex;align-items:center;justify-content:center;' +
    'box-sizing:border-box;' +
    (m.do
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#2a2622;background:#fff;border:1px solid #e6e0d8');
  tron.append(veBieuTuongTron(m.bieuTuong));

  const chu = document.createElement('div');
  chu.textContent = m.chu;
  chu.style.cssText =
    'font-size:11px;line-height:1.2;white-space:nowrap;text-align:center;' +
    'color:' + (m.do ? '#8a3a2a' : '#5c554e');

  nut.append(tron, chu);
  if (bat) nut.addEventListener('click', chay);
  return nut;
}

/**
 * Việc thật đằng sau mỗi mục. Trả về `null` khi nơi gọi không đưa hàm xử lý —
 * lúc ấy `nutVanh` cho mục ấy mờ đi.
 *
 * ⚠ Menu này KHÔNG tự mở form, không tự mở danh sách người, không tự ghi gì.
 * `person-edit.js` và `person-list.js` cũng thuộc lớp `pages`, mà hai file
 * `pages` không import lẫn nhau (chốt 17/08/2026, chat 1.6): import vòng tròn
 * thì một trong hai thấy hàm của file kia là `undefined` tuỳ thứ tự nạp, và lỗi
 * ấy chỉ hiện trên GitHub Pages chứ không hiện lúc chạy thử.
 *
 * *Thông tin* là ngoại lệ, và **không phải ngoại lệ của luật ấy**: thẻ thông
 * tin sống trong CHÍNH file này, nên gọi thẳng không đi qua lớp nào cả.
 */
function viecCuaVanh(viec, p, xuLy) {
  if (viec === 'chaMe') {
    // KHÔNG hỏi "thêm cha hay thêm mẹ" nữa: ô giới tính trong form đã là chỗ
    // nói ra điều đó, và hỏi hai lần cho một câu thì hai câu trả lời có thể
    // lệch nhau — lúc ấy app phải chọn tin cái nào.
    return xuLy.onThemChaMe
      ? () => { closePersonDetail(); xuLy.onThemChaMe(p.id); } : null;
  }
  if (viec === 'banDoi') {
    return xuLy.onThemBanDoi
      ? () => { closePersonDetail(); xuLy.onThemBanDoi(p.id); } : null;
  }
  // ⚠ KHÔNG hỏi "thêm con vào cặp nào" nữa ở ĐÂY (bước 65) — cùng đúng lý lẽ
  // đã bỏ câu "thêm cha hay thêm mẹ" ở trên: câu hỏi ấy nay là một khối TRONG
  // form, nơi nó đứng cạnh mọi câu khác và sửa lại được. Và khối kia làm được
  // một việc màn hình này chưa bao giờ làm: cho khai một người con ĐƠN THÂN kể
  // cả khi người mốc đã có cặp.
  if (viec === 'con') {
    return xuLy.onThemCon
      ? () => { closePersonDetail(); xuLy.onThemCon({ mocId: p.id }); } : null;
  }
  if (viec === 'ketNoi') {
    return xuLy.onKetNoi ? () => { closePersonDetail(); xuLy.onKetNoi(p.id); } : null;
  }
  if (viec === 'goNoi') {
    return xuLy.onGoNoi ? () => { closePersonDetail(); xuLy.onGoNoi(p.id); } : null;
  }
  if (viec === 'xoa') {
    return xuLy.onXoaNguoi ? () => { closePersonDetail(); xuLy.onXoaNguoi(p.id); } : null;
  }
  return null;
}

// ⚠ `moChonCap()` ĐÃ BỎ ở bước 65 (30/08/2026). Nó là màn hình "Thêm con vào
// cặp nào?" mọc ra dưới vòng tròn, và nó hỏng theo hai cách: chọn xong là nó
// biến mất nên sửa lại phải đóng cả form mở lại từ đầu, và nó chỉ hỏi khi
// người ấy có từ HAI cặp — người có đúng một cặp không có đường nào khai một
// người con ĐƠN THÂN. Cả hai chỗ ấy nay do khối "Cha mẹ là ai?" trong
// `person-edit.js` lo (luật 13). Vành chỉ còn việc gọi `onThemCon({ mocId })`.

function nutChan(chu, chinh, chay, tat) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.disabled = !!tat;
  nut.style.cssText =
    'flex:' + (chinh ? '1 1 auto' : '0 0 auto') + ';min-height:42px;padding:0 14px;' +
    'font-size:14px;font-family:inherit;border-radius:9px;line-height:1.3;' +
    'touch-action:manipulation;' +
    'cursor:' + (tat ? 'not-allowed' : 'pointer') + ';opacity:' + (tat ? '.45' : '1') + ';' +
    (chinh
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  if (!tat) nut.addEventListener('click', chay);
  return nut;
}
