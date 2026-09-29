const { readDB, writeDB } = require('./db');
const { updateLearningFromMetrics } = require('./audienceLearningEngine');

/**
 * Simulates real-time audience reaction to a post draft
 */
function simulatePostReaction(post) {
  const db = readDB();
  const personas = db.personas;

  let totalLikes = 0;
  let totalShares = 0;
  let totalComments = 0;
  let totalClicks = Math.floor(Math.random() * 400) + 200;
  let totalImpressions = Math.floor(Math.random() * 8000) + 5000;

  const simulatedComments = [];
  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  personas.forEach(p => {
    // Check match between post and persona bias
    const styleMatch = p.biasStyle.includes(post.style);
    const topicMatch = p.biasTopics.includes(post.topic);

    let matchScore = 0.4;
    if (styleMatch) matchScore += 0.3;
    if (topicMatch) matchScore += 0.3;

    // Determine interactions based on match
    if (Math.random() < matchScore * p.engagementRate) {
      const likesAdd = Math.floor(Math.random() * 80) + 40;
      totalLikes += likesAdd;
    }

    if (Math.random() < matchScore * 0.5) {
      const sharesAdd = Math.floor(Math.random() * 25) + 10;
      totalShares += sharesAdd;
    }

    if (Math.random() < matchScore * 0.6) {
      totalComments += 1;
      
      // Determine sentiment
      let sentiment = "Positive";
      if (p.id === 'p4' || Math.random() < 0.25) {
        sentiment = "Neutral/Skeptical";
        neuCount++;
      } else {
        posCount++;
      }

      // Generate comment text based on persona
      const commentText = generatePersonaComment(p, post, sentiment);
      simulatedComments.push({
        id: `c_${Date.now()}_${p.id}`,
        author: p.name,
        handle: p.handle,
        role: p.role,
        avatar: p.avatar,
        content: commentText,
        sentiment,
        createdAt: new Date().toISOString()
      });

      // Update audience long-term memory for this commenter
      updateAudienceMemory(db, p.name, p.handle, p.role, sentiment, post.topic, commentText);
    }
  });

  // Calculate engagement score (0 to 10)
  const engagementScore = Number(Math.min(10.0, Math.max(2.0, (totalLikes * 0.015) + (totalShares * 0.035) + (totalComments * 0.05))).toFixed(1));

  const newPost = {
    id: `post_${Date.now()}`,
    content: post.content,
    platform: post.platform || 'Twitter',
    style: post.style,
    topic: post.topic,
    tone: post.tone || 'Informative & Authoritative',
    postedAt: new Date().toISOString(),
    metrics: {
      likes: totalLikes + Math.floor(Math.random() * 100),
      shares: totalShares + Math.floor(Math.random() * 30),
      comments: totalComments,
      clicks: totalClicks,
      impressions: totalImpressions,
      engagementScore,
      sentimentBreakdown: {
        positive: Math.max(60, posCount * 25),
        neutral: Math.max(15, neuCount * 25),
        negative: 5
      }
    },
    comments: simulatedComments
  };

  // Add post to DB
  db.posts.unshift(newPost);
  writeDB(db);

  // Trigger agent learning update from the simulated engagement score!
  const updatedModel = updateLearningFromMetrics(newPost);

  return {
    post: newPost,
    updatedModel,
    learnedAdjustment: `Agent updated weights: "${post.style}" (${updatedModel.styles[post.style]?.weight}) & "${post.topic}" (${updatedModel.topics[post.topic]?.weight}).`
  };
}

function generatePersonaComment(persona, post, sentiment) {
  if (persona.id === 'p1') {
    return sentiment === "Positive" 
      ? `Spot on regarding ${post.topic}! We noticed a huge throughput boost when we applied this exact pattern in production.`
      : `Interesting approach to ${post.topic}, but how does it handle edge cases when memory usage spikes?`;
  }
  if (persona.id === 'p2') {
    return `Super practical! Saving this for my next project build. Bookmarked 🔖`;
  }
  if (persona.id === 'p3') {
    return `Great synthesis. This aligns with what we're seeing across portfolio companies transitioning to leaner AI stacks.`;
  }
  return `Have you benchmarked this against standard baseline setups? Would love to see reproducible metrics on this.`;
}

function updateAudienceMemory(db, name, handle, role, sentiment, topic, commentText) {
  let mem = db.audienceMemory.find(m => m.commenter.toLowerCase().includes(name.toLowerCase()));
  if (mem) {
    mem.history.unshift(`Commented on ${topic}: "${commentText}"`);
    mem.lastInteraction = new Date().toISOString();
  } else {
    db.audienceMemory.unshift({
      id: `mem_${Date.now()}`,
      commenter: `${name} (${handle})`,
      persona: role,
      sentiment: sentiment.includes('Positive') ? 'Positive' : 'Neutral',
      keyInterest: topic,
      history: [`Commented on ${topic}: "${commentText}"`],
      lastInteraction: new Date().toISOString()
    });
  }
}

module.exports = {
  simulatePostReaction
};
