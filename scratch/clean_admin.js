const fs = require('fs');

let code = fs.readFileSync('src/controllers/adminController.js', 'utf8');

// 1. Remove imports
code = code.replace(/const StaffShift = require\('\.\.\/models\/StaffShift'\);\n/, '');
code = code.replace(/const { buildShiftWindow, localDateString, localMinutes, isShiftActiveNow } = require\('\.\.\/utils\/staffShift'\);\n/, '');

// 2. Remove utility functions
code = code.replace(/function groupShiftsByStaff[\s\S]*?return staffList\.map\(\(staff\) => \{[\s\S]*?\}\);\n\}\n/g, '');

// 3. Remove getStaff ... deleteStaffShift endpoints
code = code.replace(/\/\/ Staff\nexports\.getStaff = async \(req, res\) => \{[\s\S]*?exports\.deleteStaffShift = async \(req, res\) => \{[\s\S]*?\} catch \(error\) \{\n\s+res\.status\(500\)\.json\(\{ message: error\.message \}\);\n\s+\}\n\};\n/g, '');

// 4. Remove StaffShift from getDashboard
code = code.replace(/StaffShift\.find\(\{ shiftDate: \{ \$gte: from, \$lte: to \} \}\)\s*\.populate\('staff', 'name email phone avatar status role'\)\s*\.lean\(\),/g, 'Promise.resolve([]),');
code = code.replace(/const decorated = decorateStaffWithShifts\(staffList, shifts\);/g, 'const decorated = staffList;');

// 5. Save back
fs.writeFileSync('src/controllers/adminController.js', code);
console.log('Cleaned adminController.js');
