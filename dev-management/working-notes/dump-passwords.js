const fs = require('fs');
const Database = require('better-sqlite3');

// 复制一份 sqlite-export.bin，重命名为 test.db
fs.copyFileSync('sqlite-export.bin', 'test.db');

// 用 better-sqlite3 读取
const db = new Database('test.db');
const rows = db.prepare('SELECT * FROM user_passwords').all();
console.log(rows);