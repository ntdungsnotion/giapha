// ============================================================
// giapha · js/pages/form-xoa.js
// Vai trò  : XOÁ MỘT NGƯỜI — luật 8: hộp xác nhận KỂ TÊN hậu quả, đường giữ
//            mắt xích, và đường hoàn tác ngay sau khi xoá
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/person-edit.js (nền dùng chung), state,
//            domains/{person,validate}, utils/{graph,date}
// Phiên bản: 1.0.0 · Cập nhật: 27/08/2026 21:45
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 6 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào.

import { N, KIEU_LOP_PHU, KIEU_HOP, closePersonForm, canTroLuu, ghiMotNguoi,
         hienNhan, hienLoiGhi, nutChon, nutChanXoa, tenNguoi,
         tenTrongCay } from './person-edit.js';
import { state } from '../state.js';
import { updatePerson, softDeletePerson, restorePerson } from '../domains/person.js';
import { checkOrphanNode } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { stampNow } from '../utils/date.js';

let xoaHT = null;   // chế độ xoa: kết quả doHauQuaXoa() của lần mở này

/** `closePersonForm()` gọi hàm này — xem `form-sap-thu-tu.js`. */
export function donDepXoa() {
  xoaHT = null;
}

// ============================================================
// XOÁ NGƯỜI — luật 8
// ============================================================

/**
 * Mở hộp xác nhận xoá một người, và lo cả đường hoàn tác.
 *
 * @param {string} personId
 * @param {{onDaXoa?:function(string), onDaHoanTac?:function(string),
 *          onDaDoi?:function(string), nguoiThayThe?:string}} [xuLy]
 *        `onDaDoi` chạy khi bản ghi ĐỔI mà người ấy VẪN CÒN trong cây (lối
 *        "giữ lại làm mắt xích"). Tách khỏi `onDaXoa` vì nơi gọi chỉ được dời
 *        người trung tâm đi khi người ấy thật sự biến mất.
 *        `onDaXoa` chạy NGAY sau khi máy chủ ghi xong, trong lúc hộp vẫn còn mở
 *        — để sơ đồ phía sau vẽ lại và người dùng thấy tận mắt điều vừa xảy ra
 *        trước khi quyết định có hoàn tác hay không.
 *        `nguoiThayThe` là người mà nơi gọi sẽ đưa ra giữa sơ đồ nếu người bị
 *        xoá đang đứng giữa. Truyền vào để hộp GỌI ĐÚNG TÊN họ; hộp này không
 *        tự chọn, vì chọn ai làm trung tâm là việc của `tree-view.js`.
 *
 * Đây KHÔNG phải một form: không ô nào để gõ, nên nó không đi qua `moForm()`.
 * Nhưng nó dùng chung lớp phủ và `closePersonForm()` với form, để không bao giờ
 * có hai lớp phủ của cùng một file chồng lên nhau.
 */
export function xoaNguoi(personId, xuLy = {}) {
  const nguoi = personId && state.index && state.index.personById.get(personId);
  if (!nguoi) return;

  closePersonForm();
  N.xuLyNgoai = xuLy || {};
  N.cheDo     = 'xoa';

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  // Luật 8: dựng cây đã xoá NGAY BÂY GIỜ, đọc hậu quả từ chính nó, rồi giữ lại
  // đúng bản ghi ấy để lát nữa ghi xuống. Tính một lần, dùng hai việc — cùng lối
  // của luật 1.
  xoaHT = doHauQuaXoa(personId, { boi, luc });

  N.lopPhu = document.createElement('div');
  N.lopPhu.style.cssText = KIEU_LOP_PHU;

  const hop = document.createElement('div');
  hop.style.cssText = KIEU_HOP;

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Xoá khỏi gia phả';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600';

  const ten = document.createElement('div');
  ten.textContent = tenNguoi(personId) + '  ·  ' + personId;
  ten.style.cssText = 'font-size:12px;color:#b3aaa0;margin-top:3px;letter-spacing:.03em';

  hop.append(tieuDe, ten);

  N.khoiKetQua = document.createElement('div');
  hop.append(N.khoiKetQua);

  const chan = document.createElement('div');
  chan.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:18px';
  hop.append(chan);

  const canTro = canTroLuu();
  if (canTro || !xoaHT) {
    hienNhan(canTro || 'Không dựng được bản ghi đã xoá. Tải lại trang rồi thử lại.', true);
  } else {
    hienNhan('Xoá xong thì:', false, cauKeHauQua(personId));

    N.nutLuu = nutChanXoa('Xoá người này', true, () => chayXoa(personId));
    chan.append(N.nutLuu);

    // Lối thoát thứ ba, chỉ mọc ra khi có người THẬT SỰ mất đường về. Không có
    // ai bị cắt đứt thì đừng bày thêm nút — mỗi nút thừa là một lần người dùng
    // phải đọc và loại trừ.
    if (xoaHT.thanhLe.length > 0) {
      chan.append(nutChanXoa('Giữ lại làm mắt xích không tên', false,
                             () => chayGiuMatXich(personId)));
    }
  }
  chan.append(nutChanXoa('Không xoá', false, () => closePersonForm()));

  N.lopPhu.append(hop);
  document.body.append(N.lopPhu);
}

/**
 * Dựng cây đã xoá, rồi đọc ra ba loại hậu quả bằng cách SO hai chỉ mục.
 *
 * @returns {{kq:object, indexMoi:object, soHangXom:number,
 *            thanhLe:string[], mocCoi:{unionId:string, cacCon:string[]}[]}|null}
 *
 * `thanhLe` — những người mà sau lần xoá này không còn nối với ai. Đọc bằng
 * `checkOrphanNode` của `domains/validate.js`, chạy hai lần trên hai chỉ mục và
 * chỉ giữ ai ĐỔI trạng thái: người vốn đã đứng lẻ từ trước thì không phải hậu
 * quả của việc hôm nay, và kể tên họ ra chỉ làm loãng danh sách.
 *
 * `mocCoi` — những cặp không còn partner nào hiện trên sơ đồ mà vẫn còn con.
 * Đây là chỗ duy nhất một lần xoá đụng tới người KHÁC trên hình: mấy người con
 * ấy vẫn nguyên vẹn trong dữ liệu, chỉ là phía trên đầu họ trống.
 */
function doHauQuaXoa(personId, ghiNhan) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const kq = softDeletePerson(state.tree, personId, ghiNhan);
  if (!kq) return null;

  let indexMoi;
  try {
    indexMoi = buildIndex(kq.tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không xoá còn hơn xoá mù
  }

  const cacUnion = (index.unionsAsPartner.get(personId) || [])
    .concat(index.unionsAsChild.get(personId) || []);

  // Hàng xóm: mọi người đứng chung một union với người này. Đúng MỘT bước, nên
  // không cần tập `visited` — xem ghi chú cùng ý ở đầu `domains/union.js`.
  const hangXom = new Set();
  for (const uid of cacUnion) {
    const u = index.unionById.get(uid);
    if (!u) continue;
    for (const pid of Array.isArray(u.partners) ? u.partners : []) {
      if (pid && pid !== personId && index.personById.has(pid)) hangXom.add(pid);
    }
    for (const c of Array.isArray(u.children) ? u.children : []) {
      const cid = c && c.personId;
      if (cid && cid !== personId && index.personById.has(cid)) hangXom.add(cid);
    }
  }

  const thanhLe = [];
  for (const id of hangXom) {
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  const mocCoi = [];
  for (const uid of index.unionsAsPartner.get(personId) || []) {
    const u = indexMoi.unionById.get(uid);
    if (!u) continue;
    const conSong = (Array.isArray(u.partners) ? u.partners : [])
      .filter((pid) => pid && indexMoi.personById.has(pid));
    const cacCon = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && c.personId && indexMoi.personById.has(c.personId))
      .map((c) => c.personId);
    if (conSong.length === 0 && cacCon.length > 0) mocCoi.push({ unionId: uid, cacCon });
  }

  return { kq, indexMoi, soHangXom: hangXom.size, thanhLe, mocCoi };
}

/** Từng dòng hậu quả, viết cho người không lập trình đọc. */
function cauKeHauQua(personId) {
  const dong = [];

  dong.push('Bản ghi KHÔNG mất khỏi file. Nó chỉ mang thêm một dấu "đã xoá" và ' +
            'biến mất khỏi sơ đồ. Bấm "Hoàn tác" ngay sau đó là đưa lại được.');

  if (xoaHT.soHangXom > 0) {
    dong.push('Người này đang nối với ' + xoaHT.soHangXom + ' người. KHÔNG ai ' +
              'trong số họ bị xoá theo — con cháu vẫn còn nguyên.');
  }

  // ⚠ Hai khối dưới đây nói về hai chuyện KHÁC HẲN NHAU về mức độ, nên người
  // nào đã bị kể ở khối trên thì khối dưới phải bỏ qua. Bản đầu kể cả hai, và
  // dòng thứ hai hạ nhẹ mức độ của dòng thứ nhất — đúng một người, hai giọng.
  const daKe = new Set(xoaHT.thanhLe);

  for (const id of xoaHT.thanhLe) {
    // ⚠ Câu này từng kết thúc bằng "app CHƯA có màn hình danh sách để mở họ lên
    // và nối lại". Đúng lúc viết (bước 21), SAI từ bước 24 — nút 🔍 mở đúng màn
    // hình ấy, và bước 26 cho nó đường "Kết nối" để nối lại. Một lời cảnh báo
    // nói quá mức thì cũng làm người ta quyết định sai y như một lời nói giảm.
    dong.push('⚠ ' + tenNguoi(id) + ' sẽ MẤT ĐƯỜNG VỀ. Sau khi xoá, không sơ đồ ' +
              'nào còn vẽ ra họ nữa, kể cả sơ đồ của chính họ hàng gần nhất. Bản ' +
              'ghi vẫn nguyên vẹn trong file: tìm lại bằng nút 🔍 ở góc trên phải, ' +
              'rồi nối lại bằng "Kết nối" trong menu. Cân nhắc nối họ vào chỗ khác ' +
              'trước, rồi hãy xoá.');
  }

  if (xoaHT.thanhLe.length > 0) {
    dong.push('CÓ LỐI KHÁC: nút "Giữ lại làm mắt xích không tên" xoá sạch tên, ' +
              'ngày và ghi chú của người này, nhưng GIỮ bản ghi cùng mọi mối nối. ' +
              'Sơ đồ còn lại một ô trống mang mã ' + personId + ', và ' +
              xoaHT.thanhLe.map(tenNguoi).join(' · ') + ' vẫn về được với ông bà. ' +
              'Dùng khi bạn tin là CÓ một người ở chỗ này, chỉ chưa biết là ai. ' +
              '(Giới tính và tình trạng còn sống giữ nguyên — đó là thuộc tính, ' +
              'không phải danh tính, và giới tính quyết định chỗ đứng trái/phải.)');
  }

  for (const m of xoaHT.mocCoi) {
    const conKhac = m.cacCon.filter((id) => !daKe.has(id));
    if (conKhac.length === 0) continue;
    dong.push(conKhac.map(tenNguoi).join(' · ') + ' sẽ không còn cha mẹ nào hiện ' +
              'trên sơ đồ (cặp ' + m.unionId + '). Họ vẫn nối được với người khác ' +
              'nên vẫn tìm tới được, chỉ là phía trên đầu họ trống.');
  }

  if (state.focusPersonId === personId) {
    const thay = N.xuLyNgoai.nguoiThayThe;
    dong.push('Đây đang là người đứng giữa sơ đồ, nên xoá xong app sẽ chuyển sang ' +
              (thay ? tenNguoi(thay) : 'một người khác') + '.');
  }

  if (state.phien && state.phien.nguoiTrungTamMacDinh === personId) {
    dong.push('Đây còn đang là người trung tâm mặc định của bạn. Sau khi xoá, màn ' +
              'hình Cài đặt sẽ báo mã này không còn ai mang — vào đó đặt lại một ' +
              'người khác.');
  }

  return dong;
}

async function chayXoa(personId) {
  if (N.dangLuu || !xoaHT) return;

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang xoá…', false);

  // Đúng bản ghi đã dùng để đọc hậu quả ở trên, không phải một bản tính lại.
  const nguoiMoi = xoaHT.kq.person;
  const ten = tenNguoi(personId);

  const ketQua = await ghiMotNguoi(nguoiMoi, {
    action: 'delete',
    target: personId,
    note:   'Xoá mềm ' + ten + ' khỏi gia phả.',
    diff:   xoaHT.kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Người này CHƯA bị xoá.');
    return;
  }

  // Sơ đồ vẽ lại ngay, trong lúc hộp vẫn mở: người dùng nhìn thấy kết quả rồi
  // mới quyết định có hoàn tác hay không.
  if (N.xuLyNgoai.onDaXoa) N.xuLyNgoai.onDaXoa(personId);

  N.nutLuu = null;
  hienNhan('Đã xoá ' + ten + ' khỏi sơ đồ.', false,
           ['Bản ghi vẫn nằm trong file gia phả, mang dấu "đã xoá".']);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — đưa ' + ten + ' trở lại', true, () => chayHoanTac(personId)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  N.khoiKetQua.append(hang);
}

/**
 * Lối thoát thứ ba: KHÔNG xoá người, mà xoá sạch danh tính của họ.
 *
 * Bản ghi ở lại, mọi mối nối ở lại, nên người con không mất đường về ông bà —
 * huyết thống vẫn là huyết thống dù ta quên mất tên người ở giữa. Trên sơ đồ
 * còn một ô mang mã người (`render.js` lấy mã làm nhãn khi không có tên).
 *
 * --- Vì sao là bản ghi THẬT chứ không phải một nét vẽ ẩn hình -------------
 *
 * Cám dỗ là để `layout.js` tự nối thẳng cháu lên ông bà rồi vẽ một nốt mờ ở
 * giữa. Bốn chỗ hỏng:
 *
 * 1. Nét ấy KHÔNG có trong dữ liệu, nên xuất GEDCOM ra là mất sạch — người
 *    nhận file thấy đứa cháu mồ côi y như cũ. Một `INDI` với `NAME` rỗng thì
 *    ghi được và đọc lại được. (Con trỏ `@VOID@` của GEDCOM không thay được:
 *    nó chỉ giữ chỗ trong danh sách con của MỘT gia đình, không mang nổi mối
 *    nối xuống gia đình của đứa cháu.)
 * 2. Nốt mờ không bấm được, nên ngày có người nhớ ra tên cụ ấy thì không có
 *    chỗ nào để điền vào.
 * 3. `layout.js` phải học một loại nút thứ ba. Năm lần liên tiếp lỗi bố cục
 *    chỉ lộ ra khi nhìn hình — đừng thêm khái niệm vào file đó nếu tránh được.
 * 4. Và quan trọng nhất: nét tự suy là app KHẲNG ĐỊNH một điều không ai nhập.
 *    Bản ghi trống nói đúng thứ ta biết: *có một người ở đây, chưa rõ là ai.*
 *
 * ⚠ Giữ mắt xích cũng là một LỜI KHẲNG ĐỊNH: rằng cha/mẹ của đứa cháu đúng là
 * con của cặp ông bà ấy. Sai chỗ đó thì cái sai nằm im trong dữ liệu. Chỉ dùng
 * khi tin chắc quan hệ, chỉ không chắc con người.
 */
async function chayGiuMatXich(personId) {
  if (N.dangLuu) return;

  const cu = state.index && state.index.personById.get(personId);
  if (!cu) {
    hienNhan('Không tìm thấy bản ghi này nữa. Tải lại trang rồi thử lại.', true);
    return;
  }
  // Chép nguyên bản CŨ để hoàn tác trả lại đúng từng ô, không phải dựng lại từ
  // `diff` — dựng lại thì mỗi trường thêm vào sau này là một trường bị quên.
  const banCu = JSON.parse(JSON.stringify(cu));

  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';

  // `sex` và `living` KHÔNG nằm trong danh sách: chúng là thuộc tính, không phải
  // danh tính — và `sex` còn quyết định chỗ đứng trái/phải trên sơ đồ.
  const kq = updatePerson(state.tree, personId, {
    name:        { surname: '', middle: '', given: '' },
    burialPlace: '',
    note:        '',
    birth:       { raw: '', place: '' },
    death:       { raw: '', place: '' },
  }, { boi, luc });

  if (!kq) {
    hienNhan('Không sửa được bản ghi này. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    hienNhan('Hồ sơ này vốn đã trống sẵn — nó đang là một mắt xích không tên rồi.', false);
    return;
  }

  N.dangLuu = true;
  N.nutLuu.disabled = true;
  N.nutLuu.style.opacity = '.45';
  hienNhan('Đang xoá thông tin…', false);

  const tenCu = tenNguoi(personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'update',
    target: personId,
    note:   'Xoá danh tính của ' + tenCu + ', giữ lại làm mắt xích không tên.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    N.nutLuu.disabled = false;
    N.nutLuu.style.opacity = '1';
    hienLoiGhi(ketQua, 'Hồ sơ này CHƯA bị đụng tới.');
    return;
  }

  // `onDaDoi`, KHÔNG phải `onDaXoa`: người này vẫn còn trong cây, nên nơi gọi
  // tuyệt đối không được dời người trung tâm đi chỗ khác.
  if (N.xuLyNgoai.onDaDoi) N.xuLyNgoai.onDaDoi(personId);

  N.nutLuu = null;
  hienNhan('Đã xoá thông tin của ' + tenCu + '. Ô ' + personId +
           ' nay là một mắt xích không tên.', false,
           ['Con cháu phía dưới vẫn nối được lên ông bà qua ô này.',
            'Mai kia nhớ ra tên thì mở thẻ thông tin của ô ấy, bấm "Sửa hồ sơ".']);

  const hang = document.createElement('div');
  hang.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:10px';
  hang.append(
    nutChon('Hoàn tác — trả lại hồ sơ cũ', true, () => chayTraLaiHoSo(personId, banCu, tenCu)),
    nutChon('Xong', false, () => closePersonForm()),
  );
  N.khoiKetQua.append(hang);
}

/** Hoàn tác của `chayGiuMatXich`: đặt nguyên bản ghi cũ trở lại. */
async function chayTraLaiHoSo(personId, banCu, tenCu) {
  if (N.dangLuu) return;
  N.dangLuu = true;
  hienNhan('Đang trả lại hồ sơ cũ…', false);

  const ketQua = await ghiMotNguoi(banCu, {
    action: 'restore',
    target: personId,
    note:   'Hoàn tác: trả lại hồ sơ của ' + tenCu + '.',
    diff:   {},
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Hồ sơ VẪN đang trống.');
    return;
  }

  if (N.xuLyNgoai.onDaDoi) N.xuLyNgoai.onDaDoi(personId);

  hienNhan('Đã trả lại hồ sơ của ' + tenCu + '.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}

async function chayHoanTac(personId) {
  if (N.dangLuu) return;

  // Dựng lại từ `state.tree` LÚC NÀY, không dùng lại cây cũ: lần xoá vừa rồi đã
  // thay `state.tree` bằng bản của máy chủ, và trong lúc hộp còn mở thì người
  // khác cũng có thể đã ghi thêm.
  const luc = stampNow();
  const boi = (state.phien && state.phien.email) || '';
  const kq  = restorePerson(state.tree, personId, { boi, luc });

  if (!kq) {
    hienNhan('Không tìm thấy bản ghi để đưa trở lại. Tải lại trang rồi kiểm lại.', true);
    return;
  }

  N.dangLuu = true;
  hienNhan('Đang đưa trở lại…', false);

  const ten = tenTrongCay(kq.tree, personId);
  const ketQua = await ghiMotNguoi(kq.person, {
    action: 'restore',
    target: personId,
    note:   'Hoàn tác: đưa ' + ten + ' trở lại gia phả.',
    diff:   kq.diff,
  });
  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Người này VẪN đang bị xoá.');
    return;
  }

  if (N.xuLyNgoai.onDaHoanTac) N.xuLyNgoai.onDaHoanTac(personId);

  hienNhan('Đã đưa ' + ten + ' trở lại gia phả.', false);
  const hang = document.createElement('div');
  hang.style.cssText = 'margin-top:10px';
  hang.append(nutChon('Đóng', true, () => closePersonForm()));
  N.khoiKetQua.append(hang);
}
