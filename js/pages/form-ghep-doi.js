// ============================================================
// giapha · js/pages/form-ghep-doi.js
// Vai trò  : BẢNG GHÉP ĐÔI HAI CỘT — người trong file ↔ người trong cây,
//            cửa duy nhất khai điểm neo cho chế độ NHẬP BỔ SUNG
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, domains/gedcom, utils/text, config
// Phiên bản: 1.4.0 · Cập nhật: 29/08/2026 23:50
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
//    Còn một dòng chưa quyết thì nút hợp nhất còn khoá.
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
// 5. **NÚT "ĐỂ APP CHỌN NỐT", và một trạng thái THỨ BA (b64).** Đo được: với
//    file `.ged` của phần mềm khác, cột *"App nhận ra"* của quyết định 4 LUÔN
//    BẰNG 0 — máy nhận nhau bằng `uid` · sổ nhập · mã bản ghi, mà file ngoài
//    không có đường nào trong ba (`NK-B63` mục 2.2). Nhánh 12 người thì 11
//    dòng phải khai tay; nhánh 30 người thì 29. Nút này gọi `lanTheoQuanHe`
//    để lấp chỗ đó — đi theo bố mẹ · vợ chồng · con từ những người đã khai.
//
//    ⚠ **Không trái luật b60.** Luật ấy cấm *bày sẵn khi chưa khai điểm neo
//    nào*; đây là nút bấm SAU, và nó khoá cho tới khi có điểm neo đầu tiên.
//
//    **Đường đi chủ dự án chốt 29/08/2026, sau khi bấm thử trên app:** một nút
//    → app chọn CẢ BẢNG (lan tới được thì nối vào người ấy, không thì để
//    *"chưa có trong cây — thêm mới"*) → **con người rà một lượt**, thấy dòng
//    nào sai thì tự chọn lại → bấm **Hợp nhất** → app kiểm lần cuối, vô lý thì
//    báo ra để sửa, sạch thì ghi.
//
//    ⚠ **Chỗ này ĐÃ ĐỔI so với bản đầu của b64**, và đổi có lý do nên ghi lại
//    kẻo có ngày ai đó "sửa lại cho đúng": bản đầu bắt bấm thêm một nút *"Nhận
//    cả N đề xuất"* mới mở khoá, vì sợ 29 dòng máy đoán tự mở một đường ghi
//    không hoàn tác được. Chủ dự án bấm thử rồi bác: **cú rà bằng mắt trên
//    bảng CHÍNH LÀ hành động của con người**, và một nút "Nhận" đặt sau đó chỉ
//    là một cú bấm lấy lệ — đúng cái bệnh mà quyết định 1 đã cảnh báo (*"khai
//    tay tụt xuống thành bấm Đồng ý"*). Nên cửa canh nay là **hai lớp khác**:
//    dòng app chọn mang **nét đứt** (thấy được mà không cần đọc chữ, để rà cho
//    nhanh), và `mergeImported` **kiểm lại lần cuối** trước khi ghi.
//
// --- Chỗ màn hình này DỪNG LẠI (b62 dời một bước) -----------------------
//
// Tới b62 thì nút hợp nhất mở được, nhưng RANH GIỚI vẫn nguyên chỗ cũ: file này
// vẫn KHÔNG ghi, và vẫn không gọi một hàm `services` nào. Nó chỉ gọi lại
// `khiTron` — cái hàm mà nơi mở bảng đưa vào — và trao cho hàm ấy đúng bộ
// tuỳ chọn đã dựng nên bản xem trước đang bày trên màn hình.
//
// ⚠ Trao ĐÚNG BỘ ẤY là cả lý do `ctx.tuyChon` tồn tại. `mergeImported` chế
// độ bổ sung tự chạy lại `detectDuplicates` bằng bộ tuỳ chọn nó nhận được;
// đưa nó một bộ khác bộ đã bày là bày một đằng ghi một nẻo, mà không phép
// kiểm nào của hàm thuần bắt được — cả hai lần chạy đều hợp lệ.

import { state } from '../state.js';
import { detectDuplicates, goiYCapTheoNguoi, lanTheoQuanHe }
  from '../domains/gedcom.js';
import { fullName, doiSongNguoi } from '../utils/text.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

/** Giá trị ô bên phải khi người dùng khai "bản ghi này chưa có trong cây". */
const MOI = '#moi';

/**
 * Ba nguồn của một ô bên phải (b64).
 *
 * · `tay` — con người khai.
 * · `may` — máy nhận ra bằng `uid` · sổ nhập · mã bản ghi, tức CĂN CƯỚC chứ
 *           không phải phỏng đoán. (Đo được: với file `.ged` của phần mềm
 *           khác thì nguồn này LUÔN rỗng — `NK-B63` mục 2.2.)
 * · `lan` — app tự chọn bằng phép lan theo quan hệ. **Là suy đoán.**
 *
 * Cả ba đều tính là ĐÃ QUYẾT, nên cả ba đều mở khoá nút Hợp nhất được. Nhưng
 * `lan` là thứ duy nhất người dùng CHƯA nhìn qua, nên nó phải nhìn khác hẳn:
 * viền trái nét đứt, nền ngả vàng, và một nhãn *"app tự chọn — hãy rà lại"*.
 * Phân biệt được **bằng đuôi mắt**, vì người ta cuộn qua 29 dòng chứ không
 * đọc 29 cái nhãn — và chính cú cuộn ấy là cú rà mà chủ dự án đã chốt là hành
 * động quyết định (xem mục 5 ở đầu file).
 *
 * Sửa tay một dòng thì dòng ấy đổi từ `lan` sang `tay`, nét đứt biến mất —
 * tức bảng luôn cho biết còn bao nhiêu dòng chưa ai nhìn.
 */
const LAN = 'lan';

let lopPhu = null;
let ctx = null;

/**
 * Mở bảng ghép đôi.
 *
 * @param {object} imported  kết quả `parseGedcom` — màn *Nhập GEDCOM* đã đọc
 *        xong và đã bày bản xem trước, ở đây không đọc lại file lần nữa.
 * @param {(tuyChon:object, thongKe:object)=>void} [khiTron]
 *        Nơi mở bảng đưa vào. Được gọi khi người dùng bấm *Trộn*, kèm ĐÚNG
 *        bộ tuỳ chọn đã dựng nên bản xem trước đang bày. Không đưa hàm này
 *        thì nút trộn ở trạng thái khoá — bảng lại thành chỉ-đọc.
 */
export function openGhepDoi(imported, khiTron) {
  closeGhepDoi();
  if (!imported || !Array.isArray(imported.persons)) return;

  ctx = {
    imported,
    khiTron: typeof khiTron === 'function' ? khiTron : null,
    chon: new Map(),     // mã trong file → '' | MOI | mã trong cây
    nguon: new Map(),    // mã trong file → 'tay' | 'may'
    hang: [],            // { id, o, nhan }
    tuyChon: null,       // bộ tuỳ chọn đã dựng nên bản xem trước đang bày
    banDoDaChot: new Map(),  // b64 — hạt giống của nút đề xuất
    khaiMoiHienTai: [],
    duongDi: new Map(),      // mã trong file → { qua, tuNguoi } của đề xuất
    daBamDeXuat: false,
    oTinh: null,
    oDeXuat: null,
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

  ctx.oDeXuat = document.createElement('div');
  hop.append(ctx.oDeXuat);

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
    // Sửa MỘT dòng thì chỉ dòng ấy đổi chủ, phần app chọn còn nguyên — đó là
    // cả cách dùng chủ dự án chốt: *"rà lại một lượt, thấy sai thì tự chọn
    // lại"*. Quét sạch cả bảng mỗi lần sửa một dòng là bắt rà lại từ đầu, và
    // rà lại từ đầu là một cơ hội nữa để bỏ sót.
    //
    // ⚠ Cái giá của lựa chọn này, nói thẳng: những dòng app chọn dựa trên
    // dòng vừa bị sửa KHÔNG tự tính lại. Chúng vẫn nằm đó, vẫn mang nét đứt,
    // và con mắt người rà là thứ duy nhất bắt được. Muốn chắc thì bấm *Bỏ
    // hết, tự chọn lại từ đầu*.
    datChon(p.id, o.value, 'tay');
    tinhLai();
  });

  const nhan = document.createElement('div');
  nhan.dataset.viec = 'nhan-nguon';
  nhan.style.cssText = 'font-size:11px;line-height:1.5;margin-top:3px;min-height:1px';
  phai.append(o, nhan);

  hang.append(trai, phai);
  ctx.hang.push({ id: p.id, o, nhan, el: hang });
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
  let soKhaiTay = 0;
  for (const [id, v] of ctx.chon) {
    // Dòng `lan` tính NGANG dòng `tay`: chủ dự án chốt 29/08/2026 rằng app
    // chọn sẵn cả bảng, con người rà một lượt rồi mới bấm. Cái rà ấy là hành
    // động của con người — nên không cần thêm một nút "nhận" nữa, và bấm
    // Hợp nhất là lúc app kiểm lần cuối. Xem ghi chú `LAN` ở đầu file.
    const ng = ctx.nguon.get(id);
    if (v === MOI) { khaiMoi.push(id); continue; }
    if (v === '') continue;
    banDo.set(id, v);
    if (ng === 'tay' || ng === LAN) neoTay.push({ trongFile: id, trongCay: v });
    if (ng === 'tay') soKhaiTay++;
  }

  const vong1 = detectDuplicates(cay, imported, { diemNeoTay: neoTay, khaiMoi });

  // Chốt của quyết định 3: không có một điểm neo NGƯỜI khai tay nào thì không
  // suy ra gia đình nào cả, dù bản đồ người có đầy đến đâu.
  // ⚠ Đếm `soKhaiTay` chứ KHÔNG đếm `neoTay.length`: từ b64, `neoTay` chở cả
  // dòng app tự chọn. Nếu chốt này đếm cả chúng thì một bảng không còn lời
  // khai tay nào — người dùng đặt lại dòng mình khai về "chưa quyết" sau khi
  // bấm nút — vẫn suy ra được gia đình, và luật b60 bị đi vòng.
  const coTheSuyCap = vong1.duocTron && soKhaiTay > 0;

  let kq = vong1;
  ctx.tuyChon = { diemNeoTay: neoTay.slice(), khaiMoi: khaiMoi.slice() };
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

    // Giữ lại ĐÚNG bộ này chứ không dựng lại lúc bấm nút: dựng lại là mở
    // đường cho hai bộ trôi lệch nhau, và bộ thứ hai thì không ai nhìn thấy.
    ctx.tuyChon = {
      diemNeoTay: neoTay.concat(capSuyRa),
      khaiMoi: khaiMoi.concat(capMoi),
    };
    kq = detectDuplicates(cay, imported, ctx.tuyChon);
  }

  // Bản đồ NGƯỜI mà máy và người đã chốt xong — hạt giống của nút đề xuất.
  // Giữ lại đây chứ không dựng lại lúc bấm nút, đúng lý do `ctx.tuyChon` tồn
  // tại: hai bộ dựng ở hai chỗ thì sớm muộn trôi lệch nhau.
  ctx.banDoDaChot = new Map(banDo);
  for (const ca of kq.caTrung) {
    if (ca.kieu === 'nguoi') ctx.banDoDaChot.set(ca.idTrongFile, ca.id);
  }
  ctx.khaiMoiHienTai = khaiMoi.slice();

  hienDeXuat(kq);
  hienDem();
  hienNutDeXuat();
  hienKetQua(kq);
}

// ============================================================
// b64 — NÚT ĐỀ XUẤT KẾT NỐI
// ============================================================

/**
 * Chọn sẵn CẢ BẢNG: ai lan tới được thì chỉ vào người ấy, ai không thì
 * *"chưa có trong cây — thêm mới"*.
 *
 * ⚠ Không trái luật b60. Luật ấy cấm *bày sẵn khi chưa khai điểm neo nào*;
 * đây là một cái nút bấm SAU, và nó tự khoá cho tới khi có điểm neo đầu tiên.
 * Chốt chặn thật nằm trong chính `lanTheoQuanHe`: bản đồ rỗng → mảng rỗng.
 *
 * ⚠ Vì sao dòng KHÔNG lan tới được thì đặt là *"thêm mới"* chứ không để trống
 * (chủ dự án chốt 29/08/2026): đo được ở `lanTheoQuanHe`, phép lan chỉ nhận
 * khi tập ứng viên còn ĐÚNG MỘT người khớp tên — nên "lan không tới" gần như
 * luôn có nghĩa là *người này thật sự chưa có trong cây*. Để trống là bắt
 * người dùng gõ lại một kết luận app đã có. Nhưng nó vẫn phải NHÌN KHÁC dòng
 * người dùng tự khai, vì nó là suy đoán — xem `veDangHang`.
 */
function chayDeXuat() {
  if (!ctx) return;
  const ds = lanTheoQuanHe(state.tree, ctx.imported,
    ctx.banDoDaChot || new Map(), ctx.khaiMoiHienTai || []);
  ctx.duongDi = new Map();
  for (const x of ds) {
    if (ctx.chon.get(x.trongFile) !== '') continue;   // không đè dòng đã quyết
    datChon(x.trongFile, x.trongCay, LAN);
    ctx.duongDi.set(x.trongFile, x);
  }
  for (const [id, v] of [...ctx.chon]) {
    if (v === '') datChon(id, MOI, LAN);
  }
  ctx.daBamDeXuat = true;
  tinhLai();
}

/** Bỏ mọi lựa chọn app tự đặt, trả các dòng ấy về "chưa quyết". */
function xoaDeXuat() {
  if (!ctx) return false;
  let co = false;
  for (const [id, ng] of [...ctx.nguon]) {
    if (ng !== LAN) continue;
    ctx.chon.set(id, '');
    ctx.nguon.delete(id);
    const h = ctx.hang.find((x) => x.id === id);
    if (h) h.o.value = '';
    co = true;
  }
  if (ctx.duongDi) ctx.duongDi.clear();
  ctx.daBamDeXuat = false;
  return co;
}

function demDeXuat() {
  let n = 0;
  for (const ng of ctx.nguon.values()) if (ng === LAN) n++;
  return n;
}

/**
 * Khối nút, dựng lại mỗi lần tính lại.
 *
 * Ba trạng thái, và mỗi trạng thái chỉ bày đúng thứ bấm được:
 *
 * 1. **Chưa có điểm neo nào** → nút xám, kèm câu nói nó đang đợi gì. Bày một
 *    nút khoá tử tế hơn im lặng: người dùng biết đường ấy có tồn tại.
 * 2. **Có điểm neo, còn dòng trống** → nút bấm được.
 * 3. **Đang có đề xuất** → hai nút *Nhận* / *Bỏ*, và nút Trộn vẫn khoá.
 */
function hienNutDeXuat() {
  const o = ctx.oDeXuat;
  o.innerHTML = '';

  const soLan = demDeXuat();
  if (soLan > 0) {
    let soNoi = 0;
    for (const [id, ng] of ctx.nguon) {
      if (ng === LAN && ctx.chon.get(id) !== MOI) soNoi++;
    }
    const hop = document.createElement('div');
    hop.dataset.viec = 'khoi-de-xuat';
    hop.style.cssText =
      'margin-top:12px;padding:10px 12px;border:1px dashed #b8a888;' +
      'border-radius:9px;background:#fdfaf2;font-size:13px;line-height:1.6';
    hop.append(
      dongChu('App đã tự chọn ' + soLan + ' dòng: ' + soNoi + ' dòng nối vào ' +
              'người có sẵn, ' + (soLan - soNoi) + ' dòng để là người mới.'),
      dongChu('Hãy RÀ LẠI những dòng nét đứt. Thấy dòng nào sai thì tự chọn ' +
              'lại ở cột phải — chọn tay thì dòng ấy hết nét đứt.'));

    const ke = document.createElement('div');
    ke.dataset.viec = 'ke-de-xuat';
    ke.style.cssText = 'margin-top:6px;font-size:12px;color:#6a6058';
    for (const [id, x] of (ctx.duongDi || new Map())) {
      if (ctx.nguon.get(id) !== LAN) continue;
      ke.append(dongChu('· ' + tenFile(id) + ' → ' + tenCay(x.trongCay)
        + '   (suy từ ' + x.qua + ' của ' + tenFile(x.tuNguoi) + ')'));
    }
    hop.append(ke);

    const bo = nut('Bỏ hết, tự chọn lại từ đầu', false,
      () => { xoaDeXuat(); tinhLai(); });
    bo.dataset.viec = 'bo-de-xuat';
    bo.style.marginTop = '10px';
    hop.append(bo);
    o.append(hop);
    return;
  }

  let conTrong = 0;
  for (const v of ctx.chon.values()) if (v === '') conTrong++;
  if (conTrong === 0) return;

  const coNeo = (ctx.banDoDaChot && ctx.banDoDaChot.size > 0);
  const b = nut('Để app chọn nốt ' + conTrong + ' dòng còn lại', false,
    () => { if (coNeo) chayDeXuat(); });
  b.dataset.viec = 'de-xuat-ket-noi';
  b.disabled = !coNeo;
  b.style.marginTop = '12px';
  if (!coNeo) {
    b.style.cursor = 'default';
    b.style.background = '#eae4dc';
    b.style.color = '#8a8078';
  }
  o.append(b);

  const chu_ = document.createElement('div');
  chu_.dataset.viec = 'chu-duoi-de-xuat';
  chu_.style.cssText = 'margin-top:6px;font-size:12px;line-height:1.6;color:#8a8078';
  chu_.textContent = coNeo
    ? 'App đi theo bố mẹ · vợ chồng · con từ những người bạn đã khai. Ai còn ' +
      'đúng một người khớp thì nối vào người ấy; ai không thì để là người mới. ' +
      'Chọn xong bạn rà lại một lượt rồi mới bấm Hợp nhất.'
    : 'Khai đúng một người ở cột phải trước đã. Chưa có điểm neo nào thì app ' +
      'không có chỗ nào để bắt đầu lan.';
  o.append(chu_);
}

function tenFile(id) {
  const p = ctx.imported.persons.find((x) => x && x.id === id);
  return p ? (fullName(p) || '(chưa có tên)') : String(id || '');
}

function tenCay(id) {
  const cay = state.tree;
  const ds = (cay && Array.isArray(cay.persons)) ? cay.persons : [];
  const p = ds.find((x) => x && x.id === id);
  return p ? (fullName(p) || '(chưa có tên)') + ' (' + id + ')' : String(id || '');
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
    const ng = ctx.nguon.get(h.id);
    // Dòng `lan` cũng phải giữ nguyên như dòng `tay`: nó là kết quả của một
    // cú bấm, không phải thứ tính lại được từ `kq`.
    const giuNguyen = (ng === 'tay' || ng === LAN);
    if (!giuNguyen) {
      const g = deXuat.get(h.id);
      if (g === undefined) datChon(h.id, '', 'may');
      else datChon(h.id, g, 'may');
    }
    veDangHang(h);
  }
}

/**
 * Diện mạo một dòng theo nguồn của nó.
 *
 * ⚠ Dòng ĐỀ XUẤT phải nhìn khác hẳn dòng đã quyết, và khác **mà không cần
 * đọc chữ** — nhãn chữ xám thôi thì không đủ: người ta cuộn qua 29 dòng chứ
 * không đọc 29 cái nhãn. Nên nó mang thêm viền trái nét đứt và nền ngả vàng,
 * hai thứ thấy được bằng đuôi mắt.
 */
function veDangHang(h) {
  const ng = ctx.nguon.get(h.id);
  const trong = ctx.chon.get(h.id) === '';
  const laLan = ng === LAN;

  h.el.style.borderLeft = laLan ? '3px dashed #b8a888' : '';
  h.el.style.paddingLeft = laLan ? '8px' : '';
  h.el.style.background = laLan ? '#fdfaf2' : '';
  h.o.style.borderStyle = laLan ? 'dashed' : 'solid';

  if (trong) { h.nhan.textContent = ''; return; }
  if (laLan) {
    h.nhan.textContent = 'app tự chọn — hãy rà lại';
    h.nhan.style.color = '#8a6a2a';
    return;
  }
  // ⚠ `may` gọi là "app NHẬN RA", không phải "app đề xuất": nó nhận nhau bằng
  // căn cước (`uid` · sổ nhập · mã bản ghi), không phải phỏng đoán. Chữ "đề
  // xuất" từ b64 đã có một nghĩa riêng, và một chữ mang hai nghĩa trên cùng
  // một màn hình là chỗ người dùng hiểu sai mà không biết mình đang hiểu sai.
  const tay = ng === 'tay';
  h.nhan.textContent = tay ? 'bạn khai' : 'app nhận ra';
  h.nhan.style.color = tay ? '#2a6a4a' : '#8a8078';
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
  let lan = 0;
  let trong = 0;
  for (const [id, v] of ctx.chon) {
    const ng = ctx.nguon.get(id);
    if (ng === LAN) { lan++; continue; }
    if (v === '') trong++;
    else if (ng === 'tay') tay++;
    else may++;
  }
  ctx.oTinh.innerHTML = '';
  ctx.oTinh.append(dongChu(
    'Bạn khai: ' + tay + ' · App nhận ra: ' + may + ' · Chưa quyết: ' + trong));
  // Đếm riêng một dòng chứ không cộng vào ba con số trên: dòng app tự chọn
  // là thứ người dùng CÒN PHẢI RÀ, ba con số kia thì không. Gộp vào là giấu
  // mất đúng con số nói ra còn bao nhiêu việc phải nhìn.
  if (lan > 0) {
    const d = dongChu('App tự chọn, cần bạn rà lại: ' + lan);
    d.style.color = '#8a6a2a';
    ctx.oTinh.append(d);
  }
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
  neoVoLy:
    'Bộ điểm neo bạn vừa khai KHÔNG THỂ đúng: nó mâu thuẫn với quan hệ gia ' +
    'đình đang có trong cây. Từng dòng sai được kể ngay dưới đây — sửa lại ' +
    'ở cột phải rồi app tự kiểm lại.',
};

function hienKetQua(kq) {
  const o = ctx.oKetQua;
  o.innerHTML = '';

  if (!kq.duocTron) {
    o.append(veLoiNhan(LY_DO_CHAN[kq.lyDoChan] || kq.loi ||
                       'Chưa hợp nhất được.',
                       kq.lyDoChan === 'neoMauThuan' || kq.lyDoChan === 'neoVoLy'));
    for (const l of kq.loiNeoTay) {
      o.append(veLoiNhan('· ' + moTaFile(l.trongFile) + ': ' + l.vi, true));
    }
    veNutTron(o, false);
    return;
  }

  o.append(veNhanKhoi('Sau khi hợp nhất'));

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

  // Mức DƯỚI lỗi: đáng ngó lại, nhưng không khoá nút. Chặn những ca này là
  // dạy người dùng bấm qua cảnh báo mà không đọc — nếp đã chốt ở b42.
  if (Array.isArray(kq.ngo) && kq.ngo.length > 0) {
    o.append(veNhanKhoi('Đáng ngó lại — không chặn'));
    const n = document.createElement('div');
    n.dataset.viec = 'ngo-ghep';
    n.style.cssText =
      'padding:9px 11px;border:1px solid #ede0c8;border-radius:8px;' +
      'background:#fdf8ec;color:#7a5f2a;font-size:12px;line-height:1.7';
    for (const x of kq.ngo) {
      n.append(dongChu('· ' + moTaFile(x.trongFile) + ': ' + x.vi));
    }
    o.append(n);
  }

  if (t.soChuaNeo > 0) {
    o.append(veLoiNhan('Còn ' + t.soChuaNeo + ' bản ghi chưa quyết. Mỗi dòng ' +
      'bên trái phải có một câu trả lời thì mới hợp nhất được.', false));
  }
  veNutTron(o, t.soChuaNeo === 0, t);
}

/**
 * Nút trộn — từ b62 thì BẤM ĐƯỢC, và đây là chỗ không hoàn tác được.
 *
 * Ba nết của cái nút này, và cả ba đều vì một lý do ấy:
 *
 * 1. **Khoá khi chưa xong, nhưng vẫn BÀY RA.** Bày một cái nút xám thì tử tế
 *    hơn là im lặng: người dùng biết đường ấy có tồn tại và đang đợi gì.
 * 2. **Bấm một lần rồi tự khoá lại.** Đường ghi là bất đồng bộ; hai lần bấm
 *    là hai lần trộn, và lần thứ hai trộn vào một cây đã có kết quả của lần
 *    thứ nhất. Khoá ngay trong `click` chứ không đợi nơi gọi khoá hộ.
 * 3. **Câu dưới nút nói ra chỗ hai bên KHÁC NHAU sẽ ra sao.** Màn hình này
 *    chưa có ô chọn từng chỗ lệch, nên mọi chỗ lệch đều GIỮ của cây. Đó là
 *    phía an toàn, nhưng người bấm phải biết trước — không thì họ tưởng bấm
 *    xong là hai bên khớp nhau hết.
 */
function veNutTron(o, sanSang, thongKe) {
  const chay = sanSang && !!ctx.khiTron;
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.viec = 'tron-vao-cay';
  b.disabled = !chay;
  b.textContent = 'Hợp nhất vào gia phả đang mở';
  b.style.cssText =
    'display:block;width:100%;margin:14px auto 0;min-height:44px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'font-weight:600;line-height:1.35;border-radius:9px;' +
    'touch-action:manipulation;' +
    (chay
      ? 'cursor:pointer;background:#2a2622;color:#fffdf9;border:1px solid #2a2622'
      : 'cursor:default;background:#eae4dc;color:#8a8078;border:1px solid #e6e0d8');
  if (chay) {
    b.addEventListener('click', () => {
      if (b.disabled) return;
      b.disabled = true;
      b.textContent = 'Đang hợp nhất…';
      oLoi.textContent = '';
      oLoi.style.display = 'none';

      // ⚠ Trộn hỏng thì KHÔNG đóng bảng. Người dùng vừa ghép tay từng dòng —
      // đóng bảng là bắt họ làm lại từ đầu, và làm lại là một cơ hội nữa để
      // khai nhầm. Nên lỗi hiện ngay tại đây, nút mở lại, bảng còn nguyên.
      Promise.resolve(ctx.khiTron(ctx.tuyChon, thongKe)).then((kq2) => {
        if (!ctx || !lopPhu || !b.isConnected) return;
        if (kq2 && kq2.ok) return;          // xong rồi — nơi gọi tự lo phần sau
        b.disabled = false;
        b.textContent = 'Hợp nhất vào gia phả đang mở';
        oLoi.textContent = (kq2 && kq2.loi) || 'Chưa hợp nhất được, và chưa ghi gì.';
        oLoi.style.display = '';
      });
    });
  }
  o.append(b);

  const oLoi = veLoiNhan('', true);
  oLoi.dataset.viec = 'loi-tron';
  oLoi.style.display = 'none';
  o.append(oLoi);

  const chu_ = document.createElement('div');
  chu_.dataset.viec = 'chu-duoi-nut-tron';
  chu_.style.cssText =
    'margin-top:8px;font-size:12px;line-height:1.6;color:#8a8078';
  chu_.textContent = chay
    ? 'Bấm là ghi thật, và KHÔNG có nút hoàn tác. Chỗ nào hai bên nói khác ' +
      'nhau thì giữ nguyên của gia phả đang mở — nhập chỉ điền vào ô còn trống.'
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
