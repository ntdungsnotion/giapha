// ============================================================
// giapha · js/pages/tree-view.js
// Vai trò  : MÀN HÌNH CHÍNH — sơ đồ cây, đổi người trung tâm
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/{bloodline,layout,render,union},
//            utils/{text,glyph}, config,
//            pages/{person-detail,person-edit,person-list,review,settings,
//            backup,chon-gia-pha,import-export,export-image}
// Phiên bản: 1.37.0 · Cập nhật: 01/09/2026 10:30
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
//   Trên trái  — cột 4 nút chọn số đời TỔ TIÊN + ô nhập tay số đời
//   Dưới trái  — cột 4 nút chọn phạm vi HẬU DUỆ + ô nhập tay + công tắc dâu/rể
//   Trên phải  — Cài đặt (có xuất ảnh/PDF ở trong, việc 12) · Tìm người
//   Dưới phải  — Thông tin · Phóng to · Thu nhỏ · Đưa người trung tâm về giữa
//
// Cả ba cụm nút neo vào `vungSoDo`, KHÔNG vào `khungCuon`: `donKhung()` dọn
// sạch ruột khung cuộn mỗi lần vẽ lại, và mọi thứ trong đó còn trôi theo khi
// người dùng kéo sơ đồ. Neo vào `vungSoDo` chứ không vào `containerEl` vì cụm
// nút phải phủ đúng vùng vẽ, không phủ cả màn hình.
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
import { getSpouses, getParents, getChildren, getSiblings } from '../domains/union.js';
import { fullName, doiSongNguoi } from '../utils/text.js';
import { openPersonMenu, openPersonDetail, openUnionDetail,
         closePersonDetail } from './person-detail.js';
import { openPersonForm, closePersonForm, quickAddChild, quickAddParent,
         quickAddSpouse, linkExisting, goNoiNguoi, xoaNguoi,
         openUnionForm, openMergeForm, openSapThuTu, openSuaCon, openFamilyForm,
         khoiPhucNhieu, donThungRac, themNguoiDauTien,
         chuyenVaoThungRac } from './person-edit.js';
import { openPersonList, closePersonList, openThungRac,
         openDanhSachGiaDinh } from './person-list.js';
import { openReview, closeReview } from './review.js';
import { openSettings, closeSettings } from './settings.js';
import { openBackup, closeBackup } from './backup.js';
import { openChonGiaPha, closeChonGiaPha } from './chon-gia-pha.js';
import { openXuatGedcom, closeXuatGedcom, openNhapGedcom, closeNhapGedcom }
  from './import-export.js';
import { xuatAnhPNG, inSoDo, xuatAnhDoPhanGiaiCao, xuatPdfDoPhanGiaiCao, docCoSoDo,
         xuatPdfNhieuTrang, xemTruocNhieuTrang }
  from './export-image.js';
import { veBieuTuongTron } from '../utils/glyph.js';
import { rongHop, caoHop, leLopPhu } from '../config.js';

// id của `khungCuon` — CSS `@media print` của `export-image.js` (`inSoDo`)
// cần một mốc để ẩn hết trang rồi hiện lại đúng khung này. Đặt hằng ở đây,
// không hằng cứng bên export-image.js: "DOM trông thế nào" là việc của file
// này, export-image.js chỉ cần TÊN, không cần biết vì sao.
const ID_KHUNG_IN = 'giapha-khung-in';

let khungCuon = null;   // div cuộn được, bọc quanh SVG
let vungSoDo  = null;   // bọc khungCuon + ba cụm nút nổi; mốc neo của các nút
let svgEl     = null;
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

// Đường kính một nút tròn nổi trên sơ đồ, px. 44 là đích chạm tối thiểu của
// ngón tay — `kiem-cum-nut.mjs` gác con số này, đừng hạ xuống.
const CO_NUT_TRON = 44;

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
  closePersonList();
  closeReview();
  closeSettings();
  closeBackup();
  closeChonGiaPha();
  closeXuatGedcom();
  closeNhapGedcom();
  containerEl.innerHTML = '';
  containerEl.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;' +
    'background:#faf8f5;font-family:system-ui,sans-serif;color:#2a2622';

  khungCuon = document.createElement('div');
  khungCuon.id = ID_KHUNG_IN;
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
  containerEl.append(vungSoDo);
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

  // GIA PHẢ RỖNG đứng riêng, TRƯỚC lời nhắn "chưa chọn được người trung tâm" —
  // câu ấy bảo người dùng bấm 🔍 đi tìm, mà ở đây không có ai để tìm. Đó là
  // trạng thái một file vừa sinh ra từ `taoFileDuLieuMoi()` luôn đi qua, và
  // trước 27/08/2026 nó là cánh cửa khoá từ bên trong: mọi đường thêm người
  // đều đi từ một người sẵn có.
  if (index && index.personById.size === 0) {
    const suaDuoc = !!(state.phien && state.phien.suaDuoc);
    hienLoiNhan(
      'Gia phả này chưa có ai.',
      suaDuoc
        ? 'Bắt đầu bằng một người bất kỳ — thường là người cao tuổi nhất còn ' +
          'nhớ được, hoặc chính bạn. Những người khác nối vào sau, từ người này.'
        : 'Bạn chỉ có quyền xem, nên chưa nhập được ai. Nhờ người quản lý nhập ' +
          'người đầu tiên, hoặc đổi quyền cho bạn trên Google Drive.',
      suaDuoc ? { chu: 'Thêm người đầu tiên', bam: moThemDauTien } : null
    );
    return;
  }

  if (!index || !focus) {
    hienLoiNhan('Chưa chọn được người trung tâm.',
                'Bấm nút 🔍 ở góc trên bên phải để tìm một người trong gia phả, ' +
                'hoặc kiểm tra lại file dữ liệu.');
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
      'Có thể bản ghi này đã bị xoá. Bấm nút 🔍 ở góc trên bên phải để tìm ' +
      'và chọn một người khác.');
    return;
  }

  const stubs  = findStubPoints(index, visible, state.scope);
  const hienGio = { hienNgayGio: state.hienNgayGio === true };
  const layout = computeLayout(index, focus, visible, state.scope, stubs, hienGio);
  layoutHT = layout;

  renderTree(svgEl, layout, index, {
    onChonNguoi:  (personId) => bamVaoO(personId),
    onChonNotCut: (stub) => moNotCut(stub, visible),
  }, hienGio);

  // HAI VIỆC NÀY PHẢI ĐÚNG THỨ TỰ NÀY:
  //
  //   1. apDungTyLe   — renderTree() vừa đặt lại width/height của <svg> về cỡ
  //      thật 100%, phải áp lại tỷ lệ đang dùng và tính lại lề căn giữa.
  //   2. centerOnFocus — tính theo `tyLe` và `padX/padY` mà bước 1 vừa sinh.
  //
  // ⚠ Trước bước 30 đây là BA việc, và việc thứ nhất là `veThanhTren()`. Thanh
  // trên đã gỡ hẳn (xem `mountTreeView`), nên cái bẫy *"đo khung trước khi vẽ
  // thanh"* của chat 1.5 nay **không còn chỗ để tái diễn**: không còn phần tử
  // nào ngoài `vungSoDo` chia chiều cao với khung cuộn.
  apDungTyLe();
  centerOnFocus();
}

/**
 * BẤM MỘT CÁI vào một ô trên sơ đồ — hai kết quả, tuỳ ô ấy là ai.
 *
 * Chốt 22/08/2026, do chủ dự án chỉ ra sau khi dùng app thật:
 *
 *   - ô của **người khác** → đưa người ấy ra giữa, vẽ lại sơ đồ (như cũ)
 *   - ô của **chính người đang đứng giữa** → **mở MENU VÒNG TRÒN**
 *
 * Trước đó cú bấm thứ hai vào cùng một ô **không sinh ra gì cả**. Đó là một
 * vùng chết ngay giữa màn hình, và ở đúng chỗ dễ trúng nhất — cùng loại lỗi
 * mà bước 26 đã sửa ở TÂM vòng tròn. Người dùng bấm vào mặt một người rồi bấm
 * lần nữa là đang hỏi *"còn làm được gì với người này?"*; câu trả lời là vành
 * sáu việc.
 *
 * ⚠ Nó KHÔNG thay nút ⓘ, cũng không thay bấm chuột phải: cả ba nay dẫn về
 * cùng một vòng tròn của cùng một người, nên học cửa nào cũng ra cùng chỗ.
 *
 * ⚠ Không phải "bấm đúp". Bấm đúp đã loại (`NK-B30` mục 10.2) vì nó buộc phải
 * hoãn MỌI cú bấm đơn ~250ms. Đây là hai cú bấm ĐƠN rời nhau, mỗi cú xử lý
 * ngay lúc nó xảy ra, không hoãn gì hết.
 */
function bamVaoO(personId) {
  if (personId && personId === state.focusPersonId) {
    moTheNguoiTrungTam();
    return;
  }
  setFocusPerson(personId);
}

/**
 * Đổi người trung tâm rồi vẽ lại. Gọi khi chạm vào một người hoặc một nốt cụt.
 *
 * Bấm vào chính người trung tâm thì không làm gì — vẽ lại y hệt sơ đồ cũ chỉ
 * làm màn hình nháy một cái. Cửa "bấm lại lần nữa để mở vòng tròn" nằm ở
 * `bamVaoO()` phía trên, KHÔNG nằm ở đây: hàm này còn được nốt cụt, danh sách
 * người và thẻ thông tin gọi tới, mà ba chỗ ấy không được mở vòng tròn.
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

// --- Chạm giữ để SẮP THỨ TỰ ANH CHỊ EM (đổi vai 21/08/2026) --------------
//
// Chạm NGẮN vào một ô vẫn đổi người trung tâm — đó là tính năng cốt lõi, chốt
// từ chat 1.4, không đụng vào.
//
// ⚠ **Chạm GIỮ đã ĐỔI VAI.** Từ chat 1.6 tới bước 30 nó mở menu vòng tròn; nay
// nó bật màn hình SẮP THỨ TỰ ANH CHỊ EM. Chủ dự án chốt 21/08/2026: *"gọi vòng
// tròn do nút ⓘ đảm nhiệm; thao tác giữ tên hoặc ảnh để kích hoạt chế độ sắp
// xếp"*.
//
// Vòng tròn KHÔNG mất cửa nào — nay có BA cửa, cùng dẫn về một chỗ:
//
//   1. bấm ô của người đang đứng GIỮA  (thêm 22/08/2026, xem `bamVaoO`)
//   2. nút ⓘ ở cụm dưới phải
//   3. bấm chuột phải trên một ô
//
// Cửa 1 làm cho đường hai chạm *bấm ô người khác → bấm lại ô ấy* chạy được
// bằng một ngón tay, không phải rời mắt đi tìm nút ⓘ ở góc màn hình.
//
// ⚠ **Bấm đúp đã LOẠI, đừng dựng lại.** `render.js` gắn `click` thẳng vào ô,
// nên cú bấm thứ nhất đã gọi `setFocusPerson()` → `refresh()` vẽ lại cả sơ đồ
// và ô ấy dời về giữa; cú thứ hai rơi vào ô khác. Cách duy nhất cho nó chạy là
// hoãn MỌI cú bấm đơn ~250ms — tức làm ì đúng thao tác dùng nhiều nhất trong
// cả app (lập luận đầy đủ ở `NK-B30` mục 10.2).
//
// 500ms: dưới 400ms thì một cú chạm hơi chậm của người lớn tuổi đã bị hiểu
// nhầm thành chạm giữ; trên 600ms thì người dùng tưởng máy không nhận.
//
// Chạm giữ xong phải đặt `daKeo = true`. Nghe vô lý vì tay không hề di chuyển,
// nhưng `daKeo` là cờ "nuốt cú click sắp bắn ra" — không đặt thì nhấc tay lên
// là sơ đồ vừa mở hộp vừa đổi người trung tâm.
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
// Lúc ấy hộp sắp thứ tự đã mở rồi, nên `daMoHopLanNay` chặn không cho mở tiếp
// vòng tròn đè lên trên — hai lớp phủ chồng nhau là thứ người dùng không gỡ ra
// được bằng một cú bấm.
let daMoHopLanNay = false;


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
  if (daMoHopLanNay) return;   // chạm giữ vừa mở hộp sắp thứ tự, đừng đè lên

  daKeo = true;                // nuốt cú click sắp bắn ra, như chạm giữ
  keo = null;
  openPersonMenu(personId, xuLyThe());
}

function chamXuong(e) {
  dungChayDa();
  huyChamGiu();
  dangCham.set(e.pointerId, { x: e.clientX, y: e.clientY });
  daKeo = false;
  daMoHopLanNay = false;

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
 * Hẹn bật màn hình sắp thứ tự nếu ngón tay còn nằm yên trên một ô người sau
 * 500ms.
 *
 * Ô người là `<g data-id="P0001">` do `render.js` sinh — cả ảnh lẫn bảng tên
 * đều nằm trong đó, nên "giữ trên tên hoặc ảnh" đã đúng là cái này. Nốt cụt
 * mang `data-not-cut` và nằm ở nhóm khác, nên chạm giữ vào nốt cụt không mở gì
 * — đúng ý, sau nốt cụt có thể là nhiều người chứ không phải một.
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
    daMoHopLanNay = true;                       // để `contextmenu` khỏi đè lên
    moSapAnhChiEm(personId);
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
 * Lăn chuột = PHÓNG TO THU NHỎ, không cần giữ phím nào.
 *
 * ⚠ Đổi ở bước 30, và lý do đáng ghi lại. Bản bước 13 viết
 * `if (!e.ctrlKey) return;` với lý lẽ *"đừng cướp thao tác cuộn quen tay của
 * người dùng máy tính"* — nghe hợp lý, và **sai trong đúng bối cảnh này**:
 *
 *   · Sơ đồ chiếm TRỌN khung và có thanh cuộn RIÊNG của nó. Lăn trong đó không
 *     cuộn trang nào cả — trang không dài hơn màn hình để mà cuộn.
 *   · Nên "thao tác quen tay" mà bản cũ bảo vệ là **một thao tác không làm gì**.
 *     Người dùng lăn chuột, không có gì xảy ra, và kết luận app chưa làm.
 *   · Đó đúng là điều chủ dự án báo lại ngày 20/08/2026: *"cần có tính năng lăn
 *     chuột để phóng to thu nhỏ"* — trong khi hàm này đã nằm đây từ bước 13.
 *
 * Mọi phần mềm bản đồ và sơ đồ đều lấy lăn trần làm zoom (Google Maps, Figma,
 * QFT). Giữ Ctrl vẫn chạy — trình duyệt gửi `ctrlKey` cho cử chỉ chụm trên bàn
 * di máy tính xách tay, và nhánh ấy nay đi chung một đường.
 *
 * `preventDefault()` là bắt buộc: không có nó thì Chrome vừa zoom sơ đồ vừa
 * zoom cả trang khi người dùng lỡ giữ Ctrl.
 */
function lanChuot(e) {
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
 * Cụm nút góc TRÊN PHẢI: Cài đặt · Tìm người.
 *
 * Nút 🔍 là cửa vào THỨ HAI của cả gia phả, và là cửa duy nhất tới những người
 * sơ đồ không vẽ ra (bước 24). Nó neo vào `vungSoDo` như mọi nút khác, nên vẫn
 * còn đó cả khi sơ đồ không vẽ được gì — đúng lúc cần nó nhất.
 */
function veHopNutTrenPhai() {
  const hop = document.createElement('div');
  hop.style.cssText =
    'position:absolute;right:12px;top:12px;z-index:10;' +
    'display:flex;flex-direction:column;align-items:stretch;gap:8px';
  hop.append(
    nutTron('⚙', 'Cài đặt', () => openSettings({
      onDoiHienThi: () => refresh(),

      // Hai cửa mới (22/08/2026). Cùng lối với `onMoSaoLuu` ngay dưới: ĐÓNG
      // Cài đặt trước rồi mới mở màn hình kia — hai lớp phủ cùng z-index 30,
      // chồng nhau thì cái mở sau nằm dưới và người dùng bấm vào khoảng không.
      onDanhSachNguoi:   () => { closeSettings(); moDanhSachNguoi(); },
      onDanhSachGiaDinh: () => { closeSettings(); moDanhSachGiaDinh(); },
      // Đóng Cài đặt TRƯỚC khi mở màn sao lưu: hai lớp phủ cùng z-index 30,
      // chồng nhau thì cái mở sau nằm dưới và người dùng bấm vào khoảng không
      // — đúng cái bẫy đã sập một lần ở bước 26.
      onMoSaoLuu: () => { closeSettings(); openBackup(); },
      // Việc 9b. Cùng lối: đóng Cài đặt TRƯỚC — và ở đây còn một lý do nữa,
      // đổi cây xong là `location.reload()`, nên đừng để lại lớp phủ nào.
      onMoChonGiaPha: () => { closeSettings(); openChonGiaPha(); },
      // Việc 10. Cùng lối, cùng lý do lớp phủ.
      onMoXuatGedcom: () => { closeSettings(); openXuatGedcom(); },
      onMoNhapGedcom: () => { closeSettings(); openNhapGedcom(); },
      // Việc 12. KHÔNG đóng Cài đặt trước — khác bốn callback trên, đây
      // không mở lớp phủ thứ hai nào, kết quả (link tải PNG) hiện NGAY
      // trong chính khối này (xem `settings.js`, `veKhoiXuat`).
      onXuatAnhPng: () => xuatAnhPNG(svgEl, state.tree),
      // `rongKhoLonMm` — có giá trị thì `settings.js` đang xin bản khổ LỚN
      // (mm), không thì co vừa 1 trang A4. Xem JSDoc `inSoDo` ở export-image.js.
      onInSoDo: (rongKhoLonMm) => inSoDo(svgEl, ID_KHUNG_IN, rongKhoLonMm),
      // Đường thứ ba của việc 12 — ảnh RASTER đúng khổ giấy + DPI. Cùng lối
      // với `onXuatAnhPng` (không đóng Cài đặt, kết quả hiện tại chỗ), chỉ
      // khác ở chỗ nó nhận hai số người dùng vừa gõ.
      onXuatAnhDpi: (rongCm, dpi) =>
        xuatAnhDoPhanGiaiCao(svgEl, state.tree, rongCm, dpi),
      // Cùng khổ, cùng DPI, nhưng ra thẳng file PDF — khổ giấy nằm trong
      // chính file nên không hộp thoại in nào ghi đè được (sự cố novaPDF
      // 01/09/2026, xem `export-image.js`).
      onXuatPdfDpi: (rongCm, dpi) =>
        xuatPdfDoPhanGiaiCao(svgEl, state.tree, rongCm, dpi),
      // Lối MicroStation (01/09/2026): hỏi chữ cao bao nhiêu mm, tính ngược
      // ra khổ giấy, rồi CHIA NHIỀU TRANG để vượt trần canvas. `onXemTruocPdf`
      // chỉ TÍNH, không dựng ảnh nào — để màn hình nói trước số trang.
      onXemTruocPdf: (chuCaoMm, tenKho, nam, dpi) =>
        xemTruocNhieuTrang(svgEl, chuCaoMm, tenKho, nam, dpi),
      onXuatPdfNhieuTrang: (tuyChon) =>
        xuatPdfNhieuTrang(svgEl, state.tree, tuyChon),
      // Chỉ ĐỌC tỷ lệ sơ đồ, không vẽ gì. `settings.js` cần nó để tự biết mức
      // DPI nào vượt trần canvas mà mờ đi TRƯỚC khi người dùng bấm — nó không
      // được chạm vào `svgEl`, `svgEl` là của file này.
      onCoSoDo: () => docCoSoDo(svgEl),
    })),
    nutTron('🔍', 'Tìm người trong gia phả', () => moDanhSachNguoi()),
  );
  return hop;
}

/**
 * Mở danh sách người, và nối nó với thẻ thông tin.
 *
 * Danh sách CỐ Ý không tự đóng khi thẻ mở ra: đóng thẻ là quay lại đúng chỗ
 * đang tìm. Nhưng mọi việc DẪN ĐI ĐÂU ĐÓ — đổi người trung tâm, mở form sửa,
 * thêm con, xoá — thì phải đóng danh sách trước, vì sau những việc ấy sơ đồ đã
 * khác và cái danh sách còn nằm đè lên trên là thứ che mất kết quả người dùng
 * vừa gây ra. Bọc từng callback ở đây, không sửa `xuLyThe()`: hai nơi mở thẻ
 * kia (chạm giữ và nút ⓘ) không có danh sách nào để đóng.
 */
function moDanhSachNguoi() {
  const goc = xuLyThe();
  // ⚠ Chuyển tiếp MỌI tham số, không chỉ tham số đầu. Từ việc 4,
  // `onSuaCap(mocId, unionId)` có hai tham số, và bản cũ — `(x) => fn(x)` —
  // nuốt mất cái thứ hai: mở thẻ gia đình từ màn hình Danh sách người rồi bấm
  // Sửa thì hộp *"cặp nào?"* hiện lại, dù người dùng đang đứng trong đúng một
  // cặp. Không lời báo lỗi nào, chỉ là một câu hỏi thừa.
  const dongTruoc = (fn) => (...a) => { closePersonList(); fn(...a); };

  // Bọc CẢ MƯỜI HAI, không bọc bốn rồi để những cái mới đi thẳng: bốn việc của bước 26
  // cũng mở hộp riêng của chúng, và cái danh sách còn nằm đè lên trên vẫn che
  // mất đúng kết quả người dùng vừa gây ra.
  //
  // ⚠ Ở đây vẫn mở THẺ THÔNG TIN chứ không mở menu: người ta gõ tên để XEM
  // trước đã (quyết định 5 của bước 24). Muốn làm gì thì thẻ có nút *"Sửa gia
  // phả"* dẫn sang vòng tròn, và vòng tròn ấy nhận đúng bộ hàm xử lý bọc sẵn
  // dưới đây — nên đường nào cũng đóng danh sách trước khi đi tiếp.
  const moLai = () => { refresh(); moDanhSachNguoi(); };

  openPersonList({
    onThungRac: moThungRac,
    onRaSoat:   moRaSoat,
    onGomRac:   (ids) => chuyenVaoThungRac(ids, { onDaLuu: moLai }),
    onXemHoSo: (id) => openPersonDetail(id, {
      onChonNguoi:  dongTruoc(goc.onChonNguoi),
      onSuaNguoi:   dongTruoc(goc.onSuaNguoi),
      onThemChaMe:  dongTruoc(goc.onThemChaMe),
      onThemBanDoi: dongTruoc(goc.onThemBanDoi),
      onThemCon:    dongTruoc(goc.onThemCon),
      onKetNoi:     dongTruoc(goc.onKetNoi),
      onGoNoi:      dongTruoc(goc.onGoNoi),
      onXoaNguoi:   dongTruoc(goc.onXoaNguoi),
      onSuaCap:     dongTruoc(goc.onSuaCap),
      onSapThuTu:   dongTruoc(goc.onSapThuTu),
      onSuaCon:     dongTruoc(goc.onSuaCon),
      onSuaGiaDinh: dongTruoc(goc.onSuaGiaDinh),
    }),
  });
}


/**
 * Mở form sửa cặp. `refresh()` chứ không dời người trung tâm: ngày cưới và
 * thứ bậc không đổi ai đứng đâu, còn công tắc *đổi chỗ trái/phải* thì đổi đúng
 * hai ô đang nằm trong sơ đồ người dùng đang nhìn.
 */
function moFormSuaCap(personId, unionId) {
  openUnionForm(personId, { onDaLuu: () => refresh(), unionId });
}

/**
 * Mở THÙNG RÁC, và nối hai đường quay lại của nó.
 *
 * Sau mỗi lần đưa trở lại thì **mở lại thùng rác**, không đóng hẳn: xoá nhầm
 * thường xoá nhầm vài thứ liền nhau — người bị xoá kéo theo cặp của họ — nên
 * bắt người dùng bấm 🔍 → Thùng rác lại từ đầu cho mỗi dòng là bắt làm thừa.
 * `refresh()` chạy trước để sơ đồ phía sau đã đúng khi thùng rác mở lại.
 */
function moThungRac() {
  const moLai = () => { refresh(); moThungRac(); };
  openThungRac({
    // KHÔI PHỤC thì mở lại thùng rác sau khi xong: xoá nhầm thường xoá nhầm
    // vài thứ liền nhau — người bị xoá kéo theo cặp của họ — nên bắt người
    // dùng bấm 🔍 → Thùng rác lại từ đầu cho mỗi lượt là bắt làm thừa.
    onKhoiPhuc: (ids) => khoiPhucNhieu(ids, { onDaLuu: moLai }),

    // ⚠ XOÁ VĨNH VIỄN thì KHÔNG mở lại, khác hẳn đường trên. Hai lý do, và lý
    // do thứ hai mới là lý do thật:
    //
    //   · thứ vừa xoá đã biến mất, nên mở lại chỉ để nhìn một danh sách ngắn
    //     đi — không ai cần xác nhận điều đó bằng mắt;
    //   · hộp kết quả của việc này còn phải kể tên BẢN SAO LƯU và số file ảnh
    //     đã dọn. Bật một màn hình khác đè lên là cắt mất đúng dòng chữ mà
    //     người dùng cần đọc — mà nó là dòng chữ duy nhất nói ra đường lùi.
    onXoaHan: (ids) => donThungRac({ onDaLuu: () => refresh() }, ids),
  });
}


/**
 * Mở màn hình RÀ SOÁT, và nối hai đường đi tiếp của nó.
 *
 * Bản báo cáo cũ ở màn hình Cài đặt (bước 17) bị gỡ đi ở bước 30 vì nó **chỉ
 * kể tên lỗi mà không có đường sửa**. Đúng ba dòng dưới đây là thứ chữa chỗ
 * ấy: mỗi dòng lỗi mở thẳng hồ sơ của người — hoặc thẻ của cặp — có vấn đề, và
 * từ đó mọi việc đều làm được ngay.
 *
 * `xuLyThe()` KHÔNG cần bọc `dongTruoc` như bên Danh sách người: màn hình rà
 * soát tự đóng trước khi gọi ra ngoài (xem `veMotDong` ở `review.js`), nên
 * không còn lớp phủ nào nằm đè lên kết quả người dùng vừa gây ra.
 *
 * Không tự mở lại sau mỗi việc, khác Thùng rác. Thùng rác chỉ có **một** việc
 * nên mở lại là đúng; ở đây một dòng lỗi dẫn tới cả một thẻ thông tin với mười
 * việc, và bật cái danh sách lỗi trở lại sau mỗi việc là cắt ngang đúng lúc
 * người dùng đang muốn nhìn kết quả mình vừa sửa. Muốn xem lại thì màn hình có
 * sẵn nút *"Rà lại"*.
 */
function moRaSoat() {
  openReview({
    onXemHoSo: (id) => openPersonDetail(id, xuLyThe()),
    onXemCap:  (id) => openUnionDetail(id, xuLyThe()),

    // Gộp xong thì MỞ LẠI bản rà soát, cùng lý lẽ với `onGomRac`: một cặp
    // trùng sinh ra hai dòng, và người vừa gộp cần thấy cả hai dòng ấy biến
    // mất mới tin là xong. Nó cũng là chỗ lộ ra cặp trùng thứ hai, nếu có.
    onGopCap:  (a, b) => openMergeForm(a, b, {
      onDaLuu: () => { refresh(); moRaSoat(); },
    }),

    // Gom rác xong thì MỞ LẠI bản rà soát: người đang dọn kho thường dọn vài
    // lượt liền nhau, và lượt sau phải nhìn được kết quả lượt trước — gom hai
    // người mồ côi vào thùng rác có thể làm một cặp thành cặp thừa. Đây là chỗ
    // nó khác đường "bấm một dòng lỗi": đường ấy dẫn sang một thẻ thông tin
    // với mười việc, còn đường này quay về đúng chỗ vừa đứng.
    onGomRac: (ids) => chuyenVaoThungRac(ids, {
      onDaLuu: () => { refresh(); moRaSoat(); },
    }),
  });
}


/**
 * Nút ⓘ ở cụm trên phải: mở MENU của người đang đứng giữa, không mở thẳng thẻ
 * thông tin.
 *
 * Cùng một cử chỉ phải ra cùng một màn hình. Chạm giữ ra menu mà nút ⓘ ra thẻ
 * thì app có hai cửa cho cùng một người, và người dùng phải nhớ cửa nào có việc
 * mình cần. Thẻ thông tin nằm cách đó đúng một cú chạm, ở mục ⓘ trong vòng tròn.
 */
function moTheNguoiTrungTam() {
  if (!state.focusPersonId) return;
  openPersonMenu(state.focusPersonId, xuLyThe());
}

/**
 * MƯỜI HAI việc thẻ thông tin báo ngược ra ngoài. Gom một chỗ để hai nơi mở
 * thẻ — chạm giữ và nút ⓘ — không bao giờ mọc ra hai bộ nút khác nhau.
 *
 * ⚠ Sáu trong số ấy là sáu mục của MENU VÒNG TRÒN, và cả sáu đều phải có mặt
 * ở đây. Thiếu một cái thì mục ấy vẫn mọc ra trên thẻ nhưng mờ đi và không bấm
 * được — tức một nút chết, đúng thứ điểm dừng của bước 26 cấm.
 *
 * ⚠ Ba việc CUỐI — `onSuaCap` · `onSapThuTu` · `onSuaCon` — không phải việc
 * của thẻ NGƯỜI mà của thẻ GIA ĐÌNH. Chúng vẫn nằm chung bộ này vì thẻ gia
 * đình mở ra TỪ thẻ người (`nutXemGiaDinh`) và nhận đúng cái bộ ấy truyền
 * xuống. Tách làm hai bộ thì một trong hai sẽ thiếu, và cái thiếu chỉ lộ ra
 * bằng một nút không ăn.
 */
function xuLyThe() {
  return {
    onChonNguoi:  (id) => setFocusPerson(id),
    onSuaNguoi:   moFormSua,
    onThemChaMe:  moFormThemChaMe,
    onThemBanDoi: moFormThemBanDoi,
    onThemCon:    moFormThemCon,
    onKetNoi:     moKetNoi,
    onGoNoi:      moGoNoi,
    onXoaNguoi:   moHopXoa,
    onSuaCap:     moFormSuaCap,
    onSapThuTu:   moSapCacCon,
    onSuaCon:     moSuaCon,
    onSuaGiaDinh: moFormGiaDinh,
    onXoaCap:     moXoaCap,
  };
}

/**
 * Xoá một GIA ĐÌNH — dùng lại đúng đường gom rác của bước 38.
 *
 * `chuyenVaoThungRac()` đã biết nhận cả mã `P….` lẫn `U….` từ màn Rà soát,
 * và nó đã có hộp xác nhận kể tên từng dòng. Viết một hộp xoá cặp riêng ở đây
 * là dựng bản thứ hai của cùng một sự thật.
 */
function moXoaCap(unionId) {
  chuyenVaoThungRac([unionId], { onDaLuu: () => refresh() });
}

/**
 * Màn hình CÁC GIA ĐÌNH, và đường đi tiếp của nó (22/08/2026).
 *
 * Bấm một dòng là mở THẺ GIA ĐÌNH của cặp ấy — màn hình ĐỌC, đúng thứ người
 * mở một danh sách đang muốn. Từ thẻ đó có sẵn *Sửa gia đình này* và *Sắp thứ
 * tự các con*.
 *
 * Truyền cả bộ `xuLyThe()` xuống, không chỉ một hàm: thẻ gia đình mọc ra nút
 * nào là tuỳ bộ ấy có gì, và thiếu một cái thì đúng mục ấy lặng lẽ không hiện.
 */
function moDanhSachGiaDinh() {
  const moLai = () => { refresh(); moDanhSachGiaDinh(); };
  openDanhSachGiaDinh({
    onXemCap: (unionId) => openUnionDetail(unionId, xuLyThe()),

    // Gom rác xong thì MỞ LẠI danh sách, cùng lối với màn Rà soát: người đang
    // dọn thường dọn vài lượt liền nhau, và lượt sau phải nhìn được kết quả
    // lượt trước.
    onGomRac: (ids) => chuyenVaoThungRac(ids, { onDaLuu: moLai }),
  });
}

/**
 * Màn hình *Sửa thông tin gia đình* — cửa thứ hai của thẻ người (22/08/2026).
 *
 * Nhận CẢ BỘ `xuLyThe()` chứ không chỉ `onDaLuu`: bên trong màn hình ấy có
 * những đường dẫn ngược ra ngoài — mở hồ sơ một người (`onSuaNguoi`), thêm con
 * (`onThemCon`), chọn cha mẹ khi chưa có (`onKetNoi`). Truyền thiếu cái nào
 * thì đúng cái mục ấy không mọc ra, và người dùng gặp một khoảng trống không
 * ai giải thích.
 *
 * `refresh()` chứ không dời người trung tâm: sửa quan hệ đổi HÌNH rất nhiều,
 * và người dùng cần nhìn thấy sơ đồ quanh CHÍNH người họ đang sửa đổi đi.
 */
function moFormGiaDinh(personId) {
  openFamilyForm(personId, Object.assign(xuLyThe(), {
    onDaLuu:  () => refresh(),
    // Cửa tới ngày cưới · ảnh cưới · Sắp thứ tự các con. Từ 22/08/2026 đây là
    // đường đi thường ngày duy nhất tới thẻ gia đình: hai nút cũ trên thẻ NGƯỜI
    // đã gỡ vì chúng nói lại đúng những điều màn hình này nói.
    onXemCap: (unionId) => openUnionDetail(unionId, xuLyThe()),
  }));
}

/**
 * Sửa một người con của một cặp — nửa sau việc 8.
 *
 * `refresh()` chứ không dời người trung tâm, và đó là một lựa chọn có chủ ý
 * dù việc này ĐỔI HÌNH nhiều hơn mọi việc khác của thẻ gia đình: chuyển một
 * đứa con sang nhà khác là nó rời khỏi chỗ đang đứng trên sơ đồ. Chính vì thế
 * mà giữ nguyên tâm — người dùng cần nhìn thấy đứa bé RỜI ĐI khỏi chỗ cũ, mà
 * dời tâm sang chỗ mới thì họ mất luôn cái khung hình để so.
 */
function moSuaCon(unionId) {
  openSuaCon(unionId, { onDaLuu: () => refresh() });
}

/**
 * Hai cửa vào MỘT màn hình sắp thứ tự, hỏi hai câu khác nhau.
 *
 * `'anhChiEm'` — cửa CHẠM GIỮ trên ô sơ đồ: sắp hàng anh chị em của người ấy,
 *                tức sắp con của cặp CHA MẸ họ.
 * `'con'`      — cửa NÚT trong thẻ thông tin: sắp con của cặp mà chính người
 *                ấy làm vợ/chồng.
 *
 * ⚠ Cử chỉ ẩn phải có một cái nút đi kèm (luật chat 1.6) — chạm giữ là cử chỉ
 * ẩn, và cái nút của nó là *"Sắp thứ tự các con"* dưới nhóm Con trong thẻ.
 *
 * `refresh()` chứ không dời người trung tâm: đổi thứ tự anh em không đổi ai
 * đứng giữa, chỉ đổi ai đứng trái ai đứng phải trong đúng cái hàng người dùng
 * đang nhìn.
 */
function moSapAnhChiEm(personId) {
  openSapThuTu(personId, 'anhChiEm', { onDaLuu: () => refresh() });
}

function moSapCacCon(personId) {
  openSapThuTu(personId, 'con', { onDaLuu: () => refresh() });
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

/**
 * Thêm một người cha hoặc mẹ. **Không kèm giới tính** — ô giới tính trong form
 * là chỗ nói ra đây là cha hay là mẹ (đổi 20/08/2026).
 *
 * `refresh()` chứ không `setFocusPerson(idNguoiMoi)`: cha mẹ vừa thêm đứng ngay
 * phía trên người dùng đang xem, tức đã có mặt trong sơ đồ đang mở — trừ khi
 * người ta đang lọc 0 đời tổ tiên, và lúc ấy kéo cả sơ đồ đi là làm mất chỗ họ
 * đang đứng để đổi lấy một thứ họ tự bấm hai lần là thấy.
 */
function moFormThemChaMe(personId) {
  quickAddParent(personId, { onDaLuu: () => refresh() });
}

function moFormThemBanDoi(personId) {
  quickAddSpouse(personId, { onDaLuu: () => refresh() });
}

/**
 * Kết nối với một người ĐÃ CÓ SẴN: chọn người trước, chọn quan hệ sau.
 *
 * ⚠ THỨ TỰ NÀY LÀ CỐ Ý. Hỏi quan hệ trước rồi mới mở danh sách thì hai lớp phủ
 * chồng lên nhau — hộp của `person-edit.js` ở `z-index` 35, danh sách ở 30, nên
 * cái mở sau lại nằm dưới cái mở trước và người dùng bấm vào khoảng không. Chọn
 * người trước thì mỗi lúc chỉ có đúng một lớp phủ trên màn hình.
 *
 * ⚠ Và chỗ chọn người ĐÃ CÓ SẴN từ bước 24: `openPersonList({ onChonNguoi })`
 * tự đổi tiêu đề thành "Chọn một người". Đừng dựng cái thứ hai.
 */
function moKetNoi(personId) {
  openPersonList({
    onChonNguoi: (targetId) => {
      closePersonList();
      linkExisting(personId, targetId, '', { onDaLuu: () => refresh() });
    },
  });
}

/**
 * Gỡ một mối nối. Không cần màn hình Danh sách người: mối nối của một người
 * đếm trên đầu ngón tay, và bắt người ta đi tìm bằng ô gõ tên một người mà app
 * đang có sẵn danh sách là bắt làm thừa.
 */
function moGoNoi(personId) {
  goNoiNguoi(personId, { onDaLuu: () => refresh() });
}

/**
 * Mở hộp xác nhận xoá.
 *
 * ⚠ `nguoiThayThe` phải tính TRƯỚC khi xoá, và truyền vào hộp. Tính sau thì
 * người ấy đã biến khỏi `state.index` và không còn hàng xóm nào để hỏi — sơ đồ
 * rơi thẳng vào màn hình *"người trung tâm không còn trong gia phả"*, một ngõ
 * cụt mà từ đó người dùng không tự ra được (màn hình Cài đặt chỉ đặt được người
 * ĐANG đứng giữa làm mặc định, nó không có chỗ chọn người khác).
 */
function moHopXoa(personId) {
  const thay = (state.focusPersonId === personId) ? nguoiDungThayCho(personId) : null;

  xoaNguoi(personId, {
    nguoiThayThe: thay,
    onDaXoa: () => {
      if (state.focusPersonId === personId && thay) {
        state.focusPersonId = thay;
        notify();
      }
      refresh();
    },
    onDaHoanTac: () => {
      if (thay && state.focusPersonId === thay) {
        state.focusPersonId = personId;   // trả lại đúng chỗ người dùng đang đứng
        notify();
      }
      refresh();
    },
    // Lối "giữ lại làm mắt xích": người ấy VẪN còn trong cây, chỉ trống hồ sơ.
    // Chỉ vẽ lại, tuyệt đối không dời người trung tâm — dời đi là tự dưng nhảy
    // sang người khác trong khi người dùng đang đứng đúng chỗ họ muốn xem.
    onDaDoi: () => refresh(),
  });
}

/**
 * Ai sẽ được đưa ra giữa sơ đồ thay cho người sắp bị xoá.
 *
 * Ưu tiên theo mức gần gũi: vợ/chồng → cha mẹ → con → anh chị em. Ai cũng được,
 * miễn sơ đồ mới còn vẽ ra được người sắp mất và bối cảnh quanh họ — người dùng
 * vừa xoá xong thường muốn nhìn ngay chỗ vừa đụng vào.
 *
 * Hết cả bốn thì lấy gốc cây ghi trong file, cùng lắm lấy bất kỳ ai khác — cùng
 * bậc thang mà `repo.chonNguoiTrungTam()` dùng lúc mở app. Trả null chỉ khi gia
 * phả không còn ai khác, và lúc ấy màn hình lời nhắn là câu trả lời đúng.
 */
function nguoiDungThayCho(personId) {
  const index = state.index;
  if (!index) return null;

  for (const nhom of [getSpouses, getParents, getChildren, getSiblings]) {
    for (const m of nhom(index, personId)) {
      if (m && m.personId !== personId && index.personById.has(m.personId)) return m.personId;
    }
  }

  const goc = state.tree && state.tree.tree && state.tree.tree.rootPersonId;
  if (goc && goc !== personId && index.personById.has(goc)) return goc;

  for (const id of index.personById.keys()) {
    if (id !== personId) return id;
  }
  return null;
}

/**
 * Một nút tròn nổi trên sơ đồ.
 *
 * ⚠ **Biểu tượng KHÔNG còn là `textContent` của cái nút.** Nó là một `<svg>`
 * do `utils/glyph.js` dựng, và đó là chỗ chữa HAI lỗi chủ dự án chỉ ra ngày
 * 22/08/2026 sau khi dùng app thật:
 *
 * 1. **Kính lúp 🔍 tràn ra ngoài vòng tròn.** Bản trước ép mọi biểu tượng
 *    chiếm 90% bề ngang; một hình gần vuông rộng 90% đường kính thì bốn góc
 *    của nó nằm ngoài đường tròn. `glyph.js` đo vùng mực thật rồi ép nó nằm
 *    trọn trong một đường tròn nhỏ hơn đúng một khe hở 0,7–1mm.
 * 2. **Chữ ⓘ lệch lên trên, tâm chữ không rơi vào tâm vòng tròn.** Không phải
 *    lỗi cỡ chữ mà là lỗi CĂN: `align-items:center` căn theo *hộp dòng*, mà
 *    mực của ⓘ ngồi lệch trong hộp ấy. `glyph.js` căn theo chính vùng mực.
 *
 * `CO_NUT_TRON` 44px là đích chạm tối thiểu của ngón tay, đừng hạ xuống —
 * `kiem-cum-nut.mjs` gác con số này.
 */
function nutTron(chu, nhan, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.title = nhan;
  nut.setAttribute('aria-label', nhan);
  nut.style.cssText =
    'width:' + CO_NUT_TRON + 'px;height:' + CO_NUT_TRON + 'px;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:0;box-sizing:border-box;color:#2a2622;' +
    'border:1px solid #e6e0d8;border-radius:' + (CO_NUT_TRON / 2) + 'px;background:#fffdf9;' +
    'box-shadow:0 1px 4px rgba(42,38,34,.12);cursor:pointer;touch-action:manipulation';

  nut.append(veBieuTuongTron(chu));
  nut.addEventListener('click', chay);
  return nut;
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

/**
 * Màn hình thay thế khi không vẽ được gì. Nói rõ phải làm gì, không hiện lỗi thô.
 *
 * @param {string} tieuDe
 * @param {string} giaiThich
 * @param {{chu:string, bam:function}} [nut]  nút hành động, khi lời nhắn ấy có
 *        một việc làm được ngay tại chỗ. Bỏ trống thì màn hình chỉ có chữ, đúng
 *        như trước — ba lời nhắn cũ đều là "đi chỗ khác mà làm", không có việc
 *        nào để làm ở đây.
 */
function hienLoiNhan(tieuDe, giaiThich, nut) {
  layoutHT = null;
  donKhung();
  // Trả lề căn giữa của lần vẽ trước về 0: không có bước này thì lời nhắn bị
  // đẩy lệch hẳn xuống dưới bằng đúng nửa chiều cao sơ đồ cũ.
  padX = 0;
  padY = 0;
  if (khungCuon) khungCuon.style.padding = '0';

  // ⚠ `min(…, 100%)` và `box-sizing` là BẮT BUỘC, không phải cho đẹp.
  // `rongHop(420, 620)` có SÀN 420px — trên điện thoại dọc 380px thì hộp rộng
  // hơn khung 40px, cộng 24px padding mỗi bên nữa, và chữ bị cắt cụt ở mép
  // phải. Ba lời nhắn cũ dính lỗi này từ lâu mà không ai thấy vì chúng hiếm
  // khi hiện ra; màn hình "gia phả chưa có ai" thì ngược lại — nó là màn hình
  // ĐẦU TIÊN của mọi gia phả mới lập.
  const hop = document.createElement('div');
  hop.style.cssText = 'max-width:min(' + rongHop(420, 620) + ', 100%);' +
                      'box-sizing:border-box;' +
                      'margin:48px auto;padding:0 24px;line-height:1.6';

  const h = document.createElement('h2');
  h.textContent = tieuDe;
  h.style.cssText = 'font-size:18px;margin:0 0 8px';

  const p = document.createElement('p');
  p.textContent = giaiThich;
  p.style.cssText = 'margin:0;font-size:14px;color:#8a8078';

  hop.append(h, p);

  if (nut && typeof nut.bam === 'function') {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = nut.chu;
    b.style.cssText =
      'margin-top:18px;padding:10px 18px;font-size:15px;font-family:inherit;' +
      'border:1px solid #2a2622;border-radius:8px;background:#2a2622;' +
      'color:#fffdf9;font-weight:600;cursor:pointer';
    b.addEventListener('click', nut.bam);
    hop.append(b);
  }

  khungCuon.prepend(hop);
}

/**
 * Mở form người đầu tiên, rồi đứng ngay vào người vừa nhập.
 *
 * Đặt `focusPersonId` tại đây chứ không đợi lần mở app sau đọc `rootPersonId`:
 * người dùng vừa gõ xong một bản ghi, thứ họ mong thấy là bản ghi ấy hiện ra
 * giữa màn hình — không phải cùng cái màn hình trống vừa nãy.
 */
function moThemDauTien() {
  themNguoiDauTien({ onDaLuu: (personId) => setFocusPerson(personId) });
}

/**
 * Nốt cụt gộp: hiện danh sách người phía sau để chọn một người làm trung tâm mới.
 * Lớp phủ đơn giản, bấm ra ngoài là đóng.
 */
function hienDanhSachChon(danhSachId) {
  const phu = document.createElement('div');
  phu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:20;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu(24) + ';';

  const hop = document.createElement('div');
  hop.style.cssText =
    'background:#fffdf9;border-radius:12px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(340, 520) + ';' +
    'max-height:' + caoHop(70, 24) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.25);' +
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

// Trần của ô nhập tay. 30 đời là hơn bảy trăm năm — quá xa mọi gia phả có
// thật, nhưng vẫn là số hữu hạn, nên gõ thừa một phím không treo trình duyệt.
const TOI_DA_DOI = 30;

let nutToTien = [];
let nutHauDue = [];
let nutDauRe  = null;
let oNhapToTien = null;
let oNhapHauDue = null;

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
  const nhapTren = veHangNhapTay(
    'Nhập số đời tổ tiên cần vẽ rồi bấm Vẽ. 0 = không giới hạn.',
    datPhamViToTienSo);
  oNhapToTien = nhapTren.o;
  thanToTien.append(nhapTren.nhan, nhapTren.hang);
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
  const nhapDuoi = veHangNhapTay(
    'Nhập số đời hậu duệ cần vẽ rồi bấm Vẽ. 0 = không giới hạn.',
    datPhamViHauDueSo);
  oNhapHauDue = nhapDuoi.o;
  thanHauDue.append(nhapDuoi.nhan, nhapDuoi.hang);

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

/**
 * Áp dụng số đời TỔ TIÊN gõ tay. Đi cùng một đường với `datPhamViToTien()`
 * chứ không mở lối riêng: cùng thu cột lại, cùng bỏ qua khi số không đổi,
 * cùng gọi `notify()` rồi `refresh()`.
 */
function datPhamViToTienSo(soDoi) {
  datXo('tren', false);
  if ((state.scope.ancestors || 0) === soDoi) { capNhatNutPhamVi(); return; }
  state.scope.ancestors = soDoi;
  notify();
  refresh();
}

/**
 * Áp dụng số đời HẬU DUỆ gõ tay.
 *
 * KHÔNG đụng `spouseOfDescendants`. Người dùng gõ số ĐỜI thì chỉ số đời được
 * đổi — chuyện vẽ hay không vẽ vợ/chồng của con đã có nấc "Con" / "Con và
 * Vợ/Chồng" và công tắc "Dâu/rể" lo. Đổi lén thêm một thứ nữa là hứa một đằng
 * làm một nẻo.
 */
function datPhamViHauDueSo(soDoi) {
  const sc = state.scope;
  datXo('duoi', false);
  if ((sc.descendants || 0) === soDoi) { capNhatNutPhamVi(); return; }
  sc.descendants = soDoi;
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
  // Ô nhập luôn nói đúng số đang vẽ — TRỪ khi người dùng đang gõ dở trong nó.
  // Ghi đè giữa lúc gõ là ký tự vừa bấm biến mất ngay dưới ngón tay.
  if (oNhapToTien && document.activeElement !== oNhapToTien) {
    oNhapToTien.value = String(sc.ancestors || 0);
  }
  if (oNhapHauDue && document.activeElement !== oNhapHauDue) {
    oNhapHauDue.value = String(sc.descendants || 0);
  }

  const nacTren = NAC_TO_TIEN.find((n) => n.ancestors === (sc.ancestors || 0));
  const nacDuoi = NAC_HAU_DUE.find((n) => n.descendants === (sc.descendants || 0) &&
                    n.spouseOfDescendants === (sc.spouseOfDescendants !== false));
  if (tomTatToTien) {
    tomTatToTien.textContent = '▲ ' + (nacTren ? nacTren.nhan : sc.ancestors + ' đời trước');
    tomTatToTien.title = 'Đời trên — bấm để đổi';
  }
  if (tomTatHauDue) {
    // Gõ tay một số không trùng nấc nào thì nói thẳng số ấy ra. Bản trước ghi
    // "Tuỳ chọn riêng" — đúng nhưng vô dụng: thu cột lại là mất hẳn con số.
    const chuDuoi = nacDuoi
      ? nacDuoi.nhan
      : ((sc.descendants || 0) === 0 ? 'Không giới hạn' : sc.descendants + ' đời dưới');
    tomTatHauDue.textContent = '▼ ' + chuDuoi + (hienDauRe ? '' : ' · ẩn dâu/rể');
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

/**
 * Hàng "hoặc nhập số đời" ở cuối mỗi cột — bước 23.
 *
 * Bốn nấc sẵn có phủ hết những ca hay dùng, nhưng chỉ có 2·3·4 đời trên và
 * 1·2 đời dưới. Muốn xem đúng 6 đời tổ tiên thì trước bước này chỉ còn cách
 * chọn "Không giới hạn" rồi tự đếm bằng mắt.
 *
 * Ba điều đã cân nhắc:
 *
 * 1. **Phải có nút "Vẽ", không vẽ lại theo từng phím gõ.** Gõ "12" đi qua số
 *    "1" — vẽ ngay thì sơ đồ nháy một lần thừa, mà trên bản 1200 người mỗi
 *    lần vẽ tốn gần 100ms.
 * 2. **Phím Enter làm y như bấm "Vẽ"**, cho người quen dùng bàn phím.
 * 3. **Số vượt trần bị kéo về trần ngay trong ô**, không im lặng bỏ qua: ô
 *    nhập phải luôn hiện đúng con số sắp được dùng.
 *
 * @param {string} nhan   chữ hiện khi rê chuột, nói rõ ý nghĩa số 0
 * @param {function(number)} apDung   gọi với số đời đã hợp lệ
 * @returns {{nhan:HTMLElement, hang:HTMLElement, o:HTMLInputElement}}
 */
function veHangNhapTay(nhan, apDung) {
  const ghi = document.createElement('div');
  ghi.textContent = 'Hoặc nhập số đời';
  ghi.title = nhan;
  ghi.style.cssText =
    'font-size:11px;color:#8a8078;text-align:center;user-select:none;margin-top:2px';

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;align-items:center;gap:6px;width:132px';

  const o = document.createElement('input');
  o.type      = 'number';
  o.min       = '0';
  o.max       = String(TOI_DA_DOI);
  o.step      = '1';
  o.inputMode = 'numeric';
  o.title     = nhan;
  o.style.cssText =
    'width:64px;height:36px;box-sizing:border-box;padding:0 6px;' +
    'font-size:12.5px;line-height:1;font-family:system-ui,sans-serif;text-align:center;' +
    'border:1px solid #e6e0d8;border-radius:8px;background:#fffdf9;color:#2a2622';

  const nut = nutChu('Vẽ', nhan, () => {
    const soDoi = docSoDoi(o);
    if (soDoi === null) { o.focus(); o.select(); return; }
    apDung(soDoi);
  });
  nut.style.width = '62px';

  // Enter = bấm "Vẽ". Dùng `keydown` chứ không `keypress`: keypress đã lỗi
  // thời, và bàn phím ảo trên Android không phải lúc nào cũng bắn nó.
  o.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    nut.click();
  });

  hang.append(o, nut);
  return { nhan: ghi, hang, o };
}

/**
 * Đọc ô nhập, kéo về khoảng dùng được. Trả `null` khi ô trống hoặc không ra
 * số — lúc đó nơi gọi chỉ việc trỏ con nháy lại vào ô, không vẽ gì cả.
 */
function docSoDoi(o) {
  if (String(o.value).trim() === '') return null;
  const n = Math.round(Number(o.value));
  if (!Number.isFinite(n)) return null;
  if (n < 0)          { o.value = '0';                return 0; }
  if (n > TOI_DA_DOI) { o.value = String(TOI_DA_DOI); return TOI_DA_DOI; }
  o.value = String(n);
  return n;
}

/** Nút đang chọn: đảo màu. Tương phản mạnh để đọc được cả trên ảnh chụp. */
function datVeChon(nut, dangChon) {
  nut.style.background = dangChon ? '#2a2622' : '#fffdf9';
  nut.style.color      = dangChon ? '#fffdf9' : '#2a2622';
  nut.style.fontWeight = dangChon ? '600' : '400';
}
