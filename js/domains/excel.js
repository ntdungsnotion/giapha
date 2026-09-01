// ============================================================
// giapha · js/domains/excel.js
// Vai trò  : Đọc file Excel "một bảng" (đặc tả DAC-TA-LOI, sheet `DuLieu`
//            kiểu phần mềm gia phả trên nền Excel) thành bản XEM TRƯỚC —
//            CÙNG KHUÔN với `parseGedcom()` để đi chung đường "tạo gia phả
//            mới" đã có (`mergeImported(tree, kq, {che:'moi'})`).
// Lớp      : domains — được gọi bởi: pages · được phép gọi: utils, config
// Phụ thuộc: utils/date · vendor/xlsx.mjs (SheetJS), đọc `.xlsb`/`.xlsx`
// Phiên bản: 0.3.0 · Cập nhật: 01/09/2026 21:10
// ============================================================
//
// ⚠ HÀM `parseExcel` KHÔNG THUẦN TUYỆT ĐỐI như `parseGedcom`: nó nạp một thư
// viện đọc Excel (SheetJS) vì `.xlsb` là định dạng nhị phân nén, trình duyệt
// không tự đọc được như đọc chữ thuần của `.ged`. Đây là chỗ duy nhất trong
// tầng `domains` làm vậy — chủ dự án đã chọn đường này (30/08/2026) thay vì
// bắt xuất trước sang CSV.
//
// Từ 01/09/2026 thư viện ấy nằm **trong repo** (`js/vendor/xlsx.mjs`), không
// còn nạp từ `cdn.sheetjs.com`. Nhờ vậy app, bộ kiểm và Node đều chạy đúng một
// bản, và chức năng nhập không chết theo một máy chủ của người lạ. Xem
// `js/vendor/DOC-VENDOR.md` — ở đó có mã băm, giấy phép và cách nâng cấp.
//
// --- VÌ SAO DỰNG UNION TỪ DÒNG NGƯỜI, KHÔNG TỪ DÒNG "FAM" NHƯ GEDCOM -------
//
// GEDCOM có bản ghi FAM riêng cho từng cặp. Bảng Excel này KHÔNG có — quan hệ
// nằm ở CHÍNH DÒNG NGƯỜI: `ID cha` · `ID mẹ` · `ID phối ngẫu 1/2`. Phải tự
// suy ra từng cặp bằng cách gom các dòng lại. Đã đo trên dữ liệu thật (681
// người, chốt 30/08/2026): 375/375 cặp (cha, mẹ) khớp ĐÚNG với danh sách vợ
// chồng tự khai — không một ca lệch nào — nên phép suy này an toàn, không
// phải đoán mò.
//
// Ba loại union sinh ra:
//   1. CẶP KHAI RÕ — từ `ID phối ngẫu 1/2`, có thể có con hoặc không (20/133
//      cặp không con — hôn nhân không con, vẫn là union thật).
//   2. CẶP CÓ CON, một bên KHÔNG RÕ — dòng con chỉ có `ID cha` (172 ca) hoặc
//      chỉ `ID mẹ` (2 ca). Phần lớn (138/172) vì cha chỉ có một vợ ĐÃ TỪNG
//      qua đời/không lưu riêng; số còn lại (34/172) vì cha có NHIỀU vợ mà
//      dòng con không nói rõ vợ nào — cả hai ca đều xếp vào một "cặp" chỉ có
//      MỘT người, KHÔNG suy đoán người kia là ai. Đây là ứng dụng đúng luật
//      "trường trống thì không vẽ hàng đó": không đủ căn cứ thì để trống,
//      không bịa.
//
// `Số thứ tự hôn nhân` (ghi ở dòng người có thứ bậc khác 1 — thường là vợ)
// khớp thẳng `union.ranks[personId]`; `Số thứ tự con` khớp thẳng
// `children[].order`. Đo trên cặp đông con nhất (9 con): thứ tự ra đúng
// 1..9 liên tục — không cần tự đếm lại.

import { parseLooseDate } from '../utils/date.js';

const TEN_SHEET = 'DuLieu';

const COT = {
  doi: 'Đời', maSoCu: 'Mã số', tenHuy: 'Tên húy', bietDanh: 'Biệt danh',
  gioiTinh: 'Giới tính', ngaySinh: 'Ngày sinh', tinhTrang: 'Tình trạng',
  noiSinh: 'Nơi sinh', ngayMat: 'Ngày mất', ngayGio: 'Ngày giỗ',
  moTai: 'Mộ tại', tieuSu: 'Tiểu sử', thongTinKhac: 'Thông tin khác',
  idMoi: 'ID mới', idCha: 'ID cha', idMe: 'ID me',
  ps1: 'ID phối ngẫu 1', ps2: 'ID phối ngẫu 2',
  soThuTuHonNhan: 'Số thứ tự hôn nhân', soThuTuCon: 'Số thứ tự con',
};

// ============================================================
// Thư viện đọc Excel — nằm trong repo, nạp chậm
// ============================================================

let _xlsxDaNap = null;

async function layThuVienXlsx() {
  // SheetJS Community Edition (Apache-2.0) đọc được `.xlsb`/`.xlsx`/`.xls`/
  // `.csv`… Bản 0.20.3, chép nguyên vào `js/vendor/` ngày 01/09/2026.
  //
  // `import()` ĐỘNG chứ không phải `import` ở đầu file: 1 MB này chỉ tải khi
  // người dùng thật sự bấm nhập Excel, đường khởi động app không đụng tới.
  // Đường dẫn tương đối nên chạy đúng cả trên GitHub Pages lẫn trong Node.
  if (!_xlsxDaNap) _xlsxDaNap = await import('../vendor/xlsx.mjs');
  return _xlsxDaNap;
}

// ============================================================
// Đọc bảng thô
// ============================================================

/**
 * Đọc `arrayBuffer` của file `.xlsb`/`.xlsx` thành bản xem trước.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<object>} cùng khuôn với kết quả `parseGedcom()`.
 */
export async function parseExcel(arrayBuffer) {
  const canhBao = [];
  let XLSX;
  try {
    XLSX = await layThuVienXlsx();
  } catch (e) {
    return ketQuaLoi('Không nạp được thư viện đọc Excel (file ' +
      'js/vendor/xlsx.mjs của chính ứng dụng). Thử tải lại trang. ' +
      (e && e.message ? e.message : String(e)));
  }

  let wb;
  try {
    wb = XLSX.read(arrayBuffer, { type: 'array' });
  } catch (e) {
    return ketQuaLoi('Không đọc được file này — có thể không phải file Excel ' +
      'hợp lệ, hoặc file có mật khẩu MỞ FILE (khác mật khẩu VBA). ' +
      (e && e.message ? e.message : String(e)));
  }

  const sheet = wb.Sheets[TEN_SHEET];
  if (!sheet) {
    return ketQuaLoi('File không có sheet "' + TEN_SHEET + '" — đây có phải ' +
      'đúng file gia phả một bảng không?');
  }

  const hang = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  if (hang.length < 2) return ketQuaLoi('Sheet "' + TEN_SHEET + '" không có dòng dữ liệu nào.');

  const header = hang[0];
  const idx = {};
  for (const [k, ten] of Object.entries(COT)) idx[k] = header.indexOf(ten);
  if (idx.idMoi === -1) {
    return ketQuaLoi('Không tìm thấy cột "ID mới" — đây có phải đúng khuôn ' +
      'file gia phả một bảng không?');
  }

  // --- Lọc dòng THẬT: bỏ hàng nghìn dòng trống của khung mẫu -------------
  const dongThat = hang.slice(1).filter((r) => coGiaTriO(r, idx.idMoi));

  // --- Dựng bản thô cho từng người, khoá theo "ID mới" gốc trong file -----
  const nguoiTho = new Map();
  for (const r of dongThat) {
    const rawId = String(layO(r, idx.idMoi)).trim();
    if (!rawId || nguoiTho.has(rawId)) continue; // trùng ID mới: giữ dòng đầu
    nguoiTho.set(rawId, docDongNguoi(r, idx, rawId));
  }

  // --- Union: suy từ ID cha/mẹ/phối ngẫu -----------------------------------
  const { unionsTho, soCaMoHoMe } = xepUnion(nguoiTho);

  // --- Cấp mã P/U theo thứ tự Đời rồi thứ tự trong file --------------------
  const thuTuNguoi = [...nguoiTho.values()].sort((a, b) => {
    const d = (a.doi || 9999) - (b.doi || 9999);
    return d !== 0 ? d : a.thuTuDong - b.thuTuDong;
  });
  const maNguoi = new Map();
  thuTuNguoi.forEach((p, i) => maNguoi.set(p.rawId, 'P' + String(i + 1).padStart(4, '0')));
  const maUnion = new Map();
  unionsTho.forEach((u, i) => maUnion.set(u.key, 'U' + String(i + 1).padStart(4, '0')));

  const persons = thuTuNguoi.map((p) => dungNguoi(p, maNguoi.get(p.rawId)));
  const unions = unionsTho.map((u) => dungUnion(u, maUnion, maNguoi));

  if (soCaMoHoMe > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: soCaMoHoMe + ' người con có cha nhiều vợ nhưng dòng con không nói ' +
           'rõ là con bà nào — đã xếp riêng, KHÔNG đoán là con của người vợ ' +
           'nào. Xem lại bằng tay sau khi nhập nếu cần.',
    });
  }
  // Chỉ nói khi file THẬT SỰ có mấy cột ấy. File mẫu do app phát ra không có
  // chúng, mà một lời cảnh báo về cột không tồn tại thì người đọc phải đi tìm
  // xem mình đã làm sai gì — mất lòng tin vào cả những cảnh báo thật.
  if (header.some((c) => /^Đời \d+$/.test(String(c).trim()))) {
    canhBao.push({
      muc: 'nhe',
      chu: 'Hai mươi cột "Đời 1..Đời 20" của file (tên dòng trưởng từng nhánh, ' +
           'để hiển thị) KHÔNG được nhập — app tự tính lại quan hệ từ cha/mẹ/' +
           'vợ chồng, không cần bảng ấy.',
    });
  }

  return {
    persons, unions, sources: [],
    tenCay: '', nguonXuat: '', maNguon: 'EXCEL',
    thongKe: {
      soNguoi: persons.length, soCap: unions.length, soNguon: 0,
      soAnhBoQua: 0, soDongHong: 0, soDongBoQua: 0, soAn: 0, soDoiMa: 0,
    },
    theLa: [], doiMa: [], anhBoQua: [], canhBao,
  };
}

function ketQuaLoi(loi) {
  return {
    persons: [], unions: [], sources: [],
    tenCay: '', nguonXuat: '', maNguon: 'EXCEL',
    thongKe: { soNguoi: 0, soCap: 0, soNguon: 0, soAnhBoQua: 0, soDongHong: 0,
               soDongBoQua: 0, soAn: 0, soDoiMa: 0 },
    theLa: [], doiMa: [], anhBoQua: [],
    canhBao: [{ muc: 'nang', chu: loi }],
  };
}

// ============================================================
// Một dòng người
// ============================================================

function layO(r, i) { return i >= 0 && i < r.length ? r[i] : ''; }
function coGiaTriO(r, i) {
  const v = layO(r, i);
  return v !== null && v !== undefined && String(v).trim() !== '';
}
function chu(v) { return v === null || v === undefined ? '' : String(v).trim(); }

/** Ô ngày kiểu " __/__/____" hoặc " __/__" — chỗ trống của khuôn Excel, không phải chữ. */
function laNgayTrong(s) {
  return s === '' || s.indexOf('_') >= 0;
}

const TEN_KHONG_RO = new Set(['không rõ', '..', '...', '.']);

/** Bỏ số thứ tự app tự đánh đứng đầu tên: "1 Nguyễn…", "Bà 2. …", "Bà 1: …". */
function boSoThuTuDauTen(s) {
  let t = s.replace(/^\d+\s+/, '');
  t = t.replace(/^Bà\s*\d+\s*[.:]?\s*/i, '');
  return t.trim();
}

function laTenRong(s) {
  const t = s.trim();
  return t === '' || TEN_KHONG_RO.has(t.toLowerCase()) || /^_+$/.test(t);
}

/** Tách "Nguyễn Phúc Giáo" -> {surname:'Nguyễn', middle:'Phúc', given:'Giáo'}. */
function tachHoTen(s) {
  const manh = s.split(/\s+/).filter(Boolean);
  if (manh.length === 0) return { surname: '', middle: '', given: '' };
  if (manh.length === 1) return { surname: '', middle: '', given: manh[0] };
  return { surname: manh[0], middle: manh.slice(1, -1).join(' '), given: manh[manh.length - 1] };
}

function docNgay(raw) {
  const s = chu(raw);
  if (laNgayTrong(s)) return { iso: '', raw: '', place: '' };
  const d = parseLooseDate(s);
  return { iso: d.iso || '', raw: d.iso ? '' : s, place: '' };
}

function docDongNguoi(r, idx, rawId) {
  const tenHuyGoc = chu(layO(r, idx.tenHuy));
  const tenSauKhiBo = boSoThuTuDauTen(tenHuyGoc);
  const tenRong = laTenRong(tenSauKhiBo);
  const bietDanh = chu(layO(r, idx.bietDanh));

  const names = [];
  names.push(Object.assign(
    { type: 'chinh' },
    tenRong ? { surname: '', middle: '', given: '' } : tachHoTen(tenSauKhiBo),
  ));
  if (bietDanh) names.push(Object.assign({ type: 'thuong_goi' }, tachHoTen(bietDanh)));

  const gioiTinhO = layO(r, idx.gioiTinh);
  const sex = gioiTinhO === true ? 'M' : gioiTinhO === false ? 'F' : 'U';

  const tinhTrangO = layO(r, idx.tinhTrang);
  const living = tinhTrangO === true ? true : tinhTrangO === false ? false : true;

  const maSoCu = chu(layO(r, idx.maSoCu));
  const ngayGio = chu(layO(r, idx.ngayGio));
  const ghiChu = [];
  if (maSoCu) ghiChu.push('Mã số cũ: ' + maSoCu);
  if (tenSauKhiBo !== tenHuyGoc.trim() || tenRong) {
    ghiChu.push('Tên húy trong Excel: ' + (tenHuyGoc || '(trống)'));
  }
  const tieuSu = chu(layO(r, idx.tieuSu));
  const thongTinKhac = chu(layO(r, idx.thongTinKhac));
  if (tieuSu) ghiChu.push(tieuSu);
  if (thongTinKhac) ghiChu.push(thongTinKhac);

  const doiRaw = layO(r, idx.doi);
  const doi = Number.isFinite(Number(doiRaw)) && Number(doiRaw) > 0 ? Math.round(Number(doiRaw)) : 0;

  const vn = {};
  if (doi > 0) vn.generation = doi;
  if (ngayGio && !laNgayTrong(ngayGio)) vn.gio = ngayGio;

  const soThuTuHonNhanRaw = layO(r, idx.soThuTuHonNhan);
  const soThuTuConRaw = layO(r, idx.soThuTuCon);

  return {
    rawId, doi,
    names,
    sex,
    living,
    birth: docNgay(layO(r, idx.ngaySinh)),
    death: docNgay(layO(r, idx.ngayMat)),
    burialPlace: chu(layO(r, idx.moTai)),
    note: ghiChu.join('\n'),
    vn: Object.keys(vn).length > 0 ? vn : undefined,
    birthPlace: chu(layO(r, idx.noiSinh)),
    idCha: chu(layO(r, idx.idCha)),
    idMe: chu(layO(r, idx.idMe)),
    ps1: chu(layO(r, idx.ps1)),
    ps2: chu(layO(r, idx.ps2)),
    soThuTuHonNhan: Number.isFinite(Number(soThuTuHonNhanRaw)) ? Number(soThuTuHonNhanRaw) : 0,
    soThuTuCon: Number.isFinite(Number(soThuTuConRaw)) ? Number(soThuTuConRaw) : null,
  };
}

// ============================================================
// Union — suy từ dòng người, xem ghi chú đầu file
// ============================================================

function xepUnion(nguoiTho) {
  const pairKey = (a, b) => [a, b].sort().join('|');
  const unionMap = new Map();
  const layHoacTao = (key, partners) => {
    let u = unionMap.get(key);
    if (!u) { u = { key, partners: partners.slice(), children: [] }; unionMap.set(key, u); }
    return u;
  };

  // 1. Cặp vợ chồng khai rõ ở ID phối ngẫu 1/2.
  for (const p of nguoiTho.values()) {
    for (const sp of [p.ps1, p.ps2]) {
      if (!sp || !nguoiTho.has(sp) || sp === p.rawId) continue;
      const key = pairKey(p.rawId, sp);
      if (unionMap.has(key)) continue;
      const pb = nguoiTho.get(sp);
      const partners = (pb.sex === 'M' && p.sex !== 'M') ? [sp, p.rawId] : [p.rawId, sp];
      layHoacTao(key, partners);
    }
  }

  // 2. Gán con — đủ cả hai, hoặc chỉ một bên (không đoán bên kia).
  let soCaMoHoMe = 0;
  for (const p of nguoiTho.values()) {
    const coCha = p.idCha && nguoiTho.has(p.idCha);
    const coMe = p.idMe && nguoiTho.has(p.idMe);
    if (coCha && coMe) {
      const u = layHoacTao(pairKey(p.idCha, p.idMe), [p.idCha, p.idMe]);
      u.children.push(p);
    } else if (coCha) {
      const u = layHoacTao('CHA:' + p.idCha, [p.idCha]);
      u.children.push(p);
      // Cha có ≥2 vợ mà dòng con không nói rõ vợ nào — ca mơ hồ thật sự, khác
      // ca cha chỉ có một vợ (0 vợ ghi nhận trong file cũng tính là "không mơ
      // hồ": không có gì để chọn nhầm).
      const soVo = [...unionMap.values()]
        .filter((u2) => u2.partners.length === 2 && u2.partners.indexOf(p.idCha) >= 0).length;
      if (soVo >= 2) soCaMoHoMe++;
    } else if (coMe) {
      const u = layHoacTao('ME:' + p.idMe, [p.idMe]);
      u.children.push(p);
    }
  }

  // 3. Trong mỗi union: sắp con theo "Số thứ tự con", đánh số lại liền mạch.
  for (const u of unionMap.values()) {
    u.children.sort((a, b) => {
      const oa = a.soThuTuCon === null ? Infinity : a.soThuTuCon;
      const ob = b.soThuTuCon === null ? Infinity : b.soThuTuCon;
      return oa - ob;
    });
  }

  // 4. Thứ bậc — "Số thứ tự hôn nhân" ghi ở dòng NGƯỜI có thứ bậc khác 1
  //    (thường là vợ), khớp thẳng `union.ranks[personId]`. Vắng khoá nghĩa
  //    là 1, nên chỉ ghi khi số ấy thật sự > 1 — đúng quy ước b46.
  for (const u of unionMap.values()) {
    if (u.partners.length !== 2) continue;
    const ranks = {};
    for (const rawId of u.partners) {
      const p = nguoiTho.get(rawId);
      if (p && p.soThuTuHonNhan > 1) ranks[rawId] = p.soThuTuHonNhan;
    }
    if (Object.keys(ranks).length > 0) u.ranks = ranks;
  }

  return { unionsTho: [...unionMap.values()], soCaMoHoMe };
}

function dungUnion(u, maUnion, maNguoi) {
  const partners = u.partners.map((rawId) => maNguoi.get(rawId));
  const children = u.children.map((p, i) => ({
    personId: maNguoi.get(p.rawId), relation: 'birth', order: i + 1,
  }));
  const ranks = {};
  if (u.ranks) {
    for (const rawId of Object.keys(u.ranks)) ranks[maNguoi.get(rawId)] = u.ranks[rawId];
  }
  const out = {
    id: '', uid: '', xrefGoc: '',
    partners, partnerOrder: partners.slice(),
    status: 'married',
    marriage: { iso: '', raw: '', place: '' },
    children, note: '', deleted: false,
  };
  if (Object.keys(ranks).length > 0) out.ranks = ranks;
  out.id = maUnion.get(u.key);
  return out;
}

function dungNguoi(p, id) {
  return {
    id, uid: '', xrefGoc: '',
    names: p.names,
    sex: p.sex,
    birth: Object.assign({}, p.birth, { place: p.birthPlace || p.birth.place }),
    death: p.death,
    burialPlace: p.burialPlace,
    title: '', occupation: '', education: '', religion: '', residence: '',
    nationality: '',
    living: p.living,
    photoFileId: '',
    note: p.note,
    deleted: false,
    meta: { createdAt: '', updatedAt: '', updatedBy: '' },
    vn: p.vn,
  };
}
