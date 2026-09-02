// ============================================================
// giapha · js/config.js
// Vai trò  : Hằng số hiển thị phía trình duyệt.
// Lớp      : config — không gọi file nào khác
// Phụ thuộc: (không)
// Phiên bản: 0.20.0 · Cập nhật: 02/09/2026 (bước 84 — vGap 34→38, mỗi cuộc hôn nhân một mức thanh ngang)
// ============================================================
//
// LƯU Ý: từ khi chuyển sang kiến trúc Apps Script, file này KHÔNG còn
// là nơi bạn điền cấu hình. Mọi thứ cần điền nằm ở gas/Config.gs.
// File này chỉ chứa hằng số hiển thị, thường không cần sửa.

export const APP_NAME     = 'Gia phả';
export const DATA_VERSION = 1;

export const PHOTO = {
  // --- HAI BẢN CHO MỖI TẤM ẢNH (01/09/2026) ------------------------------
  //
  // Chủ dự án chỉ ra điều này sau khi in thử: một tấm ảnh không phục vụ nổi
  // cả hai việc. Màn hình cần ảnh NHỎ (tải nhanh trên 4G, và nhất là ít RAM —
  // RAM tốn theo ảnh ĐÃ GIẢI MÃ, một tấm 1600px ngốn 10MB còn tấm 400px chỉ
  // 640KB, gấp mười sáu lần). Bản in thì cần ảnh LỚN.
  //
  // ⚠ **Vì sao lưu HAI FILE chứ không lưu một file to rồi nhờ kho cắt nhỏ.**
  // Drive có cắt ảnh theo `sz=w…`, và app đang dựa vào việc ấy ở NĂM chỗ. Nhưng
  // dự án sẽ chuyển sang Supabase, nơi dịch vụ cắt ảnh nằm ở gói TRẢ PHÍ. Mất
  // dịch vụ ấy thì lối "một file to" rơi về "tải nguyên ảnh to ở mọi chỗ" —
  // đúng thảm hoạ 4G và RAM ở trên. Hai file thì chạy được trên bất cứ kho nào,
  // kể cả kho không biết cắt ảnh: mỗi chỗ trỏ thẳng vào bản nó cần.
  //
  // Hai con số dưới đây tính ngược từ chỗ dùng, không phải chọn cho tròn:
  //
  //   nhỏ 400px — chỗ hiện to nhất trên màn hình là 240px (thẻ người), và
  //     vòng thông tin 76px trên màn hình 3× cần 228px. 400 phủ hết còn dư.
  //     (Bản 200px cũ thực ra ĐANG THIẾU cho màn hình 3×.)
  //   lớn 1600px — vòng ảnh 74 đơn vị (bước 81; 52 trước bước 80), ở chữ cao
  //     7mm là 67mm trên giấy: 300 DPI cần 795px, 600 DPI cần 1590px. 1600 vẫn
  //     phủ hết — nhưng **chỉ còn dư 10px**, không còn chỗ cho một nấc nữa.
  //     ⚠ Con số 1600 này TÍNH TỪ `banKinhTrenO`. Nâng bán kính thêm một nấc
  //     nữa thì phải tính lại chỗ này, đừng để nó ngồi yên vì "vẫn chạy được".
  maxWidth:    400,   // nén BẢN NHỎ xuống chiều rộng này trước khi gửi lên
  jpegQuality: 0.82,
  maxWidthLon:    1600,   // bản LỚN, chỉ để in và để xem ảnh to
  jpegQualityLon: 0.85,
  thumbSize:   200,

  // Bán kính vòng ảnh trên ô sơ đồ.
  //
  // ⚠ **20 → 26 ở bước 28b** — chủ dự án: *"hình đại diện to hơn, chữ nhỏ
  // hơn"*, học theo cách Quick Family Tree trình bày. Vòng ảnh lúc ấy 52px trên
  // một ô rộng 120px, to hơn 30%, mà ô lại NGẮN ĐI: bảng tên đè lên đáy vòng.
  //
  // Đã thử 28 (56px) trước. Hỏng: để giữ chiều cao ô thì bảng tên phải đè sâu
  // 14px, và lúc ấy vòng ảnh đọc ra thành hình vòng cung — xem `BONG` trong
  // `utils/image.js`.
  //
  // ⚠ Vẽ 74px nhưng XIN Drive bản 200px (`thumbSize` ở trên): màn hình điện
  // thoại có tỷ lệ pixel gấp 2–3, xin đúng 68 thì ảnh rỗ.
  //
  // ⚠ Bước 80–81 làm con số ấy hụt 10%: màn hình 3× cần 74 × 3 = 222px. Giữ
  // 200 — hụt 10% trên một khuôn mặt 74px thì mắt không thấy, mà nâng
  // `thumbSize` là nâng RAM cho MỌI ô của một sơ đồ 681 người. Nâng bán kính
  // thêm một nấc nữa thì PHẢI tính lại chỗ này, đừng để nó ngồi yên.
  //
  // ⚠ **26 → 34 ở bước 80 (01/09/2026, việc D).** Chủ dự án dựng một bản
  // Photoshop (`tai-lieu/anh/chinh sua ve so do.jpg`, trái = app thật, phải =
  // bản sửa) và bảo *"ảnh đại diện quá nhỏ so với khung ô"*. Con số 34 **đo ra
  // từ chính bức ảnh ấy**, không phải chọn cho tròn — `kiem-thu/do-khung-anh.mjs`
  // đo khung bao từng vòng ảnh:
  //
  //     vòng ảnh KHÔNG sửa (Khang, Dũng)      76–78 px ảnh
  //     vòng ảnh ĐÃ sửa   (Hương Lan, Khôi)   101 px ảnh   → to hơn 1,30 lần
  //
  // Vòng ảnh vẽ ra rộng `2R + 1,8` (nét vành 1,8). 53,8 × 1,30 = 69,7, trừ nét
  // vành còn `R = 34`.
  //
  // ⚠ **34 → 37 ngay trong ngày, sau khi chủ dự án XEM APP THẬT.** 34 là con số
  // ĐO ra từ bức ảnh; lời chủ dự án — *"nới bán kính thêm khoảng 1/2 khoảng
  // cách từ viền ảnh tới tâm nốt cụt số 2"* — cho 26 + 11 = **37**. Đưa cả hai
  // ra, chủ dự án nhìn app thật rồi chốt **37**.
  //
  // ⚠ Bài học nhỏ mà đắt: **bức ảnh chỉnh tay là ƯỚC LƯỢNG, không phải bản vẽ
  // kỹ thuật.** Đo nó thì được một con số chính xác **về bức ảnh**, mà bức ảnh
  // ấy chỉ nói *"to cỡ này"*. Con số đo được là chỗ để BẮT ĐẦU, không phải chỗ
  // để kết thúc — thứ kết thúc là mắt người nhìn app thật.
  //
  // ⚠ **Vòng ảnh chỉ NỞ XUỐNG.** `leTrenO` = 0 nên đỉnh vòng ảnh luôn dính mép
  // trên ô; tăng R là đẩy ĐÁY vòng ảnh xuống 16px, kéo theo bảng tên và hai
  // hàng chữ dưới nó. Vì thế `nodeHeight` phải tăng theo — xem `LAYOUT`.
  //
  // ⚠ Ba chỗ khác đọc lại con số này, đừng đổi một mình nó:
  //     layout.js  MUC_NET = leTrenO + banKinhTrenO   (mức nét vợ chồng)
  //     layout.js  LE_ANH  = nodeWidth/2 − banKinhTrenO
  //     render.js  dinhBang = 2 × R − VE.deLenAnh     (đỉnh bảng tên)
  banKinhTrenO: 37,

  // Cách từ mép trên ô xuống đỉnh vòng ảnh.
  //
  // ⚠ **BẰNG 0, và đó là một quyết định chứ không phải bỏ sót.** Ô sơ đồ nay
  // không có viền (bước 28), nên "mép trên ô" chỉ còn là một toạ độ, không
  // phải một đường kẻ ai nhìn thấy. Để nó bằng 0 thì **đỉnh vòng ảnh CHÍNH LÀ
  // mép trên ô**, và mọi nét đi từ trên xuống — nét treo con, nốt cụt mọc lên —
  // chạm đúng vào vòng ảnh, không dừng lơ lửng cách nó mấy pixel.
  //
  // Để 6 thì mỗi nét ấy hụt đúng 6px. Sáu pixel không ai gọi tên được, nhưng
  // nhìn vào thì thấy sơ đồ "rời rạc" mà không chỉ ra được vì sao.
  leTrenO:       0,
};

// Kích thước sơ đồ (pixel)
//
// nodeHeight là chiều cao CỐ ĐỊNH của mọi ô, dù người đó có một dòng hay hai,
// và dù người đó CÓ ẢNH HAY KHÔNG. Để ô co lại theo nội dung thì các ô cùng
// một đời sẽ so le, sơ đồ nhìn gãy.
//
// ⚠ **64 → 104 → 88 trong cùng một ngày (20/08/2026, bước 28).** Ba con số ấy
// kể lại đúng ba lần chủ dự án nhìn app thật:
//
//   64   trước khi có ảnh
//   104  chừa chỗ cho vòng ảnh 40px xếp TRÊN chữ  → *"khoảng cách quá lớn"*
//   88   vòng ảnh to lên 52px, nhưng BẢNG TÊN ĐÈ LÊN đáy nó, học theo QFT
//
// Nghe ngược đời: ảnh to thêm 30% mà ô lại ngắn đi 16px. Chỗ tiết kiệm nằm ở
// **phần chồng lên nhau** — bảng tên chồm lên vòng ảnh 8px — và ở chữ nhỏ đi
// một nấc, nhờ đó ít tên phải xuống hai dòng hơn.
//
// Đọc CÙNG `vGap` bên dưới, đừng đọc riêng: bước hàng = nodeHeight + vGap.
// Đo thật trên 59 sơ đồ bằng `kiem-thu/do-o-co-anh.mjs`.
export const LAYOUT = {
  nodeWidth:  120,

  // ⚠ Chiều cao khi KHÔNG hiện hàng ngày giỗ.
  //
  // ⚠ **88 → 92 (bước 80) → 98 (bước 81)**, và con số ấy **tính ra chứ không
  // đoán**. Nó bám chặt `PHOTO.banKinhTrenO`, đổi bán kính là phải tính lại.
  // Từ nóc ô
  // xuống, mọi thứ nối đuôi nhau — đổi `banKinhTrenO` là cả chuỗi trôi theo:
  //
  //     đáy vòng ảnh          2 × 37            = 74
  //     đỉnh bảng tên         74 − deLenAnh 8   = 66
  //     đáy bảng tên MỘT DÒNG 66 + (3×2 + 11)   = 83
  //     chân chữ hàng năm     83 + buocDongPhu  = 94
  //     mép dưới chữ hàng năm 94 + 9,5 × 0,25   ≈ 96,4   ← chỗ thấp nhất
  //
  // 98 chừa 1,6px. Đo tỷ lệ chân chữ 0,25 bằng `kiem-thu/do-cao-chu.mjs`, không
  // chép từ sách.
  //
  // ⚠ **Con số này nay tính cho ô tên MỘT DÒNG, không còn cho ô hai dòng.** Đó
  // là đổi quan trọng nhất của bước 80 và là gốc rễ của *việc B*: trước bước
  // này 88 chừa chỗ sẵn cho tên hai dòng, nên **mọi ô một dòng đều thừa 11px
  // trống ở đáy** — cộng với `vGap/2` = 17 thành khoảng 30px trắng giữa hàng
  // chữ cuối và đường kẻ ngang. Chủ dự án khoanh đỏ đúng chỗ ấy
  // (`tai-lieu/anh/duong ke ngang can van linh - nguyen quang hung.png`).
  //
  // Bỏ được phần chừa ấy vì `render.js` từ bước 80 **gần như không còn ngắt
  // tên xuống hai dòng**: đo trên 557 tên thật của cây Nguyễn Phúc
  // (`kiem-thu/do-ten-dai.mjs`), sau khi nới bảng tên và nén chữ thì **0/557**
  // tên phải xuống hai dòng. Ca hai dòng vẫn còn, nhưng nay là ngoại lệ thật
  // sự — và ô ấy chấp nhận chữ tràn xuống khe, không bắt 680 ô kia trả giá.
  nodeHeight:  98,

  // Chiều cao khi công tắc "Ngày giỗ" đang BẬT: thêm đúng một hàng chữ.
  //
  // ⚠ Cao thêm cho MỌI ô, kể cả người không có ngày giỗ và người còn sống. Đó
  // là cái giá của luật *"ô cao bằng nhau"* ngay ở đầu khối này. Ai thấy phí
  // thì tắt công tắc đi — nó mặc định TẮT.
  //
  // ⚠ `layout.js` đọc lại hai con số này ở MỖI lần `computeLayout()`, không
  // chụp một lần lúc nạp như trước bước 28. Xem ghi chú `CAO` ở đó.
  //
  // ⚠ **99 → 103 (bước 80) → 109 (bước 81).** Luôn đúng bằng
  // `nodeHeight + buocDongPhu` — thêm một hàng chữ, không hơn. Lệch hai con số
  // này là hàng giỗ hoặc thò khỏi ô, hoặc để lại một khoảng trống không ai
  // giải thích được.
  nodeHeightNgayGio: 109,

  hGap:        28,   // cách ngang giữa 2 người

  // Cách dọc giữa 2 đời — cũng chính là ĐỘ DÀI ĐOẠN KẺ DỌC nối hai đời.
  //
  // ⚠ **90 → 48 → 34 trong cùng ngày 20/08/2026**, cả hai lần đều do chủ dự án
  // nhìn app thật rồi chỉ ra: lần đầu *"khoảng cách giữa các hàng quá lớn,
  // lãng phí không gian, nhất là điện thoại"*, lần sau *"có thể giảm 30% nữa ở
  // chỗ giảm độ dài gạch nối theo chiều dọc"*.
  //
  // Đọc CÙNG `nodeHeight`, đừng đọc riêng: thứ mắt nhìn thấy là **bước hàng**.
  //
  //     trước bước 28   64 + 90 = 154
  //     giữa bước 28   104 + 90 = 194   ← chỗ chủ dự án kêu lần đầu
  //     nay             88 + 34 = 122   ← ngắn hơn 21% so với thời chưa có ảnh
  //
  // Tức là mỗi ô mang thêm một khuôn mặt 52px và một dòng tuổi, mà sơ đồ vẫn
  // ngắn hơn hẳn. Chỗ 90px kia sinh ra khi ô mới cao 64 và CÓ VIỀN; bỏ viền
  // rồi thì phần trống giữa hai hàng vốn đã rộng ra, cộng thêm 90 nữa là thừa
  // hai lần.
  //
  // ⚠ **Sàn của con số này là `stubLength + stubRadius`** — nốt cụt mọc thẳng
  // xuống phải nằm gọn trong khe giữa hai đời, không thì nốt tròn rơi vào ô
  // người ở đời dưới. Nay 14 + 6 = 20 < 34, còn chừa 14px. Hạ `vGap` nữa thì
  // PHẢI hạ `stubLength` trước, đừng hạ một mình.
  //
  // ⚠ **Và còn một ràng buộc thứ hai, thêm ở bước 82:** `stubLength` KHÔNG
  // được bằng `vGap − khoangSatChu`, nếu không mọi nốt cụt hướng lên rơi đúng
  // trên thanh ngang gom con của đời trên. Xem ghi chú `stubLength`.
  //
  // ⚠ **34 → 38 ở bước 84, và đây là lần ĐẦU con số này ĐI LÊN.** Chủ dự án
  // duyệt hai lần, và con số CUỐI là lần thứ hai:
  //
  //   lượt 1  *"tôi chấp nhận sơ đồ cao thêm 7–8pt"*  → thử 42
  //   lượt 2  **xem app thật**: *"thấy giãn nhiều quá, đổi thành thêm 4px"* → 38
  //
  // ⚠ Ghi cả hai lượt vì lượt 1 là con số TÍNH RA (nhỏ nhất chừa đủ chỗ mà
  // không xê dịch gì đang có), lượt 2 là con số MẮT CHỌN — và mắt thắng. Bộ số
  // tính ra vẫn còn giá trị: nó nói cái giá của 38 là gì (xem `buocThanhNgang`).
  //
  // Lỗi được đo: người có HAI union cùng có con thì hai thanh ngang gom con
  // nằm ĐÚNG một mức và trùm lên nhau — **770 cặp** trên cây Nguyễn Phúc 681
  // người, chỗ trùm dài nhất **608px**. Hai chùm con của hai bà đọc ra thành
  // một, tức mất đúng thông tin mẹ mà QUY-TAC-VE §5 sinh ra để giữ.
  //
  // Sửa được thì phải có CHỖ cho thanh ngang thứ hai, mà khe 34px đã kín:
  //
  //     mép dưới hàng chữ      CAO −  1,6
  //     nét vợ chồng võng      CAO +  5     (khoangNetVong)
  //     thanh ngang gom con    CAO + 12     (khoangSatChu)
  //     tâm nốt cụt hướng lên  CAO + 20     (vGap − stubLength)
  //     nóc ô hàng dưới        CAO + 34
  //
  // 38 chừa 4px cho một mức thứ hai:
  //
  //     thanh ngang, mức 0     CAO + 12     ← không đổi
  //     thanh ngang, mức 1     CAO + 16     (khoangSatChu + buocThanhNgang)
  //     mép trên nốt hướng lên CAO + 18     ← vẫn cách thanh ngang 2px
  //     tâm nốt cụt hướng lên  CAO + 24
  //     nóc ô hàng dưới        CAO + 38
  //
  // Cái giá: **bước hàng 98 + 38 = 136px**, cao hơn 4px mỗi đời. Cây 17 đời
  // cao thêm 64px — vẫn ngắn hơn thời chưa có ảnh (154px một bước hàng).
  vGap:        38,
  spouseGap:   16,

  // --- KHOẢNG SÁT CHỮ — một con số cho MỌI đường kẻ ngang dưới ô ----------
  //
  // *Thêm ở bước 80 (01/09/2026), gộp lại BỐN công thức khác nhau.*
  //
  // Trước bước này, bốn đường kẻ ngang cùng mang một ý nghĩa — *"cách mép dưới
  // ô một khoảng"* — mà dùng bốn hệ số khác nhau, sinh ra từ bốn lần sửa riêng
  // lẻ ở bốn thời điểm:
  //
  //     thanh ngang gom con, thường     CAO + vGap/2       = CAO + 17
  //     thanh ngang gom con, né (netDai) trừ đi vGap/4      = −8,5
  //     nét vợ chồng RỜI NHAU, võng     CAO + vGap × 0,3   = CAO + 10,2
  //     trần của nốt cụt dọc            CAO + vGap − r − 2 = CAO + 26
  //
  // Hai dòng đầu và dòng ba đều là *"kẻ ngang sát dưới ô"*, nên nay cùng đọc
  // `khoangSatChu`. Dòng bốn KHÔNG — nó là một cái TRẦN, không phải khoảng
  // cách sát chữ; giữ nguyên công thức, xem `viTriNotCut()`.
  //
  // ⚠ **Nét võng và thanh ngang gom con nay TRÙNG mức nhau, và đó là chủ ý.**
  // Ảnh `tai-lieu/anh/loi ke ngang trong dung - huong lan khi chon con lam
  // trung tam.jpg` bắt được đúng lỗi ấy: đo bằng `do-khung-anh.mjs` thì bản
  // app thật có **HAI đường kẻ ngang song song cách nhau 9px** (10,2 và 17 —
  // chênh đúng `vGap × 0,2`), còn bản Photoshop của chủ dự án chỉ có MỘT. Cho
  // hai công thức đọc chung một hằng số là hai đường nhập làm một.
  //
  // 12 chọn thế nào: mép dưới chữ ở 96,4 mà ô cao 98, nên khoảng trắng mắt
  // nhìn thấy là 1,6 + 12 ≈ 14px, thay cho 13,6 + 17 ≈ 31px trước đây.
  // ✓ Chủ dự án đã bật *Ngày giỗ* xem app thật và nghiệm thu 14px: **ĐẠT**.
  khoangSatChu: 12,

  // --- MỘT NGƯỜI NHIỀU BẠN ĐỜI: MỖI CUỘC HÔN NHÂN MỘT MỨC (bước 84) -------
  //
  // Thanh ngang gom con của cuộc hôn nhân thứ k tụt xuống thêm bấy nhiêu
  // pixel, để hai chùm con của hai bà không đọc ra thành một.
  //
  // ⚠ **Đây KHÔNG phải khoảng né cho đẹp, nó là thông tin.** QUY-TAC-VE §5:
  // *"n union thì n chùm con, không gộp — gộp là mất thông tin mẹ."* Hai
  // thanh ngang cùng một mức mà trùm lên nhau thì luật ấy bị phá ngay trên
  // hình, dù dữ liệu vẫn đúng.
  //
  // 4 chọn thế nào: nó là toàn bộ chỗ trống `vGap` mới cấp thêm (38 − 34), và
  // vừa khít cho HAI mức — đúng số bạn đời nhiều nhất có con trong cả ba cây
  // dữ liệu (đo `kiem-thu/kiem-buoc-80.mjs` nhóm 10; không ai có ba).
  //
  // ⚠ **4px là mức TỐI THIỂU đọc ra được, và nó nằm sát ranh giới "bóng đôi"**
  // — hai đường song song cách nhau 4px, đúng thứ chủ dự án đã bác ở b80 khi
  // nét vợ chồng chạy song song thanh ngang gom con. Ở đây chấp nhận được vì
  // hai thanh chỉ **chạy song song trên phần trùm nhau**, còn hai đầu thì rẽ đi
  // hai chùm con khác nhau, nên mắt vẫn tách được. Chủ dự án đã xem app thật
  // với `vGap` 42 (bước 8px) và bảo *"giãn nhiều quá"* — 38 là lựa chọn của
  // mắt, không phải của phép cộng. Muốn 6px hay 8px thì phải nới `vGap` lên 40
  // hoặc 42, không có đường nào khác: trần bị nốt cụt hướng lên chặn.
  //
  // ⚠ Người có BA union cùng có con thì bước tự co lại (xem `dungMucThanhNgang`
  // trong `layout.js`) — ba mức nhét vào 8px là ba đường cách nhau 4px, đúng
  // thứ chủ dự án gọi *"bóng đôi"* và đã bác ở b80. Ca ấy **chưa từng xảy ra**
  // trên dữ liệu thật; ngày nào xảy ra thì phải nới `vGap` thêm một nấc nữa
  // chứ đừng để nó tự co.
  buocThanhNgang: 4,

  // MỨC NÉT VỢ CHỒNG VÕNG — chỉ dùng cho cặp cùng hàng mà giữa hai người CÓ Ô
  // NGƯỜI KHÁC CHẮN NGANG (hôn nhân đồng huyết, hai nhánh xa nhau).
  //
  // *Thêm ở bước 81, sau khi chủ dự án xem app thật:* *"đường nối hôn nhân
  // đồng huyết cần dịch lên trên 1 chút để không đè đường ngang của con cái và
  // cũng không đè hàng chữ ở trên."*
  //
  // ⚠ **Bước 80 cho nét này đọc chung `khoangSatChu` và ĐÓ LÀ SAI.** Gộp thì
  // nó nằm ĐÚNG trên thanh ngang gom con, tức lại thành một đường kẻ hai
  // nghĩa. Nó phải có mức RIÊNG, và mức ấy bị kẹp giữa hai thứ:
  //
  //     mép dưới hàng chữ   ≈ CAO − 1,6   (96,4 khi CAO = 98)
  //     NÉT VÕNG            = CAO + 5     ← ở đây
  //     thanh ngang gom con = CAO + 12
  //
  // Cách chữ 6,6px, cách thanh ngang 7px. Khe chỉ có 13,6px nên đây gần như là
  // chỗ duy nhất đặt được — hạ `khoangSatChu` nữa thì phải hạ cả con số này.
  khoangNetVong: 5,

  // Nét của bộ cha mẹ THỨ HAI chạy cao hơn nét của bộ đặt chỗ bấy nhiêu pixel.
  //
  // Không phải "khoảng sát chữ" — nó là khoảng NÉ, để hai đường khỏi chồng
  // khít lên nhau và người xem chỉ thấy một. Trước bước 80 là `vGap/4` = 8,5.
  lechNetDai:   8,

  // --- NỚI BẢNG TÊN CHO NGƯỜI TÊN DÀI (việc E, bước 80) -------------------
  //
  // Bảng tên được phép rộng hơn ô, đè lên đoạn nét kẻ dọc bên cạnh — đúng luật
  // vẽ hai lượt (QUY-TAC-VE §7: ô vẽ sau tự che nét), và nốt cụt vẽ ở lượt 3
  // nên không bao giờ bị che. Điều kiện bắt buộc: **không đè lên bảng tên
  // người khác.**
  //
  // `kheBangTen` là khe hở tối thiểu phải chừa giữa hai bảng tên cạnh nhau;
  // `noiTenToiDa` là trần nới ra MỖI BÊN, để người đứng một mình giữa sơ đồ
  // không nhận một cái bảng dài ngoẵng.
  //
  // 18 tính ngược từ dữ liệu thật: tên dài nhất trong cây Nguyễn Phúc 681
  // người đo được 144,4px ở cỡ chữ 11 (`kiem-thu/do-ten-dai.mjs`), mà bảng nới
  // hết cỡ chứa được 120 + 2×18 − 3×2 − 6 = 144px.
  kheBangTen:   10,
  noiTenToiDa:  18,

  // Độ dài đường kẻ dẫn tới nốt cụt, hướng LÊN và XUỐNG.
  // 34 → 22 ở bước 28d, để `vGap` xuống được 34. Xem ghi chú `vGap` ở trên.
  //
  // ⚠ **22 → 14 ở bước 82, và lý do là một phép cộng chứ không phải con mắt.**
  // Nốt cụt hướng LÊN mọc từ nóc ô, nên tâm nốt nằm cách nóc ô hàng dưới đúng
  // `stubLength`. Thanh ngang gom con của hàng TRÊN nằm cách nóc ô hàng dưới
  // đúng `vGap − khoangSatChu`. Hai con số ấy trước bước 82 bằng nhau chằn chặn:
  //
  //     stubLength 22  =  vGap 34 − khoangSatChu 12
  //
  // tức **MỌI nốt cụt hướng lên đều rơi ĐÚNG TRÊN thanh ngang gom con của đời
  // trên** — không phải ca hiếm, mà là mọi ca. Chủ dự án nhìn app thật rồi chỉ
  // đúng chỗ ấy (bà Vũ Thị Ngọc). Nốt vẽ ở lượt 3 nên nó nằm trên nét, không bị
  // che — nhưng nhìn ra thì cái nốt như bị XÂU vào sợi dây.
  //
  // 14 đặt tâm nốt xuống dưới thanh ngang 8px, mép nốt còn cách thanh ngang 2px
  // và cách nóc ô hàng dưới 8px:
  //
  //     thanh ngang gom con   nóc ô − 22
  //     mép trên nốt          nóc ô − 20
  //     TÂM NỐT               nóc ô − 14
  //     mép dưới nốt          nóc ô − 8
  //
  // ⚠ **Bước 84 nới `vGap` 34 → 38, và phép cộng trên vẫn đúng nguyên** — chỉ
  // đổi vai người đứng gần: nay thanh ngang sát nốt cụt nhất là thanh MỨC SÂU
  // NHẤT của người nhiều bạn đời, ở `khoangSatChu + buocThanhNgang` = 16, tức
  // cách nóc ô hàng dưới đúng 22 như cũ. Đọc lại bằng con số mới:
  //
  //     thanh ngang mức sâu nhất   nóc ô − 22   (vGap − khoangSatChu − buocThanhNgang)
  //     mép trên nốt               nóc ô − 20
  //     TÂM NỐT                    nóc ô − 14
  //     mép dưới nốt               nóc ô −  8
  //
  // ⚠ Đổi `vGap`, `khoangSatChu` hay `buocThanhNgang` thì PHẢI xét lại phép
  // cộng này. Bài kiểm gác nó: `kiem-buoc-80.mjs` nhóm 8.
  //
  // ⚠ Nốt cụt hướng XUỐNG không đổi gì: nó bị `tranY` kẹp trước khi `stubLength`
  // kịp có tác dụng — xem `viTriNotCut()`.
  stubLength:  14,
  stubRadius:   6,

  // Nốt cụt nằm NGANG phải ngắn hơn, và đây là lý do — đừng gộp lại làm một
  // con số (16/08/2026, chat 1.4).
  //
  // Chiều dọc có vGap (nay 38px) để mọc ra, chiều ngang chỉ có hGap = 28px giữa
  // hai khối anh em. Dùng chung 34px thì nốt tròn rơi hẳn vào trong ô người
  // bên cạnh: đo trên bản 57 người, 14/120 nốt đè lên ô, và ĐÚNG BẰNG toàn bộ
  // số nốt nằm ngang — tức mọi nốt ngang đều hỏng. Sáu bất biến của chat 1.3
  // không bắt được vì chúng chỉ xét ô với ô; lỗi này chỉ lộ ra khi xem hình.
  //
  // 14 + stubRadius 6 = 20 < 28, còn chừa 8px hở. Đổi hGap thì phải đổi cả
  // con số này. (Bản ngang KHÔNG hạ theo bản dọc ở bước 28d: nó bị hGap chặn,
  // không bị vGap chặn.)
  stubLengthNgang: 14,

  // Nét vợ chồng chồng nấc khi một người có nhiều bạn đời — QUY-TAC-VE §3.
  // Nét thứ nhất luôn nằm giữa khung; nét thứ k lùi lên spouseStepMax pixel
  // mỗi nấc, nhưng tự co lại để nấc trên cùng còn cách mép trên
  // spouseStepPadTop pixel. Cộng dồn cứng 8px thì đến người thứ tư nét tràn
  // ra khỏi khung.
  spouseStepMax:    8,
  spouseStepPadTop: 6,

  // Cách ngang giữa hai KHỐI gốc rời nhau (hai gia đình không nối với nhau
  // trong cùng một sơ đồ). Rộng hơn hGap để mắt tách được hai khối.
  blockGap:    56,
};

// Bốn con số điều khiển tập người được vẽ. Xem KE-HOACH_V08.
//
//   ancestors           số đời vẽ lên   — 0 = không giới hạn
//   descendants         số đời vẽ xuống — 0 = không giới hạn
//   spouseOfDescendants có vẽ vợ/chồng của hậu duệ không
//   k                   đi lên tới đời thứ mấy thì còn rẽ ngang sang anh chị em
//
// ⚠ ĐỔI 01/09/2026 — chủ dự án chốt: mặc định **2 đời trên và 2 đời dưới**.
//
// Trước ngày này cả hai để 0, tức KHÔNG GIỚI HẠN, theo ảnh `hinh_3.jpg` vẽ
// liền 5 đời tổ tiên. Con số ấy hợp với gia phả 32 người dùng để đối chiếu
// thuật toán, nhưng gia phả thật của chủ dự án có **681 người, 17 đời**: mở
// app ra là 661 người đổ vào một sơ đồ, trên màn hình điện thoại thì không
// còn là sơ đồ nữa.
//
// k = 1 là con số Quick Family Tree đang dùng, đã đối chiếu cả bốn ảnh —
// KHÔNG đụng vào.
export const DEFAULT_SCOPE = {
  ancestors:           2,
  descendants:         2,
  spouseOfDescendants: true,
  k:                   1,
};

// ============================================================
// TÊN PHỤ — nhãn tiếng Việt của `names[].type`
// ============================================================
//
// Gia phả Việt gọi một người bằng nhiều tên: tên huý (tên thật lúc nhỏ, kiêng
// gọi ra), tên tự, tên thụy (đặt sau khi mất), pháp danh (nhà chùa đặt), và
// tên thường gọi. Schema đã chứa cả năm từ bước 00 — `CAU-TRUC-DU-LIEU §names[]`.
//
// ⚠ **Bảng này ở `config` chứ không nằm trong hai file `pages`, và đó là chủ ý.**
// Form GHI mã `phap_danh` xuống dữ liệu, thẻ ĐỌC mã ấy lên để kể tên. Hai bên
// giữ hai bảng riêng thì tới ngày ai đó thêm một loại tên, một bên biết còn bên
// kia hiện trơ cái mã `phap_danh` ra giữa thẻ. Đây đúng là *hằng số hiển thị*.
//
// ⚠ **`chinh` KHÔNG có trong bảng.** Tên chính không phải một lựa chọn trong
// danh sách tên phụ — nó là dòng tên lớn ở đầu thẻ, và mỗi người chỉ có đúng một.
export const LOAI_TEN_PHU = [
  { ma: 'huy',        chu: 'Tên huý' },
  { ma: 'tu',         chu: 'Tên tự' },
  { ma: 'thuy',       chu: 'Tên thụy' },
  { ma: 'phap_danh',  chu: 'Pháp danh' },
  { ma: 'thuong_goi', chu: 'Thường gọi' },
  { ma: 'khac',       chu: 'Tên khác' },
];

/**
 * Nhãn tiếng Việt của một mã loại tên. Mã lạ — dữ liệu cũ, hoặc file GEDCOM
 * nhập từ phần mềm khác — trả về CHÍNH CÁI MÃ chứ không trả về chuỗi rỗng:
 * thấy `birth_name` giữa thẻ thì còn biết đường mà tra, thấy khoảng trống thì
 * tưởng dữ liệu hỏng.
 */
export function nhanLoaiTenPhu(ma) {
  const m = String(ma || '').trim();
  if (m === '') return '';
  const muc = LOAI_TEN_PHU.find((x) => x.ma === m);
  return muc ? muc.chu : m;
}

// ============================================================
// QUAN HỆ CHA MẸ – CON (việc 3, 21/08/2026)
// ============================================================
//
// ⚠ **Bảng này ở `config` chứ không nằm trong `domains/union.js`, cùng đúng lý
// lẽ đã dùng cho `LOAI_TEN_PHU`:** form GHI mã `thua_tu` xuống dữ liệu, thẻ ĐỌC
// mã ấy lên để kể quan hệ. Hai bên giữ hai bảng riêng thì tới ngày ai đó thêm
// một loại quan hệ, một bên biết còn bên kia hiện trơ cái mã ra giữa thẻ.
//
// ⚠ **`union.QUAN_HE_CON` — danh sách mã hợp lệ — DẪN XUẤT từ bảng này**, nên
// hai thứ không thể trôi lệch nhau. Thêm một hàng ở đây là thêm luôn một mã hợp
// lệ; bỏ một hàng là bỏ luôn. Đừng dựng bảng mã thứ hai ở bất cứ đâu.
//
// ⚠ **HAI cột nhãn, không phải một.** Cùng một mã `adopted` đọc từ phía người
// con là *"con nuôi"*, đọc từ phía cha mẹ là *"cha mẹ nuôi"*. Thẻ thông tin kể
// cả hai chiều — nhóm *Cha mẹ* và nhóm *Con* — nên một cột nhãn là chắc chắn có
// một chiều đọc lên sai.
//
// ⚠ **`birth` có nhãn, và nhãn ấy KHÔNG được in ra thẻ.** Form cần chữ "Con đẻ"
// để có cái mà bày trong danh sách chọn; thẻ thì im lặng với `birth` — ghi "con
// đẻ" cạnh mọi người con là bắt người đọc lọc lấy thứ khác thường giữa một rừng
// chữ bình thường. Chỗ quyết định điều đó là nơi GỌI, xem `person-detail.js`.
export const QUAN_HE_CON_NHAN = [
  { ma: 'birth',   con: 'Con đẻ',         chaMe: 'Cha mẹ đẻ' },
  { ma: 'adopted', con: 'Con nuôi',       chaMe: 'Cha mẹ nuôi' },
  { ma: 'step',    con: 'Con riêng',      chaMe: 'Cha dượng / mẹ kế' },
  { ma: 'foster',  con: 'Con nuôi dưỡng', chaMe: 'Cha mẹ nuôi dưỡng' },
  { ma: 'thua_tu', con: 'Con thừa tự',    chaMe: 'Cha mẹ thừa tự' },
];

/**
 * Nhãn tiếng Việt của một mã quan hệ.
 *
 * @param {string} ma
 * @param {'con'|'chaMe'} [phia]  đọc từ phía nào; mặc định là phía người con
 * @returns {string} mã lạ trả về CHÍNH CÁI MÃ — cùng lối với `nhanLoaiTenPhu`:
 *          thấy `sealed` giữa thẻ thì còn biết đường mà tra, thấy khoảng trống
 *          thì tưởng dữ liệu hỏng.
 */
export function nhanQuanHeCon(ma, phia) {
  const m = String(ma || '').trim();
  if (m === '') return '';
  const muc = QUAN_HE_CON_NHAN.find((x) => x.ma === m);
  return muc ? muc[phia === 'chaMe' ? 'chaMe' : 'con'] : m;
}

/**
 * Cùng cái nhãn ấy, nhưng ở dạng CHÚ THÍCH — thứ đứng nép bên cạnh một cái tên
 * trên thẻ, chứ không phải một mục trong danh sách chọn.
 *
 * Khác `nhanQuanHeCon` đúng hai điều, và cả hai đều là chuyện hiển thị:
 *
 * - **`birth` trả về CHUỖI RỖNG.** Ghi "con đẻ" cạnh mọi người con là bắt
 *   người đọc lọc lấy thứ khác thường giữa một rừng chữ bình thường. Chú thích
 *   chỉ có nghĩa khi nó nói một điều KHÁC lệ thường.
 * - **Chữ đầu viết thường.** Nó nằm giữa câu, sau một cái tên — "Nguyễn Bá
 *   Thục (con nuôi)". Viết hoa ở đó đọc lên như một cái tên riêng thứ hai.
 *
 * Ba nơi cần đúng phép này — thẻ thông tin (hai nhóm) và hộp Gỡ nối — nên nó
 * là một hàm, không phải ba lần gõ lại cùng một điều kiện.
 */
export function chuThichQuanHe(ma, phia) {
  const m = String(ma || '').trim();
  if (m === '' || m === 'birth') return '';
  const chu = nhanQuanHeCon(m, phia);
  return chu ? chu.charAt(0).toLowerCase() + chu.slice(1) : '';
}

// ============================================================
// TRẠNG THÁI CỦA MỘT CẶP (27/08/2026)
// ============================================================
//
// ⚠ **Bảng này ở `config` cùng đúng lý lẽ của `QUAN_HE_CON_NHAN`:** form GHI mã
// `divorced` xuống dữ liệu, thẻ gia đình và màn hình *Sửa thông tin gia đình*
// ĐỌC mã ấy lên để kể. Trước hôm nay câu *"Đang là vợ chồng / Đã ly hôn"* nằm
// rải ở bốn nơi, mỗi nơi một bản `u.status === 'divorced' ? … : …`.
//
// ⚠ **CHỈ HAI MỤC, dù `CAU-TRUC-DU-LIEU_V05` cho phép bốn** (`widowed` ·
// `unknown`). Hai mã kia chưa có cửa nào ghi được và app chưa hỏi ai câu ấy;
// bày một mục ra rồi không chỗ nào đọc lên là hứa một việc chưa làm. Mã lạ —
// dữ liệu cũ, hoặc file GEDCOM nhập từ phần mềm khác — thì GIỮ NGUYÊN và hiện
// chính cái mã, cùng lối với `nhanQuanHeCon`.
export const TRANG_THAI_CAP = [
  { ma: 'married',  chu: 'Đang là vợ chồng' },
  { ma: 'divorced', chu: 'Đã ly hôn' },
];

/**
 * Mã trạng thái của một cặp, đọc ra chữ.
 *
 * @param {string} ma  thiếu hoặc rỗng thì coi là `married` — cùng phép chuẩn
 *        hoá mà `union.updateUnion` dùng khi ghi, nên chữ hiện ra luôn đúng
 *        thứ sắp được ghi xuống.
 * @returns {string} mã lạ trả về CHÍNH CÁI MÃ.
 */
export function nhanTrangThaiCap(ma) {
  const m = String(ma || '').trim() || 'married';
  const muc = TRANG_THAI_CAP.find((x) => x.ma === m);
  return muc ? muc.chu : m;
}

// ============================================================
// KHỔ MÀN HÌNH — hai công thức dùng chung cho MỌI lớp phủ
// ============================================================
//
// Chốt 21/08/2026 (việc KM). Chủ dự án: form thiết kế cho điện thoại DỌC, nên
// điện thoại NẰM NGANG và MÁY ĐỂ BÀN dùng chưa thoải mái — hộp vẫn hẹp đúng
// 360px giữa một màn hình rộng 1440px.
//
// ⚠ **Dự án KHÔNG có file CSS.** Mọi kiểu viết thẳng vào `style.cssText`, mà
// `@media` KHÔNG dùng được với kiểu inline. Nên cả hai việc — rộng ra trên máy
// để bàn, cao lên khi màn hình thấp — phải làm bằng **CSS thuần co giãn**
// (`clamp` · `min` · `max` · `vw` · `vh`), không một câu điều kiện nào trong JS.
//
// ⚠ **Hai công thức này là thứ mọi màn hình sinh sau phải GỌI.** Trước hôm nay
// bảy chỗ chép tay bảy chuỗi `max-width:…px` rời nhau, và mỗi màn hình mới lại
// chép thêm một bản. Gõ thẳng một con số px vào màn hình mới là dựng lại đúng
// cái vừa phải đi sửa bảy lần.
//
// ⚠ **MỨC 3 — form hai cột trên màn hình rộng — ĐÃ LOẠI, đừng dựng lại.** Chủ
// dự án: *"gây trải nghiệm không đồng bộ"*. Ai quen form một cột trên điện
// thoại mà mở máy tính ra thấy hai cột thì phải học lại chỗ của từng ô.

/**
 * Chiều cao tối thiểu mà một hộp được phép chiếm, khi màn hình quá thấp để
 * `xxvh` còn đủ dùng — điện thoại nằm ngang cao chừng 360–400px.
 *
 * 340px là chiều cao của khung vòng tròn (`280 × 320`) cộng chỗ cho một dòng
 * tiêu đề. Thấp hơn nữa thì hộp nào cũng thành một khe ngang phải cuộn ba lần.
 */
const SAN_CAO_HOP = 340;

/**
 * Bề ngang của một hộp phủ, dạng giá trị cho `max-width`.
 *
 * ⚠ **`coSo` phải bằng ĐÚNG bề ngang hộp ấy đang có hôm nay.** Nhờ vậy không
 * một khổ màn hình nào hẹp ĐI sau việc này — đó là điều kiện để mức 1+2 không
 * phá thứ đang chạy tốt trên điện thoại DỌC. Trên 360px, `62vw` chỉ ra 223px
 * nên `clamp` lấy sàn, tức hộp giữ nguyên xưa nay.
 *
 * `tiLeVw` cao (≈62) chứ không phải 46: chỗ được lợi nhiều nhất không phải máy
 * để bàn — nó đã chạm trần — mà là **điện thoại nằm ngang** (740 × 360), nơi
 * 46vw chỉ ra 340px, tức không rộng thêm một pixel nào so với hôm nay.
 *
 * @param {number} coSo   bề ngang hôm nay, px — cũng là sàn, không bao giờ hẹp hơn
 * @param {number} toiDa  trần, px — chỗ chữ dài quá một dòng thì khó đọc
 * @param {number} [tiLeVw] phần trăm bề ngang màn hình ở khoảng giữa
 * @returns {string} chuỗi `clamp(...)` để ghép sau `max-width:`
 */
export function rongHop(coSo, toiDa, tiLeVw = 62) {
  return 'clamp(' + coSo + 'px, ' + tiLeVw + 'vw, ' + toiDa + 'px)';
}

/**
 * Chiều cao trần của một hộp phủ, dạng giá trị cho `max-height` (hoặc `height`
 * ở màn hình Danh sách người, nơi chiều cao chốt cứng có lý do riêng).
 *
 * Công thức đọc là: **giữ nguyên `tiLeVh` như xưa nay, chỉ NỚI RA khi màn hình
 * thấp đến mức `tiLeVh` không còn đủ `SAN_CAO_HOP`** — và ngay cả lúc nới cũng
 * không vượt quá chỗ trống thật giữa hai lề của lớp phủ.
 *
 *   `max( <tiLeVh>vh , min( 340px , 100vh − hai lề ) )`
 *
 * Ba khổ để đọc ra ba nhánh, với `tiLeVh = 82` và lề 20px:
 *
 *   điện thoại DỌC   640px cao → max(525, min(340, 600)) = **525** — y hệt hôm nay
 *   máy để bàn       900px cao → max(738, min(340, 860)) = **738** — y hệt hôm nay
 *   điện thoại NGANG 360px cao → max(295, min(340, 331)) = **331** — nới ra, và
 *                                vẫn vừa khít giữa hai lề nên KHÔNG tràn
 *
 * ⚠ Nhánh thứ ba là toàn bộ lý do có `min(...)`. Bỏ nó đi mà viết thẳng 340px
 * thì trên màn hình cao 300px hộp sẽ cao hơn chỗ nó đứng, và vì lớp phủ căn
 * GIỮA nên nó bị cắt CẢ HAI ĐẦU — phần trên cuộn tới không được nữa.
 *
 * ⚠ Phần trừ đi phải là **`haiLe()` của chính lớp phủ đang bọc hộp**, không
 * phải một con số gõ tay: lề co lại trên màn hình thấp (xem `leLopPhu`), và hai
 * công thức lệch nhau dù chỉ 8px là hộp thò ra ngoài đúng 8px ấy.
 *
 * @param {number} tiLeVh  tỉ lệ chiều cao hôm nay (82 · 86 · 70…)
 * @param {number} [le]    `padding` gốc của lớp phủ, px — MỘT bên
 * @returns {string} chuỗi `max(...)` để ghép sau `max-height:`
 */
export function caoHop(tiLeVh, le = 20) {
  return 'max(' + tiLeVh + 'vh, min(' + SAN_CAO_HOP + 'px, ' +
         'calc(100vh - ' + haiLe(le) + ')))';
}

/**
 * Bề ngang TỐI ĐA của một nút hành động, khi hộp đã rộng ra.
 *
 * ⚠ Chốt sau khi NHÌN ẢNH của việc KM, không phải trước. Hộp rộng ra thì mọi
 * thứ `width:100%` hay `flex:1` bên trong rộng theo, và một nút *Đóng* dài
 * 640px thì đọc ra thành một cái thanh, không ra một cái nút — trong khi đích
 * chạm chẳng khá hơn nút 320px chút nào. Bài kiểm tự động cho qua trọn vẹn:
 * nút ấy KHÔNG SAI, nó chỉ xấu. Đây là lần thứ TÁM trong dự án này một lỗi bố
 * cục chỉ lộ ra khi có người mở ảnh ra nhìn.
 *
 * 320px vì đó là bề ngang nút trên điện thoại dọc — khổ mà cả họ đang dùng.
 * Lấy đúng con số ấy làm trần thì nút trên máy để bàn **to bằng** nút trên
 * điện thoại, không to hơn: cùng một màn hình, không phải hai.
 */
export const RONG_NUT_TOI_DA = '320px';

/**
 * `padding` của một lớp phủ — **lề co lại khi màn hình thấp**.
 *
 * Lề trên/dưới 20px là 11% chiều cao của một điện thoại nằm ngang, mà lại chỉ
 * là 4% của một màn hình máy để bàn. Cùng một con số px đọc ra hai nghĩa khác
 * hẳn nhau, nên nó phải co: **đủ 20px khi màn cao từ 500px trở lên, dưới mức ấy
 * thì thu theo đúng tỉ lệ.**
 *
 * Lề TRÁI/PHẢI không co — bề ngang chưa bao giờ là thứ thiếu ở đây, và một hộp
 * chạm sát mép màn hình thì mất luôn chỗ bấm-ra-ngoài-để-đóng.
 *
 * @param {number} [le] lề gốc, px
 * @returns {string} chuỗi để ghép sau `padding:`
 */
export function leLopPhu(le = 20) {
  return 'min(' + le + 'px, ' + (le / 5) + 'vh) ' + le + 'px';
}

/** Tổng hai lề trên–dưới của `leLopPhu(le)`. Dùng trong `calc()` của `caoHop`. */
function haiLe(le) {
  return 'min(' + (le * 2) + 'px, ' + (le * 2 / 5) + 'vh)';
}
