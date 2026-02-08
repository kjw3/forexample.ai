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

// Main validation
function main() {
  console.log('🔍 Validating Series Navigation...\n');

  const guideFiles = fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md'));

  // Create a map of slug -> filename
  const slugToFile = {};
  guideFiles.forEach(filename => {
    const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    slugToFile[slug] = filename;
  });

  // Parse all guides
  const guides = [];
  guideFiles.forEach(filename => {
    const filePath = path.join(GUIDES_DIR, filename);
    const guideData = parseGuide(filePath);
    if (guideData && guideData.series) {
      const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
      guides.push({ filename, slug, ...guideData });
    }
  });

  console.log(`Found ${guides.length} guides with series metadata\n`);

  let issues = 0;

  // Group by series
  const seriesGroups = {};
  guides.forEach(guide => {
    const seriesName = guide.series.name;
    if (!seriesGroups[seriesName]) {
      seriesGroups[seriesName] = [];
    }
    seriesGroups[seriesName].push(guide);
  });

  // Validate each series
  Object.keys(seriesGroups).sort().forEach(seriesName => {
    const seriesGuides = seriesGroups[seriesName].sort((a, b) => a.series.part - b.series.part);
    console.log(`📚 ${seriesName} (${seriesGuides.length}/${seriesGuides[0].series.total} parts)`);

    seriesGuides.forEach(guide => {
      const errors = [];

      // Check if previous link exists and is bidirectional
      if (guide.series.previous) {
        const prevExists = slugToFile[guide.series.previous];
        if (!prevExists) {
          errors.push(`Previous link "${guide.series.previous}" doesn't exist`);
        } else {
          // Check if previous guide has this as next
          const prevGuide = guides.find(g => g.slug === guide.series.previous);
          if (prevGuide && prevGuide.series.next !== guide.slug) {
            errors.push(`Previous guide doesn't link back (missing next: "${guide.slug}")`);
          }
        }
      } else if (guide.series.part > 1) {
        errors.push(`Missing previous link (part ${guide.series.part} of ${guide.series.total})`);
      }

      // Check if next link exists and is bidirectional
      if (guide.series.next) {
        const nextExists = slugToFile[guide.series.next];
        if (!nextExists) {
          errors.push(`Next link "${guide.series.next}" doesn't exist`);
        } else {
          // Check if next guide has this as previous
          const nextGuide = guides.find(g => g.slug === guide.series.next);
          if (nextGuide && nextGuide.series.previous !== guide.slug) {
            errors.push(`Next guide doesn't link back (missing previous: "${guide.slug}")`);
          }
        }
      } else if (guide.series.part < guide.series.total) {
        errors.push(`Missing next link (part ${guide.series.part} of ${guide.series.total})`);
      }

      if (errors.length > 0) {
        console.log(`  ❌ Part ${guide.series.part}: ${guide.title}`);
        errors.forEach(err => console.log(`     - ${err}`));
        issues += errors.length;
      } else {
        console.log(`  ✓ Part ${guide.series.part}: ${guide.title}`);
      }
    });

    console.log('');
  });

  if (issues > 0) {
    console.log(`\n❌ Found ${issues} issue(s) in series navigation`);
    process.exit(1);
  } else {
    console.log('✅ All series navigation is valid');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
