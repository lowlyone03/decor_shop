const StaffShift = require('../models/StaffShift');
const StaffKPI = require('../models/StaffKPI');
const Order = require('../models/Order');

// Múi giờ Việt Nam
function vnDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function vnMinuteNow() {
    const now = new Date();
    const h = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }));
    const m = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', minute: 'numeric' }));
    return h * 60 + m;
}
function monthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Cron chạy mỗi 15 phút — xử lý 3 tác vụ:
 * 1. Tự đóng ca quên check-out (active quá 2h sau giờ kết thúc)
 * 2. Đánh vắng (scheduled quá 30 phút chưa check-in)
 * 3. Cảnh báo đơn treo (pending > 15 phút)
 */
async function runShiftCron(io) {
    const today = vnDate();
    const currentMinute = vnMinuteNow();

    try {
        // ═══ 1. TỰ ĐÓNG CA — active quá endMinute + 120 phút ═══
        // Xử lý cả ca ngày hôm nay + ca ngày hôm qua (ca Đêm qua nửa đêm)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        const overdueShifts = await StaffShift.find({
            status: 'active',
            $or: [
                // Ca hôm nay quá endMinute + 120 phút
                { shiftDate: today, endMinute: { $lte: Math.max(currentMinute - 120, 0) } },
                // Ca hôm qua vẫn active (ca Đêm quên checkout)
                { shiftDate: yesterday, status: 'active' }
            ]
        });

        for (const shift of overdueShifts) {
            shift.status = 'auto_completed';
            shift.isForgotCheckOut = true;
            shift.checkOutAt = new Date();
            await shift.save();

            // Vẫn tính trọn 300k
            await StaffKPI.findOneAndUpdate(
                { staff: shift.staff, month: monthKey() },
                {
                    $inc: {
                        completedShifts: 1,
                        totalHours: shift.durationHours,
                        totalSalary: shift.totalPay
                    }
                },
                { upsert: true }
            );

            console.log(`[CRON] Tự đóng ca ${shift._id} (staff: ${shift.staff}) — quên check-out`);
        }

        // ═══ 2. ĐÁNH VẮNG — scheduled quá startMinute + 30 phút ═══
        // 2a. Ca ngày hôm nay: chỉ đánh vắng nếu đã quá startMinute + 30 phút
        const absentTodayShifts = await StaffShift.find({
            status: 'scheduled',
            shiftDate: today,
            startMinute: { $lte: currentMinute - 30 }
        });

        for (const shift of absentTodayShifts) {
            shift.status = 'absent';
            await shift.save();
            console.log(`[CRON] Đánh vắng ca ${shift._id} (staff: ${shift.staff})`);
        }

        // 2b. Ca ngày trước đó vẫn còn 'scheduled' → đánh vắng hết
        const absentPastShifts = await StaffShift.find({
            status: 'scheduled',
            shiftDate: { $lt: today }
        });

        for (const shift of absentPastShifts) {
            shift.status = 'absent';
            await shift.save();
            console.log(`[CRON] Đánh vắng ca cũ ${shift._id} (staff: ${shift.staff}, date: ${shift.shiftDate})`);
        }

        // ═══ 3. CẢNH BÁO ĐƠN TREO — pending > 15 phút, chưa ai nhận ═══
        // Dùng _staleAlertedAt === null để phân biệt chưa-bao-giờ-alert vs đã-alert
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const staleOrders = await Order.find({
            orderStatus: 'pending',
            processedBy: null,
            createdAt: { $lte: fifteenMinutesAgo },
            _staleAlertedAt: null  // chưa từng bị alert — tránh spam lặp
        }).select('_id orderCode totalAmount createdAt').lean();

        if (staleOrders.length > 0 && io) {
            // Đánh timestamp chống nhắc lặp
            const staleIds = staleOrders.map(o => o._id);
            await Order.updateMany(
                { _id: { $in: staleIds } },
                { _staleAlerted: true, _staleAlertedAt: new Date() }
            );

            // Gửi thông báo realtime cho phòng staff
            io.to('staff_room').emit('stale_orders_alert', {
                message: `Có ${staleOrders.length} đơn hàng chờ quá 15 phút chưa ai nhận!`,
                orders: staleOrders.map(o => ({
                    _id: o._id,
                    orderCode: o.orderCode,
                    totalAmount: o.totalAmount
                }))
            });

            console.log(`[CRON] Cảnh báo ${staleOrders.length} đơn treo > 15 phút`);
        }
    } catch (error) {
        console.error('[CRON] Lỗi khi chạy shift cron:', error.message);
    }
}

/**
 * Khởi chạy cron — gọi trong server.js sau khi kết nối DB
 */
function startShiftCron(io) {
    // Chạy lần đầu sau 10 giây
    setTimeout(() => runShiftCron(io), 10000);

    // Chạy mỗi 15 phút
    setInterval(() => runShiftCron(io), 15 * 60 * 1000);

    console.log('[CRON] Shift cron đã khởi động (mỗi 15 phút)');
}

module.exports = { startShiftCron, runShiftCron };
