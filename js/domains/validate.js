// ============================================================
// giapha · js/domains/validate.js
// Vai trò  : Rà soát dữ liệu gia phả — chặn cái sai chắc chắn, cảnh báo cái đáng ngờ
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phụ thuộc: utils/date.js, utils/graph.js, utils/text.js, domains/union.js
// Phiên bản: 1.5.0 · Cập nhật: 26/08/2026 21:30
// ============================================================
//
// HÀM THUẦN. Không gọi services, không chạm DOM, không đọc state.
// (Một ngoại lệ đã ghi rõ ở checkLifespan — người còn sống thì tuổi tính đến
// hôm nay, nên phép đó nhờ calcAge đọc đồng hồ máy.)
//
// Đây là hàng rào phía trình duyệt, KHÔNG phải hàng rào duy nhất: quyền sửa và
// xung đột phiên bản do máy chủ `gas/Code.gs` thực thi.
//
// ============================================================
// LUẬT BA KẾT QUẢ — đọc trước khi thêm bất kỳ phép rà nào
// ============================================================
//
// Rất nhiều người trong gia phả chỉ biết năm mất mà không biết năm sinh, hoặc
// chỉ biết năm sinh mà không biết năm mất — người đi chiến trường không về là
// ca điển hình, và trong họ nào cũng có. Những bản ghi ấy KHÔNG PHẢI dữ liệu
// lỗi: chúng đầy đủ đúng theo mức hiểu biết hiện nay.
//
// Vì thế mỗi phép rà trả về BA kết quả, không phải hai:
//
//   { ok: true,  level: 'ok',      message: '' }        đạt
//   { ok: true,  level: 'skip',    message: 'lý do' }   KHÔNG ĐỦ DỮ LIỆU
//   { ok: false, level: 'warning', message: '…' }       đáng ngờ, vẫn cho lưu
//   { ok: false, level: 'error',   message: '…' }       chặn, không cho lưu
//
// `ok` nói phép rà có đạt hay không. `level` nói phải LÀM GÌ — và chỉ đúng một
// giá trị `'error'` mới chặn được việc lưu.
//
// Vì sao 'skip' phải tách khỏi 'ok': với màn hình nhập liệu thì hai cái giống
// nhau — đều là không chặn, không cảnh báo. Nhưng với một bản báo cáo rà soát
// cả cây thì chúng ngược nhau: "59 người, 0 lỗi niên đại" và "59 người, 50
// người không đủ dữ liệu để kiểm" là hai câu nói về hai tình trạng khác nhau.
// Gộp lại là tự khen mình sạch nhờ chỗ mình chưa biết gì.
//
// Hệ quả bắt buộc: KHÔNG BAO GIỜ suy đoán mốc còn thiếu. Không lấy năm nay thay
// năm mất, không lấy đời cha trừ đi hai mươi làm năm sinh.
//
// ============================================================
// PHẦN LỚN LÀ CẢNH BÁO, VÀ ĐÓ LÀ CỐ Ý
// ============================================================
//
// Gia phả cũ có mâu thuẫn THẬT: cụ nào cũng có mấy niên hiệu chép lệch nhau.
// Chặn cứng thì người trong họ không ghi nổi cái họ đang có trong tay. Nên chỉ
// ba phép được chặn, và cả ba đều là chuyện KHÔNG THỂ XẢY RA về mặt vật lý:
//
//   1. Năm mất trước năm sinh
//   2. Cha/mẹ sinh sau con
//   3. Một người là tổ tiên của chính mình
//
// SÁU phép còn lại chỉ cảnh báo — kể cả "mẹ 14 tuổi lúc sinh", vì chuyện đó
// từng xảy ra thật.

import { mocNgay, soSanhNgay, chenhNam, formatDate, calcAge } from '../utils/date.js';
import { bfs } from '../utils/graph.js';
import { conLyDoTonTai, timCapTrung } from './union.js';
import { fullName, coGiaTri, removeDiacritics } from '../utils/text.js';

/**
 * Năm con số điều khiển toàn bộ mức cảnh báo. ĐÂY LÀ CHỖ DUY NHẤT sửa chúng —
 * đừng rải số 25 hay số 110 vào thân hàm.
 */
export const NGUONG = {
  tuoiLamChaMeToiThieu: 16,   // dưới mức này → cảnh báo (KHÔNG chặn)
  tuoiLamMeToiDa:       55,   // chỉ áp cho MẸ, xem checkParentAge
  lechTuoiVoChong:      25,
  tuoiThoToiDa:        110,
};

// ============================================================
// Bốn cách trả lời của một phép rà
// ============================================================

function dat()          { return { ok: true,  level: 'ok',      message: '' }; }
function boQua(lyDo)    { return { ok: true,  level: 'skip',    message: lyDo }; }
function canhBao(loi)   { return { ok: false, level: 'warning', message: loi }; }
function chan(loi)      { return { ok: false, level: 'error',   message: loi }; }

// ============================================================
// BA PHÉP CHẶN
// ============================================================

/**
 * CHẶN: năm mất không được trước năm sinh.
 *
 * Thiếu một trong hai mốc thì bỏ qua — người chỉ có năm mất, hay người chỉ có
 * năm sinh, đều là bản ghi hợp lệ. Cùng năm mà không rõ tháng cũng bỏ qua:
 * `soSanhNgay` đã lo phần đó.
 */
export function checkDeathAfterBirth(person) {
  if (!person || typeof person !== 'object') return boQua('không có bản ghi người');

  const thuTu = soSanhNgay(person.death, person.birth);
  if (thuTu === null) return boQua(lyDoThieuMoc(person));
  if (thuTu === -1) {
    return chan(moTaNguoi(person) + ': năm mất (' + formatDate(person.death) +
                ') trước năm sinh (' + formatDate(person.birth) + ').');
  }
  return dat();
}

/**
 * CHẶN: cha/mẹ sinh sau con.
 * CẢNH BÁO: cha/mẹ dưới 16 tuổi lúc sinh con, hoặc MẸ trên 55 tuổi.
 *
 * Hai mức trong một hàm vì cả hai đọc đúng một con số — khoảng cách năm sinh
 * giữa hai người. Tách ra hai hàm thì cùng một phép trừ viết hai lần.
 *
 * Ba điều đã cân nhắc rồi, đừng "sửa" lại:
 *
 * - **Cách con 0 năm chỉ CẢNH BÁO, không chặn.** Sinh cùng năm với con là
 *   không thể, nhưng `KE-HOACH` chỉ cho chặn đúng câu *"sinh sau con"*. Một
 *   khoảng cách bằng 0 thường là lỗi gõ chứ không phải người dùng cố ghi sai,
 *   mà chặn oan thì họ mất luôn cái năm vừa gõ đúng ở ô bên cạnh.
 * - **Ngưỡng 55 tuổi CHỈ áp cho mẹ** (`sex === 'M'` hay `'U'` thì bỏ). Đàn ông
 *   sinh con ở tuổi 70 là chuyện có thật và không hiếm trong gia phả cũ. Với
 *   `sex: 'U'` thì ta không biết ai mang thai, nên không đoán.
 * - **MỌI quan hệ KHÁC `'birth'` được bỏ qua hoàn toàn** — con nuôi, con
 *   riêng, con nuôi dưỡng, con thừa tự. Không quan hệ nào trong số ấy mang ràng
 *   buộc sinh học; cha mẹ nuôi trẻ hơn con nuôi là hợp lệ.
 *
 *   ⚠ **Nới từ riêng `'adopted'` ra cả bốn mã, ngày 21/08/2026 (việc 3).**
 *   Bản cũ chỉ bỏ qua đúng chữ `'adopted'`, và điều đó KHÔNG lộ ra được chừng
 *   nào chưa có đường nào ghi nổi ba mã kia: form chỉ có một ô đánh dấu "con
 *   nuôi". Việc 3 mở đường ghi cả năm mã, nên để nguyên là đánh dấu một đứa
 *   con riêng rồi nhận về một lời cảnh báo tuổi tác không có nghĩa gì.
 */
export function checkParentAge(index, parentId, childId) {
  const cha = layNguoi(index, parentId);
  const con = layNguoi(index, childId);
  if (!cha || !con) return boQua('thiếu bản ghi của cha/mẹ hoặc con');

  const quanHe = quanHeChaCon(index, parentId, childId);
  // `null` nghĩa là hai người KHÔNG nối với nhau — không phải một quan hệ nuôi.
  // Bỏ qua ở đó là bỏ qua nhầm, nên chỉ bỏ khi có quan hệ và quan hệ ấy khác đẻ.
  if (quanHe && quanHe !== 'birth') {
    return boQua('quan hệ ' + quanHe + ' — không xét tuổi sinh học');
  }

  const cach = chenhNam(cha.birth, con.birth);
  if (cach === null) {
    return boQua(!mocNgay(cha.birth) ? 'cha/mẹ không có năm sinh'
                                     : 'người con không có năm sinh');
  }

  if (cach < 0) {
    return chan(moTaNguoi(cha) + ' sinh năm ' + formatDate(cha.birth) +
                ', sau con là ' + moTaNguoi(con) + ' sinh năm ' +
                formatDate(con.birth) + '.');
  }

  if (cach < NGUONG.tuoiLamChaMeToiThieu) {
    return canhBao(moTaNguoi(cha) + ' mới khoảng ' + cach + ' tuổi khi sinh ' +
                   moTaNguoi(con) + '.');
  }

  if (cha.sex === 'F' && cach > NGUONG.tuoiLamMeToiDa) {
    return canhBao(moTaNguoi(cha) + ' khoảng ' + cach + ' tuổi khi sinh ' +
                   moTaNguoi(con) + '.');
  }

  return dat();
}

/**
 * CHẶN: nối `parentId` làm cha/mẹ của `childId` sẽ tạo ra vòng tổ tiên.
 *
 * Dùng `bfs()` của `utils/graph.js` — tập `visited` nằm sẵn trong đó. Gia phả
 * là ĐỒ THỊ: file làm việc có hai vòng do hai nhánh trong họ cưới nhau, và một
 * vòng như thế là HỢP LỆ. Cái bị chặn ở đây hẹp hơn nhiều: một người trở thành
 * tổ tiên của chính mình.
 *
 * Hàm này dùng được cho cả hai việc, và cố ý chỉ có một hàm:
 *   - trước khi nối một quan hệ mới (chat 2.4);
 *   - rà một quan hệ ĐANG CÓ trong dữ liệu — vì phép duyệt đi xuống từ người
 *     con không bao giờ đi ngược qua chính cạnh đang xét, nên `parentId` chỉ
 *     nằm trong tập hậu duệ khi đã có vòng thật.
 */
export function checkNoAncestorCycle(index, childId, parentId) {
  if (!childId || !parentId) return boQua('thiếu mã người');

  const con = layNguoi(index, childId);
  const cha = layNguoi(index, parentId);
  if (!con || !cha) return boQua('thiếu bản ghi của cha/mẹ hoặc con');

  if (childId === parentId) {
    return chan(moTaNguoi(con) + ' không thể là cha/mẹ của chính mình.');
  }

  const hauDue = bfs(childId, (id) => conCua(index, id));
  if (hauDue.has(parentId)) {
    return chan(moTaNguoi(cha) + ' vừa là cha/mẹ vừa là hậu duệ của ' +
                moTaNguoi(con) + ' — quan hệ này tạo ra vòng tổ tiên.');
  }
  return dat();
}

// ============================================================
// SÁU PHÉP CẢNH BÁO
// ============================================================

/**
 * CẢNH BÁO: tuổi thọ trên 110.
 *
 * ⚠ Phép DUY NHẤT trong file này không thuần: người còn sống thì `calcAge` tính
 * đến hôm nay, nên kết quả phụ thuộc đồng hồ máy. Chấp nhận có chủ ý — một
 * người `living: true` sinh năm 1850 là dữ liệu cần được nói ra, mà muốn biết
 * điều đó thì không có cách nào khác ngoài xem hôm nay là năm bao nhiêu. Ngưỡng
 * cách xa 110 năm nên kết luận không đổi trong hàng thế kỷ.
 */
export function checkLifespan(person) {
  if (!person || typeof person !== 'object') return boQua('không có bản ghi người');

  const tuoi = calcAge(person.birth, person.death, person.living);
  if (!tuoi) return boQua(lyDoThieuMoc(person));
  if (tuoi.tuoi <= NGUONG.tuoiThoToiDa) return dat();

  return canhBao(moTaNguoi(person) + ': ' + (tuoi.xapXi ? 'khoảng ' : '') +
                 tuoi.tuoi + ' tuổi' + (tuoi.denHomNay ? ' và vẫn ghi là còn sống' : '') + '.');
}

/**
 * CẢNH BÁO: một người sinh sau khi MẸ đã mất.
 *
 * Chỉ xét mẹ, không xét cha: con sinh sau khi cha mất là chuyện bình thường và
 * trong thời chiến thì rất nhiều. Sinh cùng năm mẹ mất cũng bình thường — mẹ
 * mất khi sinh chính người con ấy — nên chỉ báo khi năm sinh SAU hẳn năm mẹ mất.
 */
export function checkBirthAfterMotherDeath(index, personId) {
  const nguoi = layNguoi(index, personId);
  if (!nguoi) return boQua('thiếu bản ghi người');
  if (!mocNgay(nguoi.birth)) return boQua('không có năm sinh');

  // Chỉ mẹ ĐẺ. `quanHeTrongUnion` trả 'birth' khi thiếu `relation`, nên so
  // bằng `=== 'birth'` bắt đủ cả bốn mã không sinh học — xem `checkParentAge`.
  const cacMe = chaMeCua(index, personId)
    .filter((ch) => ch.relation === 'birth')
    .map((ch) => layNguoi(index, ch.parentId))
    .filter((me) => me && me.sex === 'F' && mocNgay(me.death));

  if (cacMe.length === 0) return boQua('không có mẹ đẻ nào ghi năm mất');

  for (const me of cacMe) {
    if (soSanhNgay(nguoi.birth, me.death) === 1) {
      return canhBao(moTaNguoi(nguoi) + ' sinh năm ' + formatDate(nguoi.birth) +
                     ', sau khi mẹ là ' + moTaNguoi(me) + ' mất năm ' +
                     formatDate(me.death) + '.');
    }
  }
  return dat();
}

/**
 * CẢNH BÁO: hai vợ chồng lệch nhau quá 25 tuổi.
 *
 * Đọc `partners` chứ không đọc `husband`/`wife`, nên hôn nhân đồng giới không
 * gãy. Hôn nhân một người (`partners` chỉ có một mã) thì không có gì để so.
 */
export function checkSpouseAgeGap(index, unionId) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union) return boQua('thiếu bản ghi hôn nhân');

  const coNamSinh = (Array.isArray(union.partners) ? union.partners : [])
    .map((id) => layNguoi(index, id))
    .filter((p) => p && mocNgay(p.birth));

  if (coNamSinh.length < 2) return boQua('cần cả hai người có năm sinh');

  for (let i = 0; i < coNamSinh.length; i++) {
    for (let j = i + 1; j < coNamSinh.length; j++) {
      const lech = Math.abs(chenhNam(coNamSinh[i].birth, coNamSinh[j].birth));
      if (lech > NGUONG.lechTuoiVoChong) {
        return canhBao(moTaNguoi(coNamSinh[i]) + ' và ' + moTaNguoi(coNamSinh[j]) +
                       ' lệch nhau khoảng ' + lech + ' tuổi.');
      }
    }
  }
  return dat();
}

/**
 * CẢNH BÁO: một người không nối với ai — không cha mẹ, không vợ/chồng, không con.
 *
 * Người đứng lẻ không sai, nhưng gần như luôn là dấu hiệu vừa thêm người rồi
 * quên nối quan hệ. Trên sơ đồ họ vô hình: sơ đồ vẽ quanh một người trung tâm,
 * nên người không có cạnh nào thì không bao giờ xuất hiện trừ khi chính họ được
 * chọn làm trung tâm.
 *
 * --- Vì sao KHÔNG đếm số union, mà đi tìm một NGƯỜI (sửa 18/08/2026, b21) ---
 *
 * Bản đầu đếm `unionsAsPartner.length + unionsAsChild.length` và coi khác 0 là
 * đạt. Đếm như thế thì một người thuộc về một cặp mà mọi người khác trong cặp
 * ấy đều đã bị xoá vẫn được tính là "có nối" — trong khi trên sơ đồ họ đã đứng
 * một mình hoàn toàn (`layout.js` bỏ qua cặp có dưới hai partner và không có
 * con). Câu hỏi đúng không phải *"có thuộc cặp nào không"* mà *"còn ai đứng
 * chung với họ không"*.
 *
 * Trên dữ liệu chưa có bản ghi nào bị xoá thì hai cách cho kết quả giống hệt
 * nhau — đó chính là lý do lỗ hổng này sống được từ bước 17 tới bước 21.
 */
export function checkOrphanNode(index, personId) {
  const nguoi = layNguoi(index, personId);
  if (!nguoi) return boQua('thiếu bản ghi người');

  const cacUnion = (index.unionsAsPartner.get(personId) || [])
    .concat(index.unionsAsChild.get(personId) || []);

  for (const unionId of cacUnion) {
    const u = index.unionById.get(unionId);
    if (!u) continue;
    for (const pid of Array.isArray(u.partners) ? u.partners : []) {
      if (pid && pid !== personId && index.personById.has(pid)) return dat();
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      const cid = c && c.personId;
      if (cid && cid !== personId && index.personById.has(cid)) return dat();
    }
  }

  return canhBao(moTaNguoi(nguoi) +
                 ' chưa nối với ai — không có cha mẹ, không có vợ/chồng, không có con.');
}

/**
 * CẢNH BÁO: trùng cả tên lẫn năm sinh — có thể là một người bị ghi hai lần.
 *
 * So tên đã bỏ dấu, vì cùng một người rất dễ được hai chi ghi thành "Nguyễn Thị
 * Hường" và "Nguyen Thi Huong". Bắt buộc phải có năm sinh mới kết luận: trùng
 * tên suông là chuyện thường ngày trong một dòng họ — cháu đặt theo tên ông là
 * tục lệ, không phải lỗi.
 */
export function checkDuplicate(tree, person) {
  if (!person || typeof person !== 'object') return boQua('không có bản ghi người');

  const ten = chuanTen(person);
  if (ten === '') return boQua('chưa có tên');

  const moc = mocNgay(person.birth);
  if (!moc) return boQua('không có năm sinh');

  const dsNguoi = (tree && Array.isArray(tree.persons)) ? tree.persons : [];
  const trung = dsNguoi.filter((p) => {
    if (!p || p.deleted || p.id === person.id) return false;
    if (chuanTen(p) !== ten) return false;
    const m = mocNgay(p.birth);
    return !!m && m.nam === moc.nam;
  });

  if (trung.length === 0) return dat();

  return canhBao(moTaNguoi(person) + ' trùng cả tên lẫn năm sinh với ' +
                 trung.map(moTaNguoi).join(', ') + '.');
}

/**
 * CẢNH BÁO: một cặp không còn khẳng định được điều gì.
 *
 * Câu hỏi này đã có sẵn lời đáp ở `union.conLyDoTonTai()` từ bước 26, và app
 * gọi nó sau MỌI lần gỡ nối — nên đường đi qua app không bao giờ để lại một
 * cặp như thế. Phép rà này gác đúng cái cửa còn hở: **sửa tay file JSON ngoài
 * app**, thứ `CLAUDE.md` mục 11 xếp vào loại chưa chặn được và phải nói thẳng.
 *
 * Một cặp rỗng không hiện ra ở đâu cả — `layout.js` bỏ qua nó, thẻ gia đình
 * không có cửa nào dẫn tới. Nó chỉ nằm trong file làm cho `unions` dài thêm,
 * đúng nghĩa RÁC, và đó là lý do nó thuộc về màn hình rà soát chứ không phải
 * một hộp báo lỗi lúc lưu.
 *
 * KHÔNG chặn, chỉ cảnh báo: bản ghi thừa không làm sai một điều gì đang có.
 */
export function checkUnionPointless(index, unionId) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union) return boQua('thiếu bản ghi hôn nhân');
  if (conLyDoTonTai(union)) return dat();

  const soCon = (Array.isArray(union.children) ? union.children : [])
    .filter((c) => c && c.personId).length;
  const soPartner = (Array.isArray(union.partners) ? union.partners : [])
    .filter(Boolean).length;

  return canhBao('Cặp ' + unionId + ' không còn khẳng định điều gì — ' +
                 soPartner + ' người trong cặp, ' + soCon + ' người con. ' +
                 'Bản ghi thừa, xoá đi không mất mối nối nào.');
}

/**
 * CẢNH BÁO: cặp này TRÙNG với một cặp khác — cùng bộ partners, hoặc là bản
 * MỘT NGƯỜI của một cặp đã có đủ hai người. Xem `union.timCapTrung`.
 *
 * Cùng vai trò với `checkUnionPointless`: không chặn gì — bản ghi trùng không
 * làm sai điều gì đang có — chỉ là RÁC đáng dọn. Nhưng đường dọn ở đây là
 * GỘP chứ không phải xoá: xoá thẳng mất chữ mà cặp trùng có thể đang giữ
 * riêng (ngày cưới, ghi chú, ảnh, con...), gộp thì giữ được hết — xem
 * `union.mergeUnions`.
 *
 * @param {object} tree
 * @param {object} index
 * @param {string} unionId
 * @param {ReturnType<typeof timCapTrung>} [dsTrungSan]
 *        Danh sách `timCapTrung(tree)` đã tính SẴN — truyền vào khi rà CẢ
 *        CÂY (nhiều union liên tiếp, xem `validateAll`) để khỏi dò lại từ đầu
 *        mỗi lần, đổi O(n³) thành O(n²). Không truyền thì hàm tự tính — dùng
 *        thẳng được cho rà một cặp lúc lưu.
 */
export function checkDuplicateUnion(tree, index, unionId, dsTrungSan) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union) return boQua('thiếu bản ghi hôn nhân');

  const ds = dsTrungSan || timCapTrung(tree);
  const cacTrung = ds.filter((x) => x.unionA === unionId || x.unionB === unionId);
  if (cacTrung.length === 0) return dat();

  const banKia = cacTrung.map((x) => (x.unionA === unionId ? x.unionB : x.unionA));
  return canhBao('Cặp ' + unionId + ' trùng với ' + banKia.join(', ') +
                 ' — cùng người, có thể là một cặp bị ghi hai lần.');
}

// ============================================================
// GỌI CẢ BỘ
// ============================================================

/**
 * Chạy mọi phép rà liên quan tới một thay đổi.
 *
 * @param {object} tree   cây đầy đủ (cần cho checkDuplicate)
 * @param {object} index  buildIndex(tree)
 * @param {'person'|'child'|'union'|'tree'} changeType
 * @param {object} [payload]
 *        'person' : { person } hoặc { personId }
 *        'child'  : { childId, parentId } hoặc { childId, unionId }
 *        'union'  : { unionId }
 *        'tree'   : không cần
 * @returns {{
 *   canSave: boolean,
 *   errors:   {check:string, level:string, message:string, personId?:string, unionId?:string}[],
 *   warnings: (…cùng dạng)[],
 *   skipped:  (…cùng dạng)[],
 *   counts:   {total:number, ok:number, error:number, warning:number, skip:number}
 * }}
 *
 * `canSave` là thứ màn hình cần: chỉ `errors` mới chặn. `warnings` hiện ra rồi
 * vẫn cho lưu. `skipped` không phải để hiện cho người dùng — nó là phần "đã rà
 * được bao nhiêu" của bản báo cáo `changeType: 'tree'`.
 *
 * `counts` tồn tại vì một lý do đã suýt làm bản báo cáo nói dối: *"0 cảnh báo"*
 * có thể nghĩa là dữ liệu sạch, mà cũng có thể nghĩa là chẳng phép nào rà nổi
 * vì thiếu mốc. Hai kết luận ngược nhau, cùng một con số 0. Có `counts.ok` thì
 * phân biệt được ngay.
 *
 * ⚠ `'tree'` chạy phép chống vòng cho TỪNG cạnh cha–con, mỗi cạnh một lượt duyệt
 * đồ thị. Với gia phả cỡ hiện nay (59 người) là tức thì; nó dành cho việc rà
 * soát cả cây theo yêu cầu, KHÔNG gọi ở mỗi lần lưu.
 *
 * ⚠ RANH GIỚI PHẢI BIẾT TRƯỚC KHI LÀM FORM NHẬP LIỆU (chat 2.3).
 * `payload.person` chỉ được dùng cho các phép soi RIÊNG người đó — ngày sinh,
 * ngày mất, trùng tên. Các phép soi QUAN HỆ vẫn đọc `index`, tức vẫn thấy năm
 * sinh CŨ. Nên form nhập liệu không được đưa bản đang gõ dở vào đây rồi tin là
 * đã rà đủ: cách đúng là dựng cây mới có sẵn thay đổi, chạy `buildIndex()` lại
 * rồi mới gọi hàm này. Với 59 người thì dựng lại chỉ mục là tức thì, và đổi lại
 * là mọi phép rà cùng nhìn một bản dữ liệu — không có nửa cũ nửa mới.
 */
export function validateAll(tree, index, changeType, payload) {
  const ra = {
    canSave: true, errors: [], warnings: [], skipped: [],
    counts: { total: 0, ok: 0, error: 0, warning: 0, skip: 0 },
  };
  const p = payload || {};

  if (changeType === 'person') {
    const nguoi = p.person || layNguoi(index, p.personId);
    if (!nguoi) return ketThuc(ra);
    raSoatMotNguoi(ra, tree, index, nguoi, true);

  } else if (changeType === 'child') {
    const cacCha = p.parentId ? [p.parentId] : partnersCuaUnion(index, p.unionId);
    for (const parentId of cacCha) {
      ghi(ra, 'checkNoAncestorCycle', checkNoAncestorCycle(index, p.childId, parentId),
          { personId: p.childId });
      ghi(ra, 'checkParentAge', checkParentAge(index, parentId, p.childId),
          { personId: p.childId });
    }
    ghi(ra, 'checkBirthAfterMotherDeath', checkBirthAfterMotherDeath(index, p.childId),
        { personId: p.childId });

  } else if (changeType === 'union') {
    ghi(ra, 'checkSpouseAgeGap',     checkSpouseAgeGap(index, p.unionId),     { unionId: p.unionId });
    ghi(ra, 'checkUnionPointless',   checkUnionPointless(index, p.unionId),   { unionId: p.unionId });
    ghi(ra, 'checkDuplicateUnion',   checkDuplicateUnion(tree, index, p.unionId), { unionId: p.unionId });

  } else if (changeType === 'tree') {
    // KHÔNG rà chiều xuống ở đây: vòng lặp này đi qua mọi người, nên mỗi cạnh
    // cha–con đã được rà đúng một lần từ phía người con rồi. Bật thêm chiều
    // xuống là rà mỗi cạnh hai lượt — số phép phồng lên gấp rưỡi và mỗi cảnh
    // báo hiện hai lần, mà không bắt thêm được gì.
    for (const nguoi of index.personById.values()) {
      raSoatMotNguoi(ra, tree, index, nguoi, false);
    }
    // Tính MỘT LẦN trước vòng lặp — checkDuplicateUnion nhận sẵn, khỏi dò lại
    // từ đầu cho từng union (O(n³) → O(n²), xem ghi chú tại hàm đó).
    const dsTrungSan = timCapTrung(tree);
    for (const unionId of index.unionById.keys()) {
      ghi(ra, 'checkSpouseAgeGap',     checkSpouseAgeGap(index, unionId),     { unionId });
      ghi(ra, 'checkUnionPointless',   checkUnionPointless(index, unionId),   { unionId });
      ghi(ra, 'checkDuplicateUnion',   checkDuplicateUnion(tree, index, unionId, dsTrungSan), { unionId });
    }
  }

  return ketThuc(ra);
}

/**
 * Bộ phép rà của MỘT người, dùng chung cho `'person'` và `'tree'`.
 *
 * Sửa năm sinh của một người thì hỏng ra ngoài chính bản ghi ấy: tuổi của mẹ
 * người đó, tuổi của chính người đó khi sinh con, khoảng lệch với vợ/chồng. Nên
 * nhánh `'person'` phải rà cả các cạnh chạm vào họ, không chỉ rà hai cái ngày.
 *
 * @param {boolean} caChieuXuong  có rà cả các cạnh ĐI XUỐNG (con) và các union
 *        của người này hay không.
 *
 * ⚠ HAI CHIỀU LÀ HAI VIỆC KHÁC NHAU, và bản 1.0.0 chỉ làm một chiều.
 * `chaMeCua()` cho các cạnh đi LÊN — tức chỉ soi được "cha mẹ của người này có
 * sinh sau họ không". Sửa năm sinh của một người CHA thì lỗi nằm ở chiều
 * ngược lại: *ông ấy hoá ra sinh sau con mình*, và cạnh đó không ai rà. Lỗ hổng
 * lộ ra ở chat 2.3 khi form nhập liệu chạy phép rà thật trên một cặp cha–con
 * có thật trong dữ liệu; ghi chú của bản 1.0.0 hứa "rà cả các cạnh chạm vào
 * họ" trong khi mã mới làm một nửa.
 */
function raSoatMotNguoi(ra, tree, index, nguoi, caChieuXuong) {
  const id = nguoi.id;
  ghi(ra, 'checkDeathAfterBirth', checkDeathAfterBirth(nguoi), { personId: id });
  ghi(ra, 'checkLifespan',        checkLifespan(nguoi),        { personId: id });
  ghi(ra, 'checkDuplicate',       checkDuplicate(tree, nguoi), { personId: id });

  // Người vừa tạo, chưa có trong chỉ mục thì không có cạnh nào để rà.
  if (!layNguoi(index, id)) return;

  ghi(ra, 'checkOrphanNode', checkOrphanNode(index, id), { personId: id });
  ghi(ra, 'checkBirthAfterMotherDeath', checkBirthAfterMotherDeath(index, id),
      { personId: id });

  for (const ch of chaMeCua(index, id)) {
    ghi(ra, 'checkNoAncestorCycle', checkNoAncestorCycle(index, id, ch.parentId),
        { personId: id });
    ghi(ra, 'checkParentAge', checkParentAge(index, ch.parentId, id), { personId: id });
  }

  if (!caChieuXuong) return;

  // ⚠ Vòng này KHÔNG phải phép duyệt đồ thị nên không cần tập `visited`: nó đi
  // đúng MỘT bước từ người đang xét sang các con rồi dừng, không đi tiếp từ
  // những người tìm được. Ai cho nó đi sâu thêm một bậc ("rà luôn các cháu")
  // thì phải thêm `visited` — gia phả là đồ thị, bản dữ liệu làm việc có hai
  // vòng. Phép duy nhất ở file này thật sự duyệt đồ thị là
  // `checkNoAncestorCycle`, và nó đi qua `bfs()` của utils/graph.js.
  //
  // Cùng một người con có thể xuất hiện ở hai union (bộ đẻ và bộ nuôi của
  // `P0020`), nên lọc trùng — nếu không thì một lỗi được kể tên hai lần.
  for (const conId of new Set(conCua(index, id))) {
    ghi(ra, 'checkNoAncestorCycle', checkNoAncestorCycle(index, conId, id),
        { personId: conId });
    ghi(ra, 'checkParentAge', checkParentAge(index, id, conId), { personId: conId });
    ghi(ra, 'checkBirthAfterMotherDeath', checkBirthAfterMotherDeath(index, conId),
        { personId: conId });
  }

  for (const unionId of index.unionsAsPartner.get(id) || []) {
    ghi(ra, 'checkSpouseAgeGap', checkSpouseAgeGap(index, unionId), { unionId });
  }
}

function ghi(ra, tenPhep, ketQua, viTri) {
  if (!ketQua) return;
  ra.counts.total++;
  ra.counts[ketQua.level] = (ra.counts[ketQua.level] || 0) + 1;

  if (ketQua.level === 'ok') return;   // phép đạt không cần kể tên ra
  const muc = Object.assign({ check: tenPhep, level: ketQua.level, message: ketQua.message },
                            viTri || {});
  if (ketQua.level === 'error')        ra.errors.push(muc);
  else if (ketQua.level === 'warning') ra.warnings.push(muc);
  else                                 ra.skipped.push(muc);
}

function ketThuc(ra) {
  ra.canSave = ra.errors.length === 0;
  return ra;
}

// ============================================================
// Hàm dùng trong file
// ============================================================

function layNguoi(index, personId) {
  if (!index || !index.personById || !personId) return null;
  return index.personById.get(personId) || null;
}

/** Tên kèm mã, để lời nhắn chỉ đúng vào một bản ghi. */
function moTaNguoi(person) {
  if (!person) return '(không rõ)';
  const ten = fullName(person);
  return (coGiaTri(ten) ? ten : '(chưa có tên)') + ' (' + person.id + ')';
}

/**
 * Tên đã bỏ dấu, hạ chữ thường, gộp khoảng trắng — dùng để so trùng.
 * Phép bỏ dấu gọi `utils/text.js`, không chép lại: chữ `đ` không phải `d` cộng
 * dấu, và bản chép tay nào cũng quên đúng chỗ đó.
 */
function chuanTen(person) {
  const ten = fullName(person);
  if (!coGiaTri(ten)) return '';
  return removeDiacritics(ten).replace(/\s+/g, ' ').trim();
}

/** Nói rõ THIẾU CÁI GÌ, để bản báo cáo rà soát đọc được. */
function lyDoThieuMoc(person) {
  const coSinh = !!mocNgay(person.birth);
  const coMat  = !!mocNgay(person.death);
  if (!coSinh && !coMat) return 'không có năm sinh lẫn năm mất';
  if (!coSinh) return 'không có năm sinh';
  if (!coMat)  return 'không có năm mất';
  return 'cùng năm, không đủ tháng ngày để kết luận';
}

/** [{ parentId, relation }] — MỌI partner của MỌI union mà người này làm con. */
function chaMeCua(index, personId) {
  const ra = [];
  for (const unionId of index.unionsAsChild.get(personId) || []) {
    const union = index.unionById.get(unionId);
    if (!union) continue;
    const relation = quanHeTrongUnion(union, personId);
    for (const parentId of Array.isArray(union.partners) ? union.partners : []) {
      if (parentId && parentId !== personId) ra.push({ parentId, relation });
    }
  }
  return ra;
}

/** Mã mọi người con của mọi union mà người này làm vợ/chồng. */
function conCua(index, personId) {
  const ra = [];
  for (const unionId of index.unionsAsPartner.get(personId) || []) {
    const union = index.unionById.get(unionId);
    if (!union) continue;
    for (const con of Array.isArray(union.children) ? union.children : []) {
      if (con && con.personId) ra.push(con.personId);
    }
  }
  return ra;
}

function partnersCuaUnion(index, unionId) {
  const union = index && index.unionById ? index.unionById.get(unionId) : null;
  if (!union || !Array.isArray(union.partners)) return [];
  return union.partners.filter((id) => !!id);
}

function quanHeTrongUnion(union, personId) {
  for (const con of Array.isArray(union.children) ? union.children : []) {
    if (con && con.personId === personId) return con.relation || 'birth';
  }
  return 'birth';
}

/**
 * Quan hệ giữa một cặp cha–con cụ thể: một mã trong `QUAN_HE_CON`, hoặc null
 * nếu hai người không nối với nhau.
 *
 * Cần thiết vì `P0020` có HAI bộ cha mẹ — một bộ đẻ (`U0013`), một bộ nuôi
 * (`U0025`). Cùng một người con, hai quan hệ khác nhau, và phép rà tuổi chỉ
 * được áp cho bộ đẻ.
 */
function quanHeChaCon(index, parentId, childId) {
  for (const ch of chaMeCua(index, childId)) {
    if (ch.parentId === parentId) return ch.relation;
  }
  return null;
}
