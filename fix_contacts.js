require('mongoose').connect('mongodb://127.0.0.1:27017/decor_shop').then(async () => {
    const Contact = require('./src/models/Contact');
    await Contact.updateMany({}, { $unset: { assignedTo: 1 } });
    console.log('Fixed DB contacts');
    process.exit(0);
});
