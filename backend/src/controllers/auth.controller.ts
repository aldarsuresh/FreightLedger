import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.model';

const JWT_SECRET = process.env.JWT_SECRET || 'freightledger_super_secret_jwt_key_2026';

export async function requestOTP(req: Request, res: Response): Promise<void> {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    res.status(400).json({ error: 'Valid 10-digit mobile number required' });
    return;
  }

  // Generate 6-digit OTP (in production, send via SMS gateway like MSG91/Twilio)
  const otp = '123456'; // Default demo OTP for development
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  let user = await UserModel.findOne({ phone });
  if (!user) {
    user = new UserModel({ phone });
  }

  user.otpHash = otp;
  user.otpExpiresAt = expiresAt;
  await user.save();

  console.log(`[AUTH] OTP for ${phone}: ${otp}`);
  res.json({ message: 'OTP sent successfully', demoOtp: '123456' });
}

export async function verifyOTP(req: Request, res: Response): Promise<void> {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    res.status(400).json({ error: 'Phone and OTP are required' });
    return;
  }

  const user = await UserModel.findOne({ phone });
  if (!user || user.otpHash !== otp) {
    res.status(400).json({ error: 'Invalid OTP' });
    return;
  }

  if (user.otpExpiresAt && user.otpExpiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: 'OTP has expired' });
    return;
  }

  // Clear OTP
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  // Generate JWT token valid for 30 days
  const token = jwt.sign(
    { userId: user._id.toString(), phone: user.phone },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    message: 'OTP verified successfully',
    token,
    user: {
      id: user._id,
      phone: user.phone,
      firmName: user.firmName,
      gstin: user.gstin,
      lrPrefix: user.lrPrefix,
    },
  });
}

