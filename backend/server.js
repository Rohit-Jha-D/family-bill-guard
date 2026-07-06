const express = require('express');
const cors = require('cors');
const db = require('./db');
const billsRouter = require('./routes/bills');
const { startCronJob } = require('./services/cron');

const app = express();
const PORT = 4000;

// This allows your local browser files to securely talk to the backend server
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/bills', billsRouter);

app.listen(PORT, () => {
  console.log(`🚀 Family Bill Tracker API running at http://localhost:${PORT}`);
  startCronJob();
});