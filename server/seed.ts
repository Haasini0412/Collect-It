import { db } from './db';
import { Group, Member, Collection, Payment, Expense, Payout } from '../src/types';
import { inrToCharge } from './paypal';

export function seedDemoData(ownerId: string = 'demo-lead-uid') {
  const now = new Date();
  const daysAgo = (d: number, hours = 0) => new Date(now.getTime() - (d * 86400000) - (hours * 3600000)).toISOString();
  const daysFromNow = (d: number) => new Date(now.getTime() + (d * 86400000)).toISOString();

  // Ensure demo user exists with verified PayPal email set > 24 hours ago
  db.saveUser({
    uid: ownerId,
    name: 'Alex Johnson',
    email: 'lead@collectit.app',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
    paypalEmail: 'demo.lead@example.com',
    paypalEmailVerified: true,
    paypalEmailChangedAt: daysAgo(3),
  });

  // 1. Group: CS Batch 2026
  const group1Id = 'grp-cs-batch-2026';
  const group1: Group = {
    id: group1Id,
    ownerId,
    name: 'CS Batch 2026',
    type: 'Class',
    emoji: '🎓',
    description: 'Final year Computer Science and Engineering students cohort.',
    joinCode: 'CS2026B',
    joinOpen: true,
    memberCount: 12,
    createdAt: daysAgo(20),
  };
  db.saveGroup(group1);

  const csStudentNames = [
    { name: 'Aarav Sharma', phone: '919876543210', email: 'aarav.s@college.edu' },
    { name: 'Priya Patel', phone: '919876543211', email: 'priya.p@college.edu' },
    { name: 'Rohan Mehta', phone: '919876543212', email: 'rohan.m@college.edu' },
    { name: 'Ananya Iyer', phone: '919876543213', email: 'ananya.i@college.edu' },
    { name: 'Kabir Singh', phone: '919876543214', email: 'kabir.s@college.edu' },
    { name: 'Meera Nair', phone: '919876543215', email: 'meera.n@college.edu' },
    { name: 'Vikram Rao', phone: '919876543216', email: 'vikram.r@college.edu' },
    { name: 'Sneha Kulkarni', phone: '919876543217', email: 'sneha.k@college.edu' },
    { name: 'Arjun Reddy', phone: '919876543218', email: 'arjun.r@college.edu' },
    { name: 'Isha Gupta', phone: '919876543219', email: 'isha.g@college.edu' },
    { name: 'Dev Malhotra', phone: '919876543220', email: 'dev.m@college.edu' },
    { name: 'Tanya Bose', phone: '919876543221', email: 'tanya.b@college.edu' },
  ];

  const csMembers: Member[] = csStudentNames.map((st, i) => ({
    id: `mem-cs-${i + 1}`,
    groupId: group1Id,
    name: st.name,
    email: st.email,
    phone: st.phone,
    source: 'demo',
    createdAt: daysAgo(18, i),
  }));
  db.saveMembersBulk(csMembers, group1Id);

  // 1a. Collection: Farewell Party Fund (candy)
  const colFarewellId = 'col-farewell-2026';
  const colFarewell: Collection = {
    id: colFarewellId,
    groupId: group1Id,
    ownerId,
    slug: 'cs-farewell-2026',
    title: 'Farewell Party Fund',
    purpose: 'Venue reservation, customized batch hoodies, DJ sound system, and grand buffet dinner.',
    emoji: '🎉',
    theme: 'candy',
    mode: 'fixed',
    goalAmount: null,
    fixedAmount: 500,
    currency: 'INR',
    deadline: daysAgo(1),
    status: 'closed', // Closed so payout flow can be demonstrated live
    createdAt: daysAgo(7),
  };
  db.saveCollection(colFarewell);

  // 8 of 12 paid
  const farewellPaidIndexes = [0, 1, 2, 3, 4, 5, 6, 7];
  farewellPaidIndexes.forEach((idx, i) => {
    const mem = csMembers[idx];
    const { chargeAmount, chargeCurrency, fxRate } = inrToCharge(500);
    const pmt: Payment = {
      id: `pmt-fw-${i + 1}`,
      collectionId: colFarewellId,
      memberId: mem.id,
      payerName: mem.name,
      payerEmail: mem.email,
      amount: 500,
      currency: 'INR',
      chargedAmount: chargeAmount,
      chargeCurrency,
      fxRate,
      note: i === 1 ? 'So excited for the graduation night!' : null,
      isAnonymous: false,
      paypalOrderId: `ORDER-DEMO-FW-${i + 1}`,
      paypalCaptureId: `CAP-DEMO-FW-${i + 1}`,
      status: 'completed',
      isDemo: true,
      createdAt: daysAgo(6 - Math.floor(i * 0.7), i * 2),
      completedAt: daysAgo(6 - Math.floor(i * 0.7), i * 2),
    };
    db.savePayment(pmt);
  });

  // Expenses for Farewell
  const exp1: Expense = {
    id: 'exp-fw-1',
    collectionId: colFarewellId,
    description: 'Venue booking deposit',
    amount: 1500,
    spentOn: 'Banquet Hall reservation deposit',
    createdAt: daysAgo(3),
  };
  const exp2: Expense = {
    id: 'exp-fw-2',
    collectionId: colFarewellId,
    description: 'Decorations & Photo Booth',
    amount: 900,
    spentOn: 'Fairy lights, customized batch banner, photo props',
    createdAt: daysAgo(1),
  };
  db.saveExpense(exp1);
  db.saveExpense(exp2);

  // Payout example for Farewell (Payout Safety v4.1: server fixed verified destination)
  const payout1: Payout = {
    id: 'payout-fw-1',
    collectionId: colFarewellId,
    amount: 1000,
    paypalEmail: 'demo.lead@example.com',
    requestedBy: ownerId,
    destinationEmailMasked: 'de***@example.com',
    status: 'sent',
    isSimulated: true,
    ip: '127.0.0.1',
    createdAt: daysAgo(1, 4),
  };
  db.savePayout(payout1);

  // Seed Initial Audit Logs for Farewell Fund
  db.createAuditLog({
    type: 'paypal_email_set',
    uid: ownerId,
    reason: 'Payout PayPal account configured',
    destinationEmailMasked: 'de***@example.com',
  });
  db.createAuditLog({
    type: 'paypal_email_verified',
    uid: ownerId,
    reason: 'Payout PayPal account verified via fast-path',
    destinationEmailMasked: 'de***@example.com',
  });
  db.createAuditLog({
    type: 'payout_requested',
    uid: ownerId,
    collectionId: colFarewellId,
    amount: 1000,
    reason: 'Payout requested by Lead',
    destinationEmailMasked: 'de***@example.com',
  });
  db.createAuditLog({
    type: 'payout_sent',
    uid: ownerId,
    collectionId: colFarewellId,
    amount: 1000,
    reason: 'Simulated sandbox payout completed to verified account',
    destinationEmailMasked: 'de***@example.com',
  });

  // Seed Initial In-App Notification
  db.createNotification(
    ownerId,
    'Payout Completed',
    'Payout of ₹1,000 sent to verified PayPal account de***@example.com (Simulated sandbox).'
  );

  // 1b. Collection: Class Trip to Goa (ocean)
  const colGoaId = 'col-trip-goa-2026';
  const colGoa: Collection = {
    id: colGoaId,
    groupId: group1Id,
    ownerId,
    slug: 'goa-trip-2026',
    title: 'Class Trip to Goa',
    purpose: 'Chartered sleeper bus, North Goa beach resort stay, and scuba expedition passes.',
    emoji: '🏖️',
    theme: 'ocean',
    mode: 'fixed',
    goalAmount: null,
    fixedAmount: 6000,
    currency: 'INR',
    deadline: daysFromNow(30),
    status: 'active',
    createdAt: daysAgo(5),
  };
  db.saveCollection(colGoa);

  // 3 of 12 paid
  [0, 1, 2].forEach((idx, i) => {
    const mem = csMembers[idx];
    const { chargeAmount, chargeCurrency, fxRate } = inrToCharge(6000);
    const pmt: Payment = {
      id: `pmt-goa-${i + 1}`,
      collectionId: colGoaId,
      memberId: mem.id,
      payerName: mem.name,
      payerEmail: mem.email,
      amount: 6000,
      currency: 'INR',
      chargedAmount: chargeAmount,
      chargeCurrency,
      fxRate,
      note: 'Advance booked!',
      isAnonymous: false,
      paypalOrderId: `ORDER-DEMO-GOA-${i + 1}`,
      paypalCaptureId: `CAP-DEMO-GOA-${i + 1}`,
      status: 'completed',
      isDemo: true,
      createdAt: daysAgo(4 - i, 3),
      completedAt: daysAgo(4 - i, 3),
    };
    db.savePayment(pmt);
  });

  // 2. Group: Roommates 4B
  const group2Id = 'grp-roommates-4b';
  const group2: Group = {
    id: group2Id,
    ownerId,
    name: 'Roommates 4B',
    type: 'Friends',
    emoji: '🏠',
    description: 'Shared flat essentials and weekend party pools.',
    joinCode: 'FLAT4B',
    joinOpen: true,
    memberCount: 5,
    createdAt: daysAgo(25),
  };
  db.saveGroup(group2);

  const flatMates = ['Neel', 'Zara', 'Omar', 'Lena', 'Sam'];
  const flatMembers: Member[] = flatMates.map((name, i) => ({
    id: `mem-flat-${i + 1}`,
    groupId: group2Id,
    name,
    email: `${name.toLowerCase()}@flatmates.in`,
    phone: `91981100220${i}`,
    source: 'demo',
    createdAt: daysAgo(24),
  }));
  db.saveMembersBulk(flatMembers, group2Id);

  // 2a. Collection: Diwali House Party (sunset) - Goal mode ₹10,000
  const colDiwaliId = 'col-diwali-party';
  const colDiwali: Collection = {
    id: colDiwaliId,
    groupId: group2Id,
    ownerId,
    slug: 'diwali-house-party',
    title: 'Diwali House Party',
    purpose: 'Diwali sweets box, diyas, card party snacks, mocktails, and festive dinner spread.',
    emoji: '🪔',
    theme: 'sunset',
    mode: 'goal',
    goalAmount: 10000,
    fixedAmount: null,
    currency: 'INR',
    deadline: daysFromNow(7),
    status: 'active',
    createdAt: daysAgo(6),
  };
  db.saveCollection(colDiwali);

  const diwaliPayments = [
    { name: 'Neel', amount: 500, note: null, anon: false },
    { name: 'Zara', amount: 1000, note: "Can't wait! 🪔", anon: false },
    { name: 'Omar', amount: 400, note: null, anon: false },
    { name: 'Lena', amount: 1500, note: 'Bringing special laddoos too!', anon: false },
    { name: 'Sam', amount: 800, note: null, anon: false },
    { name: 'Anonymous', amount: 600, note: 'Secret contributor :)', anon: true },
  ];
  diwaliPayments.forEach((dp, i) => {
    const { chargeAmount, chargeCurrency, fxRate } = inrToCharge(dp.amount);
    db.savePayment({
      id: `pmt-diwali-${i + 1}`,
      collectionId: colDiwaliId,
      memberId: null,
      payerName: dp.name,
      payerEmail: `${dp.name.toLowerCase()}@example.com`,
      amount: dp.amount,
      currency: 'INR',
      chargedAmount: chargeAmount,
      chargeCurrency,
      fxRate,
      note: dp.note,
      isAnonymous: dp.anon,
      paypalOrderId: `ORDER-DEMO-DIWALI-${i + 1}`,
      paypalCaptureId: `CAP-DEMO-DIWALI-${i + 1}`,
      status: 'completed',
      isDemo: true,
      createdAt: daysAgo(5 - Math.floor(i * 0.8), i * 3),
      completedAt: daysAgo(5 - Math.floor(i * 0.8), i * 3),
    });
  });

  // 3. Group: TechNova Fest 2026
  const group3Id = 'grp-technova-2026';
  const group3: Group = {
    id: group3Id,
    ownerId,
    name: 'TechNova Fest 2026',
    type: 'Fest',
    emoji: '🚀',
    description: 'Annual National Technical Symposium with 5,000+ expected footfalls.',
    joinCode: 'TECHNOVA',
    joinOpen: true,
    memberCount: 20,
    createdAt: daysAgo(30),
  };
  db.saveGroup(group3);

  // Generate 20 committee members
  const festNames = [
    'Aditya Verma', 'Rhea Sen', 'Gaurav Joshi', 'Kavita Chawla', 'Siddharth Roy',
    'Nidhi Saxena', 'Karan Pillai', 'Mansi Kapoor', 'Akash Singhal', 'Pooja Bhatt',
    'Manish Das', 'Swati Deshmukh', 'Varun Menon', 'Shreya Soni', 'Naveen Kumar',
    'Pallavi Joshi', 'Harsh Chopra', 'Divya Jain', 'Rishi Kulkarni', 'Anjali Nambiar'
  ];
  const festMembers: Member[] = festNames.map((name, i) => ({
    id: `mem-fest-${i + 1}`,
    groupId: group3Id,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@technovafest.org`,
    phone: `9198200330${(i < 10 ? '0' : '') + i}`,
    source: 'demo',
    createdAt: daysAgo(28, i),
  }));
  db.saveMembersBulk(festMembers, group3Id);

  // 3a. Collection: Fest Sponsorship Pool (midnight) - Goal mode ₹5,00,000
  const colSponsorId = 'col-technova-sponsor';
  const colSponsor: Collection = {
    id: colSponsorId,
    groupId: group3Id,
    ownerId,
    slug: 'technova-sponsorship',
    title: 'Fest Sponsorship Pool',
    purpose: 'Alumni, enterprise sponsors, and angel contributions for main stage production and cash prize pool.',
    emoji: '💼',
    theme: 'midnight',
    mode: 'goal',
    goalAmount: 500000,
    fixedAmount: null,
    currency: 'INR',
    deadline: daysFromNow(21),
    status: 'active',
    createdAt: daysAgo(14),
  };
  db.saveCollection(colSponsor);

  // 14 payments totalling ~₹3,35,000
  const sponsorPayments = [
    { name: 'Alumni – Rahul K. (Singapore)', amount: 50000, note: 'Proud to support TechNova! Go seniors!' },
    { name: 'Maria Fernandez (Spain)', amount: 25000, note: 'Global alumni solidarity.' },
    { name: 'James Oduya (Kenya)', amount: 10000, note: 'Inspiring future tech builders.' },
    { name: 'DevX Systems Inc.', amount: 50000, note: 'Title Track Sponsor' },
    { name: 'Kavita Chawla (Batch 2020)', amount: 20000, note: 'Best wishes to organizing team!' },
    { name: 'CloudScale Ventures', amount: 40000, note: 'Cloud & AI Track Cash Prize Sponsor' },
    { name: 'Alumni Council Pune', amount: 35000, note: 'Student development fund contribution' },
    { name: 'CodeCraft Labs', amount: 30000, note: 'Hackathon Silver Sponsor' },
    { name: 'Aarav Singhania', amount: 15000, note: 'Tech enthusiast gift' },
    { name: 'Fintech Angels Group', amount: 25000, note: 'FinTech Challenge Prize Pool' },
    { name: 'Anonymous Alum', amount: 10000, note: null, anon: true },
    { name: 'NextGen Robotics Club', amount: 10000, note: 'Hardware arena support' },
    { name: 'Dr. Suresh V. Raman', amount: 10000, note: 'Faculty patron donation' },
    { name: 'CyberSec Alums', amount: 5000, note: 'CTF prize pool boost' },
  ];

  sponsorPayments.forEach((sp, i) => {
    const { chargeAmount, chargeCurrency, fxRate } = inrToCharge(sp.amount);
    db.savePayment({
      id: `pmt-spons-${i + 1}`,
      collectionId: colSponsorId,
      memberId: null,
      payerName: sp.name,
      payerEmail: `sponsor.${i + 1}@paypal-demo.org`,
      amount: sp.amount,
      currency: 'INR',
      chargedAmount: chargeAmount,
      chargeCurrency,
      fxRate,
      note: sp.note,
      isAnonymous: Boolean((sp as any).anon),
      paypalOrderId: `ORDER-SPONS-${i + 1}`,
      paypalCaptureId: `CAP-SPONS-${i + 1}`,
      status: 'completed',
      isDemo: true,
      createdAt: daysAgo(12 - Math.floor(i * 0.8), i * 3),
      completedAt: daysAgo(12 - Math.floor(i * 0.8), i * 3),
    });
  });

  // Sponsorship expenses
  db.saveExpense({
    id: 'exp-spons-1',
    collectionId: colSponsorId,
    description: 'Stage & AV rental',
    amount: 45000,
    spentOn: 'Truss, LED display wall, sound system deposit',
    createdAt: daysAgo(4),
  });
  db.saveExpense({
    id: 'exp-spons-2',
    collectionId: colSponsorId,
    description: 'Prize pool advance',
    amount: 30000,
    spentOn: 'Winner certificate mementos and escrow advance',
    createdAt: daysAgo(2),
  });

  // 3b. Collection: Student Registration Fee (aurora) - Fixed mode ₹250
  const colRegId = 'col-fest-reg';
  const colReg: Collection = {
    id: colRegId,
    groupId: group3Id,
    ownerId,
    slug: 'technova-reg-pass',
    title: 'Student Registration Fee',
    purpose: 'Delegate ID badge, conference lunch coupons, hackathon swag pack, and certificate of participation.',
    emoji: '🎟️',
    theme: 'aurora',
    mode: 'fixed',
    goalAmount: null,
    fixedAmount: 250,
    currency: 'INR',
    deadline: daysFromNow(15),
    status: 'active',
    createdAt: daysAgo(8),
  };
  db.saveCollection(colReg);

  // 13 of 20 paid
  for (let i = 0; i < 13; i++) {
    const mem = festMembers[i];
    const { chargeAmount, chargeCurrency, fxRate } = inrToCharge(250);
    db.savePayment({
      id: `pmt-reg-${i + 1}`,
      collectionId: colRegId,
      memberId: mem.id,
      payerName: mem.name,
      payerEmail: mem.email,
      amount: 250,
      currency: 'INR',
      chargedAmount: chargeAmount,
      chargeCurrency,
      fxRate,
      note: null,
      isAnonymous: false,
      paypalOrderId: `ORDER-REG-${i + 1}`,
      paypalCaptureId: `CAP-REG-${i + 1}`,
      status: 'completed',
      isDemo: true,
      createdAt: daysAgo(7 - Math.floor(i * 0.5), i * 2),
      completedAt: daysAgo(7 - Math.floor(i * 0.5), i * 2),
    });
  }

  return {
    success: true,
    message: 'Demo dataset populated successfully with 3 groups and 5 collections!',
  };
}

export function generateSampleRoster(count = 50) {
  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Dhruv', 'Kabir', 'Rohan', 'Aryan', 'Samar', 'Dev', 'Manish', 'Vikram', 'Varun', 'Naveen',
    'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Isha', 'Meera', 'Rhea', 'Kavita', 'Sneha',
    'Pooja', 'Anjali', 'Swati', 'Tanya', 'Nidhi', 'Mansi', 'Pallavi', 'Divya', 'Shreya', 'Neha',
    'Tanvi', 'Simran', 'Kriti', 'Payal', 'Bhavna', 'Shalini', 'Kareena', 'Siddhi', 'Deepa', 'Prachi'
  ];

  const lastNames = [
    'Sharma', 'Patel', 'Mehta', 'Iyer', 'Singh', 'Nair', 'Rao', 'Kulkarni', 'Reddy', 'Gupta',
    'Malhotra', 'Bose', 'Verma', 'Sen', 'Joshi', 'Chawla', 'Roy', 'Saxena', 'Pillai', 'Kapoor',
    'Singhal', 'Bhatt', 'Das', 'Deshmukh', 'Menon', 'Soni', 'Kumar', 'Chopra', 'Jain', 'Nambiar'
  ];

  const results: Array<{ name: string; email: string; phone: string }> = [];

  for (let i = 0; i < count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@college.edu`;
    // 10-digit phone
    const phone = `98${Math.floor(10000000 + (i * 183742) % 90000000)}`;
    results.push({ name, email, phone });
  }

  return results;
}
