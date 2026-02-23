/**
 * Plan seeder — seed or update plans only
 * Usage: npx tsx scripts/seed-plans.ts
 *
 * Seeds: Starter, Creator, Enterprise
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env.local');
  process.exit(1);
}

async function run(uri: string) {
  const mongoose = await import('mongoose');
  const Plan = (await import('../models/plan.model')).default;

  await mongoose.connect(uri);

  const planDefs = [
    {
      name:              'Starter',
      slug:              'starter',
      priceMonthly:      0,
      discount1Month:    0,
      discount3Months:   0,
      discount6Months:   0,
      tokenLimitMonthly: 50_000,
      features:          [
        '5 script generations / month',
        '3 script analyses / month',
        '1 character clone',
        'Basic templates',
        'Export to txt/json/docx',
      ],
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
      features:          [
        'Unlimited script generations',
        'Unlimited script analyses',
        '10 character clones',
        'Advanced templates',
        'Priority AI processing',
        'Export to all formats',
        'Version history',
      ],
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
      features:          [
        'Everything in Creator',
        'Unlimited character clones',
        'Team collaboration',
        'API access',
        'White-label exports',
        'Dedicated support',
        'Custom limits & integrations',
      ],
      cta:               'Contact Us',
      badge:             null,
      isActive:          true,
      order:             2,
    },
  ];

  for (const def of planDefs) {
    await Plan.findOneAndUpdate(
      { slug: def.slug },
      { $setOnInsert: def },
      { upsert: true, new: true }
    );
    console.log(`Plan "${def.name}" seeded/updated.`);
  }

  console.log('Plans seeded successfully.');
  await mongoose.disconnect();
  process.exit(0);
}

run(MONGODB_URI).catch((err) => {
  console.error(err);
  process.exit(1);
});
