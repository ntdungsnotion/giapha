// ============================================================
// giapha · js/domains/person.js
// Vai trò  : Nghiệp vụ hồ sơ cá nhân — tạo, sửa, đọc thông tin một người
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/text.js, utils/date.js
// Phiên bản: 1.0.0 · Cập nhật: 17/08/2026 23:10
// ============================================================
import { fullName, coGiaTri } from '../utils/text.js';
import { parseLooseDate } from '../utils/date.js';

/** Tạo bản ghi người mới với đầy đủ trường mặc định. */
export function createPerson(tree, data) { /* TODO — chat 2.4, cùng lúc với thêm quan hệ */ }

/**
 * Sửa hồ sơ một người. Trả về CÂY MỚI, không đụng một chữ vào cây cũ.
 *
 * @param {object} tree      cây gia phả (object gốc của file JSON)
 * @param {string} personId
 * @param {object} changes   chỉ những trường muốn đổi; khoá vắng mặt = không đụng tới
 *        {
 *          name:  { surname, middle, given },   // áp vào mục names type:'chinh'
 *          sex, living, burialPlace, note,
 *          birth: { raw, place, iso? },
 *          death: { raw, place, iso? },
 *        }
 * @param {{boi?:string, luc?:string}} [ghiNhan]  người sửa và thời điểm, để ghi
 *        vào `meta`. Hàm này KHÔNG đọc đồng hồ máy — nơi gọi đưa vào, nhờ vậy
 *        nó vẫn là hàm thuần và bài kiểm chạy được với một mốc thời gian cố định.
 * @returns {{tree:object, person:object, diff:object, thayDoi:boolean}|null}
 *          null khi không có ai mang mã ấy.
 *
 * --- Vì sao chữ ký khác bản khung 15/08 ---------------------------------
 *
 * Khung cũ ghi `updatePerson(tree, personId, changes, byEmail)` và dặn *"có ghi
 * changeLog"*. Bỏ vế changeLog đi, vì chat 2.1 đã chốt ngược lại: `ts` và `by`
 * của mục changeLog do MÁY CHỦ điền, trình duyệt gửi lên cũng bị bỏ qua. Hàm
 * này mà tự đẩy một mục vào `changeLog` thì mục ấy hoặc bị máy chủ bỏ, hoặc
 * thành mục thứ hai trùng lặp — cả hai đều tệ hơn là không làm.
 *
 * `diff` trả ra chính là thứ nơi gọi đưa vào `moTa.diff` của `repo.luuCay()`.
 *
 * --- `iso` được tính lại từ `raw`, và chỉ khi `raw` đổi ------------------
 *
 * `raw` là chữ người trong họ đã gõ — đó là sự thật, không bao giờ bị ghi đè.
 * `iso` chỉ là phần máy đọc được từ chữ ấy. Gõ "tháng chạp năm Bính Tý" thì
 * `iso` thành null, và đó là đúng: thà không có mốc máy đọc được còn hơn có
 * một mốc bịa ra.
 *
 * Không đụng `raw` thì cũng không đụng `iso`. Bản ghi cũ có thể mang `iso`
 * chính xác hơn thứ đọc được từ `raw` (do người khác đặt tay, hoặc do nhập từ
 * GEDCOM), và tính lại một cách máy móc là làm mất phần chính xác đó.
 */
export function updatePerson(tree, personId, changes, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !personId) return null;

  const cu = tree.persons.find((p) => p && p.id === personId);
  if (!cu) return null;

  // Nhân bản sâu: cây là dữ liệu JSON thuần, không hàm, không Date. Nhờ bản sao
  // này mà cây cũ nguyên vẹn khi máy chủ từ chối lần lưu.
  const moi  = JSON.parse(JSON.stringify(cu));
  const diff = {};
  const ch   = changes || {};
  const ghi  = (duong, truoc, sau) => { diff[personId + '.' + duong] = [truoc, sau]; };

  if (ch.name) datTenChinh(moi, ch.name, ghi);

  datChuoi(moi, 'sex',         ch.sex,         ghi);
  datChuoi(moi, 'burialPlace', ch.burialPlace, ghi);
  datChuoi(moi, 'note',        ch.note,        ghi);

  if (ch.living !== undefined) {
    const sau = ch.living === true;
    if (moi.living !== sau) { ghi('living', moi.living, sau); moi.living = sau; }
  }

  datKhoiNgay(moi, 'birth', ch.birth, ghi);
  datKhoiNgay(moi, 'death', ch.death, ghi);

  const thayDoi = Object.keys(diff).length > 0;

  // Không có gì đổi thì không đụng vào `meta`. Ghi một dấu thời gian mới cho
  // một lần bấm Lưu không sửa gì là nói dối về lịch sử bản ghi.
  if (thayDoi) {
    if (!moi.meta || typeof moi.meta !== 'object') moi.meta = {};
    if (ghiNhan && coGiaTri(ghiNhan.luc)) moi.meta.updatedAt = String(ghiNhan.luc);
    if (ghiNhan && coGiaTri(ghiNhan.boi)) moi.meta.updatedBy = String(ghiNhan.boi);
  }

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? moi : p)),
  });

  return { tree: cayMoi, person: moi, diff, thayDoi };
}

/**
 * Áp bộ ba họ–đệm–tên vào mục tên CHÍNH.
 *
 * Tìm mục `type: 'chinh'`; không có thì lấy mục đầu tiên — đúng quy tắc mà
 * `utils/text.fullName` đang dùng để chọn tên hiển thị. Chọn khác đi thì sơ đồ
 * hiện một tên còn form sửa một tên khác.
 *
 * `names` rỗng thì dựng mục mới. Bản ghi không có tên nào là chuyện có thật:
 * người chỉ được nhớ là "con thứ ba của cụ Bá", chưa ai nhớ ra tên.
 */
function datTenChinh(nguoi, ten, ghi) {
  if (!Array.isArray(nguoi.names)) nguoi.names = [];
  let muc = nguoi.names.find((n) => n && n.type === 'chinh') || nguoi.names[0];
  if (!muc) {
    muc = { type: 'chinh', surname: '', middle: '', given: '' };
    nguoi.names.push(muc);
  }

  const truoc = fullName(muc);
  for (const khoa of ['surname', 'middle', 'given']) {
    if (ten[khoa] === undefined) continue;
    muc[khoa] = String(ten[khoa]).trim();
  }
  const sau = fullName(muc);
  if (truoc !== sau) ghi('names.chinh', truoc, sau);
}

/** Một trường chuỗi phẳng. Cắt khoảng trắng thừa hai đầu, giữ nguyên phần giữa. */
function datChuoi(nguoi, khoa, giaTri, ghi) {
  if (giaTri === undefined) return;
  const sau = giaTri === null ? '' : String(giaTri).trim();
  const truoc = typeof nguoi[khoa] === 'string' ? nguoi[khoa] : '';
  if (truoc === sau) return;
  ghi(khoa, truoc, sau);
  nguoi[khoa] = sau;
}

/**
 * Khối ngày { iso, raw, place }.
 *
 * `iso` tính lại từ `raw` mỗi khi `raw` đổi, trừ khi nơi gọi đưa thẳng `iso`
 * vào (đường dành cho ô chọn ngày của giai đoạn sau, khi máy biết chắc hơn
 * người gõ). Xem ghi chú dài ở đầu `updatePerson`.
 */
function datKhoiNgay(nguoi, khoa, khoi, ghi) {
  if (!khoi || typeof khoi !== 'object') return;
  if (!nguoi[khoa] || typeof nguoi[khoa] !== 'object') {
    nguoi[khoa] = { iso: null, raw: '', place: '' };
  }
  const o = nguoi[khoa];

  if (khoi.raw !== undefined) {
    const sau = khoi.raw === null ? '' : String(khoi.raw).trim();
    const truoc = typeof o.raw === 'string' ? o.raw : '';
    if (truoc !== sau) {
      ghi(khoa + '.raw', truoc, sau);
      o.raw = sau;

      const isoCu = coGiaTri(o.iso) ? o.iso : null;
      const isoMoi = khoi.iso !== undefined
        ? (coGiaTri(khoi.iso) ? String(khoi.iso).trim() : null)
        : parseLooseDate(sau).iso;
      if (isoCu !== isoMoi) {
        ghi(khoa + '.iso', isoCu, isoMoi);
        o.iso = isoMoi;
      }
    }
  }

  if (khoi.place !== undefined) {
    const sau = khoi.place === null ? '' : String(khoi.place).trim();
    const truoc = typeof o.place === 'string' ? o.place : '';
    if (truoc !== sau) { ghi(khoa + '.place', truoc, sau); o.place = sau; }
  }
}

/** Xoá mềm: đặt cờ deleted. KHÔNG xoá khỏi mảng. */
export function softDeletePerson(tree, personId, byEmail) { /* TODO — giai đoạn 2 */ }

export function restorePerson(tree, personId, byEmail) { /* TODO — giai đoạn 2 */ }

/**
 * Lấy tên chính để hiển thị.
 * Chỉ là lối vào đúng lớp cho `utils/text.fullName` — quy tắc ghép tên nằm ở
 * đó và CHỈ ở đó, để sơ đồ với thẻ thông tin không bao giờ gọi tên một người
 * theo hai kiểu khác nhau.
 */
export function getDisplayName(person) {
  return fullName(person);
}

/**
 * Các tên khác: huý, tự, thụy, pháp danh, thường gọi.
 *
 * @returns {{loai:string, ten:string}[]} — mảng rỗng nếu người này chỉ có một
 *          tên. Nơi gọi phải ẩn cả hàng khi rỗng.
 *
 * Mục `type: 'chinh'` bị loại vì nó đã hiện ở dòng tên lớn. Thiếu mục 'chinh'
 * thì `fullName` lấy tên ĐẦU TIÊN làm tên chính, nên ở đây cũng phải bỏ đúng
 * mục đầu tiên ấy — nếu không, tên chính hiện hai lần.
 */
export function getAlternateNames(person) {
  const ds = (person && Array.isArray(person.names)) ? person.names : [];
  const coChinh = ds.some((n) => n && n.type === 'chinh');
  const ra = [];

  ds.forEach((n, i) => {
    if (!n) return;
    if (coChinh ? n.type === 'chinh' : i === 0) return;
    const ten = fullName(n);
    if (!coGiaTri(ten)) return;
    ra.push({ loai: coGiaTri(n.type) ? String(n.type) : '', ten });
  });
  return ra;
}

/** Tìm người theo tên, không phân biệt dấu. */
export function searchPersons(tree, keyword) { /* TODO — cùng màn hình Tìm kiếm */ }
