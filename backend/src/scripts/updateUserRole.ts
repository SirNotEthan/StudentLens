#!/usr/bin/env ts-node

import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../../.env') });

import { users } from '../config/appwrite';
import { User } from '../models/User';
import { UserRole } from '../types';

async function listUsers(): Promise<any[]> {
  try {
    console.log('📋 Listing all users...');
    const usersList = await users.list();

    console.log('\n=== USERS LIST ===');
    usersList.users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ID: ${user.$id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Username: ${user.prefs?.username || 'Not set'}`);
      console.log(`   Current Role: ${user.prefs?.role || 'Student'}`);
      console.log(`   Active: ${user.prefs?.isActive !== false ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(user.$createdAt).toLocaleDateString()}`);
      console.log('---');
    });

    return usersList.users;
  } catch (error: any) {
    console.error('❌ Error listing users:', error.message);
    throw error;
  }
}

async function updateUserRole(userId: string, newRole: UserRole): Promise<User> {
  try {
    console.log(`🔄 Updating user ${userId} to role: ${newRole}`);

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    console.log(`👤 Found user: ${user.email} (${user.username || 'no username'})`);
    console.log(`📝 Current role: ${user.role}`);

    const updateData = {
      role: newRole,
      permissions: User.getPermissionsByRole(newRole)
    };

    await user.updatePrefs(updateData);

    console.log(`✅ Successfully updated user role to: ${newRole}`);
    console.log(`🔑 New permissions: ${updateData.permissions.join(', ')}`);

    return user;
  } catch (error: any) {
    console.error('❌ Error updating user role:', error.message);
    throw error;
  }
}

async function findUserByEmail(email: string): Promise<User | null> {
  try {
    console.log(`🔍 Searching for user with email: ${email}`);
    const user = await User.findByEmail(email);

    if (!user) {
      console.log('❌ User not found');
      return null;
    }

    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'Not set'}`);
    console.log(`   Current Role: ${user.role}`);

    return user;
  } catch (error: any) {
    console.error('❌ Error finding user:', error.message);
    throw error;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  try {
    if (args.length === 0) {
      console.log(`
🔧 User Role Management Script (TypeScript)

Usage:
  npx ts-node src/scripts/updateUserRole.ts list                    # List all users
  npx ts-node src/scripts/updateUserRole.ts update <userId> <role>  # Update user role by ID
  npx ts-node src/scripts/updateUserRole.ts find <email>            # Find user by email
  npx ts-node src/scripts/updateUserRole.ts promote <email>         # Promote user to Owner role

Available roles: Student, Teacher, Editor, Publisher, Owner

Examples:
  npx ts-node src/scripts/updateUserRole.ts list
  npx ts-node src/scripts/updateUserRole.ts find user@example.com
  npx ts-node src/scripts/updateUserRole.ts promote user@example.com
  npx ts-node src/scripts/updateUserRole.ts update 64f123abc456def789 Owner
      `);
      return;
    }

    const command = args[0];

    switch (command) {
      case 'list':
        await listUsers();
        break;

      case 'find':
        if (args.length < 2) {
          console.error('❌ Please provide an email address');
          return;
        }
        await findUserByEmail(args[1]);
        break;

      case 'promote':
        if (args.length < 2) {
          console.error('❌ Please provide an email address');
          return;
        }
        const userToPromote = await findUserByEmail(args[1]);
        if (userToPromote) {
          await updateUserRole(userToPromote.id, 'Owner');
        }
        break;

      case 'update':
        if (args.length < 3) {
          console.error('❌ Please provide user ID and new role');
          console.error('Usage: npx ts-node src/scripts/updateUserRole.ts update <userId> <role>');
          return;
        }
        await updateUserRole(args[1], args[2] as UserRole);
        break;

      default:
        console.error('❌ Unknown command. Use "list", "find", "promote", or "update"');
        break;
    }

  } catch (error: any) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}