// ============================================================
// giapha · js/config.js
// Vai trò  : Hằng số hiển thị phía trình duyệt.
// Lớp      : config — không gọi file nào khác
// Phụ thuộc: (không)
// Phiên bản: 0.5.0 · Cập nhật: 17/08/2026 05:54
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
};

// Kích thước sơ đồ (pixel)
//
// nodeHeight là chiều cao CỐ ĐỊNH của mọi ô, dù người đó có một dòng hay hai.
// Để ô co lại theo nội dung thì các ô cùng một đời sẽ so le, sơ đồ nhìn gãy.
export const LAYOUT = {
  nodeWidth:  120,
  nodeHeight:  64,
  hGap:        28,   // cách ngang giữa 2 người
  vGap:        90,   // cách dọc giữa 2 đời
  spouseGap:   16,
  stubLength:  34,   // độ dài đường kẻ dẫn tới nốt cụt, hướng LÊN và XUỐNG
  stubRadius:   6,

  // Nốt cụt nằm NGANG phải ngắn hơn, và đây là lý do — đừng gộp lại làm một
  // con số (16/08/2026, chat 1.4).
  //
  // Chiều dọc có vGap = 90px để mọc ra, chiều ngang chỉ có hGap = 28px giữa
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
