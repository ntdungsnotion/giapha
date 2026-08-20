// ============================================================
// giapha · js/config.js
// Vai trò  : Hằng số hiển thị phía trình duyệt.
// Lớp      : config — không gọi file nào khác
// Phụ thuộc: (không)
// Phiên bản: 0.7.0 · Cập nhật: 20/08/2026 15:10
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

  // Bán kính vòng ảnh trên ô sơ đồ. Ảnh vẽ ở đường kính 2×20 = 40px, nhưng
  // XIN Drive bản 200px: màn hình điện thoại có tỷ lệ pixel gấp 2–3, xin đúng
  // 40 thì ảnh rỗ.
  banKinhTrenO: 20,

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
// ⚠ **64 → 104 ở bước 28** (20/08/2026), để chừa chỗ cho vòng ảnh 40px ở đầu
// ô. Chủ dự án chọn phương án B sau khi xem bốn phương án vẽ đúng cỡ thật —
// xem `kiem-thu/o-co-anh.html`. Bề ngang KHÔNG đổi, mà bề ngang mới là thứ
// điện thoại thiếu.
//
// Con số này đọc CÙNG `vGap` bên dưới, đừng đọc riêng. Đo thật trên 59 sơ đồ
// (`kiem-thu/do-o-co-anh.mjs`): ô cao thêm 62% mà **sơ đồ chỉ cao thêm 4%**
// (trung bình 755 → 786px), vì `vGap` hạ từ 90 xuống 48 cùng lúc.
//
// Con số này là chỗ duy nhất quyết định chiều cao ô. `layout.js` chụp nó vào
// biến riêng NGAY LÚC NẠP (`const CAO = LAYOUT.nodeHeight`), nên sửa lúc chạy
// thì không ăn — xem `kiem-thu/do-o-co-anh.mjs`.
export const LAYOUT = {
  nodeWidth:  120,
  nodeHeight: 104,
  hGap:        28,   // cách ngang giữa 2 người

  // Cách dọc giữa 2 đời.
  //
  // ⚠ **90 → 48 ở bước 28**, cùng lúc với việc ô cao lên 104 và bỏ viền ô.
  // Chủ dự án nhìn app thật rồi nói: *"khoảng cách giữa các hàng quá lớn,
  // lãng phí không gian, nhất là điện thoại"*.
  //
  // Hai con số này phải đọc CÙNG NHAU, đừng đọc riêng: thứ mắt nhìn thấy là
  // **bước hàng** = nodeHeight + vGap.
  //
  //     trước bước 28   64 + 90 = 154
  //     giữa bước 28   104 + 90 = 194   ← chỗ chủ dự án kêu
  //     nay            104 + 48 = 152
  //
  // Tức là ô to hơn hẳn mà sơ đồ vẫn **không cao hơn trước bước 28**. Chỗ
  // 90px kia sinh ra khi ô mới cao 64 và có viền; bỏ viền rồi thì phần trống
  // giữa hai hàng vốn đã rộng ra, cộng thêm 90 nữa là thừa hai lần.
  //
  // ⚠ Sàn của con số này là `stubLength` (34) — nốt cụt mọc thẳng xuống phải
  // còn chỗ. 48 còn dư 14px. Hạ nữa thì phải hạ `stubLength` trước.
  vGap:        48,
  spouseGap:   16,
  stubLength:  34,   // độ dài đường kẻ dẫn tới nốt cụt, hướng LÊN và XUỐNG
  stubRadius:   6,

  // Nốt cụt nằm NGANG phải ngắn hơn, và đây là lý do — đừng gộp lại làm một
  // con số (16/08/2026, chat 1.4).
  //
  // Chiều dọc có vGap (nay 48px) để mọc ra, chiều ngang chỉ có hGap = 28px giữa
  // hai khối anh em. Dùng chung 34px thì nốt tròn rơi hẳn vào trong ô người
  // bên cạnh: đo trên bản 57 người, 14/120 nốt đè lên ô, và ĐÚNG BẰNG toàn bộ
  // số nốt nằm ngang — tức mọi nốt ngang đều hỏng. Sáu bất biến của chat 1.3
  // không bắt được vì chúng chỉ xét ô với ô; lỗi này chỉ lộ ra khi xem hình.
  //
  // 14 + stubRadius 6 = 20 < 28, còn chừa 8px hở. Đổi hGap thì phải đổi cả
  // con số này.
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
