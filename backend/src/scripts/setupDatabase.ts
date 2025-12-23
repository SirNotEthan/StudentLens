#!/usr/bin/env ts-node

import 'dotenv/config'; 
import { databases, client } from '../config/appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts';
const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID || 'users';
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || 'comments';
const BOOKMARKS_COLLECTION_ID = process.env.APPWRITE_BOOKMARKS_COLLECTION_ID || 'bookmarks';
const APPLICATIONS_COLLECTION_ID = process.env.APPWRITE_APPLICATIONS_COLLECTION_ID || 'writer_applications';

async function setupDatabase() {
  try {
    console.log('🔧 Setting up Appwrite database collections...');
    console.log(`📊 Database ID: ${DATABASE_ID}`);

    try {
      const database = await databases.get(DATABASE_ID);
      console.log(`✅ Database exists: ${database.name}`);
    } catch (error: any) {
      if (error.code === 404) {
        console.log('❌ Database not found. Please create the database in Appwrite console first.');
        console.log(`   Database ID: ${DATABASE_ID}`);
        return;
      }
      throw error;
    }

    await setupPostsCollection();

    await setupCommentsCollection();

    await setupBookmarksCollection();

    await setupUsersCollection();

    await setupApplicationsCollection();

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Posts Collection: ${POSTS_COLLECTION_ID}`);
    console.log(`   - Comments Collection: ${COMMENTS_COLLECTION_ID}`);
    console.log(`   - Bookmarks Collection: ${BOOKMARKS_COLLECTION_ID}`);
    console.log(`   - Users Collection: ${USERS_COLLECTION_ID}`);
    console.log(`   - Applications Collection: ${APPLICATIONS_COLLECTION_ID}`);

  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

async function setupPostsCollection() {
  try {
    console.log(`\n📝 Setting up Posts collection (${POSTS_COLLECTION_ID})...`);

    let collectionExists = false;
    try {
      await databases.getCollection(DATABASE_ID, POSTS_COLLECTION_ID);
      console.log('✅ Posts collection already exists - checking attributes');
      collectionExists = true;
    } catch (error: any) {
      if (error.code !== 404) throw error;
    }

    if (!collectionExists) {
      const collection = await databases.createCollection(
      DATABASE_ID,
      POSTS_COLLECTION_ID,
      'Posts',
      ['read("any")', 'write("users")'] 
      );

      console.log('✅ Posts collection created');
    }

    const stringAttributes = [
      { key: 'title', size: 255, required: true },
      { key: 'content', size: 50000, required: true },
      { key: 'excerpt', size: 500, required: false },
      { key: 'authorId', size: 50, required: true },
      { key: 'authorName', size: 100, required: true },
      { key: 'category', size: 50, required: true },
      { key: 'tags', size: 1000, required: false, array: true },
      { key: 'status', size: 20, required: true },
      { key: 'featuredImage', size: 500, required: false },
      { key: 'slug', size: 255, required: true },
      { key: 'editorId', size: 50, required: false },
      { key: 'editorName', size: 100, required: false },
      { key: 'reviewerId', size: 50, required: false },
      { key: 'reviewerName', size: 100, required: false },
      { key: 'likedUsers', size: 50, required: false, array: true }
    ];

    const integerAttributes = [
      { key: 'viewCount', required: false, default: 0 },
      { key: 'likes', required: false, default: 0 }
    ];

    const datetimeAttributes = [
      { key: 'publishedAt', required: false },
      { key: 'submittedAt', required: false },
      { key: 'reviewedAt', required: false }
    ];

    for (const attr of stringAttributes) {
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          POSTS_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required,
          undefined,
          attr.array
        );
        console.log(`  ✅ Created string attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    for (const attr of integerAttributes) {
      try {
        await databases.createIntegerAttribute(
          DATABASE_ID,
          POSTS_COLLECTION_ID,
          attr.key,
          attr.required,
          undefined,
          undefined,
          attr.default
        );
        console.log(`  ✅ Created integer attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    for (const attr of datetimeAttributes) {
      try {
        await databases.createDatetimeAttribute(
          DATABASE_ID,
          POSTS_COLLECTION_ID,
          attr.key,
          attr.required
        );
        console.log(`  ✅ Created datetime attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    const indexes = [
      { key: 'slug', type: 'unique', attributes: ['slug'] },
      { key: 'status', type: 'key', attributes: ['status'] },
      { key: 'category', type: 'key', attributes: ['category'] },
      { key: 'authorId', type: 'key', attributes: ['authorId'] },
      { key: 'publishedAt', type: 'key', attributes: ['publishedAt'] }
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          POSTS_COLLECTION_ID,
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`  ✅ Created index: ${index.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Index already exists: ${index.key}`);
        } else {
          console.error(`  ❌ Failed to create index ${index.key}:`, error.message);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Failed to setup Posts collection:', error.message);
    throw error;
  }
}

async function setupCommentsCollection() {
  try {
    console.log(`\n💬 Setting up Comments collection (${COMMENTS_COLLECTION_ID})...`);

    try {
      await databases.getCollection(DATABASE_ID, COMMENTS_COLLECTION_ID);
      console.log('✅ Comments collection already exists');
      return;
    } catch (error: any) {
      if (error.code !== 404) throw error;
    }

    const collection = await databases.createCollection(
      DATABASE_ID,
      COMMENTS_COLLECTION_ID,
      'Comments',
      ['read("any")', 'write("users")'] 
    );

    console.log('✅ Comments collection created');

    const stringAttributes = [
      { key: 'postId', size: 50, required: true },
      { key: 'authorId', size: 50, required: true },
      { key: 'authorName', size: 100, required: true },
      { key: 'content', size: 2000, required: true },
      { key: 'parentId', size: 50, required: false }
    ];

    const arrayAttributes = [
      { key: 'likedUsers', size: 50, required: false }
    ];

    const integerAttributes = [
      { key: 'likes', required: false, default: 0 }
    ];

    const booleanAttributes = [
      { key: 'isDeleted', required: false, default: false }
    ];

    for (const attr of stringAttributes) {
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COMMENTS_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required
        );
        console.log(`  ✅ Created string attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    for (const attr of integerAttributes) {
      try {
        await databases.createIntegerAttribute(
          DATABASE_ID,
          COMMENTS_COLLECTION_ID,
          attr.key,
          attr.required,
          undefined,
          undefined,
          attr.default
        );
        console.log(`  ✅ Created integer attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    for (const attr of booleanAttributes) {
      try {
        await databases.createBooleanAttribute(
          DATABASE_ID,
          COMMENTS_COLLECTION_ID,
          attr.key,
          attr.required,
          attr.default
        );
        console.log(`  ✅ Created boolean attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    for (const attr of arrayAttributes) {
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COMMENTS_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required,
          undefined,
          true 
        );
        console.log(`  ✅ Created array attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    const indexes = [
      { key: 'postId', type: 'key', attributes: ['postId'] },
      { key: 'authorId', type: 'key', attributes: ['authorId'] },
      { key: 'parentId', type: 'key', attributes: ['parentId'] },
      { key: 'isDeleted', type: 'key', attributes: ['isDeleted'] }
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          COMMENTS_COLLECTION_ID,
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`  ✅ Created index: ${index.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Index already exists: ${index.key}`);
        } else {
          console.error(`  ❌ Failed to create index ${index.key}:`, error.message);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Failed to setup Comments collection:', error.message);
    throw error;
  }
}

async function setupBookmarksCollection() {
  try {
    console.log(`\n🔖 Setting up Bookmarks collection (${BOOKMARKS_COLLECTION_ID})...`);

    let collectionExists = false;
    try {
      await databases.getCollection(DATABASE_ID, BOOKMARKS_COLLECTION_ID);
      console.log('✅ Bookmarks collection already exists - checking attributes');
      collectionExists = true;
    } catch (error: any) {
      if (error.code !== 404) throw error;
    }

    if (!collectionExists) {
      const collection = await databases.createCollection(
        DATABASE_ID,
        BOOKMARKS_COLLECTION_ID,
        'Bookmarks',
        ['read("users")', 'write("users")'] 
      );

      console.log('✅ Bookmarks collection created');
    }

    const stringAttributes = [
      { key: 'userId', size: 50, required: true },
      { key: 'postId', size: 50, required: true }
    ];

    for (const attr of stringAttributes) {
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          BOOKMARKS_COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required
        );
        console.log(`  ✅ Created string attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
        }
      }
    }

    const indexes = [
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'postId', type: 'key', attributes: ['postId'] },
      { key: 'userPost', type: 'unique', attributes: ['userId', 'postId'] }
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          BOOKMARKS_COLLECTION_ID,
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`  ✅ Created index: ${index.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Index already exists: ${index.key}`);
        } else {
          console.error(`  ❌ Failed to create index ${index.key}:`, error.message);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Failed to setup Bookmarks collection:', error.message);
    throw error;
  }
}

async function setupUsersCollection() {
  try {
    console.log(`\n👤 Setting up Users collection (${USERS_COLLECTION_ID})...`);

    try {
      await databases.getCollection(DATABASE_ID, USERS_COLLECTION_ID);
      console.log('✅ Users collection already exists');
      return;
    } catch (error: any) {
      if (error.code !== 404) throw error;
    }

    await databases.createCollection(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'Users',
      ['read("users")', 'write("users")'] 
    );

    console.log('✅ Users collection created');
    console.log('ℹ️  Users collection is optional - mainly for additional user data beyond Auth');

  } catch (error: any) {
    console.error('❌ Failed to setup Users collection:', error.message);
  }
}

async function setupApplicationsCollection() {
  try {
    console.log(`\n📝 Setting up Applications collection (${APPLICATIONS_COLLECTION_ID})...`);

    try {
      await databases.getCollection(DATABASE_ID, APPLICATIONS_COLLECTION_ID);
      console.log('✅ Applications collection already exists');
      return;
    } catch (error: any) {
      if (error.code !== 404) throw error;
    }

    await databases.createCollection(
      DATABASE_ID,
      APPLICATIONS_COLLECTION_ID,
      'Writer Applications',
      ['read("users")', 'write("users")']
    );

    console.log('✅ Applications collection created');

  } catch (error: any) {
    console.error('❌ Failed to setup Applications collection:', error.message);
  }
}

if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🎉 Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database setup failed:', error);
      process.exit(1);
    });
}