// ============================================================
// giapha · js/pages/person-detail.js
// Vai trò  : Thẻ thông tin hiện ra khi chạm giữ vào một người
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/person, utils/{text,date}
// Phiên bản: 1.0.0 · Cập nhật: 17/08/2026 14:05
// ============================================================
//
// Trường trống thì ẨN CẢ HÀNG: không nhãn, không giá trị, không "Không rõ".
// Dùng utils/text.coGiaTri(), đừng tự kiểm theo kiểu riêng.
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
// --- Ảnh người: CHƯA làm, cố ý ------------------------------------------
//
// `photoFileId` đang trống ở mọi bản ghi, và nạp ảnh từ Drive thì cần
// `gas.taiAnh()` — vẫn còn là khung. Để đến giai đoạn 2, cùng lúc với ảnh
// trên ô sơ đồ, chứ không làm nửa vời ở đây.

import { state } from '../state.js';
import { getAlternateNames } from '../domains/person.js';
import { fullName, coGiaTri, doiSongNguoi } from '../utils/text.js';
import { formatDate, calcAge } from '../utils/date.js';

let lopPhu = null;   // lớp phủ đang mở, hoặc null

const GIOI = { M: 'Nam', F: 'Nữ' };   // 'U' cố ý KHÔNG có mặt — xem veHang()

/**
 * Mở thẻ thông tin của một người.
 *
 * @param {string} personId
 * @param {{onChonNguoi?:function(string)}} [xuLy]
 *        `onChonNguoi` chạy khi người dùng bấm một người trong phần quan hệ,
 *        hoặc bấm nút "Đưa ra giữa sơ đồ". Thẻ tự đóng trước khi gọi.
 */
export function openPersonDetail(personId, xuLy = {}) {
  closePersonDetail();

  const index = state.index;
  const p = index && index.personById.get(personId);
  if (!p) return;

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const the = document.createElement('div');
  the.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;width:100%;max-width:360px;' +
    'max-height:82vh;overflow:auto;box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  the.append(...veDauThe(p), ...veHangThongTin(p), ...veQuanHe(index, p, xuLy));
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
}

// ============================================================
// Các mảng của thẻ
// ============================================================

function veDauThe(p) {
  const ra = [];

  const ten = document.createElement('div');
  ten.textContent = fullName(p);
  ten.style.cssText = 'font-size:19px;font-weight:600;line-height:1.3';
  ra.push(ten);

  const song = doiSongNguoi(p);
  if (coGiaTri(song)) {
    const d = document.createElement('div');
    d.textContent = song;
    d.style.cssText = 'font-size:14px;color:#8a8078;margin-top:2px';
    ra.push(d);
  }

  // Mã người: nhỏ và mờ, nhưng phải có. Đây là thứ duy nhất phân biệt được hai
  // cụ trùng tên trùng năm sinh, và là thứ chủ dự án đọc khi đối chiếu dữ liệu.
  const ma = document.createElement('div');
  ma.textContent = p.id;
  ma.style.cssText = 'font-size:11px;color:#b3aaa0;margin-top:4px;letter-spacing:.05em';
  ra.push(ma);

  return ra;
}

function veHangThongTin(p) {
  const bang = document.createElement('div');
  bang.style.cssText = 'margin-top:14px;display:flex;flex-direction:column;gap:1px';

  const tenKhac = getAlternateNames(p)
    .map((n) => n.ten + (coGiaTri(n.loai) ? ' (' + n.loai + ')' : ''))
    .join(' · ');

  veHang(bang, 'Tên khác', tenKhac);
  veHang(bang, 'Giới tính', GIOI[p.sex] || '');
  veHang(bang, 'Sinh', ghepNgayNoi(p.birth));
  veHang(bang, 'Mất', ghepNgayNoi(p.death));
  veHang(bang, 'An táng', p.burialPlace);
  veHang(bang, tuoiTho(p).nhan, tuoiTho(p).giaTri);
  veHang(bang, 'Ghi chú', p.note, true);

  const ra = [bang];

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

/** "12/03/1927 · Hà Nội" — phần nào trống thì bỏ hẳn, không để dấu chấm lơ lửng. */
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
 * Một hàng nhãn — giá trị. Giá trị trống thì KHÔNG VẼ GÌ CẢ.
 *
 * Đây là chỗ cài quy tắc "trường trống thì không vẽ hàng đó" cho cả thẻ. Giới
 * tính `sex: 'U'` rơi vào đúng đường này: `GIOI['U']` là `undefined`, thành
 * chuỗi rỗng, và hàng biến mất — đúng ý, vì "U" nghĩa là CHƯA BIẾT, mà chưa
 * biết thì không có gì để nói.
 *
 * `coTheDai` cho phép hàng đó tự thu gọn khi quá dài — xem `thuGonChu`.
 */
function veHang(bang, nhan, giaTri, coTheDai) {
  if (!coGiaTri(giaTri)) return;

  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;gap:10px;align-items:baseline;padding:6px 0;' +
    'border-top:1px solid #f0ebe4';

  const n = document.createElement('div');
  n.textContent = nhan;
  n.style.cssText = 'flex:0 0 82px;font-size:12px;color:#8a8078';

  const g = document.createElement('div');
  g.style.cssText = 'flex:1 1 auto;font-size:14px;line-height:1.45;word-break:break-word';
  const chu = String(giaTri).trim();
  if (coTheDai) thuGonChu(g, chu); else g.textContent = chu;

  hang.append(n, g);
  bang.append(hang);
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
    const nuoi = muc && muc.relation === 'adopted';
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      themNguoi(chaMe, index, id, nuoi ? 'cha mẹ nuôi' : '');
    }
  }

  for (const unionId of index.unionsAsPartner.get(p.id) || []) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (id !== p.id) themNguoi(banDoi, index, id, ghiChuHonNhan(u));
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      themNguoi(con, index, c && c.personId,
                c && c.relation === 'adopted' ? 'con nuôi' : '');
    }
  }

  ra.push(...veNhom('Cha mẹ', chaMe, xuLy));
  ra.push(...veNhom('Vợ/chồng', banDoi, xuLy));
  ra.push(...veNhom('Con', con, xuLy));
  return ra;
}

/**
 * Ghi chú cạnh tên bạn đời. `rank` là thứ bậc vợ cả/vợ thứ — KHÔNG phải
 * `partnerOrder`, thứ chỉ nói vị trí trái/phải trên sơ đồ. Hai cái khác nhau,
 * lẫn vào nhau là nói sai về gia đình người ta.
 */
function ghiChuHonNhan(u) {
  const phan = [];
  if (u.status === 'divorced') phan.push('đã ly hôn');
  if (typeof u.rank === 'number' && u.rank > 1) phan.push('thứ ' + u.rank);
  return phan.join(', ');
}

function themNguoi(vao, index, id, ghiChu) {
  if (!id || !index.personById.has(id)) return;
  if (vao.some((m) => m.id === id)) return;   // hai bộ cha mẹ chung một người
  vao.push({ id, ghiChu: ghiChu || '' });
}

function veNhom(tieuDe, danhSach, xuLy) {
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

  return [nhan, hop];
}

function veChanThe(p, xuLy) {
  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;gap:8px;margin-top:18px';

  const giua = nutChan('Đưa ra giữa sơ đồ', true, () => {
    closePersonDetail();
    if (xuLy.onChonNguoi) xuLy.onChonNguoi(p.id);
  });
  const dong = nutChan('Đóng', false, () => closePersonDetail());

  chan.append(giua, dong);
  return chan;
}

function nutChan(chu, chinh, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.style.cssText =
    'flex:' + (chinh ? '1 1 auto' : '0 0 auto') + ';height:42px;padding:0 14px;' +
    'font-size:14px;font-family:inherit;border-radius:9px;cursor:pointer;' +
    'touch-action:manipulation;' +
    (chinh
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  nut.addEventListener('click', chay);
  return nut;
}

/**
 * Menu VÒNG TRÒN 7 mục, bắt chước Quick Family Tree (hợp ngón tay):
 * Chỉnh sửa (giữa) · Thêm cha mẹ · Thêm một vợ/chồng · Thêm con ·
 * Kết nối · Hủy kết nối · Xóa
 *
 * Để đến GIAI ĐOẠN 2, cố ý: cả bảy mục đều sửa dữ liệu, mà `luuCay()` ở cả hai
 * phía vẫn là khung. Dựng menu trước khi có đường ghi là dựng bảy cái nút bấm
 * vào không xảy ra gì.
 */
function renderActionMenu(personId) { /* TODO — giai đoạn 2 */ }  // eslint-disable-line no-unused-vars
