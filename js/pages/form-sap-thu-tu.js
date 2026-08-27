// ============================================================
// giapha · js/pages/form-sap-thu-tu.js
// Vai trò  : Màn hình SẮP THỨ TỰ ANH CHỊ EM — kéo thả, dịch từng bước, hoặc
//            sắp lại theo tuổi
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/person-edit.js (nền dùng chung), state,
//            domains/{union,render}, utils/{text,date,image,avatar}
// Phiên bản: 1.0.0 · Cập nhật: 27/08/2026 19:30
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 3 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào.
//
// ⚠ **Ba biến trạng thái của màn hình này đi theo nó**, và vì thế file này phải
// xuất ra `donDepSapThuTu()`: `closePersonForm()` bên `person-edit.js` không
// với tới biến `let` của file khác được, nên nó GỌI hàm dọn này. Thêm một màn
// hình tách ra là thêm đúng một dòng gọi ở đó — quên dòng ấy thì thứ tự đang
// sắp dở sống sót qua lần đóng hộp và hiện lại ở lần mở sau.

import { N, KIEU_LOP_PHU, KIEU_HOP, closePersonForm, canTroLuu, ghiBanGhi,
         hienNhan, hienLoiGhi, moHopBao, moHopChon, nutChon, nutChanXoa,
         nutChanDam, tenNguoi, keTenPartner, timNguoiTrongCay, timCapTrongCay }
  from './person-edit.js';
import { state } from '../state.js';
import { reorderChildren, thuTuConTheoTuoi, getParentUnions,
         getPartnerUnions } from '../domains/union.js';
import { mauVien } from '../domains/render.js';
import { fullName, coGiaTri } from '../utils/text.js';
import { mocNgay } from '../utils/date.js';
import { driveThumbUrl } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';

let sapCtx = null;   // { unionId, mocId, laCon, thuTu[] } — thứ tự đang sắp DỞ
let sapDay = null;   // khối chứa dãy thẻ, để vẽ lại một mình nó
let sapKeo = null;   // { tu:number } — đang kéo thẻ thứ mấy, null là không kéo

/** `closePersonForm()` gọi hàm này — xem ghi chú đầu file. */
export function donDepSapThuTu() {
  sapCtx = null;
  sapDay = null;
  sapKeo = null;
}


// ============================================================
// SẮP THỨ TỰ ANH CHỊ EM (21/08/2026)
// ============================================================
//
// `reorderChildren()` viết ở bước 19, có phép kiểm, mà tới nay chưa nút nào
// gọi. Đây là cái tay cầm của nó.
//
// --- SÁU quyết định của màn hình này -------------------------------------
//
// 1. **KÉO TAY LÀ ĐƯỜNG CHÍNH; SẮP THEO TUỔI CHỈ LÀ ĐƯỜNG PHỤ.** Chủ dự án nêu
//    hai ca thật (21/08/2026) và cả hai đều làm phép sắp theo tuổi cho kết quả
//    SAI: nhiều người con không còn ai nhớ năm sinh, và **con thứ được giao
//    trưởng họ thì phải đứng bên trái các anh**. Nên `thuTuConTheoTuoi()` ở đây
//    chỉ XẾP THỬ các thẻ trong hộp — phải bấm *Xong* mới ghi xuống Drive.
//
// 2. **Hộp riêng, KHÔNG kéo thẳng trên sơ đồ.** Kéo trên sơ đồ nhìn đẹp hơn,
//    nhưng phải tạm khoá cử chỉ kéo và phóng của `tree-view.js` trong lúc sắp,
//    và một hàng tám chín người con thì chạy ra ngoài mép màn hình điện thoại —
//    đúng lúc người dùng cần nhìn thấy cả hàng để biết mình đang đổi cái gì.
//
// 3. **Các thẻ XUỐNG DÒNG, không cuộn ngang.** Cuộn ngang và kéo ngang là hai
//    cử chỉ giống hệt nhau trên màn hình chạm; đặt cạnh nhau thì trình duyệt
//    phải đoán, và nó sẽ đoán sai. Xuống dòng thì không còn gì để đoán. Đổi
//    lại, mỗi thẻ phải mang một CON SỐ — khi hàng đã xuống dòng thì *"bên
//    trái"* hết là câu trả lời rõ ràng.
//
// 4. **Mỗi thẻ có thêm hai nút ◀ ▶.** Kéo là một cử chỉ, mà luật chat 1.6 đòi
//    mọi cử chỉ phải có một cái nút đi kèm. Và tay run thì nút vẫn bấm được.
//
// 5. **Người trong THÙNG RÁC vẫn hiện, mờ đi.** `reorderChildren()` từ chối
//    thẳng danh sách không phải một hoán vị ĐẦY ĐỦ, mà xoá mềm thì CỐ Ý không
//    gỡ mã người ra khỏi `union.children` (xem `person.softDeletePerson`). Giấu
//    họ đi là gửi lên một danh sách thiếu, hàm trả về `null`, và người dùng chỉ
//    nghe *"không lưu được"* mà không có lý do nào đọc được.
//
// 6. **KHÔNG chạy `validateAll`.** Đã soát `validate.js` ngày 21/08/2026: chín
//    luật rà **không luật nào đọc `order`**, nên đảo chỗ anh em không sinh ra
//    được một vi phạm mới. Chạy phạm vi `'union'` ở đây chỉ moi ra lời cảnh báo
//    về khoảng cách tuổi vợ chồng — chuyện chẳng liên quan gì tới cú kéo người
//    dùng vừa làm — rồi chặn nút *Xong* lại sau một câu *"Vẫn lưu"* khó hiểu.

/**
 * Mở màn hình sắp thứ tự, từ MỘT trong hai cửa:
 *
 * @param {string} mocId  người đang đứng giữa việc này
 * @param {'anhChiEm'|'con'} vai
 *        `'anhChiEm'` — cửa CHẠM GIỮ trên ô sơ đồ. Sắp hàng anh chị em của
 *                       người ấy, tức sắp con của cặp CHA MẸ họ.
 *        `'con'`      — cửa NÚT trong thẻ thông tin. Sắp con của cặp mà chính
 *                       người ấy làm vợ/chồng.
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *
 * Hai vai hỏi hai câu khác nhau nhưng ghi cùng một chỗ: `union.children[].order`.
 */
export function openSapThuTu(mocId, vai, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(mocId)) return;

  const laCon = vai === 'con';
  const tatCa = laCon ? getPartnerUnions(index, mocId) : getParentUnions(index, mocId);
  const sapDuoc = tatCa.filter((u) => soConConLai(u) >= 2);

  if (sapDuoc.length === 0) { baoKhongCoGiDeSap(mocId, laCon, tatCa); return; }
  if (sapDuoc.length === 1) { moManSap(sapDuoc[0].id, mocId, laCon, xuLy); return; }

  // Từ hai cặp trở lên thì PHẢI hỏi — cùng câu hỏi mà `chonCap()` đã trả lời
  // cho bốn đường khác. Người có hai bộ cha mẹ là ca thật trong dữ liệu làm
  // việc; đoán hộ ở đây là sắp lại nhầm một hàng anh em không ai đụng tới.
  moHopChon('chon', xuLy, {
    tieuDe: laCon ? 'Sắp thứ tự con của cặp nào?' : 'Sắp trong cặp cha mẹ nào?',
    phu:    tenNguoi(mocId) + '  ·  ' + mocId,
    cauMo:  laCon
      ? tenNguoi(mocId) + ' có ' + sapDuoc.length + ' cặp có từ hai người con ' +
        'trở lên. Mỗi cặp giữ một thứ tự riêng:'
      : tenNguoi(mocId) + ' có ' + sapDuoc.length + ' bộ cha mẹ, và thứ tự anh ' +
        'chị em được ghi trong TỪNG cặp. Chọn cặp:',
    cacMuc: sapDuoc.map((u) => ({
      ma:  u.id,
      chu: 'Con của ' + keTenPartner(u.id),
      phu: soConConLai(u) + ' người con  ·  ' + u.id,
      chay: () => moManSap(u.id, mocId, laCon, xuLy),
    })),
  });
}

/**
 * Ngõ cụt: không có hàng nào để sắp. **Phải nói ra bằng chữ.**
 *
 * Một cử chỉ ẩn mà không sinh ra gì là thứ làm người dùng tưởng máy chưa nhận
 * cú chạm, rồi giữ lại lần nữa, lâu hơn. Ba câu cho ba ca khác nhau, vì ba ca
 * ấy dẫn tới ba việc khác nhau người dùng nên làm tiếp.
 */
function baoKhongCoGiDeSap(mocId, laCon, tatCa) {
  const ten = tenNguoi(mocId);

  if (tatCa.length === 0) {
    moHopBao('Chưa có hàng nào để sắp',
      laCon
        ? ten + ' chưa đứng trong cặp vợ chồng nào, nên chưa có người con nào ' +
          'để sắp thứ tự.'
        : ten + ' chưa nối với cha mẹ nào, nên chưa có hàng anh chị em nào để ' +
          'sắp thứ tự. Muốn nối thì bấm nút ⓘ ở góc dưới phải rồi chọn ' +
          '"+ Cha mẹ".', false);
    return;
  }

  const dong = tatCa.map((u) =>
    'Cặp ' + keTenPartner(u.id) + ' (' + u.id + ') mới có ' + soConConLai(u) +
    ' người con trong gia phả.');

  moHopBao('Chỉ có một mình, không có thứ tự nào để sắp',
    laCon
      ? ten + ' mới có một người con, nên chưa có thứ tự nào để sắp. Thêm con ' +
        'thì bấm nút ⓘ rồi chọn "+ Con".'
      : ten + ' là con một, nên không có ai để đứng trước hay đứng sau. Thứ tự ' +
        'anh chị em chỉ sắp được khi cặp cha mẹ có từ hai người con trở lên.',
    false, dong);
}

/** Số người con của một cặp mà HIỆN CÒN trong gia phả — người trong thùng rác không tính. */
function soConConLai(u) {
  const index = state.index;
  return (Array.isArray(u && u.children) ? u.children : [])
    .filter((c) => c && c.personId && index && index.personById.has(c.personId))
    .length;
}

/**
 * Thứ tự ĐANG HIỆN TRÊN SƠ ĐỒ của các con trong một cặp.
 *
 * ⚠ Sắp theo `order` rồi mới lấy mã, KHÔNG đọc thẳng thứ tự của mảng —
 * `layout.js` dòng "children.sort((a,b) => a.order - b.order)" mới là thứ quyết
 * định ai đứng trái ai đứng phải. Hai thứ ấy lệch nhau thì hộp này bày ra một
 * hàng khác với hàng người dùng vừa nhìn thấy, và mọi cú kéo đều thành sai chỗ.
 *
 * ⚠ Và nó lấy CẢ người trong thùng rác — xem quyết định 5 ở đầu mục.
 */
function thuTuDangCo(u) {
  return (Array.isArray(u && u.children) ? u.children : [])
    .filter((c) => c && c.personId)
    .slice()
    .sort((a, b) => (soThuTuCon(a) - soThuTuCon(b)) || (a.personId < b.personId ? -1 : 1))
    .map((c) => c.personId);
}

/** Giống hệt `soOrder()` trong `domains/union.js` — thiếu `order` thì xếp cuối. */
function soThuTuCon(c) {
  const n = Number(c && c.order);
  return Number.isFinite(n) ? n : 9999;
}

function moManSap(unionId, mocId, laCon, xuLy) {
  const u = timCapTrongCay(unionId);
  if (!u) return;

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'sapThuTu';
  sapCtx    = { unionId, mocId, laCon, thuTu: thuTuDangCo(u) };

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-sap-thu-tu';   // mốc cho bài kiểm hành vi
  hop.style.cssText = KIEU_HOP;

  const t = document.createElement('div');
  t.textContent = laCon ? 'Sắp thứ tự các con' : 'Sắp thứ tự anh chị em';
  t.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = 'Con của ' + keTenPartner(unionId) + '  ·  ' + unionId;
  phu.style.cssText =
    'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  const chiDan = document.createElement('div');
  chiDan.textContent =
    'Số 1 là anh/chị cả, số cuối cùng là em út. Kéo một thẻ sang chỗ khác, ' +
    'hoặc bấm ◀ ▶ để dịch từng nấc. Chưa có gì được ghi cho tới lúc bấm Xong.';
  chiDan.style.cssText = 'margin-top:12px;font-size:12px;line-height:1.5;color:#8a8078';

  sapDay = document.createElement('div');
  sapDay.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
  sapDay.addEventListener('pointermove',   keoDi);
  sapDay.addEventListener('pointerup',     keoLen);
  sapDay.addEventListener('pointercancel', keoLen);

  hop.append(t, phu, chiDan, sapDay);
  veDayCon();

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const hangPhu = document.createElement('div');
  hangPhu.style.cssText = 'margin-top:14px';
  // Nhãn là "Xếp theo tuổi", KHÔNG phải "Xếp thử theo tuổi" (chủ dự án chốt
  // 21/08/2026). Bản đầu nhét chữ *thử* lên mặt nút để nói trước rằng nó không
  // ghi ngay; chữ ấy làm nhãn dài ra mà việc cảnh báo thì đã có hai thứ khác
  // gánh, cả hai đều rõ hơn: nút *Xong* nằm ngay dưới, và câu nhắc hiện ra
  // NGAY SAU cú bấm nói thẳng "bấm Xong mới ghi".
  hangPhu.append(nutChon('Xếp theo tuổi', false, sapTheoTuoi));
  hop.append(hangPhu);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
  N.nutLuu = nutChanDam('Xong', () => handleSaveThuTu());
  if (canTro) { N.nutLuu.disabled = true; N.nutLuu.style.opacity = '.45'; }
  chan.append(N.nutLuu, nutChanXoa('Huỷ', false, () => closePersonForm()));
  hop.append(chan);

  // Bấm ra ngoài KHÔNG đóng — cùng lý do với form: hộp đang giữ một thứ tự
  // người dùng vừa sắp bằng tay mà chưa lưu.
  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

/** Vẽ lại toàn bộ dãy thẻ từ `sapCtx.thuTu`. Rẻ: một cặp hiếm khi quá mười con. */
function veDayCon() {
  if (!sapDay || !sapCtx) return;
  sapDay.innerHTML = '';
  sapCtx.thuTu.forEach((id, i) => sapDay.append(veTheCon(id, i)));
}

/**
 * Một thẻ con: SỐ THỨ TỰ · ảnh tròn · tên · năm sinh · hai nút ◀ ▶.
 *
 * ⚠ `touch-action:none` đặt trên THẺ, không đặt trên cả dãy: đặt trên dãy thì
 * hộp hết cuộn dọc được bằng ngón tay, mà hàng chín người con thì thẻ đã đẩy
 * nút *Xong* xuống dưới mép màn hình.
 */
function veTheCon(id, i) {
  const p = timNguoiTrongCay(id);
  const conTrong = !!(state.index && state.index.personById.has(id));
  const dangKeo  = !!(sapKeo && sapKeo.tu === i);

  const the = document.createElement('div');
  the.dataset.ma    = id;          // mốc cho bài kiểm hành vi
  the.dataset.viTri = String(i);
  the.style.cssText =
    'flex:0 0 78px;box-sizing:border-box;padding:6px 4px 5px;border-radius:10px;' +
    'display:flex;flex-direction:column;align-items:center;gap:2px;' +
    'touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;' +
    (id === sapCtx.mocId
      ? 'background:#fdf6ec;border:1.5px solid #c07a3e;'
      : 'background:#fff;border:1px solid #e6e0d8;') +
    (conTrong ? '' : 'opacity:.45;') +
    (dangKeo ? 'opacity:.4;' : '');

  const so = document.createElement('div');
  so.textContent = String(i + 1);
  so.style.cssText =
    'font-size:11px;font-weight:600;color:#8a8078;line-height:1';
  the.append(so);

  const tron = document.createElement('div');
  tron.style.cssText =
    'width:38px;height:38px;border-radius:50%;overflow:hidden;' +
    'box-shadow:0 0 0 2px #ffffff, 0 0 0 3px ' + mauVien(p) + '66';
  const im = document.createElement('img');
  im.src = anhMacDinhUri(p && p.sex, mauVien(p));
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  tron.append(im);
  const anhThat = p && typeof p.photoFileId === 'string' ? p.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, 120);
    const thu = new Image();
    thu.onload = () => { if (thu.naturalWidth > 0) im.src = duong; };
    thu.src = duong;
  }
  the.append(tron);

  const ten = document.createElement('div');
  ten.textContent = p ? (fullName(p) || id) : id;
  ten.style.cssText =
    'font-size:11px;line-height:1.25;text-align:center;color:#2a2622;' +
    'word-break:break-word';
  the.append(ten);

  const phu = conTrong ? namSinhNgan(p) : 'trong thùng rác';
  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText = 'font-size:10px;line-height:1.2;color:#8a8078;text-align:center';
    the.append(d);
  }

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:3px;margin-top:3px';
  hang.append(nutDich('◀', 'trai', i > 0, () => dichCho(i, -1)));
  hang.append(nutDich('▶', 'phai', i < sapCtx.thuTu.length - 1, () => dichCho(i, 1)));
  the.append(hang);

  the.addEventListener('pointerdown', (e) => keoXuong(e, i));
  return the;
}

function nutDich(chu, huong, bat, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = chu;
  nut.dataset.dich = huong;        // mốc cho bài kiểm hành vi
  nut.disabled = !bat;
  nut.style.cssText =
    'width:30px;height:26px;padding:0;font-size:11px;font-family:inherit;' +
    'border-radius:6px;border:1px solid #e6e0d8;background:#faf8f5;color:#2a2622;' +
    'touch-action:manipulation;' +
    'cursor:' + (bat ? 'pointer' : 'not-allowed') + ';opacity:' + (bat ? '1' : '.35') + ';';
  if (bat) nut.addEventListener('click', chay);
  return nut;
}

/** Năm sinh, ngắn gọn — thẻ rộng 78px không chứa nổi cả dòng đời sống. */
function namSinhNgan(p) {
  const moc = p ? mocNgay(p.birth) : null;
  return (moc && Number.isFinite(Number(moc.nam))) ? String(moc.nam) : '';
}

// --- Kéo thẻ -------------------------------------------------------------
//
// Bắt con trỏ trên CẢ DÃY chứ không trên thẻ: mỗi lần đổi chỗ là `veDayCon()`
// dựng lại toàn bộ thẻ, nên cái thẻ đang bị kéo biến mất giữa chừng và mọi sự
// kiện sau đó rơi vào hư không. Dãy thì sống suốt cú kéo.

function keoXuong(e, i) {
  // Hai nút ◀ ▶ nằm ngay trong thẻ. Không chừa chúng ra thì mỗi cú bấm nút
  // cũng mở đầu một cú kéo, và thẻ nhảy hai nấc thay vì một.
  if (e.target && e.target.closest && e.target.closest('button')) return;
  if (!sapCtx || sapCtx.thuTu.length < 2) return;

  sapKeo = { tu: i };
  try { sapDay.setPointerCapture(e.pointerId); } catch (loi) { /* trình duyệt cũ */ }
  veDayCon();
  e.preventDefault();
}

function keoDi(e) {
  if (!sapKeo || !sapCtx) return;
  const den = theGanNhat(e.clientX, e.clientY);
  if (den < 0 || den === sapKeo.tu) return;

  const ds = sapCtx.thuTu;
  ds.splice(den, 0, ds.splice(sapKeo.tu, 1)[0]);
  sapKeo.tu = den;
  veDayCon();
}

function keoLen(e) {
  if (!sapKeo) return;
  sapKeo = null;
  try { sapDay.releasePointerCapture(e.pointerId); } catch (loi) { /* đã nhả rồi */ }
  veDayCon();
}

/**
 * Thẻ có TÂM gần con trỏ nhất. Đo bằng khoảng cách hai chiều chứ không chỉ đo
 * bề ngang, vì dãy thẻ XUỐNG DÒNG — kéo xuống dòng dưới cũng phải đổi chỗ được.
 */
function theGanNhat(x, y) {
  if (!sapDay) return -1;
  let tot = -1;
  let gan = Infinity;
  const cac = sapDay.children;
  for (let i = 0; i < cac.length; i += 1) {
    const r = cac[i].getBoundingClientRect();
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (d < gan) { gan = d; tot = i; }
  }
  return tot;
}

function dichCho(i, buoc) {
  if (!sapCtx) return;
  const j = i + buoc;
  if (j < 0 || j >= sapCtx.thuTu.length) return;
  const ds = sapCtx.thuTu;
  const tam = ds[i]; ds[i] = ds[j]; ds[j] = tam;
  veDayCon();
}

/**
 * Xếp lại các thẻ theo tuổi. KHÔNG ghi gì — chỉ đổi chỗ các thẻ trong hộp,
 * phải bấm *Xong* mới xuống Drive.
 *
 * ⚠ `thuTuConTheoTuoi()` đọc thứ tự ĐANG LƯU trong `state.tree`, không đọc dãy
 * thẻ đang bày ra. Nên bấm nút này sau khi đã kéo tay là **bỏ hết những gì vừa
 * kéo**. App nói thẳng điều ấy ra thay vì để người dùng tự phát hiện.
 */
function sapTheoTuoi() {
  if (!sapCtx) return;

  const kq = thuTuConTheoTuoi(state.tree, sapCtx.unionId);
  if (!kq) {
    hienNhan('Chưa xếp theo tuổi được: cặp này có chưa tới hai người con còn ' +
             'ghi năm sinh. Kéo tay hoặc bấm ◀ ▶ để sắp.', false);
    return;
  }
  if (kq.hopLe) {
    hienNhan('Thứ tự đang LƯU đã đúng theo tuổi rồi, nên phép này không đổi ' +
             'được chỗ nào.', false);
    return;
  }

  sapCtx.thuTu = kq.thuTuMoi.slice();
  veDayCon();
  hienNhan('Đã xếp thử theo tuổi. Người thiếu năm sinh giữ nguyên chỗ cũ. ' +
           'Phép này tính từ thứ tự ĐANG LƯU nên nó bỏ qua những gì bạn vừa ' +
           'kéo bằng tay. Xem lại rồi bấm Xong mới ghi.', false);
}

/**
 * Ghi thứ tự mới. Một lần `luuCay()`, mang đúng một bản ghi cặp.
 *
 * Không chạy `validateAll` — xem quyết định 6 ở đầu mục.
 */
async function handleSaveThuTu() {
  if (N.dangLuu || !sapCtx) return;

  const unionId = sapCtx.unionId;
  const cu = timCapTrongCay(unionId);
  if (!cu) {
    hienNhan('Không tìm thấy cặp này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }

  if (thuTuDangCo(cu).join('|') === sapCtx.thuTu.join('|')) {
    hienNhan('Chưa đổi chỗ ai cả, nên không có gì để lưu.', false);
    return;
  }

  const kq = reorderChildren(state.tree, unionId, sapCtx.thuTu);
  if (!kq) {
    hienNhan('Không ghi được thứ tự này — danh sách người con vừa đổi ở nơi ' +
             'khác. Tải lại trang rồi sắp lại.', true);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang lưu…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'update',
    target: unionId,
    note:   'Sắp lại thứ tự anh chị em trong cặp ' + keTenPartner(unionId) + '.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;   // người dùng đã đóng hộp trong lúc chờ máy chủ

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Thứ tự anh chị em VẪN như cũ.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(unionId);
  closePersonForm();
}
