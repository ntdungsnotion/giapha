// ============================================================
// giapha · js/pages/form-sua-con.js
// Vai trò  : SỬA MỘT NGƯỜI CON TRONG MỘT CẶP — đổi quan hệ đẻ/nuôi/riêng/nuôi
//            dưỡng/thừa tự, chuyển sang gia đình khác, gỡ khỏi cặp
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: pages/{person-edit,form-go-noi}.js, state,
//            domains/{union,validate}, utils/graph, config
// Phiên bản: 1.0.0 · Cập nhật: 27/08/2026 20:30
// ============================================================
//
// Tách khỏi `person-edit.js` ngày 27/08/2026 (bước 48, đợt 4 của
// `tai-lieu/BAN-DO-TACH_V01.md`). Mã bên trong KHÔNG đổi một dòng nào.
//
// ⚠ `thuTuCon()` KHÔNG dời theo file này dù nó được viết ra ở đây: thẻ gia đình
// và `form-gia-dinh.js` cũng đọc nó, nên nó ở lại nền. Một hàm thuần bốn dòng
// mà hai file cùng cần thì chép sang là dựng bản thứ hai.

import { N, closePersonForm, canTroLuu, ghiBanGhi, hienNhan, hienLoiGhi,
         keTenPartner, tenNguoi, moTaCap, moHopTrang, moHopChon, moHopBao,
         nutChon, nutChanXoa, gopRaSoat, thuTuCon } from './person-edit.js';
import { unlink } from './form-go-noi.js';
import { state } from '../state.js';
import { coGiaTri } from '../utils/text.js';
import { addChild, removeChild, softDeleteUnion, conLyDoTonTai,
         updateChildRelation } from '../domains/union.js';
import { validateAll, checkOrphanNode } from '../domains/validate.js';
import { buildIndex } from '../utils/graph.js';
import { QUAN_HE_CON_NHAN, nhanQuanHeCon, chuThichQuanHe } from '../config.js';

let chuyenHT = null;   // chế độ chuyenCon: kết quả doHauQuaChuyenCon() của lần mở này

/** `closePersonForm()` gọi hàm này — xem `form-sap-thu-tu.js`. */
export function donDepSuaCon() {
  chuyenHT = null;
}

// ============================================================
// SỬA MỘT NGƯỜI CON TRONG MỘT CẶP — nửa sau việc 8 (22/08/2026)
// ============================================================
//
// Lỗ hổng 3 của đường kết nối, đo được 21/08/2026: ***không có chỗ nào nhìn
// thấy CẶP***. Mô hình đặt quan hệ cha mẹ – con ở **cặp**, còn mọi thao tác lại
// đi từ **một con người** — nên dời một đứa con sang gia đình khác phải làm hai
// việc rời nhau (Gỡ nối, rồi Kết nối lại), và giữa hai việc ấy gia phả thật
// trên Drive có một lúc SAI.
//
// --- NĂM quyết định --------------------------------------------------------
//
// 1. **KHÔNG dựng thêm một "màn hình gia đình" thứ hai.** Thẻ gia đình
//    (`person-detail.openUnionDetail`, việc 4) ĐÃ LÀ màn hình xem một cặp: hai
//    người, ngày cưới, danh sách con. Thứ nó thiếu không phải một cái khung mới
//    mà là mấy cái VIỆC. Dựng khung thứ hai là có hai chỗ cùng nói về một gia
//    đình, và tới ngày hai chỗ ấy lệch nhau thì không ai biết chỗ nào đúng.
//
// 2. **CHUYỂN LÀ MỘT VIỆC, KHÔNG PHẢI HAI.** `removeChild` ở cặp cũ và
//    `addChild` ở cặp mới NỐI ĐUÔI trên cùng một cây rồi đi xuống trong MỘT lần
//    `luuCay()` — luật 4 của đường ghi dữ liệu. Chia làm hai lần lưu thì giữa
//    hai lần ấy đứa bé là người mồ côi trong dữ liệu thật, và lần lưu thứ hai
//    hỏng là nó ở luôn trạng thái ấy.
//
// 3. **KHÔNG thêm hàm `moveChild` vào `domains/union.js`.** File ấy dặn rõ:
//    `addChild`/`removeChild` là HAI hàm duy nhất được phép làm `children[]`
//    dài ra hay ngắn đi, và là hai chỗ duy nhất buộc nơi gọi hỏi tiếp câu
//    `conLyDoTonTai()`. Một hàm `moveChild` gộp sẵn là cửa THỨ BA đi vòng qua
//    câu hỏi đó. Ghép hai hàm ấy ở đây, đúng lối `dungCayNoi()` đã ghép
//    `createUnion` + `addChild`.
//
// 4. **QUAN HỆ ĐI THEO NGƯỜI CON SANG CẶP MỚI.** Con nuôi của cặp này chuyển
//    sang cặp kia thì vẫn là con nuôi — app không tự đổi thành con đẻ. Muốn đổi
//    thì có mục *"Đổi quan hệ với cha mẹ"* ngay cạnh, và mục ấy ghi được CẢ NĂM
//    mã, không riêng `adopted` như ô tích của hộp Kết nối.
//
// 5. **CỬA VÀO LÀ MỘT NÚT RIÊNG MỘT DÒNG DƯỚI NHÓM CON**, không phải một đích
//    chạm thứ hai nhét vào dòng tên đứa bé. Hai đích chạm sát nhau trong một
//    dòng cao 44px là mời bấm nhầm — luật đã chốt ở `pages/person-list.js` và
//    nhắc lại ở `nutXemGiaDinh`.
//
// ⚠ **GỠ con khỏi cặp KHÔNG viết lại ở đây.** `unlink(…, 'child', …)` đã làm
// đúng việc ấy, kèm hộp kể hậu quả và đường hoàn tác. Mục *"Gỡ khỏi gia đình
// này"* dưới đây gọi thẳng vào nó — chép ra bản thứ hai là tới ngày một bản
// được vá còn bản kia không.

/**
 * Mở đường sửa MỘT người con của một cặp.
 *
 * @param {string} unionId
 * @param {{onDaLuu?:function(string)}} [xuLy]
 *
 * Cặp có đúng một người con thì BỎ HẲN bước hỏi *"người con nào"* — cùng lối
 * `openUnionForm` bỏ bước hỏi *"cặp nào"* khi người ấy chỉ có một cặp.
 */
export function openSuaCon(unionId, xuLy = {}) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const cacCon = (Array.isArray(u.children) ? u.children : [])
    .filter((c) => c && c.personId && index.personById.has(c.personId))
    .slice()
    .sort((a, b) => thuTuCon(a) - thuTuCon(b));

  if (cacCon.length === 0) {
    moHopBao('Sửa người con',
             keTenPartner(unionId) + ' chưa có người con nào trong gia phả, nên ' +
             'chưa có ai để sửa.', false,
             ['Thêm con thì dùng nút "Thêm một người con vào gia đình này" ngay ' +
              'trên thẻ gia đình.']);
    return;
  }

  if (cacCon.length === 1) { moHopViecCon(unionId, cacCon[0].personId, xuLy); return; }

  moHopChon('chon', xuLy, {
    tieuDe: 'Sửa người con nào?',
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Gia đình này có ' + cacCon.length + ' người con. Chọn một người:',
    cacMuc: cacCon.map((c) => ({
      ma:  c.personId,
      chu: tenNguoi(c.personId),
      phu: [chuThichQuanHe(c.relation || 'birth', 'con'), c.personId]
             .filter(coGiaTri).join('  ·  '),
      chay: () => moHopViecCon(unionId, c.personId, xuLy),
    })),
  });
}

/**
 * Ba việc làm được với một người con đã có trong cặp.
 *
 * ⚠ Mục *"Gỡ khỏi gia đình này"* chỉ mọc khi cặp CÓ ÍT NHẤT MỘT người vợ/chồng.
 * `unlink(personId, targetId, 'child', …)` nhận `personId` là người CHA/MẸ, nên
 * một cặp không có ai đứng ở hàng vợ/chồng — dữ liệu chấp nhận, `conLyDoTonTai`
 * gọi đó là *"mấy người này là anh em ruột"* — thì không có mốc để gọi hàm ấy.
 * Thà không mọc nút còn hơn mọc một nút bấm vào không ăn (điểm dừng bước 26).
 */
export function moHopViecCon(unionId, conId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u || !index.personById.has(conId)) return;

  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === conId);
  const qh = (muc && muc.relation) || 'birth';

  const cacMuc = [];

  cacMuc.push({
    ma:  'quan-he',
    chu: 'Đổi quan hệ với cha mẹ',
    phu: 'Đang ghi: ' + nhanQuanHeCon(qh, 'con') + '. Ở đây đổi được cả NĂM mức, ' +
         'không riêng con nuôi như ô tích của hộp Kết nối.',
    chay: () => moHopDoiQuanHe(unionId, conId, xuLy),
  });

  const dich = capChuyenDuoc(unionId, conId);
  cacMuc.push({
    ma:  'chuyen',
    chu: 'Chuyển sang gia đình khác',
    phu: dich.length > 0
      ? 'Có ' + dich.length + ' gia đình nhận được. Gỡ khỏi cặp này và nối vào ' +
        'cặp kia trong CÙNG một lần lưu.'
      : 'Chưa có gia đình nào khác nhận được — bấm vào để nghe vì sao.',
    chay: () => moHopChonCapDich(unionId, conId, xuLy),
  });

  const moc = mocCuaCap(unionId);
  if (moc) {
    cacMuc.push({
      ma:  'go',
      chu: 'Gỡ khỏi gia đình này',
      phu: tenNguoi(conId) + ' thôi là con của cặp này. KHÔNG bị xoá khỏi gia phả.',
      nguyHiem: true,
      chay: () => unlink(moc, conId, 'child', Object.assign({}, xuLy, { unionId })),
    });
  }

  moHopChon('chon', xuLy, {
    tieuDe: 'Người con: ' + tenNguoi(conId),
    phu:    keTenPartner(unionId) + '  ·  ' + unionId,
    cauMo:  'Làm gì với ' + tenNguoi(conId) + ' trong gia đình này?',
    cacMuc,
  });
}

/** Một người đứng ở hàng vợ/chồng của cặp, để làm mốc cho `unlink`. */
function mocCuaCap(unionId) {
  const u = state.index && state.index.unionById.get(unionId);
  const cac = (Array.isArray(u && u.partners) ? u.partners : [])
    .filter((id) => id && state.index.personById.has(id));
  return cac.length > 0 ? cac[0] : '';
}

// --- ĐỔI QUAN HỆ ĐẺ / NUÔI / RIÊNG / NUÔI DƯỠNG / THỪA TỰ ----------------

/**
 * Năm mức quan hệ, đọc từ `QUAN_HE_CON_NHAN` — MỘT bảng cho cả app.
 *
 * ⚠ Đây là chỗ vá cái hạn chế đo được 21/08/2026: ô tích *"con nuôi"* trong hộp
 * Kết nối chỉ ghi nổi mã `adopted`, trong khi lược đồ có NĂM mã. Muốn ghi *mẹ
 * kế* (`step`) thì trước nay phải vòng qua form hồ sơ.
 */
function moHopDoiQuanHe(unionId, conId, xuLy) {
  const index = state.index;
  const u = index && index.unionById.get(unionId);
  if (!u) return;

  const muc = (Array.isArray(u.children) ? u.children : [])
    .find((c) => c && c.personId === conId);
  const dang = (muc && muc.relation) || 'birth';

  moHopChon('chon', xuLy, {
    tieuDe: 'Đổi quan hệ',
    phu:    tenNguoi(conId) + '  ·  ' + conId,
    cauMo:  tenNguoi(conId) + ' là gì của ' + keTenPartner(unionId) + '?',
    cacDong: [
      'Đang ghi: ' + nhanQuanHeCon(dang, 'con') + '.',
      '⚠ Ghi một người CON ĐẺ thành con nuôi thì app THÔI rà tuổi sinh học của ' +
      'cạnh này — không có lời báo nào cả, mấy phép rà chỉ lặng đi. Chọn đúng ' +
      'thứ gia phả chép, đừng chọn cho xong.',
    ],
    cacMuc: QUAN_HE_CON_NHAN.map((x) => ({
      ma:  x.ma,
      chu: x.con + (x.ma === dang ? '   ← đang ghi' : ''),
      phu: 'Đọc từ phía cha mẹ: ' + x.chaMe,
      chay: () => chayDoiQuanHe(unionId, conId, x.ma, xuLy),
    })),
  });
}

/**
 * Ghi ngay, không qua hộp xác nhận: việc này chỉ đổi MỘT chữ trong một mục đã
 * có, không thêm không bớt ai, và chọn lại mức cũ là lùi được. Hộp xác nhận
 * dành cho thứ không lùi được — xoá, gỡ, chuyển.
 */
async function chayDoiQuanHe(unionId, conId, maMoi, xuLy) {
  const kq = updateChildRelation(state.tree, unionId, conId, maMoi);

  if (!kq) {
    moHopBao('Không đổi được',
             'Không tìm thấy ' + tenNguoi(conId) + ' trong cặp này nữa. Có thể gia ' +
             'phả vừa thay đổi trong lúc hộp đang mở. Tải lại trang rồi thử lại.', true);
    return;
  }
  if (!kq.thayDoi) {
    moHopBao('Không có gì đổi',
             tenNguoi(conId) + ' vốn đã được ghi là ' + nhanQuanHeCon(maMoi, 'con') +
             ' của ' + keTenPartner(unionId) + '.', false);
    return;
  }

  const chan = moHopTrang('chon', xuLy, 'Đổi quan hệ',
                          tenNguoi(conId) + '  ·  ' + conId);

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
    note:   'Ghi ' + tenNguoi(conId) + ' là ' + nhanQuanHeCon(maMoi, 'con') +
            ' của ' + keTenPartner(unionId) + '.',
    diff:   kq.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    hienLoiGhi(ketQua, 'Quan hệ VẪN như cũ.');
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (xuLy.onDaLuu) xuLy.onDaLuu(conId);

  hienNhan('Đã ghi ' + tenNguoi(conId) + ' là ' + nhanQuanHeCon(maMoi, 'con') + '.', false);
  chan.append(nutChon('Xong', true, () => closePersonForm()));
}

// --- CHUYỂN SANG GIA ĐÌNH KHÁC -------------------------------------------

/**
 * Những cặp NHẬN được người con này.
 *
 * Hai cặp bị loại, và cả hai đều vì cùng một lý do — nối vào là dựng ra một
 * điều không thể có thật:
 *
 *   · cặp đã có sẵn đứa bé trong hàng con (`addChild` cũng trả `null`);
 *   · cặp mà chính đứa bé đang đứng ở hàng VỢ/CHỒNG — không ai vừa là con vừa
 *     là cha/mẹ của cùng một gia đình.
 *
 * ⚠ Cặp ĐÃ XOÁ MỀM cũng bị loại: nó đang nằm trong thùng rác, và chuyển con
 * vào một cặp trong thùng rác là giấu đứa bé đi.
 *
 * Còn vòng tổ tiên thì KHÔNG lọc ở đây mà để `checkNoAncestorCycle` bắt lúc rà:
 * lọc sẵn là làm mất một dòng chữ giải thích vì sao không được, và người dùng
 * chỉ thấy cặp mình cần biến mất khỏi danh sách mà không hiểu tại sao.
 */
function capChuyenDuoc(unionId, conId) {
  const index = state.index;
  const ra = [];
  if (!index) return ra;

  const goc = index.unionById.get(unionId);
  const nguoiGoc = new Set(
    (Array.isArray(goc && goc.partners) ? goc.partners : []).filter(Boolean));

  for (const u of index.unionById.values()) {
    if (!u || u.id === unionId || u.deleted) continue;

    const cac = Array.isArray(u.partners) ? u.partners : [];
    if (cac.indexOf(conId) >= 0) continue;

    const daLaCon = (Array.isArray(u.children) ? u.children : [])
      .some((c) => c && c.personId === conId);
    if (daLaCon) continue;

    ra.push({ union: u, chung: cac.filter((id) => id && nguoiGoc.has(id)) });
  }

  // Cặp CÙNG CHA hoặc CÙNG MẸ với cặp hiện nay lên trước. Đó đúng là ca chủ dự
  // án gặp thật 21/08: nút "+ Vợ chồng" dựng thêm một cặp riêng cho người vợ,
  // rồi đứa con nằm lại ở cặp cũ của người chồng. Cặp cần tìm bao giờ cũng là
  // cặp chung một người với cặp đang đứng — để nó lẫn giữa danh sách là bắt
  // người ta đọc từng dòng.
  ra.sort((a, b) => b.chung.length - a.chung.length);
  return ra;
}

/**
 * Hộp chọn gia đình nhận, HAI TẦNG.
 *
 * @param {boolean} [caDanhSach]  bung hết mọi cặp, kể cả cặp không chung ai.
 *
 * ⚠ **Tầng một chỉ kể cặp CHUNG NGƯỜI với gia đình hiện nay.** Ảnh `sc-2.png`
 * của bản một tầng cho thấy vì sao: bản dữ liệu làm việc có 26 cặp, và cả 26
 * đổ ra thành một danh sách dài hơn 1300px trên một cái hộp rộng 360px. Sắp
 * đúng thứ tự thôi thì chưa đủ — người ta vẫn phải đọc qua 26 dòng để tin rằng
 * mình không bỏ sót cái nào.
 *
 * Mà ca thật thì luôn là cặp chung người: nút *+ Vợ chồng* dựng thêm một cặp
 * riêng cho người vợ, rồi đứa con nằm lại ở cặp cũ của người chồng — hai cặp
 * ấy chung đúng người chồng. Tầng một trong ca ấy dài đúng MỘT dòng.
 *
 * Tầng hai không bị giấu đi: nó nằm sau một nút kể rõ còn bao nhiêu cặp nữa.
 * Và khi KHÔNG có cặp nào chung người thì bung thẳng cả danh sách — chia tầng
 * lúc ấy là bắt bấm thêm một cú để xem đúng thứ mình vừa hỏi.
 */
function moHopChonCapDich(unionId, conId, xuLy, caDanhSach) {
  const dich = capChuyenDuoc(unionId, conId);

  if (dich.length === 0) {
    moHopBao('Chưa chuyển được',
             'Gia phả chưa có gia đình nào khác nhận được ' + tenNguoi(conId) + '. ' +
             'Chuyển con là dời từ một cặp ĐÃ CÓ sang một cặp ĐÃ CÓ — muốn dựng ' +
             'một gia đình mới thì phải có cha hoặc mẹ trước đã.', false,
             ['Cách làm: mở thẻ của ' + tenNguoi(conId) + ' → "Kết nối" → chọn ' +
              'người cha hoặc mẹ mới. App tự dựng cặp cho họ.']);
    return;
  }

  const gan = dich.filter((m) => m.chung.length > 0);
  const bung = !!caDanhSach || gan.length === 0;
  const hien = bung ? dich : gan;
  const conLai = bung ? 0 : dich.length - gan.length;

  const cacMuc = hien.map((m) => ({
    ma:  m.union.id,
    chu: keTenPartner(m.union.id),
    phu: [m.chung.length > 0
            ? 'Cùng ' + m.chung.map(tenNguoi).join(' và ') + ' với gia đình hiện nay'
            : '',
          moTaCap(m.union)].filter(coGiaTri).join('  ·  '),
    chay: () => moHopXacNhanChuyen(unionId, conId, m.union.id, xuLy),
  }));

  if (conLai > 0) {
    cacMuc.push({
      ma:  'ca-danh-sach',
      chu: 'Xem cả ' + conLai + ' gia đình khác',
      phu: 'Những gia đình không chung ai với gia đình hiện nay.',
      chay: () => moHopChonCapDich(unionId, conId, xuLy, true),
    });
  }

  const cacDong = ['Cặp cũ và cặp mới cùng đổi trong MỘT lần lưu — không có lúc ' +
                   'nào ' + tenNguoi(conId) + ' bị treo giữa hai nhà.'];

  moHopChon('chon', xuLy, {
    tieuDe: 'Chuyển sang gia đình nào?',
    phu:    tenNguoi(conId) + '  ·  ' + conId,
    cauMo:  tenNguoi(conId) + ' đang là con của ' + keTenPartner(unionId) +
            (bung
              ? '. Chọn gia đình nhận:'
              : '. Những gia đình CHUNG NGƯỜI với gia đình hiện nay — gần như ' +
                'lúc nào cũng là một trong số này:'),
    cacDong,
    cacMuc,
  });
}

function moHopXacNhanChuyen(unionId, conId, capMoi, xuLy) {
  const chan = moHopTrang('chuyenCon', xuLy, 'Chuyển sang gia đình khác',
                          tenNguoi(conId) + '  ·  ' + conId);

  // Luật 8, dùng lại nguyên vẹn: dựng cây đã chuyển NGAY BÂY GIỜ, đọc hậu quả
  // từ chính nó, rồi giữ đúng bản ghi ấy để lát nữa ghi xuống. Tính một lần,
  // dùng hai việc — không có khe nào cho hai bên nghĩ khác nhau.
  chuyenHT = doHauQuaChuyenCon(unionId, conId, capMoi);

  const canTro = canTroLuu();
  if (canTro || !chuyenHT) {
    hienNhan(canTro || 'Không dựng được bản ghi sau khi chuyển. Có thể gia phả ' +
             'vừa thay đổi. Tải lại trang rồi thử lại.', true);
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  if (!chuyenHT.raSoat.canSave) {
    hienNhan('Chưa chuyển được — có chỗ không thể đúng được:', true,
             chuyenHT.raSoat.errors.map((m) => m.message));
    chan.append(nutChanXoa('Đóng', false, () => closePersonForm()));
    return;
  }

  // ⚠ Cảnh báo nằm CHUNG một danh sách với hậu quả, không tách ra một lượt bấm
  // thứ hai như đường Kết nối. Đường ấy có nút *Lưu* của một cái form, nên chèn
  // được một bước "Vẫn nối"; ở đây cả cái hộp đã LÀ một hộp xác nhận rồi, và
  // bắt xác nhận hai lượt cho một việc là dạy người ta bấm qua mà không đọc.
  hienNhan('Chuyển xong thì:', false, cauKeChuyenCon(unionId, conId, capMoi));

  N.nutLuu = nutChanXoa('Chuyển sang gia đình này', true,
                      () => chayChuyenCon(unionId, conId, capMoi, xuLy, chan));
  chan.append(N.nutLuu, nutChanXoa('Không chuyển', false, () => closePersonForm()));
}

/**
 * Dựng cây đã chuyển, rồi đọc hậu quả bằng cách SO hai chỉ mục.
 *
 * @returns {{tree, quanHe, unionNguon, unionDich, diff, nguonChet, thanhLe,
 *            raSoat}|null}
 *
 * ⚠ BA hàm NỐI ĐUÔI trên cùng một cây: `removeChild` → (`softDeleteUnion`) →
 * `addChild`. Chạy hàm sau trên cây CŨ là mất việc của hàm trước — đúng điều
 * `domains/union.js` dặn ở đầu file.
 */
function doHauQuaChuyenCon(unionId, conId, capMoi) {
  const index = state.index;
  if (!index || !state.tree) return null;

  const cu  = index.unionById.get(unionId);
  const moi = index.unionById.get(capMoi);
  if (!cu || !moi) return null;

  const mucCon = (Array.isArray(cu.children) ? cu.children : [])
    .find((c) => c && c.personId === conId);
  if (!mucCon) return null;
  const quanHe = mucCon.relation || 'birth';

  const banCuNguon = JSON.parse(JSON.stringify(cu));

  const kqGo = removeChild(state.tree, unionId, conId);
  if (!kqGo) return null;
  let tree = kqGo.tree;
  let unionNguon = kqGo.union;
  const diff = Object.assign({}, kqGo.diff);

  // Luật 10: gỡ xong phải hỏi tiếp *"cặp này còn khẳng định được điều gì không"*.
  let nguonChet = false;
  if (!conLyDoTonTai(unionNguon)) {
    const kqX = softDeleteUnion(tree, unionId);
    if (kqX) {
      tree = kqX.tree; unionNguon = kqX.union; nguonChet = true;
      Object.assign(diff, kqX.diff);
    }
  }

  const kqThem = addChild(tree, capMoi, conId, quanHe);
  if (!kqThem) return null;
  tree = kqThem.tree;
  Object.assign(diff, kqThem.diff);

  let indexMoi;
  try {
    indexMoi = buildIndex(tree);
  } catch (e) {
    return null;   // dữ liệu hỏng sẵn từ trước — thà không chuyển còn hơn chuyển mù
  }

  let raSoat = validateAll(tree, indexMoi, 'union', { unionId: capMoi });
  raSoat = gopRaSoat(raSoat, validateAll(tree, indexMoi, 'child',
    { childId: conId, unionId: capMoi }));
  // Cặp nguồn chỉ rà khi nó CÒN SỐNG. Rà một cặp vừa vào thùng rác là chắc chắn
  // nghe `checkUnionPointless` kêu đúng cái điều mình vừa cố ý làm.
  if (!nguonChet) {
    raSoat = gopRaSoat(raSoat, validateAll(tree, indexMoi, 'union', { unionId }));
  }

  // Ai thành người đứng lẻ VÌ lần chuyển này. Chỉ người có mặt trong cặp nguồn
  // mới đổi được trạng thái, và đó là đúng MỘT bước từ cặp ấy — không phải phép
  // duyệt đồ thị nên không cần tập `visited`.
  const lienQuan = new Set([conId]);
  for (const id of (Array.isArray(banCuNguon.partners) ? banCuNguon.partners : [])) {
    if (id) lienQuan.add(id);
  }
  for (const c of (Array.isArray(banCuNguon.children) ? banCuNguon.children : [])) {
    if (c && c.personId) lienQuan.add(c.personId);
  }

  const thanhLe = [];
  for (const id of lienQuan) {
    if (!id || !index.personById.has(id)) continue;
    if (checkOrphanNode(index, id).ok && !checkOrphanNode(indexMoi, id).ok) thanhLe.push(id);
  }

  return { tree, quanHe, unionNguon, unionDich: kqThem.union,
           diff, nguonChet, thanhLe, raSoat };
}

/** Từng dòng hậu quả của đường CHUYỂN, viết cho người không lập trình đọc. */
function cauKeChuyenCon(unionId, conId, capMoi) {
  const A = tenNguoi(conId);
  const dong = [];

  dong.push(A + ' thôi là con của ' + keTenPartner(unionId) + '  ·  ' + unionId +
            ', và thành con của ' + keTenPartner(capMoi) + '  ·  ' + capMoi + '.');

  dong.push('Quan hệ GIỮ NGUYÊN: ' + A + ' vẫn được ghi là ' +
            nhanQuanHeCon(chuyenHT.quanHe, 'con') + ' ở gia đình mới. Muốn đổi ' +
            'thì dùng mục "Đổi quan hệ với cha mẹ".');

  dong.push(A + ' xuống CUỐI hàng anh chị em của gia đình mới. Muốn xếp lại thì ' +
            'mở thẻ gia đình ấy rồi bấm "Sắp thứ tự các con".');

  if (chuyenHT.nguonChet) {
    dong.push('⚠ ' + keTenPartner(unionId) + '  ·  ' + unionId + ' hết lý do tồn ' +
              'tại sau khi ' + A + ' đi, nên CẶP ẤY VÀO THÙNG RÁC. Không ai bị ' +
              'xoá — chỉ cái cặp mất đi, và lấy lại được ở Thùng rác.');
  }

  if (chuyenHT.thanhLe.length > 0) {
    dong.push('⚠ Sau việc này ' + chuyenHT.thanhLe.map(tenNguoi).join(' · ') +
              ' không còn nối với ai trong gia phả. Họ vẫn còn nguyên trong sổ, ' +
              'nhưng sơ đồ vẽ họ đứng lẻ một mình.');
  }

  for (const m of chuyenHT.raSoat.warnings) dong.push('⚠ ' + m.message);

  dong.push('Không ai bị xoá khỏi gia phả. Chuyển nhầm thì chuyển ngược lại, và ' +
            'nếu cặp cũ đã vào thùng rác thì lấy nó ra trước.');
  return dong;
}

async function chayChuyenCon(unionId, conId, capMoi, xuLy, chan) {
  if (N.dangLuu || !chuyenHT) return;

  const tenCon = tenNguoi(conId);
  const tenMoi = keTenPartner(capMoi);

  N.dangLuu = true;
  if (N.nutLuu) { N.nutLuu.disabled = true; N.nutLuu.style.opacity = '.45'; }
  hienNhan('Đang chuyển…', false);

  const ketQua = await ghiBanGhi(null, [chuyenHT.unionNguon, chuyenHT.unionDich], {
    action: 'update',
    target: capMoi,
    note:   'Chuyển ' + tenCon + ' từ cặp ' + unionId + ' sang cặp ' + capMoi +
            (chuyenHT.nguonChet
              ? ' (cặp ' + unionId + ' hết lý do tồn tại, vào thùng rác)' : '') + '.',
    diff:   chuyenHT.diff,
  });

  N.dangLuu = false;
  if (!N.lopPhu) return;

  if (!(ketQua && ketQua.ok)) {
    if (N.nutLuu) { N.nutLuu.disabled = false; N.nutLuu.style.opacity = '1'; }
    hienLoiGhi(ketQua, tenCon + ' VẪN là con của cặp cũ.');
    return;
  }

  // Dọn hẳn hàng nút xác nhận đi, không chỉ bỏ tham chiếu `N.nutLuu`: cái nút đỏ
  // ấy vẫn nằm trên màn hình và vẫn bấm được, mà bấm lần thứ hai là ghi lần thứ
  // hai một việc đã xong.
  chuyenHT = null;
  N.nutLuu   = null;
  chan.innerHTML = '';

  if (xuLy.onDaLuu) xuLy.onDaLuu(conId);

  hienNhan('Đã chuyển ' + tenCon + ' sang gia đình của ' + tenMoi + '.', false);
  chan.append(nutChon('Xong', true, () => closePersonForm()));
}

