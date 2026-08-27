// ============================================================
// giapha · js/pages/form-go-noi.js
// Vai trò  : GỠ NỐI một mối quan hệ — luật 9 và luật 10, kèm hộp kể hậu quả
//            và đường nối lại như cũ
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/person-edit.js (nền dùng chung), state,
//            domains/{union,validate}, utils/graph, config
// Phiên bản: 1.0.0 · Cập nhật: 27/08/2026 20:00
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 4 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào.
//
// ⚠ **Vì sao gỡ nối ra riêng mà THÊM nối thì không.** `quickAddParent` ·
// `quickAddSpouse` · `linkExisting` dùng chung đúng cái form thêm người của hồ
// sơ (`moForm` · `veCacO` · `gomThayDoi`), tách ra là kéo theo nửa form ấy. Còn
// `unlink` thì `form-sua-con.js` và `form-gia-dinh.js` đều gọi, mà hai file ấy
// lại bị `person-edit.js` nhập vào để xuất lại — để `unlink` ở đó là dựng một
// vòng nhập hai chiều không cần thiết.

import { N, TEN_QUAN_HE, closePersonForm, canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi,
         keTenPartner, tenNguoi, moTaCap, moHopTrang, moHopChon, moHopBao,
         nutChon, nutChanXoa } from './person-edit.js';
import { state } from '../state.js';
import { removeChild, removePartner, softDeleteUnion, conLyDoTonTai,
         getParentUnions, getSpouses, getChildren } from '../domains/union.js';
import { checkOrphanNode } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { chuThichQuanHe } from '../config.js';

let goHT = null;   // chế độ go : kết quả doHauQuaGoNoi() của lần mở này

/** `closePersonForm()` gọi hàm này — xem `form-sap-thu-tu.js`. */
export function donDepGoNoi() {
  goHT = null;
}

// ============================================================
// GỠ NỐI — luật 9 và luật 10
// ============================================================

/**
 * Mở danh sách mối nối của một người để chọn cái cần gỡ.
 *
 * ⚠ CHA MẸ ĐƯỢC KỂ THEO CẶP, MỖI CẶP MỘT DÒNG — không kể từng người một. Đây là
 * luật 9 hiện ra thành hình: thứ gỡ được là mối nối tới CẶP, nên hai dòng
 * *"gỡ nối với cha"* và *"gỡ nối với mẹ"* sẽ làm đúng cùng một việc. Hai nút
 * khác chữ mà cùng kết quả là thứ làm người dùng tin sai về dữ liệu của mình.
 *
 * Vợ/chồng và con thì ngược lại: mỗi người là một mối nối riêng, gỡ được riêng.
 */
export function goNoiNguoi(personId, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;

  const cacMuc = [];

  for (const u of getParentUnions(index, personId)) {
    cacMuc.push({
      ma: 'parent:' + u.id,
      chu: 'Cha mẹ: ' + keTenPartner(u.id),
      phu: 'Gỡ khỏi CẢ CẶP — không tách riêng cha hay mẹ được  ·  ' + u.id,
      nguyHiem: true,
      chay: () => unlink(personId, '', 'parent', Object.assign({ unionId: u.id }, xuLy)),
    });
  }

  for (const m of getSpouses(index, personId)) {
    cacMuc.push({
      ma: 'spouse:' + m.personId,
      chu: 'Vợ / chồng: ' + tenNguoi(m.personId),
      phu: moTaCap(index.unionById.get(m.unionId) || {}),
      nguyHiem: true,
      chay: () => unlink(personId, m.personId, 'spouse',
                         Object.assign({ unionId: m.unionId }, xuLy)),
    });
  }

  for (const m of getChildren(index, personId)) {
    // Cùng phép sửa với thẻ thông tin (21/08/2026): đọc CẢ NĂM mã, không riêng
    // 'adopted'. Bản cũ để `step` · `foster` · `thua_tu` rơi vào nhánh rỗng,
    // và hộp Gỡ nối kể một đứa con riêng y hệt một đứa con đẻ.
    const chuThich = chuThichQuanHe(m.relation, 'con');
    cacMuc.push({
      ma: 'child:' + m.personId,
      chu: 'Con: ' + tenNguoi(m.personId),
      phu: (chuThich ? chuThich + '  ·  ' : '') + m.unionId,
      nguyHiem: true,
      chay: () => unlink(personId, m.personId, 'child',
                         Object.assign({ unionId: m.unionId }, xuLy)),
    });
  }

  if (cacMuc.length === 0) {
    moHopBao('Gỡ nối', tenNguoi(personId) + ' chưa nối với ai trong gia phả, nên ' +
             'không có mối nối nào để gỡ.', false,
             ['Muốn nối họ vào gia phả thì dùng "Kết nối" trong menu.']);
    return;
  }

  moHopChon('chon', xuLy, {
    tieuDe: 'Gỡ nối',
    phu:    tenNguoi(personId) + '  ·  ' + personId,
    cauMo:  'Bỏ mối nối nào? Không ai bị xoá khỏi gia phả — chỉ mối nối mất đi.',
    cacMuc,
  });
}

/**
 * Gỡ một mối nối, có hộp xác nhận kể tên hậu quả và có đường hoàn tác.
 *
 * @param {string} personId
 * @param {string} targetId  người bên kia. RỖNG khi `relationType === 'parent'`,
 *        vì thứ bị gỡ ở đó là mối nối tới cả CẶP chứ không tới một người (luật 9).
 * @param {'parent'|'spouse'|'child'} relationType
 * @param {{unionId?:string, onDaLuu?:function(string)}} [xuLy]
 *        `unionId` chỉ đúng cặp cần gỡ. Bỏ trống thì hàm tự tìm, và HỎI khi có
 *        nhiều hơn một cặp khớp — `P0020` có hai bộ cha mẹ là ca thật.
 */
export function unlink(personId, targetId, relationType, xuLy = {}) {
  const index = state.index;
  if (!index || !index.personById.has(personId)) return;
  if (!TEN_QUAN_HE[relationType]) return;

  const hop = capKhopVoi(personId, targetId, relationType);

  if (hop.length === 0) {
    moHopBao('Gỡ nối', 'Không tìm thấy mối nối này nữa. Có thể gia phả vừa thay ' +
             'đổi. Tải lại trang rồi thử lại.', true);
    return;
  }

  const daChon = xuLy.unionId && hop.indexOf(xuLy.unionId) >= 0 ? xuLy.unionId
               : (hop.length === 1 ? hop[0] : '');

  if (!daChon) {
    moHopChon('chon', xuLy, {
      tieuDe: 'Gỡ nối',
      phu:    tenNguoi(personId) + '  ·  ' + personId,
      cauMo:  'Mối nối này có ở ' + hop.length + ' cặp. Gỡ khỏi cặp nào?',
      cacMuc: hop.map((uid) => ({
        ma: uid,
        chu: keTenPartner(uid),
        phu: moTaCap(index.unionById.get(uid) || {}),
        nguyHiem: true,
        chay: () => unlink(personId, targetId, relationType,
                           Object.assign({}, xuLy, { unionId: uid })),
      })),
    });
    return;
  }

  moHopXacNhanGo(personId, targetId, relationType, daChon, xuLy);
}

/** Mã những cặp mang đúng mối nối được hỏi. */
function capKhopVoi(personId, targetId, loai) {
  const index = state.index;
  const ra = [];

  if (loai === 'parent') {
    for (const u of getParentUnions(index, personId)) ra.push(u.id);
  } else if (loai === 'spouse') {
    for (const m of getSpouses(index, personId)) if (m.personId === targetId) ra.push(m.unionId);
  } else {
    for (const m of getChildren(index, personId)) if (m.personId === targetId) ra.push(m.unionId);
  }
  return ra.filter((id, i) => ra.indexOf(id) === i);
}

function moHopXacNhanGo(personId, targetId, loai, unionId, xuLy) {
  const chan = moHopTrang('go', xuLy, 'Gỡ nối',
                          tenNguoi(personId) + '  ·  ' + personId);

  // Luật 8, dùng lại nguyên vẹn cho đường này: dựng cây đã gỡ NGAY BÂY GIỜ, đọc
  // hậu quả từ chính nó, rồi giữ đúng bản ghi ấy để lát nữa ghi xuống. Tính một
  // lần, dùng hai việc — không có khe nào cho hai bên nghĩ khác nhau.
  goHT = doHauQuaGoNoi(personId, targetId, loai, unionId);

  const canTro = canTroLuu();
  if (canTro || !goHT) {
    hienNhan(canTro || 'Không dựng được bản ghi đã gỡ. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  hienNhan('Gỡ xong thì:', false, cauKeHauQuaGoNoi(personId, targetId, loai, unionId));

  N.nutLuu = nutChanXoa('Gỡ mối nối này', true, () => chayGoNoi(personId, targetId, loai));
  chan.append(N.nutLuu, nutChanXoa('Không gỡ', false, () => closePersonForm()));
}

/**
 * Dựng cây đã gỡ, rồi đọc ra hậu quả bằng cách SO hai chỉ mục.
 *
 * @returns {{tree, union, banCu, diff, capChet, thanhLe, conMatChaMe}|null}
 *
 * `banCu` là bản chép nguyên vẹn của cặp TRƯỚC khi gỡ — đường hoàn tác ghi
 * thẳng bản ấy trở lại, không dựng lại từ `diff`. Dựng lại từ `diff` thì mỗi
 * trường thêm vào sau này là một trường bị quên.
 *
 * `thanhLe` — ai sau lần gỡ này không còn nối với ai. Chạy `checkOrphanNode`
 * hai lượt trên hai chỉ mục và chỉ giữ người ĐỔI trạng thái: ai vốn đã đứng lẻ
 * từ trước thì không phải hậu quả của việc hôm nay.
 */
function doHauQuaGoNoi(personId, targetId, loai, unionId) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu = index.unionById.get(unionId);
  if (!cu) return null;
  const banCu = JSON.parse(JSON.stringify(cu));

  const kq = (loai === 'spouse')
    ? removePartner(state.tree, unionId, targetId)
    : removeChild(state.tree, unionId, loai === 'child' ? targetId : personId);
  if (!kq) return null;

  let tree  = kq.tree;
  let union = kq.union;
  const diff = Object.assign({}, kq.diff);

  // Luật 10: gỡ xong phải hỏi tiếp *"cặp này còn khẳng định được điều gì không"*.
  let capChet = false;
  if (!conLyDoTonTai(union)) {
    const kqX = softDeleteUnion(tree, unionId);
    if (kqX) {
      tree = kqX.tree; union = kqX.union; capChet = true;
      Object.assign(diff, kqX.diff);
    }
  }

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không gỡ còn hơn gỡ mù
  }

  // Chỉ những người CÓ MẶT trong cặp cũ mới có thể đổi trạng thái vì lần gỡ này.
  // Đúng MỘT bước từ cặp ấy, nên không phải phép duyệt đồ thị, không cần `visited`.
  const lienQuan = new Set([personId, targetId]);
  for (const id of (Array.isArray(banCu.partners) ? banCu.partners : [])) {
    if (id) lienQuan.add(id);
  }
  for (const c of (Array.isArray(banCu.children) ? banCu.children : [])) {
    if (c && c.personId) lienQuan.add(c.personId);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  // Luật 9: gỡ một người khỏi hàng vợ/chồng của cặp CÒN CON thì họ đồng thời
  // thôi làm cha/mẹ của những người con ấy.
  const conMatChaMe = (loai === 'spouse')
    ? (Array.isArray(banCu.children) ? banCu.children : [])
        .map((c) => c && c.personId)
        .filter((id) => id && index.personById.has(id))
    : [];

  return { tree, union, banCu, diff, capChet, thanhLe, conMatChaMe };
}

/** Từng dòng hậu quả của đường GỠ, viết cho người không lập trình đọc. */
function cauKeHauQuaGoNoi(personId, targetId, loai, unionId) {
  const A = tenNguoi(personId);
  const B = tenNguoi(targetId);
  const dong = [];

  if (loai === 'spouse') {
    dong.push(B + ' và ' + A + ' thôi là vợ chồng. Hai bản ghi người vẫn còn ' +
              'nguyên trong gia phả, không ai bị xoá.');
    if (goHT.conMatChaMe.length > 0) {
      dong.push('⚠ ' + B + ' đồng thời thôi làm cha/mẹ của ' +
                goHT.conMatChaMe.map(tenNguoi).join(' · ') +
                '. Trong gia phả này quan hệ cha mẹ – con đi QUA cặp, nên không ' +
                'tách riêng được. Nếu bạn chỉ muốn ghi là hai người đã ly hôn mà ' +
                'vẫn giữ quan hệ cha con thì ĐỪNG gỡ nối ở đây.');
    }
  } else if (loai === 'child') {
    dong.push(B + ' thôi là con của ' + keTenPartner(unionId) + '. Bản ghi của ' +
              B + ' vẫn còn nguyên, không bị xoá.');
  } else {
    dong.push(A + ' thôi là con của ' + keTenPartner(unionId) + ' — CẢ CẶP, ' +
              'không tách riêng cha hay mẹ được.');
  }

  if (goHT.capChet) {
    dong.push('Cặp ' + unionId + ' sau đó không còn nói lên điều gì nữa (không ' +
              'còn đủ hai vợ chồng, cũng không còn quan hệ cha mẹ – con nào), ' +
              'nên app xoá luôn cặp ấy. Bản ghi cặp vẫn nằm trong file, mang dấu ' +
              '"đã xoá", và "Hoàn tác" đưa lại được nguyên vẹn.');
  }

  for (const id of goHT.thanhLe) {
    dong.push('⚠ ' + tenNguoi(id) + ' sẽ MẤT ĐƯỜNG VỀ. Sau khi gỡ, không sơ đồ ' +
              'nào còn vẽ ra họ nữa. Bản ghi vẫn nguyên vẹn, và tìm lại được ' +
              'bằng nút 🔍 ở góc trên phải rồi nối lại bằng "Kết nối" — nhưng ' +
              'nếu bạn không định làm thế thì cân nhắc nối họ vào chỗ khác trước.');
  }

  dong.push('Bấm "Hoàn tác" ngay sau đó là trả lại mối nối cũ, nguyên vẹn.');
  return dong;
}

async function chayGoNoi(personId, targetId, loai) {
  if (N.dangLuu || !goHT) return;

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang gỡ…', false);

  const unionId = goHT.union.id;
  const banCu   = goHT.banCu;
  const cau     = (loai === 'spouse')
    ? 'Gỡ ' + tenNguoi(targetId) + ' khỏi hàng vợ/chồng của ' + unionId
    : (loai === 'child'
      ? 'Gỡ ' + tenNguoi(targetId) + ' khỏi hàng con của ' + unionId
      : 'Gỡ ' + tenNguoi(personId) + ' khỏi hàng con của ' + unionId);

  const ketQua = await ghiBanGhi(null, [goHT.union], {
    action: 'update',
    target: unionId,
    note:   cau + (goHT.capChet ? ', và xoá mềm cặp ấy vì nó không còn nói lên gì.' : '.'),
    diff:   goHT.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Mối nối này CHƯA bị gỡ.');
    return;
  }

  // Vẽ lại ngay, trong lúc hộp vẫn mở: người dùng nhìn thấy kết quả rồi mới
  // quyết định có hoàn tác hay không. Cùng lối của đường xoá (bước 21).
  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(personId);

  N.nutLuu = null;
  hienNhan('Đã gỡ mối nối.', false,
           goHT.capChet
             ? ['Cặp ' + unionId + ' cũng đã được xoá mềm cùng lúc.']
             : []);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — nối lại như cũ', true, () => chayHoanTacGoNoi(personId, banCu)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  N.khoiKetQua.append(hang);
}

/**
 * Hoàn tác của đường gỡ: đặt NGUYÊN bản ghi cặp cũ trở lại.
 *
 * Một lần ghi, không phải hai, kể cả khi lần gỡ đã làm hai việc (gỡ mối nối +
 * xoá mềm cặp): cả hai việc ấy đều nằm trong đúng MỘT bản ghi cặp, nên ghi đè
 * bản cũ là hoàn nguyên cả hai. Đây chính là món lợi của việc `softDeleteUnion`
 * chỉ lật một cờ chứ không dọn mảng nào.
 */
async function chayHoanTacGoNoi(personId, banCu) {
  if (N.dangLuu) return;
  N.dangLuu = true;
  hienNhan('Đang nối lại…', false);

  const ketQua = await ghiBanGhi(null, [banCu], {
    action: 'restore',
    target: banCu.id,
    note:   'Hoàn tác: trả lại nguyên trạng cặp ' + banCu.id + '.',
    diff:   {},
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Mối nối VẪN đang bị gỡ.');
    return;
  }

  if (N.xuLyNgoai.onDaLuu) N.xuLyNgoai.onDaLuu(personId);

  hienNhan('Đã nối lại như cũ.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}
