import express from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  addOrderPayment,
} from '../controllers/ordersController.js';

const router = express.Router();

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrderById)
  .patch(updateOrder)
  .delete(deleteOrder);

router.route('/:id/payments')
  .post(addOrderPayment);

export default router;
