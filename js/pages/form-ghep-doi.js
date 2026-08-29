// ============================================================
// giapha · js/pages/form-ghep-doi.js
// Vai trò  : BẢNG GHÉP ĐÔI HAI CỘT — người trong file ↔ người trong cây,
//            cửa duy nhất khai điểm neo cho chế độ NHẬP BỔ SUNG
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/gedcom, utils/text, config
// Phiên bản: 1.0.0 · Cập nhật: 29/08/2026 19:30
// ============================================================
//
// Ý lấy từ phần mềm bản đồ, chủ dự án nêu 29/08/2026: chọn điểm A trên bản đồ
// thứ nhất, chọn A′ trên bản đồ thứ hai, rồi máy chồng hai bản đồ lên nhau.
// Ở đây "điểm khống chế" là một CON NGƯỜI có mặt trong cả file lẫn cây.
//
// --- BỐN quyết định của màn hình này -------------------------------------
//
// 1. **CỘT PHẢI TRỐNG khi mới mở.** Luật chủ dự án chốt 29/08: điểm neo đầu
//    tiên phải do người khai, app không được tự xác định — và *chưa khai thì
//    cũng không được bày đề xuất*. Bày sẵn 40 dòng app đoán rồi mời xác nhận
//    một dòng thì "khai tay" tụt xuống thành "bấm Đồng ý". Nên trước điểm neo
//    đầu tiên, mọi ô bên phải đều ở *"— chưa quyết —"*, không một chữ nào.
//
//    ⚠ Luật ấy nằm trong `detectDuplicates`, không nằm ở đây. Màn hình này
//    chỉ *nhìn thấy* nó qua `duocTron === false`. Cài lại luật ở đây là dựng
//    bản sao thứ hai của một luật, tới ngày một bản được sửa còn bản kia không.
//
// 2. **MỖI DÒNG CÓ ĐÚNG HAI câu trả lời, và trống là câu thứ ba.** *"Là người
//    này trong cây"* · *"Chưa có trong cây"* · và *"chưa quyết"*. Dòng chưa
//    quyết KHÔNG được coi là người mới — đó là luật của b60: *"người mới"*
//    cũng là một kết luận, mà chưa nhìn thì chưa có căn cứ để kết luận gì.
//    Còn một dòng chưa quyết thì nút trộn còn khoá.
//
// 3. **GIA ĐÌNH KHÔNG phải khai tay.** Một gia đình trong app không có căn
//    cước riêng: nó CHÍNH LÀ tập bạn đời của nó. Hai bạn đời đã được con
//    người khẳng định là ai thì gia đình của họ không còn gì để đoán —
//    `goiYCapTheoNguoi` suy ra, không phải đoán. Bắt người dùng ghép tay 34
//    gia đình là bắt họ trả lời lại 34 lần câu vừa trả lời xong.
//
//    ⚠ Nhưng phép suy ấy CHỈ chạy sau khi có ít nhất một điểm neo NGƯỜI khai
//    tay — xem `coTheSuyCap` bên dưới. Không có chốt ấy thì một file toàn
//    người mới cũng sinh ra được điểm neo, và luật số 1 bị đi vòng.
//
// 4. **HAI VÒNG `detectDuplicates` mỗi lần tính lại.** Vòng một chỉ có điểm
//    neo NGƯỜI, để biết luật khai tay đã thoả chưa và máy tự ghép thêm được
//    ai. Vòng hai mới thêm điểm neo GIA ĐÌNH suy ra từ kết quả vòng một. Gọi
//    một vòng thì gia đình phải suy từ một bản đồ người còn thiếu, và cặp
//    *a + c* trong file sẽ đẻ thêm một cặp thứ hai bên cạnh *A + C* đã có —
//    hai vợ chồng cưới nhau hai lần trên cùng một sơ đồ.
//
// --- Chỗ màn hình này DỪNG LẠI ------------------------------------------
//
// Nó KHÔNG ghi gì cả. Đầu ra là một bản đồ đã được người duyệt, cộng một bản
// xem trước *"sau khi trộn sẽ thế nào"*. Phần trộn thật (`mergeImported` chế
// độ bổ sung) là bước sau — và đó mới là chỗ không hoàn tác được.

import { state } from '../state.js';
import { detectDuplicates, goiYCapTheoNguoi } from '../domains/gedcom.js';
import { fullName, doiSongNguoi } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

/** Giá trị ô bên phải khi người dùng khai "bản ghi này chưa có trong cây". */
const MOI = '#moi';

let lopPhu = null;
let ctx = null;

/**
 * Mở bảng ghép đôi.
 *
 * @param {object} imported  kết quả `parseGedcom` — màn *Nhập GEDCOM* đã đọc
 *        xong và đã bày bản xem trước, ở đây không đọc lại file lần nữa.
 */
export function openGhepDoi(imported) {
  closeGhepDoi();
  if (!imported || !Array.isArray(imported.persons)) return;

  ctx = {
    imported,
    chon: new Map(),     // mã trong file → '' | MOI | mã trong cây
    nguon: new Map(),    // mã trong file → 'tay' | 'may'
    hang: [],            // { id, o, nhan }
    oTinh: null,
    oKetQua: null,
    nutTron: null,
  };
  for (const p of imported.persons) if (p && p.id) ctx.chon.set(p.id, '');

  lopPhu = document.createElement('div');
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:31;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.id = 'giapha-ghep-doi';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 700) + ';' +
    'max-height:' + caoHop(86) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  const tieuDe = document.createElement('div');
  tieuDe.textContent = 'Ghép người trong file với người trong cây';
  tieuDe.style.cssText = 'font-size:19px;font-weight:600;line-height:1.35';
  hop.append(tieuDe);

  const moDau = document.createElement('div');
  moDau.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-top:8px';
  moDau.append(
    dongChu('Cột phải để trống cho tới khi bạn chỉ ra người đầu tiên. Hãy ' +
            'tìm một người bạn CHẮC CHẮN đã có trong gia phả đang mở, rồi ' +
            'chọn đúng người ấy ở cột phải.'),
    dongChu('App không tự chọn người đầu tiên thay bạn.'),
  );
  hop.append(moDau);

  ctx.oTinh = document.createElement('div');
  ctx.oTinh.dataset.viec = 'dem-ghep-doi';
  ctx.oTinh.style.cssText =
    'margin-top:12px;padding:9px 11px;border:1px solid #e6e0d8;border-radius:9px;' +
    'background:#faf8f5;font-size:13px;line-height:1.6';
  hop.append(ctx.oTinh);

  hop.append(veNhanKhoi('Từng người trong file'));
  const than = document.createElement('div');
  than.dataset.viec = 'bang-ghep-doi';
  for (const p of imported.persons) if (p && p.id) than.append(veHang(p));
  hop.append(than);

  const hangLoat = nut('Những dòng còn trống: đều CHƯA CÓ trong cây', false, () => {
    for (const [id, v] of ctx.chon) if (v === '') datChon(id, MOI, 'tay');
    tinhLai();
  });
  hangLoat.dataset.viec = 'con-lai-la-moi';
  hangLoat.style.marginTop = '12px';
  hop.append(hangLoat);

  ctx.oKetQua = document.createElement('div');
  hop.append(ctx.oKetQua);

  const dong = nut('Đóng', false, () => closeGhepDoi());
  dong.style.marginTop = '18px';
  hop.append(dong);

  lopPhu.addEventListener('click', (e) => {
    if (e.target === lopPhu) closeGhepDoi();
  });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  tinhLai();
}

export function closeGhepDoi() {
  if (lopPhu) lopPhu.remove();
  lopPhu = null;
  ctx = null;
}

// ============================================================
// Bảng hai cột
// ============================================================

/**
 * Một dòng của bảng.
 *
 * ⚠ KHÔNG có hàng tiêu đề hai cột ở trên. Đo trên khung 390px: hai cột không
 * đủ chỗ đứng cạnh nhau nên chúng xuống hàng, và lúc ấy hai cái nhãn tiêu đề
 * nằm chồng lên nhau thành hai dòng chữ không còn chỉ vào cột nào. Nhãn
 * *"trong cây"* nên dời hẳn vào TRONG mỗi dòng: nó đúng ở cả hai khổ màn
 * hình, và nó ở ngay cạnh cái ô mà nó gọi tên.
 *
 * Đọc nhầm dòng là lỗi đắt nhất màn hình này đẻ ra được — người dùng khai
 * đúng một người sang một người khác, mà cả hai lời khai đều hợp lệ nên
 * không phép thử ngược nào bắt được. Nên vạch ngăn giữa hai dòng đậm hơn
 * khoảng cách trong lòng một dòng.
 *
 * Ô bên phải là `<select>` chứ không phải một ô tìm kiếm tự dựng: trên điện
 * thoại `<select>` mở ra bộ chọn của chính hệ điều hành — cuộn được bằng
 * ngón tay, gõ chữ nhảy tới chữ cái ấy, và không cần một dòng mã nào của ta
 * để làm cho đúng.
 */
function veHang(p) {
  const hang = document.createElement('div');
  hang.dataset.viec = 'hang-ghep';
  hang.dataset.ma = p.id;
  hang.style.cssText =
    'display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;' +
    'padding:9px 0;border-top:1px solid #e6e0d8';

  const trai = document.createElement('div');
  trai.style.cssText = 'flex:1 1 140px;min-width:0;font-size:13px;line-height:1.45';
  const ten = document.createElement('div');
  ten.textContent = fullName(p) || '(chưa có tên)';
  const phu = document.createElement('div');
  phu.style.cssText = 'font-size:11px;color:#8a8078';
  phu.textContent = [doiSongNguoi(p), p.id].filter((x) => x !== '').join('  ·  ');
  trai.append(ten, phu);

  const phai = document.createElement('div');
  phai.style.cssText = 'flex:1 1 170px;min-width:0';

  const nhanCot = document.createElement('div');
  nhanCot.textContent = 'trong cây';
  nhanCot.style.cssText = 'font-size:11px;color:#8a8078;margin-bottom:2px';
  phai.append(nhanCot);

  const o = document.createElement('select');
  o.style.cssText =
    'width:100%;padding:7px 6px;box-sizing:border-box;font-size:13px;' +
    'font-family:inherit;border:1px solid #e6e0d8;border-radius:8px;' +
    'background:#faf8f5;color:#2a2622';
  o.append(oMuc('', '— chưa quyết —'), oMuc(MOI, 'Chưa có trong cây — thêm mới'));
  for (const x of nguoiTrongCay()) o.append(oMuc(x.id, x.nhan));
  o.addEventListener('change', () => {
    datChon(p.id, o.value, 'tay');
    tinhLai();
  });

  const nhan = document.createElement('div');
  nhan.dataset.viec = 'nhan-nguon';
  nhan.style.cssText = 'font-size:11px;line-height:1.5;margin-top:3px;min-height:1px';
  phai.append(o, nhan);

  hang.append(trai, phai);
  ctx.hang.push({ id: p.id, o, nhan });
  return hang;
}

function oMuc(giaTri, chu_) {
  const o = document.createElement('option');
  o.value = giaTri;
  o.textContent = chu_;
  return o;
}

/**
 * Danh sách người của cây đích, đã bỏ người trong thùng rác.
 *
 * Ghép vào một người đã xoá mềm là dựng người ấy dậy bằng cửa sau — người
 * dùng chọn một cái tên trong danh sách mà không hề biết cái tên ấy đang nằm
 * trong thùng rác.
 */
function nguoiTrongCay() {
  const cay = state.tree;
  const ds = [];
  for (const p of (cay && Array.isArray(cay.persons) ? cay.persons : [])) {
    if (!p || !p.id || p.deleted === true) continue;
    const ten = fullName(p) || '(chưa có tên)';
    const nam = doiSongNguoi(p);
    ds.push({
      id: p.id,
      ten,
      nhan: ten + (nam ? '  ·  ' + nam : '') + '  ·  ' + p.id,
    });
  }
  ds.sort((a, b) => a.ten.localeCompare(b.ten, 'vi') || a.id.localeCompare(b.id));
  return ds;
}

function datChon(id, giaTri, nguon) {
  ctx.chon.set(id, giaTri);
  if (giaTri === '') ctx.nguon.delete(id);
  else ctx.nguon.set(id, nguon);

  const h = ctx.hang.find((x) => x.id === id);
  if (h && h.o.value !== giaTri) h.o.value = giaTri;
}

// ============================================================
// Tính lại — hai vòng, xem quyết định 4 ở đầu file
// ============================================================

function tinhLai() {
  if (!ctx || !lopPhu) return;
  const cay = state.tree;
  const imported = ctx.imported;

  // Đề xuất của vòng trước KHÔNG được tính là điểm khai tay ở vòng sau: nó
  // đến từ máy, và đếm nó vào cột người khai là tự mình phá luật số 1.
  const neoTay = [];
  const khaiMoi = [];
  const banDo = new Map();
  for (const [id, v] of ctx.chon) {
    if (v === MOI) { khaiMoi.push(id); continue; }
    if (v === '') continue;
    banDo.set(id, v);
    if (ctx.nguon.get(id) === 'tay') neoTay.push({ trongFile: id, trongCay: v });
  }

  const vong1 = detectDuplicates(cay, imported, { diemNeoTay: neoTay, khaiMoi });

  // Chốt của quyết định 3: không có một điểm neo NGƯỜI khai tay nào thì không
  // suy ra gia đình nào cả, dù bản đồ người có đầy đến đâu.
  const coTheSuyCap = vong1.duocTron && neoTay.length > 0;

  let kq = vong1;
  if (coTheSuyCap) {
    for (const ca of vong1.caTrung) {
      if (ca.kieu === 'nguoi') banDo.set(ca.idTrongFile, ca.id);
    }
    const capSuyRa = goiYCapTheoNguoi(cay, imported, banDo);
    const daSuy = new Set(capSuyRa.map((x) => x.trongFile));
    const daQuyet = (id) => banDo.has(id) || khaiMoi.includes(id);

    const capMoi = [];
    for (const u of (Array.isArray(imported.unions) ? imported.unions : [])) {
      if (!u || !u.id || daSuy.has(u.id)) continue;
      const bd = Array.isArray(u.partners) ? u.partners : [];
      if (bd.every(daQuyet)) capMoi.push(u.id);
    }

    kq = detectDuplicates(cay, imported, {
      diemNeoTay: neoTay.concat(capSuyRa),
      khaiMoi: khaiMoi.concat(capMoi),
    });
  }

  hienDeXuat(kq);
  hienDem();
  hienKetQua(kq);
}

/**
 * Đổ đề xuất của máy vào những ô người dùng CHƯA đụng vào.
 *
 * Không bao giờ đè lên ô người dùng đã chọn: máy và người bất đồng thì chỗ
 * giải quyết là phép thử ngược của `detectDuplicates`, không phải một cú ghi
 * đè lặng lẽ ngay trên màn hình.
 */
function hienDeXuat(kq) {
  const deXuat = new Map();
  for (const ca of kq.caTrung) {
    if (ca.kieu === 'nguoi' && ca.neo !== 'tay') deXuat.set(ca.idTrongFile, ca.id);
  }
  for (const id of kq.nguoiMoi) if (!deXuat.has(id)) deXuat.set(id, MOI);

  for (const h of ctx.hang) {
    const daKhai = ctx.nguon.get(h.id) === 'tay';
    if (!daKhai) {
      const g = deXuat.get(h.id);
      if (g === undefined) datChon(h.id, '', 'may');
      else datChon(h.id, g, 'may');
    }
    if (ctx.chon.get(h.id) === '') { h.nhan.textContent = ''; continue; }
    const tay = ctx.nguon.get(h.id) === 'tay';
    h.nhan.textContent = tay ? 'bạn khai' : 'app đề xuất';
    h.nhan.style.color = tay ? '#2a6a4a' : '#8a8078';
  }
}

/**
 * Mã trong file, kèm tên đọc được.
 *
 * Câu báo lỗi của `detectDuplicates` chỉ mang mã — đúng cho người sửa mã, vô
 * nghĩa với người đang ngồi trước bảng. Họ vừa chọn một CÁI TÊN ở cột trái,
 * nên câu nói lại chuyện ấy phải mang đúng cái tên đó.
 */
function moTaFile(id) {
  const p = ctx.imported.persons.find((x) => x && x.id === id);
  if (p) return (fullName(p) || '(chưa có tên)') + ' (' + id + ')';
  const u = (Array.isArray(ctx.imported.unions) ? ctx.imported.unions : [])
    .find((x) => x && x.id === id);
  return u ? 'gia đình ' + id : String(id || '(dòng trống)');
}

function hienDem() {
  let tay = 0;
  let may = 0;
  let trong = 0;
  for (const [id, v] of ctx.chon) {
    if (v === '') trong++;
    else if (ctx.nguon.get(id) === 'tay') tay++;
    else may++;
  }
  ctx.oTinh.innerHTML = '';
  ctx.oTinh.append(dongChu(
    'Bạn khai: ' + tay + ' · App đề xuất: ' + may + ' · Chưa quyết: ' + trong));
}

// ============================================================
// Khối kết quả
// ============================================================

const LY_DO_CHAN = {
  cayRong:
    'Gia phả đang mở chưa có ai, nên không có người nào để khai điểm neo. ' +
    'Đường đúng của ca này là nút “Tạo gia phả mới và ghi vào đó” ở màn Nhập GEDCOM.',
  chuaKhaiDiemNeo:
    'Chưa khai điểm neo nào. Chọn ở cột phải đúng một người mà bạn chắc chắn ' +
    'là cùng một con người với dòng bên trái.',
  neoSai:
    'Có dòng khai chưa dùng được. Sai một dòng thì chặn cả lần nhập — khai ' +
    'bốn dòng mà chỉ ba dòng được dùng là điều bạn cần biết TRƯỚC khi ghi.',
  neoMauThuan:
    'Bạn và app đang chỉ vào hai người khác nhau. Một trong hai bên sai, và ' +
    'app KHÔNG tự chọn bên nào.',
};

function hienKetQua(kq) {
  const o = ctx.oKetQua;
  o.innerHTML = '';

  if (!kq.duocTron) {
    o.append(veLoiNhan(LY_DO_CHAN[kq.lyDoChan] || kq.loi ||
                       'Chưa trộn được.', kq.lyDoChan === 'neoMauThuan'));
    for (const l of kq.loiNeoTay) {
      o.append(veLoiNhan('· ' + moTaFile(l.trongFile) + ': ' + l.vi, true));
    }
    veNutTron(o, false);
    return;
  }

  o.append(veNhanKhoi('Sau khi trộn'));

  const t = kq.thongKe;
  const so = document.createElement('div');
  so.dataset.viec = 'tom-tat-ghep';
  so.style.cssText =
    'padding:10px 12px;border:1px solid #e6e0d8;border-radius:9px;' +
    'background:#faf8f5;font-size:13px;line-height:1.7';
  so.append(
    dongChu('· ' + t.soCaNguoi + ' người đã có sẵn — bổ sung thêm chi tiết'),
    dongChu('· ' + t.soCaCap + ' gia đình đã có sẵn'),
    dongChu('· ' + t.soNguoiMoi + ' người mới · ' + t.soCapMoi + ' gia đình mới'),
  );
  o.append(so);

  const xung = kq.caTrung.filter((c) => c.mauThuan.length > 0);
  if (xung.length > 0) {
    o.append(veNhanKhoi('Chỗ hai bên nói khác nhau'));
    const k = document.createElement('div');
    k.dataset.viec = 'mau-thuan-ghep';
    k.style.cssText =
      'padding:9px 11px;border:1px solid #f0d8d0;border-radius:8px;' +
      'background:#fbf0ec;color:#8a3a2a;font-size:12px;line-height:1.7';
    for (const c of xung) {
      k.append(dongChu(c.tenDangCo + ' (' + c.id + ')'));
      for (const m of c.mauThuan) {
        const d = dongChu('    · ' + m.nhan + ': đang có “' + m.dangCo +
                          '” · file ghi “' + m.trongFile + '”');
        d.style.color = '#6a4a40';
        k.append(d);
      }
    }
    o.append(k);
  }

  if (t.soChuaNeo > 0) {
    o.append(veLoiNhan('Còn ' + t.soChuaNeo + ' bản ghi chưa quyết. Mỗi dòng ' +
                       'bên trái phải có một câu trả lời thì mới trộn được.', false));
  }
  veNutTron(o, t.soChuaNeo === 0);
}

/**
 * Nút trộn — CÒN KHOÁ ở bước này.
 *
 * Bày một cái nút xám cho đúng ý định thiết kế thì tử tế hơn là im lặng:
 * người dùng biết đường ấy có tồn tại và đang đợi. Cùng nếp với nút *"Bổ
 * sung vào gia phả đang mở"* hồi b58.
 */
function veNutTron(o, sanSang) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.viec = 'tron-vao-cay';
  b.disabled = true;
  b.textContent = 'Trộn vào gia phả đang mở — chưa làm';
  b.style.cssText =
    'display:block;width:100%;margin:14px auto 0;min-height:44px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;line-height:1.35;border-radius:9px;cursor:default;' +
    'background:#eae4dc;color:#8a8078;border:1px solid #e6e0d8;' +
    'touch-action:manipulation';
  o.append(b);

  const chu_ = document.createElement('div');
  chu_.style.cssText =
    'margin-top:8px;font-size:12px;line-height:1.6;color:#8a8078';
  chu_.textContent = sanSang
    ? 'Bảng đã ghép xong. Phần ghi thật làm ở bước sau.'
    : 'Ghép xong cả bảng thì đây là chỗ ghi thật.';
  o.append(chu_);
  ctx.nutTron = b;
}

// ============================================================
// Mấy mảnh dựng chữ dùng chung trong file này
// ============================================================

function veNhanKhoi(chu_) {
  const d = document.createElement('div');
  d.textContent = chu_;
  d.style.cssText =
    'margin-top:16px;margin-bottom:6px;font-size:14px;font-weight:600';
  return d;
}

function dongChu(chu_) {
  const d = document.createElement('div');
  d.textContent = chu_;
  return d;
}

function nut(chu_, chinh, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu_;
  b.style.cssText =
    'display:block;width:100%;margin-left:auto;margin-right:auto;min-height:42px;' +
    'padding:8px 14px;max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;' +
    'font-family:inherit;line-height:1.35;border-radius:9px;cursor:pointer;' +
    'touch-action:manipulation;' +
    (chinh ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
           : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  b.addEventListener('click', chay);
  return b;
}

function veLoiNhan(chu_, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu_;
  d.style.cssText =
    'margin-top:10px;padding:10px 12px;border-radius:9px;font-size:12px;' +
    'line-height:1.6;border:1px solid ' + (laLoi ? '#f0d8d0' : '#e6e0d8') + ';' +
    'background:' + (laLoi ? '#fbf0ec' : '#faf8f5') + ';' +
    'color:' + (laLoi ? '#8a3a2a' : '#8a8078');
  return d;
}
