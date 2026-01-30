# For Example AI

An AI education website that automatically generates and publishes step-by-step guides on AI topics. Built with Jekyll and powered by NVIDIA's free AI models for text and Stable Diffusion XL for images, new educational content with custom AI-generated illustrations is automatically created and deployed on every commit.

## Features

- **Automatic Content Generation**: AI-powered guide generation using NVIDIA's free Llama 3.1 70B model
- **AI-Generated Images**: Custom illustrations created by Stable Diffusion XL (free via Hugging Face) for each guide
- **Daily Publishing**: New guides automatically generated and published every day
- **Link Validation**: Automatic checking of external links to ensure quality resources
- **Instructables-Style Design**: Clear, step-by-step guides with approachable language
- **Difficulty Levels**: Beginner, Intermediate, and Advanced topics
- **Cross-Linking**: Related guides automatically linked based on shared topics
- **Responsive Design**: Works beautifully on desktop and mobile
- **Search & Filter**: Find guides by difficulty level or search keywords
- **GitHub Pages Deployment**: Automatically deployed and hosted for free

## Live Site

Visit the site at: [https://forexample.ai](https://forexample.ai) (configure your domain)

## How It Works

1. Every day at 10:17 AM UTC, a GitHub Actions workflow automatically runs
2. The workflow runs a Node.js script that:
   - Selects an unused topic from the curated list (50+ topics available)
   - Calls NVIDIA's free API to generate an educational guide
   - Validates all external links to ensure quality resources
   - Generates a custom illustration using Stable Diffusion XL
   - Finds related guides based on shared tags
   - Creates a markdown file with proper front matter and image attribution
   - Commits the new guide back to the repository
3. GitHub Pages automatically rebuilds and deploys the updated site

You can also trigger generation manually or on every push to main branch.

## Setup Instructions

### Prerequisites

- Node.js 20 or higher
- A GitHub account
- A free NVIDIA API key ([get one here](https://build.nvidia.com/))
- A free Hugging Face API token ([get one here](https://huggingface.co/settings/tokens))

### Getting Your Free NVIDIA API Key

1. Visit [build.nvidia.com](https://build.nvidia.com/)
2. Click "Get API Key" or sign in with your NVIDIA account (free to create)
3. Navigate to any model page (e.g., "meta/llama-3.1-70b-instruct")
4. Click "Get API Key" button
5. Copy your API key - you'll use this for both local development and GitHub

**Note**: NVIDIA's API is completely free with generous rate limits - no credit card required!

### Getting Your Free Hugging Face API Token

1. Visit [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Sign up or log in with your Hugging Face account (free)
3. Click "New token"
4. Name it (e.g., "forexample-ai-images") and select "Read" role
5. Click "Generate token"
6. Copy your token - you'll use this for both local development and GitHub

**Note**: Hugging Face provides completely free access to Stable Diffusion models via their Inference API!

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/forexample.ai.git
   cd forexample.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Jekyll** (for local preview)
   ```bash
   gem install bundler jekyll
   ```

4. **Set up your API keys**
   ```bash
   export NVIDIA_API_KEY='your-nvidia-api-key-here'
   export HUGGINGFACE_API_KEY='hf_your_token_here'
   ```

5. **Generate a guide locally** (optional)
   ```bash
   npm run generate
   ```

6. **Run Jekyll locally**
   ```bash
   jekyll serve
   ```
   Visit `http://localhost:4000` to preview the site

### GitHub Setup

1. **Create a new repository**
   - Create a new repository on GitHub
   - Name it `forexample.ai` (or your preferred name)

2. **Add your API keys as secrets**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret" and add:
     - Name: `NVIDIA_API_KEY`, Value: Your NVIDIA API key
     - Name: `HUGGINGFACE_API_KEY`, Value: Your Hugging Face token
   - Click "Add secret" for each

3. **Push your code**
   ```bash
   git remote add origin https://github.com/yourusername/forexample.ai.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `root`
   - Click Save

5. **Wait for deployment**
   - The first workflow run will generate a new guide
   - GitHub Pages will build and deploy your site
   - Visit `https://yourusername.github.io/forexample.ai`

### Custom Domain (Optional)

1. **Add a CNAME file**
   ```bash
   echo "forexample.ai" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. **Configure DNS**
   - Add a CNAME record pointing to `yourusername.github.io`
   - Or add A records pointing to GitHub Pages IPs
   - See [GitHub's documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

3. **Update `_config.yml`**
   ```yaml
   url: "https://forexample.ai"
   ```

## Configuration

### Adding Topics

**Interactive Method (Recommended)**:
```bash
npm run add-topic
```

This will interactively prompt you for:
- Topic title
- Difficulty level (beginner/intermediate/advanced)
- Tags (comma-separated)

**Manual Method**:
Edit `topics.json` directly:

```json
{
  "title": "Your Topic Title",
  "difficulty": "beginner|intermediate|advanced",
  "tags": ["tag1", "tag2", "tag3"]
}
```

**View Popular Tags**:
```bash
npm run show-tags
```

See `CONTENT_STRATEGY.md` for comprehensive content planning guidance.

### Customizing the Design

- **Colors**: Edit CSS variables in `assets/css/main.css`
- **Layout**: Modify templates in `_layouts/`
- **Components**: Edit includes in `_includes/`

### Adjusting Content Generation

Edit `scripts/generate-guide.js` to:
- Change the AI model (currently using NVIDIA's Llama 3.1 70B - see other free models at build.nvidia.com)
- Modify the prompt for different content styles
- Adjust the guide structure or format

### AI-Generated Images with Stable Diffusion XL

The site uses **Stable Diffusion XL** via Hugging Face's free Inference API to automatically generate custom, modern tech illustrations for each guide.

**Image Features**:
- Modern, professional tech illustrations
- Clean design with vibrant gradients (blues, purples, teals)
- Abstract geometric shapes and subtle tech motifs
- High-quality digital art optimized for blog headers
- Completely free via Hugging Face

**Adding Images to Existing Guides**:
Use the retroactive image generation script to add AI-generated images to all existing guides:
```bash
npm run add-images
```

This script will:
1. Scan all guides in `_guides/`
2. Generate custom illustrations for guides without images using Stable Diffusion XL
3. Update front matter with image paths and attribution
4. Save images to `assets/images/guides/`

**Important Notes**:
- First request may take 20-30 seconds as the model loads
- Subsequent requests are much faster (2-5 seconds)
- Free tier has rate limits - add delays between requests if generating many images
- The script automatically includes a 2-second delay between generations

**Manual Image Addition**:
To manually add images to a guide, add these fields to the front matter:
```yaml
image: "/assets/images/guides/your-image.jpg"
image_credit: "Generated by Stable Diffusion XL"
image_credit_url: "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0"
```

**Customizing Image Style**:
Edit the `generateImagePrompt` function in `scripts/generate-guide.js` to change:
- Color palette and visual style
- Composition and layout elements
- Art style (illustration, diagram, photorealistic, etc.)
- Mood and aesthetic

**Using Different Models**:
You can switch to other Hugging Face models by changing the API endpoint:
- `stable-diffusion-xl-base-1.0` (current, best quality)
- `stable-diffusion-2-1` (faster, less detailed)
- `dreamshaper-xl` (more artistic style)
- Any other text-to-image model on Hugging Face

## Available Commands

```bash
# Generate a new guide manually
npm run generate

# Add AI-generated images to existing guides
npm run add-images

# Check all guides for broken links
npm run check-links

# Add a new topic interactively
npm run add-topic

# Show most used tags
npm run show-tags
```

## Project Structure

```
forexample.ai/
├── .github/workflows/
│   └── generate-content.yml       # GitHub Actions workflow (daily at 10am UTC)
├── _layouts/
│   ├── default.html               # Base template
│   ├── guide.html                 # Guide page template
│   └── home.html                  # Homepage template
├── _includes/
│   ├── header.html                # Site header
│   ├── footer.html                # Site footer
│   └── guide-card.html            # Guide preview card
├── _guides/                       # AI-generated guides (auto-created)
├── assets/
│   ├── css/main.css              # Site styling
│   ├── js/main.js                # Interactive features
│   └── images/guides/            # Guide images (auto-fetched)
├── scripts/
│   ├── generate-guide.js         # Content generation script
│   ├── add-images-retroactive.js # Retroactive image generation
│   ├── check-links.js            # Link validation script
│   └── add-topic.js              # Interactive topic adding tool
├── topics.json                    # Curated AI topics (50+ topics)
├── generated-topics.json          # Tracking file
├── CONTENT_STRATEGY.md            # Content planning guide
├── _config.yml                    # Jekyll configuration
├── index.html                     # Homepage
├── package.json                   # Node dependencies
└── README.md                      # This file
```

## Guide Format

Each guide includes:
- **Introduction**: What you'll learn
- **Prerequisites**: Required background (if any)
- **Step-by-step sections**: Clear explanations with headers
- **Real-world examples**: Practical applications
- **Try It Yourself**: Hands-on activities
- **Key Takeaways**: Summary bullet points
- **Further Reading**: Resources for deeper learning

## Troubleshooting

### Workflow fails with "API_KEY not set"

Make sure you've added both `NVIDIA_API_KEY` and `HUGGINGFACE_API_KEY` as GitHub secrets (see GitHub Setup step 2).

### Image generation fails with "Model is loading"

The first request to Stable Diffusion XL takes 20-30 seconds as the model loads. Wait and retry - subsequent requests will be much faster.

### Site not updating after push

1. Check the Actions tab for workflow status
2. Ensure GitHub Pages is enabled in settings
3. Wait a few minutes for Pages deployment to complete

### Generated guide has formatting issues

Check the NVIDIA API response in the workflow logs. You may need to adjust the prompt in `generate-guide.js`.

### Running out of topics

The script will automatically reset and reuse topics when all have been generated. Edit `generated-topics.json` to manually reset.

## Cost Considerations

- **GitHub Pages**: Free for public repositories
- **GitHub Actions**: 2,000 minutes/month free for public repositories
- **NVIDIA API**: **Completely FREE** with generous rate limits
  - No credit card required
  - Access to powerful models like Llama 3.1 70B
  - Perfect for educational and personal projects
- **Hugging Face Inference API**: **Completely FREE**
  - Free access to Stable Diffusion XL for image generation
  - No credit card required
  - Generous rate limits for personal and educational projects

## Customization Ideas

- Add RSS feed for new guides
- Add user comments via GitHub Discussions
- Create themed collections of guides
- Add interactive code examples
- Implement multiple guides per workflow run
- Add a "request a topic" feature via GitHub Issues
- Experiment with different image styles (diagrams, photorealistic, minimalist, etc.)

## Contributing

Contributions are welcome! Feel free to:
- Add new topics to `topics.json`
- Improve the design and layout
- Enhance the content generation prompt
- Add new features

## License

MIT License - feel free to use this for your own educational sites!

## Acknowledgments

- Built with [Jekyll](https://jekyllrb.com/)
- Powered by [NVIDIA AI](https://build.nvidia.com/) - free text generation models
- Images generated by [Stable Diffusion XL](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) via Hugging Face
- Hosted on [GitHub Pages](https://pages.github.com/)
- Design inspired by [Instructables](https://www.instructables.com/)
