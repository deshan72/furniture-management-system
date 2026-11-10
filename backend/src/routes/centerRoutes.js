import express from 'express';
import {
  getCenters,
  getCenterById,
  createCenter,
  updateCenter,
  deleteCenter,
} from '../controllers/centersController.js';

const router = express.Router();

router.route('/')
  .get(getCenters)
  .post(createCenter);

router.route('/:id')
  .get(getCenterById)
  .put(updateCenter)
  .delete(deleteCenter);

export default router;

