const TIMEZONE = 'Asia/Ho_Chi_Minh';

function localDateString(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function localMinutes(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});
    return Number(parts.hour) * 60 + Number(parts.minute);
}

function normalizeShiftDate(value) {
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return localDateString(parsed);
}

function minutesFromTime(value) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

function timeFromMinutes(minutes) {
    const safe = Math.max(0, Math.min(1440, Number(minutes) || 0));
    const hour = Math.floor(safe / 60);
    const minute = safe % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildShiftWindow({ shiftDate, startTime, durationHours }) {
    const date = normalizeShiftDate(shiftDate);
    const startMinute = minutesFromTime(startTime);
    const duration = Number(durationHours);
    if (!date) return { error: 'Ngay lam viec khong hop le.' };
    if (startMinute === null) return { error: 'Gio bat dau ca khong hop le.' };
    if (![4, 8].includes(duration)) return { error: 'Moi ca chi duoc 4 gio hoac 8 gio.' };

    const endMinute = startMinute + duration * 60;
    if (endMinute > 24 * 60) return { error: 'Ca lam khong duoc qua 24:00.' };

    return {
        shiftDate: date,
        startTime: timeFromMinutes(startMinute),
        endTime: timeFromMinutes(endMinute),
        startMinute,
        endMinute,
        durationHours: duration
    };
}

function isShiftActiveNow(shift, now = new Date()) {
    if (!shift || !['scheduled', 'active'].includes(shift.status)) return false;
    return shift.shiftDate === localDateString(now)
        && Number(shift.startMinute) <= localMinutes(now)
        && Number(shift.endMinute) > localMinutes(now);
}

module.exports = {
    TIMEZONE,
    localDateString,
    localMinutes,
    normalizeShiftDate,
    minutesFromTime,
    timeFromMinutes,
    buildShiftWindow,
    isShiftActiveNow
};
