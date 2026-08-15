// ============================================================
// giapha · js/utils/image.js
// Vai trò  : Nén ảnh phía trình duyệt trước khi tải lên Drive
// Lớp      : utils
// Phụ thuộc: config
// Phiên bản: 0.1.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
import { PHOTO } from '../config.js';

/**
 * Nén ảnh bằng canvas. Ảnh trên sơ đồ chỉ hiện cỡ vài chục pixel,
 * không có lý do gì tải lên file gốc 4MB.
 * @returns {Promise<Blob>}
 */
export function compressImage(file) { /* TODO */ }

/** Đường dẫn thumbnail của Drive. Không tải file rồi chuyển base64 — chậm và tốn quota. */
export function driveThumbUrl(fileId, size = PHOTO.thumbSize) { /* TODO */ }
