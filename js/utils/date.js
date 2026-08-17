// ============================================================
// giapha · js/utils/date.js
// Vai trò  : Xử lý ngày tháng — phân tích, hiển thị, tính tuổi
// Lớp      : utils
// Phụ thuộc: (không)
// Phiên bản: 0.4.0 · Cập nhật: 17/08/2026 23:10
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
 *
 * @returns {{iso: string|null, confident: boolean}}
 *          `iso` là null khi không mò ra nổi một năm nào — và đó là chuyện
 *          BÌNH THƯỜNG: "tháng chạp năm Bính Tý" là một câu trả lời đầy đủ của
 *          gia phả, chỉ là máy không đọc được. Nơi gọi vẫn phải lưu `raw`.
 *
 *          `confident` false nghĩa là *đọc ra năm nhưng không dám chắc* —
 *          người gõ đã tự nói là ước chừng ("khoảng 1890"), hoặc con số nằm lẫn
 *          trong chữ mà ta chỉ nhặt ra được. Màn hình phải nói sự khác nhau ấy
 *          cho người dùng thấy trước khi họ lưu.
 *
 * NGÀY VIỆT NAM ĐỌC THEO dd/mm/yyyy. "3/4/1948" là ngày 3 tháng 4, không phải
 * mùng 4 tháng 3. Đọc nhầm chiều thì hai phần ba số ca vẫn ra ngày hợp lệ, nên
 * sai kiểu này không bao giờ tự lộ ra.
 */
export function parseLooseDate(text) {
  const chuoi = typeof text === 'string' ? text.trim() : '';
  if (chuoi === '') return { iso: null, confident: false };

  const uocChung = TU_UOC_CHUNG.test(chuoi);
  const chac = (iso) => ({ iso, confident: !uocChung });
  const doan = (iso) => ({ iso, confident: false });

  // 1. Đã đúng dạng ISO sẵn — "1948-03-12", "1948-03", "1948"
  let m = chuoi.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return hopLe(+m[1], +m[2], +m[3]) ? chac(ghepIso(+m[1], +m[2], +m[3])) : doan(m[1]);
  m = chuoi.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return hopLe(+m[1], +m[2], 0) ? chac(ghepIso(+m[1], +m[2], 0)) : doan(m[1]);
  if (/^\d{4}$/.test(chuoi)) return chac(chuoi);

  // 2. Kiểu người Việt gõ nhanh — "12/3/1948", "12.3.1948", "12-3-1948"
  m = chuoi.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return hopLe(+m[3], +m[2], +m[1]) ? chac(ghepIso(+m[3], +m[2], +m[1])) : doan(m[3]);

  // 3. Tháng và năm — "3/1948". Hai chữ số đầu KHÔNG thể là ngày ở đây vì
  //    không có phần thứ ba, nên đọc là tháng.
  m = chuoi.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (m) return hopLe(+m[2], +m[1], 0) ? chac(ghepIso(+m[2], +m[1], 0)) : doan(m[2]);

  // 4. Viết bằng chữ — "ngày 12 tháng 3 năm 1948", "tháng 3 năm 1948",
  //    "khoảng tháng 3/1948". Chỉ tin con số đứng ngay sau đúng từ của nó.
  const nam   = chuoi.match(/n[ăa]m\s*(\d{4})/i);
  const thang = chuoi.match(/th[áa]ng\s*(\d{1,2})/i);
  const ngay  = chuoi.match(/ng[àa]y\s*(\d{1,2})/i);
  const soNam = nam ? +nam[1] : (chuoi.match(/\d{4}/) ? +chuoi.match(/\d{4}/)[0] : 0);

  if (soNam && thang) {
    const t = +thang[1];
    const d = ngay ? +ngay[1] : 0;
    if (hopLe(soNam, t, d)) return chac(ghepIso(soNam, t, d));
    return doan(String(soNam));
  }

  // 5. Cùng lắm: nhặt bốn chữ số đầu tiên gặp được. Đây là đường "đọc ra năm
  //    nhưng không dám chắc" — chuỗi còn chứa những chữ ta không hiểu.
  if (soNam) return doan(String(soNam));
  return { iso: null, confident: false };
}

/**
 * Những chữ người viết gia phả dùng khi chính họ cũng không chắc. Gặp một
 * trong số này thì dù có đọc ra ngày tháng cũng KHÔNG được nhận là chắc chắn —
 * "khoảng 1890" mà app tự tin ghi thành 1890 là app nói hộ người ta một điều
 * họ không nói.
 */
const TU_UOC_CHUNG = /kho[ảa]ng|[ướuo]{1,3}c\s|ch[ừu]ng|đ[ộo]\s|tr[ưu][ớo]c|sau|đ[ầa]u|gi[ữu]a|cu[ốo]i|\?|~/i;

/** Ngày tháng có tồn tại thật không. `ngay = 0` hoặc `thang = 0` nghĩa là KHÔNG BIẾT. */
function hopLe(nam, thang, ngay) {
  if (!nam || nam < 1 || nam > 3000) return false;
  if (thang && (thang < 1 || thang > 12)) return false;
  if (!ngay) return true;
  if (!thang) return false;                       // biết ngày mà không biết tháng thì vô nghĩa
  const soNgayCuaThang = new Date(nam, thang, 0).getDate();
  return ngay >= 1 && ngay <= soNgayCuaThang;
}

function ghepIso(nam, thang, ngay) {
  const hai = (n) => String(n).padStart(2, '0');
  const n = String(nam).padStart(4, '0');
  if (!thang) return n;
  if (!ngay)  return n + '-' + hai(thang);
  return n + '-' + hai(thang) + '-' + hai(ngay);
}

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
