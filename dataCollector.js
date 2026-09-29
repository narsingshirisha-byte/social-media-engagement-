const db = require('./database');
const XProvider = require('./providers/XProvider');
const LinkedInProvider = require('./providers/LinkedInProvider');
const InstagramProvider = require('./providers/InstagramProvider');
const MockProvider = require('./providers/MockProvider');
const { analyzeContent } = require('./contentAnalyzer');
const hindsight = require('./hindsightMemory');

class DataCollector {
  constructor() {
    this.xProvider = new XProvider();
    this.linkedInProvider = new LinkedInProvider();
    this.instagramProvider = new InstagramProvider();
    this.mockProvider = new MockProvider();
  }

  /**
   * Run Data Synchronization across all connected accounts
   */
  async syncAllAccounts(appMode = 'DEMO') {
    const accounts = db.find('social_accounts');
    const syncResults = [];

    for (const acc of accounts) {
      try {
        const result = await this.syncAccount(acc, appMode);
        syncResults.push(result);
      } catch (err) {
        syncResults.push({
          accountId: acc.id,
          platform: acc.platform,
          status: 'API_ERROR',
          error: err.message
        });
      }
    }

    return syncResults;
  }

  async syncAccount(account, appMode = 'DEMO') {
    let posts = [];

    if (appMode === 'DEMO' || account.status.includes('DEMO')) {
      posts = await this.mockProvider.getPosts();
    } else if (account.platform === 'X/Twitter' && account.accessToken) {
      posts = await this.xProvider.getPosts(account.accessToken);
    } else if (account.platform === 'LinkedIn' && account.accessToken) {
      posts = await this.linkedInProvider.getPosts(account.accessToken);
    } else if (account.platform === 'Instagram' && account.accessToken) {
      posts = await this.instagramProvider.getPosts(account.accessToken);
    }

    let syncedCount = 0;
    for (const rawPost of posts) {
      const normalized = this.normalizePost(rawPost, account);
      
      // Auto classify features
      const features = analyzeContent(normalized.text);
      
      // Upsert in persistent database
      const existing = db.findOne('posts', p => p.id === normalized.postId);
      if (existing) {
        db.update('posts', p => p.id === normalized.postId, () => ({
          ...normalized,
          contentFeatures: features,
          lastSynced: new Date().toISOString()
        }));
      } else {
        db.insert('posts', {
          id: normalized.postId,
          ...normalized,
          contentFeatures: features,
          lastSynced: new Date().toISOString()
        });
      }
      syncedCount++;
    }

    // Update account lastSync timestamp
    db.update('social_accounts', a => a.id === account.id, () => ({
      lastSync: new Date().toISOString()
    }));

    return {
      accountId: account.id,
      platform: account.platform,
      syncedPosts: syncedCount,
      status: 'SYNCED',
      lastSync: new Date().toISOString()
    };
  }

  normalizePost(rawPost, account) {
    const likes = rawPost.likes !== undefined ? rawPost.likes : null;
    const comments = rawPost.comments !== undefined ? rawPost.comments : null;
    const shares = rawPost.shares !== undefined ? rawPost.shares : null;
    const clicks = rawPost.clicks !== undefined ? rawPost.clicks : null;
    const impressions = rawPost.impressions !== undefined ? rawPost.impressions : null;

    let engagementRate = null;
    if (impressions && impressions > 0 && (likes !== null || comments !== null)) {
      const totalEng = (likes || 0) + (comments || 0) + (shares || 0);
      engagementRate = Number((totalEng / impressions).toFixed(4));
    }

    return {
      platform: account ? account.platform : (rawPost.platform || 'X/Twitter'),
      accountId: account ? account.id : 'acc_default',
      postId: rawPost.postId || `post_${Date.now()}`,
      text: rawPost.text || '',
      createdAt: rawPost.createdAt || new Date().toISOString(),
      impressions,
      likes,
      comments,
      shares,
      clicks,
      engagementRate,
      url: rawPost.url || null,
      style: rawPost.style || 'Technical Deep-Dive',
      topic: rawPost.topic || 'AI Architecture & LLMs',
      metrics: {
        likes: likes || 0,
        comments: comments || 0,
        shares: shares || 0,
        clicks: clicks || 0,
        impressions: impressions || 0,
        engagementScore: engagementRate ? Number((engagementRate * 50).toFixed(1)) : 8.5
      }
    };
  }
}

const collectorInstance = new DataCollector();
module.exports = collectorInstance;
