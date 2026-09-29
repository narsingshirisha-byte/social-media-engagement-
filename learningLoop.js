const db = require('./database');
const hindsight = require('./hindsightMemory');

class LearningLoop {
  /**
   * Evaluates prediction vs actual performance for published posts
   */
  async evaluateExperiment(postId, predictedScore, actualScore) {
    const delta = Number((actualScore - predictedScore).toFixed(2));
    
    let learningText = "";
    if (Math.abs(delta) <= 0.5) {
      learningText = `Prediction accurate (delta ${delta}). Learned weights for topic/style validated.`;
    } else if (delta > 0) {
      learningText = `Post outperformed prediction by +${delta}. Audience resonance was higher than baseline model estimated.`;
    } else {
      learningText = `Post underperformed prediction by ${delta}. Audience showed lower affinity than baseline predicted.`;
    }

    const expRecord = {
      id: `exp_${Date.now()}`,
      postId,
      prediction: predictedScore,
      actual: actualScore,
      difference: delta,
      learning: learningText,
      timestamp: new Date().toISOString()
    };

    // Store in Persistent DB
    db.insert('experiments', expRecord);

    // Store in Hindsight Memory under EXPERIMENT category
    await hindsight.storeMemory({
      category: 'EXPERIMENT',
      content: `[Experiment Log] Post ${postId}: Predicted ${predictedScore}/10 vs Actual ${actualScore}/10 (delta ${delta}). ${learningText}`,
      confidence: 0.92,
      metadata: expRecord
    });

    // Update Audience & Style Weights in Preference Model
    this.updateWeightsFromExperiment(postId, delta);

    return expRecord;
  }

  updateWeightsFromExperiment(postId, delta) {
    const post = db.findOne('posts', p => p.id === postId);
    if (!post) return;

    const data = require('./data.json');
    const pm = data.preferenceModel || {};

    const style = post.style || 'Technical Deep-Dive';
    const topic = post.topic || 'AI Architecture & LLMs';

    // Adjust style weight by learning rate * delta
    if (pm.styles && pm.styles[style]) {
      const current = pm.styles[style].weight;
      pm.styles[style].weight = Number(Math.min(1.0, Math.max(0.1, current + (delta * 0.05))).toFixed(2));
    }

    // Adjust topic weight by learning rate * delta
    if (pm.topics && pm.topics[topic]) {
      const current = pm.topics[topic].weight;
      pm.topics[topic].weight = Number(Math.min(1.0, Math.max(0.1, current + (delta * 0.05))).toFixed(2));
    }
  }

  getExperimentsList() {
    return db.find('experiments');
  }
}

const learningLoopInstance = new LearningLoop();
module.exports = learningLoopInstance;
