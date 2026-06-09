require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ name: /Casa Decor Admin/i });
        users.forEach(u => console.log(`Name: ${u.name}, Role: ${u.role}, Status: ${u.status}`));
        
        // Let's also check all users just in case
        const allUsers = await User.find({}, 'name role status');
        console.log(`\nAll users:`);
        allUsers.forEach(u => console.log(`- ${u.name} (Role: ${u.role}, Status: ${u.status})`));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAdmin();
