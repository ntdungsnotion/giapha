# js/vendor — thư viện của người khác, chép nguyên vào repo

*Cập nhật: 01/09/2026 15:20*

Thư mục này **không phải mã của dự án**. Mọi file trong đây chép nguyên xi từ
nơi phát hành chính chủ, **không sửa một dấu chấm**. Vì thế chúng không mang
khối ghi chú sáu dòng của `CLAUDE.md` mục 6, và không nằm trong bậc thang phân
lớp `config → utils → services → domains → pages`.

Luật của thư mục này, đúng ba dòng:

1. **Không sửa file trong đây.** Cần đổi hành vi thì bọc thêm một lớp ở
   `domains/` hoặc `utils/`, đừng vá vào thư viện. Sửa vào là mất đường đối
   chiếu với bản gốc, và với giấy phép Apache-2.0 thì còn phải khai ra là đã
   sửa.
2. **Ghim cố định một phiên bản**, ghi rõ ở bảng dưới kèm mã băm MD5. Muốn
   nâng cấp thì tải bản mới, thay file, cập nhật bảng, chạy lại bộ kiểm —
   không có bước nào tự động.
3. **Không thêm thư viện mới vào đây nếu chưa hỏi chủ dự án** (`CLAUDE.md`
   mục 9), và chỉ thêm thứ có giấy phép cho phép chép lại (`MIT`, `Apache-2.0`,
   `BSD`, `ISC`…). Repo này để **Public**, nên mỗi file trong đây là một bản
   phát hành lại ra công chúng.

---

## Đang có gì

| File | Thư viện | Bản | Giấy phép | Lấy về |
|---|---|---|---|---|
| `xlsx.mjs` | SheetJS Community Edition | `0.20.3` | Apache-2.0 (`LICENSE-SheetJS.txt`) | 01/09/2026, từ `https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs` |

`xlsx.mjs` — MD5 `10c762efb03b37765bec8aa19538e04c`, 1.008.308 byte.
Trùng khớp bit-với-bit bản đã dùng cho bộ kiểm từ 31/08/2026.

---

## Vì sao chép vào repo thay vì nạp từ CDN

Trước 01/09/2026, `domains/excel.js` nạp thư viện này bằng
`import('https://cdn.sheetjs.com/...')` ngay lúc người dùng bấm nhập Excel.
Bốn lý do đổi:

1. **Nhập Excel là việc làm một lần cho cả dòng họ, mà lại phụ thuộc một máy
   chủ của người lạ.** Ngày `cdn.sheetjs.com` đổi đường dẫn, hết hạn tên miền,
   hay chặn dải IP Việt Nam, chức năng nhập chết — và chết đúng lúc đang cần.
2. **Không kiểm được thứ nhận về.** `import()` từ CDN nhận về bất cứ gì máy chủ
   ấy trả, không có mã băm đối chiếu. Bản trong repo thì mã băm ghi ngay đây.
3. **Bộ kiểm và app đang chạy hai bản khác nhau.** Trước đây bài kiểm nạp bản
   cục bộ ở `kiem-thu/lib/`, app nạp bản CDN — hai đường, không ai bảo đảm
   chúng còn giống nhau. Nay chung một file duy nhất.
4. **Giấy phép cho phép.** Apache-2.0 cho chép lại nguyên bản, kể cả trong repo
   Public, miễn là giữ nguyên văn bản giấy phép và dòng bản quyền — đã giữ ở
   `LICENSE-SheetJS.txt`, và trong chính đầu file `xlsx.mjs`
   (`/*! xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */`).
   Gói phát hành của SheetJS **không có file `NOTICE`**, nên không có gì thêm
   phải kèm.

Cái giá phải trả: repo nặng thêm 1 MB. **Đã đo trên GitHub Pages thật ngay sau
lần đẩy đầu tiên (01/09/2026)**, không phải phỏng đoán:

```
Content-Type   : text/javascript; charset=utf-8   ← trình duyệt import() được
Content-Length : 1.008.308 byte
Tải thật (gzip):   257.031 byte                   ← Pages tự nén, ~1/4
```

Kiểu MIME của đuôi `.mjs` là chỗ đáng ngờ nhất của cả lần đổi này — máy chủ nào
trả `text/plain` là trình duyệt từ chối nạp module, và **hỏng ấy chỉ hiện ra
trên Pages chứ không hiện khi chạy bằng Node**. Nên có một bài kiểm riêng cho
nó: `kiem-thu/kiem-vendor-xlsx.mjs` chạy Chrome thật, nạp thư viện qua HTTP rồi
đọc trọn một file Excel bé xíu.

Và file chỉ được tải khi người dùng thật sự bấm nhập Excel (`import()` động,
không nằm trong đường khởi động app).

## Vì sao là bản `xlsx.mjs` 1 MB, không phải bản nén 279 KB

SheetJS phát hành nhiều bản dựng. Bản nhẹ nhất đọc được `.xlsb` là
`dist/xlsx.mini.min.js` (279 KB) — **nhưng nó là script kiểu cũ**, gán biến
toàn cục `XLSX`, phải nạp bằng thẻ `<script>`. Dự án này chạy ES Modules gốc và
`domains/excel.js` nạp thư viện bằng `import()` động, nên bắt buộc dùng bản
`xlsx.mjs`. SheetJS **không phát hành bản ESM đã nén**, và dự án **không có
bước build** để tự nén — nên 1 MB là con số nhỏ nhất có thể, không phải lựa
chọn cẩu thả.

## Cách nâng cấp khi cần

1. Mở `https://cdn.sheetjs.com/`, tìm số bản mới nhất, ví dụ `0.20.4`.
2. Tải hai file: `.../xlsx-0.20.4/package/xlsx.mjs` và
   `.../xlsx-0.20.4/package/LICENSE`.
3. Đè lên `xlsx.mjs` và `LICENSE-SheetJS.txt` trong thư mục này.
4. Sửa bảng "Đang có gì" ở trên: số bản, mã băm MD5, ngày lấy về.
5. Chạy `cd kiem-thu && node kiem-nhap-excel.mjs` — phải ĐẠT trọn như trước.
   Không đạt thì trả lại bản cũ, đừng cố sửa mã dự án cho vừa bản mới.

⚠ **Đừng lấy `xlsx` từ npm hay jsdelivr.** Bản npm công khai mới nhất chỉ tới
`0.18.5` và mang lỗi prototype-pollution đã biết (CVE-2023-30533) khi đọc file
cố ý làm hỏng. Chỉ lấy từ `cdn.sheetjs.com` — máy chủ chính chủ.
