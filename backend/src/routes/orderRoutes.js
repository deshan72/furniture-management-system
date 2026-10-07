import express from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  addOrderPayment,
} from '../controllers/ordersController.js';

const router = express.Router();

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrderById);

router.route('/:id/payments')
  .post(addOrderPayment);

export default router;
