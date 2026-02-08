const axios = require('axios');
const fs = require('fs');
const path = require('path');

// NVIDIA API Configuration
const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = 'moonshotai/kimi-k2.5'; // Kimi K2.5 - 1T MoE model with 256k context

// File paths
const TOPICS_FILE = path.join(__dirname, '..', 'topics.json');
const GENERATED_TOPICS_FILE = path.join(__dirname, '..', 'generated-topics.json');
const GUIDES_DIR = path.join(__dirname, '..', '_guides');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images', 'guides');

// Ensure directories exist
if (!fs.existsSync(GUIDES_DIR)) {
  fs.mkdirSync(GUIDES_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read topics and generated topics
function loadTopics() {
  const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
  const generatedTopics = JSON.parse(fs.readFileSync(GENERATED_TOPICS_FILE, 'utf-8'));
  return { topics, generatedTopics };
}

// Save generated topics
function saveGeneratedTopics(generatedTopics) {
  fs.writeFileSync(GENERATED_TOPICS_FILE, JSON.stringify(generatedTopics, null, 2));
}

// Helper: Convert title to slug format for comparison
function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Select next topic with smart series prioritization
// Priority order:
//   1. Continue in-progress series (previous part published)
//   2. Start beginner-friendly series (part 1, difficulty: beginner)
//   3. Start any series (part 1)
//   4. Any series topic
//   5. Random standalone topic
function selectNextTopic(topics, generatedTopics) {
  const unusedTopics = topics.filter(
    topic => !generatedTopics.includes(topic.title)
  );

  if (unusedTopics.length === 0) {
    // All topics used, reset and start over
    console.log('All topics have been used. Resetting...');
    return topics[Math.floor(Math.random() * topics.length)];
  }

  // Convert generated topics to slug format for matching
  const generatedSlugs = generatedTopics.map(titleToSlug);

  // PRIORITY 1: Complete in-progress series (previous part already published)
  const continueSeriesTopics = unusedTopics.filter(topic => {
    if (!topic.series || !topic.series.previous) return false;

    // Check if the previous part has been generated
    const previousSlug = topic.series.previous;
    const previousPublished = generatedSlugs.some(slug => slug === previousSlug);

    return previousPublished;
  });

  if (continueSeriesTopics.length > 0) {
    // Sort by series part number to maintain order
    continueSeriesTopics.sort((a, b) => {
      if (a.series.name === b.series.name) {
        return a.series.part - b.series.part;
      }
      return 0;
    });

    const selected = continueSeriesTopics[0];
    console.log(`📚 Continuing series: "${selected.series.name}" (Part ${selected.series.part}/${selected.series.total})`);
    return selected;
  }

  // PRIORITY 2: Start beginner-friendly series
  const beginnerSeriesStarts = unusedTopics.filter(topic =>
    topic.series &&
    topic.series.part === 1 &&
    topic.difficulty === 'beginner'
  );

  if (beginnerSeriesStarts.length > 0) {
    const selected = beginnerSeriesStarts[Math.floor(Math.random() * beginnerSeriesStarts.length)];
    console.log(`🌟 Starting beginner series: "${selected.series.name}"`);
    return selected;
  }

  // PRIORITY 3: Start any series
  const seriesStarts = unusedTopics.filter(topic =>
    topic.series && topic.series.part === 1
  );

  if (seriesStarts.length > 0) {
    const selected = seriesStarts[Math.floor(Math.random() * seriesStarts.length)];
    console.log(`📖 Starting series: "${selected.series.name}"`);
    return selected;
  }

  // PRIORITY 4: Any series topic (in case previous parts aren't done yet)
  const anySeriesTopics = unusedTopics.filter(t => t.series);

  if (anySeriesTopics.length > 0) {
    const selected = anySeriesTopics[Math.floor(Math.random() * anySeriesTopics.length)];
    console.log(`📝 Generating series topic: "${selected.series.name}" (Part ${selected.series.part}/${selected.series.total})`);
    return selected;
  }

  // FALLBACK: Random standalone topic
  const selected = unusedTopics[Math.floor(Math.random() * unusedTopics.length)];
  console.log(`📄 Generating standalone topic`);
  return selected;
}

// Validate a URL by checking if it returns a successful response
async function validateUrl(url, timeout = 10000) {
  try {
    const response = await axios.head(url, {
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });
    return true;
  } catch (error) {
    // Try GET if HEAD fails (some servers don't support HEAD)
    try {
      const response = await axios.get(url, {
        timeout,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        responseType: 'stream'
      });
      // Cancel the stream immediately, we just need to check if it's accessible
      response.data.destroy();
      return true;
    } catch (getError) {
      console.log(`  ✗ Invalid URL: ${url} (${getError.message})`);
      return false;
    }
  }
}

// Extract and validate URLs from markdown content
async function validateLinksInContent(content) {
  // Match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...content.matchAll(linkRegex)];

  if (matches.length === 0) {
    return content;
  }

  console.log(`Validating ${matches.length} links...`);

  const validatedLinks = await Promise.all(
    matches.map(async (match) => {
      const fullMatch = match[0];
      const text = match[1];
      const url = match[2];

      // Skip internal links (starting with /)
      if (url.startsWith('/') || url.startsWith('#')) {
        return { fullMatch, isValid: true };
      }

      const isValid = await validateUrl(url);
      if (isValid) {
        console.log(`  ✓ Valid: ${url}`);
      }

      return { fullMatch, isValid };
    })
  );

  // Remove invalid links from content
  let validatedContent = content;
  validatedLinks.forEach(({ fullMatch, isValid }) => {
    if (!isValid) {
      // Remove the entire line containing the invalid link
      const lines = validatedContent.split('\n');
      validatedContent = lines
        .filter(line => !line.includes(fullMatch))
        .join('\n');
    }
  });

  const removedCount = validatedLinks.filter(l => !l.isValid).length;
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} invalid link(s)`);
  }

  return validatedContent;
}

// Generate guide content using NVIDIA API
async function generateGuideContent(topic) {
  // Add series context if this is part of a series
  let seriesContext = '';
  if (topic.series) {
    seriesContext = `
SERIES CONTEXT:
This guide is part ${topic.series.part} of ${topic.series.total} in the "${topic.series.name}" series.`;

    if (topic.series.previous) {
      seriesContext += `\nPrevious guide: "${topic.series.previous.replace(/-/g, ' ')}"`;
    }
    if (topic.series.next) {
      seriesContext += `\nNext guide: "${topic.series.next.replace(/-/g, ' ')}"`;
    }

    seriesContext += `\n- Assume readers may have completed previous parts if applicable
- Build on concepts from earlier parts naturally
- Reference previous parts when helpful but don't require them
- Make this guide valuable both standalone AND as part of the series
`;
  }

  const prompt = `Create an educational guide about "${topic.title}" for an AI learning website called "For Example AI".
${seriesContext}
WRITING STYLE & PERSONALITY:
- Write with personality! Be conversational, enthusiastic, and human
- Use "I" and "we" occasionally to create connection with readers
- Include personal observations, opinions, or insights where appropriate
- Share why YOU think this topic is interesting or important
- Use humor sparingly but effectively
- Show passion for teaching - let your excitement about AI shine through
- Write like you're explaining to a curious friend over coffee, not lecturing
- Appropriate for ${topic.difficulty} level readers

VISUAL FORMATTING (CRITICAL - FOLLOW EXACTLY):
- ALWAYS use blockquote syntax for callout boxes. Each callout MUST start with > character
- Callout format examples (COPY THIS EXACT FORMAT):
  > **💡 Pro Tip:** Your tip text here

  > **⚠️ Watch Out:** Your warning text here

  > **🎯 Key Insight:** Your insight text here

- DO NOT write callouts as plain bold text like **💡 Pro Tip:**
- ALWAYS include the > character at the start of callout lines
- Add emojis strategically in headers and callouts to add visual interest
- Use **bold** liberally for emphasis
- Create variety in section structure

CONTENT STRUCTURE:
1. Article Title (H1 with equals signs underneath) - Format as: **Title Text** 🚨 followed by a line of equals signs
2. Introduction (2-3 sentences with personality - hook the reader!)
3. Prerequisites (if any, or state "No prerequisites needed") - use ## header
4. Step-by-step explanation with clear ## headers (3-5 main sections with varied formatting)
5. Real-world examples with personal commentary on why they matter - use ## header
6. Try It Yourself (practical, specific suggestions) - use ## header
7. Key Takeaways (bullet points) - use ## header
8. Further Reading (2-3 ACTUAL RESOURCES with real URLs as markdown links) - use ## header

CRITICAL HEADER FORMATTING RULES:
- First line must be the article title as H1: **Title Text** 🚨
- Second line must be equals signs (minimum 50 characters): ====================================================================
- Use ## for all section headers (Prerequisites, main sections, Real-World Examples, Try It Yourself, Key Takeaways, Further Reading)
- Example of correct title format:
  **Understanding Neural Networks** 🚨
  ====================================================================

  Your introduction text here...
- DO NOT use just **bold text** for headers - they must be actual ## headers

FURTHER READING FORMAT:
Make these REAL, CLICKABLE links to actual resources. Format as:
- [Resource Title](https://actual-url.com) - Brief description of what it offers

Example:
- [3Blue1Brown Neural Networks](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi) - Excellent visual explanation series
- [Fast.ai Practical Deep Learning](https://course.fast.ai/) - Free hands-on course

Write in Markdown format. Do NOT include the front matter (YAML) - only the content body.
Be friendly, be human, be helpful!`;

  try {
    const response = await axios.post(
      `${NVIDIA_API_BASE}/chat/completions`,
      {
        model: NVIDIA_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        top_p: 1,
        max_tokens: 8192,  // Increased for Kimi K2.5's more detailed responses
        stream: false,
        // Use Instant Mode for direct responses without reasoning traces
        mode: 'instant'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;

    // Validate all links in the generated content
    const validatedContent = await validateLinksInContent(content);

    return validatedContent;
  } catch (error) {
    console.error('NVIDIA API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Find related guides based on shared tags
function findRelatedGuides(topic, maxRelated = 3) {
  try {
    const guides = fs.readdirSync(GUIDES_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const content = fs.readFileSync(path.join(GUIDES_DIR, file), 'utf-8');
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) return null;

        const frontMatter = frontMatterMatch[1];
        const titleMatch = frontMatter.match(/title:\s*"(.+?)"/);
        const tagsMatch = frontMatter.match(/tags:\s*\[(.*?)\]/);

        if (!titleMatch) return null;

        const title = titleMatch[1];
        const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')) : [];

        return { title, tags, file };
      })
      .filter(guide => guide !== null);

    // Calculate relevance score based on shared tags
    const scoredGuides = guides
      .map(guide => {
        const sharedTags = guide.tags.filter(tag => topic.tags.includes(tag));
        return {
          ...guide,
          score: sharedTags.length
        };
      })
      .filter(guide => guide.score > 0 && guide.title !== topic.title)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRelated);

    return scoredGuides.map(guide => ({
      title: guide.title,
      url: `/guides/${guide.file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')}/`
    }));
  } catch (error) {
    console.error('Error finding related guides:', error.message);
    return [];
  }
}

// Create filename from title
function createFilename(title) {
  const date = new Date().toISOString().split('T')[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${date}-${slug}.md`;
}

// Generate guide description from title
function generateDescription(title, difficulty) {
  const starters = {
    beginner: 'A beginner-friendly introduction to',
    intermediate: 'Learn about',
    advanced: 'A deep dive into'
  };
  return `${starters[difficulty]} ${title.toLowerCase()}`;
}

// Generate AI image prompt from topic
function generateImagePrompt(topic) {
  // Create a concise prompt for FLUX - avoid mentioning title to prevent text generation
  const keywords = topic.tags.slice(0, 3).join(', ');
  return `Abstract tech illustration with ${keywords} theme, clean modern design, vibrant gradients with blue purple teal colors, geometric shapes, flowing lines, futuristic tech motifs, educational style, high quality digital art. IMPORTANT: absolutely no text, no words, no letters, no typography, no labels, pure visual abstract design only`;
}

// Helper function to try generating image with a specific FLUX model
async function tryGenerateWithModel(prompt, modelUrl, modelName, steps, maxRetries = 3, timeoutMs = 300000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Sending prompt to ${modelName}...`);

      const response = await axios.post(
        modelUrl,
        {
          prompt: prompt,
          width: 1024,
          height: 1024,
          seed: Math.floor(Math.random() * 1000000),
          steps: steps
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: timeoutMs
        }
      );

      // Extract image data from response
      if (!response.data || !response.data.artifacts || response.data.artifacts.length === 0) {
        throw new Error('No image data in response');
      }

      const artifact = response.data.artifacts[0];
      if (artifact.finishReason !== 'SUCCESS') {
        throw new Error(`Image generation failed: ${artifact.finishReason}`);
      }

      console.log(`✓ Success! Image generated with ${modelName}`);
      return artifact.base64;

    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const isServerError = error.response && error.response.status >= 500;

      console.error(`✗ Attempt ${attempt} failed: ${error.message}`);

      if (error.response) {
        console.error(`   HTTP Status: ${error.response.status}`);
        if (error.response.data) {
          console.error(`   API Response:`, JSON.stringify(error.response.data));
        }
      }

      if (isTimeout) {
        console.error(`   (Request timed out after ${timeoutMs/1000}s - API may be overloaded)`);
      } else if (isServerError) {
        console.error(`   (Server error - NVIDIA API may be experiencing issues)`);
      }

      // Don't retry immediately on server errors - wait longer
      if (attempt < maxRetries) {
        const waitTime = isServerError ?
          Math.pow(2, attempt) * 15000 : // 30s, 60s for server errors
          Math.pow(2, attempt) * 10000;   // 20s, 40s for other errors
        console.log(`   Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  return null;
}

// Generate and save image using NVIDIA's FLUX models with fallback
async function fetchAndSaveImage(topic) {
  const slug = topic.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug}.jpg`;
  const filepath = path.join(IMAGES_DIR, filename);

  // Check if image already exists
  if (fs.existsSync(filepath)) {
    console.log(`Image already exists: ${filename}`);
    return {
      path: `/assets/images/guides/${filename}`,
      credit: 'Generated by NVIDIA FLUX.1-schnell',
      credit_url: 'https://build.nvidia.com/black-forest-labs/flux_1-schnell'
    };
  }

  console.log(`Generating AI image for: ${topic.title}`);

  const prompt = generateImagePrompt(topic);
  let imageBase64 = null;
  let modelUsed = null;

  // Try FLUX.1-schnell first (faster, 4 steps)
  console.log('\n🎨 Trying FLUX.1-schnell (fast model)...');
  imageBase64 = await tryGenerateWithModel(
    prompt,
    'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell',
    'FLUX.1-schnell',
    4,
    3,
    300000 // 5 minute timeout
  );

  if (imageBase64) {
    modelUsed = 'schnell';
  } else {
    // Fallback to FLUX.1-dev (slower but more reliable)
    console.log('\n🔄 FLUX.1-schnell failed, falling back to FLUX.1-dev (slower but more reliable)...');
    console.log('   Note: FLUX.1-dev uses 50 steps vs 4 for schnell, so it takes longer');
    imageBase64 = await tryGenerateWithModel(
      prompt,
      'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev',
      'FLUX.1-dev',
      50,
      2,
      600000 // 10 minute timeout for dev model (it's slower)
    );

    if (imageBase64) {
      modelUsed = 'dev';
    }
  }

  // If both models failed
  if (!imageBase64) {
    console.error('\n⚠️  All attempts with both FLUX models failed.');
    console.error('    This is likely a temporary NVIDIA API issue.');
    console.error('    Guide will be created without image - you can generate the image later.');
    console.error('    To retry image generation for this guide, run:');
    console.error(`    node scripts/add-images-retroactive.js`);
    return null;
  }

  // Save the image
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  fs.writeFileSync(filepath, imageBuffer);

  const creditInfo = modelUsed === 'schnell'
    ? {
        credit: 'Generated by NVIDIA FLUX.1-schnell',
        credit_url: 'https://build.nvidia.com/black-forest-labs/flux_1-schnell'
      }
    : {
        credit: 'Generated by NVIDIA FLUX.1-dev',
        credit_url: 'https://build.nvidia.com/black-forest-labs/flux_1-dev'
      };

  console.log(`✓ AI-generated image saved: ${filename} (using ${modelUsed})`);

  return {
    path: `/assets/images/guides/${filename}`,
    ...creditInfo
  };
}

// Create guide file
async function createGuideFile(topic, content, imageData) {
  const filename = createFilename(topic.title);
  const filepath = path.join(GUIDES_DIR, filename);

  const date = new Date().toISOString().split('T')[0];
  const description = generateDescription(topic.title, topic.difficulty);

  // Find related guides
  const relatedGuides = findRelatedGuides(topic);

  // Add related guides section if any found
  if (relatedGuides.length > 0) {
    content += `\n\n## Related Guides\n\n`;
    content += `Want to learn more? Check out these related guides:\n\n`;
    relatedGuides.forEach(guide => {
      content += `- [${guide.title}](${guide.url})\n`;
    });
  }

  // Estimate reading time (rough: 200 words per minute)
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Build front matter with optional image data and series info
  let frontMatter = `---
layout: guide
title: "${topic.title}"
date: ${date}
difficulty: ${topic.difficulty}
tags: [${topic.tags.map(tag => `"${tag}"`).join(', ')}]
description: "${description}"
estimated_time: "${readingTime} min read"`;

  if (imageData) {
    frontMatter += `
image: "${imageData.path}"
image_credit: "${imageData.credit}"
image_credit_url: "${imageData.credit_url}"`;
  }

  // Add series metadata if present
  if (topic.series) {
    frontMatter += `
series:
  name: "${topic.series.name}"
  part: ${topic.series.part}
  total: ${topic.series.total}`;

    if (topic.series.previous) {
      frontMatter += `
  previous: "${topic.series.previous}"`;
    }
    if (topic.series.next) {
      frontMatter += `
  next: "${topic.series.next}"`;
    }
  }

  frontMatter += `
---

`;

  const fullContent = frontMatter + content;
  fs.writeFileSync(filepath, fullContent);

  console.log(`Created guide: ${filename}`);
  if (relatedGuides.length > 0) {
    console.log(`Added ${relatedGuides.length} related guide links`);
  }
  return filename;
}

// Update series navigation in adjacent guides
function updateSeriesNavigation(newTopic) {
  if (!newTopic.series) {
    return;
  }

  console.log('\nUpdating series navigation in adjacent guides...');

  const newSlug = titleToSlug(newTopic.title);

  // Update previous guide's "next" link
  if (newTopic.series.previous) {
    const prevSlug = newTopic.series.previous;
    const prevFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.includes(prevSlug));

    if (prevFiles.length > 0) {
      const prevFile = path.join(GUIDES_DIR, prevFiles[0]);
      let content = fs.readFileSync(prevFile, 'utf-8');

      // Check if the previous guide already has a next link
      const hasNextLink = /next:\s*"[^"]+"/m.test(content);

      if (!hasNextLink) {
        // Add next link after the previous line, or after total line if no previous
        const hasPreviousLine = /previous:\s*"[^"]+"/m.test(content);

        if (hasPreviousLine) {
          // Add after previous line
          content = content.replace(
            /(previous:\s*"[^"]+")\n/m,
            `$1\n  next: "${newSlug}"\n`
          );
        } else {
          // Add after total line
          content = content.replace(
            /(total:\s*\d+)\n/m,
            `$1\n  next: "${newSlug}"\n`
          );
        }

        fs.writeFileSync(prevFile, content);
        console.log(`  ✓ Updated ${prevFiles[0]} with next link to ${newSlug}`);
      } else {
        console.log(`  ✓ ${prevFiles[0]} already has next link`);
      }
    }
  }

  // Update next guide's "previous" link
  if (newTopic.series.next) {
    const nextSlug = newTopic.series.next;
    const nextFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.includes(nextSlug));

    if (nextFiles.length > 0) {
      const nextFile = path.join(GUIDES_DIR, nextFiles[0]);
      let content = fs.readFileSync(nextFile, 'utf-8');

      // Check if the next guide already has a previous link
      const hasPreviousLink = /previous:\s*"[^"]+"/m.test(content);

      if (!hasPreviousLink) {
        // Add previous link after part line
        content = content.replace(
          /(part:\s*\d+)\n/m,
          `$1\n  previous: "${newSlug}"\n`
        );

        fs.writeFileSync(nextFile, content);
        console.log(`  ✓ Updated ${nextFiles[0]} with previous link to ${newSlug}`);
      } else {
        console.log(`  ✓ ${nextFiles[0]} already has previous link`);
      }
    }
  }
}

// Main function
async function main() {
  try {
    console.log('Starting guide generation...');

    // Check for API key
    if (!process.env.NVIDIA_API_KEY) {
      throw new Error('NVIDIA_API_KEY environment variable is not set');
    }

    // Load topics
    const { topics, generatedTopics } = loadTopics();
    console.log(`Loaded ${topics.length} topics, ${generatedTopics.length} already generated`);

    // Select topic
    const topic = selectNextTopic(topics, generatedTopics);
    console.log(`Selected topic: ${topic.title} (${topic.difficulty})`);

    // Generate content
    console.log('Generating content with NVIDIA API...');
    const content = await generateGuideContent(topic);

    // Wait a moment before image generation to avoid rate limiting
    console.log('Waiting 5 seconds before image generation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch image
    console.log('Fetching image...');
    const imageData = await fetchAndSaveImage(topic);

    // Create guide file
    const filename = await createGuideFile(topic, content, imageData);

    // Update series navigation in adjacent guides
    updateSeriesNavigation(topic);

    // Update generated topics
    if (!generatedTopics.includes(topic.title)) {
      generatedTopics.push(topic.title);
      saveGeneratedTopics(generatedTopics);
    }

    console.log('Guide generation complete!');
    console.log(`Total guides generated: ${generatedTopics.length}/${topics.length}`);

  } catch (error) {
    console.error('Error generating guide:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
