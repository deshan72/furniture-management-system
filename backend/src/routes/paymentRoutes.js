import express from 'express';
import {
  getPayments,
  createPayment,
  deletePayment,
  getDailyPayments,
  createDailyPayment,
  deleteDailyPayment,
  getMonthlyPayments,
  createMonthlyPayment,
  deleteMonthlyPayment,
} from '../controllers/paymentsController.js';

const router = express.Router();

// 1. Daily Center Payments (දිනපතා මධ්‍යස්ථාන මුදල් එකතු කිරීම්)
router.route('/daily')
  .get(getDailyPayments)
  .post(createDailyPayment);

router.route('/daily/:id')
  .delete(deleteDailyPayment);

// 2. Monthly Installment Payments (මාසික ණය වාරික සහ අත්තිකාරම් පියවීම්)
router.route('/monthly')
  .get(getMonthlyPayments)
  .post(createMonthlyPayment);

router.route('/monthly/:id')
  .delete(deleteMonthlyPayment);

// 3. Unified Payments (Legacy / unified ledger view)
router.route('/')
  .get(getPayments)
  .post(createPayment);

router.route('/:id')
  .delete(deletePayment);

export default router;
