const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'bills.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            consumer_number TEXT NOT NULL UNIQUE,
            account_nickname TEXT NOT NULL,
            official_vpa TEXT,
            portal_url TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            late_fine_amount REAL DEFAULT 0,
            FOREIGN KEY(account_id) REFERENCES accounts(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS payment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER,
            paid_date TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            FOREIGN KEY(bill_id) REFERENCES bills(id)
        )`);
    });
}

// Helper methods to wrap standard sqlite3 callbacks into promises for Express
db.asyncAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.asyncGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.asyncRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

module.exports = db;