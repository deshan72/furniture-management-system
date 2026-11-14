import express from 'express';
import {
  getPayments,
  createPayment,
  deletePayment,
} from '../controllers/paymentsController.js';

const router = express.Router();

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.route('/:id')
  .delete(deletePayment);

export default router;

