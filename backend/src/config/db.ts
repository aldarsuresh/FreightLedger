import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freightledger';
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB (FreightLedger)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

