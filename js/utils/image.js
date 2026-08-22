// ============================================================
// giapha · js/utils/image.js
// Vai trò  : Nén ảnh phía trình duyệt, đường dẫn Drive, bóng người mặc định
// Lớp      : utils — được gọi bởi: pages · được phép gọi: config
// Phụ thuộc: config (PHOTO)
// Phiên bản: 1.2.1 · Cập nhật: 22/08/2026 10:30
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
// ẢNH ĐẠI DIỆN MẶC ĐỊNH — đã CHUYỂN ĐI, đừng dựng lại ở đây
// ============================================================
//
// `anhMacDinhUri()` và ba bộ khuôn bóng người từng sống ở file này. Từ
// 22/08/2026 chúng nằm ở **`utils/avatar.js`**, vì chủ dự án đưa hai bức ảnh
// thật (`avatar_nam.svg` · `avatar_nu.svg`) thay cho hình do mã tự vẽ, và
// ~18KB chuỗi ảnh không có việc gì trong một file tên là *image.js* — file này
// nói về **NÉN ẢNH NGƯỜI DÙNG CHỌN**, một việc khác hẳn.
//
// ⚠ Hai điều của bản cũ **đã thôi đúng**, đừng chép lại: bộ khuôn hình NỮ và
// hình `U` (hai ảnh thật đã thay hình nữ, còn `sex: "U"` nay dùng **bức NAM
// CŨ** — chủ dự án giữ nó lại vì nó vốn không ra dáng đàn ông), và lời giải
// thích *"vì sao là SVG chứ không phải PNG"* (nay là *vì sao nằm thẳng trong
// mã chứ không thành file trong repo* — lý do khác hẳn, xem `avatar.js`).
//
// Tham số `mauNen` thì **vẫn còn**, và vẫn vì lý do cũ: ba màu sống ở bảng
// `VE` của `domains/render.js`, chép sang chỗ khác là dựng bản thứ hai.

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
