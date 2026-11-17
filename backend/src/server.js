import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import centerRoutes from './routes/centerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import cashbookRoutes from './routes/cashbookRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { supabaseAdmin } from './config/supabase.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'D&S Furniture Management System API',
    timestamp: new Date().toISOString(),
  });
});

// Direct Image Upload endpoint to Supabase Storage (using service role, avoids RLS blocks)
app.post('/api/upload', async (req, res) => {
  try {
    const { image, prefix = 'img' } = req.body;
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Valid Base64 image data is required' });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid image format' });
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let ext = contentType.split('/')[1] || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    const cleanPrefix = (prefix || 'upload').replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('project product image')
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ success: false, message: uploadError.message });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('project product image')
      .getPublicUrl(fileName);

    return res.json({
      success: true,
      url: urlData?.publicUrl || '',
      fileName,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cashbook', cashbookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Furniture Backend API running on http://localhost:${PORT}`);
});
