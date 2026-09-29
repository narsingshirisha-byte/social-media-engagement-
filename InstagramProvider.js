const SocialMediaProvider = require('./SocialMediaProvider');

class InstagramProvider extends SocialMediaProvider {
  constructor() {
    super('Instagram');
    this.appId = process.env.META_APP_ID;
    this.appSecret = process.env.META_APP_SECRET;
    this.redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:3001/api/auth/meta/callback';
    this.accessToken = process.env.META_ACCESS_TOKEN;
  }

  getOAuthAuthUrl() {
    if (!this.appId) {
      throw new Error("Missing META_APP_ID configuration in environment variables.");
    }
    const scopes = encodeURIComponent('instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list');
    const state = `meta_state_${Date.now()}`;
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes}&state=${state}`;
  }

  async connect(authCode) {
    if (!this.appId || !this.appSecret) {
      return {
        success: false,
        error: "Meta Graph API credentials not configured. Set META_APP_ID and META_APP_SECRET in .env. Note: Instagram integration requires an Instagram Business or Creator account linked to a Facebook Page."
      };
    }
    try {
      const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&client_secret=${this.appSecret}&code=${authCode}`);
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error.message);

      return {
        success: true,
        account: {
          id: `ig_${Date.now()}`,
          platform: 'Instagram',
          accountType: 'Instagram Business/Creator Account',
          accessToken: tokenData.access_token,
          status: 'CONNECTED',
          connectedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      return { success: false, error: `Meta Instagram OAuth failure: ${err.message}` };
    }
  }

  async disconnect(accountId) {
    return { success: true, message: `Disconnected Instagram account ${accountId}` };
  }

  async getPosts(accessToken, limit = 10) {
    const token = accessToken || this.accessToken;
    if (!token) return [];
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/me/media?fields=id,caption,media_type,timestamp,like_count,comments_count&access_token=${token}`);
      const data = await res.json();
      if (!data.data) return [];
      return data.data.map(m => ({
        platform: 'Instagram',
        postId: m.id,
        text: m.caption || '',
        createdAt: m.timestamp,
        likes: m.like_count || 0,
        comments: m.comments_count || 0,
        shares: null,
        impressions: null,
        url: `https://instagram.com/p/${m.id}`
      }));
    } catch (err) {
      return [];
    }
  }

  async publishPost(accessToken, caption, imageUrl) {
    return {
      error: "Instagram publishing requires an image container URL. Unsupported for text-only posts."
    };
  }

  async getComments(postId) {
    return { error: "Metric unavailable from this platform/API permission." };
  }

  async replyToComment(commentId, text) {
    return { error: "Metric unavailable from this platform/API permission." };
  }

  async getEngagementMetrics(postId) {
    return { error: "Metric unavailable from this platform/API permission." };
  }

  async getFollowers(accountId) {
    return { error: "Metric unavailable from this platform/API permission." };
  }

  async getAudienceData(accountId) {
    return { error: "Metric unavailable from this platform/API permission." };
  }
}

module.exports = InstagramProvider;
