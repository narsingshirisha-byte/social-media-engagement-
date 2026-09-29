const SocialMediaProvider = require('./SocialMediaProvider');

class LinkedInProvider extends SocialMediaProvider {
  constructor() {
    super('LinkedIn');
    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/api/auth/linkedin/callback';
  }

  getOAuthAuthUrl() {
    if (!this.clientId) {
      throw new Error("Missing LINKEDIN_CLIENT_ID configuration in environment variables.");
    }
    const scopes = encodeURIComponent('openid profile email w_member_social');
    const state = `linkedin_state_${Date.now()}`;
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes}&state=${state}`;
  }

  async connect(authCode) {
    if (!this.clientId || !this.clientSecret) {
      return {
        success: false,
        error: "LinkedIn API credentials not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env."
      };
    }
    try {
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri
        })
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      // Fetch LinkedIn profile
      const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const profile = await profileRes.json();

      return {
        success: true,
        account: {
          id: `li_${profile.sub || Date.now()}`,
          platform: 'LinkedIn',
          userId: profile.sub,
          username: profile.name || profile.given_name,
          name: profile.name,
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in,
          scopes: ['openid', 'profile', 'email', 'w_member_social'],
          status: 'CONNECTED',
          connectedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      return {
        success: false,
        error: `LinkedIn OAuth failure: ${err.message}`
      };
    }
  }

  async disconnect(accountId) {
    return { success: true, message: `Disconnected LinkedIn account ${accountId}` };
  }

  async publishPost(accessToken, text, authorUrn) {
    if (!accessToken) throw new Error("LinkedIn OAuth token required to publish.");
    const body = {
      author: authorUrn || "urn:li:person:me",
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (res.status >= 400) throw new Error(data.message || "Failed to publish post on LinkedIn.");

    return {
      publishedId: data.id,
      platform: 'LinkedIn',
      publishedAt: new Date().toISOString()
    };
  }

  async getComments(postId) {
    return {
      status: 'REQUIRES LINKEDIN APPROVAL',
      error: 'Metric unavailable from this platform/API permission. LinkedIn API requires Organization Social Actions Partner Approval for comment extraction.'
    };
  }

  async replyToComment(commentId, text) {
    return {
      status: 'REQUIRES LINKEDIN APPROVAL',
      error: 'Metric unavailable from this platform/API permission. LinkedIn comment replies require Partner API access approval.'
    };
  }

  async getPosts(accessToken, limit = 10) {
    return [];
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

module.exports = LinkedInProvider;
