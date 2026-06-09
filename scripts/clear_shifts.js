require('dotenv').config();
const mongoose = require('mongoose');
const StaffShift = require('../src/models/StaffShift');

async function clearShifts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const result = await StaffShift.deleteMany({});
        console.log(`Deleted ${result.deletedCount} shift records.`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearShifts();
