// ============================================================
// giapha · js/pages/person-detail.js
// Vai trò  : MENU vòng tròn (cửa mặc định) + THẺ thông tin của một người
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{person,union}, services/repo, utils/{text,date}
// Phiên bản: 1.5.0 · Cập nhật: 20/08/2026 14:10
// ============================================================
//
// --- HAI MÀN HÌNH, HAI CÂU HỎI (chốt 20/08/2026) ------------------------
//
// File này xuất ra HAI cửa, và chúng trả lời hai câu khác nhau:
//
//   openPersonMenu()   — *"tôi muốn LÀM GÌ với người này?"*  ⟵ cửa MẶC ĐỊNH
//                        của cú chạm giữ và cú bấm chuột phải. Tám việc quanh
//                        một vòng tròn, tên người ở giữa.
//   openPersonDetail() — *"người này LÀ AI?"*  ngày tháng, tên khác, ba nhóm
//                        quan hệ. Mở từ mục ⓘ trong vòng tròn.
//
// **Trước 20/08 hai thứ này nằm chung một thẻ, và đó là thừa.** Chạm giữ vào
// một ô là hiện ra cả tiểu sử lẫn tám cái nút — mà chín lần trên mười người ta
// chạm giữ vì muốn LÀM một việc, còn đọc tiểu sử thì đã đọc ngay trên sơ đồ.
// Cái thẻ dài ấy bắt cuộn qua ba nhóm quan hệ mới tới được chỗ bấm.
//
// Tách ra thì mỗi màn hình ngắn lại, và đường đi giữa chúng là hai chiều: ⓘ
// trong vòng tròn dẫn sang thẻ, nút *"Sửa gia phả"* dưới thẻ dẫn ngược về
// vòng tròn. Cả hai dùng CHUNG `lopPhu`, nên không bao giờ chồng lên nhau.
//
// ⚠ Hai cửa, MỘT bộ hàm xử lý. Nơi gọi truyền đúng một `xuLy` và nó đi xuyên
// qua cả hai màn hình — thẻ mở menu thì chuyền tiếp, menu mở thẻ cũng vậy. Hai
// bộ khác nhau là thứ đẻ ra cảnh cùng một nút mà lúc chạy lúc không, tuỳ người
// dùng đã đi qua màn hình nào.
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
  'display:flex;align-items:center;justify-content:center;padding:20px;' +
  'font-family:system-ui,sans-serif;color:#2a2622';

const KIEU_HOP =
  'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
  'width:100%;max-width:360px;max-height:82vh;overflow:auto;' +
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
 *          onThemCon?:function({unionId?:string, chaMeId?:string}),
 *          onKetNoi?:function(string), onGoNoi?:function(string),
 *          onXoaNguoi?:function(string)}} [xuLy]
 *        `onChonNguoi`  bấm một người trong phần quan hệ, hoặc nút "Đưa ra giữa
 *                       sơ đồ". Thẻ tự đóng trước khi gọi.
 *        `onSuaNguoi`   mục ✏ của vòng tròn.
 *        `onThemChaMe`  **chỉ có mã người**. Cha hay mẹ thì ô giới tính trong
 *                       form nói ra, menu không hỏi trước (đổi 20/08/2026).
 *        `onThemBanDoi` chỗ chọn cặp nằm ở `person-edit.js`, không nằm đây.
 *        `onThemCon`    kèm CHỖ NỐI đã chọn xong.
 *        `onKetNoi`     nơi gọi mở màn hình Danh sách người để chọn người kia.
 *        `onGoNoi`      nơi gọi mở danh sách mối nối hiện có.
 *        `onXoaNguoi`   thẻ KHÔNG hỏi lại gì.
 *
 * ⚠ TÁM MỤC CỦA VÒNG TRÒN ĐỀU LÀ CỬA, KHÔNG PHẢI VIỆC. Mọi hộp xác nhận, mọi
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
 * Chân THẺ THÔNG TIN: chỉ ba nút đi lại. Vòng tròn KHÔNG nằm ở đây.
 *
 * Từ 20/08/2026 thẻ thông tin và menu vòng tròn là HAI màn hình, không phải một
 * — xem ghi chú *"Hai màn hình, hai câu hỏi"* ở đầu file. Nút *"Sửa gia phả"*
 * là đường đi từ thẻ sang menu; nó gọi thẳng `openPersonMenu` vì cả hai sống
 * trong cùng file này, không phải một lớp khác.
 */
function veChanThe(p, xuLy) {
  const boc = document.createElement('div');

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  chan.append(
    nutChan('Sửa gia phả', false, () => openPersonMenu(p.id, xuLy)),
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
// Bắt chước Quick Family Tree: người ở GIỮA, tám việc quanh vành. Hai điều nhớ
// được mà không phải học, và đó là toàn bộ lý do chọn hình tròn thay vì một
// danh sách dọc:
//
//   · TRÊN là cha mẹ, DƯỚI là con — đúng chiều của chính cái sơ đồ đằng sau;
//   · NỬA PHẢI là xem và nối thêm, NỬA TRÁI là sửa và bỏ đi. Hai việc bỏ đi
//     (Gỡ nối · Xoá) nằm gọn một bên và tô đỏ.
//
// ⚠ **TÂM VÒNG TRÒN LÀ TÊN NGƯỜI, KHÔNG PHẢI MỘT CÁI NÚT.** Cố ý, và có hai lý
// do. Thứ nhất: menu này nay mở ra một mình, không còn thẻ thông tin bọc quanh,
// nên nếu không có gì nói *"đang thao tác lên ai"* thì người dùng bấm mù — mà
// chỗ nói điều đó rõ nhất là ngay giữa vòng tròn, chứ không phải một dòng chữ
// trên đầu. Thứ hai: **tám mục phải cách đều nhau 45°** thì hai mnemonic ở trên
// mới đứng được; nhét việc thứ chín vào tâm là được, nhưng lúc ấy tâm thành một
// đích chạm nằm sát tám đích khác, và nó là đích DỄ TRÚNG NHẤT.
//
// ⚠ Chỗ này dành sẵn cho **ẢNH NGƯỜI** ở bước 27. Ảnh vào đúng giữa vòng tròn
// là thứ Quick Family Tree làm, và nó trả lời câu *"đúng người chưa?"* nhanh
// hơn mọi dòng chữ.
//
// ⚠ Đánh đổi phải nói ra: một danh sách dọc tám dòng thì DỄ ĐỌC hơn vòng tròn,
// nhất là với chữ Việt có dấu ở cỡ 11px. Đổi lại, vòng tròn cho mỗi việc một
// CHỖ ĐỨNG cố định, và người dùng hằng ngày bấm theo trí nhớ vị trí chứ không
// đọc lại nhãn. Vì thế mọi đích chạm ở đây rộng 68px — vượt mức 44px tối thiểu
// — và nhãn nằm NGOÀI vòng tròn chứ không nhét vào trong.
//
// ⚠ `left` và `top` đều đặt bằng PHẦN TRĂM, cộng `aspect-ratio` giữ chiều cao
// co theo bề ngang. Thẻ rộng 324px trên màn hình 360px nhưng chỉ còn 244px trên
// màn hình 320px; đo theo phần trăm thì hình học GIỐNG NHAU ở mọi bề ngang, nên
// không chồng nhau ở khổ rộng nghĩa là không chồng nhau ở mọi khổ.

const TY_LE_KHUNG = '280 / 308';   // khung chuẩn 280 × 308px
const RONG_MUC    = 24.29;   // % — 68/280
const RONG_TRON   = 18.57;   // % — 52/280
const RONG_GIUA   = 23;      // % — 64/280. Nhỏ hơn nút vành một chút: tám
                             // nhãn chụm quanh tâm nên phần giữa cần thoáng.
const TREN_GIUA   = 31.82;   // % — 98/308 (tâm vẫn ở đúng giữa vòng)

/**
 * Tám việc quanh vành, cách đều 45°, bán kính 104px. `x` là % bề ngang, `top`
 * là % chiều cao — tính sẵn từ góc để khỏi phải chạy lượng giác trong lúc vẽ.
 *
 *        -90 Thêm cha / mẹ
 *   -135 Sửa hồ sơ    -45 Thêm vợ / chồng
 *    180 Xoá             0 Kết nối
 *   +135 Gỡ nối        +45 Thông tin
 *        +90 Thêm con
 */
// ⚠ NHÃN CHỈ ĐƯỢC MỘT DÒNG, và đó là ràng buộc HÌNH HỌC chứ không phải thẩm mỹ.
// Với sáu mục cách nhau 60° thì nhãn hai dòng còn vừa; với TÁM mục cách nhau 45°
// thì khối nút cao 83px làm ba cặp kề nhau chồng lên nhau — nhãn của mục này đè
// lên vòng tròn của mục kế. Một dòng hạ khối xuống 68px và ba cặp ấy rời ra.
// Bài kiểm hành vi bắt được đúng ba cặp: `banDoi×ketNoi`, `goNoi×xoa`, `xoa×sua`.
//
// Hệ quả: nhãn phải NGẮN. Dấu `+` thay chữ "Thêm" cho ba mục thêm người — vừa
// gọn vừa nói đúng một việc, và `⬆`/`⬇` đã mang sẵn nghĩa trên/dưới.
const VANH = [
  { x: 50,    top: 0,     bieuTuong: '⬆', chu: '+ Cha mẹ',   viec: 'chaMe'    },
  { x: 76.25, top: 9.90,  bieuTuong: '💍', chu: '+ Vợ chồng', viec: 'banDoi'   },
  { x: 87.14, top: 33.77, bieuTuong: '🔗', chu: 'Kết nối',    viec: 'ketNoi'   },
  { x: 76.25, top: 57.63, bieuTuong: 'ⓘ', chu: 'Thông tin',  viec: 'thongTin' },
  { x: 50,    top: 67.53, bieuTuong: '⬇', chu: '+ Con',      viec: 'con'      },
  { x: 23.75, top: 57.63, bieuTuong: '✂', chu: 'Gỡ nối',     viec: 'goNoi', do: true },
  { x: 12.86, top: 33.77, bieuTuong: '🗑', chu: 'Xoá',       viec: 'xoa',   do: true },
  { x: 23.75, top: 9.90,  bieuTuong: '📝', chu: 'Sửa hồ sơ',  viec: 'sua'      },
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
  hop.style.cssText = KIEU_HOP + 'max-width:340px;';

  hop.append(...veDauThe(p));

  // Chỗ hiện bảng chọn phụ ("thêm con vào cặp nào"). Nằm DƯỚI vòng tròn: câu
  // hỏi phụ phải mọc ra ngay cạnh cái nút vừa bấm, không mọc trên đầu.
  const khoiChon = document.createElement('div');
  hop.append(renderActionMenu(p, xuLy, khoiChon));
  hop.append(khoiChon);

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
 * chứ không biến mất. Tám chỗ đứng phải cố định thì trí nhớ vị trí mới dùng
 * được; một vành lúc tám nút lúc sáu nút là một vành khác nhau mỗi lần mở.
 *
 * ⚠ *Thông tin* là ngoại lệ duy nhất — nó **luôn bấm được**, kể cả khi chỉ có
 * quyền xem, vì nó không sửa gì cả. Bảy mục kia đều ghi dữ liệu.
 */
function renderActionMenu(p, xuLy, khoiChon) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:14px';

  const coQuyen = suaDuoc();

  if (!coQuyen) {
    const nhac = document.createElement('div');
    nhac.textContent =
      'Bạn chỉ có quyền xem gia phả, nên bảy việc sửa dưới đây chưa dùng được — ' +
      'chỉ còn "Thông tin". Cần sửa thật thì nhờ người quản lý đổi quyền trên ' +
      'Google Drive.';
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

  vong.append(veTamVong(p));
  for (const m of VANH) vong.append(nutVanh(m, p, xuLy, khoiChon, coQuyen));

  boc.append(vong);
  return boc;
}

/**
 * TÂM vòng tròn: tên gọi của người đang được thao tác. KHÔNG phải nút.
 *
 * Lấy **tên gọi** chứ không lấy cả họ tên: 76px ở cỡ chữ 11px chỉ chứa nổi một
 * hai chữ, mà cái phân biệt được người này với người kia trong một gia phả toàn
 * người cùng họ chính là chữ cuối. Họ tên đầy đủ đã nằm ngay trên đầu hộp.
 */
function veTamVong(p) {
  const tron = document.createElement('div');
  tron.style.cssText =
    'position:absolute;left:50%;top:' + TREN_GIUA + '%;transform:translateX(-50%);' +
    'width:' + RONG_GIUA + '%;aspect-ratio:1;border-radius:50%;box-sizing:border-box;' +
    'display:flex;align-items:center;justify-content:center;padding:6px;' +
    'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;' +
    'font-size:12px;line-height:1.25;text-align:center;word-break:break-word';

  const day = (fullName(p) || '').trim();
  tron.textContent = tenGoi(p) || p.id;
  if (day) tron.title = day;
  return tron;
}

/** Chữ cuối của họ tên — thứ người trong họ gọi nhau hằng ngày. */
function tenGoi(p) {
  const ds = (Array.isArray(p.names) ? p.names : []);
  const muc = ds.find((n) => n && n.type === 'chinh') || ds[0];
  const goi = muc && typeof muc.given === 'string' ? muc.given.trim() : '';
  if (goi) return goi;

  const day = (fullName(p) || '').trim();
  if (!day) return '';
  const phan = day.split(/\s+/);
  return phan[phan.length - 1];
}

function nutVanh(m, p, xuLy, khoiChon, coQuyen) {
  const chay = viecCuaVanh(m.viec, p, xuLy, khoiChon);
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
function viecCuaVanh(viec, p, xuLy, khoiChon) {
  if (viec === 'thongTin') {
    return () => openPersonDetail(p.id, xuLy);
  }
  if (viec === 'sua') {
    return xuLy.onSuaNguoi
      ? () => { closePersonDetail(); xuLy.onSuaNguoi(p.id); } : null;
  }
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
