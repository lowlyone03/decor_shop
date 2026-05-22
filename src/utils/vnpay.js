const crypto = require('crypto');

const VNPAY_VERSION = '2.1.0';
const DEFAULT_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

function pad(value) {
    return String(value).padStart(2, '0');
}

function formatVnpayDate(date = new Date()) {
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join('');
}

function sortObject(params = {}) {
    const sorted = {};
    const keys = Object.keys(params)
        .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
        .sort()
        .map((key) => encodeURIComponent(key));

    keys.forEach((encodedKey) => {
        sorted[encodedKey] = encodeURIComponent(String(params[encodedKey])).replace(/%20/g, '+');
    });

    return sorted;
}

function stringifyParams(params = {}) {
    return Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join('&');
}

function hmacSha512(data) {
    if (!process.env.VNPAY_HASH_SECRET) {
        throw new Error('Missing VNPAY_HASH_SECRET configuration.');
    }
    return crypto
        .createHmac('sha512', process.env.VNPAY_HASH_SECRET)
        .update(Buffer.from(data, 'utf-8'))
        .digest('hex');
}

function getVnpayReturnUrl(req) {
    if (process.env.VNPAY_RETURN_URL) return process.env.VNPAY_RETURN_URL;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}/api/payments/vnpay-return`;
}

function createVnpayPaymentUrl({ order, req }) {
    if (!process.env.VNPAY_TMN_CODE) {
        throw new Error('Missing VNPAY_TMN_CODE configuration.');
    }

    const createDate = new Date();
    const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000);
    const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ipAddr = forwardedFor || req.socket?.remoteAddress || '127.0.0.1';

    const params = sortObject({
        vnp_Version: VNPAY_VERSION,
        vnp_Command: 'pay',
        vnp_TmnCode: process.env.VNPAY_TMN_CODE,
        vnp_Amount: Math.round(Number(order.totalAmount || 0)) * 100,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: order.orderCode,
        vnp_OrderInfo: `Thanh-toan-don-hang-${order.orderCode}`,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: getVnpayReturnUrl(req),
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: formatVnpayDate(createDate),
        vnp_ExpireDate: formatVnpayDate(expireDate),
        vnp_BankCode: process.env.VNPAY_BANK_CODE
    });

    const signData = stringifyParams(params);
    params.vnp_SecureHash = hmacSha512(signData);

    return `${process.env.VNPAY_URL || DEFAULT_PAYMENT_URL}?${stringifyParams(params)}`;
}

function verifyVnpayReturn(query = {}) {
    const params = { ...query };
    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sortedParams = sortObject(params);
    const checkHash = hmacSha512(stringifyParams(sortedParams));

    return {
        valid: secureHash === checkHash,
        params: sortedParams
    };
}

module.exports = {
    createVnpayPaymentUrl,
    verifyVnpayReturn,
    sortObject,
    stringifyParams,
    formatVnpayDate
};
