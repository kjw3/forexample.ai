const fs = require('fs');
const path = require('path');

// File paths
const GUIDES_DIR = path.join(__dirname, '..', '_guides');

// Convert title to slug format
function titleToSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Parse frontmatter and extract series metadata
function parseGuide(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontMatterMatch) {
    return null;
  }

  const frontMatterText = frontMatterMatch[1];

  // Extract title
  const titleMatch = frontMatterText.match(/title:\s*"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : null;

  // Extract series metadata
  const seriesMatch = frontMatterText.match(/series:\s*\n([\s\S]*?)(?=\n\w|$)/);
  if (!seriesMatch) {
    return { title, series: null };
  }

  const seriesText = seriesMatch[1];
  const series = {};

  const nameMatch = seriesText.match(/name:\s*"([^"]+)"/);
  if (nameMatch) series.name = nameMatch[1];

  const partMatch = seriesText.match(/part:\s*(\d+)/);
  if (partMatch) series.part = parseInt(partMatch[1]);

  const totalMatch = seriesText.match(/total:\s*(\d+)/);
  if (totalMatch) series.total = parseInt(totalMatch[1]);

  const previousMatch = seriesText.match(/previous:\s*"([^"]+)"/);
  if (previousMatch) series.previous = previousMatch[1];

  const nextMatch = seriesText.match(/next:\s*"([^"]+)"/);
  if (nextMatch) series.next = nextMatch[1];

  return { title, series };
}

// Main function to fix series navigation
function main() {
  console.log('🔧 Fixing Series Navigation...\n');

  const guideFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md'));

  // Create a map of slug -> filename
  const slugToFile = {};
  guideFiles.forEach(filename => {
    const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    slugToFile[slug] = filename;
  });

  // Parse all guides with series
  const guides = [];
  guideFiles.forEach(filename => {
    const filePath = path.join(GUIDES_DIR, filename);
    const guideData = parseGuide(filePath);
    if (guideData && guideData.series) {
      const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
      guides.push({ filename, slug, filePath, ...guideData });
    }
  });

  console.log(`Found ${guides.length} guides with series metadata\n`);

  let fixed = 0;

  // Group by series
  const seriesGroups = {};
  guides.forEach(guide => {
    const seriesName = guide.series.name;
    if (!seriesGroups[seriesName]) {
      seriesGroups[seriesName] = [];
    }
    seriesGroups[seriesName].push(guide);
  });

  // Fix each series
  Object.keys(seriesGroups).sort().forEach(seriesName => {
    const seriesGuides = seriesGroups[seriesName].sort((a, b) => a.series.part - b.series.part);
    console.log(`📚 ${seriesName}`);

    seriesGuides.forEach((guide, index) => {
      let content = fs.readFileSync(guide.filePath, 'utf-8');
      let modified = false;

      // Check if should have previous link
      if (index > 0) {
        const prevGuide = seriesGuides[index - 1];
        if (!guide.series.previous) {
          // Add previous link after part line
          content = content.replace(
            /(part:\s*\d+)\n/m,
            `$1\n  previous: "${prevGuide.slug}"\n`
          );
          console.log(`  ✓ Added previous link to Part ${guide.series.part}: ${prevGuide.slug}`);
          modified = true;
          fixed++;
        } else if (guide.series.previous !== prevGuide.slug) {
          // Fix incorrect previous link
          content = content.replace(
            /previous:\s*"[^"]+"/m,
            `previous: "${prevGuide.slug}"`
          );
          console.log(`  ✓ Fixed previous link in Part ${guide.series.part}: ${prevGuide.slug}`);
          modified = true;
          fixed++;
        }
      }

      // Check if should have next link
      if (index < seriesGuides.length - 1) {
        const nextGuide = seriesGuides[index + 1];
        if (!guide.series.next) {
          // Add next link
          const hasPreviousLine = /previous:\s*"[^"]+"/m.test(content);
          if (hasPreviousLine) {
            // Add after previous line
            content = content.replace(
              /(previous:\s*"[^"]+")\n/m,
              `$1\n  next: "${nextGuide.slug}"\n`
            );
          } else {
            // Add after total line
            content = content.replace(
              /(total:\s*\d+)\n/m,
              `$1\n  next: "${nextGuide.slug}"\n`
            );
          }
          console.log(`  ✓ Added next link to Part ${guide.series.part}: ${nextGuide.slug}`);
          modified = true;
          fixed++;
        } else if (guide.series.next !== nextGuide.slug) {
          // Fix incorrect next link
          content = content.replace(
            /next:\s*"[^"]+"/m,
            `next: "${nextGuide.slug}"`
          );
          console.log(`  ✓ Fixed next link in Part ${guide.series.part}: ${nextGuide.slug}`);
          modified = true;
          fixed++;
        }
      }

      if (modified) {
        fs.writeFileSync(guide.filePath, content);
      }
    });

    console.log('');
  });

  console.log(`\n✅ Fixed ${fixed} navigation link(s)`);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
