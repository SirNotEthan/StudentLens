#!/usr/bin/env ts-node

import 'dotenv/config';
import { users } from '../config/appwrite';
import { appLogger } from '../services/logger';

async function activateAccount(email: string) {
  try {
    console.log(`🔍 Searching for user with email: ${email}`);

    // List all users and find the one with the matching email
    const usersList = await users.list();
    const user = usersList.users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      return;
    }

    console.log(`✅ Found user: ${user.name} (ID: ${user.$id})`);
    console.log(`📊 Current status: isActive = ${user.prefs?.isActive !== false}`);

    // Update user preferences to set isActive to true
    await users.updatePrefs(user.$id, {
      ...user.prefs,
      isActive: true
    });

    console.log(`✅ Account activated successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`🆔 User ID: ${user.$id}`);

  } catch (error: any) {
    console.error('❌ Failed to activate account:', error.message);
    throw error;
  }
}

// Get email from command line arguments or use default
const email = process.argv[2] || 'ethn.bannister15@gmail.com';

if (require.main === module) {
  activateAccount(email)
    .then(() => {
      console.log('\n🎉 Account activation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Account activation failed:', error);
      process.exit(1);
    });
}

export { activateAccount };
