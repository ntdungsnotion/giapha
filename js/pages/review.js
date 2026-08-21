// ============================================================
// giapha · js/pages/review.js
// Vai trò  : MÀN HÌNH RÀ SOÁT — người mồ côi và mọi chỗ dữ liệu đáng ngờ,
//            mỗi dòng dẫn thẳng tới việc sửa được nó
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/validate, utils/text, config
// Phiên bản: 1.0.0 · Cập nhật: 21/08/2026 20:30
// ============================================================
//
// --- Vì sao màn hình này phải có, và vì sao nó KHÔNG quay lại Cài đặt ----
//
// Bước 17 dựng nút *"Rà soát cả gia phả"* trong màn hình Cài đặt. Bước 30 gỡ
// nó đi theo yêu cầu của chủ dự án, và lý do gỡ đáng chép lại nguyên văn:
//
//   > Nó chỉ KỂ TÊN lỗi mà không có đường sửa — người dùng bấm, đọc một danh
//   > sách sáu dòng, rồi đứng đó. Một bản báo cáo không có nút hành động thì
//   > gần như một lời than.
//
// Nên phép rà **quay lại**, còn cái nút cũ thì **không**. Khác biệt duy nhất
// mà cũng là toàn bộ lý do tồn tại của file này: **mỗi dòng ở đây bấm được**,
// và bấm vào là mở đúng hồ sơ của người có vấn đề.
//
// Chỗ đứng cũng đổi theo. Cài đặt là nơi đổi *tuỳ chọn*; đây là nơi *dọn kho*
// — cùng họ với Danh sách người và Thùng rác, nên nó mọc ra từ chân màn hình
// Danh sách người, ngay cạnh nút *Thùng rác*.
//
// --- Vì sao HAI LOẠI RÁC đứng riêng hai nhóm trên đầu --------------------
//
// `checkOrphanNode` và `checkUnionPointless` đều trả về `warning` như bốn phép
// khác. Nhưng chúng khác cả bốn phép kia ở một điểm: những lỗi khác nói *"số
// liệu này đáng ngờ"*, còn hai phép này nói *"bản ghi này không cửa nào tới
// được"* — người không sơ đồ nào vẽ ra, và cặp không hiện ở đâu cả. Đó là thứ
// chủ dự án gọi tên khi yêu cầu việc này, nên chúng không được nằm lẫn giữa
// các cảnh báo niên đại.
//
// Hai nhóm chứ không một, dù cùng là rác: cách chữa khác hẳn nhau. Người mồ
// côi thường là người THẬT vừa thêm mà quên nối — chữa bằng *Kết nối*, xoá là
// đường cùng. Cặp thừa thì không bao giờ là thứ ai đó cố ý tạo ra, nên xoá là
// đường thường.
//
// --- LUẬT BA KẾT QUẢ phải hiện ra, không được nuốt ----------------------
//
// `domains/validate.js` cố ý tách `skip` khỏi `ok`, và ghi chú đầu file đó nói
// rõ vì sao: *"59 người, 0 lỗi niên đại"* và *"59 người, 50 người không đủ dữ
// liệu để kiểm"* là hai câu nói về hai tình trạng khác nhau. Gộp lại là tự
// khen mình sạch nhờ chỗ mình chưa biết gì.
//
// Nên dòng tóm tắt ở đầu màn hình **luôn kể cả ba con số**, kể cả khi không
// còn lỗi nào. Ai rút gọn nó thành *"Không có lỗi nào"* là làm hỏng đúng thứ
// bước 17 cất công dựng ra.
//
// --- Hai file `pages` không import lẫn nhau ------------------------------
//
// Màn hình này không tự mở hồ sơ ai. Nó báo ra ngoài bằng callback, đúng luật
// đã chốt 17/08/2026 (chat 1.6) — `tree-view.js` là nơi nối nó với thẻ thông
// tin, cùng một chỗ đã nối Danh sách người và Thùng rác.

import { state } from '../state.js';
import { validateAll } from '../domains/validate.js';
import { fullName, coGiaTri } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

let lopPhu      = null;
let khoiTomTat  = null;
let khoiDong    = null;
let xuLyNgoai   = {};
let ngheBanPhim = null;

/**
 * Mở màn hình Rà soát và chạy phép rà ngay.
 *
 * @param {{onXemHoSo?:function(string), onXemCap?:function(string)}} [xuLy]
 *        Cả hai đều là CỬA, không phải việc: màn hình tự đóng trước khi gọi,
 *        vì thẻ thông tin mở ra sau nó và hai lớp phủ chồng nhau thì cái mở
 *        sau lại nằm dưới (bẫy đã trả giá một vòng ở `moKetNoi`).
 */
export function openReview(xuLy = {}) {
  closeReview();
  xuLyNgoai = xuLy || {};

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  // Cùng khuôn với Danh sách người: phần đầu đứng yên, chỉ phần danh sách
  // cuộn. `height` chốt cứng chứ không `max-height` — bấm "Rà lại" mà hộp cao
  // thấp khác đi thì nút vừa bấm tự trượt khỏi ngón tay.
  const hop = document.createElement('div');
  hop.id = 'giapha-ra-soat';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(420, 680) + ';' +
    'height:' + caoHop(82) + ';display:flex;flex-direction:column;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28)';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Rà soát gia phả';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600;flex:0 0 auto';

  const nhac = document.createElement('div');
  nhac.textContent =
    'Bấm một dòng để mở hồ sơ của người có vấn đề — sửa hay xoá đều làm được ' +
    'ngay ở đó.';
  nhac.style.cssText =
    'font-size:13px;line-height:1.5;color:#8a8078;margin-top:4px;flex:0 0 auto';

  khoiTomTat = document.createElement('div');
  khoiTomTat.style.cssText =
    'margin-top:12px;flex:0 0 auto;font-size:13px;line-height:1.6;color:#5a534c;' +
    'background:#faf8f5;border:1px solid #e6e0d8;border-radius:9px;padding:10px 12px';

  khoiDong = document.createElement('div');
  khoiDong.style.cssText = 'flex:1 1 auto;overflow-y:auto;margin-top:10px';

  hop.append(tieuDe, nhac, khoiTomTat, khoiDong, veChan());
  lopPhu.append(hop);

  // Bấm ra ngoài hộp là đóng — nhưng chỉ khi bấm trúng chính lớp phủ, không
  // phải khi cú bấm nổi bọt lên từ một dòng bên trong.
  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeReview(); });
  document.body.append(lopPhu);

  ngheBanPhim = (e) => { if (e.key === 'Escape') closeReview(); };
  document.addEventListener('keydown', ngheBanPhim);

  chayRaSoat();
}

export function closeReview() {
  if (ngheBanPhim) document.removeEventListener('keydown', ngheBanPhim);
  ngheBanPhim = null;
  if (lopPhu) lopPhu.remove();
  lopPhu     = null;
  khoiTomTat = null;
  khoiDong   = null;
  xuLyNgoai  = {};
}

/** Màn hình có đang mở hay không — nơi gọi hỏi trước khi đóng cho đúng lúc. */
export function dangMoReview() {
  return lopPhu !== null;
}

// ============================================================
// Chạy phép rà và vẽ kết quả
// ============================================================

/**
 * Một lượt rà cả cây.
 *
 * ⚠ `validateAll(…, 'tree')` chạy phép chống vòng cho TỪNG cạnh cha–con, mỗi
 * cạnh một lượt duyệt đồ thị. Đó chính là lý do nó không được gọi ở mỗi lần
 * lưu — và cũng là lý do màn hình này KHÔNG rà lại sau mỗi phím bấm: chỉ chạy
 * lúc mở, và lúc người dùng chủ động bấm "Rà lại".
 */
function chayRaSoat() {
  if (!khoiDong) return;
  khoiDong.innerHTML = '';

  if (!state.tree || !state.index) {
    khoiTomTat.textContent = 'Chưa mở được gia phả.';
    khoiDong.append(loiNhan('Chưa có dữ liệu để rà.',
                            'Đóng màn hình này rồi thử tải lại trang.'));
    return;
  }

  const kq = validateAll(state.tree, state.index, 'tree');
  khoiTomTat.textContent = moTaBaConSo(kq.counts);

  // Hai loại RÁC tách khỏi phần cảnh báo còn lại — lý do ở đầu file.
  const moCoi   = kq.warnings.filter((m) => m.check === 'checkOrphanNode');
  const capThua = kq.warnings.filter((m) => m.check === 'checkUnionPointless');
  const conLai  = kq.warnings.filter((m) => m.check !== 'checkOrphanNode' &&
                                            m.check !== 'checkUnionPointless');

  if (kq.errors.length === 0 && moCoi.length === 0 &&
      capThua.length === 0 && conLai.length === 0) {
    khoiDong.append(loiNhan(
      'Không tìm thấy chỗ nào đáng ngờ.',
      'Những phép không rà được là do bản ghi chưa có đủ mốc ngày tháng — đó ' +
      'không phải lỗi, và con số ấy nằm ngay ở dòng trên.'));
    return;
  }

  if (moCoi.length > 0) {
    khoiDong.append(nhanNhom('Chưa nối với ai (' + moCoi.length + ')'));
    khoiDong.append(loiNhanNhom(
      'Bản ghi có thật nhưng không sơ đồ nào vẽ ra. Mở hồ sơ rồi dùng ' +
      '"Kết nối", hoặc xoá hẳn nếu là người thêm nhầm.'));
    for (const muc of moCoi) khoiDong.append(veMotDong(muc));
  }

  if (capThua.length > 0) {
    khoiDong.append(nhanNhom('Cặp thừa (' + capThua.length + ')'));
    khoiDong.append(loiNhanNhom(
      'Cặp không còn ai đứng tên, hoặc chỉ còn một người và không có con — nó ' +
      'không nói lên điều gì và không hiện ở đâu cả. Gỡ nối qua app không bao ' +
      'giờ để lại thứ này; sửa tay file JSON thì có.'));
    for (const muc of capThua) khoiDong.append(veMotDong(muc));
  }

  if (kq.errors.length > 0) {
    khoiDong.append(nhanNhom('Phải sửa (' + kq.errors.length + ')'));
    for (const muc of kq.errors) khoiDong.append(veMotDong(muc));
  }

  if (conLai.length > 0) {
    khoiDong.append(nhanNhom('Đáng ngờ (' + conLai.length + ')'));
    khoiDong.append(loiNhanNhom(
      'Gia phả cũ có mâu thuẫn thật, nên những dòng này không chặn gì cả — ' +
      'chúng chỉ nhắc để người biết chuyện xem lại.'));
    for (const muc of conLai) khoiDong.append(veMotDong(muc));
  }
}

/**
 * Dòng tóm tắt — LUÔN kể cả ba con số, kể cả khi sạch.
 *
 * "0 lỗi" một mình là câu nói dối tử tế: nó có thể nghĩa là dữ liệu sạch, mà
 * cũng có thể nghĩa là chẳng phép nào rà nổi vì thiếu mốc ngày tháng. Hai kết
 * luận ngược nhau, cùng một con số 0.
 *
 * ⚠ CỐ Ý không kể thêm *"1 lỗi · 3 đáng ngờ"* vào đây, dù `counts` có sẵn hai
 * số ấy. Bản đầu có, và ảnh chụp cho thấy vì sao phải bỏ: màn hình tách người
 * mồ côi ra khỏi phần cảnh báo còn lại, nên dòng tóm tắt đọc *"3 đáng ngờ"*
 * trong khi hai nhãn nhóm ngay dưới đọc *"Chưa nối với ai (2)"* và *"Đáng ngờ
 * (1)"*. Ba con số đều đúng, cộng lại cũng đúng, nhưng người đọc phải tự cộng
 * mới biết chúng không mâu thuẫn — và cùng một chữ *"đáng ngờ"* mang hai nghĩa
 * rộng hẹp khác nhau ở hai chỗ cách nhau một dòng.
 *
 * Số lỗi đã nằm ngay trên đầu mỗi nhóm, chỗ nó có nghĩa nhất.
 */
function moTaBaConSo(counts) {
  const c = counts || {};
  return [
    (c.total || 0) + ' phép rà',
    (c.ok || 0) + ' đạt',
    (c.skip || 0) + ' chưa đủ dữ liệu để kiểm',
  ].join('  ·  ');
}

// ============================================================
// Một dòng kết quả
// ============================================================

/**
 * Một dòng lỗi. Hàng trên nói VỀ AI, hàng dưới nói CHUYỆN GÌ.
 *
 * Lời nhắn của `validate.js` đã mở đầu bằng `Tên (Pxxxx)` để nó tự đứng được
 * một mình trong hộp báo lỗi của form. Ở đây tên đã nằm sẵn hàng trên, nên cắt
 * cái tiền tố ấy đi — không thì mỗi dòng đọc tên người hai lần.
 */
function veMotDong(muc) {
  const laCap = !muc.personId && !!muc.unionId;
  const ma    = muc.personId || muc.unionId || '';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 8px;background:none;' +
    'border:none;border-bottom:1px solid #f0ece5;font-family:inherit;color:inherit;' +
    'cursor:pointer;touch-action:manipulation';
  if (ma) nut.setAttribute('data-ma', ma);
  nut.dataset.phep = muc.check || '';

  const coTen = !laCap && coGiaTri(tenNguoi(muc.personId));

  const t = document.createElement('div');
  t.textContent = laCap
    ? 'Cặp ' + muc.unionId
    : (coTen ? tenNguoi(muc.personId) : '(chưa có tên)') +
      (muc.personId ? '  ·  ' + muc.personId : '');
  t.style.cssText = 'font-size:15px;font-weight:600;' +
    (laCap || coTen ? '' : 'color:#8a8078;font-style:italic');

  const d = document.createElement('div');
  d.textContent = boTienToTen(muc.message, ma);
  d.style.cssText = 'margin-top:2px;font-size:12px;line-height:1.5;color:#8a8078';

  const v = document.createElement('div');
  v.textContent = laCap ? 'Bấm để mở thẻ gia đình' : 'Bấm để mở hồ sơ';
  v.style.cssText = 'margin-top:4px;font-size:12px;color:#a89a86';

  nut.append(t, d, v);
  nut.addEventListener('click', () => {
    const chay = laCap ? xuLyNgoai.onXemCap : xuLyNgoai.onXemHoSo;
    if (!chay || !ma) return;
    closeReview();
    chay(ma);
  });
  return nut;
}

/**
 * Cắt đoạn `Tên (Pxxxx) ` ở đầu lời nhắn.
 *
 * Cắt theo MÃ chứ không theo tên: mã là thứ duy nhất chắc chắn có mặt và chắc
 * chắn đúng một lần. Không tìm thấy mã thì giữ nguyên cả câu — thà đọc tên hai
 * lần còn hơn cắt lẹm mất đầu một câu không đoán trước được.
 *
 * ⚠ Phải gạt cả DẤU CÂU nối theo sau, và chỗ này chỉ ảnh chụp mới bắt được.
 * Chín phép rà không viết lời nhắn theo cùng một khuôn: `checkOrphanNode` nối
 * bằng khoảng trắng (*"… (P0061) chưa nối với ai"*) còn `checkDeathAfterBirth`
 * nối bằng hai chấm (*"… (P9001): năm mất trước năm sinh"*). Cắt mỗi cái tên
 * thì dòng thứ hai mọc ra một dấu hai chấm đứng lạc ở đầu câu — mã đúng, phép
 * kiểm xanh, chỉ có chữ là đọc ra vô nghĩa.
 */
function boTienToTen(loi, ma) {
  const cau = String(loi || '');
  if (!ma) return cau;
  // Hai khuôn, thử theo thứ tự: mã trong ngoặc — cách chín phép rà về NGƯỜI
  // viết — rồi mã trần, cách `checkUnionPointless` viết (*"Cặp U0024 không
  // còn…"*). Tìm mã trần trước là cắt lẹm mất dấu ngoặc mở của khuôn kia.
  const trongNgoac = cau.indexOf('(' + ma + ')');
  const vt  = trongNgoac !== -1 ? trongNgoac : cau.indexOf(ma);
  if (vt === -1) return cau;
  const dai = trongNgoac !== -1 ? ma.length + 2 : ma.length;
  const conLai = cau.slice(vt + dai).replace(/^[\s:,;–—-]+/, '');
  return conLai === '' ? cau : hoaChuDau(conLai);
}

function hoaChuDau(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tên đầy đủ của một người, tra qua chỉ mục. */
function tenNguoi(personId) {
  if (!personId || !state.index || !state.index.personById) return '';
  const p = state.index.personById.get(personId);
  return p ? fullName(p) : '';
}

// ============================================================
// Khung quanh danh sách
// ============================================================

function nhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'padding:12px 4px 6px;font-size:12px;font-weight:600;letter-spacing:.04em;' +
    'color:#8a8078';
  return d;
}

/** Câu giải thích dưới nhãn nhóm — nói nhóm này là gì và làm gì được với nó. */
function loiNhanNhom(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'padding:0 4px 8px;font-size:12px;line-height:1.5;color:#8a8078';
  return d;
}

function loiNhan(dong1, dong2) {
  const hop = document.createElement('div');
  hop.style.cssText = 'padding:18px 6px;text-align:center';

  const a = document.createElement('div');
  a.textContent = dong1;
  a.style.cssText = 'font-size:14px;font-weight:600';

  const b = document.createElement('div');
  b.textContent = dong2;
  b.style.cssText = 'margin-top:6px;font-size:12px;line-height:1.6;color:#8a8078';

  hop.append(a, b);
  return hop;
}

function veChan() {
  const chan = document.createElement('div');
  chan.style.cssText =
    'display:flex;gap:8px;margin-top:14px;flex:0 0 auto;justify-content:center';

  const raLai = nutChan('Rà lại', () => chayRaSoat());
  raLai.dataset.viec = 'ra-lai';
  chan.append(raLai, nutChan('Đóng', () => closeReview()));
  return chan;
}

function nutChan(chu, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText =
    'flex:1 1 0;height:42px;font-size:14px;font-family:inherit;color:inherit;' +
    'max-width:' + RONG_NUT_TOI_DA + ';' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'cursor:pointer;touch-action:manipulation';
  nut.addEventListener('click', chay);
  return nut;
}
