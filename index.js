require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { readDB, writeDB } = require('./db');
const db = require('./database');
const hindsight = require('./hindsightMemory');
const collector = require('./dataCollector');
const scheduler = require('./scheduler');
const learningLoop = require('./learningLoop');
const XProvider = require('./providers/XProvider');
const LinkedInProvider = require('./providers/LinkedInProvider');
const InstagramProvider = require('./providers/InstagramProvider');

const { predictEngagement, getMatrixAnalytics } = require('./audienceLearningEngine');
const { generatePostDraft, generateCommentReply, generateStrategicReport, askAudienceAgent } = require('./aiEngine');
const { simulatePostReaction } = require('./simulator');

const app = express();
const PORT = process.env.PORT || 3001;

let currentAppMode = process.env.APP_MODE || 'DEMO';

app.use(cors());
app.use(express.json());

// Serve static assets if client build exists
app.use(express.static(path.join(__dirname, '../client/dist')));

// Start background scheduler
scheduler.start();

// Provider Instances
const xProvider = new XProvider();
const linkedInProvider = new LinkedInProvider();
const instagramProvider = new InstagramProvider();

// --- REST API ENDPOINTS ---

// 1. Get full dashboard state
app.get('/api/dashboard', (req, res) => {
  const data = readDB();
  const matrixStats = getMatrixAnalytics();
  const accounts = db.find('social_accounts');
  const memories = db.find('memories');
  const experiments = db.find('experiments');
  const schedulerStatus = scheduler.getSchedulerConfig();

  res.json({
    success: true,
    appMode: currentAppMode,
    settings: {
      ...data.settings,
      geminiApiKeyConfigured: !!(process.env.GEMINI_API_KEY || data.settings.geminiApiKey)
    },
    preferenceModel: data.preferenceModel,
    posts: data.posts,
    audienceMemory: data.audienceMemory,
    personas: data.personas,
    matrixStats,
    accounts,
    memories,
    experiments,
    schedulerStatus
  });
});

// 2. Mode Switcher (DEMO / TEST / LIVE)
app.get('/api/mode', (req, res) => {
  res.json({ success: true, appMode: currentAppMode });
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (['DEMO', 'TEST', 'LIVE'].includes(mode)) {
    currentAppMode = mode;
    db.update('users', u => u.id === 'u_1', () => ({ appMode: mode }));
    return res.json({ success: true, appMode: currentAppMode });
  }
  res.status(400).json({ success: false, error: 'Invalid mode. Must be DEMO, TEST, or LIVE' });
});

// 3. Social Media Account Management & OAuth URLs
app.get('/api/accounts', (req, res) => {
  const accounts = db.find('social_accounts');
  res.json({ success: true, accounts });
});

app.get('/api/auth/x/url', (req, res) => {
  try {
    const url = xProvider.getOAuthAuthUrl();
    res.json({ success: true, url });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/linkedin/url', (req, res) => {
  try {
    const url = linkedInProvider.getOAuthAuthUrl();
    res.json({ success: true, url });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/meta/url', (req, res) => {
  try {
    const url = instagramProvider.getOAuthAuthUrl();
    res.json({ success: true, url });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// OAuth Callback handling
app.post('/api/auth/connect', async (req, res) => {
  const { platform, code } = req.body;
  let result = null;

  if (platform === 'X/Twitter') {
    result = await xProvider.connect(code);
  } else if (platform === 'LinkedIn') {
    result = await linkedInProvider.connect(code);
  } else if (platform === 'Instagram') {
    result = await instagramProvider.connect(code);
  }

  if (result && result.success) {
    db.insert('social_accounts', result.account);
    return res.json({ success: true, account: result.account });
  }

  res.status(400).json({ success: false, error: result?.error || 'Connection failed' });
});

app.post('/api/accounts/:id/disconnect', (req, res) => {
  const accountId = req.params.id;
  db.delete('social_accounts', a => a.id === accountId);
  res.json({ success: true, message: `Account ${accountId} disconnected` });
});

app.post('/api/accounts/sync', async (req, res) => {
  const syncResults = await collector.syncAllAccounts(currentAppMode);
  res.json({ success: true, syncResults });
});

// 4. Human-In-The-Loop Publishing Workflow
app.post('/api/posts/publish', async (req, res) => {
  const { content, platform, accountId } = req.body;

  if (!content) return res.status(400).json({ success: false, error: 'Post content required' });

  if (currentAppMode === 'DEMO') {
    const pub = await xProvider.publishPost(null, content);
    return res.json({
      success: true,
      mode: 'DEMO',
      publishedPost: {
        id: `sim_pub_${Date.now()}`,
        content,
        platform: platform || 'X/Twitter',
        status: 'SIMULATED_PUBLISHED',
        publishedAt: new Date().toISOString()
      }
    });
  }

  // LIVE publishing through connected provider
  try {
    const account = db.findOne('social_accounts', a => a.id === accountId);
    if (!account || !account.accessToken) {
      return res.status(400).json({ success: false, error: `Connected ${platform} account access token not found.` });
    }

    let pubResult = null;
    if (account.platform === 'X/Twitter') {
      pubResult = await xProvider.publishPost(account.accessToken, content);
    } else if (account.platform === 'LinkedIn') {
      pubResult = await linkedInProvider.publishPost(account.accessToken, content, account.userId);
    }

    res.json({ success: true, mode: 'LIVE', publishedPost: pubResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Hindsight Long-Term Memory API
app.get('/api/memory/hindsight', async (req, res) => {
  const { category, query } = req.query;
  const memories = await hindsight.getMemories(category, query);
  res.json({ success: true, memories });
});

app.post('/api/memory/hindsight', async (req, res) => {
  const { category, content, confidence } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'Memory content required' });

  const record = await hindsight.storeMemory({ category, content, confidence });
  res.json({ success: true, memory: record });
});

// 6. Experiments & Learning Loop Evaluation API
app.get('/api/experiments', (req, res) => {
  const experiments = learningLoop.getExperimentsList();
  res.json({ success: true, experiments });
});

app.post('/api/experiments/evaluate', async (req, res) => {
  const { postId, predictedScore, actualScore } = req.body;
  if (!postId || predictedScore === undefined || actualScore === undefined) {
    return res.status(400).json({ success: false, error: 'postId, predictedScore, and actualScore required' });
  }

  const exp = await learningLoop.evaluateExperiment(postId, Number(predictedScore), Number(actualScore));
  res.json({ success: true, experiment: exp });
});

// 7. Scheduler API
app.get('/api/scheduler', (req, res) => {
  res.json({ success: true, status: scheduler.getSchedulerConfig() });
});

app.post('/api/scheduler/config', (req, res) => {
  const { schedules } = req.body;
  const updated = scheduler.updateConfig(schedules);
  res.json({ success: true, status: updated });
});

// Existing routes
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, error: 'Question is required' });
    const answer = await askAudienceAgent(question);
    res.json({ success: true, answer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/analytics/matrix', (req, res) => {
  const matrixStats = getMatrixAnalytics();
  res.json({ success: true, matrixStats });
});

app.post('/api/predict', (req, res) => {
  const { content, style, topic, postingTime, platform } = req.body;
  if (!content || !style || !topic) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const result = predictEngagement(content, style, topic, postingTime || "09:00", platform || "Twitter");
  res.json({ success: true, prediction: result });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { topic, style, tone, platform, customInstructions } = req.body;
    const drafts = await generatePostDraft({ topic, style, tone, platform, customInstructions });
    res.json({ success: true, drafts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/simulate', (req, res) => {
  const { content, style, topic, tone, platform } = req.body;
  if (!content || !style || !topic) {
    return res.status(400).json({ success: false, error: 'Content, style, and topic required' });
  }
  const result = simulatePostReaction({ content, style, topic, tone, platform });
  res.json({ success: true, result });
});

app.post('/api/reply', async (req, res) => {
  try {
    const { commenterName, commentText, postContext } = req.body;
    const reply = await generateCommentReply(commenterName, commentText, postContext);
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  const dbFile = readDB();
  const { brandName, niche, targetAudience, geminiApiKey } = req.body;
  if (brandName) dbFile.settings.brandName = brandName;
  if (niche) dbFile.settings.niche = niche;
  if (targetAudience) dbFile.settings.targetAudience = targetAudience;
  if (geminiApiKey !== undefined) dbFile.settings.geminiApiKey = geminiApiKey;
  writeDB(dbFile);
  res.json({ success: true, settings: dbFile.settings });
});

app.post('/api/insights/rule', (req, res) => {
  const dbFile = readDB();
  const { category, insight } = req.body;
  if (!insight) return res.status(400).json({ success: false, error: 'Insight text required' });
  const newRule = {
    id: `rule_${Date.now()}`,
    category: category || "Brand Rule",
    insight,
    confidence: 0.95,
    dateDiscovered: new Date().toISOString().split('T')[0]
  };
  dbFile.preferenceModel.learnedInsights.unshift(newRule);
  writeDB(dbFile);
  res.json({ success: true, rule: newRule, learnedInsights: dbFile.preferenceModel.learnedInsights });
});

app.delete('/api/insights/rule/:id', (req, res) => {
  const dbFile = readDB();
  const ruleId = req.params.id;
  dbFile.preferenceModel.learnedInsights = dbFile.preferenceModel.learnedInsights.filter(r => r.id !== ruleId);
  writeDB(dbFile);
  res.json({ success: true, learnedInsights: dbFile.preferenceModel.learnedInsights });
});

app.get('/api/report', async (req, res) => {
  const report = await generateStrategicReport();
  res.json({ success: true, report });
});

// Fallback for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🤖 Social Media Engagement Agent listening on port ${PORT} [MODE: ${currentAppMode}]`);
});
