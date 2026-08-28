// ============================================================
// giapha · js/pages/chon-gia-pha.js
// Vai trò  : Màn hình Chọn gia phả — kể các cây mở được, đổi sang một cây
//            khác, quay về cây mặc định, và (chỉ chủ dự án) dựng gia phả mới
// Lớp      : pages — được phép gọi mọi lớp dưới
// Phụ thuộc: state, services/gas, config
// Phiên bản: 0.2.0 · Cập nhật: 28/08/2026 13:40
// ============================================================
//
// Nửa MÁY CHỦ đã xong ở bước 52: `layDanhSachGiaPha` · `chonGiaPha` ·
// `boChonGiaPha` đều chạy thật, và Google Drive tự lọc danh sách theo quyền
// của chính người đang gọi. Thiếu đúng một thứ: **nơi gọi**. Ba hàm ấy nằm im
// từ 28/08 sáng tới 28/08 trưa, tức chưa từng được nghiệm thu bằng đường đi
// thật — màn hình này là phép nghiệm thu ấy.
//
// ✓ **0.2.0 (28/08/2026 chiều) — nốt hàm thứ ba: `boChonGiaPha`.** Bản 0.1.0
// gọi hai trong ba hàm; hàm thứ ba nằm im thêm một buổi nữa. Xem quyết định 5.
//
// --- NĂM QUYẾT ĐỊNH ------------------------------------------------------
//
// 1. **Đổi cây xong thì TẢI LẠI TRANG.** Cùng lý lẽ với khôi phục sao lưu
//    (`backup.js` quyết định 3), nhưng nặng hơn: đổi cây là đổi *toàn bộ* —
//    người trung tâm đang đứng không tồn tại ở cây kia, `state.headRevisionId`
//    là vân tay của cây cũ, thư mục ảnh khác, mọi màn hình đang mở cầm mã của
//    cây cũ. Vá từng chỗ là một danh sách không ai biết đã đủ chưa;
//    `location.reload()` đi lại đúng đường khởi động đã chạy hàng trăm lần.
//
// 2. **Bấm một dòng KHÔNG đổi ngay** — nó mở hộp kể hậu quả rồi mới hỏi. Bấm
//    nhầm một dòng mà cả app nhảy sang cây khác là thứ làm người ta hoảng, và
//    đường quay lại thì phải tìm lại đúng màn hình này.
//
// 3. **Cây ĐANG MỞ vẫn kể ra, nhưng bấm không đi đâu cả.** Nó phải có mặt để
//    người dùng biết mình đang đứng ở đâu — `layDanhSachGiaPha` cũng xếp nó
//    lên đầu vì lý do đó. Bấm vào thì nói "đang mở", không gọi máy chủ.
//
// 4. **Nút *Dữ liệu mới* CHỈ CHỦ DỰ ÁN THẤY** (chủ dự án chốt 28/08/2026).
//    Đây là phép ẩn GIAO DIỆN, không phải chốt chặn an ninh — và không cần
//    phải là: `taoFileDuLieuMoi()` chạy dưới danh tính người gọi và dựng thư
//    mục trong Drive CỦA CHÍNH HỌ, nên người khác gọi được cũng chỉ tạo ra
//    một thư mục rỗng trong Drive của họ, không chạm được gì của dòng họ.
//
// 5. **CHỌN thẳng cây mặc định KHÔNG giống BỎ CHỌN — nên có hai đường riêng.**
//    Chọn là *ghi* mã cây ấy vào kho riêng của tài khoản; bỏ chọn là *xoá* hẳn
//    mã ấy đi để `FILE_ID` của `Config.gs` có tác dụng lại. Hai người đang mở
//    y hệt một cây, ngày người quản lý đổi `FILE_ID` sang cây khác thì đi hai
//    ngả: người đã bỏ chọn đi theo, người từng bấm chọn nằm lại cây cũ **mà
//    không có gì trên màn hình nói cho họ biết vì sao**. Vì thế nút *Quay về
//    gia phả mặc định* là một đường riêng, không phải một dòng trong danh sách.
//
//    ⚠ Trình duyệt KHÔNG biết được ba thứ, và cả cách viết chữ ở đây treo vào
//    đó: (a) `FILE_ID` là mã nào, (b) người này đã tự chọn gì chưa, (c) cây
//    mặc định tên gì. Cả ba nằm trong `Config.gs` và trong kho riêng — chỉ máy
//    chủ đọc được, mà `layDanhSachGiaPha` không kể ra. Nên hộp hỏi lại **không
//    hứa trước sẽ mở cây nào**; nó nói ra cơ chế, và chỉ sau khi máy chủ gật
//    mới hỏi lại danh sách để đọc TÊN cây vừa quay về. Muốn hứa trước thì phải
//    thêm `maMacDinh` + `daTuChon` vào `layDanhSachGiaPha`, tức sửa `Code.gs`
//    và bắt chủ dự án triển khai lại — xem mục ngay dưới, cùng một lý lẽ.
//
//    Nút này **mọi tài khoản đều thấy**, khác nút *Dữ liệu mới*: người không
//    tự chọn bao giờ bấm cũng chẳng đổi gì (xoá một khoá không có sẵn), còn
//    người mắc kẹt ở cây cũ thì đây là đường ra duy nhất.
//
// --- Vì sao KHÔNG đụng `gas/Code.gs` cho nút "Dữ liệu mới" ---------------
//
// `taoFileDuLieuMoi()` viết cho trình soạn thảo Apps Script: nó kể mọi thứ
// bằng `Logger.log` và **không trả về gì cả**. Muốn nó trả về `{ok, fileId}`
// thì phải sửa `Code.gs`, mà sửa `Code.gs` là bắt chủ dự án **triển khai lại**
// — thứ kế hoạch đã hứa việc 9b không cần tới.
//
// Đường đi ở đây không cần giá trị trả về: **chụp danh sách TRƯỚC, gọi, rồi
// chụp lại** — cây mới là cái `fileId` chưa từng có mặt. Phép so ấy đúng cả ở
// ca hỏng: `taoFileDuLieuMoi()` gặp thư mục đã chứa sẵn một gia phả thì nó
// dừng lặng lẽ, và lúc ấy **không có `fileId` nào mới** nên ta biết là chưa
// tạo được. So theo TÊN thì ca ấy sai nguy hiểm — cây cũ cùng tên vẫn nằm đó,
// và ta sẽ báo "đã tạo xong" rồi mở cho người ta một cây đã có dữ liệu.
//
// ⚠ Drive đánh chỉ mục tìm kiếm có ĐỘ TRỄ, nên `searchFiles` ngay sau khi tạo
// có thể chưa thấy file vừa sinh ra. Vì thế hỏi lại tối đa `SO_LAN_HOI` lần,
// cách nhau `NHIP_HOI` — và câu báo lúc chịu thua phải kể CẢ HAI khả năng,
// đừng khẳng định là chưa tạo được.

import { state } from '../state.js';
import { coMayChu, layDanhSachGiaPha, chonGiaPha, boChonGiaPha,
         taoFileDuLieuMoi } from '../services/gas.js';
import { rongHop, caoHop, leLopPhu, RONG_NUT_TOI_DA } from '../config.js';

/** Hỏi lại mấy lần sau khi tạo, vì Drive đánh chỉ mục có độ trễ. */
const SO_LAN_HOI = 4;
const NHIP_HOI   = 1500;

let lopPhu   = null;
let khoiDs   = null;    // khối danh sách, vẽ lại riêng
let dangChay = false;   // chặn bấm hai lần trong lúc chờ máy chủ

/** Màn hình có đang mở không — bài kiểm và nơi gọi đọc. */
export function dangMoChonGiaPha() {
  return !!lopPhu;
}

export function closeChonGiaPha() {
  if (lopPhu) lopPhu.remove();
  lopPhu   = null;
  khoiDs   = null;
  dangChay = false;
}

/**
 * Người đang đăng nhập có phải chủ dự án không.
 *
 * So email với `NGUOI_QUAN_LY` của `Config.gs`, KHÔNG dùng `vaiTro === 'chu'`:
 * `vaiTro` nói về quyền trên *cây đang mở*, nên chủ dự án mở một cây người
 * khác chia sẻ cho mình thì tụt xuống 'sua' và cái nút biến mất — mà đó đúng
 * là lúc họ hay cần nó nhất.
 */
function laChuDuAn() {
  const p = state.phien;
  if (!p) return false;
  const a = String(p.email || '').trim().toLowerCase();
  const b = String(p.nguoiQuanLy || '').trim().toLowerCase();
  return !!a && a === b;
}

/** Mở màn hình Chọn gia phả. */
export function openChonGiaPha() {
  closeChonGiaPha();

  lopPhu = document.createElement('div');
  lopPhu.id = 'giapha-lop-chon-gia-pha';
  lopPhu.style.cssText =
    'position:fixed;inset:0;background:rgba(42,38,34,.35);z-index:30;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:' + leLopPhu() + ';' +
    'font-family:system-ui,sans-serif;color:#2a2622';

  const hop = document.createElement('div');
  hop.id = 'giapha-chon-gia-pha';
  hop.style.cssText =
    'background:#fffdf9;border-radius:14px;padding:18px;box-sizing:border-box;' +
    'width:100%;max-width:' + rongHop(380, 600) + ';' +
    'max-height:' + caoHop(82) + ';overflow:auto;' +
    'box-shadow:0 8px 32px rgba(42,38,34,.28);' +
    '-webkit-overflow-scrolling:touch';

  hop.append(tieuDeHop('Chọn gia phả'));

  const phu = document.createElement('div');
  phu.textContent =
    'Bạn mở được những cây dưới đây. Chọn cây nào là việc của riêng tài khoản ' +
    'bạn — người khác trong họ vẫn mở cây của họ.';
  phu.style.cssText =
    'font-size:13px;line-height:1.55;color:#8a8078;margin-top:6px';
  hop.append(phu);

  khoiDs = document.createElement('div');
  khoiDs.style.cssText = 'margin-top:16px';
  hop.append(khoiDs);

  hop.append(nut('Đóng', false, true, () => closeChonGiaPha()));

  lopPhu.addEventListener('click', (e) => { if (e.target === lopPhu) closeChonGiaPha(); });
  lopPhu.append(hop);
  document.body.append(lopPhu);

  if (coMayChu()) {
    napDanhSach();
  } else {
    khoiDs.append(nhan('Các gia phả bạn mở được'));
    khoiDs.append(loiNhan(
      'Chưa nối được máy chủ nên chưa đọc được danh sách gia phả. Hãy mở gia ' +
      'phả bằng đúng đường link thường dùng.', false));
  }
}

// ============================================================
// Danh sách
// ============================================================

async function napDanhSach() {
  const khoi = khoiDs;
  if (!khoi) return;
  khoi.innerHTML = '';
  khoi.append(nhan('Các gia phả bạn mở được'));
  khoi.append(doanChu('Đang hỏi Google Drive…'));

  let kq;
  try {
    kq = await layDanhSachGiaPha();
  } catch (e) {
    if (khoiDs !== khoi) return;
    khoi.innerHTML = '';
    khoi.append(nhan('Các gia phả bạn mở được'));
    khoi.append(loiNhan(cauLoiMayChu(e), true));
    // Vẫn vẽ đường quay về mặc định, và đây là chỗ nó CẦN nhất: hỏng danh
    // sách thường vì cây từng chọn nay không mở được nữa (bị bỏ chia sẻ, bị
    // xoá). Bỏ chọn là đường ra duy nhất còn lại, ngay trên màn hình này.
    veKhoiMacDinh(khoi);
    return;
  }
  if (khoiDs !== khoi) return;

  khoi.innerHTML = '';
  khoi.append(nhan('Các gia phả bạn mở được'));

  if (!kq || !kq.ok) {
    khoi.append(loiNhan((kq && kq.loi) || 'Máy chủ không trả về danh sách.', true));
    veKhoiMacDinh(khoi);
    veNutTaoMoi(khoi);
    return;
  }

  const ds = Array.isArray(kq.ds) ? kq.ds : [];
  if (ds.length === 0) {
    // Danh sách rỗng KHÔNG phải lỗi, và cũng không phải "chưa có gia phả nào"
    // — Drive lọc theo quyền, nên đây thường là người chưa được chia sẻ gì.
    khoi.append(doanChu(
      'Không có gia phả nào được chia sẻ cho tài khoản này. Nhờ ' +
      ((state.phien && state.phien.nguoiQuanLy) || 'người quản lý') +
      ' chia sẻ file gia phả trên Google Drive.'));
    veKhoiMacDinh(khoi);
    veNutTaoMoi(khoi);
    return;
  }

  for (const muc of ds) khoi.append(dongGiaPha(muc));

  khoi.append(doanChu(
    'Bấm một dòng để đổi sang cây ấy. App sẽ hỏi lại trước khi đổi.'));

  veKhoiMacDinh(khoi);
  veNutTaoMoi(khoi);
}

/**
 * Một dòng bấm được.
 *
 * Kể TÊN cây, rồi một hàng phụ gộp số người · số cặp · lần sửa gần nhất.
 * Trường nào máy chủ không đọc được thì bỏ hẳn khỏi hàng, đúng luật chung của
 * app — trừ "chưa có ai", vì số không ở đây là một sự thật cần nói ra: gia phả
 * vừa dựng thì rỗng thật.
 */
function dongGiaPha(muc) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.giaPha = muc.fileId;
  if (muc.dangChon) b.dataset.dangMo = '1';
  b.style.cssText =
    'display:block;width:100%;text-align:left;margin-top:6px;padding:10px 11px;' +
    'border:1px solid ' + (muc.dangChon ? '#c8bfb2' : '#e6e0d8') + ';' +
    'border-radius:9px;background:' + (muc.dangChon ? '#f4efe7' : '#faf8f5') + ';' +
    'font-family:inherit;color:#2a2622;cursor:pointer;touch-action:manipulation';

  const d1 = document.createElement('div');
  d1.textContent = muc.ten + (muc.dangChon ? '   ·   đang mở' : '');
  d1.style.cssText = 'font-size:14px' + (muc.dangChon ? ';font-weight:600' : '');

  const d2 = document.createElement('div');
  d2.textContent = [
    demNguoi(muc.soNguoi),
    Number(muc.soCap) > 0 ? muc.soCap + ' cặp' : '',
    muc.suaDuoc ? '' : 'chỉ xem',
    muc.doiLuc ? 'sửa ' + muc.doiLuc : '',
  ].filter((x) => !!x).join('  ·  ');
  d2.style.cssText = 'font-size:12px;color:#8a8078;margin-top:2px';

  b.append(d1, d2);
  if (d2.textContent === '') d2.remove();

  b.addEventListener('click', () => {
    if (muc.dangChon) return moHopDangMo(muc);
    moHopDoiCay(muc);
  });
  return b;
}

/** "chưa có ai" · "1 người" · "57 người". Số không PHẢI nói ra. */
function demNguoi(so) {
  const n = Number(so);
  if (!isFinite(n) || n < 0) return '';
  return n === 0 ? 'chưa có ai' : n + ' người';
}

// ============================================================
// Hộp xác nhận đổi cây
// ============================================================

/** Bấm đúng cây đang mở. Không gọi máy chủ, chỉ nói ra rồi quay lại. */
function moHopDangMo(muc) {
  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (!hop) return;
  hop.innerHTML = '';
  hop.append(tieuDeHop('Đang mở gia phả này'));
  hop.append(doanChu(muc.ten + ' chính là cây app đang mở. Không có gì phải đổi.'));
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));
}

/**
 * Hỏi trước khi đổi. BỐN dòng hậu quả, cùng ràng buộc bố cục với hộp khôi
 * phục của `backup.js`: thêm ý mới thì phải gộp bớt chỗ khác, không thì nút
 * xác nhận tụt xuống quá mép dưới khung 390px.
 */
function moHopDoiCay(muc) {
  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (!hop) return;

  hop.innerHTML = '';
  hop.append(tieuDeHop('Mở gia phả này?'));
  hop.append(doanChu(muc.ten));

  for (const dong of bonDongHauQua(muc)) hop.append(gachDau(dong));

  const nutLam = nut('Mở gia phả này', true, true, () => chayDoiCay(muc, nutLam));
  nutLam.dataset.viec = 'xac-nhan-doi-cay';
  hop.append(nutLam);
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));
}

/**
 * BỐN dòng, và thứ tự cố ý: cái ĐƯỢC trước, cái MẤT sau, rồi đường lùi.
 *
 * Không có dòng nào doạ mất dữ liệu, vì đổi cây KHÔNG ghi gì lên Drive cả —
 * nó chỉ đổi một giá trị trong kho riêng của tài khoản. Doạ quá lời ở đây thì
 * lần sau người ta không dám bấm một cái nút vốn an toàn.
 */
function bonDongHauQua(muc) {
  const dangMo = (state.phien && state.phien.tenFileDuLieu)
    ? 'App đang mở ' + state.phien.tenFileDuLieu + '. '
    : '';

  const veCay = dangMo + 'Bấm xong, app mở ' + muc.ten + ': ' +
                [demNguoi(muc.soNguoi),
                 Number(muc.soCap) > 0 ? muc.soCap + ' cặp' : '']
                  .filter((x) => !!x).join(' · ') + '.';

  const veTai = 'Trang sẽ tải lại — sơ đồ, ảnh, danh sách đều dựng lại từ ' +
                'cây mới. Cây đang mở không bị đụng tới.';

  const veRieng = 'Lựa chọn này của riêng tài khoản bạn. Người khác trong họ ' +
                  'mở app vẫn thấy cây của họ.';

  const veLui = muc.suaDuoc
    ? 'Đổi lại lúc nào cũng được, theo đúng đường này.'
    : 'Bạn chỉ có quyền XEM cây ấy — mở ra đọc được, nhưng không sửa được gì. ' +
      'Đổi lại lúc nào cũng được, theo đúng đường này.';

  return [veCay, veTai, veRieng, veLui];
}

async function chayDoiCay(muc, nutLam) {
  if (dangChay) return;
  dangChay = true;
  nutLam.disabled = true;
  nutLam.style.opacity = '.45';

  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (hop) hop.append(doanChu('Đang đổi sang ' + muc.ten + '…'));

  let kq;
  try {
    kq = await chonGiaPha(muc.fileId);
  } catch (e) {
    dangChay = false;
    if (hop) veHopLoi(hop, cauLoiMayChu(e));
    return;
  }

  dangChay = false;
  if (!lopPhu || !hop) return;

  if (!kq || !kq.ok) {
    veHopLoi(hop, (kq && kq.loi) || 'Máy chủ không đổi được gia phả.');
    return;
  }

  hop.innerHTML = '';
  hop.append(tieuDeHop('Đã đổi gia phả'));
  hop.append(gachDau('App nay mở ' + (kq.ten || muc.ten) + '.'));
  hop.append(gachDau('Bấm nút dưới để tải lại trang và xem cây mới.'));
  const nutTai = nut('Tải lại trang', true, true, () => location.reload());
  nutTai.dataset.viec = 'tai-lai';
  hop.append(nutTai);
}

function veHopLoi(hop, cau, tieuDe) {
  hop.innerHTML = '';
  hop.append(tieuDeHop(tieuDe || 'Chưa đổi gia phả'));
  hop.append(loiNhan(cau, true));
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));
}

// ============================================================
// Quay về gia phả mặc định — `boChonGiaPha`
// ============================================================

/**
 * Khối cuối danh sách, MỌI tài khoản đều thấy — khác nút *Dữ liệu mới*.
 * Lý lẽ đầy đủ ở quyết định 5 đầu file.
 */
function veKhoiMacDinh(khoi) {
  if (!coMayChu()) return;

  const vach = document.createElement('div');
  vach.style.cssText = 'margin-top:16px;border-top:1px solid #f0ebe4;padding-top:12px';

  // MỘT dòng, không ba. Đo ngày 28/08/2026: bản ba dòng đẩy hộp từ 597px lên
  // 745px trong khung 390px, tức nút "Đóng" tụt xuống dưới nếp gấp ở mắt chủ
  // dự án — người duy nhất thấy CẢ HAI khối cuối. Chỗ giải thích đủ dài là hộp
  // hỏi lại, mở ra không tốn gì và không đổi gì.
  const giaiThich = document.createElement('div');
  giaiThich.textContent = 'Người quản lý đặt sẵn một cây mặc định cho cả họ.';
  giaiThich.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078';
  vach.append(giaiThich);

  const b = nut('Quay về gia phả mặc định', false, true, () => moHopMacDinh());
  b.dataset.viec = 'quay-ve-mac-dinh';
  vach.append(b);

  khoi.append(vach);
}

/**
 * Hỏi trước khi bỏ chọn. BỐN dòng, cùng ràng buộc bố cục với hộp đổi cây.
 *
 * ⚠ Không dòng nào HỨA sẽ mở cây tên gì: trình duyệt không đọc được `FILE_ID`
 * của `Config.gs`. Đoán bừa một cái tên ở đây là thứ sai tệ nhất màn hình này
 * làm được — người ta bấm vì tin cái tên ấy. Tên chỉ nói ra SAU, khi máy chủ
 * đã gật và danh sách hỏi lại đã trả lời.
 */
function moHopMacDinh() {
  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (!hop) return;

  hop.innerHTML = '';
  hop.append(tieuDeHop('Quay về gia phả mặc định?'));

  const dangMo = (state.phien && state.phien.tenFileDuLieu)
    ? 'App đang mở ' + state.phien.tenFileDuLieu + '. '
    : '';

  hop.append(gachDau(
    dangMo + 'Bấm xong, app quay về gia phả mặc định người quản lý đặt sẵn.'));
  hop.append(gachDau(
    'Chọn thẳng cây mặc định trong danh sách KHÔNG giống bỏ chọn: chọn là ghi ' +
    'cây ấy vào tài khoản bạn, nên ngày người quản lý đổi cây mặc định, bạn ' +
    'vẫn nằm lại cây cũ.'));
  hop.append(gachDau(
    'Chưa bao giờ tự chọn cây nào thì bấm cũng không đổi gì cả.'));
  hop.append(gachDau(
    'Trang sẽ tải lại. Không có gì trên Drive bị đụng tới, và chọn lại cây ' +
    'khác lúc nào cũng được.'));

  const nutLam = nut('Quay về mặc định', true, true, () => chayBoChon(nutLam));
  nutLam.dataset.viec = 'xac-nhan-mac-dinh';
  hop.append(nutLam);
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));
}

async function chayBoChon(nutLam) {
  if (dangChay) return;
  dangChay = true;
  nutLam.disabled = true;
  nutLam.style.opacity = '.45';

  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (hop) hop.append(doanChu('Đang bỏ lựa chọn riêng…'));

  let kq;
  try {
    kq = await boChonGiaPha();
  } catch (e) {
    dangChay = false;
    if (hop) veHopLoi(hop, cauLoiMayChu(e), 'Chưa bỏ được lựa chọn');
    return;
  }

  dangChay = false;
  if (!lopPhu || !hop) return;

  if (!kq || !kq.ok) {
    veHopLoi(hop, (kq && kq.loi) || 'Máy chủ không bỏ được lựa chọn.',
             'Chưa bỏ được lựa chọn');
    return;
  }

  // Máy chủ đã gật. TÊN cây mặc định chỉ đọc được BÂY GIỜ: hỏi lại danh sách,
  // dòng nào `dangChon` là cây `FILE_ID` vừa có tác dụng trở lại. Hỏi hỏng thì
  // thôi — việc chính đã xong rồi, và tải lại trang là thấy ngay.
  let ten = '';
  try {
    const m = (await danhSachThuong()).find((x) => x && x.dangChon);
    if (m) ten = m.ten;
  } catch (e) {}
  if (!lopPhu) return;

  hop.innerHTML = '';
  hop.append(tieuDeHop('Đã bỏ lựa chọn riêng'));
  hop.append(gachDau(ten
    ? 'App nay mở gia phả mặc định: ' + ten + '.'
    : 'App nay mở gia phả mặc định người quản lý đặt sẵn.'));
  hop.append(gachDau(
    'Từ nay người quản lý đổi cây mặc định thì app của bạn đi theo.'));
  hop.append(gachDau('Bấm nút dưới để tải lại trang.'));

  const nutTai = nut('Tải lại trang', true, true, () => location.reload());
  nutTai.dataset.viec = 'tai-lai';
  hop.append(nutTai);
}

// ============================================================
// "Dữ liệu mới" — chỉ chủ dự án thấy
// ============================================================

function veNutTaoMoi(khoi) {
  if (!laChuDuAn() || !coMayChu()) return;

  const vach = document.createElement('div');
  vach.style.cssText = 'margin-top:16px;border-top:1px solid #f0ebe4;padding-top:12px';

  const giaiThich = document.createElement('div');
  giaiThich.textContent =
    'Dựng một cây mới, rỗng, trong Google Drive của bạn. Gia phả đang mở ' +
    'không bị đụng tới.';
  giaiThich.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078';
  vach.append(giaiThich);

  const b = nut('Dữ liệu mới — dựng một gia phả rỗng', false, true, () => moHopTaoMoi());
  b.dataset.viec = 'du-lieu-moi';
  vach.append(b);

  khoi.append(vach);
}

function moHopTaoMoi() {
  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (!hop) return;

  hop.innerHTML = '';
  hop.append(tieuDeHop('Dựng một gia phả mới'));

  const o = document.createElement('input');
  o.type = 'text';
  o.id = 'giapha-ten-cay-moi';
  o.placeholder = 'Ví dụ: Lê Văn Trác';
  o.style.cssText =
    'display:block;width:100%;box-sizing:border-box;margin-top:12px;' +
    'padding:10px 11px;font-size:15px;font-family:inherit;color:#2a2622;' +
    'border:1px solid #e6e0d8;border-radius:9px;background:#faf8f5';
  hop.append(nhan('Tên gia phả'));
  hop.append(o);

  hop.append(gachDau(
    'Tên này thành tên thư mục và tên file trên Drive, và là thứ hiện ở màn ' +
    'hình chọn. Đã có gia phả trùng tên thì app không dựng đè lên.'));
  hop.append(gachDau(
    'Cây mới RỖNG, chưa có ai. Mở nó ra rồi thêm người đầu tiên ngay trong app.'));
  hop.append(gachDau(
    'Muốn người trong họ xem được thì phải chia sẻ trên Drive — app xong việc ' +
    'sẽ nhắc lại chia sẻ những gì.'));

  const khoiTin = document.createElement('div');
  khoiTin.id = 'giapha-tin-tao-moi';
  hop.append(khoiTin);

  const nutLam = nut('Dựng gia phả này', true, true, () => chayTaoMoi(o, nutLam, khoiTin));
  nutLam.dataset.viec = 'xac-nhan-tao-moi';
  hop.append(nutLam);
  hop.append(nut('Quay lại', false, true, () => openChonGiaPha()));

  try { o.focus(); } catch (e) {}
}

/**
 * Dựng cây mới, rồi TÌM nó bằng cách so hai lần chụp danh sách.
 *
 * Xem khối ghi chú đầu file: `taoFileDuLieuMoi()` không trả về gì, nên cây mới
 * được nhận ra bằng `fileId` chưa từng có mặt — không bằng tên.
 */
async function chayTaoMoi(o, nutLam, khoiTin) {
  if (dangChay) return;

  const ten = String(o.value || '').trim();
  if (!ten) {
    khoiTin.innerHTML = '';
    khoiTin.append(loiNhan('Chưa gõ tên gia phả.', true));
    try { o.focus(); } catch (e) {}
    return;
  }

  dangChay = true;
  nutLam.disabled = true;
  nutLam.style.opacity = '.45';
  o.disabled = true;
  khoiTin.innerHTML = '';
  khoiTin.append(doanChu('Đang dựng "' + ten + '" trên Google Drive…'));

  // 1. Chụp danh sách TRƯỚC.
  let truoc;
  try {
    truoc = await tapMaGiaPha();
  } catch (e) {
    return thuaTaoMoi(khoiTin, cauLoiMayChu(e));
  }

  // 2. Dựng. Hàm này không trả về gì — nó chỉ chạy xong hoặc ném lỗi.
  try {
    await taoFileDuLieuMoi(ten);
  } catch (e) {
    return thuaTaoMoi(khoiTin, cauLoiMayChu(e));
  }

  // 3. Hỏi lại tới khi thấy mã mới, hoặc chịu thua. Drive đánh chỉ mục có độ
  //    trễ, nên lần hỏi đầu chưa thấy KHÔNG có nghĩa là chưa tạo được.
  for (let lan = 0; lan < SO_LAN_HOI; lan++) {
    if (!lopPhu) return;
    if (lan > 0) await nghi(NHIP_HOI);

    let ds;
    try {
      ds = await danhSachThuong();
    } catch (e) {
      return thuaTaoMoi(khoiTin, cauLoiMayChu(e));
    }
    if (!lopPhu) return;

    const moi = ds.find((m) => m && !truoc.has(m.fileId));
    if (moi) {
      dangChay = false;
      return veHopDaTao(moi);
    }
  }

  thuaTaoMoi(khoiTin,
    'Máy chủ chạy xong nhưng chưa thấy gia phả mới nào trong danh sách. Hai ' +
    'khả năng, và chúng ngược nhau: đã có sẵn một gia phả tên "' + ten +
    '" nên app không dựng đè lên; hoặc cây đã dựng xong mà Google Drive chưa ' +
    'kịp đưa vào danh sách tìm kiếm. Đóng màn hình này, mở lại sau một phút ' +
    'rồi xem có cây mới không — ĐỪNG bấm dựng lần nữa ngay.');
}

function thuaTaoMoi(khoiTin, cau) {
  dangChay = false;
  if (!lopPhu || !khoiTin.isConnected) return;
  khoiTin.innerHTML = '';
  khoiTin.append(loiNhan(cau, true));
  const hop = lopPhu.querySelector('#giapha-chon-gia-pha');
  const b = hop && hop.querySelector('[data-viec="xac-nhan-tao-moi"]');
  if (b) { b.disabled = false; b.style.opacity = '1'; }
  const o = hop && hop.querySelector('#giapha-ten-cay-moi');
  if (o) o.disabled = false;
}

/**
 * Đã dựng xong. Kể lại việc phải làm trên Drive — `taoFileDuLieuMoi()` viết
 * lời nhắc ấy bằng `Logger.log`, thứ chỉ đọc được trong trình soạn thảo Apps
 * Script, tức người bấm nút ở đây không bao giờ nhìn thấy.
 */
function veHopDaTao(moi) {
  const hop = lopPhu && lopPhu.querySelector('#giapha-chon-gia-pha');
  if (!hop) return;

  hop.innerHTML = '';
  hop.append(tieuDeHop('Đã dựng xong'));
  hop.append(doanChu(moi.ten + '  ·  ' + moi.tenFile));

  hop.append(gachDau(
    'Cây mới rỗng, chưa có ai. Mở nó ra thì app hỏi ngay người đầu tiên.'));
  hop.append(gachDau(
    'Muốn người trong họ xem được thì vào Google Drive chia sẻ HAI thứ, ' +
    'từng cái một: file "' + moi.tenFile + '", và thư mục "Anh" bên cạnh nó.'));
  hop.append(gachDau(
    'ĐỪNG chia sẻ thư mục mẹ. Quyền của Drive kế thừa xuống mọi thứ bên ' +
    'trong và không gỡ lại được ở thư mục con — chia sẻ thư mục mẹ là trao ' +
    'luôn thư mục "Sao_luu", tức quyền ghi đè cả gia phả.'));

  const nutMo = nut('Mở gia phả vừa dựng', true, true,
                    () => chayDoiCay(moi, nutMo));
  nutMo.dataset.viec = 'mo-cay-vua-tao';
  hop.append(nutMo);
  hop.append(nut('Để sau — quay lại danh sách', false, true, () => openChonGiaPha()));
}

/** Tập mã của mọi gia phả đang thấy. Ném lỗi nếu máy chủ từ chối. */
async function tapMaGiaPha() {
  const ds = await danhSachThuong();
  return new Set(ds.map((m) => m && m.fileId).filter((x) => !!x));
}

/** `layDanhSachGiaPha` đã bóc vỏ. Ném lỗi thay vì trả về `{ok:false}`. */
async function danhSachThuong() {
  const kq = await layDanhSachGiaPha();
  if (!kq || !kq.ok) {
    throw new Error((kq && kq.loi) || 'Máy chủ không trả về danh sách gia phả.');
  }
  return Array.isArray(kq.ds) ? kq.ds : [];
}

function nghi(ms) {
  return new Promise((xong) => setTimeout(xong, ms));
}

// ============================================================
// Mấy mẩu dùng chung — cùng khuôn với backup.js
// ============================================================

/**
 * Lỗi ném ra từ `services/gas.js`.
 *
 * ⚠ Ca RIÊNG phải bắt, và màn hình này gặp nó nhiều hơn mọi màn hình khác: mã
 * trong `js/` nằm trên GitHub Pages nên đẩy lên là có hiệu lực ngay, còn
 * `gas/Code.gs` chỉ chạy sau khi bấm *Triển khai*. Giữa hai mốc ấy, trình
 * duyệt gọi một hàm máy chủ CHƯA TỒN TẠI và Apps Script trả về "Script
 * function not found" — câu mà người không lập trình đọc xong sẽ nghĩ app hỏng.
 */
function cauLoiMayChu(e) {
  const chu = String((e && e.message) || e || '');
  if (chu.indexOf('not found') >= 0 || chu.indexOf('Script function') >= 0) {
    return 'Máy chủ chưa có chức năng này. Người quản lý cần mở Apps Script và ' +
           'bấm: Triển khai → Quản lý các bản triển khai → bút chì → ' +
           'Phiên bản: "Phiên bản mới" → Triển khai. Sau đó tải lại trang.';
  }
  return chu || 'Không gọi được máy chủ.';
}

function tieuDeHop(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:19px;font-weight:600';
  return d;
}

function nhan(chu) {
  const n = document.createElement('div');
  n.textContent = chu;
  n.style.cssText =
    'font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a8078;' +
    'margin-bottom:6px;margin-top:12px';
  return n;
}

function doanChu(chu) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText = 'font-size:13px;line-height:1.55;color:#8a8078;margin-top:8px';
  return d;
}

function gachDau(chu) {
  const d = document.createElement('div');
  d.textContent = '• ' + chu;
  d.style.cssText =
    'font-size:13px;line-height:1.55;margin-top:8px;overflow-wrap:anywhere';
  return d;
}

function loiNhan(chu, laLoi) {
  const d = document.createElement('div');
  d.textContent = chu;
  d.style.cssText =
    'margin-top:10px;padding:9px 11px;font-size:12px;line-height:1.5;border-radius:8px;' +
    (laLoi
      ? 'color:#8a3a2a;background:#fbf0ec;border:1px solid #f0d8d0'
      : 'color:#8a8078;background:#faf8f5;border:1px solid #f0ebe4');
  return d;
}

function nut(chu, chinh, batDuoc, chay) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = chu;
  b.disabled = !batDuoc;
  b.style.cssText =
    'display:block;width:100%;margin:12px auto 0;min-height:42px;padding:8px 14px;' +
    'max-width:' + RONG_NUT_TOI_DA + ';font-size:14px;font-family:inherit;' +
    'border-radius:9px;touch-action:manipulation;line-height:1.35;' +
    'cursor:' + (batDuoc ? 'pointer' : 'not-allowed') + ';' +
    'opacity:' + (batDuoc ? '1' : '0.45') + ';' +
    (chinh
      ? 'background:#2a2622;color:#fffdf9;border:1px solid #2a2622;font-weight:600'
      : 'background:#faf8f5;color:#2a2622;border:1px solid #e6e0d8');
  if (batDuoc) b.addEventListener('click', chay);
  return b;
}
