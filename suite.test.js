require('dotenv').config();
const assert = require('assert');
const XProvider = require('../providers/XProvider');
const LinkedInProvider = require('../providers/LinkedInProvider');
const InstagramProvider = require('../providers/InstagramProvider');
const MockProvider = require('../providers/MockProvider');
const { analyzeContent } = require('../contentAnalyzer');
const { predictEngagement, getMatrixAnalytics } = require('../audienceLearningEngine');
const hindsight = require('../hindsightMemory');
const collector = require('../dataCollector');
const learningLoop = require('../learningLoop');
const db = require('../database');

async function runTestSuite() {
  console.log("🧪 Starting Automated Agent Integration Test Suite...");

  // 1. Content Feature Analyzer Test
  console.log("  [1/7] Testing Content Analyzer...");
  const analysis = analyzeContent("Step-by-Step AI Tutorial: Building a production RAG pipeline with Llama 3 and vLLM in 15 mins 🧵👇 #AI #RAG");
  assert.strictEqual(analysis.topic, "Artificial Intelligence");
  assert.strictEqual(analysis.contentType, "Tutorial");
  assert.strictEqual(analysis.style, "Technical Deep Dive");
  assert.ok(analysis.hashtags.includes("#AI"));
  console.log("  ✓ Content Analyzer Passed");

  // 2. Engagement Predictor Test
  console.log("  [2/7] Testing Engagement Predictor...");
  const pred = predictEngagement("Building a production RAG pipeline with Llama 3 🧵👇", "Tutorial", "AI", "09:00", "Twitter");
  assert.ok(pred.score >= 1.0 && pred.score <= 10.0);
  assert.ok(Array.isArray(pred.recommendations));
  console.log(`  ✓ Engagement Predictor Passed (Score: ${pred.score}/10)`);

  // 3. Provider Abstraction & Capabilities Test
  console.log("  [3/7] Testing Social Media Provider Adapters...");
  const mockP = new MockProvider();
  const mockPosts = await mockP.getPosts();
  assert.ok(mockPosts.length > 0);
  assert.ok(mockPosts[0].text.includes("[SIMULATED]"));

  const xP = new XProvider();
  xP.clientId = xP.clientId || 'test_x_client_id';
  assert.ok(xP.getOAuthAuthUrl().includes("twitter.com"));

  const liP = new LinkedInProvider();
  const liComments = await liP.getComments("post_123");
  assert.strictEqual(liComments.status, "REQUIRES LINKEDIN APPROVAL");

  const igP = new InstagramProvider();
  igP.appId = igP.appId || 'test_meta_app_id';
  assert.ok(igP.getOAuthAuthUrl().includes("facebook.com"));
  console.log("  ✓ Provider Adapters Passed");

  // 4. Hindsight Memory Test
  console.log("  [4/7] Testing Hindsight Long-Term Memory...");
  const memRecord = await hindsight.storeMemory({
    category: 'EXPERIMENT',
    content: '[Test] Tutorial posts deliver +85% higher retention',
    confidence: 0.95
  });
  assert.strictEqual(memRecord.category, "EXPERIMENT");
  const storedMems = await hindsight.getMemories('EXPERIMENT');
  assert.ok(storedMems.length > 0);
  console.log("  ✓ Hindsight Memory Passed");

  // 5. Data Collector & Normalization Test
  console.log("  [5/7] Testing Data Collector Normalization...");
  const syncResults = await collector.syncAllAccounts('DEMO');
  assert.ok(Array.isArray(syncResults));
  console.log("  ✓ Data Collector Passed");

  // 6. Learning Loop Experiment Evaluator Test
  console.log("  [6/7] Testing Learning Loop & Experiment Tracking...");
  const exp = await learningLoop.evaluateExperiment('post_5', 8.5, 7.8);
  assert.strictEqual(exp.postId, 'post_5');
  assert.strictEqual(exp.difference, -0.7);
  console.log("  ✓ Learning Loop Passed");

  // 7. Matrix Analytics Test
  console.log("  [7/7] Testing Matrix Cross-Analytics...");
  const matrix = getMatrixAnalytics();
  assert.ok(Array.isArray(matrix.matrixList));
  assert.ok(typeof matrix.specificObservation === 'string');
  console.log("  ✓ Matrix Analytics Passed");

  console.log("\n🎉 ALL 7 INTEGRATION TESTS PASSED CLEANLY!");
}

runTestSuite().catch(err => {
  console.error("❌ Test Suite Failure:", err);
  process.exit(1);
});
