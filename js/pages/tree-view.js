// ============================================================
// giapha · js/pages/tree-view.js
// Vai trò  : MÀN HÌNH CHÍNH — sơ đồ cây, đổi người trung tâm
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{bloodline,layout,render}, utils/text
// Phiên bản: 1.0.0 · Cập nhật: 16/08/2026 23:45
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
// Núm bật/tắt làm ở chat 1.6; chỗ lọc đã chừa sẵn trong refresh().
//
// Bố cục nút, đối chiếu Quick Family Tree (chat 1.5 và 1.6):
//   Trên trái  — cột 4 nút chọn số đời TỔ TIÊN
//   Dưới trái  — cột 4 nút chọn phạm vi HẬU DUỆ
//   Trên phải  — Cài đặt · Tìm kiếm · Chụp ảnh sơ đồ
//   Dưới phải  — Phóng to · Thu nhỏ · Đưa người trung tâm về giữa

import { state, notify } from '../state.js';
import { computeVisibleSet, findStubPoints } from '../domains/bloodline.js';
import { computeLayout } from '../domains/layout.js';
import { renderTree } from '../domains/render.js';
import { fullName, doiSongNguoi } from '../utils/text.js';

let khungCuon = null;   // div cuộn được, bọc quanh SVG
let svgEl     = null;
let thanhTren = null;
let layoutHT  = null;   // kết quả computeLayout gần nhất, để centerOnFocus dùng

/**
 * Dựng màn hình sơ đồ vào `containerEl` rồi vẽ lần đầu.
 * Gọi từ pages/khoi-dong.js sau khi máy chủ xác nhận người dùng đọc được cây.
 */
export function mountTreeView(containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  containerEl.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;' +
    'background:#faf8f5;font-family:system-ui,sans-serif;color:#2a2622';

  thanhTren = document.createElement('div');
  thanhTren.style.cssText =
    'flex:0 0 auto;padding:10px 16px;border-bottom:1px solid #e6e0d8;' +
    'background:#fffdf9;font-size:14px;line-height:1.4';

  khungCuon = document.createElement('div');
  khungCuon.style.cssText =
    'flex:1 1 auto;overflow:auto;-webkit-overflow-scrolling:touch;padding:0';

  svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.style.cssText = 'display:block';
  khungCuon.append(svgEl);

  containerEl.append(thanhTren, khungCuon);
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

  const index = state.index;
  const focus = state.focusPersonId;

  if (!index || !focus) {
    hienLoiNhan('Chưa chọn được người trung tâm.',
                'Mở màn hình Cài đặt để chọn một người, hoặc kiểm tra lại file dữ liệu.');
    return;
  }

  // --- Ba bước, đúng thứ tự ------------------------------------------------
  let visible = computeVisibleSet(index, focus, state.scope);

  // Bộ lọc hậu kỳ showInLaws. Núm bật/tắt làm ở chat 1.6; tới lúc đó chỉ cần
  // đặt state.showInLaws = false là chỗ này tự chạy. layout.js không cần biết
  // núm này tồn tại — đã chạy thử cả 56 sơ đồ ở nấc tắt.
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

  veThanhTren(index, focus, visible, layout);
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

/** Đưa người trung tâm về giữa khung nhìn. */
function centerOnFocus() {
  if (!khungCuon || !layoutHT || !Array.isArray(layoutHT.nodes)) return;
  const nut = layoutHT.nodes.find((n) => n.laTrungTam);
  if (!nut) return;

  const b = layoutHT.bounds;
  khungCuon.scrollLeft = (nut.x - b.minX) + nut.w / 2 - khungCuon.clientWidth / 2;
  khungCuon.scrollTop  = (nut.y - b.minY) + nut.h / 2 - khungCuon.clientHeight / 2;
}

// ============================================================
// Vài mẩu giao diện. Không thư viện, không bước build.
// ============================================================

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
                     'Bấm nốt tròn màu cam để mở nhánh đang bị cắt.';
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
// Còn khung — chat 1.5 và 1.6
// ============================================================

/** Zoom và kéo. Phải chạy được bằng ngón tay: pinch để zoom, kéo để di. */
function setupPanZoom(svgEl) { /* TODO — chat 1.5 */ }   // eslint-disable-line no-unused-vars

/** Nút lọc phạm vi tổ tiên (góc trên trái) và hậu duệ (góc dưới trái). */
function setupScopeControls() { /* TODO — chat 1.6 */ }  // eslint-disable-line no-unused-vars
