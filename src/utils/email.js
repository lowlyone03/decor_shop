const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
    },
});

const defaultFrom = process.env.MAIL_FROM || '"Casa Decor" <noreply@casadecor.vn>';

const baseStyle = `
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
    border: 1px solid #eee;
    border-radius: 8px;
`;

const headerStyle = `
    text-align: center;
    padding-bottom: 20px;
    border-bottom: 2px solid #2c3e50;
    margin-bottom: 20px;
`;

const buttonStyle = `
    display: inline-block;
    padding: 10px 20px;
    background-color: #2c3e50;
    color: #ffffff;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
    margin-top: 15px;
`;

exports.sendWelcomeEmail = async (toEmail, userName) => {
    try {
        const html = `
            <div style="${baseStyle}">
                <div style="${headerStyle}">
                    <h2 style="color: #2c3e50; margin: 0;">Chào mừng đến với Casa Decor!</h2>
                </div>
                <p>Xin chào <strong>${userName}</strong>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại Casa Decor. Chúng tôi rất vui mừng được đồng hành cùng bạn trong hành trình trang trí tổ ấm.</p>
                <p>Bạn có thể đăng nhập ngay để khám phá các sản phẩm nội thất độc đáo và nhận những ưu đãi dành riêng cho thành viên.</p>
                <div style="text-align: center;">
                    <a href="http://localhost:5000/customers/login.html" style="${buttonStyle}">Đăng Nhập Ngay</a>
                </div>
                <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                    Thức và Phương Anh,<br>
                    <strong>Đội ngũ Casa Decor</strong>
                </p>
            </div>
        `;

        await transporter.sendMail({
            from: defaultFrom,
            to: toEmail,
            subject: 'Chào mừng bạn đến với Casa Decor 🎉',
            html: html,
        });
        console.log(`[Email] Welcome email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[Email Error] Failed to send welcome email to ${toEmail}:`, error);
    }
};

exports.sendPasswordResetEmail = async (toEmail, resetUrl) => {
    try {
        const html = `
            <div style="${baseStyle}">
                <div style="${headerStyle}">
                    <h2 style="color: #2c3e50; margin: 0;">Lấy lại mật khẩu của bạn</h2>
                </div>
                <p>Xin chào,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Casa Decor của bạn.</p>
                <p>Vui lòng click vào nút bên dưới để thiết lập lại mật khẩu mới. Đường link này sẽ <strong>hết hạn sau 30 phút</strong>.</p>
                <div style="text-align: center;">
                    <a href="http://localhost:5000${resetUrl}" style="${buttonStyle}">Đặt Lại Mật Khẩu</a>
                </div>
                <p style="margin-top: 20px;">Nếu bạn không yêu cầu đổi mật khẩu, xin vui lòng bỏ qua email này.</p>
                <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                    Trân trọng,<br>
                    <strong>Đội ngũ Casa Decor</strong>
                </p>
            </div>
        `;

        await transporter.sendMail({
            from: defaultFrom,
            to: toEmail,
            subject: 'Yêu cầu đặt lại mật khẩu - Casa Decor',
            html: html,
        });
        console.log(`[Email] Password reset email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[Email Error] Failed to send password reset email to ${toEmail}:`, error);
    }
};

exports.sendOrderConfirmationEmail = async (toEmail, order, customerName) => {
    try {
        const baseUrl = process.env.ALLOWED_ORIGINS || 'http://localhost:5000';
        
        let itemsHtml = order.items.map(item => `
            <tr>
                <td style="padding: 12px 15px; border-bottom: 1px solid #f0e6e0;">
                    <span style="font-weight: 500; color: #333;">${item.name}</span>
                </td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #f0e6e0; text-align: center; color: #555;">${item.quantity}</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #f0e6e0; text-align: right; color: #555;">${(item.purchasePrice || 0).toLocaleString('vi-VN')}đ</td>
                <td style="padding: 12px 15px; border-bottom: 1px solid #f0e6e0; text-align: right; font-weight: 500; color: #333;">${(item.itemTotal || 0).toLocaleString('vi-VN')}đ</td>
            </tr>
        `).join('');

        const orderDate = new Date(order.createdAt || Date.now());
        const formattedDate = orderDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const paymentMethods = {
            'cod': 'Thanh toán khi nhận hàng (COD)',
            'bank_transfer': 'Chuyển khoản ngân hàng',
            'vnpay': 'VNPAY'
        };
        const paymentMethodStr = paymentMethods[order.paymentMethod] || order.paymentMethod;

        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #faf6f3; padding: 30px 10px;">
                <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    
                    <!-- Header Logo -->
                    <div style="text-align: center; padding: 25px 0;">
                        <h1 style="margin: 0; color: #b75d32; font-size: 28px; letter-spacing: 2px;">CASA DECOR</h1>
                        <div style="color: #8b5a3e; font-size: 13px; margin-top: 5px;">Tô điểm không gian sống</div>
                    </div>

                    <!-- Hero Banner -->
                    <div style="margin: 0 20px; background: linear-gradient(135deg, #fdf8f5 0%, #f6e8df 100%); border-radius: 12px; padding: 20px; position: relative;">
                        <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <div style="background-color: #b75d32; color: white; width: 40px; height: 40px; border-radius: 50%; display: inline-block; text-align: center; line-height: 40px; font-size: 20px; margin-right: 15px; border: 3px solid rgba(183, 93, 50, 0.2); vertical-align: middle;">
                                ✓
                            </div>
                            <div style="display: inline-block; vertical-align: middle;">
                                <h2 style="margin: 0; color: #333; font-size: 18px;">Xác nhận đơn hàng thành công</h2>
                                <h3 style="margin: 5px 0 0 0; color: #b75d32; font-size: 16px;">#${order.orderCode}</h3>
                            </div>
                        </div>
                        <p style="margin: 0; color: #444; line-height: 1.5; font-size: 13px;">
                            Xin chào <strong>${customerName}</strong>,<br>
                            Casa Decor rất vui khi nhận được đơn hàng của bạn. Đơn hàng đã được ghi nhận thành công và đang được xử lý để sớm đến tay bạn. Cảm ơn bạn đã tin tưởng lựa chọn Casa Decor.
                        </p>
                    </div>

                    <!-- Order Details -->
                    <div style="padding: 20px;">
                        <h3 style="color: #b75d32; margin-top: 0; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                            <span style="margin-right: 8px;">🛍️</span> Chi tiết đơn hàng
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
                            <thead>
                                <tr style="background-color: #fdf8f5; color: #555;">
                                    <th style="padding: 10px 15px; text-align: left; font-weight: 500; border-radius: 6px 0 0 6px;">Sản phẩm</th>
                                    <th style="padding: 10px 15px; text-align: center; font-weight: 500;">SL</th>
                                    <th style="padding: 10px 15px; text-align: right; font-weight: 500;">Đơn giá</th>
                                    <th style="padding: 10px 15px; text-align: right; font-weight: 500; border-radius: 0 6px 6px 0;">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <!-- Totals -->
                        <div style="display: flex; justify-content: flex-end; font-size: 13px;">
                            <table style="width: 100%; max-width: 280px; border-collapse: collapse; margin-left: auto;">
                                <tr>
                                    <td style="padding: 6px 15px; text-align: right; color: #555;">Tạm tính:</td>
                                    <td style="padding: 6px 15px; text-align: right; font-weight: 500;">${(order.itemsTotal || 0).toLocaleString('vi-VN')}đ</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 15px; text-align: right; color: #555;">Phí giao hàng:</td>
                                    <td style="padding: 6px 15px; text-align: right; font-weight: 500;">${(order.shippingFee || 0).toLocaleString('vi-VN')}đ</td>
                                </tr>
                                ${order.discountAmount > 0 ? `
                                <tr>
                                    <td style="padding: 6px 15px; text-align: right; color: #555;">Giảm giá:</td>
                                    <td style="padding: 6px 15px; text-align: right; font-weight: 500; color: #e74c3c;">-${(order.discountAmount || 0).toLocaleString('vi-VN')}đ</td>
                                </tr>` : ''}
                                <tr>
                                    <td colspan="2" style="padding: 12px 0 0 0; margin-top: 8px;">
                                        <div style="background-color: #fdf8f5; border-radius: 6px; padding: 12px; text-align: right;">
                                            <span style="color: #b75d32; font-weight: bold; font-size: 14px; margin-right: 12px;">Tổng cộng:</span>
                                            <span style="color: #b75d32; font-weight: bold; font-size: 16px;">${(order.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Shipping Info -->
                    <div style="padding: 0 20px 20px 20px;">
                        <h3 style="color: #b75d32; margin-top: 0; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                            <span style="margin-right: 8px;">🚚</span> Thông tin giao hàng
                        </h3>
                        <div style="border: 1px solid #f0e6e0; border-radius: 8px; padding: 12px; font-size: 13px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; width: 100px; color: #777; vertical-align: top;"><strong>👤 Người nhận:</strong></td>
                                    <td style="padding: 6px 0; color: #333;">${order.shippingInfo.fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; border-top: 1px dashed #eee; color: #777; vertical-align: top;"><strong>📞 Điện thoại:</strong></td>
                                    <td style="padding: 6px 0; border-top: 1px dashed #eee; color: #333;">${order.shippingInfo.phone}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; border-top: 1px dashed #eee; color: #777; vertical-align: top;"><strong>📍 Địa chỉ:</strong></td>
                                    <td style="padding: 6px 0; border-top: 1px dashed #eee; color: #333; line-height: 1.5;">${order.shippingInfo.address}, ${order.shippingInfo.ward}, ${order.shippingInfo.district}, ${order.shippingInfo.city}</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Additional Info -->
                    <div style="padding: 0 20px 20px 20px;">
                        <h3 style="color: #b75d32; margin-top: 0; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                            <span style="margin-right: 8px;">ℹ️</span> Thông tin bổ sung
                        </h3>
                        <p style="font-size: 12px; color: #666; margin-bottom: 15px; line-height: 1.5;">
                            Chúng tôi sẽ gửi thêm email thông báo ngay khi đơn hàng được bàn giao cho đơn vị vận chuyển.
                        </p>
                        
                        <div style="margin-bottom: 20px;">
                            <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0;">
                                <tr>
                                    <td style="width: 33.33%; background-color: #fdf8f5; border: 1px solid #f0e6e0; border-radius: 8px; padding: 12px; text-align: center; vertical-align: middle;">
                                        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">📅 Ngày đặt</div>
                                        <div style="font-size: 12px; font-weight: 500; color: #333;">${formattedDate}</div>
                                    </td>
                                    <td style="width: 33.33%; background-color: #fdf8f5; border: 1px solid #f0e6e0; border-radius: 8px; padding: 12px; text-align: center; vertical-align: middle;">
                                        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">✔️ Trạng thái</div>
                                        <div style="font-size: 12px; font-weight: 500; color: #27ae60;">Đã xác nhận</div>
                                    </td>
                                    <td style="width: 33.33%; background-color: #fdf8f5; border: 1px solid #f0e6e0; border-radius: 8px; padding: 12px; text-align: center; vertical-align: middle;">
                                        <div style="font-size: 11px; color: #888; margin-bottom: 4px;">💳 Thanh toán</div>
                                        <div style="font-size: 12px; font-weight: 500; color: #333;">${paymentMethodStr}</div>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Buttons -->
                        <div>
                            <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0;">
                                <tr>
                                    <td style="width: 50%;">
                                        <a href="${baseUrl}/customers/orders.html" style="display: block; text-align: center; background-color: #b75d32; color: white; text-decoration: none; padding: 10px; border-radius: 6px; font-weight: 500; font-size: 13px;">📦 Theo dõi đơn hàng</a>
                                    </td>
                                    <td style="width: 50%;">
                                        <a href="${baseUrl}/contact.html" style="display: block; text-align: center; background-color: white; color: #b75d32; border: 1px solid #b75d32; text-decoration: none; padding: 10px; border-radius: 6px; font-weight: 500; font-size: 13px;">🎧 Liên hệ hỗ trợ</a>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #fdf8f5; padding: 20px; text-align: center; border-top: 1px solid #f0e6e0;">
                        <p style="margin: 0; color: #8b5a3e; font-size: 13px; line-height: 1.5;">
                            ❤️ <strong>Thức và Phương Anh</strong> cảm ơn bạn đã mua sắm.<br>
                            Chúc bạn có những trải nghiệm tuyệt vời.
                        </p>
                    </div>

                </div>
            </div>
        `;

        await transporter.sendMail({
            from: defaultFrom,
            to: toEmail,
            subject: `Xác nhận đơn hàng #${order.orderCode} - Casa Decor`,
            html: html,
        });
        console.log(`[Email] Order confirmation email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[Email Error] Failed to send order confirmation to ${toEmail}:`, error);
    }
};
