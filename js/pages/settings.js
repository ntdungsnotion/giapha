// ============================================================
// giapha · js/pages/settings.js
// Vai trò  : Cài đặt hiển thị
// Lớp      : pages
// Phụ thuộc: state, services/gas (đặt người trung tâm mặc định)
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================

export function openSettings() { /* TODO — chat 1.5 */ }

/**
 * "Đặt làm người trung tâm mặc định" — ghi vào
 * PropertiesService.getUserProperties() của Apps Script, tách riêng theo
 * từng tài khoản đăng nhập. Đệm thêm ở localStorage để lần mở sau vẽ ngay
 * trong khi chờ máy chủ.
 * ⚠ Chờ kết quả mục 0.11: getUserProperties có tách theo người dùng ngoài
 *   ở chế độ "thực thi bằng người truy cập" hay không. Hỏng thì rơi về
 *   localStorage thuần — mất đồng bộ giữa máy, nhưng không chặn việc gì.
 */
export async function datNguoiTrungTamMacDinh(personId) { /* TODO — chat 1.5 */ }

// Các tuỳ chọn dự kiến:
//   - Hiện/ẩn tuổi thọ
//   - Tên 1 dòng hay 2 dòng
//   - Định dạng ngày
//   - Cỡ chữ trên sơ đồ
//   - Ẩn thông tin người còn sống
