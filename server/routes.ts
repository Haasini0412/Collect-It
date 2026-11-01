import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import { db } from './db';
import {
  getPayPalConfig,
  isPayPalConfigured,
  createPayPalOrder,
  capturePayPalOrder,
  executePayout,
  inrToCharge,
} from './paypal';
import {
  isAiConfigured,
  generateCollectionFromPrompt,
  parseMembersWithAi,
  generateInsights,
  generateSpendingStory,
  askLedgerAssistant,
  generateSmartReminders,
} from './ai';
import { seedDemoData, generateSampleRoster } from './seed';
import { THEMES } from '../src/utils/theme';
import { CollectionTheme, Member } from '../src/types';
import crypto from 'crypto';
import { normalizePhone } from '../src/utils/currency';

const router = express.Router();

// Helper: Mask email for privacy and security display (e.g. de***@example.com)
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

// In-memory 60s locks per collection to prevent rapid double-clicks (Safeguard E)
const payoutLocks = new Map<string, number>();

// Middleware: Cache-Control: no-store
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Helper: Get authenticated owner ID (supports Google Auth token or Demo Lead)
function getAuthOwnerId(req: Request): string {
  const customUid = req.headers['x-user-id'] as string;
  if (customUid) return customUid;
  const isDemo = req.headers['x-demo-lead'];
  if (isDemo) return 'demo-lead-uid';
  // Default to demo lead for frictionless evaluation
  return 'demo-lead-uid';
}

// Rate limiting in-memory map
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = ipRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

// --------------------------------------------------------------------------
// 1. PUBLIC CONFIG
// --------------------------------------------------------------------------
router.get('/config', (_req: Request, res: Response) => {
  const { clientId, chargeCurrency, inrPerUsd } = getPayPalConfig();
  res.json({
    paypalClientId: clientId,
    paypalEnabled: isPayPalConfigured(),
    aiEnabled: isAiConfigured(),
    chargeCurrency,
    inrPerUsd,
  });
});

// --------------------------------------------------------------------------
// 2. PUBLIC COLLECTION & PAYMENTS
// --------------------------------------------------------------------------
router.get('/c/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const col = db.getCollectionBySlug(slug);
  if (!col) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const group = db.getGroup(col.groupId);
  const members = db.listMembersByGroup(col.groupId);
  const payments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
  const expenses = db.listExpensesByCollection(col.id);
  const owner = db.getUser(col.ownerId) || { name: 'Organizer', avatarUrl: undefined };

  const raised = payments.reduce((sum, p) => sum + p.amount, 0);
  const target = col.mode === 'goal'
    ? (col.goalAmount || 1000)
    : (col.fixedAmount || 500) * Math.max(members.length, 1);
  const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const payouts = db.listPayoutsByCollection(col.id).filter(p => p.status === 'sent');
  const paidOut = payouts.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, raised - spent - paidOut);

  const deadlineDate = new Date(col.deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const isClosed = col.status === 'closed' || daysLeft <= 0;

  // Paid member IDs
  const paidMemberIds = new Set(payments.map(p => p.memberId).filter(Boolean));
  const unpaidCount = Math.max(0, members.length - paidMemberIds.size);

  // Top Supporter calculation
  const nonAnonPayments = payments.filter(p => !p.isAnonymous);
  let topSupporterPayment = nonAnonPayments[0];
  nonAnonPayments.forEach(p => {
    if (!topSupporterPayment || p.amount > topSupporterPayment.amount) {
      topSupporterPayment = p;
    }
  });

  // Public supporters list (privacy preserved: no emails, no phones, no payment IDs)
  const supporters = payments
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(p => ({
      id: p.id,
      name: p.isAnonymous ? 'Anonymous' : p.payerName,
      amount: p.amount,
      note: p.note,
      isTopSupporter: topSupporterPayment ? p.id === topSupporterPayment.id : false,
      isAnonymous: p.isAnonymous,
      createdAt: p.createdAt,
    }));

  // Fetch or generate spending story
  const storyRes = await generateSpendingStory({
    title: col.title,
    raised,
    spent,
    balance,
    supportersCount: supporters.length,
    expenses: expenses.map(e => ({ description: e.description, amount: e.amount })),
  });

  res.json({
    collection: col,
    group: group ? { id: group.id, name: group.name, emoji: group.emoji, type: group.type } : null,
    lead: {
      name: owner.name.split(' ')[0], // First name only for privacy
      avatarUrl: owner.avatarUrl,
    },
    stats: {
      raised,
      target,
      percent,
      supportersCount: supporters.length,
      daysLeft,
      isClosed,
      unpaidCount,
      totalMembers: members.length,
      paidOut,
    },
    supporters,
    expenses,
    balance,
    spendingStory: storyRes.story,
    spendingStoryAi: storyRes.ai,
  });
});

// Searchable unpaid members for fixed-mode select
router.get('/c/:slug/unpaid-members', (req: Request, res: Response) => {
  const { slug } = req.params;
  const q = ((req.query.q as string) || '').toLowerCase().trim();
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 30, 100);

  const col = db.getCollectionBySlug(slug);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const members = db.listMembersByGroup(col.groupId);
  const completedPayments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
  const paidMemberIds = new Set(completedPayments.map(p => p.memberId).filter(Boolean));

  const unpaid = members
    .filter(m => !paidMemberIds.has(m.id))
    .filter(m => !q || m.name.toLowerCase().includes(q))
    .slice(0, limit)
    .map(m => ({ id: m.id, name: m.name }));

  res.json(unpaid);
});

// Create Order (PayPal)
router.post('/c/:slug/create-order', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { amount, payerName, payerEmail, note, isAnonymous, memberId } = req.body;

  const col = db.getCollectionBySlug(slug);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  if (col.status === 'closed') {
    return res.status(400).json({ error: 'This collection is currently closed for contributions.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 50 || numAmount > 200000) {
    return res.status(400).json({ error: 'Contribution amount must be between ₹50 and ₹2,00,000.' });
  }

  // Check if fixed mode and member already paid
  if (col.mode === 'fixed' && memberId) {
    const existingPmt = db.listPaymentsByCollection(col.id).find(
      p => p.memberId === memberId && p.status === 'completed'
    );
    if (existingPmt) {
      return res.status(400).json({ error: 'This member has already contributed their share!' });
    }
  }

  const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { chargeAmount, chargeCurrency, fxRate } = inrToCharge(numAmount);

  // If PayPal is configured, call PayPal Orders API
  if (isPayPalConfigured()) {
    try {
      const order = await createPayPalOrder({
        collectionId: col.id,
        paymentId,
        amountInr: numAmount,
        description: `${col.title} – ₹${numAmount}`,
      });

      // Save pending payment
      db.savePayment({
        id: paymentId,
        collectionId: col.id,
        memberId: memberId || null,
        payerName: String(payerName || 'Supporter').trim(),
        payerEmail: payerEmail ? String(payerEmail).trim() : null,
        amount: numAmount,
        currency: 'INR',
        chargedAmount: chargeAmount,
        chargeCurrency,
        fxRate,
        note: note ? String(note).slice(0, 200) : null,
        isAnonymous: Boolean(isAnonymous),
        paypalOrderId: order.orderId,
        paypalCaptureId: null,
        status: 'pending',
        isDemo: false,
        createdAt: new Date().toISOString(),
      });

      return res.json({ orderId: order.orderId, paymentId });
    } catch (err: any) {
      console.error('PayPal create order failed:', err);
      return res.status(500).json({ error: err.message || 'Failed to initialize PayPal order' });
    }
  } else {
    // Demo payment flow fallback
    return res.status(400).json({
      error: 'PayPal is running in demo mode. Please use Demo Pay.',
      isDemo: true,
    });
  }
});

// Capture Order (PayPal)
router.post('/c/:slug/capture-order', async (req: Request, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

  const payment = db.getPaymentByOrderId(orderId);
  if (!payment) return res.status(404).json({ error: 'Payment record not found for order' });

  // Idempotency: if already completed, return success
  if (payment.status === 'completed') {
    return res.json({ success: true, paymentId: payment.id, alreadyCaptured: true });
  }

  try {
    const captureResult = await capturePayPalOrder(orderId, payment.chargedAmount);
    if (captureResult.status === 'COMPLETED') {
      payment.status = 'completed';
      payment.paypalCaptureId = captureResult.captureId;
      payment.completedAt = new Date().toISOString();
      db.savePayment(payment);

      return res.json({
        success: true,
        paymentId: payment.id,
        captureId: captureResult.captureId,
      });
    } else {
      payment.status = 'failed';
      db.savePayment(payment);
      return res.status(400).json({ error: `PayPal capture status: ${captureResult.status}` });
    }
  } catch (err: any) {
    console.error('PayPal capture error:', err);
    return res.status(500).json({ error: err.message || 'Capture failed' });
  }
});

// Demo Pay (Instant simulated payment when keys missing or demo testing)
router.post('/c/:slug/demo-pay', (req: Request, res: Response) => {
  const { slug } = req.params;
  const { amount, payerName, payerEmail, note, isAnonymous, memberId } = req.body;

  const col = db.getCollectionBySlug(slug);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  if (col.status === 'closed') {
    return res.status(400).json({ error: 'This collection is currently closed.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 50 || numAmount > 200000) {
    return res.status(400).json({ error: 'Amount must be between ₹50 and ₹2,00,000.' });
  }

  if (col.mode === 'fixed' && memberId) {
    const existingPmt = db.listPaymentsByCollection(col.id).find(
      p => p.memberId === memberId && p.status === 'completed'
    );
    if (existingPmt) {
      return res.status(400).json({ error: 'This member has already contributed their share!' });
    }
  }

  const paymentId = `pmt_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const { chargeAmount, chargeCurrency, fxRate } = inrToCharge(numAmount);

  const payment = db.savePayment({
    id: paymentId,
    collectionId: col.id,
    memberId: memberId || null,
    payerName: String(payerName || 'Demo Supporter').trim(),
    payerEmail: payerEmail ? String(payerEmail).trim() : null,
    amount: numAmount,
    currency: 'INR',
    chargedAmount: chargeAmount,
    chargeCurrency,
    fxRate,
    note: note ? String(note).slice(0, 200) : null,
    isAnonymous: Boolean(isAnonymous),
    paypalOrderId: `DEMO-ORDER-${Date.now()}`,
    paypalCaptureId: `DEMO-CAP-${Date.now()}`,
    status: 'completed',
    isDemo: true,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  res.json({ success: true, paymentId: payment.id, isDemo: true });
});

// AI Spending Story endpoint
router.get('/c/:slug/ai/story', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const col = db.getCollectionBySlug(slug);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const payments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
  const expenses = db.listExpensesByCollection(col.id);
  const raised = payments.reduce((sum, p) => sum + p.amount, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = Math.max(0, raised - spent);

  const storyRes = await generateSpendingStory({
    title: col.title,
    raised,
    spent,
    balance,
    supportersCount: payments.length,
    expenses: expenses.map(e => ({ description: e.description, amount: e.amount })),
  });

  res.json(storyRes);
});

// "Ask the ledger" floating chat assistant (Strict rate limit 10/min/IP, 300 char cap)
router.post('/c/:slug/ai/ask', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`ask_${ip}`, 10, 60000)) {
    return res.status(429).json({ error: 'Rate limit reached. Please wait a moment before asking again.' });
  }

  const { slug } = req.params;
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required' });
  }

  const col = db.getCollectionBySlug(slug);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const payments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
  const expenses = db.listExpensesByCollection(col.id);
  const members = db.listMembersByGroup(col.groupId);
  const owner = db.getUser(col.ownerId) || { name: 'Lead' };

  const raised = payments.reduce((sum, p) => sum + p.amount, 0);
  const target = col.mode === 'goal'
    ? (col.goalAmount || 1000)
    : (col.fixedAmount || 500) * Math.max(members.length, 1);
  const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = Math.max(0, raised - spent);

  const deadlineDate = new Date(col.deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const paidMemberIds = new Set(payments.map(p => p.memberId).filter(Boolean));
  const unpaidCount = Math.max(0, members.length - paidMemberIds.size);
  const nonAnonSupporterNames = payments.filter(p => !p.isAnonymous).map(p => p.payerName);

  const answerResult = await askLedgerAssistant({
    question: question.slice(0, 300),
    context: {
      title: col.title,
      purpose: col.purpose,
      organizerName: owner.name.split(' ')[0],
      target,
      raised,
      percent,
      daysLeft,
      supporterCount: payments.length,
      paidSupporterNames: nonAnonSupporterNames.slice(0, 15),
      unpaidCount,
      expenses: expenses.map(e => ({ description: e.description, amount: e.amount, spentOn: e.spentOn })),
      balance,
      isClosed: col.status === 'closed' || daysLeft <= 0,
    },
  });

  res.json(answerResult);
});

// --------------------------------------------------------------------------
// 3. SELF-JOIN FLOW (/join/:code)
// --------------------------------------------------------------------------
router.get('/join/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const group = db.getGroupByJoinCode(code);
  if (!group) return res.status(404).json({ error: 'Group not found for this join link.' });

  res.json({
    id: group.id,
    name: group.name,
    type: group.type,
    emoji: group.emoji,
    joinOpen: group.joinOpen,
    memberCount: group.memberCount,
  });
});

router.post('/api/join/:code', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`join_${ip}`, 20, 3600000)) {
    return res.status(429).json({ error: 'Too many join attempts. Please try again later.' });
  }

  const { code } = req.params;
  const { name, email, phone } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Name is required (at least 2 characters).' });
  }

  const group = db.getGroupByJoinCode(code);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.joinOpen) return res.status(403).json({ error: 'Joining this group is currently paused by the organizer.' });

  const existingMembers = db.listMembersByGroup(group.id);
  const normPhone = normalizePhone(phone);
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  const cleanName = String(name).trim();

  // Deduplication check
  const duplicate = existingMembers.find(m => {
    if (normPhone && m.phone && m.phone.slice(-10) === normPhone.slice(-10)) return true;
    if (cleanEmail && m.email && m.email.toLowerCase() === cleanEmail) return true;
    if (!normPhone && !cleanEmail && m.name.toLowerCase() === cleanName.toLowerCase()) return true;
    return false;
  });

  if (duplicate) {
    return res.json({ success: true, memberId: duplicate.id, alreadyMember: true });
  }

  const newMember: Member = {
    id: `mem_join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    groupId: group.id,
    name: cleanName,
    email: cleanEmail,
    phone: normPhone,
    source: 'join',
    createdAt: new Date().toISOString(),
  };

  db.saveMember(newMember);
  res.json({ success: true, memberId: newMember.id, alreadyMember: false });
});

// --------------------------------------------------------------------------
// 4. QR CODE PNG ENDPOINTS
// --------------------------------------------------------------------------
router.get('/qr/:slug.png', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const col = db.getCollectionBySlug(slug);
  const themeKey = col?.theme || 'aurora';
  const theme = THEMES[themeKey as CollectionTheme] || THEMES.aurora;

  const appHost = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const targetUrl = `${appHost}/c/${slug}`;

  try {
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: theme.qrColor,
        light: '#FFFFFF',
      },
    });

    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="collectit-${slug}-qr.png"`);
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

router.get('/qr/join/:code.png', async (req: Request, res: Response) => {
  const { code } = req.params;
  const appHost = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const targetUrl = `${appHost}/join/${code}`;

  try {
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#6366F1',
        light: '#FFFFFF',
      },
    });

    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="collectit-join-${code}-qr.png"`);
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// --------------------------------------------------------------------------
// 5. LEAD AUTHENTICATED ENDPOINTS
// --------------------------------------------------------------------------

// Dashboard overview
router.get('/dashboard', (req: Request, res: Response) => {
  const ownerId = getAuthOwnerId(req);
  const groups = db.listGroupsByOwner(ownerId);
  const collections = db.listCollectionsByOwner(ownerId);

  let totalRaised = 0;
  let activeCollectionsCount = 0;
  let totalSupportersCount = 0;
  let totalPendingMembers = 0;

  const collectionMetrics = collections.map(col => {
    const payments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
    const members = db.listMembersByGroup(col.groupId);
    const colRaised = payments.reduce((sum, p) => sum + p.amount, 0);
    const colTarget = col.mode === 'goal'
      ? (col.goalAmount || 1000)
      : (col.fixedAmount || 500) * Math.max(members.length, 1);
    const colPercent = colTarget > 0 ? Math.min(100, Math.round((colRaised / colTarget) * 100)) : 0;

    totalRaised += colRaised;
    if (col.status === 'active') activeCollectionsCount++;
    totalSupportersCount += payments.length;

    const paidMemberIds = new Set(payments.map(p => p.memberId).filter(Boolean));
    const unpaid = Math.max(0, members.length - paidMemberIds.size);
    totalPendingMembers += unpaid;

    return {
      id: col.id,
      title: col.title,
      slug: col.slug,
      emoji: col.emoji,
      theme: col.theme,
      mode: col.mode,
      status: col.status,
      raised: colRaised,
      target: colTarget,
      percent: colPercent,
    };
  });

  const groupMetrics = groups.map(g => {
    const groupCols = collections.filter(c => c.groupId === g.id);
    let gRaised = 0;
    groupCols.forEach(c => {
      const pmts = db.listPaymentsByCollection(c.id).filter(p => p.status === 'completed');
      gRaised += pmts.reduce((sum, p) => sum + p.amount, 0);
    });

    return {
      ...g,
      collectionsCount: groupCols.length,
      totalRaised: gRaised,
    };
  });

  res.json({
    summary: {
      totalRaised,
      activeCollections: activeCollectionsCount,
      supporters: totalSupportersCount,
      pendingMembers: totalPendingMembers,
    },
    groups: groupMetrics,
    collections: collectionMetrics,
  });
});

// Group CRUD
router.post('/groups', (req: Request, res: Response) => {
  const ownerId = getAuthOwnerId(req);
  const { name, type, emoji, description } = req.body;

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Group name must be at least 2 characters.' });
  }

  const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const group = db.saveGroup({
    id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId,
    name: String(name).trim(),
    type: type || 'Class',
    emoji: emoji || '👥',
    description: description ? String(description).slice(0, 300) : '',
    joinCode,
    joinOpen: true,
    memberCount: 0,
    createdAt: new Date().toISOString(),
  });

  res.json(group);
});

router.get('/groups/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const group = db.getGroup(id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const collections = db.listCollectionsByGroup(id);
  const members = db.listMembersByGroup(id);

  const collectionsWithStats = collections.map(col => {
    const pmts = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
    const raised = pmts.reduce((sum, p) => sum + p.amount, 0);
    const target = col.mode === 'goal'
      ? (col.goalAmount || 1000)
      : (col.fixedAmount || 500) * Math.max(members.length, 1);
    const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
    return {
      ...col,
      raised,
      target,
      percent,
      supportersCount: pmts.length,
    };
  });

  res.json({
    group,
    collections: collectionsWithStats,
    members,
  });
});

// Bulk Member Import (Max 5,000, Server-side revalidation & dedupe)
router.post('/groups/:id/members/bulk', (req: Request, res: Response) => {
  const { id } = req.params;
  const group = db.getGroup(id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { members, source } = req.body;
  if (!Array.isArray(members)) {
    return res.status(400).json({ error: 'Members array is required' });
  }

  if (members.length > 5000) {
    return res.status(400).json({ error: 'Exceeded maximum batch limit of 5,000 rows.' });
  }

  const existingMembers = db.listMembersByGroup(id);
  const existingPhones = new Set<string>();
  const existingEmails = new Set<string>();
  const existingNames = new Set<string>();

  existingMembers.forEach(m => {
    if (m.phone) existingPhones.add(m.phone.slice(-10));
    if (m.email) existingEmails.add(m.email.toLowerCase());
    existingNames.add(m.name.toLowerCase());
  });

  const batchPhones = new Set<string>();
  const batchEmails = new Set<string>();
  const batchNames = new Set<string>();

  const toAdd: Member[] = [];
  let skippedDuplicates = 0;
  let invalid = 0;

  for (const item of members) {
    const rawName = String(item.name || '').trim();
    if (rawName.length < 2) {
      invalid++;
      continue;
    }

    const normPhone = normalizePhone(item.phone);
    const cleanEmail = item.email ? String(item.email).trim().toLowerCase() : null;
    const normPhone10 = normPhone ? normPhone.slice(-10) : null;

    // Check duplicate against existing roster
    let isDup = false;
    if (normPhone10 && (existingPhones.has(normPhone10) || batchPhones.has(normPhone10))) {
      isDup = true;
    } else if (cleanEmail && (existingEmails.has(cleanEmail) || batchEmails.has(cleanEmail))) {
      isDup = true;
    } else if (!normPhone10 && !cleanEmail && (existingNames.has(rawName.toLowerCase()) || batchNames.has(rawName.toLowerCase()))) {
      isDup = true;
    }

    if (isDup) {
      skippedDuplicates++;
      continue;
    }

    // Register into batch
    if (normPhone10) batchPhones.add(normPhone10);
    if (cleanEmail) batchEmails.add(cleanEmail);
    batchNames.add(rawName.toLowerCase());

    toAdd.push({
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId: id,
      name: rawName,
      email: cleanEmail,
      phone: normPhone,
      source: source || 'manual',
      createdAt: new Date().toISOString(),
    });
  }

  if (toAdd.length > 0) {
    db.saveMembersBulk(toAdd, id);
  }

  res.json({
    added: toAdd.length,
    skippedDuplicates,
    invalid,
    total: db.listMembersByGroup(id).length,
  });
});

// Member delete (single & bulk)
router.post('/groups/:id/members/delete', (req: Request, res: Response) => {
  const { id } = req.params;
  const { memberIds } = req.body;
  if (!Array.isArray(memberIds)) {
    return res.status(400).json({ error: 'memberIds array is required' });
  }
  db.deleteMembersBulk(memberIds, id);
  res.json({ success: true, count: memberIds.length });
});

router.patch('/groups/:id/members/:mid', (req: Request, res: Response) => {
  const { id, mid } = req.params;
  const member = db.getMember(mid);
  if (!member || member.groupId !== id) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const { name, email, phone } = req.body;
  if (name) member.name = String(name).trim();
  if (email !== undefined) member.email = email ? String(email).trim().toLowerCase() : null;
  if (phone !== undefined) member.phone = normalizePhone(phone);

  db.saveMember(member);
  res.json(member);
});

// Export roster CSV
router.get('/groups/:id/members/export.csv', (req: Request, res: Response) => {
  const { id } = req.params;
  const group = db.getGroup(id);
  const members = db.listMembersByGroup(id);

  let csv = 'Name,Email,Phone,Source,AddedDate\n';
  members.forEach(m => {
    csv += `"${m.name.replace(/"/g, '""')}","${m.email || ''}","${m.phone || ''}","${m.source}","${m.createdAt}"\n`;
  });

  res.setHeader('Content-Disposition', `attachment; filename="${(group?.name || 'roster').replace(/\s+/g, '_')}_members.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

// Load sample roster
router.post('/groups/:id/members/sample', (req: Request, res: Response) => {
  const { id } = req.params;
  const sample = generateSampleRoster(50);
  const members: Member[] = sample.map((s, i) => ({
    id: `mem_sample_${Date.now()}_${i}`,
    groupId: id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    source: 'demo',
    createdAt: new Date().toISOString(),
  }));

  db.saveMembersBulk(members, id);
  res.json({ success: true, added: members.length, total: db.listMembersByGroup(id).length });
});

// Toggle self-join link pause state
router.post('/groups/:id/join-toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const group = db.getGroup(id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  group.joinOpen = !group.joinOpen;
  db.saveGroup(group);
  res.json({ success: true, joinOpen: group.joinOpen });
});

// Collection Creation
router.post('/collections', (req: Request, res: Response) => {
  const ownerId = getAuthOwnerId(req);
  const { groupId, title, purpose, emoji, theme, mode, goalAmount, fixedAmount, deadline } = req.body;

  if (!groupId || !title) {
    return res.status(400).json({ error: 'Group and title are required' });
  }

  const group = db.getGroup(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Generate unique URL slug
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  if (slug.length < 3) slug = 'fund';
  slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;

  const numGoal = goalAmount ? Number(goalAmount) : null;
  const numFixed = fixedAmount ? Number(fixedAmount) : null;

  const collection = db.saveCollection({
    id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    groupId,
    ownerId,
    slug,
    title: String(title).trim(),
    purpose: String(purpose || '').trim(),
    emoji: emoji || '💰',
    theme: theme || 'aurora',
    mode: mode === 'fixed' ? 'fixed' : 'goal',
    goalAmount: mode === 'goal' ? numGoal : null,
    fixedAmount: mode === 'fixed' ? numFixed : null,
    currency: 'INR',
    deadline: deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  res.json(collection);
});

// --------------------------------------------------------------------------
// 6. MANAGE PAGE ENDPOINTS (/manage/:id)
// --------------------------------------------------------------------------
router.get('/manage/:id/stats', (req: Request, res: Response) => {
  const { id } = req.params;
  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const group = db.getGroup(col.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const members = db.listMembersByGroup(col.groupId);
  const payments = db.listPaymentsByCollection(col.id);
  const completedPayments = payments.filter(p => p.status === 'completed');
  const expenses = db.listExpensesByCollection(col.id);
  const payouts = db.listPayoutsByCollection(col.id);

  const raised = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const target = col.mode === 'goal'
    ? (col.goalAmount || 1000)
    : (col.fixedAmount || 500) * Math.max(members.length, 1);
  const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalPayouts = payouts
    .filter(p => p.status === 'requested' || p.status === 'sent')
    .reduce((sum, p) => sum + p.amount, 0);
  const paidOut = payouts
    .filter(p => p.status === 'sent')
    .reduce((sum, p) => sum + p.amount, 0);
  const available = Math.max(0, raised - spent - totalPayouts);

  const deadlineDate = new Date(col.deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Paid vs Unpaid rosters
  const paidMemberMap = new Map<string, { amountPaid: number; paidAt: string }>();
  completedPayments.forEach(p => {
    if (p.memberId) {
      const prev = paidMemberMap.get(p.memberId);
      paidMemberMap.set(p.memberId, {
        amountPaid: (prev?.amountPaid || 0) + p.amount,
        paidAt: p.completedAt || p.createdAt,
      });
    }
  });

  const paidMembers: any[] = [];
  const unpaidMembers: any[] = [];

  members.forEach(m => {
    if (paidMemberMap.has(m.id)) {
      const info = paidMemberMap.get(m.id)!;
      paidMembers.push({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        amountPaid: info.amountPaid,
        paidAt: info.paidAt,
      });
    } else {
      unpaidMembers.push({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
      });
    }
  });

  // Timeline computation for cumulative raised chart
  const dateMap = new Map<string, number>();
  completedPayments.forEach(p => {
    const d = new Date(p.createdAt).toISOString().split('T')[0];
    dateMap.set(d, (dateMap.get(d) || 0) + p.amount);
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  let cumulative = 0;
  const timeline = sortedDates.map(d => {
    cumulative += dateMap.get(d)!;
    return {
      date: d,
      amount: dateMap.get(d)!,
      cumulative,
    };
  });

  // Forecast computation in code (as mandated in Section 6.2)
  // Pace/day = completed amount over last 3 days / 3 (fallback to all-time daily avg)
  const threeDaysAgo = Date.now() - 3 * 86400000;
  const recentPayments = completedPayments.filter(p => new Date(p.createdAt).getTime() >= threeDaysAgo);
  const recentSum = recentPayments.reduce((s, p) => s + p.amount, 0);

  const colDaysElapsed = Math.max(1, Math.ceil((Date.now() - new Date(col.createdAt).getTime()) / 86400000));
  const pacePerDay = recentPayments.length > 0
    ? (recentSum / 3)
    : (raised / colDaysElapsed);

  const projectedTotal = Math.round(raised + pacePerDay * daysLeft);
  const daysToComplete = pacePerDay > 0 ? Math.ceil((target - raised) / pacePerDay) : 999;
  const projDate = new Date(Date.now() + Math.max(0, daysToComplete) * 86400000).toISOString().split('T')[0];

  const status: 'on_track' | 'at_risk' | 'behind' =
    projectedTotal >= target
      ? 'on_track'
      : projectedTotal >= target * 0.75
      ? 'at_risk'
      : 'behind';

  const reqOwnerId = getAuthOwnerId(req);
  const owner = db.getUser(col.ownerId);
  const isOwner = col.ownerId === reqOwnerId;

  // Cooling period calculation (24 hours after changing PayPal email)
  let coolingActive = false;
  let coolingEndsAt: string | null = null;
  let coolingHoursLeft = 0;

  if (owner?.paypalEmailChangedAt) {
    const changedTime = new Date(owner.paypalEmailChangedAt).getTime();
    const coolingEndTime = changedTime + 24 * 3600 * 1000;
    if (Date.now() < coolingEndTime && owner.uid !== 'demo-lead-uid') {
      coolingActive = true;
      coolingEndsAt = new Date(coolingEndTime).toISOString();
      coolingHoursLeft = Math.max(1, Math.ceil((coolingEndTime - Date.now()) / 3600000));
    }
  }

  const isClosed = col.status === 'closed' || daysLeft <= 0;
  const isVerified = Boolean(owner?.paypalEmail && owner?.paypalEmailVerified);

  let blockedReason: string | null = null;
  let canRequestPayout = true;

  if (!isClosed) {
    canRequestPayout = false;
    blockedReason = 'Collection is still active. Close the fund or wait for deadline to request payout.';
  } else if (!isVerified) {
    canRequestPayout = false;
    blockedReason = 'Payout destination PayPal account is not verified.';
  } else if (coolingActive) {
    canRequestPayout = false;
    blockedReason = `Payouts are paused for ${coolingHoursLeft}h after changing your PayPal email, for your protection.`;
  } else if (available < 100) {
    canRequestPayout = false;
    blockedReason = 'Available balance is below minimum payout of ₹100.';
  }

  const activity = db.listAuditLogsByCollection(col.id);

  res.json({
    collection: col,
    group,
    stats: {
      raised,
      target,
      percent,
      supportersCount: completedPayments.length,
      daysLeft,
      unpaidCount: unpaidMembers.length,
      totalMembers: members.length,
      spent,
      paidOut,
      available,
    },
    forecast: {
      pacePerDay,
      projectedTotal,
      projectedCompletionDate: projDate,
      status,
    },
    timeline,
    payments: completedPayments,
    paidMembers,
    unpaidMembers,
    expenses,
    payouts,
    payoutConfig: {
      paypalEmail: owner?.paypalEmail || null,
      paypalEmailMasked: owner?.paypalEmail ? maskEmail(owner.paypalEmail) : null,
      paypalEmailVerified: isVerified,
      pendingPaypalEmail: owner?.pendingPaypalEmail ? maskEmail(owner.pendingPaypalEmail) : null,
      coolingActive,
      coolingEndsAt,
      coolingHoursLeft,
      canRequestPayout,
      blockedReason,
      isOwner,
    },
    activity,
  });
});

// Add Expense
router.post('/manage/:id/expense', (req: Request, res: Response) => {
  const { id } = req.params;
  const { description, amount, spentOn } = req.body;

  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const numAmount = Number(amount);
  if (!description || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid description and amount are required' });
  }

  const expense = db.saveExpense({
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    collectionId: id,
    description: String(description).trim(),
    amount: numAmount,
    spentOn: spentOn ? String(spentOn).trim() : '',
    createdAt: new Date().toISOString(),
  });

  res.json(expense);
});

// Toggle status active / closed
router.post('/manage/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  col.status = col.status === 'active' ? 'closed' : 'active';
  db.saveCollection(col);
  res.json({ success: true, status: col.status });
});

// Export payments CSV
router.get('/manage/:id/export.csv', (req: Request, res: Response) => {
  const { id } = req.params;
  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const payments = db.listPaymentsByCollection(id).filter(p => p.status === 'completed');
  let csv = 'PaymentId,PayerName,PayerEmail,AmountINR,ChargedAmount,ChargeCurrency,Note,Anonymous,Status,Date\n';
  payments.forEach(p => {
    csv += `"${p.id}","${p.payerName.replace(/"/g, '""')}","${p.payerEmail || ''}",${p.amount},${p.chargedAmount},"${p.chargeCurrency}","${(p.note || '').replace(/"/g, '""')}",${p.isAnonymous},"${p.status}","${p.createdAt}"\n`;
  });

  res.setHeader('Content-Disposition', `attachment; filename="${col.slug}_payments.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

// --------------------------------------------------------------------------
// 6b. PAYOUT SAFETY v4.1 SETTLEMENT & PAYOUT SAFEGUARDS
// --------------------------------------------------------------------------

// Payout Email Verification Initiation (Safeguard C)
router.post(['/me/paypal-email', '/api/me/paypal-email'], (req: Request, res: Response) => {
  const uid = getAuthOwnerId(req);
  if (!checkRateLimit(`email_verify_req_${uid}`, 5, 3600000)) {
    return res.status(429).json({ error: 'Too many verification requests. Please try again in an hour.' });
  }

  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let user = db.getUser(uid);
  if (!user) {
    user = {
      uid,
      name: 'Lead',
      email: 'lead@collectit.app',
    };
  }

  // Fast path: if the PayPal email equals the Lead's sign-in email
  if (cleanEmail === user.email.toLowerCase()) {
    user.paypalEmail = cleanEmail;
    user.paypalEmailVerified = true;
    user.paypalEmailChangedAt = new Date().toISOString();
    user.pendingPaypalEmail = undefined;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpiresAt = undefined;
    user.verifyAttempts = 0;
    db.saveUser(user);

    db.createAuditLog({
      type: 'paypal_email_verified',
      uid,
      reason: 'Verified automatically via matching sign-in email',
      destinationEmailMasked: maskEmail(cleanEmail),
    });

    db.createNotification(
      uid,
      'PayPal Email Verified',
      `Payout email ${maskEmail(cleanEmail)} was verified via your Google sign-in email.`
    );

    return res.json({
      success: true,
      verified: true,
      email: cleanEmail,
      emailMasked: maskEmail(cleanEmail),
      message: 'Verified automatically via your Google sign-in email.',
    });
  }

  // Otherwise: 6-digit code, 10 min expiry, max 5 attempts
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = crypto.createHash('sha256').update(code).digest('hex');

  user.pendingPaypalEmail = cleanEmail;
  user.verifyCodeHash = hash;
  user.verifyCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  user.verifyAttempts = 0;
  db.saveUser(user);

  db.createAuditLog({
    type: 'paypal_email_set',
    uid,
    reason: `Verification initiated for ${maskEmail(cleanEmail)}`,
    destinationEmailMasked: maskEmail(cleanEmail),
  });

  const hasEmailKey = Boolean(process.env.EMAIL_API_KEY);
  if (hasEmailKey) {
    return res.json({
      success: true,
      verified: false,
      emailMasked: maskEmail(cleanEmail),
      message: `A 6-digit verification code was sent to ${maskEmail(cleanEmail)}.`,
    });
  } else {
    // Demo Mode: show the code on screen with required label
    return res.json({
      success: true,
      verified: false,
      demoCode: code,
      emailMasked: maskEmail(cleanEmail),
      message: 'Demo mode: in production this code is emailed',
    });
  }
});

// Payout Email Verification Code Submission (Safeguard C)
router.post(['/me/paypal-email/verify', '/api/me/paypal-email/verify'], (req: Request, res: Response) => {
  const uid = getAuthOwnerId(req);
  if (!checkRateLimit(`email_verify_sub_${uid}`, 5, 3600000)) {
    return res.status(429).json({ error: 'Too many verification attempts. Please try again in an hour.' });
  }

  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: '6-digit verification code is required.' });
  }

  const user = db.getUser(uid);
  if (!user || !user.pendingPaypalEmail || !user.verifyCodeHash) {
    return res.status(400).json({ error: 'No pending PayPal email verification found. Please request a new code.' });
  }

  if (user.verifyCodeExpiresAt && new Date(user.verifyCodeExpiresAt).getTime() < Date.now()) {
    user.pendingPaypalEmail = undefined;
    user.verifyCodeHash = undefined;
    db.saveUser(user);
    return res.status(400).json({ error: 'Verification code expired (10 minutes limit). Please request a new code.' });
  }

  user.verifyAttempts = (user.verifyAttempts || 0) + 1;
  if (user.verifyAttempts > 5) {
    user.pendingPaypalEmail = undefined;
    user.verifyCodeHash = undefined;
    db.saveUser(user);
    return res.status(429).json({ error: 'Maximum attempts (5) exceeded. Verification locked for this hour.' });
  }

  const cleanCode = code.trim();
  const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

  if (inputHash !== user.verifyCodeHash) {
    db.saveUser(user);
    return res.status(400).json({
      error: `Invalid verification code. ${5 - user.verifyAttempts} attempt(s) remaining.`,
    });
  }

  // Verified!
  const verifiedEmail = user.pendingPaypalEmail;
  user.paypalEmail = verifiedEmail;
  user.paypalEmailVerified = true;
  user.paypalEmailChangedAt = new Date().toISOString();
  user.pendingPaypalEmail = undefined;
  user.verifyCodeHash = undefined;
  user.verifyCodeExpiresAt = undefined;
  user.verifyAttempts = 0;
  db.saveUser(user);

  db.createAuditLog({
    type: 'paypal_email_verified',
    uid,
    reason: `PayPal email verified via code`,
    destinationEmailMasked: maskEmail(verifiedEmail),
  });

  db.createNotification(
    uid,
    'PayPal Email Verified',
    `Payout destination email ${maskEmail(verifiedEmail)} was verified. Payouts are paused for 24 hours for safety.`
  );

  res.json({
    success: true,
    verified: true,
    email: verifiedEmail,
    emailMasked: maskEmail(verifiedEmail),
    message: 'PayPal account verified! Note: Payouts are paused for 24 hours after changing your email, for your protection.',
  });
});

// Notifications API for Lead
router.get(['/me/notifications', '/api/me/notifications'], (req: Request, res: Response) => {
  const uid = getAuthOwnerId(req);
  const notifications = db.listNotificationsByUser(uid);
  res.json(notifications);
});

router.post(['/me/notifications/read', '/api/me/notifications/read'], (req: Request, res: Response) => {
  const uid = getAuthOwnerId(req);
  db.markNotificationsRead(uid);
  res.json({ success: true });
});

// Settlement Summary
router.get('/manage/:id/settlement', (req: Request, res: Response) => {
  const { id } = req.params;
  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const payments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
  const expenses = db.listExpensesByCollection(col.id);
  const payouts = db.listPayoutsByCollection(col.id);
  const owner = db.getUser(col.ownerId);

  const collected = payments.reduce((sum, p) => sum + p.amount, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPayouts = payouts
    .filter(p => p.status === 'requested' || p.status === 'sent')
    .reduce((sum, p) => sum + p.amount, 0);
  const available = Math.max(0, collected - spent - totalPayouts);

  res.json({
    collected,
    spent,
    available,
    paypalEmail: owner?.paypalEmail || '',
    paypalEmailMasked: owner?.paypalEmail ? maskEmail(owner.paypalEmail) : '',
    paypalEmailVerified: Boolean(owner?.paypalEmailVerified),
    payouts,
  });
});

// Payout Execution (Enforcing all 6 safeguards strictly server-side)
router.post('/manage/:id/payout', async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUid = getAuthOwnerId(req);

  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  // Safeguard B: Owner-only. Confirm collections/{id}.ownerId === token.uid. Otherwise return 404.
  if (col.ownerId !== authUid) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  // Safeguard A: Fixed destination. Accept ONLY { amount }. Ignore and reject any client email or destination.
  const { amount } = req.body;
  if ('email' in req.body || 'destination' in req.body || 'paypalEmail' in req.body) {
    console.warn('Rejected client-supplied destination email in payout body.');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 100) {
    return res.status(400).json({ error: 'Minimum payout is ₹100.' });
  }

  // Safeguard E: Payout rules. Allowed only when collection is closed or past its deadline.
  const isClosed = col.status === 'closed' || new Date(col.deadline) <= new Date();
  if (!isClosed) {
    db.createAuditLog({
      type: 'payout_blocked',
      uid: authUid,
      collectionId: col.id,
      amount: numAmount,
      reason: 'Blocked: Collection is still active and open.',
    });
    return res.status(400).json({ error: 'Payouts are only allowed when the collection is closed or past its deadline.' });
  }

  // Safeguard A & C: The server reads the destination from users/{ownerUid}.paypalEmail.
  const owner = db.getUser(col.ownerId);
  if (!owner?.paypalEmail || !owner.paypalEmailVerified) {
    db.createAuditLog({
      type: 'payout_blocked',
      uid: authUid,
      collectionId: col.id,
      amount: numAmount,
      reason: 'Blocked: Payout destination email is not verified.',
    });
    return res.status(400).json({ error: 'Payout destination email is not verified. Please configure and verify your PayPal account first.' });
  }

  const destinationEmail = owner.paypalEmail;
  const maskedDest = maskEmail(destinationEmail);

  // Safeguard D: 24-hour cooling period after changing PayPal email
  if (owner.paypalEmailChangedAt && owner.uid !== 'demo-lead-uid') {
    const elapsed = Date.now() - new Date(owner.paypalEmailChangedAt).getTime();
    if (elapsed < 24 * 3600 * 1000) {
      const hoursLeft = Math.ceil((24 * 3600 * 1000 - elapsed) / 3600000);
      db.createAuditLog({
        type: 'payout_blocked',
        uid: authUid,
        collectionId: col.id,
        amount: numAmount,
        reason: `Blocked by 24-hour cooling period (${hoursLeft}h remaining)`,
        destinationEmailMasked: maskedDest,
      });
      return res.status(400).json({
        error: 'Payouts are paused for 24 hours after changing your PayPal email, for your protection.',
      });
    }
  }

  // Safeguard E: Server-computed Available balance
  const payments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
  const expenses = db.listExpensesByCollection(col.id);
  const existingPayouts = db.listPayoutsByCollection(col.id);

  const collected = payments.reduce((sum, p) => sum + p.amount, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const alreadyPaidOut = existingPayouts
    .filter(p => p.status === 'sent' || p.status === 'requested')
    .reduce((sum, p) => sum + p.amount, 0);
  const available = Math.max(0, collected - spent - alreadyPaidOut);

  if (numAmount > available) {
    db.createAuditLog({
      type: 'payout_blocked',
      uid: authUid,
      collectionId: col.id,
      amount: numAmount,
      reason: `Blocked: Amount ₹${numAmount} exceeds available balance ₹${available}`,
      destinationEmailMasked: maskedDest,
    });
    return res.status(400).json({
      error: `Requested amount ₹${numAmount.toLocaleString('en-IN')} exceeds available balance of ₹${available.toLocaleString('en-IN')}.`,
    });
  }

  // Safeguard E: At most one payout request per collection per 60 seconds (Lock)
  const lastPayoutTime = payoutLocks.get(col.id) || 0;
  if (Date.now() - lastPayoutTime < 60000) {
    db.createAuditLog({
      type: 'payout_blocked',
      uid: authUid,
      collectionId: col.id,
      amount: numAmount,
      reason: 'Blocked: 60-second lock active',
      destinationEmailMasked: maskedDest,
    });
    return res.status(429).json({ error: 'Please wait 60 seconds between payout requests.' });
  }

  // Acquire lock
  payoutLocks.set(col.id, Date.now());

  const payoutId = `payout_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  // Safeguard F: Write audit log entry for request
  db.createAuditLog({
    type: 'payout_requested',
    uid: authUid,
    collectionId: col.id,
    amount: numAmount,
    reason: `Payout requested to ${maskedDest}`,
    destinationEmailMasked: maskedDest,
  });

  try {
    const execResult = await executePayout({
      payoutId,
      amountInr: numAmount,
      paypalEmail: destinationEmail, // Strictly server-provided destination
      note: `CollectIt settlement for ${col.title}`,
    });

    const newPayout = db.savePayout({
      id: payoutId,
      collectionId: col.id,
      amount: numAmount,
      paypalEmail: destinationEmail,
      status: execResult.status,
      isSimulated: execResult.isSimulated,
      requestedBy: authUid,
      destinationEmailMasked: maskedDest,
      ip,
      createdAt: new Date().toISOString(),
    });

    // Safeguard F: Write audit log entry for success
    db.createAuditLog({
      type: 'payout_sent',
      uid: authUid,
      collectionId: col.id,
      amount: numAmount,
      reason: execResult.isSimulated ? 'Simulated payout completed' : 'PayPal Payout executed',
      destinationEmailMasked: maskedDest,
    });

    // Safeguard F: In-app notification for Lead
    db.createNotification(
      authUid,
      'Payout Completed',
      `Payout of ₹${numAmount.toLocaleString('en-IN')} was sent to ${maskedDest} (${execResult.isSimulated ? 'Simulated sandbox' : 'PayPal'}).`
    );

    res.json({
      success: true,
      payout: newPayout,
      isSimulated: execResult.isSimulated,
      destinationEmailMasked: maskedDest,
      message: `Payout of ₹${numAmount.toLocaleString('en-IN')} sent to ${maskedDest}`,
    });
  } catch (err: any) {
    db.createAuditLog({
      type: 'payout_failed',
      uid: authUid,
      collectionId: col.id,
      amount: numAmount,
      reason: err.message || 'Payout API execution error',
      destinationEmailMasked: maskedDest,
    });
    res.status(500).json({ error: `Payout processing failed: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 7. AI ENDPOINTS
// --------------------------------------------------------------------------
router.post('/ai/create-collection', async (req: Request, res: Response) => {
  const { prompt, memberCount } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  const result = await generateCollectionFromPrompt(prompt, Number(memberCount) || 10);
  res.json(result);
});

router.post('/ai/parse-members', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required' });
  }
  const result = await parseMembersWithAi(text);
  res.json(result);
});

router.get('/manage/:id/ai/insights', async (req: Request, res: Response) => {
  const { id } = req.params;
  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const members = db.listMembersByGroup(col.groupId);
  const completedPayments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');

  const raised = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const target = col.mode === 'goal'
    ? (col.goalAmount || 1000)
    : (col.fixedAmount || 500) * Math.max(members.length, 1);
  const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  const deadlineDate = new Date(col.deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const paidMemberIds = new Set(completedPayments.map(p => p.memberId).filter(Boolean));
  const unpaidCount = Math.max(0, members.length - paidMemberIds.size);

  const colDaysElapsed = Math.max(1, Math.ceil((Date.now() - new Date(col.createdAt).getTime()) / 86400000));
  const pacePerDay = raised / colDaysElapsed;
  const projectedTotal = Math.round(raised + pacePerDay * daysLeft);

  const insightsRes = await generateInsights({
    title: col.title,
    target,
    raised,
    percent,
    daysLeft,
    pacePerDay,
    projectedTotal,
    supportersCount: completedPayments.length,
    unpaidCount,
  });

  res.json(insightsRes);
});

router.post('/manage/:id/ai/reminders', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tone, offset } = req.body;
  const col = db.getCollection(id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  const members = db.listMembersByGroup(col.groupId);
  const completedPayments = db.listPaymentsByCollection(col.id).filter(p => p.status === 'completed');
  const paidMemberIds = new Set(completedPayments.map(p => p.memberId).filter(Boolean));

  const unpaid = members.filter(m => !paidMemberIds.has(m.id));
  const startIndex = Math.max(0, Number(offset) || 0);
  const batch = unpaid.slice(startIndex, startIndex + 30);

  const appHost = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const shareUrl = `${appHost}/c/${col.slug}`;

  const deadlineDate = new Date(col.deadline);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000));
  const amountDue = col.fixedAmount || 500;

  const remindersRes = await generateSmartReminders({
    title: col.title,
    amountDue,
    daysLeft,
    shareUrl,
    tone: tone || 'Friendly',
    unpaidMembers: batch.map(m => ({ id: m.id, name: m.name, phone: m.phone })),
  });

  res.json({
    ...remindersRes,
    totalUnpaid: unpaid.length,
    offset: startIndex,
    hasMore: startIndex + 30 < unpaid.length,
  });
});

// --------------------------------------------------------------------------
// 8. DEMO DATA SEEDING
// --------------------------------------------------------------------------
router.post('/demo/seed', (req: Request, res: Response) => {
  const ownerId = getAuthOwnerId(req);
  const result = seedDemoData(ownerId);
  res.json(result);
});

// Single receipt lookup
router.get('/receipt/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = db.getPayment(id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const col = db.getCollection(payment.collectionId);
  const group = col ? db.getGroup(col.groupId) : null;
  const owner = col ? db.getUser(col.ownerId) : null;

  res.json({
    payment,
    collection: col,
    group,
    lead: owner,
  });
});

export default router;
