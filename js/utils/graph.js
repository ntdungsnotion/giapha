// ============================================================
// giapha · js/utils/graph.js
// Vai trò  : Duyệt đồ thị dùng chung. MỌI hàm ở đây bắt buộc có tập visited.
// Lớp      : utils
// Phụ thuộc: (không)
// Phiên bản: 0.3.0 · Cập nhật: 15/08/2026 23:52
// ============================================================
//
// CẢNH BÁO: Gia phả là ĐỒ THỊ, không phải cây. Hôn nhân giữa hai nhánh
// cùng họ tạo ra nhiều đường đi giữa hai điểm. Thiếu tập visited là
// treo trình duyệt, không phải chạy chậm.

/**
 * Duyệt theo chiều rộng, có chống lặp sẵn.
 *
 * Tập visited nằm TRONG hàm này, không nhờ nơi gọi tự lo. Đây là lý do
 * mọi lần duyệt đồ thị trong app đều phải đi qua đây thay vì tự viết
 * vòng lặp tại chỗ.
 *
 * @param {string|string[]} startIds
 * @param {(id: string) => string[]} getNeighbors
 * @returns {Set<string>}
 */
export function bfs(startIds, getNeighbors) {
  return new Set(bfsLevels(startIds, getNeighbors).keys());
}

/**
 * Như `bfs()` nhưng giữ luôn số bước đã đi tới từng đỉnh, và cho phép
 * dừng ở một độ sâu.
 *
 * Cần thêm hàm này vì thuật toán tập hiển thị phải biết SỐ ĐỜI, không chỉ
 * biết "có nằm trong tập hay không": số đời quyết định union nào là trực hệ
 * đời mấy, và quyết định chỗ cắt khi người dùng giới hạn số đời.
 *
 * @param {string|string[]} startIds  các đỉnh xuất phát, đều mang độ sâu 0
 * @param {(id: string) => string[]} getNeighbors
 * @param {number} [maxDepth=0]  0 = không giới hạn (cùng quy ước với
 *                               ancestors/descendants trong DEFAULT_SCOPE)
 * @returns {Map<string, number>}  id -> độ sâu
 */
export function bfsLevels(startIds, getNeighbors, maxDepth = 0) {
  const doSau   = new Map();   // VỪA là kết quả VỪA là tập visited
  const hangDoi = [];

  const dau = Array.isArray(startIds) ? startIds : [startIds];
  for (const id of dau) {
    if (!id || doSau.has(id)) continue;
    doSau.set(id, 0);
    hangDoi.push(id);
  }

  // Đọc bằng con trỏ chứ không dùng shift(): shift() phải dời cả mảng mỗi
  // lần gọi, gia phả lớn thì tốn thấy rõ.
  let viTri = 0;
  while (viTri < hangDoi.length) {
    const id  = hangDoi[viTri++];
    const doi = doSau.get(id);
    if (maxDepth > 0 && doi >= maxDepth) continue;

    const cacKe = getNeighbors(id) || [];
    for (const ke of cacKe) {
      if (!ke || doSau.has(ke)) continue;   // ← ĐÚNG CHỖ NÀY chống lặp vô hạn
      doSau.set(ke, doi + 1);
      hangDoi.push(ke);
    }
  }

  return doSau;
}

/**
 * Dựng chỉ mục tra cứu nhanh, gọi MỘT LẦN sau khi đọc file.
 *
 * Bỏ qua mọi bản ghi có cờ `deleted` — app không xoá cứng, nên dữ liệu
 * luôn còn xác người đã xoá. Chỉ mục là "những gì đang tồn tại".
 *
 * Ném lỗi khi gặp hai bản ghi trùng mã: đó là hỏng dữ liệu ở mức làm sai
 * cả sơ đồ mà không báo gì. Thà dừng và nói rõ còn hơn vẽ ra một cây sai.
 *
 * @param {object} tree  object gốc đọc từ file JSON
 * @returns {{
 *   personById:      Map<string, object>,
 *   unionById:       Map<string, object>,
 *   unionsAsPartner: Map<string, string[]>,
 *   unionsAsChild:   Map<string, string[]>
 * }}
 */
export function buildIndex(tree) {
  const personById      = new Map();   // P0001 -> object người
  const unionById       = new Map();   // U0001 -> object hôn nhân
  const unionsAsPartner = new Map();   // P0001 -> ['U0001', …] làm vợ/chồng
  const unionsAsChild   = new Map();   // P0001 -> ['U0001', …] làm con

  const persons = (tree && Array.isArray(tree.persons)) ? tree.persons : [];
  const unions  = (tree && Array.isArray(tree.unions))  ? tree.unions  : [];

  for (const p of persons) {
    if (!p || !p.id || p.deleted) continue;
    if (personById.has(p.id)) {
      throw new Error('Dữ liệu hỏng: có hai người cùng mã ' + p.id + '.');
    }
    personById.set(p.id, p);
    unionsAsPartner.set(p.id, []);
    unionsAsChild.set(p.id, []);
  }

  for (const u of unions) {
    if (!u || !u.id || u.deleted) continue;
    if (unionById.has(u.id)) {
      throw new Error('Dữ liệu hỏng: có hai hôn nhân cùng mã ' + u.id + '.');
    }
    unionById.set(u.id, u);

    // partners là MẢNG hai chiều bình đẳng, không phải hai trường riêng —
    // xem HIEN-PHAP mục dữ liệu. Hôn nhân đồng giới không được phép gãy.
    const partners = Array.isArray(u.partners) ? u.partners : [];
    for (const personId of partners) {
      themMotLan(unionsAsPartner, personId, u.id);
    }

    // children là mảng object { personId, relation, order }, không phải mảng ID.
    const children = Array.isArray(u.children) ? u.children : [];
    for (const con of children) {
      themMotLan(unionsAsChild, con && con.personId, u.id);
    }
  }

  return { personById, unionById, unionsAsPartner, unionsAsChild };
}

/**
 * Ghi `unionId` vào danh sách của `personId`, bỏ qua nếu người đó không có
 * trong chỉ mục (đã xoá, hoặc union trỏ tới một mã không tồn tại).
 *
 * Chống trùng vì hai lý do có thật:
 *  - cùng một union lỡ ghi một người hai lần trong `partners`;
 *  - CON NUÔI: một người nằm trong `children` của hai union khác nhau là
 *    chuyện HỢP LỆ, nên `unionsAsChild` phải là mảng chứ không phải một giá
 *    trị đơn. Đây là ca 0.10 còn treo — cấu trúc đã chừa sẵn chỗ.
 */
function themMotLan(bang, personId, unionId) {
  if (!personId) return;
  const danhSach = bang.get(personId);
  if (!danhSach) return;                    // người đã xoá hoặc mã lạ
  if (danhSach.indexOf(unionId) === -1) danhSach.push(unionId);
}
