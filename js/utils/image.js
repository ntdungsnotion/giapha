// ============================================================
// giapha · js/utils/image.js
// Vai trò  : Nén ảnh phía trình duyệt, đường dẫn Drive, bóng người mặc định
// Lớp      : utils — được gọi bởi: pages · được phép gọi: config
// Phụ thuộc: config (PHOTO)
// Phiên bản: 1.1.0 · Cập nhật: 20/08/2026 12:40
// ============================================================
//
// BA LUẬT CỦA FILE NÀY
//
// 1. NÉN Ở TRÌNH DUYỆT, KHÔNG NÉN Ở MÁY CHỦ. Ảnh điện thoại ngày nay là
//    3–8 MB. Gửi nguyên qua `google.script.run` là gửi một chuỗi base64 dài
//    gấp rưỡi số đó. Ô trên sơ đồ rộng 120px, vòng tròn thông tin rộng chừng
//    76px — không có lý do gì để một tấm 4000px đi qua đường dây.
//
// 2. LUÔN RA JPEG, kể cả khi vào là PNG hay HEIC. Ảnh chân dung không cần nền
//    trong suốt, còn PNG của cùng một khuôn mặt thường nặng gấp ba bốn lần.
//    ⚠ Hệ quả phải nói ra: PNG có nền trong suốt sẽ thành nền ĐEN, không phải
//    nền trắng — canvas khởi tạo bằng pixel trong suốt và JPEG không có kênh
//    alpha. Vì thế hàm này TỰ TÔ NỀN TRẮNG trước khi vẽ ảnh lên.
//
// 3. KHÔNG TỰ ĐỌC, KHÔNG TỰ GỬI. File này chỉ biến một `File` thành một chuỗi
//    base64 và dựng mấy đường dẫn. Việc gửi lên là của `services/gas.js`,
//    việc gắn ảnh vào người là của `domains/media.js`. Đây là lớp `utils`.
//
// --- Vì sao xoay ảnh lại là chuyện phải lo ------------------------------
//
// Ảnh chụp bằng điện thoại thường nằm ngang trong file, kèm một thẻ EXIF bảo
// trình xem "xoay 90° đi". Vẽ thẳng lên canvas là mất thẻ đó, và ảnh chân
// dung nằm ngửa ra. `createImageBitmap(file, { imageOrientation: 'from-image' })`
// đọc hộ thẻ ấy. Trình duyệt cũ không có thì rơi về đường `<img>` — ảnh vẫn
// lên, chỉ là có thể nằm ngang. Thà nghiêng còn hơn không có.

import { PHOTO } from '../config.js';

/**
 * Nén một file ảnh xuống cỡ dùng được cho sơ đồ.
 *
 * ⚠ **Trả về NHIỀU HƠN một Blob** — khác chữ ký ghi trong `KHUNG-MA-NGUON_V15`
 * (`Promise<Blob>`). Đổi có chủ ý: nơi gọi luôn cần biết ảnh gốc bao nhiêu
 * byte, sau nén bao nhiêu, và chuỗi base64 dài bao nhiêu — đó chính là ba con
 * số của phép thử bước 28. Bắt nơi gọi đo lại là bắt nó giải mã ảnh lần nữa.
 *
 * @param {File|Blob} file
 * @param {{maxWidth?:number, jpegQuality?:number}} [tuyChon]
 * @returns {Promise<{
 *   base64: string,   // KHÔNG kèm tiền tố "data:image/jpeg;base64,"
 *   mime: string,
 *   rong: number,
 *   cao: number,
 *   byteGoc: number,
 *   byteNen: number,
 *   daiBase64: number
 * }>}
 */
export async function compressImage(file, tuyChon = {}) {
  if (!file) throw new Error('Chưa chọn file ảnh nào.');

  const maxWidth = so(tuyChon.maxWidth, PHOTO.maxWidth);
  const chatLuong = so(tuyChon.jpegQuality, PHOTO.jpegQuality);

  const anh = await doAnh(file);
  const { rong, cao } = coSauKhiThuNho(anh.rong, anh.cao, maxWidth);

  const khung = document.createElement('canvas');
  khung.width = rong;
  khung.height = cao;

  const but = khung.getContext('2d');
  // Nền trắng TRƯỚC khi vẽ — luật 2 ở đầu file. Thiếu dòng này thì mọi ảnh PNG
  // có nền trong suốt sẽ ra nền đen.
  but.fillStyle = '#ffffff';
  but.fillRect(0, 0, rong, cao);
  but.drawImage(anh.nguon, 0, 0, rong, cao);

  if (typeof anh.donDep === 'function') anh.donDep();

  const base64 = khung.toDataURL('image/jpeg', chatLuong);
  const phan = boTienTo(base64);

  return {
    base64: phan,
    mime: 'image/jpeg',
    rong,
    cao,
    byteGoc: typeof file.size === 'number' ? file.size : 0,
    byteNen: soByteCuaBase64(phan),
    daiBase64: phan.length,
  };
}

/**
 * Đường dẫn thumbnail của Drive.
 *
 * ⚠ **Đường này chỉ hiện ảnh khi trình duyệt gửi kèm cookie Google của người
 * đang xem, hoặc khi file đã mở quyền "bất kỳ ai có đường liên kết".** Cái nào
 * đúng trong khung iframe của Apps Script là câu hỏi mà phép thử bước 28 sinh
 * ra để trả lời — đừng đoán, hãy xem `NK-B28`.
 *
 * @param {string} fileId
 * @param {number} [size]  bề ngang mong muốn, pixel
 */
export function driveThumbUrl(fileId, size = PHOTO.thumbSize) {
  if (!fileId) return '';
  return 'https://drive.google.com/thumbnail?id=' +
    encodeURIComponent(String(fileId)) + '&sz=w' + Math.max(16, Math.round(size));
}

/**
 * Đường dẫn ảnh qua `lh3.googleusercontent.com` — cách thứ hai, cùng một họ
 * với `driveThumbUrl` nhưng đi qua máy chủ khác của Google. Có lúc cái này
 * hiện được mà cái kia không, nên phép thử đo cả hai.
 */
export function driveLh3Url(fileId, size = PHOTO.thumbSize) {
  if (!fileId) return '';
  return 'https://lh3.googleusercontent.com/d/' +
    encodeURIComponent(String(fileId)) + '=w' + Math.max(16, Math.round(size));
}

/** Ghép một chuỗi base64 thành `src` dùng thẳng được cho thẻ `<img>`. */
export function dataUri(base64, mime = 'image/jpeg') {
  if (!base64) return '';
  return 'data:' + mime + ';base64,' + base64;
}

// ============================================================
// BÓNG NGƯỜI — ảnh mặc định khi chưa ai gắn ảnh thật
// ============================================================
//
// Ba hình: nam, nữ, và không rõ. Cùng một khuôn với Quick Family Tree — nền
// tròn màu đặc, bóng người màu trắng — vì chủ dự án đã quen mắt với nó và đã
// chỉ đúng vào ảnh `anh-qft/ket hon trong gia toc.png` khi chốt (20/08/2026).
//
// ⚠ **MÀU do nơi gọi đưa vào, file này không tự chọn.** Ba màu ấy sống ở bảng
// `VE` trong `domains/render.js` (`vienNam` · `vienNu` · `vienKhongRo`) — cùng
// một màu đang dùng cho viền ô. Chép chúng vào đây là dựng ra một bản thứ hai,
// và một hôm nào đó đổi màu viền xong sẽ thấy bóng người vẫn màu cũ.
//
// ⚠ Và **`sex: "U"` phải có hình riêng, không được lẫn vào nam.** Dữ liệu có
// hai người mang giá trị này (P0040, P0052). Vẽ họ y hệt nam là khai một điều
// gia phả không biết.
//
// Vì sao là SVG chứ không phải file PNG trong repo: không phải tải thêm file
// nào, không hỏng khi mạng chậm, và phóng to bao nhiêu cũng nét — ô sơ đồ vẽ
// 40px nhưng vòng tròn thông tin vẽ tới 76px.

/** Ba bộ khuôn, vẽ trong khung 60×60. `dau` là vòng tròn đầu, `than` là vai. */
const BONG = {
  M: {
    dau: { cx: 30, cy: 22, r: 11 },
    than: 'M 8 58 C 8 44 17 38 30 38 C 43 38 52 44 52 58 Z',
    toc: '',
  },
  F: {
    dau: { cx: 30, cy: 24, r: 10 },
    than: 'M 11 58 C 11 46 19 40.5 30 40.5 C 41 40.5 49 46 49 58 Z',
    // Tóc dài xoà xuống hai bên mặt: một khối ĐẶC hình quả chuông, rộng dần
    // xuống dưới. Đây là dấu hiệu duy nhất phân biệt với hình nam ở cỡ 40px —
    // thử bằng khuôn mặt thon hơn hay vai hẹp hơn thì ở cỡ ấy hai hình trông
    // giống hệt nhau.
    //
    // ⚠ **Đặc, KHÔNG phải một vành tóc quanh mặt.** Bản đầu vẽ vành tóc rỗng
    // giữa, để lộ nền màu giữa tóc và đầu — ở 200px nó thành một cái khăn trùm,
    // ở 40px nó thành một vệt nhoè. Cả hai đều không đọc ra "tóc dài".
    toc: 'M 30 8 C 20.5 8 16.5 15.5 17 24.5 C 17.4 32 19 38.5 18.5 43.5 ' +
         'C 21 44.5 25 45 30 45 C 35 45 39 44.5 41.5 43.5 ' +
         'C 41 38.5 42.6 32 43 24.5 C 43.5 15.5 39.5 8 30 8 Z',
  },
  U: {
    // Không rõ giới: đầu tròn, thân là một khối thang — cố ý KHÔNG có đường
    // vai cong của hình nam, để ở cỡ nhỏ vẫn nhận ra là hình thứ ba.
    dau: { cx: 30, cy: 23, r: 10.5 },
    than: 'M 12 58 C 12.5 48 15 41.5 17.5 40 L 42.5 40 C 45 41.5 47.5 48 48 58 Z',
    toc: '',
  },
};

/**
 * Bóng người mặc định, trả về một `data:` URI dùng được cho `<img src>` lẫn
 * `<image href>` trong SVG.
 *
 * @param {string} sex   'M' · 'F' · bất kỳ thứ gì khác coi là 'U'
 * @param {string} mauNen  màu nền vòng tròn — lấy từ `VE` của render.js
 */
export function anhMacDinhUri(sex, mauNen) {
  const k = BONG[sex] ? sex : 'U';
  const b = BONG[k];
  const nen = mauNen || '#8a8078';

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">' +
    '<rect width="60" height="60" fill="' + nen + '"/>' +
    (b.toc ? '<path d="' + b.toc + '" fill="#ffffff"/>' : '') +
    '<circle cx="' + b.dau.cx + '" cy="' + b.dau.cy + '" r="' + b.dau.r + '" fill="#ffffff"/>' +
    '<path d="' + b.than + '" fill="#ffffff"/>' +
    '</svg>';

  // encodeURIComponent chứ không phải base64: chuỗi ngắn hơn, đọc được khi soi
  // bằng công cụ của trình duyệt, và không cần btoa (btoa nghẹn với ký tự
  // ngoài Latin-1 — ở đây chưa có, nhưng đừng dựng sẵn một cái bẫy).
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/** Số byte thành chữ người thường đọc được: `142 KB`, `3,4 MB`. */
export function moTaCo(soByte) {
  const n = Number(soByte);
  if (!isFinite(n) || n <= 0) return '0 KB';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
}

// ============================================================
// Phần trong nhà
// ============================================================

/**
 * Giải mã file thành thứ `drawImage` nhận được, ưu tiên `createImageBitmap`
 * vì chỉ nó đọc được thẻ xoay EXIF.
 */
async function doAnh(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bm = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        nguon: bm,
        rong: bm.width,
        cao: bm.height,
        donDep: () => { if (typeof bm.close === 'function') bm.close(); },
      };
    } catch (e) {
      // Trình duyệt hiểu hàm nhưng không hiểu tuỳ chọn `imageOrientation`,
      // hoặc không giải mã nổi định dạng này. Rơi xuống đường dưới.
    }
  }
  return doAnhBangThe(file);
}

/** Đường dự phòng: nạp qua thẻ `<img>`. Không đọc được thẻ xoay EXIF. */
function doAnhBangThe(file) {
  return new Promise((thanhCong, thatBai) => {
    const duong = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => thanhCong({
      nguon: im,
      rong: im.naturalWidth,
      cao: im.naturalHeight,
      donDep: () => URL.revokeObjectURL(duong),
    });
    im.onerror = () => {
      URL.revokeObjectURL(duong);
      thatBai(new Error(
        'Trình duyệt không mở được file này như một tấm ảnh. ' +
        'Ảnh iPhone định dạng HEIC thường gặp lỗi này — chọn lại bằng ' +
        'định dạng JPG hoặc PNG.'
      ));
    };
    im.src = duong;
  });
}

/**
 * Cỡ sau khi thu nhỏ. CHỈ THU, KHÔNG PHÓNG: ảnh vốn đã nhỏ hơn `maxWidth` thì
 * giữ nguyên — phóng lên chỉ làm file nặng thêm mà không rõ thêm một chi tiết
 * nào.
 *
 * Lấy cạnh DÀI làm chuẩn, không lấy bề ngang: ảnh chân dung dựng đứng có bề
 * ngang nhỏ mà chiều cao lớn, canh theo bề ngang thì nó vẫn cao 1400px.
 */
function coSauKhiThuNho(rong, cao, maxWidth) {
  const canhDai = Math.max(rong, cao);
  if (!canhDai || canhDai <= maxWidth) {
    return { rong: Math.max(1, rong), cao: Math.max(1, cao) };
  }
  const ti = maxWidth / canhDai;
  return {
    rong: Math.max(1, Math.round(rong * ti)),
    cao: Math.max(1, Math.round(cao * ti)),
  };
}

/** Bỏ tiền tố `data:image/jpeg;base64,` — máy chủ chỉ nhận phần chữ. */
function boTienTo(chuoi) {
  const s = String(chuoi || '');
  const dau = s.indexOf(',');
  return dau === -1 ? s : s.slice(dau + 1);
}

/** Số byte thật của một chuỗi base64, tính từ độ dài và số dấu `=` đuôi. */
function soByteCuaBase64(chuoi) {
  const s = String(chuoi || '');
  if (!s.length) return 0;
  let dem = 0;
  if (s.endsWith('==')) dem = 2;
  else if (s.endsWith('=')) dem = 1;
  return Math.max(0, Math.floor(s.length * 3 / 4) - dem);
}

/** Số hợp lệ thì lấy, không thì lấy giá trị mặc định. */
function so(giaTri, macDinh) {
  const n = Number(giaTri);
  return isFinite(n) && n > 0 ? n : macDinh;
}
