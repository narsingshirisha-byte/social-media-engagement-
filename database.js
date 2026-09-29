const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db_storage.json');

/**
 * Pure JavaScript Persistent SQL-compatible Database Engine
 * Implements persistent collections for all required schema tables.
 */
class PersistentDatabase {
  constructor() {
    this.data = {
      users: [],
      social_accounts: [],
      posts: [],
      post_metrics: [],
      comments: [],
      audience_profiles: [],
      audience_interactions: [],
      content_features: [],
      experiments: [],
      predictions: [],
      memories: [],
      scheduled_posts: [],
      agent_runs: []
    };
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      } else {
        this.seedInitialData();
        this.save();
      }
    } catch (err) {
      console.warn("Database initialization error, seeding defaults:", err.message);
      this.seedInitialData();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error("Failed to save database:", err.message);
    }
  }

  seedInitialData() {
    this.data.users = [{
      id: 'u_1',
      username: 'admin',
      brandName: 'TechVision AI',
      niche: 'Artificial Intelligence & Developer Tools',
      targetAudience: 'Software Engineers, Product Managers, Tech Founders',
      appMode: 'DEMO',
      createdAt: new Date().toISOString()
    }];

    this.data.social_accounts = [
      {
        id: 'acc_x_1',
        platform: 'X/Twitter',
        accountName: '@techvision_ai',
        status: 'DEMO',
        lastSync: new Date().toISOString(),
        permissions: ['tweet.read', 'tweet.write', 'users.read']
      },
      {
        id: 'acc_li_1',
        platform: 'LinkedIn',
        accountName: 'TechVision Corporate',
        status: 'DEMO',
        lastSync: new Date().toISOString(),
        permissions: ['w_member_social', 'r_liteprofile']
      },
      {
        id: 'acc_ig_1',
        platform: 'Instagram',
        accountName: '@techvision_dev',
        status: 'DISCONNECTED',
        lastSync: null,
        permissions: ['instagram_basic', 'instagram_content_publish']
      }
    ];

    this.data.memories = [
      {
        id: 'mem_h1',
        category: 'AUDIENCE',
        content: 'Technical audience strongly prefers code snippets and benchmark stats over high-level promotional graphics.',
        confidence: 0.94,
        date: '2026-09-25'
      },
      {
        id: 'mem_h2',
        category: 'CONTENT',
        content: 'Tutorial-style posts drive 8.5x higher engagement than generic meme content.',
        confidence: 0.96,
        date: '2026-09-28'
      },
      {
        id: 'mem_h3',
        category: 'ENGAGEMENT',
        content: 'Tuesday and Thursday mornings between 09:00 - 10:30 AM EST yield peak response velocity.',
        confidence: 0.89,
        date: '2026-09-27'
      }
    ];

    this.data.experiments = [
      {
        id: 'exp_1',
        title: 'AI Tutorial vs AI Meme Engagement Comparison',
        prediction: 8.2,
        actual: 7.4,
        difference: -0.8,
        learning: 'Tutorials remain strong but predicted performance was too optimistic',
        timestamp: new Date().toISOString()
      }
    ];

    this.data.scheduled_posts = [
      {
        id: 'sched_1',
        platform: 'Twitter',
        topic: 'AI Architecture & LLMs',
        style: 'Tutorial',
        content: 'Step-by-Step guide to 4-bit LLM quantization with vLLM 🧵👇',
        scheduledFor: '2026-09-30T09:00:00Z',
        status: 'PENDING_APPROVAL'
      }
    ];
  }

  // --- QUERY INTERFACE ---
  getTable(tableName) {
    if (!this.data[tableName]) {
      this.data[tableName] = [];
    }
    return this.data[tableName];
  }

  find(tableName, filterFn) {
    const table = this.getTable(tableName);
    return filterFn ? table.filter(filterFn) : table;
  }

  findOne(tableName, filterFn) {
    const table = this.getTable(tableName);
    return table.find(filterFn) || null;
  }

  insert(tableName, item) {
    const table = this.getTable(tableName);
    if (!item.id) item.id = `${tableName}_${Date.now()}`;
    table.unshift(item);
    this.save();
    return item;
  }

  update(tableName, filterFn, updateFn) {
    const table = this.getTable(tableName);
    let updatedCount = 0;
    table.forEach((item, index) => {
      if (filterFn(item)) {
        table[index] = { ...item, ...updateFn(item) };
        updatedCount++;
      }
    });
    if (updatedCount > 0) this.save();
    return updatedCount;
  }

  delete(tableName, filterFn) {
    const table = this.getTable(tableName);
    const initialLen = table.length;
    this.data[tableName] = table.filter(item => !filterFn(item));
    const removedCount = initialLen - this.data[tableName].length;
    if (removedCount > 0) this.save();
    return removedCount;
  }
}

const dbInstance = new PersistentDatabase();

module.exports = dbInstance;
