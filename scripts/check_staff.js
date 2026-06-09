require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function cleanOldStaff() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Delete staff users that have staffCode undefined
        const result = await User.deleteMany({ role: 'staff', staffCode: { $exists: false } });
        console.log(`Deleted ${result.deletedCount} old staff users (with undefined code).`);

        const remainingStaff = await User.find({ role: 'staff' });
        console.log(`\nRemaining ${remainingStaff.length} staff users:`);
        remainingStaff.forEach(s => console.log(`- ${s.name} (${s.email}, code: ${s.staffCode})`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanOldStaff();
