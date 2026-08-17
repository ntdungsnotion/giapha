// ============================================================
// giapha · js/utils/date.js
// Vai trò  : Xử lý ngày tháng — phân tích, hiển thị, tính tuổi
// Lớp      : utils
// Phụ thuộc: (không)
// Phiên bản: 0.3.0 · Cập nhật: 17/08/2026 21:10
// ============================================================
//
// MỌI HÀM Ở ĐÂY LÀ HÀM THUẦN, trừ stampNow() đọc đồng hồ máy.
//
// Ngày lưu song song hai trường: iso (máy đọc) và raw (người gõ).
// KHÔNG BAO GIỜ suy đoán rồi ghi đè raw.
//
// Gia phả cũ hầu hết chỉ có NĂM. Vì thế mọi hàm ở đây phải chạy được với
// `iso` chỉ dài bốn chữ số, và phải nói ra khi con số mình trả về là xấp xỉ —
// "74 tuổi" và "khoảng 74 tuổi" là hai câu khác nhau về mức độ chắc chắn, mà
// gia phả thì sống bằng sự khác nhau đó.
//
// --- LUẬT BA KẾT QUẢ (chốt 17/08/2026, bước 17) --------------
//
// Rất nhiều người trong gia phả chỉ có năm mất mà không có năm sinh, hoặc chỉ
// có năm sinh mà không có năm mất — người đi chiến trường không về là ca điển
// hình. Đó là bản ghi HỢP LỆ VÀ ĐẦY ĐỦ theo mức hiểu biết hiện nay, không phải
// dữ liệu lỗi.
//
// Vì vậy mọi phép so sánh ngày ở đây có BA kết quả, không phải hai: trước ·
// sau · KHÔNG ĐỦ DỮ LIỆU ĐỂ KẾT LUẬN. Kết quả thứ ba trả về `null`, và nơi gọi
// phải im lặng bỏ qua — không chặn, không cảnh báo, và tuyệt đối không suy đoán
// cái mốc còn thiếu.

/**
 * Cố đoán ngày ISO từ chuỗi người dùng gõ.
 * KHÔNG BAO GIỜ ghi đè trường raw — chỉ trả về gợi ý.
 * Nhận được: "1948", "12/3/1948", "khoảng 1948", "tháng 3 năm 1948"
 * @returns {{iso: string|null, confident: boolean}}
 */
export function parseLooseDate(text) { /* TODO — giai đoạn 2, cùng form nhập liệu */ }

/**
 * Hiển thị ngày cho người đọc. Ưu tiên `raw` — đó là thứ người trong họ đã gõ,
 * và họ gõ "khoảng 1890" hay "tháng chạp năm Bính Tý" là có lý do.
 * `raw` trống thì đổi `iso` sang dd/mm/yyyy; `iso` chỉ có năm thì trả về năm.
 */
export function formatDate(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return '';
  const raw = khoiNgay.raw;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();

  const iso = typeof khoiNgay.iso === 'string' ? khoiNgay.iso.trim() : '';
  const day = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return day[3] + '/' + day[2] + '/' + day[1];
  const thang = iso.match(/^(\d{4})-(\d{2})$/);
  if (thang) return 'tháng ' + Number(thang[2]) + '/' + thang[1];
  const nam = iso.match(/^(\d{4})$/);
  if (nam) return nam[1];
  return iso;
}

/**
 * Tính tuổi thọ.
 *
 * @returns {{tuoi:number, xapXi:boolean, denHomNay:boolean}|null}
 *          null khi thiếu dữ liệu — nơi gọi phải ẨN CẢ HÀNG, không ghi "?".
 *
 * `xapXi` là true khi một trong hai mốc chỉ có năm, tức con số có thể lệch một
 * tuổi. Trả về object chứ không trả về mỗi con số, vì nếu không thì nơi gọi
 * phải tự bới lại `iso` để biết có được nói chắc hay không — và mỗi màn hình
 * sẽ bới một kiểu.
 *
 * Người còn sống thì tính đến hôm nay. Người đã mất mà thiếu ngày mất thì
 * KHÔNG tính đến hôm nay: cụ sinh năm 1890 không phải đang 136 tuổi.
 */
export function calcAge(birth, death, isLiving) {
  const sinh = mocNgay(birth);
  if (!sinh) return null;

  const mat = mocNgay(death);
  let denHomNay = false;
  let moc = mat;

  if (!moc) {
    if (isLiving !== true) return null;
    const nay = new Date();
    moc = { nam: nay.getFullYear(), thang: nay.getMonth() + 1, ngay: nay.getDate(), duNgay: true };
    denHomNay = true;
  }

  let tuoi = moc.nam - sinh.nam;
  // Chưa tới sinh nhật trong năm thì trừ một. Chỉ làm được khi cả hai mốc có
  // tháng; thiếu tháng thì con số là xấp xỉ và ta không đoán thêm.
  if (sinh.thang && moc.thang) {
    if (moc.thang < sinh.thang) tuoi--;
    else if (moc.thang === sinh.thang && sinh.ngay && moc.ngay && moc.ngay < sinh.ngay) tuoi--;
  }

  if (tuoi < 0) return null;   // dữ liệu mâu thuẫn — validate.js sẽ báo, ở đây chỉ im
  return { tuoi, xapXi: !(sinh.duNgay && moc.duNgay), denHomNay };
}

/**
 * Rút { nam, thang, ngay, duNgay } từ một khối ngày.
 * Chấp nhận "1927", "1927-03", "1927-03-12", và mò bốn chữ số trong `raw`.
 *
 * `thang` và `ngay` bằng 0 nghĩa là KHÔNG BIẾT, không phải bằng không. Nhờ vậy
 * nơi gọi phân biệt được "sinh tháng 1" với "chỉ biết năm sinh".
 *
 * Trả `null` khi không mò ra nổi một con số bốn chữ số nào — tức khối ngày này
 * trống, và đó là chuyện bình thường của gia phả.
 *
 * Export ra ngoài từ bước 17 để `domains/validate.js` dùng chung. Quy tắc đọc
 * một khối ngày phải nằm ở ĐÚNG MỘT chỗ; mỗi nơi tự bới `iso` một kiểu là cách
 * chắc chắn nhất để hai màn hình kết luận khác nhau về cùng một bản ghi.
 */
export function mocNgay(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return null;

  const iso = typeof khoiNgay.iso === 'string' ? khoiNgay.iso.trim() : '';
  const day = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return { nam: +day[1], thang: +day[2], ngay: +day[3], duNgay: true };
  const thang = iso.match(/^(\d{4})-(\d{2})$/);
  if (thang) return { nam: +thang[1], thang: +thang[2], ngay: 0, duNgay: false };

  for (const nguon of [iso, khoiNgay.raw]) {
    if (typeof nguon !== 'string') continue;
    const khop = nguon.match(/\d{4}/);
    if (khop) return { nam: +khop[0], thang: 0, ngay: 0, duNgay: false };
  }
  return null;
}

/**
 * So thứ tự hai khối ngày, CHỈ kết luận khi độ chính xác cho phép.
 *
 * @returns {-1|0|1|null}
 *          -1  a trước b
 *           0  a đúng bằng b (chỉ khi cả hai đủ ngày–tháng–năm)
 *           1  a sau b
 *         null KHÔNG ĐỦ DỮ LIỆU ĐỂ KẾT LUẬN
 *
 * Hai người cùng năm mà chỉ biết năm thì trả `null`, không trả 0. Đây là chỗ
 * dễ làm sai nhất: coi "cùng năm" là "bằng nhau" thì một người mất tháng 3 mà
 * sinh tháng 9 cùng năm sẽ lọt qua phép rà, còn coi nó là "trước" thì hàng loạt
 * bản ghi đúng bị chặn oan. Cả hai đều tệ hơn việc thú nhận là không biết.
 */
export function soSanhNgay(a, b) {
  const x = mocNgay(a);
  const y = mocNgay(b);
  if (!x || !y) return null;

  if (x.nam !== y.nam) return x.nam < y.nam ? -1 : 1;
  if (!x.thang || !y.thang) return null;      // cùng năm, thiếu tháng ở một bên
  if (x.thang !== y.thang) return x.thang < y.thang ? -1 : 1;
  if (!x.ngay || !y.ngay) return null;        // cùng tháng, thiếu ngày ở một bên
  if (x.ngay !== y.ngay) return x.ngay < y.ngay ? -1 : 1;
  return 0;
}

/**
 * Số năm từ `a` đến `b`, tính bằng phép trừ NĂM và chỉ năm.
 *
 * @returns {number|null} null khi một trong hai khối không có năm.
 *
 * Con số này luôn có thể lệch một tuổi, và đó là chấp nhận được vì mọi nơi gọi
 * nó đều là phép rà mức CẢNH BÁO với ngưỡng cách xa vài chục năm — không phép
 * nào dùng nó để CHẶN theo một tuổi lẻ.
 */
export function chenhNam(a, b) {
  const x = mocNgay(a);
  const y = mocNgay(b);
  if (!x || !y) return null;
  return y.nam - x.nam;
}

/** Dấu thời gian dạng dd/mm/yyyy HH:mm cho tài liệu và changeLog. */
export function stampNow(luc) {
  const d = luc instanceof Date ? luc : new Date();
  const hai = (n) => String(n).padStart(2, '0');
  return hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear() +
         ' ' + hai(d.getHours()) + ':' + hai(d.getMinutes());
}
