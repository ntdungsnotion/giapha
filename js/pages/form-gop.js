// ============================================================
// giapha · js/pages/form-gop.js
// Vai trò  : FORM GỘP HAI CẶP TRÙNG — hỏi tay đúng những trường vênh nhau,
//            hỏi một câu về ảnh cưới, rồi gộp và ghi xuống trong MỘT lần lưu
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/person-edit.js (nền dùng chung), state,
//            domains/{union,validate,media}, utils/{graph,text}, config
// Phiên bản: 1.0.0 · Cập nhật: 27/08/2026 23:30
// ============================================================
//
// Mảnh CUỐI của việc 8 (`tai-lieu/DAC-TA-GOP_V02.md` mục 5). Ba hàm thuần
// `timCapTrung` · `timXungDotGop` · `mergeUnions` đã chạy thật từ bước 46; file
// này chỉ là CỬA của chúng — không có một luật gộp nào viết lại ở đây.
//
// --- NĂM quyết định của màn hình này -------------------------------------
//
// 1. **KHÔNG hỏi giữ cặp nào.** Luật đã chốt 23/08: cặp mang mã NHỎ HƠN được
//    giữ, cặp kia xoá mềm. Hỏi lại một câu đã có đáp án cố định là mời người
//    dùng trả lời sai.
//
// 2. **CHỈ hỏi những trường `timXungDotGop` báo là vênh THẬT.** Bên nào trống
//    thì `mergeUnions` tự lấy bên kia. Một form dựng sẵn sáu câu hỏi mà năm
//    câu có đúng một đáp án khả dĩ thì người đọc thôi đọc từ câu thứ hai.
//
// 3. **Có KHỐI XEM TRƯỚC, và nó tính bằng chính `mergeUnions`.** Người dùng
//    thấy trước cặp sau khi gộp có mấy người, mấy con, ngày cưới nào. Tính lại
//    bằng tay một bản tóm tắt "chắc là thế" là dựng bản sao thứ hai của luật
//    gộp — tới ngày một bản được sửa còn bản kia không.
//
// 4. **Ảnh cưới hỏi MỖI LẦN, mặc định là CHUYỂN.** Quyết định 3 của đặc tả cấm
//    đặt luật cố định. Mặc định chuyển vì cặp bị xoá sẽ không còn cửa nào mở
//    ra được — để nguyên là ảnh biến mất khỏi mọi màn hình.
//
// 5. **Gộp ĐI QUA đường ghi chuẩn** (`ghiBanGhi` → `repo.luuCay`), một lần lưu
//    mang cả hai cặp: cặp giữ lại đã gộp và cặp bị xoá mềm. Hai lần ghi là có
//    một khoảnh khắc gia phả mang hai cặp đúng y hệt nhau mà không cặp nào bị
//    đánh dấu — đúng cái trạng thái màn hình này sinh ra để dọn.

import { N, KIEU_NUT_CHON, KIEU_NUT_CHAN, KIEU_LOP_PHU, KIEU_HOP,
         closePersonForm, canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi,
         keTenPartner, tenNguoi, veNhan, moHopBao } from './person-edit.js';
import { state } from '../state.js';
import { timCapTrung, timXungDotGop, mergeUnions, rankCua } from '../domains/union.js';
import { validateAll } from '../domains/validate.js';
import { getMediaFor } from '../domains/media.js';
import { buildIndex } from '../utils/graph.js';
import { coGiaTri } from '../utils/text.js';
import { nhanTrangThaiCap, RONG_NUT_TOI_DA } from '../config.js';

let gopCtx = null;   // { giu, boDi, loai, chon:{}, dsAnh:[] }

/** `closePersonForm()` gọi hàm này — xem ghi chú tại `closePersonForm`. */
export function donDepGop() {
  gopCtx = null;
}

/**
 * Mở form gộp hai cặp trùng.
 *
 * @param {string} unionIdA
 * @param {string} unionIdB  thứ tự hai tham số KHÔNG quan trọng — hàm tự tra
 *        `timCapTrung` để biết cặp nào mã nhỏ hơn, và cặp mã nhỏ luôn là cặp
 *        được giữ.
 * @param {{onDaLuu?:function(string)}} [xuLy]
 */
export function openMergeForm(unionIdA, unionIdB, xuLy = {}) {
  if (!state.tree || !state.index) return;

  // Hỏi lại DOMAIN, không tin hai mã người gọi đưa sang: bản rà soát có thể đã
  // cũ vài phút, và trong khoảng ấy người dùng có thể vừa sửa tay một trong hai
  // cặp cho khác nhau đi. `mergeUnions` cũng từ chối, nhưng từ chối lúc bấm nút
  // thì người ta đã trả lời xong cả bốn câu hỏi rồi.
  const muc = timCapTrung(state.tree).find(
    (x) => (x.unionA === unionIdA && x.unionB === unionIdB) ||
           (x.unionA === unionIdB && x.unionB === unionIdA));

  if (!muc) {
    moHopBao('Hai cặp này không còn trùng nhau',
             'Có thể một trong hai cặp vừa được sửa hoặc vừa vào thùng rác. Mở ' +
             'lại Rà soát để xem bản mới nhất.', false);
    return;
  }

  const uGiu  = state.index.unionById.get(muc.unionA);
  const uBoDi = state.index.unionById.get(muc.unionB);
  if (!uGiu || !uBoDi) return;

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'gopCap';

  gopCtx = {
    giu:   muc.unionA,
    boDi:  muc.unionB,
    loai:  muc.loai,
    chon:  moTapChonMacDinh(uGiu, uBoDi),
    dsAnh: getMediaFor(state.tree, muc.unionB),
  };
  if (gopCtx.dsAnh.length > 0) gopCtx.chon.media = 'chuyen';

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.id = 'giapha-form-gop';   // mốc cho bài kiểm hành vi
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Gộp hai cặp trùng';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const phu = document.createElement('div');
  phu.textContent = gopCtx.giu + '  +  ' + gopCtx.boDi;
  phu.style.cssText =
    'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em;line-height:1.45';

  const than = document.createElement('div');
  than.id = 'giapha-gop-than';

  hop.append(tieuDe, phu, than);

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const canTro = canTroLuu();
  if (canTro) hienNhan(canTro, true);

  hop.append(veChanGop(!canTro));

  veThan(than);

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

/**
 * Lựa chọn ban đầu: MỌI câu hỏi vênh nhau đều mặc định lấy bên GIỮ LẠI.
 *
 * Cùng lối với `mergeUnions` khi không được truyền gì — nhờ vậy người dùng bấm
 * thẳng "Gộp hai cặp" mà không đọc câu nào thì kết quả vẫn đúng bằng kết quả
 * của domain, không phải một đường đi thứ hai.
 */
function moTapChonMacDinh(uGiu, uBoDi) {
  const xd = timXungDotGop(uGiu, uBoDi);
  const chon = {};
  if (xd.status)        chon.status        = maTrangThai(uGiu);
  if (xd.note)          chon.note          = String(uGiu.note || '');
  if (xd.marriageRaw)   chon.marriageRaw   = String((uGiu.marriage || {}).raw || '');
  if (xd.marriagePlace) chon.marriagePlace = String((uGiu.marriage || {}).place || '');
  for (const id of xd.ranks) chon['rank:' + id] = rankCua(uGiu, id);
  return chon;
}

// ============================================================
// Thân form
// ============================================================

function veThan(than) {
  const uGiu  = state.index.unionById.get(gopCtx.giu);
  const uBoDi = state.index.unionById.get(gopCtx.boDi);
  if (!uGiu || !uBoDi) return;

  than.innerHTML = '';
  than.append(loiMo(uGiu, uBoDi));

  const xd = timXungDotGop(uGiu, uBoDi);

  if (xd.status) {
    than.append(...veCauHoi('Tình trạng hôn nhân', 'status',
      [maTrangThai(uGiu), maTrangThai(uBoDi)].map((ma) => ({
        gt: ma, chu: nhanTrangThaiCap(ma),
      })), than));
  }

  if (xd.marriageRaw) {
    than.append(...veCauHoi('Ngày cưới', 'marriageRaw',
      [(uGiu.marriage || {}).raw, (uBoDi.marriage || {}).raw]
        .map((v) => ({ gt: String(v || ''), chu: String(v || '') })), than));
  }

  if (xd.marriagePlace) {
    than.append(...veCauHoi('Nơi cưới', 'marriagePlace',
      [(uGiu.marriage || {}).place, (uBoDi.marriage || {}).place]
        .map((v) => ({ gt: String(v || ''), chu: String(v || '') })), than));
  }

  // ⚠ Thứ bậc là MỘT CÂU HỎI CHO MỖI NGƯỜI vênh, không phải một câu cho cả
  // cặp — từ bước 46 nó khoá theo người (`ranks`, `DAC-TA-RANK_V01`). Và nhãn
  // phải kể tên người ấy ra: "Thứ bậc" trống không đọc được TỪ PHÍA AI.
  for (const id of xd.ranks) {
    than.append(...veCauHoi('Đây là cặp thứ mấy của ' + tenNguoi(id) + '?',
      'rank:' + id,
      [rankCua(uGiu, id), rankCua(uBoDi, id)].map((n) => ({
        gt: n, chu: 'Thứ ' + n,
      })), than));
  }

  if (xd.note) {
    than.append(...veCauHoi('Ghi chú về cặp này', 'note',
      [uGiu.note, uBoDi.note].map((v) => ({
        gt: String(v || ''), chu: String(v || ''),
      })), than));
  }

  if (gopCtx.dsAnh.length > 0) {
    than.append(...veCauHoi(
      'Ảnh của cặp ' + gopCtx.boDi + ' (' + gopCtx.dsAnh.length + ' tấm)', 'media',
      [{ gt: 'chuyen',     chu: 'Chuyển sang cặp giữ lại' },
       { gt: 'giu-nguyen', chu: 'Để nguyên ở cặp bị xoá' }], than));
  }

  than.append(khoiXemTruoc());
}

/**
 * Câu mở: cặp nào ở lại, cặp nào đi, và điều gì KHÔNG mất.
 *
 * Câu thứ hai quan trọng hơn câu thứ nhất. Chữ "xoá" ở giữa màn hình làm người
 * ta dừng tay, mà thứ họ sợ — mất con, mất ngày cưới — thì chính là thứ hàm gộp
 * bảo toàn. Nói ra trước, không để họ phải đoán.
 */
function loiMo(uGiu, uBoDi) {
  const d = document.createElement('div');
  d.style.cssText =
    'margin-top:12px;padding:9px 11px;font-size:12px;line-height:1.55;' +
    'border-radius:8px;background:#faf8f5;border:1px solid #f0ebe4;color:#5c554e';

  const c1 = document.createElement('div');
  c1.textContent = 'Giữ lại ' + gopCtx.giu + ' — ' + keTenPartner(gopCtx.giu) +
                   ' (mã cũ hơn). Cặp ' + gopCtx.boDi + ' vào thùng rác.';

  const c2 = document.createElement('div');
  c2.style.cssText = 'margin-top:5px';
  c2.textContent = 'Con cái và người của cả hai cặp đều dồn về cặp giữ lại; ' +
                   'trường nào một bên bỏ trống thì tự lấy bên kia. Lấy lại được ' +
                   'từ thùng rác nếu gộp nhầm.';

  d.append(c1, c2);
  return d;
}

/**
 * Một câu hỏi hai đáp án. Trả mảng để nơi gọi `append(...)` cho gọn.
 *
 * Hai đáp án GIỐNG HỆT nhau thì không phải câu hỏi — nhưng chuyện ấy không xảy
 * ra được ở đây: mọi câu trong form đều do `timXungDotGop` chỉ ra, mà hàm ấy
 * chỉ kể những trường KHÁC nhau thật.
 */
function veCauHoi(nhan, khoa, cacMuc, than) {
  const khoi = document.createElement('div');
  khoi.dataset.hoi = khoa;
  khoi.style.cssText = 'display:flex;gap:8px;margin-top:2px';

  for (const muc of cacMuc) {
    const dangChon = String(gopCtx.chon[khoa]) === String(muc.gt);
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.dataset.chon = String(muc.gt);
    nut.style.cssText = KIEU_NUT_CHON +
      'min-height:44px;padding:8px 10px;text-align:left;line-height:1.4;' +
      (dangChon
        ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
        : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
    nut.textContent = coGiaTri(muc.chu) ? muc.chu : '(để trống)';
    nut.addEventListener('click', () => {
      gopCtx.chon[khoa] = muc.gt;
      veThan(than);
    });
    khoi.append(nut);
  }

  return [veNhan(nhan), khoi];
}

/**
 * Khối XEM TRƯỚC — chạy thẳng `mergeUnions` trên lựa chọn hiện tại.
 *
 * Không lưu gì: hàm gộp là hàm thuần, nó trả về một CÂY MỚI và không đụng vào
 * `state.tree`. Nhờ vậy chỗ này đọc được đúng thứ nút "Gộp hai cặp" sắp ghi
 * xuống, chứ không phải một bản tóm tắt viết tay chạy song song.
 */
function khoiXemTruoc() {
  const boc = document.createElement('div');
  const thu = mergeUnions(state.tree, gopCtx.giu, gopCtx.boDi, luaChonChoDomain());
  if (!thu) return boc;

  const u = thu.union;
  const soNguoi = (u.partners || []).length;
  const soCon   = (u.children || []).length;
  const m       = u.marriage || {};

  boc.append(veNhan('Sau khi gộp, cặp ' + gopCtx.giu + ' sẽ là'));

  const bang = document.createElement('div');
  bang.id = 'giapha-gop-xem-truoc';
  bang.style.cssText = 'display:flex;flex-direction:column;gap:1px';

  hangXem(bang, 'Người trong cặp', keTenPartner(gopCtx.giu) === '' ? soNguoi + ' người'
                                   : soNguoi + ' người · ' + keTenPartner(gopCtx.giu));
  hangXem(bang, 'Con', soCon === 0 ? 'chưa có' : soCon + ' người con');
  hangXem(bang, 'Tình trạng hôn nhân', nhanTrangThaiCap(maTrangThai(u)));
  hangXem(bang, 'Ngày cưới', m.raw);
  hangXem(bang, 'Nơi cưới', m.place);
  hangXem(bang, 'Ghi chú', u.note);

  boc.append(bang);
  return boc;
}

/** Trường trống thì KHÔNG vẽ hàng ấy — luật 7 của `CLAUDE.md`. */
function hangXem(bang, nhan, giaTri) {
  if (!coGiaTri(giaTri)) return;

  const hang = document.createElement('div');
  hang.dataset.xem = nhan;
  hang.style.cssText =
    'display:flex;gap:10px;align-items:baseline;padding:6px 0;' +
    'border-top:1px solid #f0ebe4';

  const n = document.createElement('div');
  n.textContent = nhan;
  n.style.cssText = 'flex:0 0 72px;font-size:12px;line-height:1.35;color:#8a8078';

  const g = document.createElement('div');
  g.textContent = String(giaTri);
  g.style.cssText = 'flex:1 1 auto;font-size:14px;line-height:1.45;word-break:break-word';

  hang.append(n, g);
  bang.append(hang);
}

// ============================================================
// Gộp và ghi xuống
// ============================================================

/**
 * Đổi tập trả lời của form sang tham số `luaChon` của `mergeUnions`.
 *
 * Chỉ mang những khoá form thật sự có hỏi. Truyền một trường không xung đột
 * (dù truyền đúng giá trị) là nói với domain rằng người dùng đã chọn nó — và
 * lần sau ai đọc `diff` sẽ không phân biệt được đâu là câu trả lời thật.
 */
function luaChonChoDomain() {
  const c  = gopCtx.chon;
  const lc = {};

  if (c.status !== undefined) lc.status = c.status;
  if (c.note   !== undefined) lc.note   = c.note;

  if (c.marriageRaw !== undefined || c.marriagePlace !== undefined) {
    lc.marriage = {};
    if (c.marriageRaw   !== undefined) lc.marriage.raw   = c.marriageRaw;
    if (c.marriagePlace !== undefined) lc.marriage.place = c.marriagePlace;
  }

  const ranks = {};
  for (const khoa of Object.keys(c)) {
    if (khoa.indexOf('rank:') === 0) ranks[khoa.slice(5)] = c[khoa];
  }
  if (Object.keys(ranks).length > 0) lc.ranks = ranks;

  if (c.media !== undefined) lc.media = c.media;

  return lc;
}

function veChanGop(luuDuoc) {
  const chan = document.createElement('div');
  chan.style.cssText =
    'display:flex;gap:8px;margin-top:18px;position:sticky;bottom:-18px;' +
    'padding:10px 0;background:#fffdf9;justify-content:center';

  N.nutLuu = document.createElement('button');
  N.nutLuu.type = 'button';
  N.nutLuu.textContent = 'Gộp hai cặp';
  N.nutLuu.disabled = !luuDuoc;
  N.nutLuu.style.cssText = KIEU_NUT_CHAN +
    'flex:1 1 auto;max-width:' + RONG_NUT_TOI_DA + ';' +
    'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600' +
    (luuDuoc ? '' : ';opacity:.45;cursor:not-allowed');
  if (luuDuoc) N.nutLuu.addEventListener('click', () => chayGop());

  const huy = document.createElement('button');
  huy.type = 'button';
  huy.textContent = 'Huỷ';
  huy.style.cssText = KIEU_NUT_CHAN +
    'flex:0 0 auto;background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8';
  huy.addEventListener('click', () => closePersonForm());

  chan.append(N.nutLuu, huy);
  return chan;
}

async function chayGop() {
  if (!gopCtx || N.dangLuu) return;

  const canTro = canTroLuu();
  if (canTro) { hienNhan(canTro, true); return; }

  const kq = mergeUnions(state.tree, gopCtx.giu, gopCtx.boDi, luaChonChoDomain());
  if (!kq) {
    hienNhan('Không gộp được — hai cặp này không còn trùng nhau nữa. Đóng lại, ' +
             'chạy Rà soát một lần rồi thử lại.', true);
    return;
  }

  const capXoa = kq.tree.unions.find((u) => u && u.id === kq.unionXoa);

  // ẢNH: `mergeUnions` đã đổi `subjectId` ngay trong cây nó trả về, nên ở đây
  // chỉ còn việc kể tên những bản ghi ấy cho `ghiBanGhi` ghi đè. Dùng ô `goRa`
  // — nó ghi đè theo mã, đúng thứ cần; ô `themVao` mới là ô sinh mã mới.
  let anh = null;
  if (gopCtx.chon.media === 'chuyen' && gopCtx.dsAnh.length > 0) {
    const maAnh = new Set(gopCtx.dsAnh.map((m) => m.id));
    anh = {
      themVao: [],
      goRa: (kq.tree.media || []).filter((m) => m && maAnh.has(m.id)),
    };
  }

  const indexMoi = buildIndex(kq.tree);
  const raSoat   = validateAll(kq.tree, indexMoi, 'union', { unionId: gopCtx.giu });

  if (!raSoat.canSave) {
    hienNhan('Chưa gộp được — có chỗ không thể đúng được:', true,
             raSoat.errors.map((m) => m.message));
    return;
  }

  if (raSoat.warnings.length > 0 && !N.daXemCanhBao) {
    N.daXemCanhBao = true;
    N.nutLuu.textContent = 'Vẫn gộp';
    hienNhan('Có chỗ đáng xem lại. Gia phả cũ có những chuyện thật mà nghe như ' +
             'lỗi, nên app không chặn — bấm "Vẫn gộp" nếu bạn biết là đúng:', false,
             raSoat.warnings.map((m) => m.message));
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang gộp…', false);

  const soAnh = anh ? anh.goRa.length : 0;
  const ketQua = await ghiBanGhi(null, [kq.union, capXoa], {
    action: 'merge',
    target: gopCtx.giu,
    note:   'Gộp cặp ' + gopCtx.boDi + ' vào ' + gopCtx.giu + ' — ' +
            keTenPartner(gopCtx.giu) + '.' +
            (soAnh > 0 ? ' Chuyển ' + soAnh + ' ảnh sang cặp giữ lại.' : ''),
    diff:   kq.diff,
  }, anh);

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hai cặp VẪN như cũ, chưa cặp nào bị đụng vào.');
    return;
  }

  const giu = gopCtx.giu;
  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(giu);
  closePersonForm();
}

// ============================================================
// Chữ nghĩa
// ============================================================

/** Cùng phép chuẩn hoá với `union.updateUnion`: thiếu `status` là đang là vợ chồng. */
function maTrangThai(u) {
  return (u && u.status === 'divorced') ? 'divorced' : ((u && u.status) || 'married');
}
