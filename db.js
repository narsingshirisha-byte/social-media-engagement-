const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Default initial state with realistic data
const initialData = {
  settings: {
    brandName: "TechVision AI",
    niche: "Artificial Intelligence & Developer Tools",
    targetAudience: "Software Engineers, Product Managers, AI Enthusiasts, Tech Founders",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    modelName: "gemini-2.5-flash"
  },
  
  // Learned Audience Preference Engine Weights
  preferenceModel: {
    // Style weights (0.0 to 1.0 multiplier)
    styles: {
      "Technical Deep-Dive": { weight: 0.88, sampleCount: 14, avgEngagement: 8.4 },
      "Hot Take / Opinion": { weight: 0.94, sampleCount: 18, avgEngagement: 9.2 },
      "Storytelling / Case Study": { weight: 0.76, sampleCount: 10, avgEngagement: 7.1 },
      "Actionable Checklist / Tips": { weight: 0.82, sampleCount: 12, avgEngagement: 7.9 },
      "Meme / Relatable Humor": { weight: 0.65, sampleCount: 8, avgEngagement: 6.2 },
      "Poll / Question": { weight: 0.71, sampleCount: 9, avgEngagement: 6.8 },
      "Educational Tutorial": { weight: 0.91, sampleCount: 11, avgEngagement: 8.8 }
    },
    // Topic weights
    topics: {
      "AI Architecture & LLMs": { weight: 0.95, sampleCount: 20, avgEngagement: 9.6 },
      "Developer Productivity": { weight: 0.84, sampleCount: 15, avgEngagement: 8.1 },
      "Startup Lessons": { weight: 0.78, sampleCount: 11, avgEngagement: 7.5 },
      "Future of Work": { weight: 0.62, sampleCount: 8, avgEngagement: 5.8 },
      "Open Source Tools": { weight: 0.91, sampleCount: 17, avgEngagement: 8.9 },
      "Industry News": { weight: 0.70, sampleCount: 10, avgEngagement: 6.5 },
      "Python": { weight: 0.87, sampleCount: 9, avgEngagement: 8.3 }
    },
    // Topic + Style combination performance tracking (cross-analysis)
    topicStyleCombinations: {
      "AI Architecture & LLMs|Technical Deep-Dive": { engagementSum: 92.5, count: 11, avgEngagement: 8.4, commentSentiment: { positive: 82, neutral: 14, negative: 4 } },
      "AI Architecture & LLMs|Hot Take / Opinion": { engagementSum: 110.4, count: 12, avgEngagement: 9.2, commentSentiment: { positive: 75, neutral: 20, negative: 5 } },
      "AI Architecture & LLMs|Educational Tutorial": { engagementSum: 84.6, count: 9, avgEngagement: 9.4, commentSentiment: { positive: 88, neutral: 10, negative: 2 } },
      "AI Architecture & LLMs|Meme / Relatable Humor": { engagementSum: 18.6, count: 3, avgEngagement: 6.2, commentSentiment: { positive: 60, neutral: 25, negative: 15 } },
      "Developer Productivity|Actionable Checklist / Tips": { engagementSum: 63.2, count: 8, avgEngagement: 7.9, commentSentiment: { positive: 80, neutral: 15, negative: 5 } },
      "Developer Productivity|Meme / Relatable Humor": { engagementSum: 37.2, count: 6, avgEngagement: 6.2, commentSentiment: { positive: 65, neutral: 25, negative: 10 } },
      "Developer Productivity|Poll / Question": { engagementSum: 43.2, count: 6, avgEngagement: 7.2, commentSentiment: { positive: 60, neutral: 35, negative: 5 } },
      "Python|Educational Tutorial": { engagementSum: 74.7, count: 9, avgEngagement: 8.3, commentSentiment: { positive: 85, neutral: 12, negative: 3 } },
      "Startup Lessons|Storytelling / Case Study": { engagementSum: 78.0, count: 10, avgEngagement: 7.8, commentSentiment: { positive: 70, neutral: 25, negative: 5 } },
      "Open Source Tools|Technical Deep-Dive": { engagementSum: 97.9, count: 11, avgEngagement: 8.9, commentSentiment: { positive: 84, neutral: 12, negative: 4 } },
      "Open Source Tools|Actionable Checklist / Tips": { engagementSum: 47.4, count: 6, avgEngagement: 7.9, commentSentiment: { positive: 78, neutral: 18, negative: 4 } }
    },
    // Timing heat map (Hour of day: 0-23, avg performance score 1-100)
    timingMatrix: {
      "08:00": 78, "09:00": 92, "10:00": 88, "11:00": 74,
      "12:00": 65, "13:00": 60, "14:00": 82, "15:00": 89,
      "16:00": 79, "17:00": 68, "18:00": 55, "19:00": 71,
      "20:00": 85, "21:00": 64
    },
    // Length preference (words)
    lengthPreference: {
      "Short (< 50 words)": 0.65,
      "Medium (50-150 words)": 0.92,
      "Long / Thread (150+ words)": 0.84
    },
    // Tone preference
    tonePreference: {
      "Informative & Authoritative": 0.90,
      "Provocative & Direct": 0.87,
      "Casual & Conversational": 0.75,
      "Overly Promotional": 0.25
    },
    // Learned Brand Insights & Audience Rules
    learnedInsights: [
      {
        id: "rule_1",
        category: "Content Structure",
        insight: "Posts starting with a bold counter-intuitive stat receive 42% higher click-through rate.",
        confidence: 0.94,
        dateDiscovered: "2026-09-15"
      },
      {
        id: "rule_2",
        category: "Audience Fatigue",
        insight: "Audience shows strong negative reaction to generic sales pitches without free code/diagram value.",
        confidence: 0.91,
        dateDiscovered: "2026-09-18"
      },
      {
        id: "rule_3",
        category: "Optimal Timing",
        insight: "Peak technical discussion engagement occurs Tuesday & Thursday mornings between 09:00 - 10:30 AM EST.",
        confidence: 0.88,
        dateDiscovered: "2026-09-22"
      },
      {
        id: "rule_4",
        category: "Topic Preference",
        insight: "LLM optimization & benchmarking topics outperform general tech news by 2.4x.",
        confidence: 0.96,
        dateDiscovered: "2026-09-25"
      }
    ]
  },

  // Long-Term Audience & Conversation Memory
  audienceMemory: [
    {
      id: "mem_1",
      commenter: "Alex Rivera (@arivera_dev)",
      persona: "Senior Staff Engineer",
      sentiment: "Positive",
      keyInterest: "Local LLM Inference Speed & GPU Benchmarks",
      history: [
        "Asked about latency differences between vLLM and Ollama.",
        "Appreciates detailed code benchmarks over generic summaries."
      ],
      lastInteraction: "2026-09-26T14:30:00Z"
    },
    {
      id: "mem_2",
      commenter: "Elena Rostova (@elena_pm)",
      persona: "Lead Product Manager",
      sentiment: "Neutral",
      keyInterest: "AI Agent ROI & Developer Workflows",
      history: [
        "Asked how agentic workflows scale across engineering teams.",
        "Skeptical of hype without clear timeline metrics."
      ],
      lastInteraction: "2026-09-27T10:15:00Z"
    },
    {
      id: "mem_3",
      commenter: "Marcus Vance (@mvance_tech)",
      persona: "Founding Engineer / CTO",
      sentiment: "Positive",
      keyInterest: "Open Source AI Stack",
      history: [
        "Forks open source repos shared in our posts.",
        "Frequently retweets posts with actionable code snippets."
      ],
      lastInteraction: "2026-09-28T08:45:00Z"
    }
  ],

  // Past Posts History & Engagement Analytics
  posts: [
    {
      id: "post_101",
      content: "Stop using massive LLMs for simple classification tasks.\n\nA fine-tuned 3B model runs 10x faster, costs 95% less, and hits 98% accuracy when scoped correctly.\n\nHungry for performance? Here is our 4-step distillation playbook 🧵👇",
      platform: "Twitter",
      style: "Hot Take / Opinion",
      topic: "AI Architecture & LLMs",
      tone: "Informative & Authoritative",
      postedAt: "2026-09-26T09:00:00Z",
      metrics: {
        likes: 412,
        shares: 138,
        comments: 47,
        clicks: 890,
        impressions: 14200,
        engagementScore: 9.4,
        sentimentBreakdown: { positive: 78, neutral: 18, negative: 4 }
      }
    },
    {
      id: "post_102",
      content: "Most developers get AI agent memory wrong.\n\nThey dump the entire conversation history into the context window and wonder why latency hits 8 seconds.\n\nHere is how we implemented hierarchical memory compression with 90% cost savings:",
      platform: "LinkedIn",
      style: "Technical Deep-Dive",
      topic: "AI Architecture & LLMs",
      tone: "Informative & Authoritative",
      postedAt: "2026-09-27T10:00:00Z",
      metrics: {
        likes: 385,
        shares: 94,
        comments: 32,
        clicks: 650,
        impressions: 11800,
        engagementScore: 8.9,
        sentimentBreakdown: { positive: 82, neutral: 14, negative: 4 }
      }
    },
    {
      id: "post_103",
      content: "What is your biggest blocker when deploying local AI models in production?\n\nA) VRAM limitations\nB) Latency spikes\nC) Model accuracy drift\nD) Tool integration complexity",
      platform: "Twitter",
      style: "Poll / Question",
      topic: "Developer Productivity",
      tone: "Casual & Conversational",
      postedAt: "2026-09-28T15:00:00Z",
      metrics: {
        likes: 185,
        shares: 22,
        comments: 64,
        clicks: 310,
        impressions: 6400,
        engagementScore: 7.2,
        sentimentBreakdown: { positive: 65, neutral: 30, negative: 5 }
      }
    }
  ],

  // Simulated Audience Personas for Interactive Feed Simulator
  personas: [
    {
      id: "p1",
      name: "Sarah Chen",
      handle: "@sarah_ai",
      role: "Senior AI Engineer @ DataScale",
      avatar: "👩‍💻",
      biasStyle: ["Technical Deep-Dive", "Hot Take / Opinion"],
      biasTopics: ["AI Architecture & LLMs", "Open Source Tools"],
      engagementRate: 0.85,
      typicalCommentTone: "Constructive & Technical"
    },
    {
      id: "p2",
      name: "Dave Miller",
      handle: "@dave_builds",
      role: "Full-Stack Dev & Indie Hacker",
      avatar: "👨‍💻",
      biasStyle: ["Actionable Checklist / Tips", "Meme / Relatable Humor"],
      biasTopics: ["Developer Productivity", "Open Source Tools"],
      engagementRate: 0.75,
      typicalCommentTone: "Pragmatic & Witty"
    },
    {
      id: "p3",
      name: "Amara Patel",
      handle: "@amara_v",
      role: "Venture Partner @ TechFund",
      avatar: "👩‍💼",
      biasStyle: ["Storytelling / Case Study", "Hot Take / Opinion"],
      biasTopics: ["Startup Lessons", "Future of Work"],
      engagementRate: 0.65,
      typicalCommentTone: "Strategic & Inquisitive"
    },
    {
      id: "p4",
      name: "Tom Skeptic",
      handle: "@tom_code_qa",
      role: "Staff Infrastructure Lead",
      avatar: "🕵️‍♂️",
      biasStyle: ["Technical Deep-Dive"],
      biasTopics: ["AI Architecture & LLMs"],
      engagementRate: 0.50,
      typicalCommentTone: "Challenging & Detail-Oriented"
    }
  ]
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("DB Read Error:", err);
    return initialData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("DB Write Error:", err);
    return false;
  }
}

module.exports = {
  readDB,
  writeDB
};
