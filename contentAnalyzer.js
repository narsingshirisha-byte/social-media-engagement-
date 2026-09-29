/**
 * Content Feature Extraction & Classification Engine
 * Auto-classifies posts across topic, subtopic, style, hook, cta, tone, and length.
 */
function analyzeContent(postText) {
  const text = (postText || '').trim();
  const wordCount = text.split(/\s+/).length;
  const length = text.length;

  // Extract Hashtags & Mentions
  const hashtags = (text.match(/#[\w]+/g) || []);
  const mentions = (text.match(/@[\w]+/g) || []);

  // Hook Detection
  let hook = "Standard Statement";
  const firstLine = text.split('\n')[0] || '';
  if (/\d+/.test(firstLine)) hook = "Data/Stat Hook";
  else if (firstLine.includes('?')) hook = "Question Hook";
  else if (firstLine.toLowerCase().includes('stop') || firstLine.toLowerCase().includes('don\'t')) hook = "Contrarian / Hot Take";
  else if (firstLine.toLowerCase().includes('how to') || firstLine.toLowerCase().includes('step-by-step')) hook = "Tutorial Hook";

  // Call-To-Action (CTA) Detection
  let cta = "None / Implicit";
  if (text.includes('👇') || text.toLowerCase().includes('thread')) cta = "Thread / Read On";
  else if (text.includes('?') || text.toLowerCase().includes('comment') || text.toLowerCase().includes('thoughts')) cta = "Comment / Reply";
  else if (text.toLowerCase().includes('link') || text.toLowerCase().includes('check out')) cta = "Click Link";

  // Topic & Subtopic Classification
  let topic = "General Tech";
  let subtopic = "Software Engineering";
  if (text.toLowerCase().includes('ai') || text.toLowerCase().includes('llm') || text.toLowerCase().includes('rag') || text.toLowerCase().includes('model')) {
    topic = "Artificial Intelligence";
    subtopic = text.toLowerCase().includes('rag') ? "RAG & Vector Search" : (text.toLowerCase().includes('quantiz') ? "LLM Optimization" : "AI Architecture");
  } else if (text.toLowerCase().includes('python') || text.toLowerCase().includes('async') || text.toLowerCase().includes('code')) {
    topic = "Python";
    subtopic = text.toLowerCase().includes('async') ? "AsyncIO & Concurrency" : "Backend Development";
  } else if (text.toLowerCase().includes('startup') || text.toLowerCase().includes('bootstrapp') || text.toLowerCase().includes('founder')) {
    topic = "Startup Lessons";
    subtopic = "Organic Growth & Bootstrapping";
  }

  // Content Style
  let style = "Informative Summary";
  if (text.toLowerCase().includes('tutorial') || text.toLowerCase().includes('step-by-step') || text.includes('1.') || text.includes('🧵')) {
    style = "Technical Deep Dive";
  } else if (text.toLowerCase().includes('meme') || text.includes('😅') || text.includes('🤡')) {
    style = "Meme / Relatable Humor";
  } else if (text.toLowerCase().includes('story') || text.toLowerCase().includes('how we')) {
    style = "Storytelling";
  } else if (text.includes('?')) {
    style = "Question / Poll";
  }

  // Tone
  let tone = "Educational & Authoritative";
  if (style === "Meme / Relatable Humor") tone = "Casual & Conversational";
  else if (hook === "Contrarian / Hot Take") tone = "Direct & Provocative";

  return {
    topic,
    subtopic,
    contentType: style === "Technical Deep Dive" ? "Tutorial" : (style === "Meme / Relatable Humor" ? "Meme" : "Post"),
    style,
    tone,
    length,
    wordCount,
    hook,
    cta,
    hashtags,
    mentions,
    mediaType: text.includes('http') || text.includes('png') ? "Media/Link" : "Text"
  };
}

module.exports = {
  analyzeContent
};
