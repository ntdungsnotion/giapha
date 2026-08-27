// ============================================================
// giapha · js/pages/form-anh.js
// Vai trò  : KHO ẢNH của một NGƯỜI hoặc một CẶP — dải ảnh, thêm tấm mới, đặt
//            và bỏ ảnh đại diện, và phép áp mọi thay đổi ấy lên cây lúc lưu
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/person-edit.js (nền dùng chung), state, domains/{media,render},
//            services/{repo,gas}, utils/{date,image,avatar}, config
// Phiên bản: 1.0.0 · Cập nhật: 27/08/2026 22:05
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 5 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào.
//
// ⚠ Kho ảnh phục vụ HAI form — hồ sơ một người (`person-edit.js`) và sửa cặp
// (`form-cap.js`) — nên nó là file riêng chứ không nằm trong file nào của hai
// bên. Ba cửa nó mở ra: `veKhoiAnh()` để vẽ, `apThayDoiAnh()` để áp lên cây lúc
// lưu, `keThayDoiAnh()` để kể vào `changeLog`.

import { N, hienNhan } from './person-edit.js';
import { state } from '../state.js';
import { attachMedia, detachMedia, setPortrait, clearPortrait,
         getMediaFor, getPortrait } from '../domains/media.js';
import { mauVien } from '../domains/render.js';
import { suaDuoc } from '../services/repo.js';
import { taiAnh } from '../services/gas.js';
import { stampNow } from '../utils/date.js';
import { compressImage, driveThumbUrl, dataUri } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';
import { RONG_NUT_TOI_DA } from '../config.js';

// KHO ẢNH (việc 5, nửa A). Cùng lối với `tenPhu` và `quanHe` bên form hồ sơ:
// giữ RIÊNG một bản làm việc, không đọc ngược từ DOM và không đụng `state.tree`
// cho tới lúc bấm Lưu.
//
// ⚠ **`khoa` không phải `mediaId`.** Một tấm vừa tải lên chưa có mã `M….` — mã
// ấy chỉ sinh ra lúc `attachMedia` chạy, mà `attachMedia` thì chạy lúc lưu.
// Nhưng người dùng phải chỉ được vào tấm ấy NGAY để đặt nó làm đại diện. Nên
// mỗi mục mang một `khoa` riêng, sống suốt đời cái form: mã `M….` thật với ảnh
// đã có trong cây, và `moi-1`, `moi-2`… với ảnh vừa tải lên. `anhDaiDienKhoa`
// trỏ vào `khoa`, không trỏ vào `mediaId` — có thế thì chọn một tấm chưa có mã
// làm đại diện mới nói được thành lời.
let khoiAnh = null;        // tham chiếu tới khối, để vẽ lại một mình nó
let khoAnh = [];           // [{ khoa, mediaId, driveFileId, caption, xemTruoc, laMoi, boDi }]
let anhDaiDienKhoa = '';   // khoá của tấm đang làm đại diện; '' là không dùng tấm nào
let anhDangXet = '';       // khoá của tấm vừa bấm, để hàng nút mọc ngay dưới dải
let demAnhMoi = 0;         // sinh khoá tạm; KHÔNG dùng lại số đã cấp trong một lần mở form

// Kho ảnh đang mở là CỦA AI, và chủ thể ấy có ảnh đại diện hay không.
//
// ⚠ **Một CẶP không có ảnh đại diện, và đó không phải chuyện bỏ sót.**
// `photoFileId` là trường của bản ghi NGƯỜI — sơ đồ vẽ mặt người trong ô, còn
// một cặp thì không có ô nào của riêng nó để mà vẽ mặt. Nên với cặp, kho ảnh
// chỉ còn hai việc: thêm và gỡ. Để nguyên đường đại diện rồi trông chờ
// `setPortrait` trả `null` là dựa vào một sự tình cờ: giao diện vẫn hiện dấu ✓
// và nút *Bỏ ảnh đại diện* cho một thứ không bao giờ có ảnh đại diện.
let anhCuaAi = '';         // mã chủ thể: `P….` hoặc `U….`
let anhCoDaiDien = true;   // false với một CẶP
let anhDangTai = false;

/** `closePersonForm()` gọi hàm này — xem `form-sap-thu-tu.js`. */
export function donDepAnh() {
  khoiAnh        = null;
  khoAnh         = [];
  anhCuaAi       = '';
  anhCoDaiDien   = true;
  anhDaiDienKhoa = '';
  anhDangXet     = '';
  demAnhMoi      = 0;
  anhDangTai     = false;
}

// ============================================================
// KHO ẢNH của một người — bước 28 (một ảnh đại diện) · việc 5 nửa A (cả kho)
// ============================================================
//
// NĂM QUYẾT ĐỊNH CỦA KHO ẢNH — chốt 21/08/2026
//
// 1. **Kho ảnh nằm NGAY TRONG form, không phải một màn hình riêng.** Người vào
//    đây để sửa hồ sơ một con người, mà ảnh là một phần của hồ sơ ấy. Dựng thêm
//    một màn hình nữa là bắt người dùng nhớ thêm một chỗ đứng, đổi lại chẳng
//    được gì — kho ảnh của một người trong gia phả này đếm trên đầu ngón tay.
//
// 2. **Ảnh vừa thêm LUÔN thành đại diện.** Giữ nguyên hành vi của bước 28: chọn
//    một tấm rồi Lưu là mặt người ấy đổi trên sơ đồ. Muốn thêm vào kho mà không
//    đổi mặt thì bấm tấm cũ đặt lại làm đại diện — một cú chạm, và nó nói ra
//    được bằng lời, khác hẳn một cái ô đánh dấu "dùng làm đại diện" nằm im.
//
// 3. **Bấm một tấm KHÔNG đặt nó làm đại diện ngay — nó mở một hàng nút.** Một
//    tấm ảnh mang hai việc khác hẳn nhau (làm mặt · bỏ khỏi kho) mà chỉ có một
//    cử chỉ để bấm. Cùng lối với bảng chọn phụ của menu vòng tròn: câu hỏi phụ
//    mọc ra ngay cạnh cái vừa bấm. Và nút thì cao 40px, còn một dấu ✕ nhét vào
//    góc tấm ảnh 56px thì không đích chạm nào đủ rộng.
//
// 4. **Gỡ khỏi kho KHÔNG xoá gì cả.** `detachMedia` đặt cờ `deleted`, file trên
//    Drive nằm nguyên. Xoá nhầm một tấm ảnh cụ ông chụp năm 1950 là mất vĩnh
//    viễn — luật 3 của `domains/media.js`.
//
// 5. ⚠ **Ảnh đại diện LẺ là một ca thật, không phải dữ liệu hỏng.** Một bản ghi
//    có `photoFileId` mà `media[]` không có tấm nào tương ứng — nhập từ GEDCOM,
//    hoặc file bị sửa tay ngoài app. Bản làm việc giữ nó thành một mục mang cờ
//    `laLe`, hiện ra trong dải kèm chú thích. **Bỏ mục ấy đi là sai:** lúc lưu,
//    kho ảnh sẽ đọc ra thành "người này không dùng tấm nào làm đại diện" rồi
//    lặng lẽ xoá mất `photoFileId` của một người mà không ai đụng vào.

/**
 * @param {string} subjectId  mã người `P….` hoặc mã hôn nhân `U….`
 * @param {object|null} nen   bản ghi người, CHỈ để lấy màu viền và bóng người.
 *                            Cặp truyền `null` — `mauVien(null)` ra màu "chưa
 *                            rõ", đúng thứ cần cho một tấm ảnh của hai người.
 */
export function veKhoiAnh(subjectId, nen) {
  khoiAnh = document.createElement('div');
  anhCuaAi = String(subjectId);
  anhCoDaiDien = anhCuaAi.charAt(0) !== 'U';
  docKhoAnh(nen);
  veLaiKhoiAnh(nen);
  return khoiAnh;
}

/**
 * Dựng bản làm việc từ cây. Chạy MỘT lần lúc mở form.
 *
 * `getMediaFor` trả về mới nhất đứng trước, và dải ảnh giữ đúng thứ tự ấy: tấm
 * vừa thêm nằm đầu, chỗ mắt nhìn tới trước.
 */
function docKhoAnh(nguoi) {
  const cay = state.tree;

  khoAnh = getMediaFor(cay, anhCuaAi).map((m) => ({
    khoa:        m.id,
    mediaId:     m.id,
    driveFileId: m.driveFileId,
    caption:     m.caption || '',
    xemTruoc:    '',
    laMoi:       false,
    laLe:        false,
    boDi:        false,
  }));

  if (!anhCoDaiDien) { anhDangXet = ''; demAnhMoi = 0; anhDaiDienKhoa = ''; return; }

  const dd = getPortrait(cay, anhCuaAi);
  anhDaiDienKhoa = dd ? dd.id : '';

  // Quyết định 5: con trỏ trỏ vào chỗ kho không có gì.
  const conTro = nguoi && typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId.trim() : '';
  if (!dd && conTro) {
    khoAnh.unshift({
      khoa: 'le', mediaId: '', driveFileId: conTro, caption: '',
      xemTruoc: '', laMoi: false, laLe: true, boDi: false,
    });
    anhDaiDienKhoa = 'le';
  }

  anhDangXet = '';
  demAnhMoi  = 0;
}

/**
 * Vẽ lại một mình khối ảnh, không đụng tới các ô khác.
 *
 * ⚠ **Không dựng lại cả form.** Người dùng có thể đã gõ dở tên, ngày tháng,
 * ghi chú; dựng lại cả form là xoá sạch những thứ ấy. Đây đúng là cái bẫy mà
 * `settings.js` đã tránh bằng cách giữ tham chiếu tới từng khối.
 */
function veLaiKhoiAnh(nguoi) {
  const khoi = khoiAnh;
  if (!khoi) return;
  khoi.innerHTML = '';

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;gap:12px;align-items:center';

  // Vòng ảnh tròn ở đầu khối là ẢNH ĐẠI DIỆN — cặp không có, nên không vẽ.
  if (anhCoDaiDien) hang.append(veXemTruocAnh(nguoi));

  const cot = document.createElement('div');
  cot.style.cssText = 'flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px';

  cot.append(nutChonAnh(nguoi));
  if (mucDaiDien()) cot.append(nutBoAnh(nguoi));

  hang.append(cot);
  khoi.append(hang);

  if (khoAnh.length > 0) khoi.append(veDaiAnh(nguoi));

  const loi = document.createElement('div');
  loi.style.cssText = 'font-size:12px;line-height:1.5;color:#8a8078;margin-top:8px';
  loi.textContent = moTaTrangThaiAnh(nguoi);
  khoi.append(loi);
}

/** Mục đang làm đại diện trong bản làm việc, hoặc null. */
function mucDaiDien() {
  if (!anhCoDaiDien || !anhDaiDienKhoa) return null;
  return khoAnh.find((a) => a.khoa === anhDaiDienKhoa && !a.boDi) || null;
}

/** Đường dẫn xem một tấm: ảnh vừa tải lên xem bằng chuỗi ở máy, ảnh cũ nhờ Drive. */
function duongXemAnh(muc, co) {
  return muc.xemTruoc ? dataUri(muc.xemTruoc) : driveThumbUrl(muc.driveFileId, co * 2);
}

/** Ảnh đang xem trước: tấm đang làm đại diện, hoặc bóng người. */
function veXemTruocAnh(nguoi) {
  const co = 72;
  const boc = document.createElement('div');
  boc.style.cssText =
    'flex:0 0 auto;width:' + co + 'px;height:' + co + 'px;border-radius:50%;' +
    'overflow:hidden;box-shadow:0 0 0 1.5px #fff, 0 0 0 3px ' + mauVien(nguoi) + '55;' +
    'opacity:' + (anhDangTai ? '0.5' : '1');

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoi && nguoi.sex, mauVien(nguoi));
  boc.append(im);

  const dd = mucDaiDien();
  if (dd) datAnhKhiTaiXong(im, duongXemAnh(dd, co));

  return boc;
}

/**
 * Đổi `src` CHỈ KHI ảnh tải xong thật.
 *
 * Gán thẳng `im.src` thì lúc Drive từ chối — ảnh chưa mở quyền xem, hoặc mạng
 * hỏng — cái đang hiện là **biểu tượng ảnh vỡ**, chứ không phải bóng người mà
 * bước 28 đã dựng ra để đứng ở đúng chỗ ấy. Một ô sơ đồ mang hình ảnh vỡ đọc ra
 * thành "app hỏng", còn bóng người đọc ra thành "chưa có ảnh".
 */
function datAnhKhiTaiXong(im, duong) {
  if (!duong) return;
  if (duong.indexOf('data:') === 0) { im.src = duong; return; }
  const thu = new Image();
  thu.onload = () => {
    if (thu.naturalWidth > 0 && thu.naturalHeight > 0) im.src = duong;
  };
  thu.src = duong;
}

// ============================================================
// Dải ảnh — mọi tấm trong kho
// ============================================================

function veDaiAnh(nguoi) {
  const boc = document.createElement('div');
  boc.style.cssText = 'margin-top:12px';

  const nhan = document.createElement('div');
  nhan.textContent = 'Kho ảnh (' + khoAnh.filter((a) => !a.boDi).length + ')';
  nhan.style.cssText = 'font-size:12px;font-weight:600;color:#8a8078;margin-bottom:6px';
  boc.append(nhan);

  const dai = document.createElement('div');
  dai.id = 'giapha-dai-anh';   // mốc cho bài kiểm hành vi
  dai.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
  for (const muc of khoAnh) dai.append(veTamAnh(muc, nguoi));
  boc.append(dai);

  const xet = khoAnh.find((a) => a.khoa === anhDangXet);
  if (xet) boc.append(veHangNutAnh(xet, nguoi));

  return boc;
}

function veTamAnh(muc, nguoi) {
  const co = 56;
  const laDD  = muc.khoa === anhDaiDienKhoa && !muc.boDi;
  const laXet = muc.khoa === anhDangXet;

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.dataset.anh = muc.khoa;
  nut.disabled = anhDangTai || N.dangLuu;
  nut.style.cssText =
    'position:relative;width:' + co + 'px;height:' + co + 'px;padding:0;' +
    'border-radius:10px;overflow:hidden;cursor:pointer;touch-action:manipulation;' +
    'background:#faf8f5;' +
    'border:2px solid ' + (laDD ? mauVien(nguoi) : (laXet ? '#8a8078' : '#e6e0d8')) + ';' +
    'opacity:' + (muc.boDi ? '.35' : '1') + ';';

  const im = document.createElement('img');
  im.alt = '';
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  im.src = anhMacDinhUri(nguoi && nguoi.sex, mauVien(nguoi));
  datAnhKhiTaiXong(im, duongXemAnh(muc, co));
  nut.append(im);

  // Dấu hiệu đọc được KHÔNG CẦN MÀU: người phân biệt màu kém vẫn phải thấy tấm
  // nào đang làm mặt. Viền màu một mình thì không đủ.
  if (laDD) nut.append(dauGocAnh('✓', mauVien(nguoi)));
  if (muc.boDi) nut.append(dauGocAnh('✕', '#8a3a2a'));

  nut.addEventListener('click', () => {
    anhDangXet = (anhDangXet === muc.khoa) ? '' : muc.khoa;
    veLaiKhoiAnh(nguoi);
  });
  return nut;
}

function dauGocAnh(chu, mau) {
  const d = document.createElement('span');
  d.textContent = chu;
  d.style.cssText =
    'position:absolute;left:0;bottom:0;min-width:18px;height:18px;' +
    'display:flex;align-items:center;justify-content:center;font-size:12px;' +
    'color:#fffdf9;background:' + mau + ';border-radius:0 8px 0 8px';
  return d;
}

/**
 * Hàng nút mọc ra dưới dải, cho tấm vừa bấm.
 *
 * Không hiện nút nào mà bấm vào không xảy ra gì: tấm đang làm đại diện thì
 * không có nút *Đặt làm đại diện*, tấm đã đánh dấu bỏ thì nút đổi thành *Giữ
 * lại*. Một hàng nút lúc nào cũng đủ ba cái, trong đó có cái bấm không ăn, là
 * cùng loại lỗi với nút chết ở menu vòng tròn (bước 26).
 */
function veHangNutAnh(muc, nguoi) {
  const hang = document.createElement('div');
  hang.style.cssText =
    'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;padding:10px;' +
    'background:#faf8f5;border-radius:10px';

  const batDuoc = suaDuoc() && !anhDangTai && !N.dangLuu;

  if (muc.boDi) {
    hang.append(nutNhoAnh('Giữ lại tấm này', batDuoc, false, () => {
      muc.boDi = false;
      veLaiKhoiAnh(nguoi);
    }));
  } else {
    if (anhCoDaiDien && muc.khoa !== anhDaiDienKhoa) {
      hang.append(nutNhoAnh('Đặt làm ảnh đại diện', batDuoc, false, () => {
        anhDaiDienKhoa = muc.khoa;
        veLaiKhoiAnh(nguoi);
      }));
    }
    // Mục LẺ không có bản ghi trong kho để mà gỡ — việc duy nhất làm được với
    // nó là thôi dùng làm đại diện, và nút "Bỏ ảnh đại diện" ở trên đã lo.
    if (!muc.laLe) {
      hang.append(nutNhoAnh('Gỡ khỏi kho ảnh', batDuoc, true, () => {
        muc.boDi = true;
        if (anhDaiDienKhoa === muc.khoa) anhDaiDienKhoa = '';
        veLaiKhoiAnh(nguoi);
      }));
    }
  }

  hang.append(nutNhoAnh('Thôi', true, false, () => {
    anhDangXet = '';
    veLaiKhoiAnh(nguoi);
  }));

  return hang;
}

function nutNhoAnh(chu, batDuoc, laDo, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'min-height:40px;padding:0 12px;font-size:13px;font-family:inherit;' +
    'border-radius:9px;border:1px solid #e6e0d8;background:#fffdf9;' +
    'color:' + (laDo ? '#8a3a2a' : '#2a2622') + ';' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '.45') + ';touch-action:manipulation';
  if (batDuoc) b.addEventListener('click', chay);
  return b;
}

// ============================================================
// Thêm một tấm mới
// ============================================================

function nutChonAnh(nguoi) {
  const batDuoc = suaDuoc() && !anhDangTai && !N.dangLuu;

  const nhan = document.createElement('label');
  nhan.style.cssText =
    'display:block;min-height:40px;padding:10px 12px;box-sizing:border-box;' +
    'font-size:14px;text-align:center;border-radius:9px;border:1px solid #e6e0d8;' +
    'background:#faf8f5;line-height:1.3;max-width:' + RONG_NUT_TOI_DA + ';' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45');
  nhan.textContent = anhDangTai
    ? 'Đang tải lên…'
    : (khoAnh.some((a) => !a.boDi) ? 'Thêm ảnh' : 'Chọn ảnh');

  const oFile = document.createElement('input');
  oFile.type = 'file';
  oFile.accept = 'image/*';
  oFile.disabled = !batDuoc;
  oFile.style.cssText = 'display:none';
  oFile.addEventListener('change', () => {
    const f = oFile.files && oFile.files[0];
    if (f) chonVaTaiAnh(f, nguoi);
  });

  nhan.append(oFile);
  return nhan;
}

function nutBoAnh(nguoi) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Bỏ ảnh đại diện';
  b.disabled = anhDangTai || N.dangLuu;
  b.style.cssText =
    'min-height:36px;padding:7px 12px;font-size:13px;font-family:inherit;' +
    'border-radius:9px;border:1px solid #e6e0d8;background:#fffdf9;color:#8a3a2a;' +
    'cursor:pointer;touch-action:manipulation;max-width:' + RONG_NUT_TOI_DA + ';';
  b.addEventListener('click', () => {
    anhDaiDienKhoa = '';
    veLaiKhoiAnh(nguoi);
  });
  return b;
}

/** Sau khi bấm Lưu thì người này còn ảnh đại diện hay không. */
function coAnhSauKhiLuu() {
  return !!mucDaiDien();
}

/**
 * Câu tường thuật dưới khối ảnh.
 *
 * Nói ra điều KHÔNG hiển nhiên: ảnh đã nằm trên Drive rồi, nhưng hồ sơ thì
 * chưa đổi. Không nói thì người dùng đóng form và đinh ninh là xong.
 */
function moTaTrangThaiAnh(nguoi) {
  if (anhDangTai) return 'Đang nén và tải ảnh lên Google Drive…';

  const moi = khoAnh.filter((a) => a.laMoi && !a.boDi).length;
  const bo  = khoAnh.filter((a) => a.boDi && !a.laMoi).length;
  const dd  = mucDaiDien();

  const cau = [];
  if (moi > 0) {
    cau.push(moi === 1
      ? 'Một tấm đã lên Drive nhưng chưa vào gia phả.'
      : moi + ' tấm đã lên Drive nhưng chưa vào gia phả.');
  }
  if (bo > 0) {
    cau.push(bo === 1
      ? 'Một tấm sẽ được gỡ khỏi kho — bản ghi vẫn nằm lại trong file, file ảnh vẫn nằm nguyên trên Drive.'
      : bo + ' tấm sẽ được gỡ khỏi kho — bản ghi vẫn nằm lại trong file, file ảnh vẫn nằm nguyên trên Drive.');
  }
  if (dd && dd.laLe) {
    cau.push('Ảnh đại diện hiện nay không có bản ghi nào trong kho — bản ghi này ' +
             'nhập từ nơi khác, hoặc file đã bị sửa tay ngoài app.');
  }
  if (cau.length > 0) {
    cau.push('Bấm "Lưu" ở cuối form thì những việc trên mới thành thật.');
    return cau.join(' ');
  }

  if (khoAnh.length === 0) {
    return 'Chưa có ảnh. Sơ đồ đang vẽ bóng người theo giới tính. ' +
           'Ảnh được nén nhỏ lại trước khi gửi đi, không tải nguyên file gốc.';
  }
  if (!anhCoDaiDien) {
    return 'Ảnh của cặp này — ảnh cưới, ảnh cả nhà. Một cặp không có ảnh đại ' +
           'diện: sơ đồ vẽ mặt từng người, không vẽ ô nào của riêng cặp.';
  }
  if (!dd) {
    return 'Kho còn ảnh, nhưng không tấm nào đang làm đại diện — sơ đồ vẽ bóng ' +
           'người. Bấm một tấm rồi chọn "Đặt làm ảnh đại diện".';
  }
  return 'Bấm một tấm trong kho để đặt nó làm ảnh đại diện, hoặc gỡ nó ra.';
}

/**
 * Nén rồi tải một tấm ảnh lên Drive.
 *
 * ⚠ Hàm này **không** đụng tới `state.tree`, không gọi `luuCay()`. Nó chỉ đổi
 * bản làm việc `khoAnh`. Cả cây chỉ đổi ở đúng một chỗ: `handleSave()`.
 */
async function chonVaTaiAnh(file, nguoi) {
  anhDangTai = true;
  veLaiKhoiAnh(nguoi);

  try {
    const nen = await compressImage(file);
    const ten = 'anh_' + anhCuaAi + '_' + stampNow().replace(/[^0-9]/g, '') + '.jpg';
    const kq  = await taiAnh(nen.base64, ten);

    if (!kq || !kq.ok) {
      throw new Error((kq && kq.loi) ||
        'Máy chủ không nhận ảnh mà không nói rõ vì sao.');
    }

    demAnhMoi += 1;
    const khoa = 'moi-' + demAnhMoi;
    khoAnh.unshift({
      khoa, mediaId: '', driveFileId: kq.fileId, caption: '',
      xemTruoc: nen.base64, laMoi: true, laLe: false, boDi: false,
    });
    // Quyết định 2: tấm vừa thêm luôn thành đại diện — nhưng chỉ khi chủ thể
    // có ảnh đại diện. Ảnh cưới của một cặp thì thêm là thêm, hết.
    if (anhCoDaiDien) anhDaiDienKhoa = khoa;
    anhDangXet = '';

    anhDangTai = false;
    veLaiKhoiAnh(nguoi);
    // Dọn lời nhắn cũ, KHÔNG gọi `hienNhan('')` — hàm ấy dựng ra một cái hộp
    // xám rỗng, trông như app vừa định nói gì đó rồi thôi.
    if (N.khoiKetQua) N.khoiKetQua.innerHTML = '';
  } catch (e) {
    anhDangTai = false;
    veLaiKhoiAnh(nguoi);
    hienNhan('Chưa tải được ảnh lên: ' + (e && e.message ? e.message : String(e)), true);
  }
}

/**
 * Áp thay đổi kho ảnh lên một cây ĐÃ SỬA XONG phần hồ sơ.
 *
 * Chạy SAU `updatePerson` và trên chính cây nó trả về, vì `attachMedia` sinh mã
 * `M….` từ cây — sinh trên cây cũ rồi ghép vào cây mới là đúng cái bẫy mà
 * `utils/id.js` đã dặn ở đầu file.
 *
 * ⚠ **BA BƯỚC, ĐÚNG THỨ TỰ NÀY, và mỗi bước NỐI ĐUÔI bước trước.**
 *
 *   1. THÊM trước — vì bước 3 cần mã `M….` thật của tấm vừa thêm, mà mã ấy chỉ
 *      có sau khi `attachMedia` chạy.
 *   2. GỠ tiếp.
 *   3. ĐẠI DIỆN sau cùng — vì `detachMedia` **tự xoá `photoFileId`** khi tấm bị
 *      gỡ đúng là tấm đang làm mặt. Đặt đại diện trước rồi mới gỡ thì bước 2
 *      xoá mất việc bước 3 vừa làm, và cái sai ấy không có gì báo lỗi cả.
 *
 * @returns {{tree, person, themVao, goRa, diff}|null} null khi lần lưu này
 *          không đụng tới ảnh — nơi gọi đọc `null` để biết có gì đổi hay không.
 */
export function apThayDoiAnh(cay, subjectId, ghiNhan) {
  const personId = subjectId;
  let tree = cay;
  const themVao = [];   // bản ghi ảnh MỚI, để đẩy sang máy chủ
  const goRa    = [];   // bản ghi ảnh vừa mang cờ `deleted`, cũng phải đẩy sang
  const diff    = {};
  const maThat  = new Map();   // khoá tạm -> mã `M….` thật

  // 1. THÊM
  for (const a of khoAnh) {
    if (!a.laMoi || a.boDi) continue;
    const kq = attachMedia(tree, personId, a.driveFileId, a.caption, ghiNhan);
    if (!kq) continue;
    tree = kq.tree;
    themVao.push(kq.media);
    Object.assign(diff, kq.diff);
    maThat.set(a.khoa, kq.media.id);
  }

  // 2. GỠ. Tấm vừa thêm mà lại bỏ đi ngay thì KHÔNG có gì để gỡ — nó chưa bao
  //    giờ vào cây. File trên Drive nằm lại, cùng lối với "chọn ảnh rồi đóng
  //    form không lưu" của bước 28.
  for (const a of khoAnh) {
    if (a.laMoi || a.laLe || !a.boDi || !a.mediaId) continue;
    const kq = detachMedia(tree, a.mediaId, ghiNhan);
    if (!kq) continue;
    tree = kq.tree;
    goRa.push(kq.media);
    Object.assign(diff, kq.diff);
  }

  // 3. ĐẠI DIỆN — cặp không có bước này, xem `anhCoDaiDien`.
  const dd = anhCoDaiDien ? mucDaiDien() : null;
  if (!anhCoDaiDien) {
    if (Object.keys(diff).length === 0) return null;
    return { tree, person: null, themVao, goRa, diff };
  }
  if (dd && dd.laLe) {
    // Con trỏ đang đúng như cũ, và không có bản ghi nào để trỏ lại. Không làm
    // gì là đúng — xem quyết định 5.
  } else if (dd) {
    const ma = dd.laMoi ? maThat.get(dd.khoa) : dd.mediaId;
    const kq = ma ? setPortrait(tree, personId, ma, ghiNhan) : null;
    if (kq) { tree = kq.tree; Object.assign(diff, kq.diff); }
  } else {
    const kq = clearPortrait(tree, personId, ghiNhan);
    if (kq) { tree = kq.tree; Object.assign(diff, kq.diff); }
  }

  if (Object.keys(diff).length === 0) return null;

  const nguoi = (Array.isArray(tree.persons) ? tree.persons : [])
    .find((p) => p && p.id === personId) || null;

  return { tree, person: nguoi, themVao, goRa, diff };
}

/** Một câu kể những gì kho ảnh vừa đổi, để đưa vào `changeLog`. */
export function keThayDoiAnh(anh) {
  if (!anh) return '';
  const phan = [];
  if (anh.themVao.length > 0) phan.push('thêm ' + anh.themVao.length + ' ảnh');
  if (anh.goRa.length > 0)    phan.push('gỡ ' + anh.goRa.length + ' ảnh');
  const doiMat = Object.keys(anh.diff).some((k) => k.endsWith('.photoFileId'));
  if (doiMat) phan.push(coAnhSauKhiLuu() ? 'đổi ảnh đại diện' : 'bỏ ảnh đại diện');
  return phan.length > 0 ? ' Kho ảnh: ' + phan.join(', ') + '.' : '';
}

