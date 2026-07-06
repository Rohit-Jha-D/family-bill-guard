const cron = require('node-cron');
const db = require('../db');
const { calculateNotificationPhase } = require('./notifications');

async function runSweep() {
  console.log('⏰ Running scheduled bill notification sweep...');
  try {
    // Select pending bills along with account details
    const query = `
      SELECT bills.*, accounts.account_nickname, accounts.category 
      FROM bills 
      JOIN accounts ON bills.account_id = accounts.id 
      WHERE bills.status = 'pending'
    `;
    
    // Using our async database helper
    const bills = await db.asyncAll(query);
    
    if (!bills || bills.length === 0) {
      console.log('✨ No pending bills to alert.');
      return;
    }

    for (const bill of bills) {
      const phase = calculateNotificationPhase(bill.due_date);
      
      console.log(`[ALERT CHECK] Account: ${bill.account_nickname} (${bill.category})`);
      console.log(`  - Amount: ₹${bill.amount}`);
      console.log(`  - Due Date: ${bill.due_date}`);
      console.log(`  - Triggered Status: ${phase}`);
      
      if (phase === 'ACTION' || phase === 'URGENT') {
        const totalWithFine = bill.amount + (bill.late_fine_amount || 0);
        console.log(`  ⚠️ WARNING: Fines applicable! Total if late: ₹${totalWithFine}`);
      }
      console.log('--------------------------------------------------');
    }
  } catch (error) {
    console.error('❌ Error during bill notification sweep:', error.message);
  }
}

function startCronJob() {
  // Run sweep instantly on startup to check edge cases
  runSweep();

  // Schedule to run every day at midnight
  cron.schedule('0 0 * * *', () => {
    runSweep();
  });
}

module.exports = { startCronJob };