const fs = require('fs');
const codeToAppend = `

// ── Staff & Auto Schedule ──────────────────────────────────────
function groupShiftsByStaff(shifts = []) {
    const map = new Map();
    for (const shift of shifts) {
        const staffId = String(shift.staff?._id || shift.staff);
        if (!map.has(staffId)) map.set(staffId, []);
        map.get(staffId).push(shift);
    }
    return map;
}

function decorateStaffWithShifts(staffList = [], shifts = []) {
    const byStaff = groupShiftsByStaff(shifts);
    return staffList.map((staff) => {
        const staffShifts = (byStaff.get(String(staff._id)) || []).sort((a, b) => {
            if (a.shiftDate !== b.shiftDate) return a.shiftDate.localeCompare(b.shiftDate);
            return a.startMinute - b.startMinute;
        });
        const currentShift = staffShifts.find((shift) => isShiftActiveNow(shift));
        const nextShift = staffShifts.find((shift) => {
            const now = new Date();
            if (shift.shiftDate < localDateString(now)) return false;
            if (shift.shiftDate === localDateString(now)) return shift.startMinute > localMinutes(now);
            return true;
        });
        return {
            ...staff,
            shifts: staffShifts,
            currentShift,
            nextShift
        };
    });
}

exports.getStaff = async (req, res) => {
    try {
        const from = req.query.from || localDateString(new Date());
        const to = req.query.to || localDateString(new Date());

        const [staffList, total, shifts] = await Promise.all([
            User.find({ role: { $in: ['staff', 'admin'] } }).select('-password').sort({ createdAt: -1 }).lean(),
            User.countDocuments({ role: { $in: ['staff', 'admin'] } }),
            StaffShift.find({ shiftDate: { $gte: from, $lte: to } })
                .populate('staff', 'name email phone avatar status role')
                .sort({ shiftDate: 1, startMinute: 1 })
                .lean()
        ]);

        const decorated = decorateStaffWithShifts(staffList, shifts);

        const scheduledStaffIds = new Set(shifts.map(s => String(s.staff._id || s.staff)));
        const scheduledToday = new Set();
        const todayStr = localDateString(new Date());
        shifts.forEach(s => {
            if (s.shiftDate === todayStr) scheduledToday.add(String(s.staff._id || s.staff));
        });

        res.json({
            staff: decorated,
            shifts: shifts,
            stats: {
                total,
                active: staffList.filter((item) => item.status === 'active').length,
                scheduledAny: scheduledStaffIds.size,
                scheduledToday: scheduledToday.size
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createStaffShift = async (req, res) => {
    try {
        const { staff, shiftDate, startTime, durationHours, note } = req.body;
        
        let startMins = 0;
        if (startTime === '00:00') startMins = 0;
        else if (startTime === '06:00') startMins = 360;
        else if (startTime === '12:00') startMins = 720;
        else if (startTime === '18:00') startMins = 1080;
        else throw new Error('Giờ bắt đầu không hợp lệ (Phải là 00:00, 06:00, 12:00, 18:00)');
        
        const endMins = startMins + 360;
        const endTimeHours = Math.floor(endMins / 60);
        const endTime = endTimeHours === 24 ? '23:59' : \`\${String(endTimeHours).padStart(2, '0')}:00\`;

        const conflict = await StaffShift.findOne({
            staff, shiftDate, startMinute: { $lt: endMins }, endMinute: { $gt: startMins }
        });
        if (conflict) {
            return res.status(400).json({ message: 'Nhân viên đã có ca trùng lặp trong khoảng thời gian này.' });
        }

        const shift = await StaffShift.create({
            staff,
            shiftDate,
            startTime,
            endTime,
            startMinute: startMins,
            endMinute: endMins,
            durationHours: 6,
            payRate: 50000,
            totalPay: 300000,
            note
        });

        const populated = await StaffShift.findById(shift._id).populate('staff', 'name email phone avatar status role').lean();
        res.status(201).json({ message: 'Tạo ca làm thành công.', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStaffShift = async (req, res) => {
    try {
        const existing = await StaffShift.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Không tìm thấy ca làm việc.' });

        if (req.body.staff) existing.staff = req.body.staff;
        if (req.body.shiftDate) existing.shiftDate = req.body.shiftDate;
        if (req.body.startTime) {
            const startTime = req.body.startTime;
            let startMins = 0;
            if (startTime === '00:00') startMins = 0;
            else if (startTime === '06:00') startMins = 360;
            else if (startTime === '12:00') startMins = 720;
            else if (startTime === '18:00') startMins = 1080;
            else throw new Error('Giờ bắt đầu không hợp lệ');
            existing.startTime = startTime;
            existing.startMinute = startMins;
            existing.endMinute = startMins + 360;
            existing.endTime = startMins === 1080 ? '23:59' : \`\${String((startMins+360)/60).padStart(2, '0')}:00\`;
        }
        if (req.body.note !== undefined) existing.note = req.body.note;

        const conflict = await StaffShift.findOne({
            _id: { $ne: existing._id },
            staff: existing.staff,
            shiftDate: existing.shiftDate,
            startMinute: { $lt: existing.endMinute },
            endMinute: { $gt: existing.startMinute }
        });
        if (conflict) {
            return res.status(400).json({ message: 'Ca làm sửa đổi bị trùng với ca khác.' });
        }

        await existing.save();
        const populated = await StaffShift.findById(existing._id).populate('staff', 'name email phone avatar status role').lean();
        res.json({ message: 'Cập nhật thành công.', shift: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteStaffShift = async (req, res) => {
    try {
        const shift = await StaffShift.findByIdAndDelete(req.params.id);
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca.' });
        res.json({ message: 'Đã xóa ca làm việc.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.autoAssignShifts = async (req, res) => {
    try {
        const { from, to } = req.body;
        if (!from || !to || from > to) {
            return res.status(400).json({ message: 'Khoảng thời gian không hợp lệ.' });
        }

        // Fetch active staff list
        const staffList = await User.find({ role: { $in: ['admin', 'staff'] }, status: 'active' }).select('_id name').sort({ createdAt: 1 }).lean();
        if (staffList.length === 0) {
            return res.status(400).json({ message: 'Không có nhân viên nào đang hoạt động.' });
        }
        
        const N = staffList.length;

        // Base epoch date (e.g. 2024-01-01)
        const epoch = new Date('2024-01-01T00:00:00Z');
        
        let currentDate = new Date(from);
        const endDate = new Date(to);
        
        let created = 0;
        let skipped = 0;
        
        const shiftsToCreate = [];
        const times = ['00:00', '06:00', '12:00', '18:00'];
        const startMinsList = [0, 360, 720, 1080];
        
        while (currentDate <= endDate) {
            const shiftDateStr = currentDate.toISOString().split('T')[0];
            const diffTime = currentDate.getTime() - epoch.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Starting index for this day
            const startIndex = diffDays % N;
            // Always assign 4 shifts
            for (let i = 0; i < 4; i++) {
                const staffIndex = (startIndex + i) % N;
                const targetStaff = staffList[staffIndex];
                
                const startTime = times[i];
                const startMins = startMinsList[i];
                const endMins = startMins + 360;
                const endTimeHours = Math.floor(endMins / 60);
                const endTime = endTimeHours === 24 ? '23:59' : \`\${String(endTimeHours).padStart(2, '0')}:00\`;
                
                // Check if shift already exists
                const conflict = await StaffShift.findOne({
                    staff: targetStaff._id,
                    shiftDate: shiftDateStr,
                    startMinute: { $lt: endMins },
                    endMinute: { $gt: startMins }
                });
                
                if (!conflict) {
                    await StaffShift.create({
                        staff: targetStaff._id,
                        shiftDate: shiftDateStr,
                        startTime,
                        endTime,
                        startMinute: startMins,
                        endMinute: endMins,
                        durationHours: 6,
                        payRate: 50000,
                        totalPay: 300000
                    });
                    created++;
                } else {
                    skipped++;
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({ message: \`Đã tạo \${created} ca mới, bỏ qua \${skipped} ca trùng lặp.\`, created, skipped });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

`;
fs.appendFileSync('src/controllers/adminController.js', codeToAppend);
console.log('Appended auto assignment logic.');
