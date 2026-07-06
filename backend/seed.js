const db = require('./db');

function seed() {
  // Give the database a moment to ensure tables are fully created
  setTimeout(async () => {
    console.log('🌱 Starting database seeding...');
    try {
      // Clear existing data safely
      await db.asyncRun('DELETE FROM payment_history');
      await db.asyncRun('DELETE FROM bills');
      await db.asyncRun('DELETE FROM accounts');

      // 1. Insert Accounts
      const acc1 = await db.asyncRun(
        `INSERT INTO accounts (category, consumer_number, account_nickname, official_vpa, portal_url) 
         VALUES (?, ?, ?, ?, ?)`,
        ['Electricity', '1004829112', 'My House', 'tneb@upi', 'https://www.tangedco.org']
      );

      const acc2 = await db.asyncRun(
        `INSERT INTO accounts (category, consumer_number, account_nickname, official_vpa, portal_url) 
         VALUES (?, ?, ?, ?, ?)`,
        ['Internet', 'BRD994821', 'My House', 'jio@upi', 'https://www.jio.com']
      );

      const acc3 = await db.asyncRun(
        `INSERT INTO accounts (category, consumer_number, account_nickname, official_vpa, portal_url) 
         VALUES (?, ?, ?, ?, ?)`,
        ['Electricity', '2008471192', "Parents' Home", 'bescom@upi', 'https://bescom.co.in']
      );

      // 2. Insert Bills mapped to their dates
      // Urgent Bill (24 Hours left)
      await db.asyncRun(
        `INSERT INTO bills (account_id, amount, due_date, status, late_fine_amount) VALUES (?, ?, ?, ?, ?)`,
        [acc1.lastID, 3420.00, new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0], 'pending', 250.00]
      );

      // Action Bill (3 Days left)
      await db.asyncRun(
        `INSERT INTO bills (account_id, amount, due_date, status, late_fine_amount) VALUES (?, ?, ?, ?, ?)`,
        [acc2.lastID, 849.00, new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0], 'pending', 50.00]
      );

      // Paid / Historic Bill
      const pastBill = await db.asyncRun(
        `INSERT INTO bills (account_id, amount, due_date, status, late_fine_amount) VALUES (?, ?, ?, ?, ?)`,
        [acc3.lastID, 1850.00, '2026-06-15', 'paid', 100.00]
      );

      // Record history entry for the paid bill
      await db.asyncRun(
        `INSERT INTO payment_history (bill_id, paid_date, payment_method) VALUES (?, ?, ?)`,
        [pastBill.lastID, '2026-06-12', 'Official UPI Intent']
      );

      console.log('✅ Database Seeding Complete! Safe sample entries created.');
      process.exit(0);

    } catch (error) {
      console.error('❌ Seeding Error:', error.message);
      process.exit(1);
    }
  }, 500); // Small delay to guarantee database setup lifecycle completed
}

seed();