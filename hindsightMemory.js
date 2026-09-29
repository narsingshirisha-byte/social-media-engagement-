const db = require('./database');

class HindsightMemory {
  constructor() {
    this.apiKey = process.env.HINDSIGHT_API_KEY || 'hsk_a86e862cbe94486436acdb0b8a936670_ff14afe352eaeade';
    this.url = process.env.HINDSIGHT_URL || 'https://api.hindsight.ai/v1';
    this.validCategories = ['AUDIENCE', 'CONTENT', 'ENGAGEMENT', 'EXPERIMENT', 'STRATEGY', 'CONVERSATION'];
  }

  /**
   * Store long-term memory record under specific category
   */
  async storeMemory({ category, content, confidence = 0.90, metadata = {} }) {
    const cat = this.validCategories.includes(category) ? category : 'STRATEGY';
    
    const record = {
      id: `mem_h_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      category: cat,
      content,
      confidence,
      metadata,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Store in Persistent Database
    db.insert('memories', record);

    // If Hindsight API credentials are set, attempt cloud sync
    if (this.apiKey && this.url) {
      try {
        await fetch(`${this.url}/memory`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(record)
        });
      } catch (err) {
        // Fallback gracefully to persistent storage
      }
    }

    return record;
  }

  /**
   * Retrieve memories by category or search query
   */
  async getMemories(category = null, query = null) {
    let memories = db.find('memories');
    if (category) {
      memories = memories.filter(m => m.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      memories = memories.filter(m => m.content.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    return memories;
  }

  /**
   * Generates long-term historical context summary for AI Orchestrator
   */
  async getHistoricalContext() {
    const memories = db.find('memories');
    const categories = {};
    this.validCategories.forEach(cat => {
      categories[cat] = memories.filter(m => m.category === cat).map(m => `- [${m.date}] ${m.content}`);
    });

    return categories;
  }
}

const hindsightInstance = new HindsightMemory();
module.exports = hindsightInstance;
