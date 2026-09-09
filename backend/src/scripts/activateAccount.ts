#!/usr/bin/env ts-node

import 'dotenv/config';
import { User } from '../models/User';

async function activateAccount(email: string) {
  console.log(`Searching for local user with email: ${email}`);

  const user = await User.findByEmail(email);
  if (!user) {
    throw new Error(`User with email ${email} was not found`);
  }

  await user.updatePrefs({ isActive: true, needsSetup: false });

  console.log('Account activated successfully');
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.name}`);
  console.log(`User ID: ${user.id}`);
}

const email = process.argv[2];

if (require.main === module) {
  if (!email) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register src/scripts/activateAccount.ts <email>');
    process.exit(1);
  }

  activateAccount(email)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`Account activation failed: ${error.message}`);
      process.exit(1);
    });
}

export { activateAccount };
