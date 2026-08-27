// ============================================================
// giapha · js/pages/form-gia-dinh.js
// Vai trò  : MÀN HÌNH SỬA THÔNG TIN GIA ĐÌNH — mọi quan hệ của một người trên
//            MỘT màn, kèm đổi người trong cặp và trạng thái *"cặp này bây giờ"*
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/{person-edit,form-sua-con,form-go-noi}.js, state,
//            domains/{union,validate}, services/repo, utils/{graph,text}, config
// Phiên bản: 1.1.0 · Cập nhật: 27/08/2026 22:30
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 4 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào.
//
// ⚠ `maTrangThaiCap()` KHÔNG dời theo dù nó được viết ra ở đây: khối *Quan hệ*
// của form hồ sơ cũng đọc nó, nên nó ở lại nền — cùng lý do với `thuTuCon()`.

import { N, KIEU_O, KIEU_LOP_PHU, KIEU_HOP, closePersonForm, canTroLuu,
         ghiBanGhi, hienNhan, hienLoiGhi, keTenPartner, tenNguoi, thuTuCon,
         maTrangThaiCap, moHopTrang, moHopChon, moHopBao, gaiTruocChan,
         nutChon, nutChanXoa, gopRaSoat, khoiHoiThuBac, docThuBacNhap,
         loiThuBacGoSai } from './person-edit.js';
import { moHopViecCon } from './form-sua-con.js';
import { unlink } from './form-go-noi.js';
import { state } from '../state.js';
import { addPartner, removePartner, updateUnion,
         getParentUnions, getPartnerUnions } from '../domains/union.js';
import { validateAll, checkOrphanNode, checkNoAncestorCycle,
         checkParentAge } from '../domains/validate.js';
import { suaDuoc } from '../services/repo.js';
import { buildIndex } from '../utils/graph.js';
import { fullName, coGiaTri, removeDiacritics, doiSongNguoi } from '../utils/text.js';
import { nhanQuanHeCon, chuThichQuanHe, TRANG_THAI_CAP,
         nhanTrangThaiCap } from '../config.js';

let giaDinhCua = null;   // chế độ giaDinh  : màn hình đang mở của AI
let doiHT      = null;   // chế độ doiNguoi : kết quả doHauQuaDoiNguoi() của lần mở này

/** `closePersonForm()` gọi hàm này — xem `form-sap-thu-tu.js`. */
export function donDepGiaDinh() {
  giaDinhCua = null;
  doiHT      = null;
}

// ============================================================
// SỬA THÔNG TIN GIA ĐÌNH — một màn hình cho MỌI quan hệ của một người
// ============================================================
//
// Chủ dự án, 22/08/2026, sau khi dùng thử: *"hiện tại rất khó sử dụng"*. Đường
// sửa quan hệ trước hôm nay là *thẻ người → Các việc khác → vòng tròn → Kết nối
// / Gỡ nối*, mà hai mục cuối lại hỏi từ phía MỘT CON NGƯỜI chứ không từ phía
// gia đình. Bốn cú chạm để tới, rồi vẫn phải tự dựng lại trong đầu xem người ấy
// đang đứng ở những nhà nào.
//
// Màn hình này trả lời đúng một câu: ***người này đứng ở những gia đình nào, và
// mỗi nhà có những ai?*** — rồi cho sửa ngay tại đó.
//
// --- BẢY quyết định --------------------------------------------------------
//
// 1. **HIỆN HẾT TRÊN MỘT MÀN, KHÔNG HỎI "GIA ĐÌNH NÀO" TRƯỚC** (chủ dự án chọn
//    22/08/2026). Mọi cặp người ấy dính tới đổ ra thành từng khối, cuộn xuống
//    sửa từng cái. Hỏi trước thì người dùng phải biết mình muốn sửa nhà nào
//    *trước khi* nhìn thấy các nhà — mà phần lớn lần mở màn hình này là để
//    nhìn cho ra chỗ đang sai.
//
// 2. **CHA/MẸ VÀ VỢ/CHỒNG LÀ CÙNG MỘT THAO TÁC.** Cả hai đều là `partners` của
//    một cặp; khác nhau chỉ ở chỗ ta nhìn cặp ấy từ phía nào — từ phía người
//    CON thì hàng ấy đọc là *cha/mẹ*, từ phía người VỢ thì đọc là *chồng*. Nhờ
//    thế cả màn hình này chỉ cần MỘT bộ quy tắc (`xetNguoiVaoCap`) chứ không
//    phải hai bộ trôi lệch nhau.
//
// 3. **KHÔNG CÓ NÚT LƯU.** Mỗi việc tự đi xuống Drive ngay, có hộp xác nhận kể
//    hậu quả của riêng nó. Gom năm việc vào một nút Lưu thì hộp hậu quả phải kể
//    năm chuyện chồng lên nhau — và một cái cặp có thể vừa được thêm người vừa
//    hết lý do tồn tại trong cùng một lượt. Đây là màn hình ĐIỀU HƯỚNG, không
//    phải một cái form.
//
// 4. **CẢ DÒNG LÀ MỘT ĐÍCH CHẠM**, mở ra một hộp vài việc — không nhét nút
//    *[đổi]* vào cạnh cái tên. Hai đích chạm sát nhau trong một dòng cao 44px
//    là mời bấm nhầm; luật đã chốt ở `pages/person-list.js`, nhắc lại ở
//    `nutXemGiaDinh` và ở khối *Sửa một người con*.
//
// 5. **HÀNG CON GỌI THẲNG VÀO `moHopViecCon`** của nửa sau việc 8, không viết
//    lại. Ở đó đã có đủ đổi quan hệ · chuyển sang nhà khác · gỡ khỏi cặp.
//
// 6. **CHẶN CÁI KHÔNG THỂ, CẢNH BÁO CÁI LẠ** (chủ dự án chọn 22/08/2026). Danh
//    sách chọn người hiện ĐỦ MỌI NGƯỜI, kèm dấu ⛔ hoặc ⚠ ngay trên dòng. Lọc
//    sẵn cho khuất mắt thì người dùng chỉ thấy người mình cần biến mất khỏi
//    danh sách mà không hiểu vì sao — mất luôn cái dòng chữ giải thích.
//
// 7. **MÀN HÌNH NÀY NÓI LUÔN CẶP ẤY BÂY GIỜ THẾ NÀO** (chủ dự án yêu cầu
//    27/08/2026). Đang là vợ chồng hay đã ly hôn là một điều thuộc về chính
//    cái gia đình đang bày ra trước mắt, mà trước hôm nay nó chỉ sửa được ở
//    form Sửa cặp và ở khối Quan hệ của form hồ sơ — hai cửa nằm SAU màn hình
//    này. Chi tiết ở mục *TRẠNG THÁI CỦA CẶP* dưới đây.

/**
 * Mở màn hình *Sửa thông tin gia đình* của một người.
 *
 * @param {string} personId
 * @param {{onDaLuu?:function(string), onThemCon?:function(string),
 *          onKetNoi?:function(string), onSuaNguoi?:function(string),
 *          onChonNguoi?:function(string), onXemCap?:function(string)}} [xuLy]
 *        `onXemCap` — mở THẺ GIA ĐÌNH của một cặp. Từ 22/08/2026 đây là cửa
 *        DUY NHẤT đi thường ngày tới ngày cưới · ảnh cưới · ghi chú của cặp, và
 *        tới màn hình *Sắp thứ tự các con*: hai nút cũ trên thẻ NGƯỜI đã gỡ đi
 *        vì chúng nói lại đúng những điều màn hình này nói.
 */
export function openFamilyForm(personId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'giaDinh';
  giaDinhCua = personId;

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-gia-dinh';   // mốc cho bài kiểm hành vi
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Sửa thông tin gia đình';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = tenNguoi(personId) + '  ·  ' + personId;
  phu.style.cssText =
    'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  hop.append(tieuDe, phu);

  const capChaMe = getParentUnions(index, personId);
  const capVo    = getPartnerUnions(index, personId);

  for (const u of capChaMe) hop.append(veKhoiChaMe(u, personId, xuLy));
  for (const u of capVo)    hop.append(veKhoiVoChong(u, personId, xuLy));

  if (capChaMe.length === 0) hop.append(veKhoiChuaCoChaMe(personId, xuLy));
  if (capVo.length === 0)    hop.append(veKhoiChuaCoVoChong(personId, xuLy));

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  chan.append(nutChon('Xong', true, () => closePersonForm()));
  hop.append(chan);

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

/** Mở lại chính màn hình này sau khi một việc con vừa ghi xong. */
function moLaiFormGiaDinh(personId, xuLy) {
  closePersonForm();
  openFamilyForm(personId, xuLy);
}

// --- Các khối của màn hình ----------------------------------------------

function veNhanKhoiGD(chu, phu) {
  const nhan = document.createElement('div');
  nhan.style.cssText =
    'margin-top:18px;margin-bottom:6px;padding-bottom:4px;' +
    'border-bottom:1px solid #f0ebe4';

  const t = document.createElement('div');
  t.textContent = chu;
  t.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078';
  nhan.append(t);

  if (coGiaTri(phu)) {
    const d = document.createElement('div');
    d.textContent = phu;
    d.style.cssText = 'font-size:11px;color:#b3aaa0;margin-top:2px';
    nhan.append(d);
  }
  return nhan;
}

/**
 * Một dòng người trong màn hình này. CẢ DÒNG là một đích chạm — quyết định 4.
 *
 * @param {string} vai   chữ đứng trước tên: 'Cha' · 'Vợ' · 'Con'…
 * @param {string} id    mã người, hoặc rỗng khi đây là một CHỖ TRỐNG
 * @param {string} [chuChinh]  đè lên dòng chữ lớn, thay cho tên người.
 *        Dùng cho hàng *Quan hệ*: ở đó `id` là CHÍNH CHỦ của màn hình, mà tên
 *        họ đã nằm ngay trên đầu — in lại lần nữa là ba dòng để nói một chữ
 *        (thấy trên ảnh `fg-1.png`). `id` vẫn phải truyền vào vì dòng ấy cần
 *        biết bấm vào thì mở việc của AI.
 */
function veDongNguoi(vai, id, ghiChu, chay, chuChinh) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.vai = vai;
  nut.dataset.nguoi = id || '';
  nut.style.cssText =
    'display:flex;gap:10px;align-items:baseline;width:100%;text-align:left;' +
    'padding:9px 11px;margin-top:6px;font-family:inherit;font-size:14px;' +
    'border-radius:8px;cursor:pointer;touch-action:manipulation;' +
    // Viền GẠCH ĐỨT chỉ dành cho một CHỖ TRỐNG. Dòng có `chuChinh` nói một
    // điều gia phả ĐANG GHI (*"Đã ly hôn"*) mà không phải một con người, nên
    // nó cũng phải có viền liền — không thì một sự thật đã chép trông y hệt
    // một chỗ chưa ai điền.
    (id || coGiaTri(chuChinh)
      ? 'color:#2a2622;border:1px solid #e6e0d8;background:#fff'
      : 'color:#8a8078;border:1px dashed #e6e0d8;background:none');

  const nhan = document.createElement('span');
  nhan.textContent = vai;
  nhan.style.cssText =
    'flex:0 0 78px;font-size:12px;line-height:1.35;color:#8a8078;letter-spacing:.03em';
  nut.append(nhan);

  const cot = document.createElement('span');
  cot.style.cssText = 'flex:1 1 auto;min-width:0';

  const ten = document.createElement('span');
  ten.style.cssText = 'display:block';
  ten.textContent = coGiaTri(chuChinh) ? chuChinh
    : (id ? tenNguoi(id) : '(chưa có — bấm để chọn)');
  cot.append(ten);

  if (coGiaTri(ghiChu)) {
    const d = document.createElement('span');
    d.textContent = ghiChu;
    d.style.cssText = 'display:block;font-size:12px;color:#8a8078;margin-top:2px';
    cot.append(d);
  }

  nut.append(cot);
  nut.addEventListener('click', chay);
  return nut;
}

/** Nút gạch đứt một dòng, dùng cho *thêm con* và *chọn cha mẹ*. */
function nutGachDut(chu, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:9px 11px;margin-top:6px;' +
    'font-family:inherit;font-size:13px;color:#8a8078;border:1px dashed #e6e0d8;' +
    'border-radius:8px;background:none;cursor:pointer;touch-action:manipulation';
  nut.textContent = chu;
  nut.addEventListener('click', chay);
  return nut;
}

/**
 * Khối *LÀ CON của* — một cặp cha mẹ của người đang xem.
 *
 * ⚠ Người đang xem KHÔNG có mặt trong khối này với tư cách con: họ là chủ của
 * cả màn hình, tên họ đã nằm ở đầu. Nhưng ANH CHỊ EM thì có — nhìn ra mình
 * đứng thứ mấy trong nhà là một nửa lý do người ta mở màn hình này.
 */
function veKhoiChaMe(u, personId, xuLy) {
  const index = state.index;
  const boc = document.createElement('div');

  const cacChaMe = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && index.personById.has(id));

  boc.append(veNhanKhoiGD('LÀ CON của', keTenPartner(u.id) + '  ·  ' + u.id));

  for (const id of cacChaMe) {
    boc.append(veDongNguoi(vaiChaMe(id), id, doiSongNguoi(index.personById.get(id)),
      () => moHopViecNguoiTrongCap(u.id, id, personId, xuLy)));
  }

  // Chỗ trống: cặp cha mẹ mới có một người.
  if (cacChaMe.length < 2) {
    boc.append(veDongNguoi(vaiConThieu(cacChaMe), '', '',
      () => moHopChonNguoiVaoCap(u.id, '', personId, xuLy)));
  }

  // Cha mẹ còn là vợ chồng, hay đã ly hôn — quyết định 7.
  boc.append(...veDongTrangThai(u, personId, xuLy));

  // Quan hệ của CHÍNH người đang xem với cặp cha mẹ này.
  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === personId);
  const qh = (muc && muc.relation) || 'birth';
  boc.append(veDongNguoi('Quan hệ', personId, '',
    () => moHopViecCon(u.id, personId, xuLyCon(personId, xuLy)),
    nhanQuanHeCon(qh, 'con')));

  // Anh chị em — đọc được, bấm được, nhưng KHÔNG lẫn vào hàng cha mẹ.
  const anhEm = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && c.personId !== personId &&
                   index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  for (const c of anhEm) {
    boc.append(veDongNguoi('Anh / em', c.personId,
      [chuThichQuanHe(c.relation || 'birth', 'con'),
       doiSongNguoi(index.personById.get(c.personId))].filter(coGiaTri).join('  ·  '),
      () => moHopViecCon(u.id, c.personId, xuLyCon(personId, xuLy))));
  }

  boc.append(...nutTheCap(u, xuLy));
  return boc;
}

/** Khối *LÀ VỢ / CHỒNG* — một gia đình mà chính người đang xem lập ra. */
function veKhoiVoChong(u, personId, xuLy) {
  const index = state.index;
  const boc = document.createElement('div');

  const kia = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== personId && index.personById.has(id));

  boc.append(veNhanKhoiGD('LÀ ' + vaiCuaMinh(personId).toUpperCase() + ' trong',
                          keTenPartner(u.id) + '  ·  ' + u.id));

  for (const id of kia) {
    boc.append(veDongNguoi(vaiBanDoi(id), id, doiSongNguoi(index.personById.get(id)),
      () => moHopViecNguoiTrongCap(u.id, id, personId, xuLy)));
  }

  if (kia.length === 0) {
    boc.append(veDongNguoi(vaiBanDoiThieu(personId), '', '',
      () => moHopChonNguoiVaoCap(u.id, '', personId, xuLy)));
  }

  // Đang là vợ chồng, hay đã ly hôn — quyết định 7.
  boc.append(...veDongTrangThai(u, personId, xuLy));

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  for (const c of cacCon) {
    boc.append(veDongNguoi('Con', c.personId,
      [chuThichQuanHe(c.relation || 'birth', 'con'),
       doiSongNguoi(index.personById.get(c.personId))].filter(coGiaTri).join('  ·  '),
      () => moHopViecCon(u.id, c.personId, xuLyCon(personId, xuLy))));
  }

  if (suaDuoc() && xuLy.onThemCon) {
    boc.append(nutGachDut('+ Thêm một người con vào gia đình này',
      () => { closePersonForm(); xuLy.onThemCon(u.id); }));
  }

  boc.append(...nutTheCap(u, xuLy));
  return boc;
}

/**
 * Cửa sang THẺ GIA ĐÌNH của một cặp — nơi có ngày cưới, ảnh cưới, ghi chú, và
 * nút *Sắp thứ tự các con*.
 *
 * ⚠ **Nút này gánh HAI đường vừa gỡ khỏi thẻ người** (22/08/2026), nên nó
 * KHÔNG được biến mất khi thiếu quyền sửa: thẻ gia đình là màn hình ĐỌC, và
 * ngày cưới là thứ người chỉ có quyền xem vẫn phải xem được.
 *
 * ⚠ Và nó là cửa nhìn thấy được của cử chỉ CHẠM GIỮ trên ô sơ đồ (luật chat
 * 1.6). Bỏ nó đi là để *Sắp thứ tự các con* chỉ còn tới được bằng một cử chỉ
 * mà không chỗ nào trên màn hình nói ra rằng nó tồn tại.
 *
 * @returns {HTMLElement[]} rỗng khi nơi gọi không nhận việc này — không mọc ra
 *          nút chết nào.
 */
function nutTheCap(u, xuLy) {
  if (!xuLy || !xuLy.onXemCap) return [];

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && state.index.personById.has(c.personId)).length;

  return [nutGachDut(
    soCon >= 2
      ? 'Ngày cưới · ảnh cưới · sắp thứ tự các con →'
      : 'Ngày cưới · ảnh cưới · ghi chú của gia đình này →',
    () => { closePersonForm(); xuLy.onXemCap(u.id); })];
}

// --- TRẠNG THÁI CỦA CẶP: đang là vợ chồng, hay đã ly hôn -----------------
//
// Quyết định 7 (27/08/2026, chủ dự án yêu cầu). Trước hôm nay câu ấy chỉ SỬA
// được ở hai chỗ — form Sửa cặp và khối Quan hệ của form hồ sơ — mà màn hình
// người ta thật sự mở ra để nhìn một gia đình lại không nói lấy một chữ. Mở
// màn hình gia đình rồi vẫn phải đi tiếp hai cửa nữa mới sửa nổi một điều
// thuộc về chính cái gia đình đang bày ra trước mắt.
//
// ⚠ **HÀNG NÀY ĐỌC ĐƯỢC TRƯỚC, SỬA ĐƯỢC SAU.** Ly hôn là thứ nhìn một cái là
// phải thấy — nó đổi nghĩa của cả khối, kể cả với người chỉ có quyền xem. Nên
// hàng vẫn hiện đủ cho mọi người; thiếu quyền sửa thì bấm vào nghe app nói ra
// điều đó, chứ hàng không biến mất.
//
// ⚠ **CẶP MỘT NGƯỜI THÌ KHÔNG HỎI.** `U0024` là ca thật — một người cha nhận
// con nuôi, không có vợ trong gia phả. *"Đang là vợ chồng"* với ai? Một cái
// nhãn không có nghĩa nằm giữa màn hình còn tệ hơn không có nhãn nào.
//
// ⚠ **GHI THẲNG, KHÔNG QUA HỘP XÁC NHẬN** — cùng lối với `chayDoiQuanHe`: việc
// này đổi MỘT chữ trong một mục đã có, không thêm không bớt ai, và chọn lại mã
// cũ là lùi được. Ly hôn KHÔNG gỡ ai ra khỏi cặp, nên không có hậu quả nào để
// một cái hộp phải kể tên trước.

/**
 * Hàng *Tình trạng hôn nhân* của một khối gia đình.
 *
 * @returns {HTMLElement[]} rỗng khi cặp chưa đủ hai người — xem ghi chú trên.
 */
function veDongTrangThai(u, personId, xuLy) {
  const index = state.index;
  const cacNguoi = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && index.personById.has(id));
  if (cacNguoi.length < 2) return [];

  const ma   = maTrangThaiCap(u);
  const dong = veDongNguoi('Tình trạng hôn nhân', '', '',
    () => moHopTrangThaiCap(u.id, personId, xuLy), nhanTrangThaiCap(ma));
  dong.dataset.trangThai = ma;   // mốc cho bài kiểm hành vi
  dong.dataset.cap       = u.id;

  // ⚠ MÃ KHÁC 'married' THÌ IN ĐẬM — cùng bài học của `chuThichQuanHe`: một
  // chú thích chỉ có nghĩa khi nó nói điều KHÁC lệ thường. Ảnh `fg-7.png` cho
  // thấy vì sao: người có hai cặp cha mẹ và một gia đình riêng thì màn hình có
  // BA hàng *Tình trạng hôn nhân* trông y hệt nhau, và cái hàng duy nhất đáng đọc chìm
  // giữa hai hàng kia. Đậm chứ KHÔNG đỏ: đỏ trong app này nghĩa là *nguy hiểm*
  // hoặc *sai*, mà ly hôn thì chẳng phải cái nào cả.
  //
  // Chữ lớn là con đầu của cột chữ, tức con cuối của cả dòng — xem `veDongNguoi`.
  if (ma !== 'married') {
    const chuLon = dong.lastElementChild && dong.lastElementChild.firstElementChild;
    if (chuLon) chuLon.style.fontWeight = '600';
  }

  return [dong];
}

function moHopTrangThaiCap(unionId, personId, xuLy) {
  const u = state.index && state.index.unionById.get(unionId);
  if (!u) return;

  const dang   = maTrangThaiCap(u);
  const dangLa = 'Đang ghi: ' + nhanTrangThaiCap(dang) + '.';
  // ⚠ Câu này nói TRƯỚC, không phải sau: người ta bấm "Đã ly hôn" mà tưởng nó
  // gỡ hai người ra khỏi nhau thì đã bấm sai rồi mới đọc.
  const nhacLyHon =
    'Ly hôn KHÔNG gỡ ai ra khỏi cặp: hai người vẫn là cha mẹ của những người ' +
    'con đứng dưới, và sơ đồ vẫn vẽ đúng như thế.';

  if (!suaDuoc()) {
    moHopBao('Tình trạng hôn nhân', 'Bạn chỉ có quyền xem gia phả nên chưa sửa được ' +
             'gì ở đây.', false, [dangLa, nhacLyHon]);
    return;
  }

  // Tiêu đề đã là *Tình trạng hôn nhân* và phụ đề đã kể tên hai người, nên câu mở
  // KHÔNG hỏi lại "hai người ấy bây giờ thế nào" — ảnh `fg-6.png` cho thấy ba
  // khối chữ liền nhau nói cùng một điều. Câu mở nói thẳng thứ đang ghi.
  moHopChon('chon', xuLy, {
    tieuDe: 'Tình trạng hôn nhân',
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  dangLa,
    cacDong: [nhacLyHon],
    cacMuc: TRANG_THAI_CAP.map((x) => ({
      ma:  x.ma,
      chu: x.chu + (x.ma === dang ? '   ← đang ghi' : ''),
      chay: () => chayDoiTrangThai(unionId, x.ma, personId, xuLy),
    })),
  });
}

async function chayDoiTrangThai(unionId, maMoi, personId, xuLy) {
  const ten = keTenPartner(unionId);
  const kq  = updateUnion(state.tree, unionId, { status: maMoi });

  if (!kq) {
    moHopBao('Không đổi được',
             'Không tìm thấy cặp ' + unionId + ' nữa. Có thể gia phả vừa thay ' +
             'đổi trong lúc hộp đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    moHopBao('Không có gì đổi',
             ten + ' vốn đã được ghi là ' + nhanTrangThaiCap(maMoi).toLowerCase() +
             '.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Tình trạng hôn nhân', ten + '  ·  ' + unionId);

  const canTro = canTroLuu();
  if (canTro) {
    hienNhan(canTro, true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang ghi…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'update',
    target: unionId,
    note:   'Ghi cặp ' + ten + ' là ' + nhanTrangThaiCap(maMoi).toLowerCase() + '.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Cặp này VẪN như cũ.');
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  // Vẽ lại màn hình gia đình rồi mới nói — `hienNhan` viết vào `N.khoiKetQua` của
  // màn hình vừa mở lại, nên câu báo đứng ngay trên cái hàng vừa đổi.
  veLaiSauKhiGhi(personId, xuLy)(personId);
  hienNhan('Đã ghi: ' + ten + ' — ' + nhanTrangThaiCap(maMoi).toLowerCase() + '.', false);
}

function veKhoiChuaCoChaMe(personId, xuLy) {
  const boc = document.createElement('div');
  boc.append(veNhanKhoiGD('LÀ CON của', 'chưa nối với cha mẹ nào'));

  const d = document.createElement('div');
  d.textContent = tenNguoi(personId) + ' chưa có cha mẹ trong gia phả.';
  d.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
  boc.append(d);

  if (suaDuoc() && xuLy.onKetNoi) {
    boc.append(nutGachDut('+ Chọn cha mẹ cho ' + tenNguoi(personId),
      () => { closePersonForm(); xuLy.onKetNoi(personId); }));
  }
  return boc;
}

function veKhoiChuaCoVoChong(personId, xuLy) {
  const boc = document.createElement('div');
  boc.append(veNhanKhoiGD('GIA ĐÌNH RIÊNG', 'chưa lập gia đình nào'));

  const d = document.createElement('div');
  d.textContent = tenNguoi(personId) + ' chưa đứng trong cặp vợ chồng nào, nên ' +
                  'chưa có nhà riêng để ghi con cái.';
  d.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:6px';
  boc.append(d);

  if (suaDuoc() && xuLy.onKetNoi) {
    boc.append(nutGachDut('+ Chọn vợ / chồng cho ' + tenNguoi(personId),
      () => { closePersonForm(); xuLy.onKetNoi(personId); }));
  }
  return boc;
}

/**
 * Bộ xử lý truyền xuống các việc của MỘT NGƯỜI CON: ghi xong thì quay lại
 * chính màn hình này, không rơi ra sơ đồ trống.
 */
function xuLyCon(personId, xuLy) {
  return Object.assign({}, xuLy, {
    onDaLuu: (id) => {
      if (xuLy.onDaLuu) xuLy.onDaLuu(id);
      moLaiFormGiaDinh(personId, xuLy);
    },
  });
}

// --- Đọc VAI ra chữ ------------------------------------------------------
//
// ⚠ Giới tính KHÔNG rõ thì ghi cả hai vai, không đoán. Ghi bừa "Cha" cho một
// người chưa rõ giới là app tự bịa một sự thật mà gia phả không chép.

function vaiChaMe(id) {
  const p = state.index && state.index.personById.get(id);
  const s = p && p.sex;
  return s === 'M' ? 'Cha' : (s === 'F' ? 'Mẹ' : 'Cha / mẹ');
}

function vaiBanDoi(id) {
  const p = state.index && state.index.personById.get(id);
  const s = p && p.sex;
  return s === 'M' ? 'Chồng' : (s === 'F' ? 'Vợ' : 'Vợ / chồng');
}

/** Vai của CHÍNH người đang xem trong gia đình riêng của họ. */
function vaiCuaMinh(personId) {
  const p = state.index && state.index.personById.get(personId);
  const s = p && p.sex;
  return s === 'M' ? 'Chồng' : (s === 'F' ? 'Vợ' : 'Vợ / chồng');
}

/** Chỗ trống trong cặp CHA MẸ: đoán theo người đã có, không đoán theo con. */
function vaiConThieu(daCo) {
  if (daCo.length === 0) return 'Cha / mẹ';
  const p = state.index.personById.get(daCo[0]);
  const s = p && p.sex;
  return s === 'M' ? 'Mẹ' : (s === 'F' ? 'Cha' : 'Cha / mẹ');
}

/** Chỗ trống bên cạnh chính mình. */
function vaiBanDoiThieu(personId) {
  const p = state.index && state.index.personById.get(personId);
  const s = p && p.sex;
  return s === 'M' ? 'Vợ' : (s === 'F' ? 'Chồng' : 'Vợ / chồng');
}


// --- BA VIỆC với một người ở hàng vợ/chồng --------------------------------

/**
 * @param {string} unionId
 * @param {string} nguoiId   người đang đứng ở hàng ấy
 * @param {string} personId  chủ của màn hình, để quay về đúng chỗ
 */
function moHopViecNguoiTrongCap(unionId, nguoiId, personId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u || !index.personById.has(nguoiId)) return;

  const laChaMe = (Array.isArray(u.children) ? u.children : [])
    .some((c) => c && c.personId === personId);
  const vai = laChaMe ? vaiChaMe(nguoiId) : vaiBanDoi(nguoiId);

  const cacMuc = [];

  if (suaDuoc()) {
    cacMuc.push({
      ma:  'doi',
      chu: 'Đổi sang người khác',
      phu: 'Bỏ ' + tenNguoi(nguoiId) + ' ra và đưa người khác vào đúng chỗ ấy, ' +
           'trong CÙNG một lần lưu.',
      chay: () => moHopChonNguoiVaoCap(unionId, nguoiId, personId, xuLy),
    });
  }

  if (xuLy.onSuaNguoi) {
    cacMuc.push({
      ma:  'ho-so',
      chu: 'Mở hồ sơ của ' + tenNguoi(nguoiId),
      phu: 'Sửa tên, ngày sinh, ảnh — những thứ của riêng một con người.',
      chay: () => { closePersonForm(); xuLy.onSuaNguoi(nguoiId); },
    });
  }

  if (suaDuoc()) {
    const conLai = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => id && id !== nguoiId && index.personById.has(id));

    cacMuc.push({
      ma:  'bo',
      chu: 'Bỏ ' + tenNguoi(nguoiId) + ' khỏi gia đình này',
      phu: tenNguoi(nguoiId) + ' KHÔNG bị xoá khỏi gia phả — chỉ thôi đứng ở ' +
           'gia đình này.',
      nguyHiem: true,
      // Cặp còn người khác thì gỡ đúng người ấy ra khỏi hàng vợ/chồng. Cặp chỉ
      // có mình họ thì thứ mất đi là cả MỐI NỐI CHA MẸ của người đang xem —
      // luật 9, và `unlink` đã có sẵn cả hai đường.
      chay: () => (conLai.length > 0
        ? unlink(conLai[0], nguoiId, 'spouse',
                 Object.assign({}, xuLy, { unionId, onDaLuu: veLaiSauKhiGhi(personId, xuLy) }))
        : unlink(personId, '', 'parent',
                 Object.assign({}, xuLy, { unionId, onDaLuu: veLaiSauKhiGhi(personId, xuLy) }))),
    });
  }

  if (cacMuc.length === 0) {
    moHopBao(vai + ': ' + tenNguoi(nguoiId),
             'Bạn chỉ có quyền xem gia phả nên chưa sửa được gì ở đây.', false);
    return;
  }

  moHopChon('chon', xuLy, {
    tieuDe: vai + ': ' + tenNguoi(nguoiId),
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Làm gì với ' + tenNguoi(nguoiId) + ' trong gia đình này?',
    cacMuc,
  });
}

/** Ghi xong thì quay lại đúng màn hình gia đình vừa đứng, không rơi ra sơ đồ. */
function veLaiSauKhiGhi(personId, xuLy) {
  return (id) => {
    if (xuLy.onDaLuu) xuLy.onDaLuu(id);
    moLaiFormGiaDinh(personId, xuLy);
  };
}

// --- QUY TẮC: chặn cái không thể, cảnh báo cái lạ -------------------------

/**
 * Đưa `ungVienId` vào hàng vợ/chồng của cặp `unionId` thì có được không?
 *
 * @param {string} boQuaId  người sắp bị BỎ RA khỏi cặp trong cùng lượt ấy —
 *        khi đang *đổi người*. Không tính họ vào chỗ đang chiếm, nếu không thì
 *        mọi cặp đủ hai người đều báo "đã đủ hai người" và không đổi được ai.
 * @returns {{muc:'khoa'|'canhbao'|'duoc', lyDo:string[]}}
 *
 * --- Vì sao MỘT hàm cho cả cha/mẹ lẫn vợ/chồng ---------------------------
 *
 * Quyết định 2 ở đầu mục: hai vai ấy là CÙNG MỘT thao tác trên dữ liệu —
 * `addPartner` vào `union.partners`. Ai bước vào hàng vợ/chồng của một cặp thì
 * ĐỒNG THỜI thành cha/mẹ của mọi người con đang đứng dưới cặp ấy, bất kể ta gọi
 * hàng ấy là gì trên màn hình. Viết hai hàm là tới ngày một hàm được vá còn hàm
 * kia không.
 *
 * --- Vì sao KHÔNG dựng lại cây cho từng ứng viên -------------------------
 *
 * `checkNoAncestorCycle` và `checkParentAge` đều nhận `index` HIỆN TẠI cộng hai
 * mã người, và trả lời đúng câu *"nối hai người này thì sao"* — chúng được viết
 * cho đúng việc ấy (xem ghi chú của chính hai hàm). Dựng một cây mới cho mỗi
 * người trong danh sách sáu chục người là làm sáu chục lần `buildIndex` để
 * nhận về cùng một câu trả lời.
 *
 * ⚠ Phép lệch tuổi VỢ CHỒNG không có mặt ở đây, và đó là cố ý:
 * `checkSpouseAgeGap` đọc một cặp ĐÃ CÓ cả hai người, nên nó chỉ chạy được ở
 * hộp XÁC NHẬN, nơi cây đã dựng xong. Ở đó nó chạy thật — xem `doHauQuaDoiNguoi`.
 */
function xetNguoiVaoCap(unionId, ungVienId, boQuaId) {
  const index = state.index;
  const ra = { muc: 'duoc', lyDo: [] };
  const u = index && index.unionById.get(unionId);
  if (!u) return { muc: 'khoa', lyDo: ['Không tìm thấy gia đình này nữa.'] };

  const khoa    = (chu) => { ra.muc = 'khoa'; ra.lyDo.push(chu); };
  const canhBao = (chu) => { if (ra.muc !== 'khoa') ra.muc = 'canhbao'; ra.lyDo.push(chu); };

  const dangCo = (Array.isArray(u.partners) ? u.partners : [])
    .filter((id) => id && id !== boQuaId && index.personById.has(id));

  if (dangCo.indexOf(ungVienId) >= 0) {
    khoa(tenNguoi(ungVienId) + ' đã đứng sẵn trong gia đình này.');
  }
  if (dangCo.length >= 2) {
    khoa('Gia đình này đã đủ hai người. Trong gia phả này một người có nhiều ' +
         'đời vợ là NHIỀU GIA ĐÌNH, không phải một nhà ba người.');
  }

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .map((c) => c && c.personId)
    .filter((id) => id && index.personById.has(id));

  if (cacCon.indexOf(ungVienId) >= 0) {
    khoa(tenNguoi(ungVienId) + ' đang là CON của chính gia đình này — không ai ' +
         'vừa là con vừa là cha mẹ của một nhà.');
  }

  // Vào hàng vợ/chồng là ĐỒNG THỜI thành cha/mẹ của mọi người con của cặp.
  // Nên mọi phép rà cạnh cha–con phải chạy cho từng đứa.
  for (const conId of cacCon) {
    if (conId === ungVienId) continue;

    const v = checkNoAncestorCycle(index, conId, ungVienId);
    if (v && v.level === 'error') khoa(v.message);

    const t = checkParentAge(index, ungVienId, conId);
    if (t && t.level === 'error') khoa(t.message);
    else if (t && t.level === 'warning') canhBao(t.message);
  }

  return ra;
}

// --- HỘP CHỌN NGƯỜI, có ô tìm và có dấu ⛔ / ⚠ ---------------------------

/**
 * Chọn một người vào hàng vợ/chồng của một cặp.
 *
 * @param {string} nguoiCuId  rỗng = điền vào CHỖ TRỐNG; có = ĐỔI người ấy đi.
 *
 * ⚠ **Có Ô TÌM, khác mọi hộp chọn khác của file này.** Những hộp kia liệt kê
 * vài mối nối của một người — nhiều nhất là năm sáu dòng. Hộp này nhìn vào CẢ
 * GIA PHẢ, và ảnh `sc-2.png` của việc 8 đã cho thấy một danh sách sáu chục
 * dòng đọc ra sao trên màn hình điện thoại: không ai đọc, người ta cuộn đại.
 *
 * ⚠ **HIỆN ĐỦ MỌI NGƯỜI, kể cả người đang bị khoá** (chủ dự án chốt
 * 22/08/2026). Lọc cho khuất mắt thì người dùng chỉ thấy đúng người mình cần
 * biến mất khỏi danh sách, và mất luôn dòng chữ nói vì sao.
 */
function moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const chan = moHopTrang('chonNguoi', xuLy,
    nguoiCuId ? 'Đổi sang người khác' : 'Chọn người vào gia đình này',
    keTenPartner(unionId) + '  ·  ' + unionId);

  const dan = document.createElement('div');
  dan.textContent = nguoiCuId
    ? 'Ai vào thay ' + tenNguoi(nguoiCuId) + '?'
    : 'Ai đứng vào chỗ còn trống của gia đình này?';
  dan.style.cssText =
    'margin-top:14px;padding:9px 11px;font-size:12px;line-height:1.5;' +
    'border-radius:8px;color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4';
  N.khoiKetQua.append(dan);

  const nhac = document.createElement('div');
  nhac.textContent =
    '⛔ là không nối được — nối vào thì gia phả nói ra một điều không thể có ' +
    'thật. ⚠ là đáng xem lại, nhưng vẫn nối được: gia phả cũ có chuyện thật mà ' +
    'nghe như lỗi.';
  nhac.style.cssText =
    'margin-top:6px;padding:7px 10px;font-size:11px;line-height:1.5;' +
    'border-radius:8px;color:#5c554e;background:#faf8f5;border:1px solid #f0ebe4';
  N.khoiKetQua.append(nhac);

  const oTim = document.createElement('input');
  oTim.type = 'text';
  oTim.placeholder = 'Gõ tên để tìm…';
  oTim.setAttribute('aria-label', 'Tìm người');
  oTim.dataset.viec = 'tim-nguoi';
  oTim.style.cssText = KIEU_O + 'margin-top:10px';
  N.khoiKetQua.append(oTim);

  const day = document.createElement('div');
  day.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px';
  N.khoiKetQua.append(day);

  const demDong = document.createElement('div');
  demDong.style.cssText = 'font-size:11px;color:#b3aaa0;margin-top:8px';
  N.khoiKetQua.append(demDong);

  // Xét MỘT LẦN cho cả gia phả, không xét lại mỗi lần gõ một chữ: bộ quy tắc
  // không phụ thuộc vào chữ đang tìm, mà `checkNoAncestorCycle` thì có duyệt
  // đồ thị bên trong.
  const tatCa = [];
  for (const p of index.personById.values()) {
    if (!p || p.id === personId) continue;   // chính chủ màn hình
    tatCa.push({
      id:  p.id,
      ten: fullName(p),
      tim: removeDiacritics(fullName(p)).toLowerCase(),
      doi: doiSongNguoi(p),
      xet: xetNguoiVaoCap(unionId, p.id, nguoiCuId),
    });
  }
  // ⚠ **XẾP THEO TÊN, KHÔNG XẾP THEO HẠNG.** Bản đầu đẩy người bị ⛔ xuống
  // cuối danh sách cho "gọn mắt". Bài kiểm bắt được ngay: cộng với phép cắt 40
  // dòng bên dưới, người bị khoá RƠI HẲN ra khỏi tầm nhìn trên một gia phả 65
  // người — tức đúng cái "lọc cho khuất mắt" mà quyết định 6 vừa cấm, chỉ là
  // làm bằng một đường vòng. Người dùng đi tìm đúng người ấy sẽ kết luận là
  // gia phả không có họ, thay vì đọc được câu giải thích vì sao không nối được.
  //
  // Xếp theo abc thì thứ tự không nói gì về việc nối được hay không — mà đó
  // đúng là điều cái dấu ⛔ trên từng dòng phải nói, chứ không phải chỗ đứng.
  tatCa.sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));

  const veLaiDay = () => {
    day.innerHTML = '';
    const chu = removeDiacritics(oTim.value || '').toLowerCase().trim();
    const hop = chu === '' ? tatCa : tatCa.filter((m) => m.tim.indexOf(chu) >= 0);

    // ⚠ CẮT chỉ khi CHƯA GÕ GÌ. Đã gõ tên mà người mình vừa gõ vẫn bị ẩn là
    // vô lý — và số người khớp một chuỗi chữ thì luôn nhỏ.
    const CAT = chu === '' ? 40 : hop.length;

    for (const m of hop.slice(0, CAT)) day.append(veDongUngVien(m, () => {
      if (m.xet.muc === 'khoa') { moHopVaoLoi(unionId, nguoiCuId, personId, m, xuLy); return; }
      moHopXacNhanDoiNguoi(unionId, nguoiCuId, m.id, personId, xuLy);
    }));

    demDong.textContent = hop.length === 0
      ? 'Không có ai tên như thế trong gia phả.'
      : (hop.length > CAT
          ? 'Đang hiện ' + CAT + ' người đầu trong ' + hop.length +
            '. Gõ tên vào ô trên để tìm đúng người bạn cần.'
          : hop.length + ' người');
  };

  oTim.addEventListener('input', veLaiDay);
  veLaiDay();

  chan.append(nutChanXoa('Huỷ', false, () => closePersonForm()));
}

/** Một dòng ứng viên, mang sẵn dấu ⛔ hoặc ⚠ trên mặt nó. */
function veDongUngVien(m, chay) {
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.muc = m.id;
  nut.dataset.xet = m.xet.muc;
  nut.style.cssText =
    'display:block;width:100%;text-align:left;padding:10px 12px;font-family:inherit;' +
    'font-size:14px;border-radius:9px;cursor:pointer;touch-action:manipulation;' +
    (m.xet.muc === 'khoa'
      ? 'color:#8a3a2a;border:1px solid #f0d8d0;background:#fbf0ec'
      : (m.xet.muc === 'canhbao'
          ? 'color:#2a2622;border:1px solid #e8dcc4;background:#fdfaf2'
          : 'color:#2a2622;border:1px solid #e6e0d8;background:#fff'));

  const d1 = document.createElement('div');
  d1.textContent = (m.xet.muc === 'khoa' ? '⛔  ' : (m.xet.muc === 'canhbao' ? '⚠  ' : '')) + m.ten;
  nut.append(d1);

  // ⚠ **CHỈ dòng ⛔ mới in LÝ DO ra ngay trên mặt nó.** Ảnh `fg-3.png` của bản
  // đầu cho thấy vì sao: cặp U0008 có một người con sinh 2015, nên gần như MỌI
  // người sinh trước 2000 trong gia phả đều lĩnh một dấu ⚠ kèm ba dòng chữ
  // *"khoảng 111 tuổi khi sinh…"*. Nửa danh sách vàng khè. Cảnh báo mà cái gì
  // cũng cảnh báo thì người dùng học đúng một điều: bỏ qua nó.
  //
  // Dấu ⚠ vẫn còn trên dòng — nó vẫn làm được việc của nó là *chậm tay người
  // ta lại*. Còn lý do thì không mất đi đâu cả: hộp XÁC NHẬN in đủ mọi lời của
  // bộ rà soát (`doiHT.raSoat.warnings` trong `cauKeDoiNguoi`), và đó mới là
  // lúc người ta cần đọc — lúc sắp bấm nút, không phải lúc đang lướt tìm tên.
  //
  // ⛔ thì ngược lại, và giữ nguyên: những dòng ấy ít, và lý do in sẵn là thứ
  // ngăn người ta bấm vào một cái không bao giờ nối được.
  const phu = [m.doi, m.xet.muc === 'khoa' ? (m.xet.lyDo[0] || '') : '']
    .filter(coGiaTri).join('  ·  ');
  if (coGiaTri(phu)) {
    const d2 = document.createElement('div');
    d2.textContent = phu;
    d2.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px;line-height:1.4';
    nut.append(d2);
  }

  nut.addEventListener('click', chay);
  return nut;
}

/**
 * Bấm vào một người ĐANG BỊ KHOÁ. Không nối, nhưng phải nói ra vì sao.
 *
 * ⚠ Một dòng khoá vẫn BẤM ĐƯỢC, cố ý. Nút bấm vào không ăn gì cả là thứ làm
 * người ta tưởng app hỏng; còn một câu giải thích thì trả lời đúng cái điều họ
 * vừa hỏi bằng cú bấm ấy.
 */
function moHopVaoLoi(unionId, nguoiCuId, personId, m, xuLy) {
  const chan = moHopTrang('chon', xuLy, 'Không nối được',
                          m.ten + '  ·  ' + m.id);
  hienNhan('Không đưa ' + m.ten + ' vào ' + keTenPartner(unionId) + ' được:',
           true, m.xet.lyDo);
  chan.append(
    nutChanXoa('Chọn người khác', true,
               () => moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy)),
    nutChanXoa('Đóng', false, () => closePersonForm()));
}

// --- XÁC NHẬN và GHI -----------------------------------------------------

function moHopXacNhanDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy) {
  const chan = moHopTrang('doiNguoi', xuLy,
    nguoiCuId ? 'Đổi sang người khác' : 'Thêm người vào gia đình',
    tenNguoi(ungVienId) + '  ·  ' + ungVienId);

  // Luật 8: dựng cây đã đổi NGAY BÂY GIỜ, đọc hậu quả từ chính nó, rồi giữ đúng
  // bản ghi ấy để lát nữa ghi xuống.
  doiHT = doHauQuaDoiNguoi(unionId, nguoiCuId, ungVienId);

  const canTro = canTroLuu();
  if (canTro || !doiHT) {
    hienNhan(canTro || 'Không dựng được bản ghi sau khi đổi. Có thể gia phả vừa ' +
             'thay đổi. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (!doiHT.raSoat.canSave) {
    hienNhan('Chưa nối được — có chỗ không thể đúng được:', true,
             doiHT.raSoat.errors.map((x) => x.message));
    chan.append(
      nutChanXoa('Chọn người khác', true,
                 () => moHopChonNguoiVaoCap(unionId, nguoiCuId, personId, xuLy)),
      nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Đổi xong thì:', false,
           cauKeDoiNguoi(unionId, nguoiCuId, ungVienId));

  // Luật 12, cửa thứ tư. Cửa này KHÔNG nằm trong sáu chỗ gọi `createUnion` —
  // nó không tạo cặp nào, chỉ đưa một người vào hàng vợ/chồng của một cặp đã
  // có. Nhưng với NGƯỜI ẤY thì đó vẫn là một cuộc hôn nhân mới, và bỏ sót chỗ
  // này là để hở đúng cái cửa mà cả việc này sinh ra để đóng.
  gaiTruocChan(chan, khoiHoiThuBac(ungVienId, unionId));

  N.nutLuu = nutChanXoa(nguoiCuId ? 'Đổi người' : 'Thêm vào gia đình', true,
    () => chayDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy, chan));
  chan.append(N.nutLuu, nutChanXoa('Thôi', false, () => closePersonForm()));
}

/**
 * Dựng cây đã đổi, rồi đọc hậu quả bằng cách SO hai chỉ mục.
 *
 * ⚠ HAI hàm NỐI ĐUÔI: `removePartner` → `addPartner`. Chạy hàm sau trên cây CŨ
 * là mất việc của hàm trước.
 *
 * ⚠ Ở ĐÂY mới chạy `checkSpouseAgeGap` được — nó đọc một cặp đã có đủ hai
 * người, mà tới dòng này thì cây mới đã có. Hộp chọn phía trước không chạy nổi
 * phép ấy, và ghi chú của `xetNguoiVaoCap` nói rõ chỗ đó.
 */
function doHauQuaDoiNguoi(unionId, nguoiCuId, ungVienId) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu = index.unionById.get(unionId);
  if (!cu) return null;
  const banCu = JSON.parse(JSON.stringify(cu));

  let tree = state.tree;
  const diff = {};

  if (nguoiCuId) {
    const kqG = removePartner(tree, unionId, nguoiCuId);
    if (!kqG) return null;
    tree = kqG.tree;
    Object.assign(diff, kqG.diff);
  }

  const kqT = addPartner(tree, unionId, ungVienId);
  if (!kqT) return null;
  tree = kqT.tree;
  Object.assign(diff, kqT.diff);

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không đổi còn hơn đổi mù
  }

  const cacCon = (Array.isArray(banCu.children) ? banCu.children : [])
    .map((c) => c && c.personId)
    .filter((id) => id && indexMoi.personById.has(id));

  let raSoat = validateAll(tree, indexMoi, 'union', { unionId });
  for (const conId of cacCon) {
    raSoat = gopRaSoat(raSoat,
      validateAll(tree, indexMoi, 'child', { childId: conId, unionId }));
  }

  // Ai thành người đứng lẻ vì lần đổi này. Đúng MỘT bước từ cặp ấy, không phải
  // phép duyệt đồ thị nên không cần tập `visited`.
  const lienQuan = new Set([ungVienId]);
  if (nguoiCuId) lienQuan.add(nguoiCuId);
  for (const id of (Array.isArray(banCu.partners) ? banCu.partners : [])) {
    if (id) lienQuan.add(id);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  return { tree, union: kqT.union, diff, raSoat, thanhLe, cacCon };
}

/** Từng dòng hậu quả của đường ĐỔI NGƯỜI, viết cho người không lập trình đọc. */
function cauKeDoiNguoi(unionId, nguoiCuId, ungVienId) {
  const B = tenNguoi(ungVienId);
  const dong = [];

  if (nguoiCuId) {
    dong.push(tenNguoi(nguoiCuId) + ' thôi đứng trong ' + keTenPartner(unionId) +
              '  ·  ' + unionId + ', và ' + B + ' đứng vào đúng chỗ ấy. Cả hai ' +
              'bản ghi người vẫn còn nguyên, không ai bị xoá.');
  } else {
    dong.push(B + ' đứng vào chỗ còn trống của ' + keTenPartner(unionId) +
              '  ·  ' + unionId + '.');
  }

  if (doiHT.cacCon.length > 0) {
    dong.push('⚠ Gia đình này đang có ' + doiHT.cacCon.length + ' người con (' +
              doiHT.cacCon.map(tenNguoi).join(' · ') + '), nên ' + B +
              ' ĐỒNG THỜI thành cha/mẹ của họ. Trong gia phả này quan hệ cha mẹ ' +
              '– con đi QUA cặp, không nối thẳng người với người.');
    if (nguoiCuId) {
      dong.push('⚠ Và ' + tenNguoi(nguoiCuId) + ' đồng thời THÔI làm cha/mẹ của ' +
                'những người con ấy, cùng một lý do.');
    }
  }

  if (doiHT.thanhLe.length > 0) {
    dong.push('⚠ Sau việc này ' + doiHT.thanhLe.map(tenNguoi).join(' · ') +
              ' không còn nối với ai trong gia phả. Họ vẫn còn nguyên trong sổ, ' +
              'nhưng sơ đồ vẽ họ đứng lẻ một mình.');
  }

  for (const m of doiHT.raSoat.warnings) dong.push('⚠ ' + m.message);

  dong.push('Không ai bị xoá khỏi gia phả. Đổi nhầm thì đổi ngược lại.');
  return dong;
}

async function chayDoiNguoi(unionId, nguoiCuId, ungVienId, personId, xuLy, chan) {
  if (N.dangLuu || !doiHT) return;

  const B = tenNguoi(ungVienId);

  // Luật 12: ô thứ bậc gõ sai thì nói ra một lần rồi mới cho đi tiếp — cùng
  // lối *"Vẫn nối"* của `chayNoi`. Ô vẫn còn trên màn hình để sửa lại, vì nó
  // nằm ngoài `N.khoiKetQua` (xem `gaiTruocChan`).
  const loiBac = loiThuBacGoSai();
  if (loiBac.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    if (N.nutLuu) N.nutLuu.textContent = nguoiCuId ? 'Vẫn đổi' : 'Vẫn thêm';
    hienNhan('Có chỗ đáng xem lại:', false, loiBac);
    return;
  }

  // Thứ bậc ghi bằng một hàm NỐI ĐUÔI trên cây đã dựng ở hộp, chứ không dựng
  // lại từ đầu.
  //
  // ⚠ Chỗ này đi chệch luật 1 (*"thứ được rà đúng là thứ được ghi"*) một cách
  // CÓ CÂN NHẮC, và lý lẽ y hệt quyết định 6 của màn hình Sắp thứ tự: đã soát
  // `validate.js` — không luật rà nào đọc `ranks`, nên con số này không sinh ra
  // được một vi phạm mới nào để mà rà. Dựng lại cả cây rồi rà lần nữa chỉ để
  // nhận về đúng kết quả cũ.
  let banGhi = doiHT.union;
  let ghiDiff = doiHT.diff;
  const bac = docThuBacNhap();
  if (Object.keys(bac).length > 0) {
    const kqR = updateUnion(doiHT.tree, unionId, { ranks: bac });
    if (kqR) {
      banGhi  = kqR.union;
      ghiDiff = Object.assign({}, ghiDiff, kqR.diff);
    }
  }

  N.dangLuu = true;
  if (N.nutLuu) { N.nutLuu.disabled = true; N.nutLuu.style.opacity = '.45'; }
  hienNhan('Đang ghi…', false);

  const ketQua = await ghiBanGhi(null, [banGhi], {
    action: 'update',
    target: unionId,
    note:   (nguoiCuId
              ? 'Đổi ' + tenNguoi(nguoiCuId) + ' thành ' + B + ' trong cặp ' + unionId
              : 'Thêm ' + B + ' vào cặp ' + unionId) + '.',
    diff:   ghiDiff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    if (N.nutLuu) { N.nutLuu.disabled = false; N.nutLuu.style.opacity = '1'; }
    hienLoiGhi(ketQua, 'Gia đình này VẪN như cũ.');
    return;
  }

  // Dọn hẳn hàng nút đi, không chỉ bỏ tham chiếu `N.nutLuu`: nút cũ vẫn nằm trên
  // màn hình và vẫn bấm được, mà bấm lần hai là ghi lần hai một việc đã xong.
  doiHT  = null;
  N.nutLuu = null;
  chan.innerHTML = '';

  if (xuLy.onDaLuu) xuLy.onDaLuu(personId);

  hienNhan('Xong. ' + B + ' nay đứng trong ' + keTenPartner(unionId) + '.', false);
  chan.append(nutChon('Về màn hình gia đình', true,
                      () => moLaiFormGiaDinh(personId, xuLy)));
}


