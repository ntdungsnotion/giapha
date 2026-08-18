// ============================================================
// giapha · js/pages/tree-view.js
// Vai trò  : MÀN HÌNH CHÍNH — sơ đồ cây, đổi người trung tâm
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{bloodline,layout,render}, utils/text,
//            pages/{person-detail,person-edit,settings}
// Phiên bản: 1.7.0 · Cập nhật: 18/08/2026 10:05
// ============================================================
//
// Ba bước, gọi liền nhau, KHÔNG được đảo thứ tự (QUY-TAC-VE §11):
//
//   const visible = computeVisibleSet(index, focus, scope);
//   const stubs   = findStubPoints(index, visible, scope);
//   const layout  = computeLayout(index, focus, visible, scope, stubs);
//
// `stubPoints` truyền từ ngoài vào chứ không để layout.js tự gọi: cả hai hàm
// đều nằm ở lớp `domains`, mà luật lớp chỉ cho `domains` gọi `utils` và
// `config`. Nơi duy nhất được ghép chúng lại là đây, lớp `pages`.
//
// showInLaws là BỘ LỌC HẬU KỲ (QUY-TAC-VE §1) — lọc sau computeVisibleSet,
// KHÔNG sửa vào trong nó, để bộ số kiểm thử của chat 1.2 còn nguyên giá trị.
// Công tắc bật/tắt nằm cuối cột nút dưới trái (chat 1.6).
//
// Bố cục nút, đối chiếu Quick Family Tree (chat 1.5 và 1.6):
//   Trên trái  — cột 4 nút chọn số đời TỔ TIÊN
//   Dưới trái  — cột 4 nút chọn phạm vi HẬU DUỆ + công tắc dâu/rể
//   Trên phải  — Cài đặt · Tìm kiếm · Chụp ảnh sơ đồ
//   Dưới phải  — Thông tin · Phóng to · Thu nhỏ · Đưa người trung tâm về giữa
//
// Cả ba cụm nút neo vào `vungSoDo`, KHÔNG vào `khungCuon`: `donKhung()` dọn
// sạch ruột khung cuộn mỗi lần vẽ lại, và mọi thứ trong đó còn trôi theo khi
// người dùng kéo sơ đồ. Neo vào `vungSoDo` chứ không vào `containerEl` để khỏi
// phải đo chiều cao `thanhTren` — thanh trên cao bao nhiêu là do nội dung nó
// quyết định, mà đo DOM đúng lúc là chỗ chat 1.5 đã sai một lần.
//
// ============================================================
// ZOOM VÀ KÉO (chat 1.5) — LUẬT QUAN TRỌNG NHẤT CỦA FILE NÀY
// ============================================================
//
// TOẠ ĐỘ SƠ ĐỒ KHÔNG BAO GIỜ ĐỔI. `layout.js` sinh pixel một lần, `viewBox`
// của SVG giữ nguyên bằng `bounds` — zoom chỉ đổi HAI THUỘC TÍNH `width` và
// `height` của thẻ <svg>, tức đổi cỡ hiển thị chứ không đổi nội dung.
//
// Vì sao làm vậy chứ không đụng `layout.js`: mọi bất biến của chat 1.3 và 1.4
// (không chồng ô, nốt cụt không đè lên ô, đời = độ sâu lớn nhất) được kiểm
// trên toạ độ do `layout.js` sinh. Đổi toạ độ để zoom là phải chạy lại toàn
// bộ số đó. Đổi cỡ hiển thị thì không bất biến nào đụng tới.
//
// KÉO thì dùng lại chính thanh cuộn của `khungCuon` — `scrollLeft`,
// `scrollTop`. Không dựng hệ toạ độ riêng, nên chuột, bàn phím, thanh cuộn và
// ngón tay đều đi qua cùng một đường.
//
// Ba hệ quả phải nhớ:
//
//   1. `touch-action: none` là BẮT BUỘC. Không có nó thì trình duyệt nuốt mất
//      cử chỉ pinch (nó phóng to cả trang, không phóng sơ đồ). Cái giá: cuộn
//      quán tính của hệ điều hành mất, nên ta tự làm lấy — xem `chayDa()`.
//   2. Kéo xong KHÔNG được để `click` bắn ra, nếu không mỗi lần kéo là một
//      lần đổi người trung tâm ngoài ý muốn. Xem `daKeo`.
//   3. Sơ đồ nhỏ hơn khung thì phải căn giữa bằng `padding` của khung cuộn,
//      KHÔNG bằng flexbox: phần tử flex căn giữa mà tràn khung thì phần thò
//      ra bên trái không cuộn tới được — lỗi kinh điển, đã tránh có chủ ý.

import { state, notify } from '../state.js';
import { computeVisibleSet, findStubPoints } from '../domains/bloodline.js';
import { computeLayout } from '../domains/layout.js';
import { renderTree } from '../domains/render.js';
import { fullName, doiSongNguoi } from '../utils/text.js';
import { openPersonDetail, closePersonDetail } from './person-detail.js';
import { openPersonForm, closePersonForm, quickAddChild } from './person-edit.js';
import { openSettings, closeSettings } from './settings.js';

let khungCuon = null;   // div cuộn được, bọc quanh SVG
let vungSoDo  = null;   // bọc khungCuon + ba cụm nút nổi; mốc neo của các nút
let svgEl     = null;
let thanhTren = null;
let nhanTyLe  = null;   // ô chữ "100%" cạnh hai nút phóng to / thu nhỏ
let layoutHT  = null;   // kết quả computeLayout gần nhất, để centerOnFocus dùng

// --- Trạng thái zoom ------------------------------------------------------
// tyLe GIỮ NGUYÊN khi đổi người trung tâm: người dùng thu nhỏ để nhìn toàn
// cảnh rồi bấm một nốt cụt, mà sơ đồ nhảy về 100% thì mất chỗ đang xem.
const TY_LE_MIN = 0.25;
const TY_LE_MAX = 3;
const TY_LE_NAC = 1.25;   // mỗi lần bấm nút phóng to / thu nhỏ

let tyLe = 1;
let padX = 0;   // lề căn giữa khi sơ đồ hẹp hơn khung
let padY = 0;

/**
 * Dựng màn hình sơ đồ vào `containerEl` rồi vẽ lần đầu.
 * Gọi từ pages/khoi-dong.js sau khi máy chủ xác nhận người dùng đọc được cây.
 */
export function mountTreeView(containerEl) {
  if (!containerEl) return;
  // Thẻ thông tin và màn hình Cài đặt sống ở `document.body`, ngoài
  // `containerEl` — dọn ruột container không đụng tới chúng, nên phải đóng tay.
  closePersonDetail();
  closePersonForm();
  closeSettings();
  containerEl.innerHTML = '';
  containerEl.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;' +
    'background:#faf8f5;font-family:system-ui,sans-serif;color:#2a2622';

  thanhTren = document.createElement('div');
  thanhTren.style.cssText =
    'flex:0 0 auto;padding:10px 16px;border-bottom:1px solid #e6e0d8;' +
    'background:#fffdf9;font-size:14px;line-height:1.4';

  khungCuon = document.createElement('div');
  // box-sizing: border-box — `padding` căn giữa được đặt lại mỗi lần zoom, mà
  // với content-box thì padding cộng thêm vào bề rộng và làm khung tràn ra
  // khỏi màn hình.
  // touch-action: none — xem khối ZOOM VÀ KÉO ở đầu file.
  khungCuon.style.cssText =
    'flex:1 1 auto;overflow:auto;-webkit-overflow-scrolling:touch;padding:0;' +
    'box-sizing:border-box;touch-action:none;overscroll-behavior:contain;' +
    'user-select:none;-webkit-user-select:none';

  svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.style.cssText = 'display:block';
  khungCuon.append(svgEl);

  // min-height:0 — không có nó thì phần tử flex không co xuống dưới chiều cao
  // nội dung, và khung cuộn dài quá màn hình thay vì tự cuộn bên trong.
  vungSoDo = document.createElement('div');
  vungSoDo.style.cssText =
    'position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column';

  // Nút nằm ngoài khungCuon: donKhung() dọn sạch ruột khung cuộn mỗi lần vẽ
  // lại, để nút bên trong đó là mỗi lần bấm nốt cụt lại mất hết nút.
  vungSoDo.append(khungCuon, veCotToTien(), veCotHauDue(), veHopNutTrenPhai(), veHopNut());
  containerEl.append(thanhTren, vungSoDo);
  ganCuChi();
  refresh();
}

/**
 * Vẽ lại toàn bộ. Gọi khi đổi focus, đổi phạm vi, hoặc sửa dữ liệu.
 *
 * Không dùng subscribe() của state: người gọi đổi state xong gọi thẳng hàm
 * này. Vẽ lại cả sơ đồ hai lần cho một lần bấm là thứ nhìn thấy được bằng mắt.
 */
export function refresh() {
  if (!svgEl) return;
  donKhung();

  // Đặt trước mọi đường `return` bên dưới: nút phải nói đúng phạm vi đang chọn
  // kể cả khi sơ đồ không vẽ được. Hàm này chỉ đọc `state`, không đo DOM, nên
  // gọi ở đâu cũng cho cùng kết quả — khác hẳn ba việc cuối hàm.
  capNhatNutPhamVi();

  const index = state.index;
  const focus = state.focusPersonId;

  if (!index || !focus) {
    hienLoiNhan('Chưa chọn được người trung tâm.',
                'Mở màn hình Cài đặt để chọn một người, hoặc kiểm tra lại file dữ liệu.');
    return;
  }

  // --- Ba bước, đúng thứ tự ------------------------------------------------
  let visible = computeVisibleSet(index, focus, state.scope);

  // Bộ lọc hậu kỳ showInLaws, bật/tắt bằng công tắc cuối cột nút dưới trái.
  // layout.js không cần biết núm này tồn tại — đã chạy thử cả 56 sơ đồ ở nấc tắt.
  if (state.showInLaws === false) {
    visible = new Map([...visible].filter(([, kieu]) => kieu !== 'edge'));
  }

  if (visible.size === 0) {
    const p = index.personById.get(focus);
    hienLoiNhan(
      p ? 'Không vẽ được sơ đồ quanh ' + fullName(p) + '.'
        : 'Người trung tâm ' + focus + ' không còn trong gia phả.',
      'Có thể bản ghi này đã bị xoá. Chọn một người khác ở màn hình Cài đặt.');
    return;
  }

  const stubs  = findStubPoints(index, visible, state.scope);
  const layout = computeLayout(index, focus, visible, state.scope, stubs);
  layoutHT = layout;

  renderTree(svgEl, layout, index, {
    onChonNguoi:  (personId) => setFocusPerson(personId),
    onChonNotCut: (stub) => moNotCut(stub, visible),
  });

  // BA VIỆC NÀY PHẢI ĐÚNG THỨ TỰ NÀY, đã sai một lần ở chat 1.5:
  //
  //   1. veThanhTren  — thanh trên cao bao nhiêu thì khung cuộn thấp bấy
  //      nhiêu. Vẽ nó SAU khi đo khung thì mọi con số đo được đều lệch đúng
  //      bằng chiều cao thanh, và người trung tâm rơi lệch xuống dưới.
  //   2. apDungTyLe   — renderTree() vừa đặt lại width/height của <svg> về cỡ
  //      thật 100%, phải áp lại tỷ lệ đang dùng và tính lại lề căn giữa.
  //   3. centerOnFocus — tính theo `tyLe` và `padX/padY` mà bước 2 vừa sinh.
  veThanhTren(index, focus, visible, layout);
  apDungTyLe();
  centerOnFocus();
}

/**
 * Đổi người trung tâm rồi vẽ lại. Gọi khi chạm vào một người hoặc một nốt cụt.
 *
 * Bấm vào chính người trung tâm thì không làm gì — vẽ lại y hệt sơ đồ cũ chỉ
 * làm màn hình nháy một cái.
 */
export function setFocusPerson(personId) {
  if (!personId || personId === state.focusPersonId) return;
  if (state.index && !state.index.personById.has(personId)) return;
  state.focusPersonId = personId;
  notify();
  refresh();
}

/**
 * Bấm vào một nốt cụt: mở nhánh bị cắt ra.
 *
 * Nốt thường (một người phía sau) thì đi thẳng. Nốt GỘP — nhiều chỗ cắt rơi
 * đúng một điểm nên layout.js gom làm một — thì phải hiện danh sách để chọn,
 * nếu không người dùng bấm vào mà không biết mình vừa đi đâu.
 */
function moNotCut(stub, visible) {
  const ds = nguoiSauNotCut(state.index, visible, stub);
  if (ds.length === 0) return;
  if (ds.length === 1) { setFocusPerson(ds[0]); return; }
  hienDanhSachChon(ds);
}

/**
 * Những người nằm SAU một nốt cụt — tức đang bị ẩn ở hướng đó.
 *
 * `findStubPoints()` chỉ đếm `hiddenCount`, không trả về danh sách người: nó
 * là hàm thuần của lớp domains, và đếm là đủ cho việc vẽ. Tra ra từng người
 * là việc của màn hình, làm ngay lúc bấm.
 *
 *   direction 'up'   — bộ cha mẹ chưa vẽ  → lấy các partner đang bị ẩn
 *   direction 'side' — union bị cắt bớt   → lấy cả partner lẫn con bị ẩn
 *
 * Đọc `nguon` chứ không đọc mình `stub`: nốt gộp giữ đủ từng mục gốc ở đó.
 */
function nguoiSauNotCut(index, visible, stub) {
  const ra = [];
  if (!index || !stub) return ra;

  const them = (id) => {
    if (!id || visible.has(id)) return;
    if (!index.personById.has(id)) return;      // đã xoá mềm, hoặc mã lạ
    if (ra.indexOf(id) === -1) ra.push(id);
  };

  const nguon = Array.isArray(stub.nguon) && stub.nguon.length
    ? stub.nguon
    : [{ unionId: stub.unionId, direction: stub.direction }];

  for (const ng of nguon) {
    const u = index.unionById.get(ng.unionId);
    if (!u) continue;
    for (const pid of Array.isArray(u.partners) ? u.partners : []) them(pid);
    if (ng.direction !== 'up') {
      for (const con of Array.isArray(u.children) ? u.children : []) {
        them(con && con.personId);
      }
    }
  }
  return ra;
}

// ============================================================
// ZOOM VÀ KÉO
// ============================================================

/**
 * Áp tỷ lệ đang dùng lên thẻ <svg>, rồi tính lại lề căn giữa.
 *
 * `viewBox` KHÔNG đụng tới — nó vẫn là `bounds` do layout.js sinh. Chỉ hai
 * thuộc tính width/height đổi, nên nội dung phóng to đều, mọi nét mọi chữ
 * giữ đúng tỷ lệ với nhau.
 *
 * Lề `padX`/`padY` chỉ khác 0 khi sơ đồ HẸP HƠN khung: lúc đó đẩy nó vào
 * giữa cho đỡ lệch. Sơ đồ rộng hơn khung thì lề bằng 0 và khung cuộn bình
 * thường.
 */
function apDungTyLe() {
  if (!svgEl || !khungCuon || !layoutHT || !layoutHT.bounds) return;
  const b    = layoutHT.bounds;
  const rong = Math.max(1, b.maxX - b.minX) * tyLe;
  const cao  = Math.max(1, b.maxY - b.minY) * tyLe;

  svgEl.setAttribute('width',  String(Math.round(rong)));
  svgEl.setAttribute('height', String(Math.round(cao)));

  padX = Math.max(0, (khungCuon.clientWidth  - rong) / 2);
  padY = Math.max(0, (khungCuon.clientHeight - cao)  / 2);
  khungCuon.style.padding = padY + 'px ' + padX + 'px';

  if (nhanTyLe) nhanTyLe.textContent = Math.round(tyLe * 100) + '%';
}

/**
 * Đổi tỷ lệ, giữ NGUYÊN chỗ đang xem.
 *
 * `noiDungX/Y` là một điểm trong hệ toạ độ sơ đồ (cùng hệ với `bounds`), và
 * `cx/cy` là chỗ trên màn hình mà điểm đó phải nằm sau khi đổi tỷ lệ. Nhờ
 * tách hai thứ này mà cùng một hàm phục vụ được cả ba đường vào:
 *
 *   - bấm nút phóng to  → neo TÂM KHUNG NHÌN, người dùng không mất chỗ
 *   - pinch hai ngón    → neo ĐIỂM GIỮA HAI NGÓN, ảnh bám theo tay
 *   - lăn chuột + Ctrl  → neo ĐẦU CON TRỎ
 *
 * Không có phần neo này thì mỗi lần phóng to là sơ đồ nhảy về góc trên trái.
 */
function datTyLeNeo(tyLeMoi, noiDungX, noiDungY, cx, cy) {
  if (!khungCuon || !layoutHT) return;
  const moi = Math.min(TY_LE_MAX, Math.max(TY_LE_MIN, tyLeMoi));
  if (Math.abs(moi - tyLe) < 0.0005) return;

  tyLe = moi;
  apDungTyLe();
  khungCuon.scrollLeft = noiDungX * tyLe + padX - cx;
  khungCuon.scrollTop  = noiDungY * tyLe + padY - cy;
}

/** Đổi tỷ lệ, neo vào một điểm trên màn hình. `cx/cy` bỏ trống = tâm khung. */
function datTyLe(tyLeMoi, cx, cy) {
  if (!khungCuon) return;
  if (cx === undefined) { cx = khungCuon.clientWidth / 2; cy = khungCuon.clientHeight / 2; }
  const diem = noiDungTaiDiem(cx, cy);
  datTyLeNeo(tyLeMoi, diem.x, diem.y, cx, cy);
}

/** Điểm trong hệ toạ độ sơ đồ đang nằm dưới điểm `(cx, cy)` của khung nhìn. */
function noiDungTaiDiem(cx, cy) {
  return {
    x: (khungCuon.scrollLeft + cx - padX) / tyLe,
    y: (khungCuon.scrollTop  + cy - padY) / tyLe,
  };
}

/**
 * Đưa người trung tâm về giữa khung nhìn.
 *
 * Toạ độ trong `layoutHT` là toạ độ SƠ ĐỒ, phải nhân `tyLe` mới ra pixel trên
 * màn hình, rồi cộng `padX/padY` vì khung cuộn có lề căn giữa.
 */
function centerOnFocus() {
  if (!khungCuon || !layoutHT || !Array.isArray(layoutHT.nodes)) return;
  const nut = layoutHT.nodes.find((n) => n.laTrungTam);
  if (!nut) return;

  const b = layoutHT.bounds;
  khungCuon.scrollLeft =
    ((nut.x - b.minX) + nut.w / 2) * tyLe + padX - khungCuon.clientWidth / 2;
  khungCuon.scrollTop =
    ((nut.y - b.minY) + nut.h / 2) * tyLe + padY - khungCuon.clientHeight / 2;
}

// ============================================================
// Cử chỉ ngón tay
// ============================================================
//
// Dùng Pointer Events, không dùng Touch Events: một bộ mã chạy cho cả ngón
// tay, chuột và bút, nên không có đường nào chỉ được thử trên máy tính rồi
// hỏng trên điện thoại.

const dangCham = new Map();   // pointerId -> {x, y} theo toạ độ màn hình

let keo    = null;   // {x, y, scrollLeft, scrollTop} — đang kéo bằng MỘT ngón
let bam    = null;   // {kc, tyLe, x, y} — đang pinch bằng HAI ngón
let daKeo  = false;  // đã kéo quá ngưỡng → nuốt cú `click` sắp bắn ra
let vanToc = { x: 0, y: 0 };
let daRAF  = 0;
let daGanToanCuc = false;

const NGUONG_KEO = 8;   // px — dưới mức này vẫn tính là một cú chạm, không phải kéo

// --- Chạm giữ để mở thẻ thông tin (chat 1.6) -----------------------------
//
// Chạm NGẮN vào một ô vẫn đổi người trung tâm — đó là tính năng cốt lõi, chốt
// từ chat 1.4, không đụng vào. Chạm GIỮ mở thẻ thông tin.
//
// 500ms: dưới 400ms thì một cú chạm hơi chậm của người lớn tuổi đã bị hiểu
// nhầm thành chạm giữ; trên 600ms thì người dùng tưởng máy không nhận.
//
// Chạm giữ xong phải đặt `daKeo = true`. Nghe vô lý vì tay không hề di chuyển,
// nhưng `daKeo` là cờ "nuốt cú click sắp bắn ra" — không đặt thì nhấc tay lên
// là sơ đồ vừa mở thẻ vừa đổi người trung tâm.
const CHO_CHAM_GIU = 500;

let hendChamGiu = 0;   // id của setTimeout đang chờ

// --- Bấm chuột PHẢI cũng mở thẻ thông tin (chat 2.4, 18/08/2026) ---------
//
// Chạm giữ là cử chỉ của ngón tay. Trên máy tính, "giữ chuột trái nửa giây"
// KHÔNG phải thói quen của ai cả — chủ dự án nêu ra sau lần thử thật. Chuột
// phải thì ngược lại: ai cũng biết nó mở ra thêm lựa chọn.
//
// **Bổ sung, không thay thế.** Giữ chuột trái vẫn chạy y như cũ, vì trên điện
// thoại nó là đường duy nhất.
//
// Trên điện thoại, chạm giữ có thể làm trình duyệt tự bắn thêm `contextmenu`.
// Lúc ấy thẻ đã mở rồi, nên `daMoTheLanNay` chặn không cho mở lại — mở lại là
// dựng lại cả thẻ, người dùng thấy một cái nháy vô cớ.
let daMoTheLanNay = false;


function ganCuChi() {
  if (!khungCuon || khungCuon.dataset.daGanCuChi === '1') return;
  khungCuon.dataset.daGanCuChi = '1';

  khungCuon.addEventListener('pointerdown', chamXuong);
  khungCuon.addEventListener('wheel', lanChuot, { passive: false });
  khungCuon.addEventListener('contextmenu', chuotPhai);

  // Bắt ở pha BẮT (capture) để chặn được trước khi sự kiện tới ô người —
  // kéo sơ đồ mà lại đổi người trung tâm là lỗi khó chịu nhất của kiểu
  // giao diện này.
  khungCuon.addEventListener('click', (e) => {
    if (!daKeo) return;
    daKeo = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  // Ba sự kiện này gắn lên `window`, KHÔNG lên khung cuộn.
  //
  //   - `pointermove`/`pointerup`: kéo mà tay hoặc chuột đi ra ngoài khung thì
  //     khung không nhận được sự kiện nữa, và cú kéo kẹt lại vĩnh viễn — sơ đồ
  //     dính theo con trỏ dù đã thả tay. Đã cố ý KHÔNG dùng
  //     `setPointerCapture()`: nó cũng chữa được lỗi này, nhưng lái luôn cả cú
  //     `click` về khung cuộn, và thế là bấm vào một ô không đổi được người
  //     trung tâm nữa.
  //   - `resize`: xoay ngang điện thoại thì khung đổi cỡ, lề căn giữa phải
  //     tính lại.
  //
  // Gắn MỘT LẦN cho cả vòng đời trang: mountTreeView() chạy lại được (nút
  // "Thử lại" ở màn hình lỗi), mà `window` thì không bị dựng lại theo.
  if (!daGanToanCuc) {
    daGanToanCuc = true;
    window.addEventListener('pointermove',   chamDi);
    window.addEventListener('pointerup',     chamLen);
    window.addEventListener('pointercancel', chamLen);
    window.addEventListener('resize', () => apDungTyLe());
  }
}

/**
 * Chuột phải trên một ô người → mở thẻ thông tin, giống hệt chạm giữ.
 *
 * Chặn menu của trình duyệt **chỉ khi** bấm trúng một ô người. Bấm chuột phải
 * vào chỗ trống của sơ đồ thì menu trình duyệt vẫn hiện ra bình thường — người
 * dùng còn cần nó để lưu ảnh, xem mã nguồn, dịch trang.
 */
function chuotPhai(e) {
  const o = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
  const personId = o && o.getAttribute('data-id');
  if (!personId) return;

  e.preventDefault();
  huyChamGiu();
  if (daMoTheLanNay) return;   // chạm giữ vừa mở rồi, đừng dựng lại thẻ

  daKeo = true;                // nuốt cú click sắp bắn ra, như chạm giữ
  keo = null;
  openPersonDetail(personId, xuLyThe());
}

function chamXuong(e) {
  dungChayDa();
  huyChamGiu();
  dangCham.set(e.pointerId, { x: e.clientX, y: e.clientY });
  daKeo = false;
  daMoTheLanNay = false;

  if (dangCham.size === 1) {
    keo = motCuKeo(e.clientX, e.clientY);
    vanToc = { x: 0, y: 0 };
    bam = null;
    henChamGiu(e);
  } else if (dangCham.size === 2) {
    keo = null;            // hai ngón thì thôi kéo, chuyển sang pinch
    bam = batDauPinch();
  }
}

/**
 * Hẹn mở thẻ thông tin nếu ngón tay còn nằm yên trên một ô người sau 500ms.
 *
 * Ô người là `<g data-id="P0001">` do `render.js` sinh. Nốt cụt mang
 * `data-not-cut` và nằm ở nhóm khác, nên chạm giữ vào nốt cụt không mở thẻ —
 * đúng ý, sau nốt cụt có thể là nhiều người chứ không phải một.
 */
function henChamGiu(e) {
  const o = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
  const personId = o && o.getAttribute('data-id');
  if (!personId) return;

  hendChamGiu = setTimeout(() => {
    hendChamGiu = 0;
    if (daKeo || dangCham.size !== 1) return;   // đã kéo, hoặc đã thêm ngón thứ hai
    daKeo = true;                               // nuốt cú click sắp bắn ra
    keo = null;
    daMoTheLanNay = true;                       // để `contextmenu` khỏi mở lại
    openPersonDetail(personId, xuLyThe());
  }, CHO_CHAM_GIU);
}

function huyChamGiu() {
  if (hendChamGiu) { clearTimeout(hendChamGiu); hendChamGiu = 0; }
}

function chamDi(e) {
  if (!dangCham.has(e.pointerId)) return;
  dangCham.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (dangCham.size >= 2) { pinch(); return; }
  if (!keo) return;

  const dx = e.clientX - keo.x;
  const dy = e.clientY - keo.y;
  if (!daKeo && Math.hypot(dx, dy) < NGUONG_KEO) return;
  daKeo = true;
  huyChamGiu();   // đã thành cú kéo thì không còn là chạm giữ nữa

  // Vận tốc đo trên ĐOẠN VỪA ĐI, không đo trên cả cú kéo: quệt tay đi một
  // vòng rồi dừng hẳn mới thả thì sơ đồ phải đứng yên, không được vọt tiếp.
  const gio = Date.now();
  const dt  = gio - keo.t;
  if (dt > 0) {
    vanToc = { x: (e.clientX - keo.xTruoc) / dt, y: (e.clientY - keo.yTruoc) / dt };
  }
  keo.xTruoc = e.clientX;
  keo.yTruoc = e.clientY;
  keo.t      = gio;

  khungCuon.scrollLeft = keo.scrollLeft - dx;
  khungCuon.scrollTop  = keo.scrollTop  - dy;
}

function chamLen(e) {
  huyChamGiu();
  dangCham.delete(e.pointerId);

  if (dangCham.size < 2) bam = null;
  if (dangCham.size === 0) {
    if (keo && daKeo) chayDa();
    keo = null;
  } else if (dangCham.size === 1) {
    // Nhấc một ngón khi đang pinch: ngón còn lại tiếp tục kéo, nhưng phải
    // lấy mốc mới, nếu không sơ đồ giật một cái.
    const con = [...dangCham.values()][0];
    keo = motCuKeo(con.x, con.y);
    vanToc = { x: 0, y: 0 };
  }
}

/** Mốc của một cú kéo: chỗ bắt đầu, chỗ vừa đi qua, và vị trí cuộn lúc đó. */
function motCuKeo(x, y) {
  return {
    x, y, xTruoc: x, yTruoc: y, t: Date.now(),
    scrollLeft: khungCuon.scrollLeft, scrollTop: khungCuon.scrollTop,
  };
}

/** Ghi lại khoảng cách và điểm neo lúc hai ngón vừa chạm xuống. */
function batDauPinch() {
  const [a, b] = [...dangCham.values()];
  const r  = khungCuon.getBoundingClientRect();
  const cx = (a.x + b.x) / 2 - r.left;
  const cy = (a.y + b.y) / 2 - r.top;
  const diem = noiDungTaiDiem(cx, cy);
  return { kc: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), tyLe, x: diem.x, y: diem.y };
}

/**
 * Pinch: vừa phóng vừa di trong cùng một cử chỉ.
 *
 * Điểm sơ đồ nằm dưới điểm giữa hai ngón lúc BẮT ĐẦU được giữ dính dưới điểm
 * giữa hai ngón HIỆN TẠI. Nhờ vậy hai ngón trượt đi thì sơ đồ đi theo, đúng
 * cảm giác quen thuộc của bản đồ.
 */
function pinch() {
  if (!bam) { bam = batDauPinch(); return; }
  const [a, b] = [...dangCham.values()];
  const r  = khungCuon.getBoundingClientRect();
  const cx = (a.x + b.x) / 2 - r.left;
  const cy = (a.y + b.y) / 2 - r.top;
  const kc = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));

  daKeo = true;   // pinch cũng là kéo: đừng để click bắn ra sau đó
  datTyLeNeo(bam.tyLe * (kc / bam.kc), bam.x, bam.y, cx, cy);
}

/**
 * Lăn chuột. Chỉ nhận khi giữ Ctrl (hoặc cử chỉ chụm trên bàn di của máy tính
 * xách tay, trình duyệt gửi đúng `ctrlKey`). Lăn không giữ Ctrl vẫn là cuộn
 * bình thường — đừng cướp thao tác quen tay của người dùng máy tính.
 */
function lanChuot(e) {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const r = khungCuon.getBoundingClientRect();
  datTyLe(tyLe * Math.pow(0.995, e.deltaY), e.clientX - r.left, e.clientY - r.top);
}

/**
 * Chạy đà sau khi thả tay.
 *
 * `touch-action: none` lấy mất cuộn quán tính của hệ điều hành, mà không có
 * quán tính thì sơ đồ rộng hai nghìn pixel phải quệt tay năm sáu lần. Đây là
 * phần bù, cố ý làm đơn giản: giảm tốc đều, không nảy ở mép.
 */
function chayDa() {
  const GIAM = 0.94;
  // Kẹp vận tốc: một cú quệt rất nhanh, hoặc một phép đo lỗi vì hai sự kiện
  // rơi vào cùng một mili-giây, có thể sinh con số lớn vô lý. Với 3 px/ms và
  // hệ số giảm 0,94 thì quãng chạy thêm tối đa còn khoảng 800px — đủ để một
  // cú quệt băng qua sơ đồ, không đủ để sơ đồ biến mất khỏi màn hình.
  const TOI_DA = 3;
  let vx = Math.max(-TOI_DA, Math.min(TOI_DA, vanToc.x));
  let vy = Math.max(-TOI_DA, Math.min(TOI_DA, vanToc.y));
  if (Math.hypot(vx, vy) < 0.05) return;

  const buoc = () => {
    vx *= GIAM;
    vy *= GIAM;
    if (Math.hypot(vx, vy) < 0.02) { daRAF = 0; return; }
    khungCuon.scrollLeft -= vx * 16;
    khungCuon.scrollTop  -= vy * 16;
    daRAF = requestAnimationFrame(buoc);
  };
  daRAF = requestAnimationFrame(buoc);
}

function dungChayDa() {
  if (daRAF) { cancelAnimationFrame(daRAF); daRAF = 0; }
}

// ============================================================
// Vài mẩu giao diện. Không thư viện, không bước build.
// ============================================================

/**
 * Cụm nút góc DƯỚI PHẢI: phóng to · thu nhỏ · đưa người trung tâm về giữa.
 *
 * Đúng bố cục đã đối chiếu Quick Family Tree (xem ghi chú đầu file). Ba nút
 * này là đường dự phòng cho cử chỉ ngón tay, không phải thứ thay thế: máy
 * tính để bàn không pinch được, và người lớn tuổi thường tìm nút trước.
 *
 * Ô "100%" giữa hai nút phóng/thu là chỗ TỰ KIỂM — bấm phóng to mà con số
 * không nhúc nhích thì biết ngay hỏng ở đâu, không phải đoán.
 *
 * Cỡ nút 44px là mức nhỏ nhất còn bấm trúng bằng đầu ngón tay.
 */
function veHopNut() {
  const hop = document.createElement('div');
  hop.style.cssText =
    'position:absolute;right:12px;bottom:12px;z-index:10;' +
    'display:flex;flex-direction:column;align-items:stretch;gap:8px';

  nhanTyLe = document.createElement('div');
  nhanTyLe.textContent = Math.round(tyLe * 100) + '%';
  nhanTyLe.style.cssText =
    'text-align:center;font-size:12px;color:#8a8078;background:#fffdf9;' +
    'border:1px solid #e6e0d8;border-radius:8px;padding:3px 0;' +
    'font-family:system-ui,sans-serif;user-select:none';

  // Nút ⓘ là đường vào THỨ HAI của thẻ thông tin. Đường thứ nhất là chạm giữ
  // vào một ô, mà chạm giữ thì không tự lộ ra — người chưa được chỉ sẽ không
  // bao giờ tìm thấy. Một cử chỉ ẩn phải luôn có một cái nút đi kèm.
  hop.append(
    nutTron('ⓘ', 'Thông tin người trung tâm', () => moTheNguoiTrungTam()),
    nutTron('+', 'Phóng to', () => datTyLe(tyLe * TY_LE_NAC)),
    nhanTyLe,
    nutTron('−', 'Thu nhỏ', () => datTyLe(tyLe / TY_LE_NAC)),
    nutTron('◎', 'Đưa người trung tâm về giữa', () => centerOnFocus()),
  );
  return hop;
}

/**
 * Cụm nút góc TRÊN PHẢI. Giai đoạn 1 mới có Cài đặt; Tìm kiếm và Chụp ảnh sơ
 * đồ để giai đoạn sau — dựng chỗ trống sẵn còn hơn dời cả cụm nút về sau.
 */
function veHopNutTrenPhai() {
  const hop = document.createElement('div');
  hop.style.cssText =
    'position:absolute;right:12px;top:12px;z-index:10;' +
    'display:flex;flex-direction:column;align-items:stretch;gap:8px';
  hop.append(nutTron('⚙', 'Cài đặt', () => openSettings()));
  return hop;
}

function moTheNguoiTrungTam() {
  if (!state.focusPersonId) return;
  openPersonDetail(state.focusPersonId, xuLyThe());
}

/**
 * Ba việc thẻ thông tin báo ngược ra ngoài. Gom một chỗ để hai nơi mở thẻ —
 * chạm giữ và nút ⓘ — không bao giờ mọc ra hai bộ nút khác nhau.
 */
function xuLyThe() {
  return {
    onChonNguoi: (id) => setFocusPerson(id),
    onSuaNguoi:  moFormSua,
    onThemCon:   moFormThemCon,
  };
}

/**
 * Mở form sửa hồ sơ, rồi vẽ lại sơ đồ sau khi máy chủ đã ghi xong.
 *
 * `refresh()` chứ không phải `setFocusPerson()`: người trung tâm không đổi, chỉ
 * nội dung ô đổi. Lúc `onDaLuu` chạy thì `repo.luuCay()` đã thay `state.tree`
 * và dựng lại `state.index` — vẽ lại là thấy tên mới, năm mới trên ô.
 */
function moFormSua(personId) {
  openPersonForm(personId, { onDaLuu: () => refresh() });
}

/**
 * Mở form thêm người con, rồi vẽ lại sơ đồ.
 *
 * `refresh()` chứ không `setFocusPerson(idNguoiMoi)`: người con vừa thêm nằm
 * ngay dưới cha mẹ nó, tức đã có mặt trong sơ đồ đang xem. Kéo cả sơ đồ sang
 * người mới là làm mất chỗ người dùng đang đứng, ngay lúc họ muốn nhìn xem con
 * mình vừa hiện ra đúng chỗ chưa.
 */
function moFormThemCon(noiVao) {
  quickAddChild(noiVao, { onDaLuu: () => refresh() });
}

function nutTron(chu, nhan, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.title = nhan;
  nut.setAttribute('aria-label', nhan);
  nut.style.cssText =
    'width:44px;height:44px;font-size:20px;line-height:1;' +
    'font-family:system-ui,sans-serif;color:#2a2622;' +
    'border:1px solid #e6e0d8;border-radius:22px;background:#fffdf9;' +
    'box-shadow:0 1px 4px rgba(42,38,34,.12);cursor:pointer;touch-action:manipulation';
  nut.addEventListener('click', chay);
  return nut;
}

/**
 * Thanh trên: người trung tâm là ai, sơ đồ đang có bao nhiêu ô.
 *
 * Con số này không phải để trang trí — nó là cách đọc nhanh xem thuật toán có
 * chạy đúng không. Bài kiểm tra hồi quy của chat 1.2 đếm đúng con số này.
 */
function veThanhTren(index, focus, visible, layout) {
  const p   = index.personById.get(focus);
  const doi = p ? doiSongNguoi(p) : '';

  let soBien = 0;
  for (const kieu of visible.values()) if (kieu === 'edge') soBien++;

  thanhTren.innerHTML = '';

  const ten = document.createElement('div');
  ten.textContent = 'Sơ đồ quanh: ' + (p ? fullName(p) : focus) + (doi ? '  ·  ' + doi : '');
  ten.style.cssText = 'font-size:15px;font-weight:600';

  const so = document.createElement('div');
  so.textContent =
    visible.size + ' người' +
    (soBien ? ' (' + soBien + ' là dâu/rể)' : '') +
    '  ·  ' + (layout.stubs || []).length + ' nốt cụt' +
    (state.daLocNguoiConSong ? '  ·  đã ẩn chi tiết người còn sống' : '');
  so.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px';

  const nhac = document.createElement('div');
  nhac.textContent = 'Bấm vào một ô để đưa người đó ra giữa. ' +
                     'Bấm nốt tròn màu cam để mở nhánh đang bị cắt. ' +
                     'Kéo để di, chụm hai ngón để phóng to thu nhỏ.';
  nhac.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px';

  thanhTren.append(ten, so, nhac);
}

/**
 * Trả khung cuộn về đúng một phần tử SVG rỗng.
 *
 * Không có bước này thì lời nhắn của lần vẽ hỏng trước còn nằm nguyên trên
 * màn hình, và sơ đồ mới vẽ ra bên dưới nó.
 */
function donKhung() {
  if (!khungCuon) return;
  khungCuon.innerHTML = '';
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  khungCuon.append(svgEl);
}

/** Màn hình thay thế khi không vẽ được gì. Nói rõ phải làm gì, không hiện lỗi thô. */
function hienLoiNhan(tieuDe, giaiThich) {
  layoutHT = null;
  donKhung();
  // Trả lề căn giữa của lần vẽ trước về 0: không có bước này thì lời nhắn bị
  // đẩy lệch hẳn xuống dưới bằng đúng nửa chiều cao sơ đồ cũ.
  padX = 0;
  padY = 0;
  if (khungCuon) khungCuon.style.padding = '0';
  if (thanhTren) thanhTren.innerHTML = '';

  const hop = document.createElement('div');
  hop.style.cssText = 'max-width:420px;margin:48px auto;padding:0 24px;line-height:1.6';

  const h = document.createElement('h2');
  h.textContent = tieuDe;
  h.style.cssText = 'font-size:18px;margin:0 0 8px';

  const p = document.createElement('p');
  p.textContent = giaiThich;
  p.style.cssText = 'margin:0;font-size:14px;color:#8a8078';

  hop.append(h, p);
  khungCuon.prepend(hop);
}

/**
 * Nốt cụt gộp: hiện danh sách người phía sau để chọn một người làm trung tâm mới.
 * Lớp phủ đơn giản, bấm ra ngoài là đóng.
 */
function hienDanhSachChon(danhSachId) {
  const phu = document.createElement('div');
  phu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:20;' +
    'display:flex;align-items:center;justify-content:center;padding:24px';

  const hop = document.createElement('div');
  hop.style.cssText =
    'background:#fffdf9;border-radius:12px;padding:18px;max-width:340px;width:100%;' +
    'max-height:70vh;overflow:auto;box-shadow:0 8px 32px rgba(42,38,34,.25);' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const h = document.createElement('div');
  h.textContent = 'Mở nhánh nào?';
  h.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:4px';

  const g = document.createElement('div');
  g.textContent = 'Chọn một người để đưa ra giữa sơ đồ.';
  g.style.cssText = 'font-size:13px;color:#8a8078;margin-bottom:12px';

  hop.append(h, g);

  for (const id of danhSachId) {
    const p   = state.index.personById.get(id);
    const doi = p ? doiSongNguoi(p) : '';
    const nut = document.createElement('button');
    nut.textContent = (p ? fullName(p) : id) + (doi ? '  ·  ' + doi : '');
    nut.style.cssText =
      'display:block;width:100%;text-align:left;margin-bottom:8px;padding:10px 12px;' +
      'font-size:15px;font-family:inherit;border:1px solid #e6e0d8;border-radius:8px;' +
      'background:#fff;cursor:pointer';
    nut.addEventListener('click', () => { phu.remove(); setFocusPerson(id); });
    hop.append(nut);
  }

  const dong = document.createElement('button');
  dong.textContent = 'Đóng';
  dong.style.cssText =
    'margin-top:4px;padding:8px 14px;font-size:14px;font-family:inherit;' +
    'border:1px solid #e6e0d8;border-radius:8px;background:#faf8f5;cursor:pointer';
  dong.addEventListener('click', () => phu.remove());
  hop.append(dong);

  phu.addEventListener('click', (e) => { if (e.target === phu) phu.remove(); });
  phu.append(hop);
  document.body.append(phu);
}

// ============================================================
// Nút lọc phạm vi — chat 1.6
// ============================================================
//
// Bốn nấc mỗi cột, đúng bốn nấc của Quick Family Tree (KE-HOACH §"Bốn nấc
// điều khiển của QFT"). Bấm một nút chỉ làm đúng hai việc: đổi `state.scope`
// rồi gọi `refresh()`. KHÔNG đụng vào `bloodline.js` — bộ số kiểm thử năm con
// số của chat 1.2 đo chính hàm đó, sửa nó là mất căn cứ chấm điểm.
//
// Nấc "Con và Vợ/Chồng" KHÔNG phải một đời khác: nó cùng `descendants = 1` với
// nấc "Con", chỉ khác `spouseOfDescendants`. Vì thế phải so CẢ HAI trường mới
// biết nút nào đang được chọn.

const NAC_TO_TIEN = [
  { nhan: 'Không giới hạn', ancestors: 0, moTa: 'Vẽ lên hết các đời tổ tiên' },
  { nhan: '4 đời trước',    ancestors: 4, moTa: 'Chỉ vẽ lên 4 đời tổ tiên' },
  { nhan: '3 đời trước',    ancestors: 3, moTa: 'Chỉ vẽ lên 3 đời tổ tiên' },
  { nhan: '2 đời trước',    ancestors: 2, moTa: 'Chỉ vẽ lên 2 đời tổ tiên' },
];

const NAC_HAU_DUE = [
  { nhan: 'Con', descendants: 1, spouseOfDescendants: false,
    moTa: 'Chỉ vẽ xuống một đời, không vẽ vợ/chồng của con' },
  { nhan: 'Con và Vợ/Chồng', descendants: 1, spouseOfDescendants: true, canDauRe: true,
    moTa: 'Vẽ xuống một đời, kèm vợ/chồng của con' },
  { nhan: 'Cháu', descendants: 2, spouseOfDescendants: true,
    moTa: 'Vẽ xuống hai đời' },
  { nhan: 'Không giới hạn', descendants: 0, spouseOfDescendants: true,
    moTa: 'Vẽ xuống hết các đời hậu duệ' },
];

// --- Vì sao hai cột nút THU GỌN được -------------------------------------
//
// Bản đầu để cả tám nút hiện thường trực, đúng như Quick Family Tree. Ảnh chụp
// khung 390px cho thấy ngay: cột 132px × 250px che hẳn nhánh trái của sơ đồ và
// đè lên chính ô người trung tâm. QFT chạy trên màn hình máy tính rộng gấp ba,
// nên chép nguyên bố cục của nó xuống điện thoại là hỏng.
//
// Thu gọn: mỗi cột chỉ để lại MỘT nút tóm tắt cao 32px ghi rõ nấc đang chọn,
// chạm vào mới xổ đủ bốn nấc, chọn xong tự thu lại. Nút tóm tắt nói luôn nấc
// hiện tại nên không giấu thông tin — thứ mất đi chỉ là ba nút chưa cần tới.

let nutToTien = [];
let nutHauDue = [];
let nutDauRe  = null;

let thanToTien = null, tomTatToTien = null, xoToTien = false;
let thanHauDue = null, tomTatHauDue = null, xoHauDue = false;

/** Cột trên trái — chọn vẽ lên bao nhiêu đời tổ tiên. */
function veCotToTien() {
  const hop = veCotNut('left:12px;top:12px');
  thanToTien = veThanCot('Đời trên');
  nutToTien = NAC_TO_TIEN.map((nac) => {
    const nut = nutChu(nac.nhan, nac.moTa, () => datPhamViToTien(nac));
    thanToTien.append(nut);
    return nut;
  });
  tomTatToTien = nutTomTat(() => datXo('tren', !xoToTien));
  // Nút tóm tắt ở TRÊN, bốn nấc xổ xuống dưới — cột này neo mép trên.
  hop.append(tomTatToTien, thanToTien);
  return hop;
}

/** Cột dưới trái — chọn phạm vi hậu duệ, và công tắc dâu/rể. */
function veCotHauDue() {
  const hop = veCotNut('left:12px;bottom:12px');
  thanHauDue = veThanCot('Đời dưới');
  nutHauDue = NAC_HAU_DUE.map((nac) => {
    const nut = nutChu(nac.nhan, nac.moTa, () => datPhamViHauDue(nac));
    thanHauDue.append(nut);
    return nut;
  });
  nutDauRe = nutChu('Dâu/rể', '', () => datDauRe(state.showInLaws === false));
  thanHauDue.append(nutDauRe);
  tomTatHauDue = nutTomTat(() => datXo('duoi', !xoHauDue));
  // Nút tóm tắt ở DƯỚI, các nấc mọc NGƯỢC LÊN — cột này neo mép dưới, để nút
  // tóm tắt đứng yên một chỗ khi xổ ra và thu lại.
  hop.append(thanHauDue, tomTatHauDue);
  return hop;
}

/**
 * Xổ ra hoặc thu lại một cột. Xổ cột này thì thu cột kia: hai cột cùng xổ trên
 * màn hình 390px là che gần hết sơ đồ, đúng cái lỗi vừa sửa.
 */
function datXo(cot, xo) {
  if (cot === 'tren') { xoToTien = xo; if (xo) xoHauDue = false; }
  else                { xoHauDue = xo; if (xo) xoToTien = false; }
  if (thanToTien) thanToTien.style.display = xoToTien ? 'flex' : 'none';
  if (thanHauDue) thanHauDue.style.display = xoHauDue ? 'flex' : 'none';
}

function datPhamViToTien(nac) {
  datXo('tren', false);
  // Bấm lại đúng nấc đang chọn thì không vẽ lại: sơ đồ nháy một cái mà không
  // đổi gì là thứ nhìn thấy được bằng mắt.
  if (state.scope.ancestors === nac.ancestors) { capNhatNutPhamVi(); return; }
  state.scope.ancestors = nac.ancestors;
  notify();
  refresh();
}

function datPhamViHauDue(nac) {
  const sc = state.scope;
  datXo('duoi', false);
  if (sc.descendants === nac.descendants &&
      sc.spouseOfDescendants === nac.spouseOfDescendants) { capNhatNutPhamVi(); return; }
  sc.descendants         = nac.descendants;
  sc.spouseOfDescendants = nac.spouseOfDescendants;
  notify();
  refresh();
}

function datDauRe(bat) {
  if (state.showInLaws === bat) return;
  state.showInLaws = bat;
  notify();
  refresh();
}

/**
 * Tô lại tám nút theo `state` hiện tại.
 *
 * Nấc "Con và Vợ/Chồng" MỜ ĐI khi đã tắt dâu/rể, vì lúc đó bộ lọc hậu kỳ gạt
 * hết nút biên và nấc này cho ra đúng cùng một sơ đồ với nấc "Con" — để nó
 * sáng như thường là hứa một thứ không xảy ra. Vẫn bấm được, có chủ ý: khoá
 * hẳn thì người dùng phải đoán vì sao nút chết.
 */
function capNhatNutPhamVi() {
  const sc = state.scope || {};
  const hienDauRe = state.showInLaws !== false;

  nutToTien.forEach((nut, i) => {
    datVeChon(nut, NAC_TO_TIEN[i].ancestors === (sc.ancestors || 0));
  });

  nutHauDue.forEach((nut, i) => {
    const nac = NAC_HAU_DUE[i];
    datVeChon(nut, nac.descendants === (sc.descendants || 0) &&
                   nac.spouseOfDescendants === (sc.spouseOfDescendants !== false));
    const mo = nac.canDauRe === true && !hienDauRe;
    nut.style.opacity = mo ? '0.45' : '1';
    nut.title = mo
      ? 'Đang ẩn dâu/rể nên nấc này vẽ ra đúng như nấc "Con"'
      : nac.moTa;
  });

  if (nutDauRe) {
    nutDauRe.textContent = (hienDauRe ? '☑' : '☐') + ' Dâu/rể';
    nutDauRe.title = hienDauRe
      ? 'Đang vẽ dâu/rể. Bấm để ẩn họ đi.'
      : 'Đang ẩn dâu/rể. Bấm để vẽ họ trở lại.';
    datVeChon(nutDauRe, hienDauRe);
  }

  // Nút tóm tắt phải nói được nấc đang chọn, nếu không thì thu gọn xong là
  // người dùng mất hẳn thông tin đó — cả cụm nút chỉ còn là hai mũi tên câm.
  const nacTren = NAC_TO_TIEN.find((n) => n.ancestors === (sc.ancestors || 0));
  const nacDuoi = NAC_HAU_DUE.find((n) => n.descendants === (sc.descendants || 0) &&
                    n.spouseOfDescendants === (sc.spouseOfDescendants !== false));
  if (tomTatToTien) {
    tomTatToTien.textContent = '▲ ' + (nacTren ? nacTren.nhan : sc.ancestors + ' đời trước');
    tomTatToTien.title = 'Đời trên — bấm để đổi';
  }
  if (tomTatHauDue) {
    tomTatHauDue.textContent = '▼ ' + (nacDuoi ? nacDuoi.nhan : 'Tuỳ chọn riêng') +
                               (hienDauRe ? '' : ' · ẩn dâu/rể');
    tomTatHauDue.title = 'Đời dưới — bấm để đổi';
  }
}

// ============================================================
// Mấy mẩu dựng nút, dùng chung cho hai cột
// ============================================================

/** Hộp dọc chứa một cột nút. `viTri` là hai thuộc tính neo, ví dụ 'left:12px;top:12px'. */
function veCotNut(viTri) {
  const hop = document.createElement('div');
  hop.style.cssText =
    'position:absolute;' + viTri + ';z-index:10;' +
    // flex-start, KHÔNG stretch: nút tóm tắt co theo chữ của nấc đang chọn,
    // còn tấm xổ giữ bề rộng cố định của nút bên trong nó.
    'display:flex;flex-direction:column;align-items:flex-start;gap:6px';
  return hop;
}

/** Nút tóm tắt của một cột: thấp hơn nút nấc, và rộng vừa đúng chữ bên trong. */
function nutTomTat(chay) {
  const nut = nutChu('', '', chay);
  nut.style.width   = 'auto';
  nut.style.height  = '32px';
  nut.style.padding = '0 12px';
  nut.style.fontSize = '12px';
  return nut;
}

/**
 * Phần xổ ra của một cột: nhãn + các nấc, gói trong một tấm NỀN ĐẶC.
 *
 * Nền của tấm gói là bắt buộc, không phải trang trí. Luật của bước 12: mọi thứ
 * vẽ đè lên nét phải tự mang nền đặc. Từng nút đã có nền riêng, nhưng khe hở
 * 6px giữa hai nút thì để lọt nét sơ đồ chạy xuyên qua cụm nút.
 */
function veThanCot(tieuDe) {
  const than = document.createElement('div');
  than.style.cssText =
    'display:none;flex-direction:column;align-items:stretch;gap:6px;' +
    'background:#fffdf9;border:1px solid #e6e0d8;border-radius:10px;padding:6px;' +
    'box-shadow:0 2px 8px rgba(42,38,34,.16)';

  const nhan = document.createElement('div');
  nhan.textContent = tieuDe;
  nhan.style.cssText =
    'font-size:11px;font-weight:600;letter-spacing:.04em;color:#8a8078;' +
    'text-align:center;user-select:none';
  than.append(nhan);
  return than;
}

/**
 * Nút chữ của hai cột trái.
 *
 * Cao 36px chứ không 44px như nút tròn góc dưới phải: nút này rộng 132px nên
 * diện tích chạm đã thừa, mà năm nút chồng lên nhau ở mức 44px thì cột dưới
 * trái ăn hết nửa màn hình điện thoại.
 */
function nutChu(chu, nhan, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.title = nhan;
  nut.style.cssText =
    'width:132px;height:36px;font-size:12.5px;line-height:1;' +
    'font-family:system-ui,sans-serif;' +
    'border:1px solid #e6e0d8;border-radius:8px;' +
    'box-shadow:0 1px 4px rgba(42,38,34,.12);cursor:pointer;' +
    'touch-action:manipulation;white-space:nowrap';
  datVeChon(nut, false);
  nut.addEventListener('click', chay);
  return nut;
}

/** Nút đang chọn: đảo màu. Tương phản mạnh để đọc được cả trên ảnh chụp. */
function datVeChon(nut, dangChon) {
  nut.style.background = dangChon ? '#2a2622' : '#fffdf9';
  nut.style.color      = dangChon ? '#fffdf9' : '#2a2622';
  nut.style.fontWeight = dangChon ? '600' : '400';
}
