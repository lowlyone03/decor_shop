const appCache = require('../cache');
const NodeCache = require('node-cache');

describe('Cache Utility Module', () => {
    test('should export an instance of NodeCache', () => {
        expect(appCache).toBeInstanceOf(NodeCache);
    });

    test('should set, get, and delete values successfully', () => {
        const key = 'test-key-cache';
        const value = { data: 'my-cache-value' };
        
        // Gán cache
        const setSuccess = appCache.set(key, value, 10);
        expect(setSuccess).toBe(true);
        
        // Lấy cache
        const retrievedValue = appCache.get(key);
        expect(retrievedValue).toEqual(value);
        
        // Xóa cache
        const deletedCount = appCache.del(key);
        expect(deletedCount).toBe(1);
        
        // Kiểm tra xem đã bị xóa chưa
        expect(appCache.get(key)).toBeUndefined();
    });
});
