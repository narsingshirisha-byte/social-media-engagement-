const SocialMediaProvider = require('./SocialMediaProvider');

class XProvider extends SocialMediaProvider {
  constructor() {
    super('X/Twitter');
    this.clientId = process.env.X_CLIENT_ID;
    this.clientSecret = process.env.X_CLIENT_SECRET;
    this.redirectUri = process.env.X_REDIRECT_URI || 'http://localhost:3001/api/auth/x/callback';
  }

  getOAuthAuthUrl() {
    if (!this.clientId) {
      throw new Error("Missing X_CLIENT_ID configuration in environment variables.");
    }
    const scopes = encodeURIComponent(['tweet.read', 'tweet.write', 'users.read', 'offline.access'].join(' '));
    const state = `x_state_${Date.now()}`;
    return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes}&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
  }

  async connect(authCode) {
    if (!this.clientId || !this.clientSecret) {
      return {
        success: false,
        error: "X API credentials not configured. Please set X_CLIENT_ID and X_CLIENT_SECRET in .env."
      };
    }
    try {
      // Exchange authCode for Token
      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          code: authCode,
          grant_type: 'authorization_code',
          client_id: this.clientId,
          redirect_uri: this.redirectUri,
          code_verifier: 'challenge'
        })
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Fetch Profile info using token
      const profile = await this.getProfileWithToken(tokenData.access_token);

      return {
        success: true,
        account: {
          id: `x_${profile.id}`,
          platform: 'X/Twitter',
          userId: profile.id,
          username: `@${profile.username}`,
          name: profile.name,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresIn: tokenData.expires_in,
          scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
          status: 'CONNECTED',
          connectedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      return {
        success: false,
        error: `X OAuth failure: ${err.message}`
      };
    }
  }

  async getProfileWithToken(accessToken) {
    const res = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (!data.data) throw new Error("Failed to fetch X user profile.");
    return data.data;
  }

  async disconnect(accountId) {
    return { success: true, message: `Disconnected X account ${accountId}` };
  }

  async getProfile(accessToken) {
    if (!accessToken) return { error: "Metric unavailable from this platform/API permission." };
    return this.getProfileWithToken(accessToken);
  }

  async getPosts(accessToken, limit = 10) {
    if (!accessToken) return [];
    try {
      const user = await this.getProfileWithToken(accessToken);
      const res = await fetch(`https://api.twitter.com/2/users/${user.id}/tweets?tweet.fields=created_at,public_metrics&max_results=${limit}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!data.data) return [];
      return data.data.map(t => ({
        platform: 'X/Twitter',
        postId: t.id,
        text: t.text,
        createdAt: t.created_at,
        likes: t.public_metrics?.like_count || 0,
        shares: t.public_metrics?.retweet_count || 0,
        comments: t.public_metrics?.reply_count || 0,
        impressions: t.public_metrics?.impression_count || null,
        url: `https://x.com/i/status/${t.id}`
      }));
    } catch (err) {
      console.warn("X getPosts API call failed:", err.message);
      return [];
    }
  }

  async publishPost(accessToken, text) {
    if (!accessToken) throw new Error("X OAuth access token required to publish tweets.");
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return {
      publishedId: data.data.id,
      text: data.data.text,
      platform: 'X/Twitter',
      publishedAt: new Date().toISOString()
    };
  }

  async replyToComment(accessToken, tweetId, text) {
    if (!accessToken) throw new Error("X OAuth token required to reply.");
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        reply: { in_reply_to_tweet_id: tweetId }
      })
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return { success: true, replyId: data.data.id };
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

module.exports = XProvider;
