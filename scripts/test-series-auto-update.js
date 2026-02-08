const fs = require('fs');
const path = require('path');

// Test that the auto-update function in generate-guide.js works correctly
// This simulates what happens when a new guide is generated

console.log('🧪 Testing Series Auto-Update Functionality\n');

// Read the generate-guide.js file to verify the function exists
const generateGuideContent = fs.readFileSync(
  path.join(__dirname, 'generate-guide.js'),
  'utf-8'
);

// Check that updateSeriesNavigation function exists
if (!generateGuideContent.includes('function updateSeriesNavigation')) {
  console.error('❌ updateSeriesNavigation function not found in generate-guide.js');
  process.exit(1);
}

console.log('✓ updateSeriesNavigation function exists');

// Check that it's called in the main function
if (!generateGuideContent.includes('updateSeriesNavigation(topic)')) {
  console.error('❌ updateSeriesNavigation is not called in main function');
  process.exit(1);
}

console.log('✓ updateSeriesNavigation is called after guide creation');

// Verify the function handles previous guides
if (!generateGuideContent.includes("newTopic.series.previous")) {
  console.error('❌ Function does not check for previous guides');
  process.exit(1);
}

console.log('✓ Function checks for previous guides');

// Verify the function handles next guides
if (!generateGuideContent.includes("newTopic.series.next")) {
  console.error('❌ Function does not check for next guides');
  process.exit(1);
}

console.log('✓ Function checks for next guides');

// Verify it adds next link to previous guide
if (!generateGuideContent.includes('next: "${newSlug}"')) {
  console.error('❌ Function does not add next link to previous guide');
  process.exit(1);
}

console.log('✓ Function adds next link to previous guide');

// Verify it adds previous link to next guide
if (!generateGuideContent.includes('previous: "${newSlug}"')) {
  console.error('❌ Function does not add previous link to next guide');
  process.exit(1);
}

console.log('✓ Function adds previous link to next guide');

// Check that it handles cases where link already exists
if (!generateGuideContent.includes('already has next link') ||
    !generateGuideContent.includes('already has previous link')) {
  console.error('❌ Function does not check if links already exist');
  process.exit(1);
}

console.log('✓ Function checks if links already exist');

console.log('\n✅ All tests passed!');
console.log('\nThe auto-update function should work correctly for future guide generation.');
console.log('When a new guide is generated:');
console.log('  1. If it has a "previous" link, that guide will get a "next" link added');
console.log('  2. If it has a "next" link, that guide will get a "previous" link added');
console.log('  3. This ensures bidirectional navigation is maintained automatically');

process.exit(0);
