/**
 * Abstract Base Class for Social Media Platform Providers
 * Enforces unified interface across X/Twitter, LinkedIn, Instagram, and Mock providers.
 */
class SocialMediaProvider {
  constructor(platformName) {
    this.platformName = platformName;
  }

  async connect(authCredentials) {
    throw new Error(`connect() not implemented for ${this.platformName}`);
  }

  async disconnect(accountId) {
    throw new Error(`disconnect() not implemented for ${this.platformName}`);
  }

  async getProfile(accountId) {
    throw new Error(`getProfile() not implemented for ${this.platformName}`);
  }

  async getPosts(accountId, limit = 10) {
    throw new Error(`getPosts() not implemented for ${this.platformName}`);
  }

  async getPost(postId) {
    throw new Error(`getPost() not implemented for ${this.platformName}`);
  }

  async publishPost(postPayload) {
    throw new Error(`publishPost() not implemented for ${this.platformName}`);
  }

  async getComments(postId) {
    throw new Error(`getComments() not implemented for ${this.platformName}`);
  }

  async replyToComment(commentId, replyText) {
    throw new Error(`replyToComment() not implemented for ${this.platformName}`);
  }

  async getEngagementMetrics(postId) {
    throw new Error(`getEngagementMetrics() not implemented for ${this.platformName}`);
  }

  async getFollowers(accountId) {
    throw new Error(`getFollowers() not implemented for ${this.platformName}`);
  }

  async getAudienceData(accountId) {
    throw new Error(`getAudienceData() not implemented for ${this.platformName}`);
  }
}

module.exports = SocialMediaProvider;
