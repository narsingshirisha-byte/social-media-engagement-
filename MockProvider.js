const SocialMediaProvider = require('./SocialMediaProvider');

class MockProvider extends SocialMediaProvider {
  constructor(platformName = 'X/Twitter (Simulated)') {
    super(platformName);
  }

  async connect() {
    return {
      success: true,
      account: {
        id: `mock_${Date.now()}`,
        platform: this.platformName,
        accountName: '@techvision_demo',
        status: 'CONNECTED (SIMULATED)',
        lastSync: new Date().toISOString(),
        permissions: ['read', 'write', 'metrics']
      }
    };
  }

  async disconnect(accountId) {
    return { success: true, message: `Disconnected simulated account ${accountId}` };
  }

  async getPosts() {
    return [
      {
        platform: this.platformName,
        postId: 'sim_post_5',
        text: '[SIMULATED] Step-by-Step AI Tutorial: Building a production-grade local RAG pipeline using Llama 3 & vLLM.',
        createdAt: new Date().toISOString(),
        likes: 1850,
        comments: 550,
        shares: 300,
        impressions: 18500,
        clicks: 1420,
        engagementRate: 0.145,
        url: 'https://demo.simulated/post_5'
      },
      {
        platform: this.platformName,
        postId: 'sim_post_3',
        text: '[SIMULATED] Python AsyncIO Tutorial: Master concurrency in 10 minutes with clean code patterns.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        likes: 1600,
        comments: 520,
        shares: 280,
        impressions: 15800,
        clicks: 1150,
        engagementRate: 0.152,
        url: 'https://demo.simulated/post_3'
      }
    ];
  }

  async publishPost(postPayload) {
    return {
      publishedId: `sim_pub_${Date.now()}`,
      text: `[SIMULATED] ${postPayload.text}`,
      platform: this.platformName,
      publishedAt: new Date().toISOString(),
      status: 'SIMULATED_PUBLISHED'
    };
  }

  async replyToComment(commentId, text) {
    return {
      success: true,
      replyId: `sim_reply_${Date.now()}`,
      status: 'SIMULATED_REPLY_SENT'
    };
  }
}

module.exports = MockProvider;
