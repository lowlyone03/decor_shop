const fs = require('fs');

let code = fs.readFileSync('public/admin/schedule.html', 'utf8');

// Replace stats section
code = code.replace(/<div class="stat-card">\s*<div class="stat-icon icon-orange"><i class="fa-regular fa-sun"><\/i><\/div>\s*<div class="stat-info">\s*<h3>Ca sáng<\/h3>\s*<div class="stat-value" id="statMorning">0<\/div>\s*<small>08:00 - 12:00<\/small>\s*<\/div>\s*<\/div>\s*<div class="stat-card">\s*<div class="stat-icon icon-orange"><i class="fa-solid fa-sun"><\/i><\/div>\s*<div class="stat-info">\s*<h3>Ca chiều<\/h3>\s*<div class="stat-value" id="statAfternoon">0<\/div>\s*<small>13:00 - 17:00<\/small>\s*<\/div>\s*<\/div>\s*<div class="stat-card">\s*<div class="stat-icon icon-purple"><i class="fa-regular fa-moon"><\/i><\/div>\s*<div class="stat-info">\s*<h3>Ca tối<\/h3>\s*<div class="stat-value" id="statEvening">0<\/div>\s*<small>17:00 - 21:00<\/small>\s*<\/div>\s*<\/div>/,
    `<div class="stat-card">
                    <div class="stat-icon icon-orange"><i class="fa-regular fa-sun"></i></div>
                    <div class="stat-info">
                        <h3>Ca 1</h3>
                        <div class="stat-value" id="statMorning">0</div>
                        <small>00:00 - 06:00</small>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon icon-orange"><i class="fa-solid fa-sun"></i></div>
                    <div class="stat-info">
                        <h3>Ca 2</h3>
                        <div class="stat-value" id="statAfternoon">0</div>
                        <small>06:00 - 12:00</small>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon icon-purple"><i class="fa-regular fa-moon"></i></div>
                    <div class="stat-info">
                        <h3>Ca 3</h3>
                        <div class="stat-value" id="statEvening">0</div>
                        <small>12:00 - 18:00</small>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon icon-purple" style="background:#e0e7ff;color:#4f46e5;"><i class="fa-solid fa-moon"></i></div>
                    <div class="stat-info">
                        <h3>Ca 4</h3>
                        <div class="stat-value" id="statNight">0</div>
                        <small>18:00 - 24:00</small>
                    </div>
                </div>`
);

// Replace form options
code = code.replace(/<option value="08:00">08:00 — Ca sáng<\/option>\s*<option value="13:00">13:00 — Ca chiều<\/option>\s*<option value="17:00">17:00 — Ca tối<\/option>/,
    `<option value="00:00">00:00 — Ca 1</option>
                        <option value="06:00">06:00 — Ca 2</option>
                        <option value="12:00">12:00 — Ca 3</option>
                        <option value="18:00">18:00 — Ca 4</option>`
);
code = code.replace(/<option value="4">4 giờ<\/option>\s*<option value="8">8 giờ<\/option>/,
    `<option value="6">6 giờ</option>`
);

// Replace Auto Assign Modal Description
code = code.replace(/Hệ thống sẽ tự động phân ca <b>Ca sáng \(08:00\)<\/b>, <b>Ca chiều \(13:00\)<\/b>, <b>Ca tối \(17:00\)<\/b> — mỗi ca 4 giờ — đều đặn cho tất cả nhân viên trong khoảng thời gian bên dưới\./,
    `Hệ thống sẽ tự động phân <b>4 ca</b> (Ca 1, Ca 2, Ca 3, Ca 4) — mỗi ca 6 giờ — đều đặn cho tất cả nhân viên theo vòng lặp luân phiên tiếp nối.`
);

// Replace JS Shift counter
code = code.replace(/let m=0, a=0, e=0;\s*data\.shifts\.forEach\(s => \{\s*if \(s\.startMinute < 780\) m\+\+; \/\/ before 13:00 -> morning\s*else if \(s\.startMinute < 1020\) a\+\+; \/\/ before 17:00 -> afternoon\s*else e\+\+;\s*\}\);\s*document\.getElementById\('statMorning'\)\.innerText = m;\s*document\.getElementById\('statAfternoon'\)\.innerText = a;\s*document\.getElementById\('statEvening'\)\.innerText = e;/,
    `let c1=0, c2=0, c3=0, c4=0;
                    data.shifts.forEach(s => {
                        if (s.startMinute === 0) c1++;
                        else if (s.startMinute === 360) c2++;
                        else if (s.startMinute === 720) c3++;
                        else c4++;
                    });
                    document.getElementById('statMorning').innerText = c1;
                    document.getElementById('statAfternoon').innerText = c2;
                    document.getElementById('statEvening').innerText = c3;
                    if (document.getElementById('statNight')) document.getElementById('statNight').innerText = c4;`
);

// Replace JS Table badge rendering
code = code.replace(/let cls = shift\.startMinute < 780 \? 'shift-morning' : \(shift\.startMinute < 1020 \? 'shift-afternoon' : 'shift-evening'\);\s*let name = shift\.startMinute < 780 \? 'Ca sáng' : \(shift\.startMinute < 1020 \? 'Ca chiều' : 'Ca tối'\);/,
    `let cls = shift.startMinute === 0 ? 'shift-morning' : (shift.startMinute === 360 ? 'shift-afternoon' : (shift.startMinute === 720 ? 'shift-evening' : 'shift-morning'));
                                let name = shift.startMinute === 0 ? 'Ca 1' : (shift.startMinute === 360 ? 'Ca 2' : (shift.startMinute === 720 ? 'Ca 3' : 'Ca 4'));`
);

// Replace JS Auto Assign Request
code = code.replace(/const caXoayVong = \['08:00', '13:00', '17:00'\];[\s\S]*?resEl\.style\.display = 'block';\s*\} catch \(err\) \{/g,
    `const response = await api('/admin/staff-shifts/auto-assign', {
                        method: 'POST',
                        body: JSON.stringify({ from: fromVal, to: toVal })
                    });
                    resEl.style.color = '#059669';
                    resEl.innerHTML = \`✔ \${response.message}
                        <br><a href="" style="color:#c48c71; font-weight:600;">↻ Tải lại trang để xem kết quả</a>\`;
                    resEl.style.display = 'block';
                } catch (err) {`
);

// Delete the Nghỉ phép card from the stats grid
code = code.replace(/<div class="stat-card">\s*<div class="stat-icon icon-red"><i class="fa-regular fa-calendar-xmark"><\/i><\/div>\s*<div class="stat-info">\s*<h3>Nghỉ phép<\/h3>\s*<div class="stat-value" id="statOff">0<\/div>\s*<small>Đã duyệt<\/small>\s*<\/div>\s*<\/div>/, '');


fs.writeFileSync('public/admin/schedule.html', code);
console.log('Updated schedule.html');
