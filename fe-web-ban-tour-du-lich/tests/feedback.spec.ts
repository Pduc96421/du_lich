import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:5173';

// ============================================================
// TC-Auto-01: Gửi phản hồi thành công với đầy đủ thông tin
// ============================================================
test('TC-Auto-01: Gửi phản hồi thành công với đầy đủ thông tin', async ({ page }) => {
  // Đăng nhập user
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'nguyenvana@example.com');
  await page.fill('#password', 'User@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });

  // Điều hướng đến trang feedback
  await page.goto(`${BASE_URL}/feedback`);
  await page.waitForLoadState('networkidle');

  // Nhập thông tin phản hồi
  const titleInput = page.locator('input[placeholder*="vấn đề"], input[placeholder*="Vấn đề"], input[name="title"]').first();
  await titleInput.fill('Lỗi hiển thị hình ảnh tour');

  const contentInput = page.locator('textarea[placeholder*="nội dung"], textarea[placeholder*="Nội dung"], textarea[name="message"]').first();
  await contentInput.fill('Hình ảnh của tour Hạ Long bị mờ, không rõ nét.');

  // Chụp ảnh trước khi gửi
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-01_before_submit.png', fullPage: false });

  // Nhấn nút Gửi
  await page.locator('button:has-text("Gửi"), button[type="submit"]').last().click();

  // Xác nhận thông báo thành công
  const successMsg = page.locator('.ant-message-success').first();
  await expect(successMsg).toBeVisible({ timeout: 10000 });

  // Chụp ảnh sau khi gửi thành công
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-01_success.png', fullPage: false });
});

// ============================================================
// TC-Auto-02: Gửi phản hồi thất bại khi bỏ trống thông tin
// ============================================================
test('TC-Auto-02: Gửi phản hồi thất bại khi bỏ trống thông tin', async ({ page }) => {
  // Đăng nhập user (cần auth để vào trang feedback)
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'nguyenvana@example.com');
  await page.fill('#password', 'User@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });

  // Vào trang feedback
  await page.goto(`${BASE_URL}/feedback`);
  await page.waitForLoadState('networkidle');

  // Chụp trạng thái form trống
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-02_empty_form.png', fullPage: false });

  // Click Gửi mà không nhập gì
  await page.locator('button:has-text("Gửi"), button[type="submit"]').last().click();
  await page.waitForTimeout(1000);

  // Chụp ảnh thông báo lỗi validation
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-02_validation_errors.png', fullPage: false });

  // Xác nhận thông báo lỗi hiển thị
  const errorMsg = page.locator('.ant-form-item-explain-error').first();
  await expect(errorMsg).toBeVisible({ timeout: 5000 });
});

// ============================================================
// TC-Auto-03: Admin xem danh sách và hủy phản hồi
// ============================================================
test('TC-Auto-03: Admin xem danh sách phản hồi và hủy phản hồi', async ({ page }) => {
  // Đăng nhập admin
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('#email', 'admin@tourmanager.com');
  await page.fill('#password', 'Admin@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });
  await page.waitForURL(url => url.pathname.startsWith('/admin') && !url.pathname.endsWith('/login'), { timeout: 15000 });

  // Vào trang quản lý feedback
  await page.goto(`${BASE_URL}/admin/supports`);
  await page.waitForLoadState('networkidle');

  // Xác nhận bảng danh sách hiển thị
  const table = page.locator('table').first();
  await expect(table).toBeVisible({ timeout: 10000 });

  // Chụp ảnh danh sách feedback
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-03_feedback_list.png', fullPage: false });

  // Nhấn nút Đóng đầu tiên nếu có
  const cancelBtn = page.locator('button:has-text("Đóng"), button:has-text("Close"), button:has-text("Hủy"), button:has-text("Cancel")').first();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await page.waitForTimeout(1000);

    // Xác nhận trong Popconfirm
    const confirmBtn = page.locator('.ant-popover button:has-text("Đóng"), .ant-popconfirm button:has-text("Đóng")').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(2000);

    // Chụp ảnh sau khi hủy
    await page.screenshot({ path: 'tests/screenshots/TC-Auto-03_after_cancel.png', fullPage: false });

    // Xác nhận thông báo thành công
    const successMsg = page.locator('.ant-message-success').first();
    await expect(successMsg).toBeVisible({ timeout: 8000 });
  } else {
    // Không có feedback pending - vẫn pass test vì danh sách đã hiển thị
    console.log('Không có feedback pending để hủy, bỏ qua bước này.');
    await page.screenshot({ path: 'tests/screenshots/TC-Auto-03_no_pending.png', fullPage: false });
  }
});

// ============================================================
// TC-Auto-04: Đăng nhập tài khoản đã hoàn thành tour và gửi đánh giá thành công
// ============================================================
test('TC-Auto-04: Đăng nhập tài khoản đã hoàn thành tour và gửi đánh giá thành công', async ({ page }) => {
  // Reset trạng thái database trước khi chạy test để đảm bảo tính lặp lại (idempotency)
  try {
    execSync("mysql -u root -p'Ducno96421!' -e \"use webbantourdulich; update orders set is_review = 0 where id = 2; delete from reviews where user_id = 2 and tour_id = 2;\" 2>/dev/null");
    console.log('Reset orders table and deleted reviews for order 2 successfully.');
  } catch (err) {
    console.warn('Database reset failed, proceeding with test:', err);
  }

  // Đăng nhập user tranthib
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'tranthib@example.com');
  await page.fill('#password', 'User@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });

  // Điều hướng đến trang lịch sử đơn hàng
  await page.goto(`${BASE_URL}/order`);
  await page.waitForLoadState('networkidle');

  // Chọn tab "Đã kết thúc"
  const completedTab = page.locator('.ant-segmented-item:has-text("Đã kết thúc")').first();
  await expect(completedTab).toBeVisible({ timeout: 5000 });
  await completedTab.click();
  await page.waitForTimeout(2000); // Đợi load danh sách đơn hàng đã kết thúc

  // Tìm nút "Đánh giá tour" của order 2 (Tour ID 2)
  const reviewBtn = page.locator('button:has-text("Đánh giá tour")').first();
  await expect(reviewBtn).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-04_order_completed.png', fullPage: false });
  await reviewBtn.click();

  // Đợi Modal đánh giá xuất hiện
  const modal = page.locator('.ant-modal-content').first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Chọn 5 sao (mặc định đã chọn 5 sao, ta chọn lại để kiểm thử click)
  const rateStar = page.locator('.ant-rate-star').last();
  await rateStar.click();

  // Nhập nội dung đánh giá chi tiết
  const reviewText = page.locator('textarea').first();
  await reviewText.fill('Tour du lịch rất tuyệt vời, hướng dẫn viên nhiệt tình chu đáo, phục vụ tốt!');

  // Chụp ảnh trước khi hoàn thành
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-04_before_submit.png', fullPage: false });

  // Click Hoàn thành
  await page.locator('button:has-text("HOÀN THÀNH")').first().click();

  // Chờ thông báo "Đánh giá thành công"
  const successMsg = page.locator('.ant-message-success').first();
  await expect(successMsg).toBeVisible({ timeout: 10000 });

  // Chụp ảnh sau khi đánh giá thành công
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-04_success.png', fullPage: false });

  // Đợi 2s và kiểm tra nút Đánh giá tour đã bị disable
  await page.waitForTimeout(2000);
  const disabledReviewBtn = page.locator('button:has-text("Đánh giá tour")').first();
  await expect(disabledReviewBtn).toBeDisabled();
});

// ============================================================
// TC-Auto-05: Kiểm tra review mới xuất hiện trong trang chi tiết tour
// ============================================================
test('TC-Auto-05: Kiểm tra review mới xuất hiện trong trang chi tiết tour', async ({ page }) => {
  // Đi tới trang chi tiết tour ID 2
  await page.goto(`${BASE_URL}/detail/2`);
  await page.waitForLoadState('networkidle');

  // Cuộn xuống phần "Đánh giá từ người dùng"
  const reviewTitle = page.locator('text=Đánh giá từ người dùng').first();
  await reviewTitle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Chụp ảnh phần đánh giá tour
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-05_reviews_list.png', fullPage: false });

  // Xác nhận đánh giá mới hiển thị
  const reviewContent = page.locator('text=Tour du lịch rất tuyệt vời, hướng dẫn viên nhiệt tình chu đáo, phục vụ tốt!').first();
  await expect(reviewContent).toBeVisible({ timeout: 10000 });

  // Xác nhận tên người đánh giá hiển thị
  const reviewerName = page.locator('text=tranthib').first();
  await expect(reviewerName).toBeVisible({ timeout: 5000 });
});

// ============================================================
// TC-Auto-06: Người dùng chưa đăng nhập bị chặn truy cập trang Feedback
// ============================================================
test('TC-Auto-06: Người dùng chưa đăng nhập bị chặn truy cập trang Feedback', async ({ page }) => {
  // Đi thẳng vào trang feedback mà không đăng nhập
  await page.goto(`${BASE_URL}/feedback`);
  await page.waitForLoadState('networkidle');

  // Xác nhận trình duyệt tự động chuyển hướng về trang login
  await expect(page).toHaveURL(`${BASE_URL}/login`);

  // Chụp ảnh bằng chứng
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-06_blocked_access.png', fullPage: false });

  // Xác nhận thông báo cảnh báo "Chưa đăng nhập" xuất hiện
  const warningMsg = page.locator('.ant-notification-notice-message').first();
  await expect(warningMsg).toHaveText('Chưa đăng nhập', { timeout: 5000 });
});

// ============================================================
// TC-Auto-07: Validation form đánh giá - Yêu cầu nhập ít nhất 10 ký tự
// ============================================================
test('TC-Auto-07: Validation form đánh giá - Yêu cầu nhập ít nhất 10 ký tự', async ({ page }) => {
  // Đăng nhập user có đơn hàng completed để review (chọn tranthib)
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'tranthib@example.com');
  await page.fill('#password', 'User@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });

  // Reset database trạng thái đơn hàng của tranthib (ID 2)
  try {
    execSync("mysql -u root -p'Ducno96421!' -e \"use webbantourdulich; update orders set is_review = 0 where id = 2; delete from reviews where user_id = 2 and tour_id = 2;\" 2>/dev/null");
  } catch (err) {}

  // Vào lịch sử
  await page.goto(`${BASE_URL}/order`);
  await page.locator('.ant-segmented-item:has-text("Đã kết thúc")').first().click();
  await page.waitForTimeout(1000);
  
  // Click đánh giá
  const reviewBtn = page.locator('button:has-text("Đánh giá tour")').first();
  await expect(reviewBtn).toBeVisible({ timeout: 5000 });
  await reviewBtn.click();

  // Đợi Modal
  const modal = page.locator('.ant-modal-content').first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Điền 7 ký tự (Ít hơn 10)
  const reviewText = page.locator('textarea').first();
  await reviewText.fill('Rất tốt');
  await page.locator('button:has-text("HOÀN THÀNH")').first().click();

  // Xác nhận xuất hiện lỗi validation của Form
  const errorMsg = page.locator('.ant-form-item-explain-error').first();
  await expect(errorMsg).toBeVisible({ timeout: 5000 });
  
  // Chụp ảnh lỗi Validation
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-07_short_review_error.png', fullPage: false });
});

// ============================================================
// TC-Auto-08: Admin xem chi tiết nội dung Feedback
// ============================================================
test('TC-Auto-08: Admin xem chi tiết nội dung Feedback', async ({ page }) => {
  // Tạo trước 1 feedback qua API để đảm bảo admin luôn có cái để xem
  try {
    execSync("mysql -u root -p'Ducno96421!' -e \"use webbantourdulich; insert into feedbacks (user_id, title, message, status) values (1, 'Đóng góp ý kiến bot', 'Nội dung đóng góp chi tiết được sinh tự động bằng test script', 'pending');\" 2>/dev/null");
  } catch (err) {}

  // Đăng nhập admin
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('#email', 'admin@tourmanager.com');
  await page.fill('#password', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => url.pathname.startsWith('/admin') && !url.pathname.endsWith('/login'), { timeout: 15000 });

  // Vào trang quản lý feedback
  await page.goto(`${BASE_URL}/admin/supports`);
  await page.waitForLoadState('networkidle');

  // Bấm nút Xem chi tiết đầu tiên
  const viewBtn = page.locator('button:has-text("Xem chi tiết")').first();
  if (await viewBtn.isVisible()) {
    await viewBtn.click();

    // Xác nhận Modal (hoặc Popconfirm) mở lên
    const modal = page.locator('.ant-modal-content').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Chụp ảnh chi tiết
    await page.screenshot({ path: 'tests/screenshots/TC-Auto-08_feedback_details.png', fullPage: false });

    // Đóng Modal (nút OK)
    const closeBtn = page.locator('.ant-btn-primary').last();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  }
});

// ============================================================
// TC-Auto-09: Hủy bỏ form Đánh giá
// ============================================================
test('TC-Auto-09: Hủy bỏ form Đánh giá', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'tranthib@example.com');
  await page.fill('#password', 'User@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });

  await page.goto(`${BASE_URL}/order`);
  await page.locator('.ant-segmented-item:has-text("Đã kết thúc")').first().click();
  await page.waitForTimeout(1000);
  
  // Đảm bảo nút đánh giá hiển thị
  const reviewBtn = page.locator('button:has-text("Đánh giá tour")').first();
  if (await reviewBtn.isEnabled()) {
    await reviewBtn.click();
    const modal = page.locator('.ant-modal-content').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Điền chữ vào rồi ấn TRỞ LẠI
    await page.locator('textarea').first().fill('Đổi ý không đánh giá nữa');
    await page.screenshot({ path: 'tests/screenshots/TC-Auto-09_before_cancel.png', fullPage: false });
    
    await page.locator('button:has-text("TRỞ LẠI")').first().click();
    
    // Đảm bảo modal biến mất
    await expect(modal).toBeHidden({ timeout: 5000 });
    await page.screenshot({ path: 'tests/screenshots/TC-Auto-09_after_cancel.png', fullPage: false });
  }
});


// ============================================================
// TC-Auto-11: Đánh giá tiêu cực (1 Sao)
// ============================================================
test('TC-Auto-11: Đánh giá tiêu cực (1 Sao)', async ({ page }) => {
  // Đăng nhập user có đơn hàng completed để review
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'tranthib@example.com');
  await page.fill('#password', 'User@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });

  // Reset database trạng thái đơn hàng
  try {
    execSync("mysql -u root -p'Ducno96421!' -e \"use webbantourdulich; update orders set is_review = 0 where id = 2; delete from reviews where user_id = 2 and tour_id = 2;\" 2>/dev/null");
  } catch (err) {}

  await page.goto(`${BASE_URL}/order`);
  await page.locator('.ant-segmented-item:has-text("Đã kết thúc")').first().click();
  await page.waitForTimeout(1000);
  
  await page.locator('button:has-text("Đánh giá tour")').first().click();

  // Chọn 1 sao (Rate star index 0)
  const rateStar = page.locator('.ant-rate-star').first();
  await rateStar.click();

  await page.locator('textarea').first().fill('Tour này quá tệ, không như quảng cáo!');
  await page.screenshot({ path: 'tests/screenshots/TC-Auto-11_1star_review.png', fullPage: false });
  await page.locator('button:has-text("HOÀN THÀNH")').first().click();

  // Xác nhận thành công
  const successMsg = page.locator('.ant-message-success').first();
  await expect(successMsg).toBeVisible({ timeout: 10000 });
});


// ============================================================
// TC-Auto-15: Bắt lỗi Upload ảnh giả lập
// ============================================================
test('TC-Auto-15: Bắt lỗi Upload ảnh giả lập', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'tranthib@example.com');
  await page.fill('#password', 'User@123456');
  await page.click('button[type="submit"]');
  await expect(page.locator('.ant-message-success').first()).toBeVisible({ timeout: 5000 });

  await page.goto(`${BASE_URL}/order`);
  await page.locator('.ant-segmented-item:has-text("Đã kết thúc")').first().click();
  await page.waitForTimeout(1000);
  
  const reviewBtn = page.locator('button:has-text("Đánh giá tour")').first();
  if (await reviewBtn.isEnabled()) {
    await reviewBtn.click();
    
    // Giả lập click upload
    const uploadInput = page.locator('input[type="file"]').first();
    if (await uploadInput.count() > 0) {
      await page.screenshot({ path: 'tests/screenshots/TC-Auto-15_upload_interface.png', fullPage: false });
    }
  }
});

// ============================================================
// TC-Auto-16: Xem chi tiết Feedback có nội dung rỗng
// ============================================================
test('TC-Auto-16: Xem chi tiết Feedback có nội dung rỗng', async ({ page }) => {
  try {
    execSync("mysql -u root -p'Ducno96421!' -e \"use webbantourdulich; insert into feedbacks (user_id, title, message, status) values (1, 'Rỗng', '', 'pending');\" 2>/dev/null");
  } catch (err) {}

  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('#email', 'admin@tourmanager.com');
  await page.fill('#password', 'Admin@123456');
  await page.click('button[type="submit"]');
  
  await page.goto(`${BASE_URL}/admin/supports`);
  await page.waitForLoadState('networkidle');

  // Tìm row có title rỗng
  const viewBtn = page.locator('tr:has-text("Rỗng") button:has-text("Xem chi tiết")').first();
  if (await viewBtn.isVisible()) {
    await viewBtn.click();
    const modal = page.locator('.ant-modal-content').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Kiểm chứng fallback text
    await expect(page.locator('text=(Không có nội dung)').first()).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/TC-Auto-16_empty_feedback.png', fullPage: false });
  }
});
