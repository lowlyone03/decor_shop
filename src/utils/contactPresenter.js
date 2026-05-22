const User = require('../models/User');

function normalizeDoc(doc) {
    if (!doc) return null;
    return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

function publicCustomer(user) {
    if (!user) return null;
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar
    };
}

async function hydrateContactsWithCustomers(items = []) {
    const contacts = items.map(normalizeDoc).filter(Boolean);
    if (!contacts.length) return contacts;

    const missingEmails = contacts
        .filter((contact) => !contact.customer || typeof contact.customer !== 'object' || (!contact.customer.email && !contact.customer.name && !contact.customer.avatar))
        .map((contact) => String(contact.email || '').toLowerCase().trim())
        .filter(Boolean);

    let usersByEmail = new Map();
    if (missingEmails.length) {
        const users = await User.find({ email: { $in: [...new Set(missingEmails)] } })
            .select('name email phone avatar')
            .lean();
        usersByEmail = new Map(users.map((user) => [String(user.email || '').toLowerCase(), publicCustomer(user)]));
    }

    return contacts.map((contact) => {
        const populatedCustomer = contact.customer && typeof contact.customer === 'object' && (contact.customer.email || contact.customer.name || contact.customer.avatar)
            ? publicCustomer(contact.customer)
            : usersByEmail.get(String(contact.email || '').toLowerCase()) || null;
        const customerAvatar = populatedCustomer?.avatar || contact.customerAvatar || '';
        return {
            ...contact,
            customer: populatedCustomer || contact.customer,
            customerAvatar,
            replies: (contact.replies || []).map((reply) => ({
                ...reply,
                senderAvatar: reply.senderAvatar || (reply.sender === 'customer' ? customerAvatar : '')
            }))
        };
    });
}

async function hydrateContactWithCustomer(contact) {
    const [item] = await hydrateContactsWithCustomers([contact]);
    return item || null;
}

module.exports = {
    hydrateContactsWithCustomers,
    hydrateContactWithCustomer
};
