// ============================================================
// giapha · js/config.js
// Vai trò  : Hằng số hiển thị phía trình duyệt.
// Lớp      : config — không gọi file nào khác
// Phụ thuộc: (không)
// Phiên bản: 0.3.0 · Cập nhật: 15/08/2026 12:16
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
export const LAYOUT = {
  nodeWidth:  120,
  nodeHeight:  64,
  hGap:        28,   // cách ngang giữa 2 người
  vGap:        90,   // cách dọc giữa 2 đời
  spouseGap:   16,
  stubLength:  34,   // độ dài đường kẻ dẫn tới nốt cụt
  stubRadius:   6,
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
