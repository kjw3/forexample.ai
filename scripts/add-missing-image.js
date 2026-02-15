const fs = require('fs');
const path = require('path');
const axios = require('axios');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images', 'guides');
const GUIDES_DIR = path.join(__dirname, '..', '_guides');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Generate AI image prompt from topic
function generateImagePrompt(title, tags) {
  // Create a concise prompt for FLUX - avoid mentioning title to prevent text generation
  // CRITICAL: Multiple emphatic instructions to prevent text generation
  // Expand common acronyms to avoid content filtering issues
  const keywords = tags.slice(0, 3)
    .map(tag => {
      // Expand common ML/AI acronyms to avoid content filtering
      const expansions = {
        'cnn': 'convolutional networks',
        'rnn': 'recurrent networks',
        'gpt': 'generative models',
        'ai': 'artificial intelligence',
        'ml': 'machine learning',
        'nlp': 'natural language processing',
        'cv': 'computer vision'
      };
      return expansions[tag.toLowerCase()] || tag;
    })
    .join(', ');

  return {
    // Generic prompt without topic keywords to avoid content filtering
    prompt: `Abstract technology background: vibrant gradient colors blending blue purple and teal, geometric patterns, flowing curved lines, glowing points, futuristic digital design, clean modern minimalist style, pure visual composition, high quality digital art, smooth gradients and geometric shapes`,
    negative_prompt: `text, letters, words, typography, watermark, logo`
  };
}

// Helper function to try generating image with a specific FLUX model
async function tryGenerateWithModel(promptData, modelUrl, modelName, steps, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Sending prompt to ${modelName}...`);

      const requestBody = {
        prompt: promptData.prompt,
        width: 1024,
        height: 1024,
        seed: Math.floor(Math.random() * 1000000),
        steps: steps
      };

      // Note: Negative prompt may not be supported by NVIDIA FLUX API
      // Commenting out for now to avoid 422 errors
      // if (promptData.negative_prompt && modelName.includes('dev')) {
      //   requestBody.negative_prompt = promptData.negative_prompt;
      // }

      const response = await axios.post(
        modelUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 300000 // 5 minute timeout
        }
      );

      if (!response.data || !response.data.artifacts || response.data.artifacts.length === 0) {
        throw new Error('No image data in response');
      }

      const artifact = response.data.artifacts[0];
      if (artifact.finishReason !== 'SUCCESS') {
        throw new Error(`Image generation failed: ${artifact.finishReason}`);
      }

      return artifact.base64;

    } catch (error) {
      console.error(`✗ Attempt ${attempt} failed:`, error.message);
      if (error.response) {
        console.error('API Response:', JSON.stringify(error.response.data) || error.response.status);
      }

      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 10000; // 20s, 40s, 80s
        console.log(`Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  return null;
}

// Generate and save image using NVIDIA's FLUX models with fallback
async function generateAndSaveImage(title, tags) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug}.jpg`;
  const filepath = path.join(IMAGES_DIR, filename);

  console.log(`Generating AI image for: ${title}`);

  const prompt = generateImagePrompt(title, tags);
  let imageBase64 = null;
  let modelUsed = null;

  // Try FLUX.1-schnell first (faster, 4 steps)
  console.log('\n🎨 Trying FLUX.1-schnell (fast model)...');
  imageBase64 = await tryGenerateWithModel(
    prompt,
    'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell',
    'FLUX.1-schnell',
    4,
    3
  );

  if (imageBase64) {
    modelUsed = 'schnell';
  } else {
    // Fallback to FLUX.1-dev (slower but more reliable)
    console.log('\n🔄 FLUX.1-schnell failed, falling back to FLUX.1-dev (slower but more reliable)...');
    imageBase64 = await tryGenerateWithModel(
      prompt,
      'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev',
      'FLUX.1-dev',
      50,
      2
    );

    if (imageBase64) {
      modelUsed = 'dev';
    }
  }

  // If both models failed
  if (!imageBase64) {
    console.error('⚠️  All attempts with both FLUX models failed.');
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

// Update guide front matter with image data
function updateGuideFrontMatter(filepath, imageData) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontMatterMatch) {
    console.error('Could not find front matter');
    return false;
  }

  const oldFrontMatter = frontMatterMatch[0];
  let frontMatterContent = frontMatterMatch[1];

  // Check if image fields already exist
  if (frontMatterContent.includes('image:')) {
    console.log('Front matter already has image field, skipping update');
    return false;
  }

  // Add image fields
  const imageFields = `image: "${imageData.path}"
image_credit: "${imageData.credit}"
image_credit_url: "${imageData.credit_url}"`;

  const newFrontMatter = `---\n${frontMatterContent}\n${imageFields}\n---`;
  const newContent = content.replace(oldFrontMatter, newFrontMatter);

  fs.writeFileSync(filepath, newContent);
  console.log('Front matter updated successfully');
  return true;
}

async function main() {
  const guideFile = '2026-02-02-understanding-gradient-clipping.md';
  const guidePath = path.join(GUIDES_DIR, guideFile);

  if (!fs.existsSync(guidePath)) {
    console.error(`Guide not found: ${guideFile}`);
    process.exit(1);
  }

  console.log(`Adding image to: ${guideFile}\n`);

  // Parse front matter to get title and tags
  const content = fs.readFileSync(guidePath, 'utf-8');
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontMatterMatch) {
    console.error('Could not parse front matter');
    process.exit(1);
  }

  const frontMatter = frontMatterMatch[1];
  const titleMatch = frontMatter.match(/title:\s*"(.+?)"/);
  const tagsMatch = frontMatter.match(/tags:\s*\[(.*?)\]/);

  if (!titleMatch) {
    console.error('Could not find title');
    process.exit(1);
  }

  const title = titleMatch[1];
  const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')) : [];

  console.log(`Title: ${title}`);
  console.log(`Tags: ${tags.join(', ')}\n`);

  // Generate image
  const imageData = await generateAndSaveImage(title, tags);

  if (!imageData) {
    console.error('Failed to generate image');
    process.exit(1);
  }

  // Update front matter
  const updated = updateGuideFrontMatter(guidePath, imageData);

  if (updated) {
    console.log('\n✨ Done! Image added successfully.');
  } else {
    console.log('\n⚠️  Front matter not updated');
  }
}

if (require.main === module) {
  main();
}
