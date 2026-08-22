// ============================================================
// giapha · js/utils/glyph.js
// Vai trò  : Vẽ một BIỂU TƯỢNG CHỮ cho vừa vặn và đúng tâm một vòng tròn
// Lớp      : utils — được gọi bởi: pages, domains · được phép gọi: config
// Phụ thuộc: (không)
// Phiên bản: 1.0.0 · Cập nhật: 22/08/2026 09:10
// ============================================================
//
// --- Vì sao phải ĐO chứ không gõ một con số ------------------------------
//
// Bước 40 đặt biểu tượng bằng **90% bề ngang vòng tròn**, một con số cho tất.
// Chủ dự án nhìn app thật và bác bỏ ngay:
//
//   > *"tại màn hình chính, sửa kính lúp do nó tràn ra ngoài vòng tròn của nút.
//   > trong menu vòng tròn, icon thùng rác, chiếc nhẫn, kết nối, kéo đều bị
//   > tràn. […] chữ i ở màn hình chính vừa phải rồi, nhưng bị lệch lên trên,
//   > tâm chữ i chưa rơi vào tâm đường tròn."*
//
// Hai điều một con số không bao giờ giải quyết được:
//
// 1. **Mỗi ký tự có VÙNG MỰC khác nhau.** `ⓘ` là một hình tròn gọn; `💍` `🗑`
//    `🔗` `✂` `🔍` là những hình gần VUÔNG. Một hình vuông rộng 90% đường kính
//    thì **bốn góc của nó nằm NGOÀI đường tròn** — đó đúng là chỗ tràn chủ dự
//    án thấy. Cùng một con số, ký tự này vừa, ký tự kia tràn.
//
// 2. **Mỗi ký tự đặt mực ở một độ cao khác nhau so với đường chân chữ.** `ⓘ`
//    ngồi từ chân chữ lên tới chiều cao chữ hoa, nên căn giữa theo *hộp dòng*
//    — thứ `align-items:center` làm — thì mực của nó **lệch lên trên**. Đó là
//    lỗi thứ ba chủ dự án chỉ ra, và không cách nào chữa bằng cách đổi cỡ chữ.
//
// Nên hàm này **đo vùng mực thật** bằng `measureText().actualBoundingBox*` —
// Chrome trả về đúng bốn mép của nét vẽ, không phải mép hộp chữ — rồi tính ra
// cỡ và chỗ đặt. Đo một lần cho mỗi ký tự rồi nhớ lại.
//
// --- HAI luật của cỡ biểu tượng -----------------------------------------
//
// 1. **KHÔNG TRÀN.** Vùng mực nằm trọn trong một đường tròn nhỏ hơn vòng tròn
//    đúng `KHE_HO` — tính theo phần trăm nên khe hở thật co giãn theo cỡ nút:
//    2,6px ở nút 44px của màn hình chính, 3,9px ở vòng tròn 67px trên máy để
//    bàn. Quy ra **0,7 – 1,0mm**, đúng khoảng chủ dự án chốt.
//
// 2. **KHÔNG TO QUÁ `TRAN` theo cạnh dài.** Luật 1 đo theo ĐƯỜNG CHÉO của
//    vùng mực, nên nó gần như không ràng buộc gì với những ký tự **hẹp**:
//    `⬆` cao gấp đôi bề ngang, riêng luật 1 cho nó nở tới **30 × 88** — một
//    mũi tên dài ngoẵng đứng cạnh những biểu tượng vuông vức 62 × 62. Trần 65
//    cắt đúng chỗ ấy.
//
// Hai luật cùng áp, lấy cái NGHIÊM hơn. Đo trên mười hai ký tự đang dùng
// (`kiem-bieu-tuong.mjs`), kết quả rơi vào một dải hẹp — và **đó mới là thứ
// đáng giá**, vì nó là cái làm cả bảng biểu tượng trông cùng một cỡ:
//
//   luật 1 chặn (ký tự VUÔNG)  ⓘ + ◎ ⚙ 🔍 🔗 ✂   ~62 × 62
//   luật 2 chặn (ký tự HẸP)    − ⬆ ⬇ 💍 🗑        cạnh dài đúng 65
//
// ⚠ Đừng chép câu *"trần 65 là để giữ `ⓘ` khỏi nở ra 88%"* — đã đo, và SAI:
// vùng mực của `ⓘ` là một hình VUÔNG 97 × 97 (hộp bao của một vòng tròn), nên
// luật 1 đã ép nó xuống 62 rồi, trần không đụng tới. Luật 2 sinh ra vì `⬆`,
// không vì `ⓘ`.

/** Khe hở giữa mép mực và viền vòng tròn, tính bằng % đường kính. */
export const KHE_HO = 6;

/**
 * Trần của CẠNH DÀI vùng mực, tính bằng % đường kính. Chỉ ràng buộc những ký
 * tự HẸP — xem luật 2 ở đầu file.
 */
export const TRAN = 65;

/**
 * Phông dùng để ĐO **phải trùng khít** phông dùng để VẼ, nếu không con số đo
 * được nói về một hình dạng khác cái hình sẽ hiện ra. Vì thế nó là hằng số
 * chung, và cả hai chỗ đều lấy từ đây.
 *
 * ⚠ **Cố ý KHÔNG kể tên phông emoji ra đây.** Bản đầu viết
 * `system-ui, "Segoe UI Emoji", …` cho chắc, và nó **đổi hẳn hình hai mũi
 * tên** `⬆` `⬇` của mục *+ Cha mẹ* và *+ Con*: hai ký tự ấy mặc định là ký tự
 * CHỮ (mũi tên đen mảnh), nhưng gọi đích danh phông emoji thì trình duyệt lấy
 * bản emoji — một cái nút vuông xanh. Không ai yêu cầu đổi, và đổi thì cả
 * bảng biểu tượng đọc ra khác hẳn. Cứ để trình duyệt tự chọn như từ trước
 * tới nay.
 */
export const PHONG = 'system-ui, sans-serif';

const NS = 'http://www.w3.org/2000/svg';
const CO_DO = 100;        // cỡ chữ lúc đo — số lớn cho phép đo đỡ bị làm tròn
const daDo = new Map();   // ký tự -> vùng mực, hoặc null nếu không đo được
let ctx = null;

/**
 * Vẽ một biểu tượng nằm gọn và đúng tâm trong vòng tròn bọc ngoài nó.
 *
 * Trả về một `<svg>` có `viewBox="0 0 100 100"` — nghĩa là nó **tự co giãn**
 * theo bề ngang thật của vòng tròn, kể cả khi bề ngang ấy là một con số phần
 * trăm co theo khổ màn hình. Đây là lý do dùng SVG chứ không dùng `font-size`
 * bằng px: menu vòng tròn rộng từ 280px tới 360px, không có con số px nào đúng
 * cho cả hai đầu.
 *
 * `fill:currentColor` để nơi gọi đổi màu bằng CSS như với chữ thường — hai mục
 * đỏ *Gỡ nối* và *Xoá* vẫn đỏ. Emoji thì hệ điều hành tự vẽ màu của nó,
 * `fill` không đụng tới.
 *
 * @param {string} ky   một ký tự, thường là emoji
 * @param {{kheHo?:number, tran?:number}} [tuyChon]
 * @returns {SVGElement}
 */
export function veBieuTuongTron(ky, tuyChon = {}) {
  const kheHo = typeof tuyChon.kheHo === 'number' ? tuyChon.kheHo : KHE_HO;
  const tran  = typeof tuyChon.tran  === 'number' ? tuyChon.tran  : TRAN;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + CO_DO + ' ' + CO_DO);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.display = 'block';

  const chu = document.createElementNS(NS, 'text');
  chu.setAttribute('font-family', PHONG);
  chu.setAttribute('fill', 'currentColor');
  chu.textContent = ky;

  const dat = tinhChoDat(ky, kheHo, tran);
  chu.setAttribute('font-size', String(dat.co));
  chu.setAttribute('x', String(dat.x));
  chu.setAttribute('y', String(dat.y));

  svg.append(chu);
  return svg;
}

/**
 * Cỡ chữ và toạ độ gốc chữ, tính theo khung `viewBox` 100 × 100.
 *
 * ⚠ **Không đặt `text-anchor` cũng không đặt `dominant-baseline`.** Hai thuộc
 * tính ấy căn theo **hộp chữ** — thứ vừa chứng minh là căn sai. Ở đây gốc chữ
 * được tính thẳng từ vùng MỰC, nên phải để nguyên gốc mặc định (`start` +
 * đường chân chữ) thì phép tính mới đúng.
 */
function tinhChoDat(ky, kheHo, tran) {
  const R = CO_DO / 2 - kheHo;          // bán kính vùng được phép có mực
  const muc = doVungMuc(ky);

  // Không đo được (phông lạ, canvas bị chặn) thì lùi về một con số an toàn —
  // hơi nhỏ còn hơn tràn ra ngoài, và vẫn căn giữa theo hộp chữ như cũ.
  if (!muc) {
    return { co: CO_DO * 0.55, x: CO_DO / 2, y: CO_DO / 2 + CO_DO * 0.2, luiVe: true };
  }

  const nuaCheo = Math.sqrt(muc.rong * muc.rong + muc.cao * muc.cao) / 2;
  const canhLon = Math.max(muc.rong, muc.cao);

  const tyLeKhongTran = R / nuaCheo;              // luật 1
  const tyLeDuoiTran  = tran / canhLon;           // luật 2
  const tyLe = Math.min(tyLeKhongTran, tyLeDuoiTran);

  return {
    co: CO_DO * tyLe,
    // Đưa TÂM VÙNG MỰC về đúng tâm khung. `muc.trai` và `muc.tren` là mép mực
    // so với gốc chữ, nên gốc chữ phải lùi lại đúng bằng khoảng cách từ nó tới
    // tâm vùng mực.
    x: CO_DO / 2 - (muc.trai + muc.rong / 2) * tyLe,
    y: CO_DO / 2 - (muc.tren + muc.cao  / 2) * tyLe,
  };
}

/**
 * Bốn mép của nét vẽ thật, đo ở cỡ chữ `CO_DO`, so với gốc chữ.
 *
 * `actualBoundingBoxLeft` đếm NGƯỢC chiều trục x (dương là sang trái), và
 * `actualBoundingBoxAscent` đếm ngược chiều trục y (dương là lên trên) — nên
 * cả hai phải đổi dấu mới thành toạ độ. Sai chỗ này thì biểu tượng lệch đúng
 * bằng chiều cao của chính nó, một lỗi trông như "chữ nhảy ra ngoài nút".
 */
function doVungMuc(ky) {
  if (daDo.has(ky)) return daDo.get(ky);

  let kq = null;
  try {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    ctx.font = CO_DO + 'px ' + PHONG;
    const m = ctx.measureText(ky);
    const trai = -m.actualBoundingBoxLeft;
    const tren = -m.actualBoundingBoxAscent;
    const rong = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
    const cao  = m.actualBoundingBoxDescent + m.actualBoundingBoxAscent;
    if (isFinite(rong) && isFinite(cao) && rong > 0 && cao > 0) {
      kq = { trai, tren, rong, cao };
    }
  } catch (e) {
    kq = null;
  }

  daDo.set(ky, kq);
  return kq;
}

/** Chỉ cho bài kiểm: đọc lại con số đo được mà không phải dựng ra một cái SVG. */
export function _doThu(ky, kheHo = KHE_HO, tran = TRAN) {
  return { muc: doVungMuc(ky), dat: tinhChoDat(ky, kheHo, tran) };
}
