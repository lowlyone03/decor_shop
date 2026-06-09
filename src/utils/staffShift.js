function localDateString(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

function localMinutes(date) {
    const d = new Date(date);
    return d.getHours() * 60 + d.getMinutes();
}

function isShiftActiveNow(shift, now = new Date()) {
    if (shift.shiftDate !== localDateString(now)) return false;
    const mins = localMinutes(now);
    return mins >= shift.startMinute && mins < shift.endMinute;
}

module.exports = {
    localDateString,
    localMinutes,
    isShiftActiveNow
};
