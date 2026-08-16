// ============================================================
// giapha · js/utils/text.js
// Vai trò  : Xử lý chuỗi tiếng Việt — bỏ dấu, so khớp tìm kiếm,
//            và quy tắc hiển thị trường thiếu dùng chung cho mọi màn hình
// Lớp      : utils — được gọi bởi: domains, pages · được phép gọi: config
// Phụ thuộc: (không)
// Phiên bản: 1.0.0 · Cập nhật: 16/08/2026 23:45
// ============================================================
//
// MỌI HÀM Ở ĐÂY LÀ HÀM THUẦN. Không chạm DOM, không đọc state.
//
// --- Quy tắc hiển thị trường thiếu (chốt 14/08/2026) ---------
//
// Thiếu thông tin là TRẠNG THÁI BÌNH THƯỜNG của gia phả, không phải lỗi.
// Trường trống thì KHÔNG VẼ HÀNG ĐÓ. Không ghi "Không rõ", không hiện "...".
//
// coGiaTri() và doiSongNguoi() là nơi DUY NHẤT cài quy tắc này. Mọi màn hình
// gọi chung. Đừng để mỗi màn hình tự viết `if (p.birth.iso)` theo kiểu riêng —
// đó chính là cách một quy tắc nhất quán vỡ thành bốn cách hiển thị khác nhau.
//
// Ca kiểm sống: P0005 Lê Thị Thái để trống cả năm sinh lẫn năm mất. Ô của bà
// trên sơ đồ phải BỎ HẲN dòng thứ hai. Ai điền năm sinh vào bản ghi đó là giết
// ca kiểm duy nhất của quy tắc này.

/**
 * Bỏ dấu tiếng Việt, chuyển chữ thường.
 * "Nguyễn Văn Ân" -> "nguyen van an"
 *
 * Phải xử lý riêng chữ đ/Đ: normalize('NFD') tách được dấu mũ, dấu huyền,
 * nhưng KHÔNG tách được gạch ngang của chữ đ — nó là một chữ cái riêng trong
 * Unicode, không phải d cộng dấu.
 */
export function removeDiacritics(s) {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu thanh, dấu mũ đã tách ra
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * So khớp tìm kiếm không phân biệt dấu và hoa thường.
 * Chuỗi tìm rỗng thì coi như khớp mọi thứ — người dùng chưa gõ gì thì không
 * có lý do gì để giấu bớt danh sách.
 */
export function matchesSearch(haystack, needle) {
  const kim = removeDiacritics(needle).trim();
  if (kim === '') return true;
  return removeDiacritics(haystack).indexOf(kim) !== -1;
}

/**
 * Ghép các phần tên thành một chuỗi hiển thị: "Nguyễn Trọng Dũng".
 *
 * Nhận CẢ HAI kiểu tham số cho tiện nơi gọi:
 *   - một mục trong mảng `names`  : { type, surname, middle, given }
 *   - cả object người             : { id, names: [...] }  → lấy tên chính
 *
 * Người có nhiều tên (tên huý, tên thánh, biệt hiệu) thì `type: 'chinh'` là
 * tên dùng trên sơ đồ; thiếu mục 'chinh' thì lấy tên đầu tiên.
 *
 * Phần nào trống thì bỏ hẳn, không để lại khoảng trắng đôi.
 */
export function fullName(nameObj) {
  if (!nameObj || typeof nameObj !== 'object') return '';

  if (Array.isArray(nameObj.names)) {
    const ds = nameObj.names;
    const chinh = ds.find((n) => n && n.type === 'chinh') || ds[0];
    return fullName(chinh);
  }

  return [nameObj.surname, nameObj.middle, nameObj.given]
    .filter(coGiaTri)
    .map((phan) => String(phan).trim())
    .join(' ');
}

/** rỗng, null, undefined, chuỗi toàn khoảng trắng -> false */
export function coGiaTri(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

/**
 * Dòng thứ hai của ô người trên sơ đồ.
 *
 *   có cả hai   -> "1927 – 2001"
 *   chỉ năm sinh-> "1962"
 *   chỉ năm mất -> "– 2001"
 *   không có gì -> ""        ← nơi gọi phải BỎ HẲN dòng, không vẽ dòng rỗng
 *
 * Chỉ lấy NĂM. Dữ liệu giữ song song `iso` và `raw`; ô trên sơ đồ rộng 120px
 * nên ngày đầy đủ không lọt, mà năm mới là thứ người xem cần để định vị đời.
 * Đây là quy tắc HIỂN THỊ — không đụng gì tới dữ liệu, `raw` giữ nguyên.
 */
export function doiSongNguoi(person) {
  if (!person || typeof person !== 'object') return '';
  const sinh = namCua(person.birth);
  const mat  = namCua(person.death);

  if (sinh && mat) return sinh + ' – ' + mat;
  if (sinh)        return sinh;
  if (mat)         return '– ' + mat;
  return '';
}

/**
 * Rút NĂM từ một khối ngày { iso, raw }.
 *
 * Ưu tiên `iso` vì nó đã chuẩn hoá; `iso` trống thì mò trong `raw`, nơi người
 * nhập có thể gõ "khoảng 1890" hay "12/03/1927". Không tìm ra bốn chữ số nào
 * thì trả chuỗi rỗng — thà không hiện còn hơn hiện một con số đoán mò.
 */
function namCua(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return '';
  for (const nguon of [khoiNgay.iso, khoiNgay.raw]) {
    if (!coGiaTri(nguon)) continue;
    const khop = String(nguon).match(/\d{4}/);
    if (khop) return khop[0];
  }
  return '';
}
