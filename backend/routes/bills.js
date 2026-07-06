const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateNotificationPhase } = require('../services/notifications');
const { chromium } = require('playwright'); 

// =========================================================================
// 1. DYNAMIC REAL-TIME PORTAL TARGET FETCHERS (Browser Automation Engine)
// =========================================================================
async function autoTrackBillFromPortal(account) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  let baseAmount = 0;
  let fineAmount = 50.00; 
  let generatedDueDate = new Date().toISOString().split('T')[0];

  try {
    // 💡 AUTOMATION ENGINE BRANCH 1: TAMIL NADU (TNEB / TNPDCL)
    if (account.category === 'Electricity' && 
       (account.portal_url.includes('tangedco') || account.portal_url.includes('tnpdcl') || account.portal_url.includes('tnebnet'))) {
      console.log(`[SECURE ACC] Account ${account.consumer_number} requires active Captcha step. Directing to manual dashboard routing.`);
      baseAmount = 0; 
    } 
    
    // 💡 AUTOMATION ENGINE BRANCH 2: NORTH BIHAR (NBPDCL)
    else if (account.category === 'Electricity' && account.portal_url.includes('nbpdcl')) {
      await page.goto('https://www.nbpdcl.co.in/(S(vi3g5qszjdw1m441mkvz50id))/QuickBillPayment.aspx');
      
      await page.fill('#txtConsumerNumber', account.consumer_number);
      await page.click('#btnSubmit');
      
      await page.waitForSelector('#lblAmountDue', { timeout: 15000 });
      const rawTextAmount = await page.$eval('#lblAmountDue', el => el.innerText);
      baseAmount = parseFloat(rawTextAmount.replace(/[^0-9.]/g, ''));
    }

    if (baseAmount > 0) {
      const existingBill = await db.asyncGet(
        "SELECT * FROM bills WHERE account_id = ? AND status = 'pending'", 
        [account.id]
      );
      
      if (!existingBill) {
        await db.asyncRun(
          `INSERT INTO bills (account_id, amount, due_date, status, late_fine_amount) VALUES (?, ?, ?, 'pending', ?)`,
          [account.id, baseAmount, generatedDueDate, fineAmount]
        );
      } else {
        await db.asyncRun(`UPDATE bills SET amount = ? WHERE id = ?`, [baseAmount, existingBill.id]);
      }
    }
  } catch (error) {
    console.error(`Could not read real-time data for consumer account ${account.consumer_number}:`, error.message);
  } finally {
    await browser.close(); 
  }
}

// =========================================================================
// 2. GET ALL REGISTERED ACCOUNTS (Master Inventory API Endpoint)
// =========================================================================
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await db.asyncAll('SELECT * FROM accounts ORDER BY account_nickname ASC');
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 3. TRIGGER CRON SWEEP + SCRAPE INSTANTLY
// =========================================================================
router.post('/run-cron', async (req, res) => {
  try {
    const accounts = await db.asyncAll('SELECT * FROM accounts');
    for (const account of accounts) {
      await autoTrackBillFromPortal(account);
    }
    res.json({ success: true, message: "Auto-track sync complete against vendor portals." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 4. GET DASHBOARD METRICS & FILTERED DATA MATRIX
// =========================================================================
router.get('/dashboard', async (req, res) => {
  const { nickname, category, status } = req.query;
  try {
    const accounts = await db.asyncAll('SELECT * FROM accounts');
    
    const nicknames = [...new Set((accounts || []).map(a => a.account_nickname).filter(Boolean))];
    const defaultCategories = ['Electricity', 'Water', 'Gas', 'Internet', 'Municipal/Home Tax', 'Sewage Tax', 'Credit Card Charges', 'Insurance Premiums', 'Loan EMIs'];
    const dbCategories = (accounts || []).map(a => a.category).filter(Boolean);
    const combinedCategories = [...new Set([...defaultCategories, ...dbCategories])];

    let query = `
      SELECT bills.*, accounts.account_nickname, accounts.category, accounts.consumer_number, accounts.official_vpa, accounts.portal_url 
      FROM bills 
      JOIN accounts ON bills.account_id = accounts.id
      WHERE 1=1
    `;
    let params = [];

    if (nickname) { query += ` AND accounts.account_nickname = ?`; params.push(nickname); }
    if (category) { query += ` AND accounts.category = ?`; params.push(category); }
    if (status) { query += ` AND bills.status = ?`; params.push(status); }

    const rawBills = await db.asyncAll(query, params);
    
    const billsWithPhases = rawBills.map(bill => ({
      ...bill,
      notification_phase: calculateNotificationPhase(bill.due_date)
    }));

    const pendingBills = billsWithPhases.filter(b => b.status === 'pending');
    const totalPendingAmount = pendingBills.reduce((sum, b) => sum + b.amount, 0);
    const activeAlertsCount = billsWithPhases.filter(b => b.status === 'pending' && ['ACTION', 'URGENT', 'OVERDUE'].includes(b.notification_phase)).length;

    res.json({
      nicknames,
      categories: combinedCategories,
      bills: billsWithPhases,
      totalPendingAmount,
      totalPendingCount: pendingBills.length,
      accountsCount: nicknames.length, 
      activeAlertsCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 5. POST NEW ACCOUNT ENTRY
// =========================================================================
router.post('/accounts', async (req, res) => {
  const { category, consumer_number, account_nickname, official_vpa, portal_url } = req.body;
  try {
    const result = await db.asyncRun(
      `INSERT INTO accounts (category, consumer_number, account_nickname, official_vpa, portal_url) VALUES (?, ?, ?, ?, ?)`,
      [category, consumer_number, account_nickname, official_vpa || '', portal_url || '']
    );
    
    const newAccount = { id: result.lastID, category, consumer_number, portal_url: portal_url || '' };
    await autoTrackBillFromPortal(newAccount);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 6. POST MANUAL BILL LOG STATEMENT
// =========================================================================
router.post('/', async (req, res) => {
  const { account_id, amount, due_date, late_fine_amount } = req.body;
  try {
    await db.asyncRun(
      `INSERT INTO bills (account_id, amount, due_date, status, late_fine_amount) VALUES (?, ?, ?, 'pending', ?)`,
      [account_id, amount, due_date, late_fine_amount || 0]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 7. SETTLE BILL MANUALLY
// =========================================================================
router.post('/:id/pay', async (req, res) => {
  const { id } = req.params;
  const today = new Date().toISOString().split('T')[0];
  try {
    await db.asyncRun(`UPDATE bills SET status = 'paid' WHERE id = ?`, [id]);
    await db.asyncRun(`INSERT INTO payment_history (bill_id, paid_date, payment_method) VALUES (?, ?, ?)`, [id, today, 'Instant Gateway Intent']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 8. REMOVE AN ACCOUNT LINE AND CLEAN UP PENDING LANDSCAPE STATEMENTS
// =========================================================================
router.delete('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.asyncRun(`DELETE FROM accounts WHERE id = ?`, [id]);
    await db.asyncRun(`DELETE FROM bills WHERE account_id = ? AND status = 'pending'`, [id]);
    res.json({ success: true, message: "Account landscape node purged cleanly from disk database." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;