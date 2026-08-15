// ============================================================
// giapha · js/domains/bloodline.js
// Vai trò  : TÍNH NĂNG CỐT LÕI — xác định ai được vẽ đầy đủ quanh người
//            trung tâm, ai chỉ là nút biên, và nhánh nào thu về nốt cụt.
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/graph
// Phiên bản: 0.2.0 · Cập nhật: 15/08/2026 12:16
// ============================================================
//
// ⚠ ĐẶC TẢ CŨ ĐÃ BỊ CHỨNG MINH SAI bằng dữ liệu thật (xem NK-B04):
//   nó kéo cả 32/32 người vào tập vẽ, tức không sinh ra nốt cụt nào.
//   Bản dưới đây theo KE-HOACH_V08. Hàm cũ computeBloodline() và
//   classifyNodes() đã bỏ — tên "bloodline" không còn đúng nghĩa, tập vẽ
//   là "huyết thống trong phạm vi k", không phải toàn bộ huyết thống.
//
// THUẬT TOÁN (đừng "tối ưu" thành đệ quy không visited):
//
//   1. ĐI LÊN — dựng tập tổ tiên, có visited
//      BFS từ focus qua cạnh con → cha mẹ.
//      Mỗi union đi qua lấy CẢ HAI partner.
//      Gán số đời: focus = 0, cha mẹ = 1, ông bà = 2 …
//
//   2. XÁC ĐỊNH UNION TRỰC HỆ
//      Một union là "trực hệ đời d" khi CẢ HAI partner đều trong tập tổ tiên.
//      d = số đời lớn hơn trong hai người.
//      ⚠ CHỖ DỄ SAI NHẤT: viết thành "mọi union mà cha là partner" thì con
//      riêng của cha với người vợ khác bị kéo vào tập vẽ. Anh chị em được mở
//      ngang là anh chị em CÙNG CHA CÙNG MẸ; cùng cha khác mẹ thuộc nốt cụt.
//
//   3. DỰNG TẬP VẼ ĐẦY ĐỦ (kind = 'full')
//      full = tập tổ tiên
//           ∪ hậu duệ(focus)
//           ∪ hậu duệ(mọi con của union trực hệ có d ≤ k)
//      Mọi lần đi xuống đều qua cạnh cha mẹ → con, có visited.
//
//   4. NÚT BIÊN (kind = 'edge')
//      Xét từng union. Lấy partner chưa nằm trong full khi:
//        - union đó là union của chính người trung tâm, HOẶC
//        - union đó có con nằm trong full VÀ đã có sẵn một partner trong full
//      Vẽ ô người bình thường, nhưng KHÔNG đi tiếp từ họ.
//      Vế thứ hai bắt buộc phải có: thiếu nó thì khi người dùng giới hạn số
//      đời, cha mẹ vừa bị cắt sẽ bị kéo ngược vào làm nút biên.
//      Nói cho dễ nhớ: NÚT BIÊN CHỈ CÓ THỂ LÀ NGƯỜI PHỐI NGẪU CÒN THIẾU,
//      KHÔNG BAO GIỜ LÀ CHA MẸ.
//
//   5. NỐT CỤT — chỉ vẽ khi thật sự CÓ bản ghi ở hướng đó.
//
// BÀI KIỂM TRA BẮT BUỘC (chat 1.2), chạy trên giapha-nguyen-trong-bac.json,
// k = 1, ancestors = 0, descendants = 0:
//
//   P0011 Nguyễn Bá Long        -> 7   (đã chạy tay 15/08/2026, khớp)
//   P0007 Nguyễn Bá Cương       -> 9
//   P0012 Nguyễn Trọng Dũng     -> 15
//   P0020 Nguyễn Thị Hương Lan  -> 14
//   P0011 với ancestors = 2     -> 5   (ca duy nhất bắt được lỗi nút biên)
//
// Không đủ năm con số thì thuật toán sai, đừng đi tiếp sang chat 1.3.

/**
 * Tập người được vẽ, kèm cách vẽ từng người.
 * @param {object} index  chỉ mục từ utils/graph.buildIndex
 * @param {string} focusPersonId
 * @param {{ancestors:number, descendants:number,
 *          spouseOfDescendants:boolean, k:number}} scope
 * @returns {Map<string, 'full'|'edge'>}
 */
export function computeVisibleSet(index, focusPersonId, scope) { /* TODO — chat 1.2 */ }

/**
 * Bốn chỗ gắn nốt cụt:
 *   - trên đầu một nút biên              : người đó có cha mẹ trong dữ liệu
 *   - trên đầu người ở đời ngoài cùng    : cha mẹ bị cắt do chạm giới hạn ancestors
 *   - cạnh union trực hệ có d > k        : union đó còn con chưa vẽ
 *   - cạnh một người trong full          : người đó còn union khác không đủ điều kiện vẽ
 *
 * CHỈ VẼ KHI THẬT SỰ CÓ BẢN GHI Ở HƯỚNG ĐÓ.
 * @returns {Array<{ personId: string, direction: 'up'|'side', hiddenCount: number }>}
 */
export function findStubPoints(index, visibleSet, scope) { /* TODO — chat 1.2 */ }
