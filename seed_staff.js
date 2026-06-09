const mongoose = require('mongoose');
const User = require('./src/models/User');
const { hashPassword } = require('./src/utils/crypto');
const connectDB = require('./src/config/db');

require('dotenv').config({ path: './.env' });

async function seed() {
    await connectDB();
    
    const staffs = [
        { name: 'Nguyễn Văn Nam', email: 'nam.staff@casadecor.com', phone: '0901234567', staffCode: 'NV01', baseSalaryPerHour: 50000 },
        { name: 'Trần Thị Mai', email: 'mai.staff@casadecor.com', phone: '0901234568', staffCode: 'NV02', baseSalaryPerHour: 50000 },
        { name: 'Lê Hoàng Bách', email: 'bach.staff@casadecor.com', phone: '0901234569', staffCode: 'NV03', baseSalaryPerHour: 50000 },
        { name: 'Phạm Thu Thủy', email: 'thuy.staff@casadecor.com', phone: '0901234570', staffCode: 'NV04', baseSalaryPerHour: 50000 }
    ];

    const passwordHash = hashPassword('123456');

    for (const s of staffs) {
        const existing = await User.findOne({ email: s.email });
        if (!existing) {
            await User.create({
                ...s,
                password: passwordHash,
                role: 'staff',
                status: 'active'
            });
            console.log('Created:', s.email);
        } else {
            console.log('Already exists:', s.email);
            existing.password = passwordHash;
            existing.role = 'staff';
            await existing.save();
        }
    }
    
    console.log('Seeding done.');
    process.exit(0);
}

seed();
