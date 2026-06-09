require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function updateAvatars() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await User.updateMany(
            { role: 'staff' },
            { $set: { avatar: '/images/logo/logo1.jpg' } }
        );
        console.log(`Updated ${result.modifiedCount} staff avatars.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateAvatars();
