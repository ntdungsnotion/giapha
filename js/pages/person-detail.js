// ============================================================
// giapha · js/pages/person-detail.js
// Vai trò  : Thẻ thông tin hiện ra khi chạm giữ vào một người
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{person,union}, services/repo, utils/{text,date}
// Phiên bản: 1.4.0 · Cập nhật: 20/08/2026 09:30
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
import { suaDuoc } from '../services/repo.js';
import { getAlternateNames } from '../domains/person.js';
import { getPartnerUnions } from '../domains/union.js';
import { fullName, coGiaTri, doiSongNguoi } from '../utils/text.js';
import { formatDate, calcAge } from '../utils/date.js';

let lopPhu = null;   // lớp phủ đang mở, hoặc null

const GIOI = { M: 'Nam', F: 'Nữ' };   // 'U' cố ý KHÔNG có mặt — xem veHang()

/**
 * Mở thẻ thông tin của một người.
 *
 * @param {string} personId
 * @param {{onChonNguoi?:function(string), onSuaNguoi?:function(string),
 *          onThemChaMe?:function(string,string), onThemBanDoi?:function(string),
 *          onThemCon?:function({unionId?:string, chaMeId?:string}),
 *          onKetNoi?:function(string), onGoNoi?:function(string),
 *          onXoaNguoi?:function(string)}} [xuLy]
 *        `onChonNguoi`  bấm một người trong phần quan hệ, hoặc nút "Đưa ra giữa
 *                       sơ đồ". Thẻ tự đóng trước khi gọi.
 *        `onSuaNguoi`   nút GIỮA vòng tròn.
 *        `onThemChaMe`  kèm giới tính `'M'|'F'|'U'` đã hỏi xong ngay trong thẻ.
 *        `onThemBanDoi` chỗ chọn cặp nằm ở `person-edit.js`, không nằm đây.
 *        `onThemCon`    kèm CHỖ NỐI đã chọn xong.
 *        `onKetNoi`     nơi gọi mở màn hình Danh sách người để chọn người kia.
 *        `onGoNoi`      nơi gọi mở danh sách mối nối hiện có.
 *        `onXoaNguoi`   thẻ KHÔNG hỏi lại gì.
 *
 * ⚠ BẢY MỤC CỦA VÒNG TRÒN ĐỀU LÀ CỬA, KHÔNG PHẢI VIỆC. Mọi hộp xác nhận, mọi
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
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  // ⚠ `box-sizing:border-box` KHÔNG phải chi tiết trang trí. Thiếu nó thì
  // `width:100%` tính trên phần RUỘT, còn 18px đệm mỗi bên cộng thêm ra ngoài —
  // nên trên màn hình 400px cái thẻ rộng 396px trong một khung chỉ còn 360px, và
  // lớp phủ căn giữa làm nó thò ra 18px MỖI BÊN, cắt cụt cả hai mép. Lỗi có từ
  // bước 14, ẩn suốt vì thẻ cũ toàn chữ chạy sát lề trái nên không ai thấy gì
  // mất; vòng tròn có nút nằm sát hai mép mới làm nó lộ ra — và lộ ra trong ẢNH
  // CHỤP, không phải trong phép kiểm. Bài kiểm bố cục đo theo mép THẺ, mà chính
  // cái thẻ mới là thứ tràn.
  const the = document.createElement('div');
  the.id = 'giapha-the-nguoi';   // mốc cho bài kiểm đo bố cục, xem kiem-vong-tron.mjs
  the.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:360px;' +
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

/**
 * Chân thẻ: MENU VÒNG TRÒN (bảy việc sửa dữ liệu) + hai nút đi lại.
 *
 * --- Vì sao hai nhóm nút, và vì sao chúng KHÔNG đứng chung hàng ----------
 *
 * "Đưa ra giữa sơ đồ" và "Đóng" chỉ ĐI LẠI: bấm nhầm thì bấm lại là xong. Bảy
 * việc trong vòng tròn thì ĐỔI DỮ LIỆU, và mỗi cái đều mở tiếp một hộp xác
 * nhận. Trộn hai nhóm vào một hàng nút giống hệt nhau là thứ mời một cú chạm
 * nhầm — đúng lý do mà từ bước 21 nút Xoá đã phải đứng riêng ra.
 *
 * ⚠ Vòng tròn nằm ở CUỐI thẻ, không nằm trên đầu. Điểm dừng của chat 1.6 là
 * *"xem xong một người là biết đủ, không phải cuộn tìm"*; nhét 300px nút lên
 * đầu thẻ là đẩy toàn bộ ngày tháng và ba nhóm quan hệ xuống dưới màn hình, tức
 * phá đúng cái điểm dừng ấy để lấy chỗ cho mấy cái nút.
 */
function veChanThe(p, xuLy) {
  const boc = document.createElement('div');

  // Chỗ hiện các bảng chọn phụ: "thêm con vào cặp nào", "thêm cha hay thêm mẹ".
  //
  // Nằm DƯỚI vòng tròn, không nằm trên: câu hỏi phụ phải hiện ra ngay cạnh cái
  // nút vừa bấm. Đặt lên trên thì người dùng bấm một nút ở giữa thẻ rồi thấy
  // một câu hỏi mọc ra phía trên đầu mình, và trên màn hình hẹp nó còn đẩy cả
  // vòng tròn trôi xuống ngay dưới ngón tay đang chạm.
  const khoiChon = document.createElement('div');

  boc.append(renderActionMenu(p, xuLy, khoiChon));
  boc.append(khoiChon);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:14px';
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
// MENU VÒNG TRÒN — bảy việc
// ============================================================
//
// Bắt chước Quick Family Tree: một việc ở GIỮA, sáu việc quanh vành. Hai điều
// nhớ được mà không phải học, và đó là toàn bộ lý do chọn hình tròn thay vì một
// danh sách dọc:
//
//   · TRÊN là cha mẹ, DƯỚI là con — đúng chiều của chính cái sơ đồ đằng sau;
//   · PHẢI là THÊM / NỐI, TRÁI là BỚT / GỠ. Hai việc bỏ đi nằm gọn một bên,
//     tô đỏ, không lẫn vào bên kia.
//
// ⚠ Đánh đổi phải nói ra: một danh sách dọc sáu dòng thì DỄ ĐỌC hơn vòng tròn,
// nhất là với chữ Việt có dấu ở cỡ 11px. Đổi lại, vòng tròn cho mỗi việc một
// CHỖ ĐỨNG cố định, và người dùng hằng ngày bấm theo trí nhớ vị trí chứ không
// đọc lại nhãn. Vì thế mọi đích chạm ở đây rộng 76px — vượt xa mức 44px tối
// thiểu — và nhãn nằm NGOÀI vòng tròn chứ không nhét vào trong.
//
// ⚠ `left` đặt bằng PHẦN TRĂM còn `top` bằng px, cố ý: màn hình hẹp 320px thì
// thẻ chỉ còn khoảng 244px bề ngang, và một vòng tròn 280px sẽ tràn ra ngoài.
// Cho bề ngang co lại theo thẻ thì vòng tròn hoá bầu dục — xấu hơn một chút,
// nhưng không có nút nào bị cắt mất, và đó mới là thứ đếm được.

// --- HÌNH HỌC CỦA VÒNG TRÒN --------------------------------------------
//
// MỌI kích thước ở đây là PHẦN TRĂM bề ngang của khung, không có một con số px
// nào ngoài cỡ chữ. Lý do đo được: thẻ rộng 324px trên màn hình 360px nhưng chỉ
// còn 244px trên màn hình 320px, và một vòng tròn dựng bằng px thì ở khổ hẹp có
// hai nhãn chui vào dưới nút giữa — chuyện đã xảy ra thật ở bản đầu của bước
// 26, và bài kiểm hành vi KHÔNG bắt được vì hai hình chữ nhật vẫn chưa chạm
// nhau. Chỉ ảnh chụp mới thấy.
//
// Đo theo phần trăm thì hình học GIỐNG NHAU ở mọi bề ngang: không chồng nhau ở
// khổ rộng nghĩa là không chồng nhau ở mọi khổ. `aspect-ratio` giữ chiều cao
// co theo bề ngang, nếu không thì thu bề ngang lại sẽ làm vòng tròn dẹt xuống
// thành bầu dục.
//
// Khung chuẩn 280 × 336px. Bán kính 118px, nút vành rộng 70px (vòng tròn 52px),
// nút giữa 76px. Ở thẻ 244px — màn hình 320px — vòng tròn 52px co còn 45px, vẫn
// trên mức 44px tối thiểu cho ngón tay.
//
// ⚠ Chiều cao khung là 336 chứ không phải 320, và 16px dôi ra ấy có lý do đo
// được: NHÃN CHỮ KHÔNG CO THEO. Vòng tròn và khoảng cách đều tính bằng phần
// trăm nên co đều, còn nhãn thì luôn 11px — nên bề ngang càng hẹp, khối nút
// dưới cùng càng chiếm phần trăm chiều cao lớn hơn, và ở thẻ 244px cái nhãn
// "Thêm con" thò xuống dưới đáy khung 3px. Bài kiểm hành vi bắt được đúng ca
// ấy; 16px dôi ra là chỗ cho phần không co.

const TY_LE_KHUNG   = '280 / 336';
const RONG_MUC      = 25;      // % — 70/280
const RONG_TRON     = 18.57;   // % — 52/280
const RONG_GIUA     = 27.14;   // % — 76/280
const TREN_GIUA     = 31.55;   // % — 106/336

/**
 * Sáu việc quanh vành. `x` là % bề ngang, `top` là % chiều cao — cả hai tính
 * sẵn từ góc để khỏi phải chạy lượng giác trong lúc vẽ.
 *
 *   trên (-90°) cha mẹ · trên phải (-30°) vợ chồng · dưới phải (30°) kết nối
 *   dưới (90°) con     · dưới trái (150°) gỡ nối   · trên trái (-150°) xoá
 */
const VANH = [
  { x: 50,   top: 0,     bieuTuong: '⬆', chu: 'Thêm\ncha / mẹ',   viec: 'chaMe'  },
  { x: 86.5, top: 17.56, bieuTuong: '💍', chu: 'Thêm\nvợ / chồng', viec: 'banDoi' },
  { x: 86.5, top: 52.68, bieuTuong: '🔗', chu: 'Kết nối',           viec: 'ketNoi' },
  { x: 50,   top: 70.24, bieuTuong: '⬇', chu: 'Thêm\ncon',        viec: 'con'    },
  { x: 13.5, top: 52.68, bieuTuong: '✂', chu: 'Gỡ nối',            viec: 'goNoi', do: true },
  { x: 13.5, top: 17.56, bieuTuong: '🗑', chu: 'Xoá khỏi\ngia phả', viec: 'xoa',  do: true },
];

/**
 * Vẽ menu vòng tròn. Trả về một khối luôn vẽ được — không có nhánh nào trả về
 * chuỗi rỗng, vì một cái thẻ mất hẳn phần hành động thì người dùng tưởng app
 * hỏng chứ không đọc ra "bạn không có quyền".
 *
 * ⚠ Mục nào mà nơi gọi KHÔNG đưa hàm xử lý thì mục ấy mờ đi và không bấm được,
 * chứ không biến mất. Sáu chỗ đứng phải cố định thì trí nhớ vị trí mới dùng
 * được; một vành lúc sáu nút lúc bốn nút là một vành khác nhau mỗi lần mở.
 */
function renderActionMenu(p, xuLy, khoiChon) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:16px';

  const coQuyen = suaDuoc();

  const nhan = document.createElement('div');
  nhan.textContent = 'Sửa gia phả';
  nhan.style.cssText =
    'margin-bottom:2px;font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078';
  boc.append(nhan);

  if (!coQuyen) {
    const nhac = document.createElement('div');
    nhac.textContent =
      'Bạn chỉ có quyền xem gia phả, nên bảy việc dưới đây chưa dùng được. ' +
      'Cần sửa thật thì nhờ người quản lý đổi quyền trên Google Drive.';
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
    'position:relative;width:100%;max-width:280px;margin:0 auto;' +
    'aspect-ratio:' + TY_LE_KHUNG + ';';

  // GIỮA: sửa hồ sơ. Việc làm nhiều nhất thì đứng chỗ ngón tay tìm thấy trước.
  vong.append(nutGiua(p, xuLy, coQuyen));

  for (const m of VANH) {
    vong.append(nutVanh(m, p, xuLy, khoiChon, coQuyen));
  }

  boc.append(vong);
  return boc;
}

function nutGiua(p, xuLy, coQuyen) {
  const bat = coQuyen && !!xuLy.onSuaNguoi;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.disabled = !bat;
  nut.dataset.viec = 'sua';
  nut.style.cssText =
    'position:absolute;left:50%;top:' + TREN_GIUA + '%;transform:translateX(-50%);' +
    'width:' + RONG_GIUA + '%;aspect-ratio:1;border-radius:50%;padding:0;' +
    'font-family:inherit;box-sizing:border-box;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;' +
    'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;' +
    'touch-action:manipulation;' +
    'cursor:' + (bat ? 'pointer' : 'not-allowed') + ';opacity:' + (bat ? '1' : '.4') + ';';

  const bt = document.createElement('div');
  bt.textContent = '✏';
  bt.style.cssText = 'font-size:19px;line-height:1';

  const chu = document.createElement('div');
  chu.textContent = 'Sửa\nhồ sơ';
  chu.style.cssText = 'font-size:11px;line-height:1.25;white-space:pre-line;text-align:center';

  nut.append(bt, chu);
  if (bat) {
    nut.addEventListener('click', () => { closePersonDetail(); xuLy.onSuaNguoi(p.id); });
  }
  return nut;
}

function nutVanh(m, p, xuLy, khoiChon, coQuyen) {
  const chay = viecCuaVanh(m.viec, p, xuLy, khoiChon);
  const bat  = coQuyen && !!chay;

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
  tron.textContent = m.bieuTuong;
  tron.style.cssText =
    'width:' + (RONG_TRON / RONG_MUC * 100) + '%;aspect-ratio:1;border-radius:50%;' +
    'display:flex;align-items:center;justify-content:center;font-size:20px;' +
    'box-sizing:border-box;' +
    (m.do
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#2a2622;background:#fff;border:1px solid #e6e0d8');

  const chu = document.createElement('div');
  chu.textContent = m.chu;
  chu.style.cssText =
    'font-size:11px;line-height:1.25;white-space:pre-line;text-align:center;' +
    'color:' + (m.do ? '#8a3a2a' : '#5c554e');

  nut.append(tron, chu);
  if (bat) nut.addEventListener('click', chay);
  return nut;
}

/**
 * Việc thật đằng sau mỗi mục. Trả về `null` khi nơi gọi không đưa hàm xử lý —
 * lúc ấy `nutVanh` cho mục ấy mờ đi.
 *
 * ⚠ Thẻ này KHÔNG tự mở form, không tự mở danh sách người, không tự ghi gì.
 * `person-edit.js` và `person-list.js` cũng thuộc lớp `pages`, mà hai file
 * `pages` không import lẫn nhau (chốt 17/08/2026, chat 1.6): import vòng tròn
 * thì một trong hai thấy hàm của file kia là `undefined` tuỳ thứ tự nạp, và lỗi
 * ấy chỉ hiện trên GitHub Pages chứ không hiện lúc chạy thử.
 */
function viecCuaVanh(viec, p, xuLy, khoiChon) {
  if (viec === 'chaMe') {
    return xuLy.onThemChaMe ? () => moChonChaMe(p, xuLy, khoiChon) : null;
  }
  if (viec === 'banDoi') {
    return xuLy.onThemBanDoi
      ? () => { closePersonDetail(); xuLy.onThemBanDoi(p.id); } : null;
  }
  if (viec === 'con') {
    return xuLy.onThemCon ? () => moChonCap(p, xuLy, khoiChon) : null;
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

/**
 * "Thêm cha / mẹ" phải hỏi thêm một câu: cha hay mẹ.
 *
 * Hỏi ở ĐÂY chứ không để form tự hỏi, vì giới tính quyết định chỗ đứng
 * trái/phải trên sơ đồ (QUY-TAC-VE §2) — người dùng đang nghĩ về hình, và câu
 * hỏi nên rơi vào lúc họ còn đang nhìn hình. Ô giới tính trong form vẫn sửa
 * được, nên trả lời nhầm ở đây không phải vết vĩnh viễn.
 *
 * Có nút thứ ba *"chưa rõ"*: gia phả cũ có những bản ghi chỉ còn nhớ là "có một
 * người ở đây". Chặn ở cửa vào là buộc người ta bịa ra một giới tính.
 */
function moChonChaMe(p, xuLy, khoiChon) {
  khoiChon.innerHTML = '';

  const nhan = document.createElement('div');
  nhan.textContent = 'Thêm cha hay thêm mẹ?';
  nhan.style.cssText =
    'margin-top:16px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:#8a8078';
  khoiChon.append(nhan);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px';

  for (const [ma, chu] of [['M', 'Thêm cha'], ['F', 'Thêm mẹ'], ['U', 'Chưa rõ']]) {
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.textContent = chu;
    nut.style.cssText =
      'flex:1 1 0;min-height:44px;padding:0 8px;font-size:14px;font-family:inherit;' +
      'color:#2a2622;border:1px solid #e6e0d8;border-radius:9px;background:#fff;' +
      'cursor:pointer;touch-action:manipulation';
    nut.addEventListener('click', () => {
      closePersonDetail();
      xuLy.onThemChaMe(p.id, ma);
    });
    hang.append(nut);
  }

  khoiChon.append(hang);
  khoiChon.scrollIntoView({ block: 'nearest' });
}

/**
 * Chọn xem người con mới thuộc về cặp nào, rồi giao lại cho nơi gọi.
 *
 * Ba đường, và đường thứ ba là lý do phải có hàm này:
 *   - chưa có cặp nào  → nối vào chính người này; form sẽ tạo một cặp một người
 *     trong cùng lần lưu. Gia phả cũ đầy những bà mẹ không còn ai nhớ tên chồng,
 *     nên đây KHÔNG phải ca hiếm;
 *   - đúng một cặp     → đi thẳng, không hỏi;
 *   - từ hai cặp trở lên → PHẢI hỏi. Đoán hộ ở đây là nối người con vào nhầm
 *     đời vợ, và cái sai ấy nằm im trong dữ liệu cho tới lúc có người xem sơ đồ
 *     quanh đúng người ấy. `U0004`/`U0005` — hai đời vợ ông Cương — là ca thật
 *     đang có sẵn trong dữ liệu làm việc.
 */
function moChonCap(p, xuLy, khoiChon) {
  const cacCap = getPartnerUnions(state.index, p.id);

  if (cacCap.length === 0) {
    closePersonDetail();
    xuLy.onThemCon({ chaMeId: p.id });
    return;
  }
  if (cacCap.length === 1) {
    closePersonDetail();
    xuLy.onThemCon({ unionId: cacCap[0].id });
    return;
  }

  khoiChon.innerHTML = '';

  const nhan = document.createElement('div');
  nhan.textContent = 'Thêm con vào cặp nào?';
  nhan.style.cssText =
    'margin-top:16px;margin-bottom:6px;font-size:12px;font-weight:600;' +
    'letter-spacing:.04em;color:#8a8078';
  khoiChon.append(nhan);

  for (const u of cacCap) {
    const banDoi = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => id !== p.id && state.index.personById.has(id))
      .map((id) => fullName(state.index.personById.get(id)));

    const nut = document.createElement('button');
    nut.type = 'button';
    nut.style.cssText =
      'display:block;width:100%;text-align:left;margin-top:6px;padding:9px 11px;' +
      'font-family:inherit;font-size:14px;color:#2a2622;border:1px solid #e6e0d8;' +
      'border-radius:8px;background:#fff;cursor:pointer;touch-action:manipulation';

    const dong1 = document.createElement('div');
    dong1.textContent = banDoi.length > 0
      ? 'Với ' + banDoi.join(' và ')
      : 'Một mình ' + fullName(p) + ' (cặp chưa có bạn đời)';

    const dong2 = document.createElement('div');
    const soCon = (Array.isArray(u.children) ? u.children : []).length;
    dong2.textContent = [ghiChuHonNhan(u), soCon > 0 ? soCon + ' con' : 'chưa có con', u.id]
      .filter(coGiaTri).join('  ·  ');
    dong2.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px';

    nut.append(dong1, dong2);
    nut.addEventListener('click', () => {
      closePersonDetail();
      xuLy.onThemCon({ unionId: u.id });
    });
    khoiChon.append(nut);
  }

  khoiChon.scrollIntoView({ block: 'nearest' });
}

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
