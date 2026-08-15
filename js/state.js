// ============================================================
// giapha · js/state.js
// Vai trò  : Trạng thái dùng chung toàn app. CHỈ lớp pages được ghi.
// Lớp      : (đặc biệt) — chỉ đọc/ghi dữ liệu, không chứa logic
// Phụ thuộc: config
// Phiên bản: 0.3.0 · Cập nhật: 15/08/2026 20:22
// ============================================================
import { DEFAULT_SCOPE } from './config.js';

const MAC_DINH = {
  tree:           null,   // object gốc đọc từ file JSON
  index:          null,   // chỉ mục tra cứu, dựng bởi utils/graph.buildIndex
  headRevisionId: null,   // dùng để phát hiện người khác vừa sửa
  focusPersonId:  null,
  scope:          { ...DEFAULT_SCOPE },
  dirty:          false,  // có thay đổi chưa lưu hay không
  phien:          null,   // kết quả layPhien() của máy chủ, xem gas/Code.gs

  // Máy chủ có cắt chi tiết người còn sống trước khi trả cây hay không.
  // Giữ riêng để không lẫn "bị ẩn" với "gia phả còn thiếu" — hai thứ trông
  // giống hệt nhau trên màn hình mà kết luận ngược nhau.
  daLocNguoiConSong: false,
};

export const state = { ...MAC_DINH, scope: { ...DEFAULT_SCOPE } };

const nguoiNghe = new Set();

/** Đặt lại toàn bộ trạng thái về mặc định. */
export function resetState() {
  Object.assign(state, MAC_DINH, { scope: { ...DEFAULT_SCOPE } });
  notify();
}

/** Đăng ký hàm chạy khi state đổi. Trả về hàm huỷ đăng ký. */
export function subscribe(fn) {
  nguoiNghe.add(fn);
  return () => nguoiNghe.delete(fn);
}

/** Báo cho các subscriber biết state vừa đổi. */
export function notify() {
  for (const fn of nguoiNghe) {
    try {
      fn(state);
    } catch (e) {
      // Một người nghe hỏng không được làm chết những người còn lại.
      console.error('[state] lỗi trong subscriber:', e);
    }
  }
}
