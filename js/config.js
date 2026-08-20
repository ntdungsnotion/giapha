// ============================================================
// giapha · js/config.js
// Vai trò  : Hằng số hiển thị phía trình duyệt.
// Lớp      : config — không gọi file nào khác
// Phụ thuộc: (không)
// Phiên bản: 0.9.0 · Cập nhật: 20/08/2026 17:20
// ============================================================
//
// LƯU Ý: từ khi chuyển sang kiến trúc Apps Script, file này KHÔNG còn
// là nơi bạn điền cấu hình. Mọi thứ cần điền nằm ở gas/Config.gs.
// File này chỉ chứa hằng số hiển thị, thường không cần sửa.

export const APP_NAME     = 'Gia phả';
export const DATA_VERSION = 1;

export const PHOTO = {
  maxWidth:    800,   // nén ảnh xuống chiều rộng này trước khi gửi lên
  jpegQuality: 0.82,
  thumbSize:   200,

  // Bán kính vòng ảnh trên ô sơ đồ.
  //
  // ⚠ **20 → 26 ở bước 28b** — chủ dự án: *"hình đại diện to hơn, chữ nhỏ
  // hơn"*, học theo cách Quick Family Tree trình bày. Vòng ảnh nay 52px trên
  // một ô rộng 120px, to hơn 30%, mà ô lại NGẮN ĐI: bảng tên đè lên đáy vòng.
  //
  // Đã thử 28 (56px) trước. Hỏng: để giữ chiều cao ô thì bảng tên phải đè sâu
  // 14px, và lúc ấy vòng ảnh đọc ra thành hình vòng cung — xem `BONG` trong
  // `utils/image.js`.
  //
  // ⚠ Vẽ 52px nhưng XIN Drive bản 200px (`thumbSize` ở trên): màn hình điện
  // thoại có tỷ lệ pixel gấp 2–3, xin đúng 52 thì ảnh rỗ.
  banKinhTrenO: 26,

  // Cách từ mép trên ô xuống đỉnh vòng ảnh.
  //
  // ⚠ **BẰNG 0, và đó là một quyết định chứ không phải bỏ sót.** Ô sơ đồ nay
  // không có viền (bước 28), nên "mép trên ô" chỉ còn là một toạ độ, không
  // phải một đường kẻ ai nhìn thấy. Để nó bằng 0 thì **đỉnh vòng ảnh CHÍNH LÀ
  // mép trên ô**, và mọi nét đi từ trên xuống — nét treo con, nốt cụt mọc lên —
  // chạm đúng vào vòng ảnh, không dừng lơ lửng cách nó mấy pixel.
  //
  // Để 6 thì mỗi nét ấy hụt đúng 6px. Sáu pixel không ai gọi tên được, nhưng
  // nhìn vào thì thấy sơ đồ "rời rạc" mà không chỉ ra được vì sao.
  leTrenO:       0,
};

// Kích thước sơ đồ (pixel)
//
// nodeHeight là chiều cao CỐ ĐỊNH của mọi ô, dù người đó có một dòng hay hai,
// và dù người đó CÓ ẢNH HAY KHÔNG. Để ô co lại theo nội dung thì các ô cùng
// một đời sẽ so le, sơ đồ nhìn gãy.
//
// ⚠ **64 → 104 → 88 trong cùng một ngày (20/08/2026, bước 28).** Ba con số ấy
// kể lại đúng ba lần chủ dự án nhìn app thật:
//
//   64   trước khi có ảnh
//   104  chừa chỗ cho vòng ảnh 40px xếp TRÊN chữ  → *"khoảng cách quá lớn"*
//   88   vòng ảnh to lên 52px, nhưng BẢNG TÊN ĐÈ LÊN đáy nó, học theo QFT
//
// Nghe ngược đời: ảnh to thêm 30% mà ô lại ngắn đi 16px. Chỗ tiết kiệm nằm ở
// **phần chồng lên nhau** — bảng tên chồm lên vòng ảnh 8px — và ở chữ nhỏ đi
// một nấc, nhờ đó ít tên phải xuống hai dòng hơn.
//
// Đọc CÙNG `vGap` bên dưới, đừng đọc riêng: bước hàng = nodeHeight + vGap.
// Đo thật trên 59 sơ đồ bằng `kiem-thu/do-o-co-anh.mjs`.
export const LAYOUT = {
  nodeWidth:  120,

  // ⚠ Chiều cao khi KHÔNG hiện hàng ngày giỗ.
  nodeHeight:  88,

  // Chiều cao khi công tắc "Ngày giỗ" đang BẬT: thêm đúng một hàng chữ.
  //
  // ⚠ Cao thêm cho MỌI ô, kể cả người không có ngày giỗ và người còn sống. Đó
  // là cái giá của luật *"ô cao bằng nhau"* ngay ở đầu khối này. Ai thấy phí
  // thì tắt công tắc đi — nó mặc định TẮT.
  //
  // ⚠ `layout.js` đọc lại hai con số này ở MỖI lần `computeLayout()`, không
  // chụp một lần lúc nạp như trước bước 28. Xem ghi chú `CAO` ở đó.
  nodeHeightNgayGio: 99,

  hGap:        28,   // cách ngang giữa 2 người

  // Cách dọc giữa 2 đời — cũng chính là ĐỘ DÀI ĐOẠN KẺ DỌC nối hai đời.
  //
  // ⚠ **90 → 48 → 34 trong cùng ngày 20/08/2026**, cả hai lần đều do chủ dự án
  // nhìn app thật rồi chỉ ra: lần đầu *"khoảng cách giữa các hàng quá lớn,
  // lãng phí không gian, nhất là điện thoại"*, lần sau *"có thể giảm 30% nữa ở
  // chỗ giảm độ dài gạch nối theo chiều dọc"*.
  //
  // Đọc CÙNG `nodeHeight`, đừng đọc riêng: thứ mắt nhìn thấy là **bước hàng**.
  //
  //     trước bước 28   64 + 90 = 154
  //     giữa bước 28   104 + 90 = 194   ← chỗ chủ dự án kêu lần đầu
  //     nay             88 + 34 = 122   ← ngắn hơn 21% so với thời chưa có ảnh
  //
  // Tức là mỗi ô mang thêm một khuôn mặt 52px và một dòng tuổi, mà sơ đồ vẫn
  // ngắn hơn hẳn. Chỗ 90px kia sinh ra khi ô mới cao 64 và CÓ VIỀN; bỏ viền
  // rồi thì phần trống giữa hai hàng vốn đã rộng ra, cộng thêm 90 nữa là thừa
  // hai lần.
  //
  // ⚠ **Sàn của con số này là `stubLength + stubRadius`** — nốt cụt mọc thẳng
  // xuống phải nằm gọn trong khe giữa hai đời, không thì nốt tròn rơi vào ô
  // người ở đời dưới. Nay 22 + 6 = 28 < 34, còn chừa 6px. Hạ `vGap` nữa thì
  // PHẢI hạ `stubLength` trước, đừng hạ một mình.
  vGap:        34,
  spouseGap:   16,

  // Độ dài đường kẻ dẫn tới nốt cụt, hướng LÊN và XUỐNG.
  // 34 → 22 ở bước 28d, để `vGap` xuống được 34. Xem ghi chú `vGap` ở trên.
  stubLength:  22,
  stubRadius:   6,

  // Nốt cụt nằm NGANG phải ngắn hơn, và đây là lý do — đừng gộp lại làm một
  // con số (16/08/2026, chat 1.4).
  //
  // Chiều dọc có vGap (nay 34px) để mọc ra, chiều ngang chỉ có hGap = 28px giữa
  // hai khối anh em. Dùng chung 34px thì nốt tròn rơi hẳn vào trong ô người
  // bên cạnh: đo trên bản 57 người, 14/120 nốt đè lên ô, và ĐÚNG BẰNG toàn bộ
  // số nốt nằm ngang — tức mọi nốt ngang đều hỏng. Sáu bất biến của chat 1.3
  // không bắt được vì chúng chỉ xét ô với ô; lỗi này chỉ lộ ra khi xem hình.
  //
  // 14 + stubRadius 6 = 20 < 28, còn chừa 8px hở. Đổi hGap thì phải đổi cả
  // con số này. (Bản ngang KHÔNG hạ theo bản dọc ở bước 28d: nó bị hGap chặn,
  // không bị vGap chặn.)
  stubLengthNgang: 14,

  // Nét vợ chồng chồng nấc khi một người có nhiều bạn đời — QUY-TAC-VE §3.
  // Nét thứ nhất luôn nằm giữa khung; nét thứ k lùi lên spouseStepMax pixel
  // mỗi nấc, nhưng tự co lại để nấc trên cùng còn cách mép trên
  // spouseStepPadTop pixel. Cộng dồn cứng 8px thì đến người thứ tư nét tràn
  // ra khỏi khung.
  spouseStepMax:    8,
  spouseStepPadTop: 6,

  // Cách ngang giữa hai KHỐI gốc rời nhau (hai gia đình không nối với nhau
  // trong cùng một sơ đồ). Rộng hơn hGap để mắt tách được hai khối.
  blockGap:    56,
};

// Bốn con số điều khiển tập người được vẽ. Xem KE-HOACH_V08.
//
//   ancestors           số đời vẽ lên   — 0 = không giới hạn
//   descendants         số đời vẽ xuống — 0 = không giới hạn
//   spouseOfDescendants có vẽ vợ/chồng của hậu duệ không
//   k                   đi lên tới đời thứ mấy thì còn rẽ ngang sang anh chị em
//
// ancestors để 0 (không phải 3) vì ảnh hinh_3.jpg vẽ liền 5 đời tổ tiên.
// k = 1 là con số Quick Family Tree đang dùng, đã đối chiếu cả bốn ảnh.
export const DEFAULT_SCOPE = {
  ancestors:           0,
  descendants:         0,
  spouseOfDescendants: true,
  k:                   1,
};
