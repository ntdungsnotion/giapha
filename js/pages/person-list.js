// ============================================================
// giapha · js/pages/person-list.js
// Vai trò  : MÀN HÌNH DANH SÁCH NGƯỜI — cửa vào KHÔNG đi qua sơ đồ
//            + MÀN HÌNH THÙNG RÁC — đường quay lại của người và cặp đã xoá
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/person, domains/union, utils/text
// Phiên bản: 1.1.0 · Cập nhật: 20/08/2026 21:10
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
// 3. Người đã xoá mềm KHÔNG có mặt TRONG DANH SÁCH. `searchPersons` kể ra được
//    họ (`gomDaXoa: true`), nhưng thẻ thông tin đọc từ `state.index`, mà
//    `buildIndex()` bỏ qua bản ghi mang cờ `deleted` — kể tên rồi bấm vào
//    không ra gì thì tệ hơn là không kể tên. Họ có màn hình RIÊNG, ngay dưới.
//
// Hai file `pages` KHÔNG import lẫn nhau: file này không mở thẻ thông tin, nó
// báo ra ngoài bằng callback (đúng luật đã chốt 17/08/2026, chat 1.6).
//
// --- THÙNG RÁC — bốn quyết định (bước 29) --------------------------------
//
// Treo từ bước 21: xoá là đặt cờ `deleted`, hoàn tác chỉ làm được NGAY LÚC ẤY
// trong lúc hộp còn mở. Đóng hộp rồi thì người ấy nằm trong file mãi mãi mà
// không cửa nào tới được — kể cả màn hình Danh sách người, vì lý do 3 bên trên.
//
// 1. **Thùng rác KHÔNG có ô tìm.** Danh sách người có ô tìm vì nó nhìn vào cả
//    kho vài trăm đến vài nghìn bản ghi; thùng rác nhìn vào những thứ vừa bị
//    xoá — đếm trên đầu ngón tay. Thêm ô tìm là thêm mã cho một việc chưa ai
//    cần, và ô tìm rỗng giữa một danh sách ba dòng trông như app hỏng.
//
// 2. **Bấm một dòng là ĐƯA TRỞ LẠI, không phải xem hồ sơ.** Thùng rác chỉ có
//    đúng một việc. Mở hồ sơ người đã xoá thì không mở được — thẻ thông tin đọc
//    `state.index` mà chỉ mục không có họ. Hộp xác nhận nằm ở `person-edit.js`,
//    cùng chỗ với mọi đường ghi khác.
//
// 3. **Người và CẶP đứng chung một màn hình, hai nhóm.** Cặp bị xoá mềm cũng
//    không có đường quay lại (bước 26 gỡ nối làm cặp mất lý do tồn tại thì cả
//    cặp bị xoá theo). Dựng hai màn hình cho hai loại là bắt người dùng đoán
//    thứ mình vừa mất thuộc loại nào.
//
// 4. **Nút vào thùng rác nằm ở chân màn hình Danh sách người**, và luôn hiện
//    kèm con số — kể cả khi con số là 0. Nút mọc ra rồi biến đi tuỳ lúc là thứ
//    người dùng không tìm lại được lần sau.

import { state } from '../state.js';
import { searchPersons } from '../domains/person.js';
import { listDeletedUnions } from '../domains/union.js';
import { fullName, coGiaTri } from '../utils/text.js';

/** Nhiều hơn mức này thì không vẽ hết — xem `conThua` trong `searchPersons`. */
const TOI_DA = 200;

let lopPhu   = null;
let oTim     = null;
let khoiDem  = null;
let khoiDong = null;   // vùng cuộn chứa các dòng người
let xuLyNgoai = {};
let ngheBanPhim = null;
let cheDo    = 'danhSach';   // 'danhSach' | 'thungRac'

/**
 * Mở danh sách người.
 *
 * @param {{onXemHoSo?:function(string), onChonNguoi?:function(string),
 *          onThungRac?:function(), tuKhoa?:string}} [xuLy]
 *        `onXemHoSo`   — bấm một dòng thì mở hồ sơ người ấy (đường thường).
 *        `onChonNguoi` — dùng khi màn hình này làm chỗ CHỌN NGƯỜI; chỉ chạy
 *                        khi không có `onXemHoSo`.
 *        `onThungRac`  — có thì chân màn hình mọc thêm nút *"Thùng rác (n)"*.
 *                        Chế độ CHỌN NGƯỜI không nhận nút này: đang giữa một
 *                        việc khác thì không phải lúc rẽ sang việc thứ hai.
 *        `tuKhoa`      — chữ điền sẵn vào ô tìm.
 */
export function openPersonList(xuLy = {}) {
  moManHinh('danhSach', xuLy);
}

/**
 * Mở THÙNG RÁC — người và cặp đang mang cờ `deleted`.
 *
 * @param {{onKhoiPhucNguoi?:function(string), onKhoiPhucCap?:function(string)}} [xuLy]
 *        Cả hai đều là CỬA, không phải việc: hộp xác nhận và đường ghi xuống
 *        Drive nằm ở `person-edit.js`, cùng chỗ với mọi đường ghi khác. Màn
 *        hình này tự đóng trước khi gọi — hộp xác nhận mở ra sau nó, và hai lớp
 *        phủ chồng nhau thì cái mở sau lại nằm dưới (xem `moKetNoi` ở
 *        `tree-view.js`).
 */
export function openThungRac(xuLy = {}) {
  moManHinh('thungRac', xuLy);
}

function moManHinh(che, xuLy) {
  closePersonList();
  xuLyNgoai = xuLy || {};
  cheDo     = che;

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
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:420px;' +
    'height:82vh;display:flex;flex-direction:column;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28)';

  const laThungRac  = cheDo === 'thungRac';
  const laChonNguoi = !laThungRac && !xuLyNgoai.onXemHoSo && !!xuLyNgoai.onChonNguoi;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = laThungRac
    ? 'Thùng rác'
    : (laChonNguoi ? 'Chọn một người' : 'Danh sách người');
  tieuDe.style.cssText = 'font-size:19px;font-weight:600;flex:0 0 auto';

  const nhac = document.createElement('div');
  nhac.textContent = laThungRac
    ? 'Người và cặp đã xoá vẫn nằm nguyên trong file, chỉ mang một cái cờ. ' +
      'Bấm một dòng để đưa trở lại gia phả.'
    : 'Tìm được cả người chưa nối với ai — những người không sơ đồ nào vẽ ra.';
  nhac.style.cssText =
    'font-size:13px;line-height:1.5;color:#8a8078;margin-top:4px;flex:0 0 auto';

  hop.append(tieuDe, nhac);

  // Thùng rác KHÔNG có ô tìm — quyết định 1 ở đầu file.
  if (!laThungRac) {
    // font-size 16px là bắt buộc: dưới mức đó Safari trên iPhone tự phóng to cả
    // trang khi con trỏ nhảy vào ô, và người dùng phải tự thu về bằng tay.
    oTim = document.createElement('input');
    oTim.type = 'search';
    oTim.value = typeof xuLyNgoai.tuKhoa === 'string' ? xuLyNgoai.tuKhoa : '';
    oTim.placeholder = 'Gõ tên, hoặc mã như P0012';
    oTim.setAttribute('aria-label', 'Tìm người theo tên hoặc theo mã');
    oTim.autocomplete = 'off';
    oTim.style.cssText =
      'margin-top:12px;flex:0 0 auto;width:100%;box-sizing:border-box;height:44px;' +
      'padding:0 12px;font-size:16px;font-family:inherit;color:inherit;' +
      'border:1px solid #e6e0d8;border-radius:9px;background:#fff';
    oTim.addEventListener('input', veLaiDanhSach);
    oTim.addEventListener('keydown', (e) => { if (e.key === 'Enter') moDongDuyNhat(); });
    hop.append(oTim);
  }

  khoiDem = document.createElement('div');
  khoiDem.style.cssText = 'font-size:12px;color:#8a8078;margin:8px 0 6px;flex:0 0 auto';

  khoiDong = document.createElement('div');
  khoiDong.style.cssText =
    'flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;' +
    'border-top:1px solid #f0ece5';

  hop.append(khoiDem, khoiDong, veChan(laThungRac, laChonNguoi));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closePersonList(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  // Phím Esc gỡ ngay khi đóng: người nghe còn sót lại sẽ bắn tiếp trên màn
  // hình sơ đồ, và đóng nhầm một thứ khác của lần sau.
  ngheBanPhim = (e) => { if (e.key === 'Escape') closePersonList(); };
  document.addEventListener('keydown', ngheBanPhim);

  veLaiDanhSach();
  if (oTim) oTim.focus();
}

/**
 * Chân màn hình. Danh sách người có thêm nút vào THÙNG RÁC — kèm con số, và
 * kèm cả khi con số là 0 (quyết định 4 ở đầu file).
 */
function veChan(laThungRac, laChonNguoi) {
  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;gap:8px;margin-top:14px;flex:0 0 auto';

  if (!laThungRac && !laChonNguoi && xuLyNgoai.onThungRac) {
    const rac = nutChan('Thùng rác (' + demThungRac() + ')', () => {
      const chay = xuLyNgoai.onThungRac;
      closePersonList();
      chay();
    });
    rac.dataset.viec = 'thung-rac';
    chan.append(rac);
  }

  chan.append(nutChan('Đóng', () => closePersonList()));
  return chan;
}

function nutChan(chu, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText =
    'flex:1 1 0;height:42px;font-size:14px;font-family:inherit;color:inherit;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'cursor:pointer;touch-action:manipulation';
  nut.addEventListener('click', chay);
  return nut;
}

/** Bao nhiêu thứ đang nằm trong thùng rác — người cộng cặp. */
function demThungRac() {
  if (!state.tree) return 0;
  const nguoi = searchPersons(state.tree, '', { gomDaXoa: true, toiDa: 0 })
    .ket.filter((m) => m.deleted).length;
  return nguoi + listDeletedUnions(state.tree).length;
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
  cheDo     = 'danhSach';
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

  if (cheDo === 'thungRac') { veThungRac(); return; }

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

// ============================================================
// THÙNG RÁC
// ============================================================

/**
 * Hai nhóm: NGƯỜI trước, CẶP sau.
 *
 * Người trước vì đó là thứ người dùng nghĩ tới khi nói *"tôi vừa xoá nhầm"*.
 * Cặp bị xoá gần như luôn là hệ quả của một lần gỡ nối, chứ ít ai chủ tâm đi
 * xoá một cuộc hôn nhân — nên nó đứng sau, và mang theo tên hai người để người
 * đọc nhận ra cặp nào.
 */
function veThungRac() {
  const dsNguoi = searchPersons(state.tree, '', { gomDaXoa: true, toiDa: 0 })
    .ket.filter((m) => m.deleted);
  const dsCap = listDeletedUnions(state.tree);

  khoiDem.textContent = 'Thùng rác có ' + dsNguoi.length + ' người và ' +
                        dsCap.length + ' cặp.';

  if (dsNguoi.length === 0 && dsCap.length === 0) {
    khoiDong.append(loiNhan(
      'Thùng rác trống.',
      'Chưa ai bị xoá khỏi gia phả này. Xoá một người là đặt cờ chứ không mất ' +
      'bản ghi, nên bất cứ thứ gì đã xoá đều quay lại được từ đây.'));
    return;
  }

  if (dsNguoi.length > 0) {
    khoiDong.append(nhanNhom('Người đã xoá'));
    for (const muc of dsNguoi) khoiDong.append(veDongNguoiDaXoa(muc));
  }

  if (dsCap.length > 0) {
    khoiDong.append(nhanNhom('Cặp đã xoá'));
    for (const muc of dsCap) khoiDong.append(veDongCapDaXoa(muc));
  }
}

function nhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'padding:12px 4px 6px;font-size:12px;font-weight:600;letter-spacing:.04em;' +
    'color:#8a8078';
  return d;
}

function veDongNguoiDaXoa(muc) {
  const coTen = muc.ten !== '';
  const nut = veDongTrong(
    coTen ? muc.ten : '(chưa có tên)',
    [muc.id, muc.doiSong].filter(coGiaTri).join('  ·  '),
    coTen,
  );
  nut.setAttribute('data-ma', muc.id);
  nut.addEventListener('click', () => {
    const chay = xuLyNgoai.onKhoiPhucNguoi;
    if (!chay) return;
    closePersonList();
    chay(muc.id);
  });
  return nut;
}

/**
 * Một cặp đã xoá. Tên hai người tra thẳng `tree.persons` chứ không tra
 * `state.index`: partner của một cặp đã xoá rất hay cũng đang mang cờ `deleted`
 * — đó chính là ca *"xoá người làm cặp mất lý do tồn tại"* của bước 26 — và chỉ
 * mục không có họ.
 */
function veDongCapDaXoa(muc) {
  const ten = muc.partnerIds.map(tenTrongCay).filter(coGiaTri);
  const soCon = muc.childIds.length;

  const nut = veDongTrong(
    moTaCapDaXoa(ten),
    [muc.id, soCon > 0 ? soCon + ' con' : 'chưa có con'].join('  ·  '),
    ten.length > 0,
  );
  nut.setAttribute('data-cap', muc.id);
  nut.addEventListener('click', () => {
    const chay = xuLyNgoai.onKhoiPhucCap;
    if (!chay) return;
    closePersonList();
    chay(muc.id);
  });
  return nut;
}

/**
 * Hàng trên của một dòng cặp.
 *
 * Cặp MỘT NGƯỜI phải mang chữ *"Cặp của"*, không thì dòng ấy trông y hệt một
 * dòng người ở nhóm trên — và người dùng bấm vào tưởng đang đưa một người trở
 * lại. `U0024` và `U0026` trong dữ liệu làm việc đều là cặp một người, nên đây
 * không phải ca hiếm.
 */
function moTaCapDaXoa(ten) {
  if (ten.length === 0) return 'Cặp không còn ai đứng tên';
  if (ten.length === 1) return 'Cặp của ' + ten[0];
  return ten.join('  ↔  ');
}

/** Khuôn chung của một dòng thùng rác: hàng trên là tên, hàng dưới là chi tiết. */
function veDongTrong(hangTren, hangDuoi, coTen) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 8px;background:none;' +
    'border:none;border-bottom:1px solid #f0ece5;font-family:inherit;color:inherit;' +
    'cursor:pointer;touch-action:manipulation';

  const t = document.createElement('div');
  t.textContent = hangTren;
  t.style.cssText = 'font-size:15px;font-weight:600;' +
    (coTen ? '' : 'color:#8a8078;font-style:italic');

  const d = document.createElement('div');
  d.textContent = hangDuoi + '  ·  Đưa trở lại';
  d.style.cssText = 'margin-top:2px;font-size:12px;color:#8a8078';

  nut.append(t, d);
  return nut;
}

/** Tên một người đọc thẳng từ cây — kể cả người đang mang cờ `deleted`. */
function tenTrongCay(personId) {
  const ds = (state.tree && Array.isArray(state.tree.persons)) ? state.tree.persons : [];
  const p = ds.find((x) => x && x.id === personId);
  if (!p) return personId;
  const ten = fullName(p);
  return coGiaTri(ten) ? ten : personId;
}

// ============================================================
// Một dòng của DANH SÁCH NGƯỜI
// ============================================================

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
