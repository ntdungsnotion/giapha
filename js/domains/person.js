// ============================================================
// giapha · js/domains/person.js
// Vai trò  : Nghiệp vụ hồ sơ cá nhân — tạo, sửa, đọc thông tin một người
// Lớp      : domains — HÀM THUẦN. Không gọi services, không chạm DOM.
// Phụ thuộc: utils/{text,date,id}
// Phiên bản: 1.8.0 · Cập nhật: 29/08/2026 17:45
// ============================================================
import { fullName, coGiaTri, removeDiacritics, doiSongNguoi } from '../utils/text.js';
import { parseLooseDate } from '../utils/date.js';
import { nextId, sinhUid, maCayCuaCay } from '../utils/id.js';

/**
 * Tạo bản ghi người mới với đầy đủ trường mặc định.
 *
 * @param {object} tree
 * @param {object} [data]  cùng khuôn `changes` của `updatePerson`
 * @param {{boi?:string, luc?:string}} [ghiNhan]
 * @returns {{tree:object, person:object, diff:object}|null}
 *
 * --- Vì sao hàm này ĐI QUA `updatePerson` --------------------------------
 *
 * Nó dựng một bản ghi TRỐNG đủ trường, chèn vào cây, rồi để `updatePerson()`
 * điền. Viết riêng một đường điền thứ hai thì có hai chỗ chuẩn hoá dữ liệu: một
 * chỗ cắt khoảng trắng và đọc `iso` từ `raw`, một chỗ không — mà hai đường ấy
 * chỉ lệch nhau đúng vào ngày ai đó sửa một bên. Cùng lý lẽ với luật 1 của form
 * (*thứ được rà phải đúng là thứ được ghi*), lùi thêm một bậc.
 *
 * `diff` trả ra vì thế kể đúng những ô người dùng đã điền, mỗi ô một dòng
 * `['', giá trị mới]`. Không điền gì thì `diff` rỗng — và bản ghi vẫn được tạo:
 * một người chỉ được nhớ là *"con thứ ba của cụ Bá"* là bản ghi hợp lệ.
 *
 * ⚠ Trả về CÂY MỚI đã có người ấy. Thêm tiếp bản ghi thứ hai thì phải nối đuôi
 * từ cây này, vì `nextId()` đọc cây — xem ghi chú đầu `utils/id.js`.
 */
export function createPerson(tree, data, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons)) return null;

  const ma  = nextId('P', tree);
  const luc = (ghiNhan && coGiaTri(ghiNhan.luc)) ? String(ghiNhan.luc) : '';
  const boi = (ghiNhan && coGiaTri(ghiNhan.boi)) ? String(ghiNhan.boi) : '';

  const tron = {
    id:    ma,
    // Điểm neo đi theo CON NGƯỜI, không theo cây: người này xuất sang phần mềm
    // khác rồi quay về vẫn nhận ra được, dù mã bên kia đặt là gì. Xem `id.js`.
    uid:   sinhUid(maCayCuaCay(tree), ma),
    names: [],
    sex:   'U',
    birth: { iso: null, raw: '', place: '' },
    death: { iso: null, raw: '', place: '' },
    burialPlace: '',

    // Bộ THÔNG DỤNG của gia phả Việt (CAU-TRUC-DU-LIEU_V03, 21/08/2026).
    // Nằm PHẲNG cạnh `burialPlace`, KHÔNG nằm trong `vn`: cả sáu đều có thẻ
    // GEDCOM chuẩn, còn `vn.*` chỉ dành cho thứ phải bịa ra một thẻ `_` riêng.
    title:       '',
    occupation:  '',
    education:   '',
    religion:    '',
    residence:   '',
    nationality: '',

    // Mặc định CÒN SỐNG — chủ dự án chốt 18/08/2026 sau lần thử đầu trên app
    // thật. Người thêm bằng tay gần như luôn là người đang sống; người đã khuất
    // thì đã nằm sẵn trong gia phả từ đợt nhập liệu hàng loạt. Bản nháp đầu để
    // `false` với lý lẽ "đa số người trong gia phả đã mất" — đúng về CẢ CUỐN
    // gia phả, sai về những bản ghi đi qua cái form này.
    living:      true,
    photoFileId: '',
    note:        '',
    deleted:     false,
    meta:        { createdAt: luc, updatedAt: luc, updatedBy: boi },
  };

  const cayTron = Object.assign({}, tree, { persons: tree.persons.concat([tron]) });
  const kq = updatePerson(cayTron, ma, data || {}, ghiNhan);
  if (!kq) return null;

  return { tree: kq.tree, person: kq.person, diff: kq.diff };
}

/**
 * Sửa hồ sơ một người. Trả về CÂY MỚI, không đụng một chữ vào cây cũ.
 *
 * @param {object} tree      cây gia phả (object gốc của file JSON)
 * @param {string} personId
 * @param {object} changes   chỉ những trường muốn đổi; khoá vắng mặt = không đụng tới
 *        {
 *          name:  { surname, middle, given },   // áp vào mục names type:'chinh'
 *          altNames: [ { type, surname, middle, given } ],  // TÊN PHỤ, CẢ danh sách
 *          sex, living, burialPlace, note,
 *          title, occupation, education, religion, residence, nationality,
 *          birth: { raw, place, iso? },
 *          death: { raw, place, iso? },
 *          gio,                                  // ngày giỗ ÂM LỊCH -> vn.gio
 *          doi,                                  // Đời           -> vn.generation
 *          chi,                                  // Chi / nhánh   -> vn.branch
 *        }
 *
 * ⚠ Sáu trường thông dụng nhận CHUỖI TỰ DO, không có danh sách chọn — lý lẽ
 * đầy đủ ở `CAU-TRUC-DU-LIEU_V03`. Tóm tắt: gia phả cũ chép nghề nghiệp và tôn
 * giáo bằng chữ của người chép, ép vào danh sách là làm mất chữ gốc.
 *
 * ⚠ `nationality` mang **DÂN TỘC** (Kinh, Tày, Mường…), không mang quốc tịch.
 * Nó ánh xạ về thẻ GEDCOM `NATI` lúc xuất, và đó là chỗ DUY NHẤT trong schema
 * mà tên trường tiếng Anh không nói đúng thứ nó chứa.
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
  datTenPhu(moi, ch.altNames, ghi);

  datChuoi(moi, 'sex',         ch.sex,         ghi);
  datChuoi(moi, 'burialPlace', ch.burialPlace, ghi);
  datChuoi(moi, 'note',        ch.note,        ghi);

  // Bộ thông dụng (V03). Cùng một phép đặt với `burialPlace` — không trường
  // nào trong sáu cái này cần luật riêng, và đó chính là lý do chúng đứng
  // phẳng cạnh nhau thay vì mỗi cái một hàm.
  datChuoi(moi, 'title',       ch.title,       ghi);
  datChuoi(moi, 'occupation',  ch.occupation,  ghi);
  datChuoi(moi, 'education',   ch.education,   ghi);
  datChuoi(moi, 'religion',    ch.religion,    ghi);
  datChuoi(moi, 'residence',   ch.residence,   ghi);
  datChuoi(moi, 'nationality', ch.nationality, ghi);

  if (ch.living !== undefined) {
    const sau = ch.living === true;
    if (moi.living !== sau) { ghi('living', moi.living, sau); moi.living = sau; }
  }

  datKhoiNgay(moi, 'birth', ch.birth, ghi);
  datKhoiNgay(moi, 'death', ch.death, ghi);
  datNgayGio(moi, ch.gio, ghi);
  datDoi(moi, ch.doi, ghi);
  datVnChuoi(moi, 'branch', ch.chi, ghi);

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

/**
 * TÊN PHỤ — mọi mục trong `names[]` KHÁC mục tên chính: huý · tự · thụy ·
 * pháp danh · thường gọi · khác.
 *
 * @param {Array} danhSach  cả danh sách tên phụ SAU khi sửa, không phải phần
 *        thêm vào. Vắng mặt (`undefined`) = không đụng tới tên phụ.
 *
 * --- Vì sao nhận CẢ DANH SÁCH chứ không nhận từng phép thêm/bớt ----------
 *
 * Đây là mảng, không phải ô chữ. Nhận `{ them: …, bo: … }` thì hàm phải khớp
 * hai bên bằng chỉ số hoặc bằng mã, mà mục tên phụ **không có mã** — hai người
 * cùng tên huý "Bá" là hai mục giống hệt nhau. Form giữ nguyên cả danh sách
 * đang gõ dở và gửi lên trọn vẹn; hàm này thay hẳn phần tên phụ. Cùng lối với
 * `union.reorderChildren()`, và cùng lý do: sửa một mảng thì gửi cả mảng.
 *
 * --- Mục tên chính KHÔNG BAO GIỜ bị đụng tới ----------------------------
 *
 * Nó được nhấc ra trước rồi ghép lại vào đầu, đúng cùng một quy tắc mà
 * `utils/text.fullName` dùng để chọn tên hiển thị: có `type:'chinh'` thì lấy
 * nó, không có thì mục ĐẦU TIÊN đóng vai ấy. Chọn khác đi là sơ đồ gọi một
 * người bằng một tên còn thẻ gọi bằng tên khác.
 *
 * ⚠ **Người chưa có tên nào mà lại có tên phụ thì hàm dựng một mục `chinh`
 * RỖNG đứng đầu.** Không dựng thì mục tên huý trôi lên hàng đầu và `fullName`
 * lấy nó làm tên chính — cả sơ đồ hiện tên huý, đúng cái tên mà gia phả cũ
 * kiêng không gọi ra.
 *
 * ⚠ **Hàng trống là hàng BỊ XOÁ.** Người dùng xoá sạch chữ trong một hàng rồi
 * bấm Lưu thì mục ấy biến mất, không lưu một mục tên rỗng. Mục rỗng vô hình
 * trên thẻ (`getAlternateNames` bỏ qua) nhưng vẫn nằm trong file, và lần xuất
 * GEDCOM sau sinh ra một thẻ `NAME` không có chữ nào.
 */
function datTenPhu(nguoi, danhSach, ghi) {
  if (danhSach === undefined) return;
  if (!Array.isArray(nguoi.names)) nguoi.names = [];

  const chinh = nguoi.names.find((n) => n && n.type === 'chinh') || nguoi.names[0] || null;

  const sach = [];
  for (const m of (Array.isArray(danhSach) ? danhSach : [])) {
    if (!m || typeof m !== 'object') continue;
    const muc = {
      type:    chuanLoaiTenPhu(m.type),
      surname: m.surname === undefined || m.surname === null ? '' : String(m.surname).trim(),
      middle:  m.middle  === undefined || m.middle  === null ? '' : String(m.middle).trim(),
      given:   m.given   === undefined || m.given   === null ? '' : String(m.given).trim(),
    };
    if (!coGiaTri(fullName(muc))) continue;
    sach.push(muc);
  }

  const truoc = keTenPhu(nguoi.names, chinh);
  const sau   = keTenPhu(sach, null);
  if (truoc === sau) return;

  if (chinh) nguoi.names = [chinh].concat(sach);
  else if (sach.length) nguoi.names = [{ type: 'chinh', surname: '', middle: '', given: '' }].concat(sach);
  else nguoi.names = [];

  ghi('names.phu', truoc, sau);
}

/**
 * Loại tên phụ, chuẩn hoá. Mã lạ được GIỮ NGUYÊN chứ không ép về `khac`:
 * file GEDCOM nhập từ phần mềm khác có thể mang `birth_name`, `married_name`,
 * và ép hết về `khac` là làm mất một điều dữ liệu gốc đã nói rõ.
 *
 * Chỉ một mã bị đổi: `chinh`. Mục tên chính đứng riêng ở đầu mảng, nên một mục
 * thứ hai cũng mang `chinh` sẽ làm `fullName` và `getAlternateNames` đọc ra hai
 * người khác nhau từ cùng một bản ghi.
 */
function chuanLoaiTenPhu(loai) {
  const t = String(loai === undefined || loai === null ? '' : loai).trim();
  if (t === '' || t === 'chinh') return 'khac';
  return t;
}

/** Kể tên phụ thành một dòng chữ cho `diff`: `huy:Bá · phap_danh:Minh Tâm`. */
function keTenPhu(danhSach, boQua) {
  return (Array.isArray(danhSach) ? danhSach : [])
    .filter((n) => n && n !== boQua)
    .map((n) => String(n.type || '') + ':' + fullName(n))
    .join(' · ');
}

/**
 * NGÀY GIỖ — `vn.gio`, chữ tự do, ÂM LỊCH (bước 28).
 *
 * Nằm trong khối `vn` chứ không nằm phẳng cạnh `birth`/`death`, đúng như
 * `CAU-TRUC-DU-LIEU` đã định: `vn.*` là nhóm trường RIÊNG CỦA GIA PHẢ VIỆT,
 * và khi xuất GEDCOM chúng thành thẻ có gạch dưới (`_GIO`) mà phần mềm nước
 * ngoài bỏ qua được. Để phẳng thì lúc xuất không phân biệt nổi trường nào là
 * chuẩn GEDCOM, trường nào là của riêng ta.
 *
 * Dựng khối `vn` khi cần, chứ KHÔNG thêm sẵn `vn: {}` vào mọi bản ghi mới:
 * 59 khối rỗng trong file dữ liệu không nói thêm được điều gì.
 */
function datNgayGio(nguoi, giaTri, ghi) {
  if (giaTri === undefined) return;

  const sau   = String(giaTri).trim();
  const truoc = (nguoi.vn && typeof nguoi.vn.gio === 'string') ? nguoi.vn.gio : '';
  if (truoc === sau) return;

  if (!nguoi.vn || typeof nguoi.vn !== 'object') nguoi.vn = {};
  nguoi.vn.gio = sau;
  ghi('vn.gio', truoc, sau);
}

/**
 * ĐỜI — `vn.generation`, **số nguyên dương hoặc VẮNG MẶT**.
 *
 * ⚠ **Ô trống phải XOÁ HẲN khoá, không được lưu số 0.** Đời 0 không có nghĩa
 * gì trong gia phả, mà một khi đã nằm trong dữ liệu thì nó là một con số thật
 * — và mọi phép đếm, mọi bản xuất GEDCOM sau này đều phải học cách bỏ qua nó.
 * Vắng mặt là *"chưa ai ghi"*, và đó đúng là sự thật của phần lớn bản ghi.
 *
 * ⚠ **Chữ không đọc ra số thì KHÔNG ĐỘNG VÀO.** Gõ nhầm "năm" vào ô Đời mà app
 * lặng lẽ xoá mất số 5 đang có là mất dữ liệu do một lỗi gõ phím. Form là chỗ
 * nói cho người dùng biết họ gõ sai, không phải chỗ này.
 */
function datDoi(nguoi, giaTri, ghi) {
  if (giaTri === undefined) return;

  const chu   = String(giaTri).trim();
  const truoc = (nguoi.vn && Number.isFinite(Number(nguoi.vn.generation)) &&
                 Number(nguoi.vn.generation) > 0)
    ? Number(nguoi.vn.generation) : null;

  let sau = null;
  if (chu !== '') {
    const n = Number(chu);
    if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) return;   // gõ sai: không đụng
    sau = n;
  }

  if (truoc === sau) return;
  if (!nguoi.vn || typeof nguoi.vn !== 'object') nguoi.vn = {};
  if (sau === null) delete nguoi.vn.generation;
  else nguoi.vn.generation = sau;
  ghi('vn.generation', truoc === null ? '' : truoc, sau === null ? '' : sau);
}

/** Một trường CHỮ trong nhóm `vn`. Dùng cho `branch`; `gio` có hàm riêng vì nó có sẵn từ trước. */
function datVnChuoi(nguoi, khoa, giaTri, ghi) {
  if (giaTri === undefined) return;

  const sau   = giaTri === null ? '' : String(giaTri).trim();
  const truoc = (nguoi.vn && typeof nguoi.vn[khoa] === 'string') ? nguoi.vn[khoa] : '';
  if (truoc === sau) return;

  if (!nguoi.vn || typeof nguoi.vn !== 'object') nguoi.vn = {};
  nguoi.vn[khoa] = sau;
  ghi('vn.' + khoa, truoc, sau);
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

/**
 * Xoá MỀM một người: chỉ đặt cờ `deleted`. KHÔNG xoá khỏi mảng, và KHÔNG đụng
 * một chữ nào vào `unions`.
 *
 * @param {object} tree
 * @param {string} personId
 * @param {{boi?:string, luc?:string}} [ghiNhan]
 * @returns {{tree:object, person:object, diff:object}|null}
 *          null khi không có ai mang mã ấy, HOẶC khi cờ đã đúng sẵn — không có
 *          gì để làm thì không dựng ra một lần lưu rỗng.
 *
 * --- Vì sao KHÔNG dọn dẹp `unions` cùng lúc ------------------------------
 *
 * Cám dỗ là gỡ luôn mã người ấy khỏi `partners` và `children` cho "sạch". Đừng.
 * Hai lý do, lý do thứ hai mới là lý do thật:
 *
 * 1. Đường ĐỌC đã lọc sẵn rồi, ở cả ba chặng: `buildIndex` bỏ qua người mang cờ
 *    và không ghi họ vào bảng tra (`utils/graph.js`, hàm `themMotLan`);
 *    `bloodline.js` lọc lại lần nữa bằng `index.personById.has`; `layout.js` chỉ
 *    nhận partner nằm trong tập hiển thị. Người bị xoá đã biến mất khỏi sơ đồ mà
 *    không cần ai đụng vào `unions`.
 * 2. HOÀN TÁC phải trả lại ĐÚNG thứ đã có. Gỡ mã khỏi `partners`/`children` thì
 *    `restorePerson` phải nhớ được người ấy đứng ở union nào, thứ mấy trong hàng
 *    anh em, `order` bao nhiêu, quan hệ đẻ hay nuôi — tức là phải chép một bản
 *    sao thứ hai của mối nối vào đâu đó, và bản sao ấy sẽ trôi khác bản gốc.
 *    Lật đúng MỘT cờ thì hoàn tác là lật ngược lại, không mất gì.
 *
 * ⚠ Hệ quả phải biết: xoá một người KHÔNG xoá ai khác, kể cả con cháu. Một cặp
 * mất hết partner sống mà vẫn còn con thì mấy người con ấy vẫn còn nguyên, chỉ
 * là trên sơ đồ họ không còn thấy cha mẹ nào. Nơi gọi phải NÓI RA điều đó trước
 * khi xoá — xem `pages/person-edit.js`, luật 8.
 */
export function softDeletePerson(tree, personId, ghiNhan) {
  return datCoXoa(tree, personId, true, ghiNhan);
}

/** Đưa một người đã xoá trở lại. Chỉ lật cờ `deleted` về false. */
export function restorePerson(tree, personId, ghiNhan) {
  return datCoXoa(tree, personId, false, ghiNhan);
}

function datCoXoa(tree, personId, coXoa, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !personId) return null;

  const cu = tree.persons.find((p) => p && p.id === personId);
  if (!cu) return null;

  const truoc = cu.deleted === true;
  if (truoc === coXoa) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.deleted = coXoa;

  if (!moi.meta || typeof moi.meta !== 'object') moi.meta = {};
  if (ghiNhan && coGiaTri(ghiNhan.luc)) moi.meta.updatedAt = String(ghiNhan.luc);
  if (ghiNhan && coGiaTri(ghiNhan.boi)) moi.meta.updatedBy = String(ghiNhan.boi);

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? moi : p)),
  });

  const diff = {};
  diff[personId + '.deleted'] = [truoc, coXoa];

  return { tree: cayMoi, person: moi, diff };
}

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

// ============================================================
// TÌM NGƯỜI — bước 24
// ============================================================
//
// --- Vì sao hàm này đọc CÂY chứ không đọc CHỈ MỤC -----------------------
//
// Mọi màn hình khác của app đi qua `state.index`, và `buildIndex()` cố ý bỏ
// qua bản ghi mang cờ `deleted`. Nhưng màn hình Danh sách người sinh ra đúng
// vì app đang coi *"được vẽ"* là *"tồn tại"*: sơ đồ vẽ quanh một người trung
// tâm, nên ai không nối với ai thì không cửa nào tới được (ca thật: xoá
// `P0060` làm `P0061` chỉ còn 1/63 người trung tâm nhìn thấy).
//
// Đọc thẳng `tree.persons` là chỗ DUY NHẤT trong app nhìn thấy toàn bộ kho —
// kể cả người chưa nối với ai, và kể cả người đã xoá mềm nếu nơi gọi xin.
// Đi qua chỉ mục thì hàm này thừa: nó chỉ lặp lại đúng những người sơ đồ đã vẽ.
//
// --- Người đã xoá mềm: MẶC ĐỊNH KHÔNG kể ra ------------------------------
//
// Mặc định `gomDaXoa: false` để danh sách nói cùng một thứ tiếng với sơ đồ và
// thẻ thông tin. Nơi gọi xin `gomDaXoa: true` thì phải tự lo phần sau: thẻ
// thông tin đọc từ `index`, mà `index` không có họ — mở danh sách kể tên người
// đã xoá rồi bấm vào không ra gì là tệ hơn không kể tên. Màn hình bước 24 CỐ Ý
// không bật cờ này; nó dành cho đường "thùng rác" của bước sau.
//
// --- Năm hạng khớp, và vì sao xếp đúng thứ tự này ------------------------
//
//   0. mã ĐÚNG y hệt      — gõ `P0061` thì người ấy phải đứng đầu, không bàn
//   1. một TIẾNG của tên bắt đầu bằng chữ đang gõ — "dung" ra "Nguyễn Trọng
//      Dũng". Người Việt tra theo TÊN chứ không theo họ, nên hạng này phải
//      đứng trên hạng "nằm đâu đó trong tên"
//   2. nằm đâu đó trong tên chính
//   3. khớp một TÊN KHÁC (huý, tự, thụy, pháp danh, thường gọi)
//   4. mã chứa chuỗi đang gõ — gõ "0061" vẫn ra `P0061`
//
// Tên khác xếp dưới tên chính vì màn hình hiện tên chính; khớp mà không thấy
// chữ mình vừa gõ ở đâu là thứ làm người dùng tưởng máy hỏng — nên hạng 3 kèm
// theo `tenKhac` để nơi gọi in ra *"tên huý: …"*.

/** Số dòng trả về tối đa khi nơi gọi không nói gì. Xem ghi chú `conThua`. */
export const TIM_TOI_DA = 200;

/**
 * Tìm người theo tên hoặc theo mã, không phân biệt dấu và hoa thường.
 *
 * @param {object} tree      cây gia phả (object gốc của file JSON)
 * @param {string} keyword   chuỗi người dùng gõ; RỖNG = lấy cả danh sách
 * @param {{gomDaXoa?:boolean, toiDa?:number}} [tuyChon]
 * @returns {{ket:Array, tongKhop:number, tongNguoi:number, conThua:number}}
 *   `ket` — mỗi mục `{ id, person, ten, doiSong, deleted, hang, khop, tenKhac }`
 *     `khop`  : 'ma' | 'ten' | 'tenKhac'
 *     `ten`   : tên chính đã ghép sẵn; RỖNG là chuyện có thật (bản ghi chưa có
 *               tên nào), nơi gọi phải tự lo chữ thay thế
 *   `tongKhop` — số người khớp TRƯỚC khi cắt bớt
 *   `conThua`  — số người khớp mà không lọt vào `ket`; > 0 thì màn hình phải
 *                nói ra, im lặng cắt bớt là nói dối về kho dữ liệu
 *
 * ⚠ Chữ ký khác bản khung `(tree, keyword)`: thêm tham số thứ ba, và trả về
 * một object chứ không phải một mảng. Trả mảng thì `conThua` không có chỗ đứng,
 * và màn hình buộc phải tự đếm lại lần nữa trên cùng bộ dữ liệu.
 *
 * Hàm THUẦN: không đụng `tree`, không đọc đồng hồ, không chạm DOM. `person`
 * trong mỗi mục là THAM CHIẾU tới bản ghi gốc — nơi gọi chỉ được đọc.
 */
export function searchPersons(tree, keyword, tuyChon) {
  const ds  = (tree && Array.isArray(tree.persons)) ? tree.persons : [];
  const tuy = tuyChon || {};
  const gomDaXoa = tuy.gomDaXoa === true;
  const toiDa = Number.isFinite(tuy.toiDa) ? Math.max(0, Math.trunc(tuy.toiDa)) : TIM_TOI_DA;

  const kim = removeDiacritics(typeof keyword === 'string' ? keyword : '').trim();

  let tongNguoi = 0;
  const khop = [];

  for (const p of ds) {
    if (!p || !p.id) continue;
    if (!gomDaXoa && p.deleted === true) continue;
    tongNguoi++;

    const m = doHang(p, kim);
    if (!m) continue;

    khop.push({
      id:      p.id,
      person:  p,
      ten:     fullName(p),
      doiSong: doiSongNguoi(p),
      deleted: p.deleted === true,
      hang:    m.hang,
      khop:    m.khop,
      tenKhac: m.tenKhac || '',
    });
  }

  // Cùng hạng thì xếp theo TÊN, người chưa có tên xuống cuối — họ chỉ tìm được
  // bằng mã, mà xếp một loạt dòng trống lên đầu danh sách thì che mất phần
  // người dùng đọc được. Cùng tên thì xếp theo mã cho thứ tự ổn định: cùng một
  // cây phải luôn cho cùng một thứ tự, nếu không thì bài kiểm nào cũng lung lay.
  khop.sort((a, b) => {
    if (a.hang !== b.hang) return a.hang - b.hang;
    const ca = a.ten === '' ? 1 : 0;
    const cb = b.ten === '' ? 1 : 0;
    if (ca !== cb) return ca - cb;
    const t = a.ten.localeCompare(b.ten, 'vi');
    if (t !== 0) return t;
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  });

  const ket = toiDa > 0 ? khop.slice(0, toiDa) : khop;
  return { ket, tongKhop: khop.length, tongNguoi, conThua: khop.length - ket.length };
}

/**
 * Một người khớp chuỗi đang gõ ở hạng nào, hay không khớp.
 * `kim` đã bỏ dấu và chuyển chữ thường sẵn ở nơi gọi — bỏ dấu lại lần nữa cho
 * mỗi người là việc thừa, mà gia phả có thể tới hàng nghìn bản ghi.
 */
function doHang(p, kim) {
  const tenPhang = removeDiacritics(fullName(p));
  if (kim === '') return { hang: 1, khop: 'ten' };

  const maPhang = String(p.id).toLowerCase();
  if (maPhang === kim) return { hang: 0, khop: 'ma' };

  if (tenPhang !== '') {
    for (const tieng of tenPhang.split(/\s+/)) {
      if (tieng !== '' && tieng.indexOf(kim) === 0) return { hang: 1, khop: 'ten' };
    }
    if (tenPhang.indexOf(kim) !== -1) return { hang: 2, khop: 'ten' };
  }

  for (const k of getAlternateNames(p)) {
    if (removeDiacritics(k.ten).indexOf(kim) !== -1) {
      return { hang: 3, khop: 'tenKhac', tenKhac: k.ten };
    }
  }

  if (maPhang.indexOf(kim) !== -1) return { hang: 4, khop: 'ma' };
  return null;
}
