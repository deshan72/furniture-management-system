import express from 'express';
import {
  getCashTransactions,
  addCashTransaction,
  getDaySummary,
} from '../controllers/cashbookController.js';

const router = express.Router();

router.route('/transactions')
  .get(getCashTransactions)
  .post(addCashTransaction);

router.route('/day-summary')
  .get(getDaySummary);

export default router;
