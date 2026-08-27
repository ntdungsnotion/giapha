// ============================================================
// giapha · js/pages/form-cap.js
// Vai trò  : FORM SỬA CẶP — ngày cưới · nơi cưới · cặp này bây giờ · thứ bậc ·
//            chỗ đứng trái phải · ghi chú · ảnh của cặp
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/person-edit.js (nền dùng chung + kho ảnh), state,
//            domains/{union,validate}, utils/{graph,date,text}, config
// Phiên bản: 1.1.0 · Cập nhật: 27/08/2026 22:30
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 5 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào.
//
// ⚠ **Vòng nhập với `person-edit.js` ở đây là HAI CHIỀU thật sự**, không chỉ vì
// việc xuất lại: `veChan()` bên nền tự quyết gọi hàm lưu nào theo `N.cheDo`,
// nên nó gọi `handleSaveUnion()` của file này. Đợt 7 của bản đồ tách gỡ nút ấy
// bằng cách đổi chữ ký thành `veChan(chayLuu, …)` — nơi gọi truyền hàm lưu vào,
// và nền thôi phải biết tên bốn hàm lưu của bốn cụm.

import { N, o, KIEU_O, KIEU_NUT_CHON, KIEU_LOP_PHU, KIEU_HOP, closePersonForm,
         canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi, keTenPartner, tenNguoi,
         moTaCap, moHopChon, moHopBao, veNhan, veChan, oChu, oNhieuDong, docO,
         mayDocDuocGi } from './person-edit.js';
import { veKhoiAnh, apThayDoiAnh, keThayDoiAnh } from './form-anh.js';
import { state } from '../state.js';
import { updateUnion, swapPartnerOrder, getPartnerUnions,
         rankCua } from '../domains/union.js';
import { validateAll } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { stampNow } from '../utils/date.js';
import { coGiaTri } from '../utils/text.js';
import { TRANG_THAI_CAP } from '../config.js';

let capDangSua = null;   // mã cặp đang mở trong form
let mocDangSua = null;   // NGƯỜI LÀM MỐC cho thứ bậc — luôn là người đã mở form
                         // này (DAC-TA-RANK_V01, Vòng 4)

/** `closePersonForm()` gọi hàm này — xem `form-sap-thu-tu.js`. */
export function donDepCap() {
  capDangSua = null;
  mocDangSua = null;
}

// ============================================================
// SỬA CẶP — bước 29
// ============================================================
//
// `updateUnion` và `swapPartnerOrder` viết ở bước 26 cho đủ bộ, có phép kiểm,
// mà chưa nút nào gọi. Đây là nút của chúng.
//
// --- BỐN quyết định của form sửa cặp -------------------------------------
//
// 1. **Form này KHÔNG đụng `partners` và `children`.** Thêm hay bớt người trong
//    cặp đã có đường riêng — *Kết nối* và *Gỡ nối* của bước 26 — và mỗi lần
//    chạm vào hai mảng ấy còn phải hỏi tiếp câu *"cặp này còn lý do tồn tại
//    không"* (`conLyDoTonTai`). Cho form này sửa luôn hai mảng ấy là mở một cửa
//    thứ hai đi vòng qua câu hỏi đó — đúng điều `domains/union.js` dặn.
//
// 2. **Đổi chỗ trái/phải là một CÔNG TẮC trong form, không phải một nút riêng.**
//    Nút riêng thì mỗi lần bấm là một lần ghi xuống Drive, và người dùng thử
//    ba lần là ba mục trong `changeLog`. Công tắc thì cả form đi xuống trong
//    MỘT lần lưu — luật 4 của đường ghi dữ liệu.
//
// 3. **Và công tắc ấy nói trước rằng nó có thể không đổi được gì.**
//    `layout.js` xếp nam bên trái, nữ bên phải theo GIỚI TÍNH; `partnerOrder`
//    chỉ có tác dụng khi hai người CÙNG GIỚI hoặc thiếu giới (QUY-TAC-VE §2).
//    Không nói ra thì người dùng bấm, lưu, nhìn sơ đồ không nhúc nhích, và kết
//    luận là app hỏng.
//
// 4. **Thứ bậc (`ranks`) và `partnerOrder` là HAI THỨ KHÁC NHAU, và form nói
//    rõ điều đó.** Thứ bậc là vợ cả / vợ thứ — một sự thật về gia đình, và chỉ
//    có nghĩa khi đọc TỪ PHÍA MỘT NGƯỜI (`rankCua()`, `DAC-TA-RANK_V01.md`).
//    `partnerOrder` là vị trí trái/phải trên hình — một chuyện của cái sơ đồ,
//    không đứng về phía ai. Gộp hai cái là nói sai về gia đình người ta.

/**
 * Mở form sửa cặp của một người. Người ấy có nhiều cặp thì hỏi cặp nào trước.
 *
 * @param {string} mocId  người đang đứng giữa việc này
 * @param {{onDaLuu?:function(string), unionId?:string}} [xuLy]
 *        `unionId` — nơi gọi ĐÃ BIẾT cặp nào, nên bỏ hẳn bước hỏi. Thẻ gia
 *        đình (việc 4) vào bằng đường này: nó đang mở đúng một cặp, và hỏi lại
 *        *"cặp nào"* ngay sau khi người ta bấm Sửa trên chính cặp ấy là hỏi
 *        một câu vừa được trả lời.
 */
export function openUnionForm(mocId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(mocId)) return;

  if (xuLy.unionId && index.unionById.has(xuLy.unionId)) {
    moFormCap(xuLy.unionId, xuLy, mocId);
    return;
  }

  const ds = getPartnerUnions(index, mocId);

  if (ds.length === 0) {
    moHopBao('Chưa có cặp nào để sửa',
             tenNguoi(mocId) + ' chưa đứng trong cặp vợ chồng nào, nên chưa có ' +
             'ngày cưới hay thứ bậc nào để ghi. Thêm vợ/chồng hoặc Kết nối ' +
             'trước đã — hai mục ấy nằm ở vòng tròn.', false);
    return;
  }

  if (ds.length === 1) { moFormCap(ds[0].id, xuLy, mocId); return; }

  moHopChon('chon', xuLy, {
    tieuDe: 'Sửa cặp nào?',
    phu:    tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  tenNguoi(mocId) + ' đứng trong ' + ds.length + ' cặp. Mỗi cặp có ' +
            'ngày cưới và thứ bậc riêng:',
    cacMuc: ds.map((u) => ({
      ma:  u.id,
      chu: 'Cặp với ' + keTenPartner(u.id),
      phu: moTaCap(u),
      chay: () => moFormCap(u.id, xuLy, mocId),
    })),
  });
}

/**
 * @param {string} unionId
 * @param {object} xuLy
 * @param {string} mocId  NGƯỜI ĐANG MỞ FORM NÀY — mốc của mọi con số thứ bậc
 *        hiện ra trong form. `openUnionForm()` luôn có sẵn giá trị này (kể cả
 *        khi vào bằng đường `xuLy.unionId` đã biết trước, từ thẻ gia đình —
 *        xem JSDoc `openUnionForm`), nên tham số này KHÔNG tuỳ chọn.
 */
function moFormCap(unionId, xuLy, mocId) {
  const u = state.index && state.index.unionById.get(unionId);
  if (!u) return;

  closePersonForm();
  N.xuLyNgoai  = xuLy || {};
  N.cheDo      = 'suaCap';
  capDangSua = unionId;
  mocDangSua = mocId;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-cap';   // mốc cho bài kiểm hành vi, xem kiem-thung-rac.mjs
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sửa cặp';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = keTenPartner(unionId) + '  ·  ' + unionId;
  phu.style.cssText =
    'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  hop.append(tieuDe, phu);
  hop.append(...veCacOCap(u, mocId));

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChan(null, !canTro));

  // Bấm ra ngoài KHÔNG đóng — cùng lý do với form hồ sơ: nó đang giữ những gì
  // người ta vừa gõ.
  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

function veCacOCap(u, mocId) {
  const ra = [];

  ra.push(veNhan('Ngày cưới'));
  ra.push(oNgayCuoi(u));
  ra.push(oChu('marriagePlace', 'Nơi cưới', (u.marriage || {}).place, 'Làng, xã, tỉnh'));

  ra.push(veNhan('Tình trạng hôn nhân'));
  ra.push(veChonTrangThai(u));

  // Nhãn PHẢI nêu tên người làm mốc — "Thứ bậc" trống không đọc được TỪ PHÍA
  // AI, đúng cái lỗi DAC-TA-RANK mục 1 mô tả. Người làm mốc luôn là người đã
  // mở form này (`mocId`), không phải người bạn đời.
  ra.push(veNhan('Đây là cặp thứ mấy của ' + tenNguoi(mocId) + '?'));
  ra.push(oThuBac(u, mocId));

  ra.push(veNhan('Chỗ đứng trên sơ đồ'));
  ra.push(veDoiChoTraiPhai(u));

  ra.push(veNhan('Ghi chú về cặp này'));
  ra.push(oNhieuDong('note', u.note, 'Cưới ở quê, cụ Bá làm chủ hôn…'));

  // ẢNH CƯỚI — việc 5 nửa B. Đứng CUỐI form, sau mọi ô chữ: nó là thứ nặng
  // nhất trên màn hình, mà người mở form ra thì thường để sửa ngày cưới hay
  // thứ bậc. Đặt nó lên trên là mỗi lần sửa một con số lại phải cuộn qua một
  // dải ảnh. Trên THẺ thì ngược lại — ở đó ảnh đứng ngay dưới đầu thẻ, vì
  // thẻ là để XEM.
  ra.push(veNhan('Ảnh của cặp này'));
  ra.push(veKhoiAnh(u.id, null));

  return ra;
}

/**
 * Ô ngày cưới, kèm đúng dòng *"máy đọc được gì"* của ô ngày sinh — `raw` là sự
 * thật, `iso` chỉ là thứ máy đọc được, và người dùng phải nhìn thấy chỗ ấy làm
 * việc (chốt 18/08/2026).
 */
function oNgayCuoi(u) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const m = (u && typeof u.marriage === 'object' && u.marriage) ? u.marriage : {};
  const input = document.createElement('input');
  input.type = 'text';
  input.value = coGiaTri(m.raw) ? String(m.raw) : '';
  input.placeholder = '1972  ·  12/3/1972  ·  khoảng 1972';
  input.setAttribute('aria-label', 'Ngày cưới');
  input.style.cssText = KIEU_O;
  o.marriage = input;

  const doc = document.createElement('div');
  doc.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';
  const capNhat = () => { doc.textContent = mayDocDuocGi(input.value); };
  input.addEventListener('input', capNhat);
  capNhat();

  boc.append(input, doc);
  return boc;
}

/** Hai nút: đang là vợ chồng, hay đã ly hôn. */
function veChonTrangThai(u) {
  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:6px;margin-top:6px';

  const CAC = TRANG_THAI_CAP;
  let dangChon = u.status === 'divorced' ? 'divorced' : 'married';
  const cacNut = [];

  const veLai = () => {
    for (const { ma, nut } of cacNut) {
      nut.style.cssText = KIEU_NUT_CHON +
        (ma === dangChon
          ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
          : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
    }
  };

  for (const c of CAC) {
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.textContent = c.chu;
    nut.dataset.trangThai = c.ma;
    nut.addEventListener('click', () => { dangChon = c.ma; veLai(); });
    cacNut.push({ ma: c.ma, nut });
    hang.append(nut);
  }
  veLai();

  // Đọc bằng hàm, cùng lối với ô giới tính — xem `veChonGioi`.
  o.trangThai = { value: '', doc: () => dangChon };

  const nhac = document.createElement('div');
  nhac.textContent =
    'Ly hôn KHÔNG gỡ ai ra khỏi cặp: hai người vẫn là cha mẹ của những người ' +
    'con đứng dưới, và sơ đồ vẫn vẽ đúng như thế.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';

  const boc = document.createElement('div');
  boc.append(hang, nhac);
  return boc;
}

/**
 * Ô nhập thứ bậc — số nguyên ≥ 1, vợ cả là 1, vợ thứ là 2, 3…
 * KHÔNG phải vị trí trái/phải trên sơ đồ (đó là `partnerOrder`, ô dưới).
 *
 * Đọc/hiện qua `rankCua(u, mocId)` — CỬA DUY NHẤT, `mocId` là người đang mở
 * form này (xem `moFormCap`). Không đọc thẳng `u.ranks`/`u.rank` ở đây.
 *
 * Ô số chứ không phải danh sách chọn: gia phả cũ có cụ bốn đời vợ, và một danh
 * sách cứng thì lần nào cũng thiếu đúng cái con số người ta cần.
 */
function oThuBac(u, mocId) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:6px';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.value = String(rankCua(u, mocId));
  input.setAttribute('aria-label', 'Đây là cặp thứ mấy của ' + tenNguoi(mocId) + '?');
  input.style.cssText = KIEU_O;
  o.thuBac = input;

  const nhac = document.createElement('div');
  nhac.textContent =
    '1 là vợ cả / chồng đầu, 2 là vợ thứ hai… tính riêng theo phía ' +
    tenNguoi(mocId) + '. Đây là thứ bậc trong gia đình, không phải chỗ đứng ' +
    'trái phải trên hình.';
  nhac.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';

  boc.append(input, nhac);
  return boc;
}

/**
 * Công tắc đổi chỗ trái/phải, kèm lời nói trước rằng nó có thể không đổi được
 * gì — quyết định 3 ở đầu mục.
 */
function veDoiChoTraiPhai(u) {
  const boc = document.createElement('div');

  const ds = (Array.isArray(u.partners) ? u.partners : []).filter(Boolean);
  if (ds.length < 2) {
    const mot = document.createElement('div');
    mot.textContent =
      'Cặp này mới có một người, nên chưa có chỗ trái phải nào để đổi.';
    mot.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
    boc.append(mot);
    o.doiCho = null;
    return boc;
  }

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:flex;align-items:center;gap:9px;margin-top:6px;padding:9px 11px;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5;' +
    'font-size:14px;cursor:pointer;touch-action:manipulation';

  const hopChon = document.createElement('input');
  hopChon.type = 'checkbox';
  hopChon.checked = false;
  hopChon.style.cssText = 'width:18px;height:18px;accent-color:#2a2622';
  o.doiCho = hopChon;

  const chu = document.createElement('span');
  chu.textContent = 'Đổi chỗ trái ↔ phải trên sơ đồ';

  nhan.append(hopChon, chu);
  boc.append(nhan);

  if (khacGioi(ds)) {
    const canh = document.createElement('div');
    canh.textContent =
      'Hai người này khác giới, mà sơ đồ luôn xếp nam bên trái, nữ bên phải. ' +
      'Đổi thì dữ liệu có đổi thật, nhưng hình sẽ đứng nguyên như cũ.';
    canh.style.cssText = 'font-size:11px;line-height:1.45;color:#8a8078;margin-top:4px';
    boc.append(canh);
  }

  return boc;
}

/** Đúng hai người, một nam một nữ — lúc ấy `partnerOrder` không đổi được hình. */
function khacGioi(partnerIds) {
  const gioi = partnerIds
    .map((id) => state.index.personById.get(id))
    .filter(Boolean)
    .map((p) => p.sex);
  return gioi.indexOf('M') >= 0 && gioi.indexOf('F') >= 0;
}

/**
 * Lưu cặp. Cùng trình tự với `handleSave`: rà trên cây MỚI, một lần ghi duy
 * nhất, giao diện chỉ đổi sau khi máy chủ gật.
 *
 * ⚠ Chỉ gửi vào `changes` những gì THẬT SỰ khác bản đang lưu. `updateUnion` tự
 * so sánh, nhưng nó so với giá trị đã chuẩn hoá: cặp chưa có `status` mà gửi
 * `'married'` xuống thì nó thấy `undefined !== 'married'` và ghi một dòng
 * `changeLog` cho một việc chẳng ai làm. Mở form rồi bấm Lưu ngay phải là một
 * việc KHÔNG để lại dấu vết.
 */
export async function handleSaveUnion() {
  if (N.dangLuu) return;

  // Dấu thời gian và người sửa, cho kho ảnh — `updateUnion` ở đây không nhận
  // `ghiNhan`, nhưng `attachMedia` và `detachMedia` thì có.
  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  const u = state.index && state.index.unionById.get(capDangSua);
  if (!u) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  const changes = {
    note: docO('note'),
    marriage: { raw: docO('marriage'), place: docO('marriagePlace') },
  };

  const ttMoi   = o.trangThai ? o.trangThai.doc() : 'married';
  const ttCu    = u.status === 'divorced' ? 'divorced' : (u.status || 'married');
  if (ttMoi !== ttCu) changes.status = ttMoi;

  const bacMoi = Number(String(docO('thuBac')).trim());
  if (Number.isFinite(bacMoi) && bacMoi > 0 && bacMoi !== rankCua(u, mocDangSua)) {
    changes.ranks = { [mocDangSua]: bacMoi };
  }

  const kq = updateUnion(state.tree, capDangSua, changes);
  if (!kq) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  // Đổi chỗ NỐI ĐUÔI vào cây mà `updateUnion` vừa trả về — hai hàm chạy trên
  // hai cây khác nhau thì cây gửi lên chỉ mang một trong hai thay đổi.
  const doiCho = !!(o.doiCho && o.doiCho.checked);
  const kqDoi  = doiCho ? swapPartnerOrder(kq.tree, capDangSua) : null;

  const sauDoi   = kqDoi ? kqDoi.tree  : kq.tree;
  const capCuoi  = kqDoi ? kqDoi.union : kq.union;

  // ẢNH nối đuôi vào cây mà hai bước trên vừa trả về — cùng lý lẽ với
  // `handleSave`: `attachMedia` sinh mã `M….` từ cây.
  const anh      = apThayDoiAnh(sauDoi, capDangSua, { boi, luc });
  const cayCuoi  = anh ? anh.tree : sauDoi;
  const diffCuoi = Object.assign({}, kq.diff, kqDoi ? kqDoi.diff : null,
                                 anh ? anh.diff : null);

  if (Object.keys(diffCuoi).length === 0) {
    hienNhan('Chưa có gì thay đổi so với bản đang lưu, nên không cần lưu lại.', false);
    return;
  }

  // Phạm vi `'union'` chạy đúng một phép: khoảng cách tuổi vợ chồng. Nó không
  // nói về ngày cưới — nhưng nó nói về chính cặp vừa đụng vào, nên vẫn chạy,
  // vẫn theo luật 2 (rà trên cây MỚI với chỉ mục MỚI).
  const indexMoi = buildIndex(cayCuoi);
  const raSoat = validateAll(cayCuoi, indexMoi, 'union', { unionId: capDangSua });

  if (!raSoat.canSave) {
    hienNhan('Chưa lưu được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  if (raSoat.warnings.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn lưu';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn lưu" nếu bạn biết là đúng:', false,
             raSoat.warnings.map((m) => m.message));
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const ketQua = await ghiBanGhi(null, [capCuoi], {
    action: 'update',
    target: capDangSua,
    note:   'Sửa cặp ' + keTenPartner(capDangSua) + '.' + keThayDoiAnh(anh),
    diff:   diffCuoi,
  }, anh);

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Cặp này VẪN như cũ.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(capDangSua);
  closePersonForm();
}
