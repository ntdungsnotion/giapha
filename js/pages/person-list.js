// ============================================================
// giapha · js/pages/person-list.js
// Vai trò  : MÀN HÌNH DANH SÁCH NGƯỜI — cửa vào KHÔNG đi qua sơ đồ
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/person
// Phiên bản: 1.0.0 · Cập nhật: 19/08/2026 22:10
// ============================================================
//
// --- Vì sao màn hình này phải có (bước 24) ------------------------------
//
// App đang coi *"được vẽ"* là *"tồn tại"*. Sơ đồ vẽ quanh MỘT người trung tâm,
// nên ai không nối với ai thì không cửa nào tới được — kể cả khi bản ghi của
// họ vẫn nằm nguyên trong file. Ca thật ở bước 21: xoá P0060 làm P0061 chỉ
// còn MỘT trên 63 người trung tâm nhìn thấy được. Thêm nhầm một người rồi
// quên nối cũng cho đúng kết quả ấy, nên chỗ hỏng này không do việc xoá sinh
// ra.
//
// Không phần mềm gia phả nào để sơ đồ làm cửa duy nhất: RootsMagic có People
// list view, Legacy tìm theo RIN, FamilySearch tra theo PID. Đây là cái cửa đó.
//
// --- Ba quyết định của màn hình -----------------------------------------
//
// 1. Bấm một dòng là mở HỒ SƠ, không phải đổi người trung tâm. Người ta tìm
//    để XEM trước đã; đổi luôn người trung tâm là ném họ sang một sơ đồ khác
//    trước khi kịp nhìn xem có đúng người mình tìm không. Thẻ thông tin đã có
//    sẵn nút "Đưa ra giữa sơ đồ" cho bước tiếp theo.
//
//    Nơi gọi không truyền `onXemHoSo` mà chỉ truyền `onChonNguoi` thì dòng bấm
//    vào sẽ gọi `onChonNguoi` — đó là chế độ CHỌN NGƯỜI, thứ bước 25 cần cho
//    ba mục Kết nối · Thêm cha mẹ · Thêm vợ/chồng. Một tap một dòng, không bao
//    giờ hai nút cạnh nhau: trên điện thoại hai đích chạm sát nhau trong một
//    dòng cao 44px là mời bấm nhầm.
//
// 2. Danh sách KHÔNG tự đóng khi mở hồ sơ. Thẻ thông tin nổi lên trên, đóng
//    thẻ là quay lại đúng chỗ đang tìm — người tra gia phả thường mở ba bốn
//    người liền nhau để so. Việc nào ĐỔI dữ liệu hoặc đổi sơ đồ thì nơi gọi tự
//    đóng danh sách; xem `moDanhSachNguoi()` ở `pages/tree-view.js`.
//
// 3. Người đã xoá mềm KHÔNG có mặt. `searchPersons` kể ra được họ
//    (`gomDaXoa: true`), nhưng thẻ thông tin đọc từ `state.index`, mà
//    `buildIndex()` bỏ qua bản ghi mang cờ `deleted` — kể tên rồi bấm vào
//    không ra gì thì tệ hơn là không kể tên. Đường "thùng rác" là việc riêng,
//    của bước sau.
//
// Hai file `pages` KHÔNG import lẫn nhau: file này không mở thẻ thông tin, nó
// báo ra ngoài bằng callback (đúng luật đã chốt 17/08/2026, chat 1.6).

import { state } from '../state.js';
import { searchPersons } from '../domains/person.js';

/** Nhiều hơn mức này thì không vẽ hết — xem `conThua` trong `searchPersons`. */
const TOI_DA = 200;

let lopPhu   = null;
let oTim     = null;
let khoiDem  = null;
let khoiDong = null;   // vùng cuộn chứa các dòng người
let xuLyNgoai = {};
let ngheBanPhim = null;

/**
 * Mở danh sách người.
 *
 * @param {{onXemHoSo?:function(string), onChonNguoi?:function(string),
 *          tuKhoa?:string}} [xuLy]
 *        `onXemHoSo`   — bấm một dòng thì mở hồ sơ người ấy (đường thường).
 *        `onChonNguoi` — dùng khi màn hình này làm chỗ CHỌN NGƯỜI; chỉ chạy
 *                        khi không có `onXemHoSo`.
 *        `tuKhoa`      — chữ điền sẵn vào ô tìm.
 */
export function openPersonList(xuLy = {}) {
  closePersonList();
  xuLyNgoai = xuLy;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  // Cột dọc, phần đầu đứng yên và chỉ phần danh sách cuộn: gõ thêm một chữ mà
  // ô tìm trôi mất khỏi màn hình thì không sửa lại chữ vừa gõ được.
  //
  // `height` CHỐT CỨNG chứ không phải `max-height`, và đây là thứ chỉ nhìn ảnh
  // chụp mới thấy: hộp cao theo nội dung thì mỗi lần gõ thêm một chữ, số dòng
  // đổi → hộp cao thấp khác đi → vì nó căn giữa màn hình nên Ô TÌM TỰ DỊCH LÊN
  // XUỐNG DƯỚI NGÓN TAY ĐANG GÕ. Chốt cứng thì phần trống nằm ở dưới, còn ô
  // tìm đứng yên một chỗ suốt cả lúc gõ.
  const hop = document.createElement('div');
  hop.id = 'giapha-danh-sach';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;width:100%;max-width:420px;' +
    'height:82vh;display:flex;flex-direction:column;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28)';

  const laChonNguoi = !xuLy.onXemHoSo && !!xuLy.onChonNguoi;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = laChonNguoi ? 'Chọn một người' : 'Danh sách người';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600;flex:0 0 auto';

  const nhac = document.createElement('div');
  nhac.textContent =
    'Tìm được cả người chưa nối với ai — những người không sơ đồ nào vẽ ra.';
  nhac.style.cssText =
    'font-size:13px;line-height:1.5;color:#8a8078;margin-top:4px;flex:0 0 auto';

  // font-size 16px là bắt buộc: dưới mức đó Safari trên iPhone tự phóng to cả
  // trang khi con trỏ nhảy vào ô, và người dùng phải tự thu về bằng tay.
  oTim = document.createElement('input');
  oTim.type = 'search';
  oTim.value = typeof xuLy.tuKhoa === 'string' ? xuLy.tuKhoa : '';
  oTim.placeholder = 'Gõ tên, hoặc mã như P0012';
  oTim.setAttribute('aria-label', 'Tìm người theo tên hoặc theo mã');
  oTim.autocomplete = 'off';
  oTim.style.cssText =
    'margin-top:12px;flex:0 0 auto;width:100%;box-sizing:border-box;height:44px;' +
    'padding:0 12px;font-size:16px;font-family:inherit;color:inherit;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#fff';
  oTim.addEventListener('input', veLaiDanhSach);
  oTim.addEventListener('keydown', (e) => { if (e.key === 'Enter') moDongDuyNhat(); });

  khoiDem = document.createElement('div');
  khoiDem.style.cssText = 'font-size:12px;color:#8a8078;margin:8px 0 6px;flex:0 0 auto';

  khoiDong = document.createElement('div');
  khoiDong.style.cssText =
    'flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;' +
    'border-top:1px solid #f0ece5';

  const dong = document.createElement('button');
  dong.type = 'button';
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin-top:14px;flex:0 0 auto;width:100%;height:42px;font-size:14px;' +
    'font-family:inherit;border:1px solid #e6e0d8;border-radius:9px;' +
    'background:#faf8f5;cursor:pointer;touch-action:manipulation';
  dong.addEventListener('click', () => closePersonList());

  hop.append(tieuDe, nhac, oTim, khoiDem, khoiDong, dong);
  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonList(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  // Phím Esc gỡ ngay khi đóng: người nghe còn sót lại sẽ bắn tiếp trên màn
  // hình sơ đồ, và đóng nhầm một thứ khác của lần sau.
  ngheBanPhim = (e) => { if (e.key === 'Escape') closePersonList(); };
  document.addEventListener('keydown', ngheBanPhim);

  veLaiDanhSach();
  oTim.focus();
}

export function closePersonList() {
  if (ngheBanPhim) document.removeEventListener('keydown', ngheBanPhim);
  ngheBanPhim = null;
  if (lopPhu) lopPhu.remove();
  lopPhu    = null;
  oTim      = null;
  khoiDem   = null;
  khoiDong  = null;
  xuLyNgoai = {};
}

/** Danh sách có đang mở hay không — nơi gọi hỏi trước khi đóng cho đúng lúc. */
export function dangMoPersonList() {
  return lopPhu !== null;
}

// ============================================================
// Vẽ lại phần danh sách
// ============================================================

/**
 * Vẽ lại toàn bộ các dòng sau mỗi lần gõ.
 *
 * Vẽ lại tất cả chứ không sửa từng dòng: trần 200 dòng nên số phần tử dựng ra
 * mỗi lần gõ là bé, mà đường "sửa tại chỗ" phải giữ thêm một bản đồ dòng cũ —
 * nhiều mã hơn để tiết kiệm một thứ chưa ai đo thấy chậm.
 */
function veLaiDanhSach() {
  if (!khoiDong) return;
  khoiDong.innerHTML = '';

  if (!state.tree) {
    khoiDem.textContent = '';
    khoiDong.append(loiNhan('Chưa mở được gia phả.',
                            'Đóng màn hình này rồi thử tải lại trang.'));
    return;
  }

  const tuKhoa = oTim ? oTim.value : '';
  const kq = searchPersons(state.tree, tuKhoa, { toiDa: TOI_DA });

  khoiDem.textContent = moTaSoLuong(kq, tuKhoa);

  if (kq.ket.length === 0) {
    khoiDong.append(loiNhan(
      'Không tìm thấy ai khớp "' + String(tuKhoa).trim() + '".',
      'Thử gõ ít chữ hơn — gõ tên đệm hay tên gọi ở nhà cũng tìm được. ' +
      'Biết mã thì gõ thẳng mã, ví dụ P0012.'));
    return;
  }

  for (const muc of kq.ket) khoiDong.append(veMotDong(muc));

  if (kq.conThua > 0) {
    const them = document.createElement('div');
    them.textContent =
      'Còn ' + kq.conThua + ' người nữa chưa hiện — gõ thêm chữ để thu hẹp.';
    them.style.cssText = 'padding:10px 4px;font-size:12px;color:#8a8078';
    khoiDong.append(them);
  }
}

function moTaSoLuong(kq, tuKhoa) {
  if (String(tuKhoa).trim() === '') return 'Gia phả có ' + kq.tongNguoi + ' người.';
  return kq.tongKhop + ' người khớp, trên tổng số ' + kq.tongNguoi + '.';
}

/**
 * Một dòng người.
 *
 * Dòng dưới nói ba thứ, và cả ba đều có lý do đứng đó:
 *   - MÃ — thứ duy nhất phân biệt được hai người trùng tên, và là thứ chủ dự
 *     án đọc được khi đối chiếu với file JSON;
 *   - "chưa nối với ai" — chính là loại người mà màn hình này sinh ra để tìm;
 *   - "tên khác" — khi chữ vừa gõ khớp một tên huý/tự/thụy chứ không phải tên
 *     chính, phải in cái tên ấy ra. Khớp mà không thấy chữ mình vừa gõ ở đâu
 *     là thứ làm người dùng tưởng máy hỏng.
 */
function veMotDong(muc) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.setAttribute('data-ma', muc.id);
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 8px;background:none;' +
    'border:none;border-bottom:1px solid #f0ece5;font-family:inherit;color:inherit;' +
    'cursor:pointer;touch-action:manipulation';

  const hang1 = document.createElement('div');
  hang1.style.cssText = 'display:flex;gap:10px;align-items:baseline';

  const coTen = muc.ten !== '';
  const ten = document.createElement('span');
  ten.textContent = coTen ? muc.ten : '(chưa có tên)';
  ten.style.cssText =
    'flex:1 1 auto;font-size:15px;font-weight:600;' +
    (coTen ? '' : 'color:#8a8078;font-style:italic');
  hang1.append(ten);

  // Trường trống thì KHÔNG vẽ hàng đó — không ghi "không rõ", không hiện "…".
  if (muc.doiSong !== '') {
    const doi = document.createElement('span');
    doi.textContent = muc.doiSong;
    doi.style.cssText = 'flex:0 0 auto;font-size:13px;color:#8a8078';
    hang1.append(doi);
  }

  const manh = [muc.id];
  if (muc.khop === 'tenKhac' && muc.tenKhac) manh.push('tên khác: ' + muc.tenKhac);
  if (chuaNoiVoiAi(muc.id)) manh.push('chưa nối với ai');

  const hang2 = document.createElement('div');
  hang2.textContent = manh.join('  ·  ');
  hang2.style.cssText = 'margin-top:2px;font-size:12px;color:#8a8078';

  nut.append(hang1, hang2);
  nut.addEventListener('click', () => chonMotNguoi(muc.id));
  return nut;
}

/**
 * Người này có mặt trong một mối nối nào không.
 *
 * Đọc MỐI NỐI, không đọc sơ đồ: hỏi "sơ đồ nào vẽ ra người này" thì phải chạy
 * `computeVisibleSet` một lần cho mỗi người trong họ, mỗi lần gõ một chữ.
 * Không có cặp nào và không là con của cặp nào thì chắc chắn không sơ đồ nào
 * vẽ ra — đó đúng là loại người màn hình này đi tìm.
 */
function chuaNoiVoiAi(personId) {
  const idx = state.index;
  if (!idx || !idx.personById.has(personId)) return false;
  const capDoi = idx.unionsAsPartner.get(personId) || [];
  const laCon  = idx.unionsAsChild.get(personId)   || [];
  return capDoi.length === 0 && laCon.length === 0;
}

/**
 * Gõ xong bấm Enter: còn đúng MỘT người thì mở luôn người ấy.
 *
 * Còn nhiều người thì không đoán hộ — đoán ở đây là mở nhầm hồ sơ, mà người
 * dùng lại tưởng mình vừa tìm đúng.
 */
function moDongDuyNhat() {
  if (!khoiDong) return;
  const cacDong = khoiDong.querySelectorAll('button[data-ma]');
  if (cacDong.length !== 1) return;
  chonMotNguoi(cacDong[0].getAttribute('data-ma'));
}

function chonMotNguoi(personId) {
  if (!personId) return;
  if (xuLyNgoai.onXemHoSo) { xuLyNgoai.onXemHoSo(personId); return; }
  if (xuLyNgoai.onChonNguoi) xuLyNgoai.onChonNguoi(personId);
}

function loiNhan(tieuDe, giaiThich) {
  const hop = document.createElement('div');
  hop.style.cssText = 'padding:18px 4px;line-height:1.55';

  const h = document.createElement('div');
  h.textContent = tieuDe;
  h.style.cssText = 'font-size:14px;font-weight:600;margin-bottom:4px';

  const p = document.createElement('div');
  p.textContent = giaiThich;
  p.style.cssText = 'font-size:13px;color:#8a8078';

  hop.append(h, p);
  return hop;
}
