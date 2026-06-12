const fs = require('fs');
const path = require('path');
const dir = 'd:/BTL/decor_shop/decor_shop/public/management';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let updatedCount = 0;
files.forEach(f => {
    const filePath = path.join(dir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add staff-report before Báo cáo & Thống kê
    if (!content.includes('staff-report.html') && content.includes('<p>Báo cáo & Thống kê</p>')) {
        content = content.replace(
            /<p>Báo cáo & Thống kê<\/p>/g,
            '<a href="/management/staff-report.html" data-view="staff-report"><i class="fa-solid fa-chart-pie"></i> Báo cáo ca trực</a>\n\n            <p>Báo cáo & Thống kê</p>'
        );
        fs.writeFileSync(filePath, content);
        updatedCount++;
    }
});

console.log(`Updated ${updatedCount} files.`);
