/**
 * Seed script — run once to bootstrap the database
 * Usage: npx tsx scripts/seed.ts
 *
 * Creates:
 *   - Permissions for all main resources
 *   - Roles: admin, creator (default), viewer
 *   - RolePermissions mapping
 *   - Admin user account
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { logger } from '../lib/logger';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI is not set in .env.local');

// Import models after env setup
import('../models/permission.model').then(async ({ default: Permission }) => {
  const { default: Role }           = await import('../models/role.model');
  const { default: RolePermission } = await import('../models/role-permission.model');
  const { default: User }           = await import('../models/user.model');

  await mongoose.connect(MONGODB_URI);
  logger.info('Connected to MongoDB', { eventType: 'db.connected' });

  // ─── 1. PERMISSIONS ──────────────────────────────────────────────────────
  const permDefs: Array<{
    resource: string; action: string; scope: 'own' | 'all'; description: string;
  }> = [
    // Project
    { resource: 'project', action: 'create', scope: 'own', description: 'Create own projects' },
    { resource: 'project', action: 'read',   scope: 'own', description: 'Read own projects' },
    { resource: 'project', action: 'read',   scope: 'all', description: 'Read all projects' },
    { resource: 'project', action: 'update', scope: 'own', description: 'Update own projects' },
    { resource: 'project', action: 'update', scope: 'all', description: 'Update any project' },
    { resource: 'project', action: 'delete', scope: 'own', description: 'Delete own projects' },
    { resource: 'project', action: 'delete', scope: 'all', description: 'Delete any project' },
    // Character
    { resource: 'character', action: 'create', scope: 'own', description: 'Create own characters' },
    { resource: 'character', action: 'read',   scope: 'own', description: 'Read own characters' },
    { resource: 'character', action: 'read',   scope: 'all', description: 'Read all characters' },
    { resource: 'character', action: 'update', scope: 'own', description: 'Update own characters' },
    { resource: 'character', action: 'delete', scope: 'own', description: 'Delete own characters' },
    { resource: 'character', action: 'delete', scope: 'all', description: 'Delete any character' },
    // Billing
    { resource: 'billing', action: 'read',   scope: 'own', description: 'View own billing' },
    { resource: 'billing', action: 'read',   scope: 'all', description: 'View all billing' },
    { resource: 'billing', action: 'update', scope: 'own', description: 'Update own billing' },
    { resource: 'billing', action: 'update', scope: 'all', description: 'Update any billing' },
    // Analytics
    { resource: 'analytics', action: 'read', scope: 'own', description: 'View own analytics' },
    { resource: 'analytics', action: 'read', scope: 'all', description: 'View all analytics' },
    // User management
    { resource: 'user', action: 'read',   scope: 'own', description: 'Read own profile' },
    { resource: 'user', action: 'read',   scope: 'all', description: 'Read all users' },
    { resource: 'user', action: 'update', scope: 'own', description: 'Update own profile' },
    { resource: 'user', action: 'update', scope: 'all', description: 'Update any user' },
    { resource: 'user', action: 'delete', scope: 'all', description: 'Delete any user' },
    // User management (create is admin-only)
    { resource: 'user', action: 'create', scope: 'all', description: 'Create any user' },
    // Role management
    { resource: 'role', action: 'create', scope: 'all', description: 'Create roles' },
    { resource: 'role', action: 'read',   scope: 'all', description: 'Read all roles' },
    { resource: 'role', action: 'update', scope: 'all', description: 'Update any role' },
    { resource: 'role', action: 'delete', scope: 'all', description: 'Delete any role' },
    // AI usage (admin-only)
    { resource: 'ai', action: 'read', scope: 'all', description: 'View all AI chat usage' },
    // Permission management (admin-only)
    { resource: 'permission', action: 'create', scope: 'all', description: 'Create permissions' },
    { resource: 'permission', action: 'read',   scope: 'all', description: 'Read all permissions' },
    { resource: 'permission', action: 'update', scope: 'all', description: 'Update any permission' },
    { resource: 'permission', action: 'delete', scope: 'all', description: 'Delete any permission' },
  ];

  const savedPerms = new Map<string, mongoose.Types.ObjectId>();
  for (const def of permDefs) {
    const perm = await Permission.findOneAndUpdate(
      { resource: def.resource, action: def.action, scope: def.scope },
      { $setOnInsert: def },
      { upsert: true, returnDocument: 'after' }
    );
    savedPerms.set(`${def.resource}:${def.action}:${def.scope}`, perm._id);
  }
  logger.info('Permissions seeded', {
    eventType: 'seed.step',
    resource:  'permission',
    data:      { created: { count: savedPerms.size } },
  });

  // ─── 2. ROLES ─────────────────────────────────────────────────────────────
  const roleDefs = [
    { name: 'admin',   description: 'Full access to all resources', isDefault: false },
    { name: 'creator', description: 'Standard creator access',      isDefault: true  },
    { name: 'viewer',  description: 'Read-only access',             isDefault: false },
  ];

  const savedRoles = new Map<string, mongoose.Types.ObjectId>();
  for (const def of roleDefs) {
    const role = await Role.findOneAndUpdate(
      { name: def.name },
      { $setOnInsert: def },
      { upsert: true, returnDocument: 'after' }
    );
    savedRoles.set(def.name, role._id);
  }
  logger.info('Roles seeded', {
    eventType: 'seed.step',
    resource:  'role',
    data:      { created: { count: savedRoles.size } },
  });

  // ─── 3. ROLE PERMISSIONS ──────────────────────────────────────────────────
  const rolePermMap: Record<string, string[]> = {
    admin: Array.from(savedPerms.keys()), // admin gets ALL permissions
    creator: [
      'project:create:own',
      'project:read:own',
      'project:update:own',
      'project:delete:own',
      'character:create:own',
      'character:read:own',
      'character:update:own',
      'character:delete:own',
      'billing:read:own',
      'billing:update:own',
      'analytics:read:own',
      'user:read:own',
      'user:update:own',
    ],
    viewer: [
      'project:read:own',
      'character:read:own',
      'analytics:read:own',
      'user:read:own',
    ],
  };

  let rpCount = 0;
  for (const [roleName, permKeys] of Object.entries(rolePermMap)) {
    const roleId = savedRoles.get(roleName);
    if (!roleId) continue;
    for (const key of permKeys) {
      const permId = savedPerms.get(key);
      if (!permId) continue;
      await RolePermission.findOneAndUpdate(
        { roleId, permissionId: permId },
        { $setOnInsert: { roleId, permissionId: permId } },
        { upsert: true }
      );
      rpCount++;
    }
  }
  logger.info('Role-permission mappings seeded', {
    eventType: 'seed.step',
    resource:  'role_permission',
    data:      { created: { count: rpCount } },
  });

  // ─── 4. PLANS ────────────────────────────────────────────────────────────────
  const { default: Plan } = await import('../models/plan.model');
  const planDefs = [
    {
      name:              'Starter',
      slug:              'starter',
      priceMonthly:      0,
      discount1Month:    0,
      discount3Months:   0,
      discount6Months:   0,
      tokenLimitMonthly: 50_000,
      features:          ['5 script generations / month', '3 script analyses / month', '1 character clone', 'Basic templates', 'Export to txt/json/docx'],
      cta:               'Start Free',
      badge:             null,
      isActive:          true,
      order:             0,
    },
    {
      name:              'Creator',
      slug:              'creator',
      priceMonthly:      299_000,
      discount1Month:    0,
      discount3Months:   10,
      discount6Months:   20,
      tokenLimitMonthly: 500_000,
      features:          ['Unlimited script generations', 'Unlimited script analyses', '10 character clones', 'Advanced templates', 'Priority AI processing', 'Export to all formats', 'Version history'],
      cta:               'Upgrade Now',
      badge:             'Most Popular',
      isActive:          true,
      order:             1,
    },
    {
      name:              'Enterprise',
      slug:              'enterprise',
      priceMonthly:      null,
      discount1Month:    0,
      discount3Months:   0,
      discount6Months:   0,
      tokenLimitMonthly: null,
      features:          ['Everything in Creator', 'Unlimited character clones', 'Team collaboration', 'API access', 'White-label exports', 'Dedicated support', 'Custom limits & integrations'],
      cta:               'Contact Us',
      badge:             null,
      isActive:          true,
      order:             2,
    },
  ];
  for (const def of planDefs) {
    await Plan.findOneAndUpdate({ slug: def.slug }, { $setOnInsert: def }, { upsert: true });
  }
  logger.info('Plans seeded', { eventType: 'seed.step', resource: 'plan', data: { count: planDefs.length } });

  // ─── 5. ADMIN USER ────────────────────────────────────────────────────────
  const ADMIN_EMAIL    = 'admin@gmail.com';
  const ADMIN_PASSWORD = 'Password*^';
  const ADMIN_NAME     = 'Super Admin';

  const adminRoleId = savedRoles.get('admin')!;
  const existing    = await User.findOne({ email: ADMIN_EMAIL });

  if (!existing) {
    await User.create({
      name:          ADMIN_NAME,
      email:         ADMIN_EMAIL,
      password:      ADMIN_PASSWORD,   // hashed by pre-save hook
      roleId:        adminRoleId,
      isActive:      true,
      emailVerified: new Date(),
    });
    logger.info('Admin user created', {
      eventType: 'seed.step',
      resource:  'user',
      data:      { created: { email: ADMIN_EMAIL, name: ADMIN_NAME } },
    });
  } else {
    logger.info('Admin user already exists, skipping', {
      eventType: 'seed.step',
      resource:  'user',
      metadata:  { email: ADMIN_EMAIL },
    });
  }

  logger.info('Seed completed successfully', { eventType: 'seed.complete' });
  await mongoose.disconnect();
  process.exit(0);
});
