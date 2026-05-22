module.exports = {
  // Sử dụng môi trường Node.js cho backend
  testEnvironment: 'node',

  // Đường dẫn tìm kiếm các file test
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Bỏ qua thư mục node_modules
  testPathIgnorePatterns: [
    '/node_modules/'
  ],

  // Thiết lập thu thập báo cáo độ bao phủ mã nguồn (code coverage)
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!scripts/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov']
};
