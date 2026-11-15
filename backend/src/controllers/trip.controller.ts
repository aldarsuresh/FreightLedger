import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TripModel } from '../models/Trip.model';
import { generatePresignedUploadUrl } from '../config/r2';

export async function getTrips(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const trips = await TripModel.find({ userId })
    .populate('customerId vendorId')
    .sort({ date: -1 });
  res.json({ trips });
}

export async function createTrip(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const trip = new TripModel({ ...req.body, userId });
  await trip.save();
  res.status(201).json({ trip });
}

export async function bulkSyncTrips(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { trips } = req.body; // Array of offline trips from mobile SQLite sync queue

  if (!Array.isArray(trips)) {
    res.status(400).json({ error: 'trips array expected' });
    return;
  }

  const syncedIds: { localId: string; serverId: string }[] = [];

  for (const t of trips) {
    const existing = await TripModel.findOne({ userId, localId: t.id });
    if (existing) {
      // Last-write-wins update
      Object.assign(existing, t, { localId: t.id });
      await existing.save();
      syncedIds.push({ localId: t.id, serverId: existing._id.toString() });
    } else {
      const created = new TripModel({ ...t, localId: t.id, userId });
      await created.save();
      syncedIds.push({ localId: t.id, serverId: created._id.toString() });
    }
  }

  res.json({ message: 'Sync complete', synced: syncedIds });
}

export async function getPODUploadUrl(req: AuthRequest, res: Response): Promise<void> {
  const { tripId } = req.params;
  const key = `pod/${req.user?.userId}/${tripId}-${Date.now()}.jpg`;

  try {
    const presignedUrl = await generatePresignedUploadUrl(key, 'image/jpeg');
    res.json({
      uploadUrl: presignedUrl,
      fileKey: key,
      publicUrl: `https://${process.env.R2_PUBLIC_DOMAIN || 'r2.freightledger.app'}/${key}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;

  const summary = await TripModel.aggregate([
    { $match: { userId: req.user?.userId } },
    {
      $group: {
        _id: null,
        totalReceivable: {
          $sum: {
            $cond: [{ $ne: ['$status', 'PAID'] }, '$customerBalance', 0],
          },
        },
        totalPayable: {
          $sum: {
            $cond: [{ $ne: ['$status', 'PAID'] }, '$vendorBalance', 0],
          },
        },
        netCommission: { $sum: '$netCommission' },
      },
    },
  ]);

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const overdueCount = await TripModel.countDocuments({
    userId,
    status: 'DELIVERED',
    deliveredAt: { $lte: threeDaysAgo },
  });

  res.json({
    totalReceivable: summary[0]?.totalReceivable ?? 0,
    totalPayable: summary[0]?.totalPayable ?? 0,
    netCommission: summary[0]?.netCommission ?? 0,
    pendingPODCount: overdueCount,
  });
}

