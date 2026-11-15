import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PartyModel } from '../models/Party.model';

export async function getParties(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { type } = req.query;
  const filter: any = { userId, isActive: true };
  if (type) filter.partyType = type;

  const parties = await PartyModel.find(filter).sort({ companyName: 1 });
  res.json({ parties });
}

export async function createParty(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const party = new PartyModel({ ...req.body, userId });
  await party.save();
  res.status(201).json({ party });
}

export async function bulkSyncParties(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  const { parties } = req.body;

  if (!Array.isArray(parties)) {
    res.status(400).json({ error: 'parties array expected' });
    return;
  }

  const syncedIds: { localId: string; serverId: string }[] = [];

  for (const p of parties) {
    const existing = await PartyModel.findOne({ userId, localId: p.id });
    if (existing) {
      Object.assign(existing, p, { localId: p.id });
      await existing.save();
      syncedIds.push({ localId: p.id, serverId: existing._id.toString() });
    } else {
      const created = new PartyModel({ ...p, localId: p.id, userId });
      await created.save();
      syncedIds.push({ localId: p.id, serverId: created._id.toString() });
    }
  }

  res.json({ message: 'Party sync complete', synced: syncedIds });
}

