import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Group, Member, Collection, Payment, Expense, Payout, UserProfile, AuditLog, InAppNotification } from '../src/types';

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  groups: Record<string, Group>;
  members: Record<string, Member>;
  collections: Record<string, Collection>;
  payments: Record<string, Payment>;
  expenses: Record<string, Expense>;
  payouts: Record<string, Payout>;
  auditLogs: Record<string, AuditLog>;
  notifications: Record<string, InAppNotification>;
  aiCache: Record<string, { kind: string; output: any; createdAt: string }>;
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');

class Database {
  private data: DatabaseSchema = {
    users: {},
    groups: {},
    members: {},
    collections: {},
    payments: {},
    expenses: {},
    payouts: {},
    auditLogs: {},
    notifications: {},
    aiCache: {},
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || {},
          groups: parsed.groups || {},
          members: parsed.members || {},
          collections: parsed.collections || {},
          payments: parsed.payments || {},
          expenses: parsed.expenses || {},
          payouts: parsed.payouts || {},
          auditLogs: parsed.auditLogs || {},
          notifications: parsed.notifications || {},
          aiCache: parsed.aiCache || {},
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Failed to load database file, starting fresh:', e);
    }
  }

  private save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save database file:', e);
    }
  }

  // Users
  getUser(uid: string): UserProfile | undefined {
    return this.data.users[uid];
  }

  saveUser(user: UserProfile) {
    this.data.users[user.uid] = user;
    this.save();
    return user;
  }

  // Groups
  getGroup(id: string): Group | undefined {
    return this.data.groups[id];
  }

  getGroupByJoinCode(joinCode: string): Group | undefined {
    return Object.values(this.data.groups).find(g => g.joinCode.toLowerCase() === joinCode.toLowerCase());
  }

  listGroupsByOwner(ownerId: string): Group[] {
    return Object.values(this.data.groups).filter(g => g.ownerId === ownerId);
  }

  saveGroup(group: Group) {
    this.data.groups[group.id] = group;
    this.save();
    return group;
  }

  deleteGroup(id: string) {
    delete this.data.groups[id];
    Object.values(this.data.members).forEach(m => {
      if (m.groupId === id) delete this.data.members[m.id];
    });
    Object.values(this.data.collections).forEach(c => {
      if (c.groupId === id) this.deleteCollection(c.id);
    });
    this.save();
  }

  // Members
  listMembersByGroup(groupId: string): Member[] {
    return Object.values(this.data.members).filter(m => m.groupId === groupId);
  }

  getMember(id: string): Member | undefined {
    return this.data.members[id];
  }

  saveMember(member: Member) {
    this.data.members[member.id] = member;
    this.updateMemberCount(member.groupId);
    this.save();
    return member;
  }

  saveMembersBulk(members: Member[], groupId: string) {
    members.forEach(m => {
      this.data.members[m.id] = m;
    });
    this.updateMemberCount(groupId);
    this.save();
  }

  deleteMember(id: string) {
    const mem = this.data.members[id];
    if (mem) {
      const gid = mem.groupId;
      delete this.data.members[id];
      this.updateMemberCount(gid);
      this.save();
    }
  }

  deleteMembersBulk(ids: string[], groupId: string) {
    ids.forEach(id => {
      delete this.data.members[id];
    });
    this.updateMemberCount(groupId);
    this.save();
  }

  private updateMemberCount(groupId: string) {
    const group = this.data.groups[groupId];
    if (group) {
      group.memberCount = this.listMembersByGroup(groupId).length;
    }
  }

  // Collections
  getCollection(id: string): Collection | undefined {
    return this.data.collections[id];
  }

  getCollectionBySlug(slug: string): Collection | undefined {
    return Object.values(this.data.collections).find(c => c.slug.toLowerCase() === slug.toLowerCase());
  }

  listCollectionsByGroup(groupId: string): Collection[] {
    return Object.values(this.data.collections).filter(c => c.groupId === groupId);
  }

  listCollectionsByOwner(ownerId: string): Collection[] {
    return Object.values(this.data.collections).filter(c => c.ownerId === ownerId);
  }

  saveCollection(col: Collection) {
    this.data.collections[col.id] = col;
    this.save();
    return col;
  }

  deleteCollection(id: string) {
    delete this.data.collections[id];
    Object.values(this.data.payments).forEach(p => {
      if (p.collectionId === id) delete this.data.payments[p.id];
    });
    Object.values(this.data.expenses).forEach(e => {
      if (e.collectionId === id) delete this.data.expenses[e.id];
    });
    Object.values(this.data.payouts).forEach(p => {
      if (p.collectionId === id) delete this.data.payouts[p.id];
    });
    this.save();
  }

  // Payments
  getPayment(id: string): Payment | undefined {
    return this.data.payments[id];
  }

  getPaymentByOrderId(orderId: string): Payment | undefined {
    return Object.values(this.data.payments).find(p => p.paypalOrderId === orderId);
  }

  listPaymentsByCollection(collectionId: string): Payment[] {
    return Object.values(this.data.payments).filter(p => p.collectionId === collectionId);
  }

  savePayment(payment: Payment) {
    this.data.payments[payment.id] = payment;
    this.save();
    return payment;
  }

  // Expenses
  listExpensesByCollection(collectionId: string): Expense[] {
    return Object.values(this.data.expenses).filter(e => e.collectionId === collectionId);
  }

  saveExpense(expense: Expense) {
    this.data.expenses[expense.id] = expense;
    this.save();
    return expense;
  }

  deleteExpense(id: string) {
    delete this.data.expenses[id];
    this.save();
  }

  // Payouts
  listPayoutsByCollection(collectionId: string): Payout[] {
    return Object.values(this.data.payouts).filter(p => p.collectionId === collectionId);
  }

  savePayout(payout: Payout) {
    this.data.payouts[payout.id] = payout;
    this.save();
    return payout;
  }

  // Audit Logs (Server-write only for Payout Safety)
  createAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const id = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const log: AuditLog = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs[id] = log;
    this.save();
    return log;
  }

  listAuditLogsByCollection(collectionId: string): AuditLog[] {
    return Object.values(this.data.auditLogs)
      .filter(l => l.collectionId === collectionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  listAuditLogsByUser(uid: string): AuditLog[] {
    return Object.values(this.data.auditLogs)
      .filter(l => l.uid === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // In-App Notifications for Lead
  createNotification(uid: string, title: string, message: string): InAppNotification {
    const id = `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const notification: InAppNotification = {
      id,
      uid,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications[id] = notification;
    this.save();
    return notification;
  }

  listNotificationsByUser(uid: string): InAppNotification[] {
    return Object.values(this.data.notifications)
      .filter(n => n.uid === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markNotificationsRead(uid: string) {
    Object.values(this.data.notifications).forEach(n => {
      if (n.uid === uid) n.read = true;
    });
    this.save();
  }

  // AI Cache
  getAiCache(hash: string): any | undefined {
    const item = this.data.aiCache[hash];
    if (!item) return undefined;
    const age = Date.now() - new Date(item.createdAt).getTime();
    if (age > 3600000) {
      delete this.data.aiCache[hash];
      return undefined;
    }
    return item.output;
  }

  setAiCache(hash: string, kind: string, output: any) {
    this.data.aiCache[hash] = {
      kind,
      output,
      createdAt: new Date().toISOString(),
    };
    this.save();
  }

  clearAll() {
    this.data = {
      users: {},
      groups: {},
      members: {},
      collections: {},
      payments: {},
      expenses: {},
      payouts: {},
      auditLogs: {},
      notifications: {},
      aiCache: {},
    };
    this.save();
  }
}

export const db = new Database();
