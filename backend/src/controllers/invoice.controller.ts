import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { InvoiceModel } from '../models/Invoice.model';

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const invoices = await InvoiceModel.find({ userId })
    .populate('customerId')
    .sort({ invoiceDate: -1 });
  res.json({ invoices });
}

export async function createInvoice(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const invoice = new InvoiceModel({ ...req.body, userId });
  await invoice.save();
  res.status(201).json({ invoice });
}

