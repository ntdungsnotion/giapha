// ============================================================
// giapha · js/pages/form-thung-rac.js
// Vai trò  : Thùng rác — đưa một người / một cặp trở lại, khôi phục và cho
//            vào thùng rác CẢ LOẠT, và XOÁ THẬT (gom rác)
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/person-edit.js (nền dùng chung), state,
//            domains/{person,union,purge}, services/{repo,gas}, utils/date
// Phiên bản: 1.0.0 · Cập nhật: 27/08/2026 19:10
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 2 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào — chỉ
// dời chỗ, và những gì trước đây thấy được vì cùng file thì nay nhập vào.
//
// ⚠ **`person-edit.js` vẫn xuất lại năm hàm của file này**, nên `tree-view.js`
// và các bài kiểm không phải sửa gì. Vòng nhập giữa hai file là cố ý; nó chạy
// được vì mọi lời gọi nằm trong thân hàm. **Không được gọi hàm nhập vào ở
// top-level** — làm thế là lỗi TDZ ngay lúc nạp trang.
//
// ⚠ **Nền dùng chung nay còn nằm trong `person-edit.js`** — object trạng thái
// `N`, `closePersonForm`, `moHopTrang`, `hienNhan`… Đợt 7 của bản đồ tách sẽ
// dời chúng sang `pages/form-nen.js`; lúc ấy file này chỉ đổi một dòng nhập.

import { N, closePersonForm, moHopTrang, moHopBao, hienNhan, hienLoiGhi,
         nutChon, nutChanXoa, nutChanDam, ghiBanGhi, ghiMotNguoi,
         tenTrongCay, timNguoiTrongCay, timCapTrongCay } from './person-edit.js';
import { state } from '../state.js';
import { restorePerson, softDeletePerson } from '../domains/person.js';
import { restoreUnion, softDeleteUnion } from '../domains/union.js';
import { planPurge, applyPurge, moTaKePurge } from '../domains/purge.js';
import { luuCay } from '../services/repo.js';
import { xoaAnhThat } from '../services/gas.js';
import { stampNow } from '../utils/date.js';

// ============================================================
// THÙNG RÁC — đưa trở lại (bước 29)
// ============================================================
//
// Hai hàm dưới đây là chỗ đến của hai callback trong `pages/person-list.js`.
// Chúng ở đây chứ không ở đó vì cùng một lý do đã đặt mọi hộp xác nhận của
// bước 26 vào file này: **đường ghi xuống Drive chỉ có một chỗ.**
//
// ⚠ Cả hai đọc thẳng `state.tree`, KHÔNG đọc `state.index`. `buildIndex()` bỏ
// qua mọi bản ghi mang cờ `deleted`, nên tra chỉ mục ở đây là luôn không thấy gì.

/**
 * Đưa một người đã xoá trở lại gia phả.
 *
 * @param {string} personId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 */
export function khoiPhucNguoi(personId, xuLy = {}) {
  const nguoi = timNguoiTrongCay(personId);
  if (!nguoi) {
    moHopBao('Không tìm thấy bản ghi',
             'Không còn ai mang mã ' + personId + ' trong gia phả. Tải lại ' +
             'trang rồi mở lại thùng rác.', true);
    return;
  }
  if (nguoi.deleted !== true) {
    moHopBao('Người này đang ở trong gia phả',
             tenTrongCay(state.tree, personId) + ' không nằm trong thùng rác ' +
             'nữa — có thể người khác vừa đưa họ trở lại. Tải lại trang để thấy ' +
             'bản mới nhất.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Đưa trở lại gia phả',
                          tenTrongCay(state.tree, personId) + '  ·  ' + personId);
  hienNhan('Người này sẽ hiện lại trên sơ đồ, đúng chỗ cũ — xoá mềm không gỡ ' +
           'một mối nối nào, nên không có gì phải nối lại.',
           false, cauKeKhiTroLai(personId));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayKhoiPhucNguoi(personId)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Những gì người dùng cần biết TRƯỚC khi bấm. Hai câu, và câu thứ hai là câu
 * hay gặp: người bị xoá vì gỡ nối thì cặp của họ cũng nằm trong thùng rác, và
 * đưa mỗi người trở lại thì sơ đồ vẫn chưa vẽ ra họ.
 */
function cauKeKhiTroLai(personId) {
  const cacCap = (Array.isArray(state.tree.unions) ? state.tree.unions : [])
    .filter((u) => u && coMatTrongCap(u, personId));
  if (cacCap.length === 0) {
    return ['Người này không đứng trong cặp nào, nên sau khi trở lại vẫn chưa ' +
            'nối với ai. Tìm họ ở màn hình Danh sách người.'];
  }

  const capXoa = cacCap.filter((u) => u.deleted === true);
  if (capXoa.length === cacCap.length) {
    return ['Mọi cặp của người này cũng đang nằm trong thùng rác (' +
            capXoa.map((u) => u.id).join(', ') + '), nên sơ đồ vẫn chưa vẽ ra ' +
            'họ. Đưa nốt mấy cặp ấy trở lại thì mối nối mới sống lại.'];
  }
  return [];
}

function coMatTrongCap(u, personId) {
  const laPartner = (Array.isArray(u.partners) ? u.partners : []).indexOf(personId) >= 0;
  const laCon = (Array.isArray(u.children) ? u.children : [])
    .some((c) => c && c.personId === personId);
  return laPartner || laCon;
}

async function chayKhoiPhucNguoi(personId) {
  if (N.dangLuu) return;

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';
  const kq  = restorePerson(state.tree, personId, { boi, luc });
  if (!kq) {
    hienNhan('Không đưa trở lại được — bản ghi vừa đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ten = tenTrongCay(kq.tree, personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'restore',
    target: personId,
    note:   'Đưa ' + ten + ' trở lại gia phả từ thùng rác.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Người này VẪN đang trong thùng rác.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(personId);
  baoXongMotViec('Đã đưa ' + ten + ' trở lại gia phả.');
}

/**
 * Đưa một cặp đã xoá trở lại.
 *
 * @param {string} unionId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 */
export function khoiPhucCap(unionId, xuLy = {}) {
  const u = timCapTrongCay(unionId);
  if (!u) {
    moHopBao('Không tìm thấy cặp',
             'Không còn cặp nào mang mã ' + unionId + '. Tải lại trang rồi mở ' +
             'lại thùng rác.', true);
    return;
  }
  if (u.deleted !== true) {
    moHopBao('Cặp này đang ở trong gia phả',
             'Cặp ' + unionId + ' không nằm trong thùng rác nữa — có thể người ' +
             'khác vừa đưa nó trở lại. Tải lại trang để thấy bản mới nhất.', false);
    return;
  }

  const ten = (Array.isArray(u.partners) ? u.partners : [])
    .filter(Boolean).map((id) => tenTrongCay(state.tree, id));

  const chan = moHopTrang('chon', xuLy, 'Đưa cặp trở lại',
                          (ten.length > 0 ? ten.join('  ↔  ') : 'Cặp chưa có ai') +
                          '  ·  ' + unionId);
  hienNhan('Cặp trở lại là mọi mối nối của nó trở lại cùng một lúc: vợ chồng, ' +
           'và cả quan hệ cha mẹ – con của những người con đứng dưới.',
           false, cauKeKhiCapTroLai(u));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayKhoiPhucCap(unionId)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/** Cặp sống lại mà người trong cặp vẫn nằm trong thùng rác thì phải nói ra. */
function cauKeKhiCapTroLai(u) {
  const ra = [];

  const conXoa = (Array.isArray(u.partners) ? u.partners : [])
    .filter(Boolean)
    .filter((id) => {
      const p = timNguoiTrongCay(id);
      return p && p.deleted === true;
    });

  if (conXoa.length > 0) {
    ra.push('Vẫn còn ' + conXoa.map((id) => tenTrongCay(state.tree, id)).join(', ') +
            ' đang nằm trong thùng rác, nên sơ đồ chưa vẽ ra cặp này. Đưa nốt ' +
            'họ trở lại thì mới thấy.');
  }

  const soCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId).length;
  if (soCon > 0) {
    ra.push(soCon + ' người con sẽ có lại cha mẹ trên sơ đồ.');
  }
  return ra;
}

async function chayKhoiPhucCap(unionId) {
  if (N.dangLuu) return;

  const kq = restoreUnion(state.tree, unionId);
  if (!kq) {
    hienNhan('Không đưa trở lại được — cặp vừa đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ketQua = await ghiBanGhi(null, [kq.union], {
    action: 'restore',
    target: unionId,
    note:   'Đưa cặp ' + unionId + ' trở lại gia phả từ thùng rác.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Cặp này VẪN đang trong thùng rác.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(unionId);
  baoXongMotViec('Đã đưa cặp ' + unionId + ' trở lại gia phả.');
}

// ============================================================
// DỌN THÙNG RÁC — XOÁ THẬT (việc 6B)
// ============================================================
//
// --- Vì sao chỉ có ĐÚNG MỘT CỬA ------------------------------------------
//
// Yêu cầu *"cần có chức năng xoá thật, nếu không sau này db sẽ tràn ngập rác"*
// đi ngược một luật đã chốt từ đầu dự án: *không xoá cứng, xoá là đặt cờ*.
// Hai thứ hoà được, và cách hoà quyết định toàn bộ chỗ đứng của mã dưới đây:
//
//   > Đường xoá THƯỜNG giữ nguyên xoá mềm. Xoá thật CHỈ có một cửa: nút
//   > *Dọn thùng rác* trong chính màn hình Thùng rác.
//
// Người bấm *"Xoá khỏi gia phả"* giữa lúc đang xem sơ đồ KHÔNG ở tâm thế dọn
// dẹp — họ đang sửa một bản ghi. Đặt một thao tác không lùi được vào giữa dòng
// công việc bình thường là cách chắc chắn nhất để có ngày mất dữ liệu thật.
//
// --- BỐN BƯỚC, KHÔNG ĐẢO THỨ TỰ ------------------------------------------
//
//   1. Sao lưu TRƯỚC       — MÁY CHỦ làm, không hỏi, và với lệnh này nó là
//                            ĐIỀU KIỆN: không cất được bản cũ thì không dọn
//   2. Gỡ mã khỏi unions   — `applyPurge`, hàm thuần
//   3. Xoá bản ghi         — cùng `applyPurge`, cùng một lần `luuCay`
//   4. Xoá FILE ẢNH Drive  — SAU khi máy chủ đã gật, không bao giờ trước
//
// ⚠ Bước 4 phải đứng sau bước 3, và đây là chỗ dễ làm ngược nhất. Xoá file
// trước rồi lần ghi hỏng thì ảnh mất mà bản ghi vẫn còn trỏ vào nó — hỏng theo
// kiểu tệ nhất, vì màn hình vẫn nói mọi thứ bình thường.

/**
 * Hộp xác nhận dọn thùng rác. Nói ra CON SỐ trước khi người dùng bấm.
 *
 * @param {{onDaLuu?:function()}} [xuLy]
 */
export function donThungRac(xuLy = {}, chiNhung = null) {
  if (!state.tree) {
    moHopBao('Chưa mở được gia phả',
             'Chưa nạp được gia phả nên chưa dọn được gì. Tải lại trang rồi thử lại.',
             true);
    return;
  }

  const ke = planPurge(state.tree, chiNhung);
  if (ke.trong) {
    moHopBao('Không có gì để xoá',
             Array.isArray(chiNhung)
               ? 'Những dòng vừa chọn không còn nằm trong thùng rác — có thể ' +
                 'người khác vừa dọn. Tải lại trang rồi mở lại thùng rác.'
               : 'Thùng rác trống. Nó chỉ chứa thứ đã bị xoá, mà hiện chưa có ' +
                 'bản ghi nào mang cờ ấy.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy,
                          Array.isArray(chiNhung) ? 'Xoá vĩnh viễn' : 'Dọn cả thùng rác',
                          'Xoá vĩnh viễn  ·  ' + moTaKePurge(ke));
  hienNhan('Xoá vĩnh viễn ' + moTaKePurge(ke) + '. KHÔNG hoàn tác được từ ' +
           'trong app.', true, cauKeKhiDonRac(ke));

  chan.append(
    nutChanXoa('Xoá vĩnh viễn', true, () => chayDonThungRac(xuLy, chiNhung)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Những gì người dùng phải biết TRƯỚC khi bấm. **BỐN dòng, không hơn.**
 *
 * Kể TÊN chứ không chỉ kể số. Người ta nhớ mình vừa xoá ai, không nhớ mình vừa
 * xoá mấy bản ghi — và cái tên là thứ duy nhất cho họ nhận ra mình đang sắp
 * xoá nhầm.
 *
 * ⚠ CON SỐ BỐN LÀ MỘT RÀNG BUỘC BỐ CỤC, KHÔNG PHẢI SỞ THÍCH. Bản đầu của hàm
 * này kể SÁU dòng, mỗi ý một dòng — đọc mã thì thấy đầy đủ và chu đáo. Ảnh
 * chụp khung 390px cho thấy sáu dòng ấy đẩy nút *Xoá vĩnh viễn* xuống quá mép
 * dưới: người dùng phải cuộn đi tìm nút, và người đi tìm nút thì không đọc
 * dòng nào cả. Tức là hộp càng kể kỹ thì càng ít người đọc — đúng ngược lại
 * điều nó sinh ra để làm.
 *
 * Nên ba cặp ý được gộp lại: cặp phải gỡ + cặp thành thừa, file ảnh + ảnh mất
 * theo chủ. Thêm ý mới vào đây thì phải gộp bớt chỗ khác, và **chụp lại
 * `xem-don-rac.mjs` mà nhìn**, không kết luận bằng cách đọc mã.
 */
function cauKeKhiDonRac(ke) {
  const ra = [];

  if (ke.personIds.length > 0) {
    const ten = ke.personIds.slice(0, 4)
      .map((id) => tenTrongCay(state.tree, id) || id);
    ra.push(ten.join(', ') +
            (ke.personIds.length > 4 ? ' và ' + (ke.personIds.length - 4) + ' người nữa' : '') +
            '.');
  }

  if (ke.capPhaiGo.length > 0) {
    ra.push(ke.capPhaiGo.length + ' cặp còn trong gia phả đang giữ mã của họ; ' +
            'mã ấy được gỡ đi, sơ đồ không đổi.' +
            (ke.capHetLyDo.length > 0
              ? ' ' + ke.capHetLyDo.length + ' cặp thành cặp thừa (' +
                ke.capHetLyDo.join(', ') + ') — dọn nốt ở màn hình Rà soát.'
              : ''));
  }

  if (ke.fileIds.length > 0) {
    ra.push(ke.fileIds.length + ' file ảnh vào thùng rác Drive, nằm đó thêm 30 ngày.' +
            (ke.anhLacChu.length > 0
              ? ' ' + ke.anhLacChu.length + ' tấm mất theo chủ, dù chưa ai gỡ.'
              : ''));
  }

  ra.push('Máy chủ tự cất bản sao lưu trước khi xoá. Không cất được thì không dọn.');
  return ra;
}

async function chayDonThungRac(xuLy, chiNhung) {
  if (N.dangLuu) return;

  const ke = planPurge(state.tree, chiNhung);
  if (ke.trong) {
    hienNhan('Thùng rác vừa trống — có thể người khác đã dọn. Không còn gì để làm.',
             false);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang sao lưu rồi dọn…', false);

  // BƯỚC 2 + 3, trong MỘT lần lưu. `applyPurge` chạy lại trên BẢN NHÁP chứ
  // không dùng cây đã tính lúc mở hộp: bản nháp là bản mới nhất, và tính lại
  // trên chính nó là cách duy nhất để không ghi xuống một kết quả cũ. Người
  // khác vừa đổi gì thì dấu vân tay của `luuCay()` chặn cả lần ghi.
  let ketQua;
  try {
    ketQua = await luuCay((cay) => {
      const kq = applyPurge(cay, chiNhung);
      if (!kq) {
        throw new Error('Bản trên Drive không còn thứ nào trong số vừa chọn. ' +
                        'Tải lại trang rồi mở lại thùng rác.');
      }
      cay.persons = kq.tree.persons;
      cay.unions  = kq.tree.unions;
      cay.media   = kq.tree.media;
    }, {
      action: 'purge',
      target: '',
      note:   (Array.isArray(chiNhung) ? 'Thùng rác: xoá vĩnh viễn '
                                       : 'Dọn cả thùng rác: xoá vĩnh viễn ') +
              moTaKePurge(ke) + '.',
      diff:   { persons: [state.tree.persons.length, state.tree.persons.length - ke.personIds.length],
                unions:  [state.tree.unions.length,  state.tree.unions.length  - ke.unionIds.length] },
    });
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'CHƯA xoá gì cả — mọi thứ vẫn nằm nguyên trong thùng rác.');
    return;
  }

  // BƯỚC 4 — và chỉ tới đây mới được chạm vào file trên Drive.
  const anh = await donAnhTrenDrive(ke.fileIds);

  if (xuLy && xuLy.onDaLuu) xuLy.onDaLuu();
  if (!N.lopPhu) return;

  baoXongMotViec('Đã xoá vĩnh viễn ' + moTaKePurge(ke) + '.',
                 cauKetQuaDonRac(ketQua, ke, anh));
}

/**
 * Bước 4. Trả về `null` khi không có ảnh nào phải dọn — nơi gọi phải phân biệt
 * *"không có ảnh nào"* với *"có ảnh mà xoá hỏng"*.
 *
 * ⚠ Hỏng ở đây KHÔNG làm hỏng cả việc dọn. Bản ghi đã xoá xong và đã ghi
 * xuống Drive rồi; một file ảnh còn nằm lại chỉ tốn vài chục KB, còn báo đỏ
 * lên màn hình lúc này sẽ khiến người dùng tưởng cả lần dọn đã hỏng.
 */
async function donAnhTrenDrive(fileIds) {
  if (!fileIds || fileIds.length === 0) return null;
  try {
    return await xoaAnhThat(fileIds);
  } catch (e) {
    return { ok: false, soXoa: 0, soHong: fileIds.length,
             loi: e && e.message ? e.message : String(e) };
  }
}

/** Mấy dòng kể lại việc vừa xong. Bản sao lưu đứng đầu — nó là đường lùi. */
function cauKetQuaDonRac(ketQua, ke, anh) {
  const ra = [];

  if (ketQua && ketQua.saoLuu) {
    ra.push('Bản sao lưu trước khi xoá: ' + ketQua.saoLuu +
            ' — nằm trong thư mục Sao_luu trên Drive.');
  }

  if (anh === null) {
    // Không có ảnh nào: không kể ra hàng đó. Trường trống thì không vẽ.
  } else if (anh && anh.soHong === 0) {
    ra.push(anh.soXoa + ' file ảnh đã vào thùng rác Drive, giữ thêm 30 ngày.');
  } else if (anh) {
    ra.push(anh.soXoa + ' file ảnh đã vào thùng rác Drive; ' + anh.soHong +
            ' file không xoá được (có thể đã bị xoá tay từ trước). Bản ghi ' +
            'trong gia phả thì đã sạch — chỗ này chỉ còn là file thừa trên Drive.');
  }

  if (ke.capHetLyDo.length > 0) {
    ra.push('Còn ' + ke.capHetLyDo.length + ' cặp không còn lý do tồn tại. ' +
            'Mở Danh sách người → Rà soát để dọn nốt.');
  }
  return ra;
}

// ============================================================
// CHỌN NHIỀU DÒNG — khôi phục hàng loạt, và gom rác vào thùng rác (bước 38)
// ============================================================
//
// Thùng rác từ bước 38 làm việc theo lối quen thuộc của mọi thùng rác: **chọn
// một, chọn nhiều, hoặc chọn tất cả**, rồi mới quyết định *Khôi phục* hay *Xoá
// vĩnh viễn*. Hai hàm dưới đây là chỗ đến của hai nút ấy.
//
// ⚠ **Chọn ĐÚNG MỘT dòng thì đi lại đường cũ của bước 29**, chứ không dùng hộp
// gộp. Hộp cũ kể được những thứ hộp gộp không kể nổi: *"mọi cặp của người này
// cũng đang trong thùng rác, đưa mỗi họ trở lại thì sơ đồ vẫn chưa vẽ ra"*, hay
// *"3 người con sẽ có lại cha mẹ"*. Gộp hết vào một hộp chung là đánh đổi mất
// những câu ấy để lấy một nhánh mã ít hơn — đổi sai chiều.

/**
 * Đưa NHIỀU người và cặp trở lại gia phả trong MỘT lần lưu.
 *
 * @param {string[]} ids  mã người (`P…`) và mã cặp (`U…`) lẫn lộn
 * @param {{onDaLuu?:function()}} [xuLy]
 */
export function khoiPhucNhieu(ids, xuLy = {}) {
  const ds = locMaDaXoa(ids);
  if (ds.length === 0) {
    moHopBao('Không còn gì để đưa trở lại',
             'Những dòng vừa chọn không còn nằm trong thùng rác. Tải lại trang ' +
             'rồi mở lại thùng rác.', false);
    return;
  }

  // Một dòng thì trả về đúng hộp của bước 29 — xem ghi chú ở đầu khối.
  if (ds.length === 1) {
    if (ds[0][0] === 'U') khoiPhucCap(ds[0], xuLy);
    else                  khoiPhucNguoi(ds[0], xuLy);
    return;
  }

  const soNguoi = ds.filter((id) => id[0] !== 'U').length;
  const soCap   = ds.length - soNguoi;

  const chan = moHopTrang('chon', xuLy, 'Đưa trở lại gia phả', moTaSoLuong(soNguoi, soCap));
  hienNhan('Cả ' + ds.length + ' bản ghi sẽ hiện lại đúng chỗ cũ — xoá mềm ' +
           'không gỡ một mối nối nào, nên không có gì phải nối lại.',
           false, keTenVaiDong(ds));

  chan.append(
    nutChanDam('Đưa trở lại', () => chayNhieuBanGhi(ds, xuLy, false)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Gom rác vào thùng rác: XOÁ MỀM nhiều bản ghi trong MỘT lần lưu.
 *
 * Đây là chỗ đến của nút *Cho vào thùng rác* ở màn hình Rà soát. Nó **không
 * xoá thật** — thùng rác mới là nơi quyết định điều đó, và đó chính là lý do
 * quy trình này an toàn: người dùng gom cả nắm rác bằng một cú bấm, rồi ngồi
 * xem lại từng dòng ở thùng rác trước khi xoá hẳn.
 *
 * @param {string[]} ids
 * @param {{onDaLuu?:function()}} [xuLy]
 */
export function chuyenVaoThungRac(ids, xuLy = {}) {
  const ds = locMaConSong(ids);
  if (ds.length === 0) {
    moHopBao('Không còn gì để cho vào thùng rác',
             'Những dòng vừa chọn đã nằm trong thùng rác, hoặc không còn trong ' +
             'gia phả. Bấm *Rà lại* để xem bản mới nhất.', false);
    return;
  }

  const soNguoi = ds.filter((id) => id[0] !== 'U').length;
  const soCap   = ds.length - soNguoi;

  const chan = moHopTrang('chon', xuLy, 'Cho vào thùng rác', moTaSoLuong(soNguoi, soCap));
  hienNhan('Xoá mềm: bản ghi vẫn nằm nguyên trong file, chỉ mang thêm một cái ' +
           'cờ, và sơ đồ thôi vẽ ra chúng. Lấy lại được bất cứ lúc nào từ ' +
           'thùng rác.', false,
           keTenVaiDong(ds).concat([
             'Muốn xoá hẳn thì vào thùng rác chọn rồi bấm Xoá vĩnh viễn — đó là ' +
             'cửa duy nhất xoá được thật.',
           ]));

  chan.append(
    nutChanDam('Cho vào thùng rác', () => chayNhieuBanGhi(ds, xuLy, true)),
    nutChanXoa('Huỷ', false, () => closePersonForm()),
  );
}

/**
 * Lật cờ `deleted` cho cả loạt trong MỘT lần lưu — luật 4 của đường ghi.
 *
 * ⚠ Bốn hàm `softDelete*`/`restore*` đều trả về CÂY MỚI, nên phải nối đuôi
 * nhau: cây ra của bản ghi này là cây vào của bản ghi kế. Chạy từng cái trên
 * `cay` gốc rồi gán lần lượt thì chỉ bản ghi cuối cùng sống sót — mà máy chủ
 * vẫn gật, `revision` vẫn tăng, và màn hình vẫn báo "đã xong" cho một việc làm
 * được đúng một phần.
 *
 * @param {boolean} vaoThungRac  true = xoá mềm · false = đưa trở lại
 */
async function chayNhieuBanGhi(ds, xuLy, vaoThungRac) {
  if (N.dangLuu) return;

  N.dangLuu = true;
  hienNhan(vaoThungRac ? 'Đang cho vào thùng rác…' : 'Đang đưa trở lại…', false);

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  let ketQua;
  try {
    ketQua = await luuCay((cay) => {
      let t = cay;
      let daLam = 0;
      for (const id of ds) {
        const kq = id[0] === 'U'
          ? (vaoThungRac ? softDeleteUnion(t, id)  : restoreUnion(t, id))
          : (vaoThungRac ? softDeletePerson(t, id, { boi, luc })
                         : restorePerson(t, id, { boi, luc }));
        if (kq) { t = kq.tree; daLam++; }
      }
      if (daLam === 0) {
        throw new Error('Bản trên Drive không còn bản ghi nào trong số vừa chọn ' +
                        'ở đúng trạng thái ấy. Tải lại trang rồi làm lại.');
      }
      cay.persons = t.persons;
      cay.unions  = t.unions;
    }, {
      action: vaoThungRac ? 'delete' : 'restore',
      target: '',
      note:   (vaoThungRac ? 'Cho vào thùng rác ' : 'Đưa trở lại từ thùng rác ') +
              ds.length + ' bản ghi: ' + ds.join(' ') + '.',
      diff:   {},
    });
  } catch (e) {
    ketQua = { ok: false, loi: e && e.message ? e.message : String(e) };
  }

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, vaoThungRac
      ? 'CHƯA cho gì vào thùng rác cả.'
      : 'Mọi thứ VẪN đang nằm trong thùng rác.');
    return;
  }

  if (xuLy && xuLy.onDaLuu) xuLy.onDaLuu();
  baoXongMotViec(vaoThungRac
    ? 'Đã cho ' + ds.length + ' bản ghi vào thùng rác.'
    : 'Đã đưa ' + ds.length + ' bản ghi trở lại gia phả.');
}

/** Chỉ giữ mã đang MANG cờ `deleted` — thứ thùng rác làm việc trên đó. */
function locMaDaXoa(ids) {
  return locMa(ids, true);
}

/** Chỉ giữ mã đang CÒN trong gia phả — thứ màn hình Rà soát làm việc trên đó. */
function locMaConSong(ids) {
  return locMa(ids, false);
}

/**
 * ⚠ Đọc thẳng `state.tree`, KHÔNG đọc `state.index`: `buildIndex()` bỏ qua mọi
 * bản ghi mang cờ `deleted`, nên tra chỉ mục ở đây là luôn không thấy gì.
 */
function locMa(ids, mongDaXoa) {
  const ds = Array.isArray(ids) ? ids : [];
  return ds.filter((id) => {
    const x = id && id[0] === 'U' ? timCapTrongCay(id) : timNguoiTrongCay(id);
    return !!x && (x.deleted === true) === mongDaXoa;
  });
}

/** "3 người và 2 cặp" — trường trống thì không kể ra hàng đó. */
function moTaSoLuong(soNguoi, soCap) {
  const phan = [];
  if (soNguoi > 0) phan.push(soNguoi + ' người');
  if (soCap > 0)   phan.push(soCap + ' cặp');
  return phan.join(' và ');
}

/** Vài cái tên đầu, để người đọc nhận ra mình đang làm gì với ai. */
function keTenVaiDong(ds) {
  const ten = ds.slice(0, 4).map((id) => (id[0] === 'U'
    ? 'Cặp ' + id
    : (tenTrongCay(state.tree, id) || id)));
  return [ten.join(', ') +
          (ds.length > 4 ? ' và ' + (ds.length - 4) + ' bản ghi nữa' : '') + '.'];
}

/** Báo xong, và để lại đúng một nút Đóng — cùng khuôn với đường hoàn tác. */
function baoXongMotViec(cau, dong) {
  hienNhan(cau, false, dong);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}

