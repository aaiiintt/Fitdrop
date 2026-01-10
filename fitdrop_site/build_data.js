const fs = require('fs');
const path = require('path');

const promptsPath = path.join(__dirname, '../prompts_clean.json');
const imagesDir = path.join(__dirname, 'images');
const outputPath = path.join(__dirname, 'data.js');

const promptsData = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
const prompts = promptsData.prompts;

const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));

const mergedData = [];

// Helper to normalize strings for matching
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

prompts.forEach(prompt => {
    const year = prompt.year;
    // Find matching image
    // Strategy: Image filename starts with Year, or contains the label
    // Filename format example: 1980_1980_blitz_kid_new_romantic_rgba.png

    const matchingImage = imageFiles.find(img => {
        return img.startsWith(`${year}_`) || img.includes(prompt.label.replace(/-/g, '_'));
    });

    if (matchingImage) {
        mergedData.push({
            year: prompt.year,
            label: prompt.label, // e.g. "1980-blitz-kid..."
            title: prompt.tags[0] ? prompt.tags[0].replace(/-/g, ' ').toUpperCase() : 'UNKNOWN', // simplistic title
            wardrobe: prompt.MadeOutOf,
            image: `images/${matchingImage}`,
            id: `fit_${year}`
        });
    } else {
        console.warn(`No image found for year ${year}`);
    }
});

// Sort by year just in case
mergedData.sort((a, b) => a.year - b.year);

const fileContent = `// Auto-generated data file
const FIT_DATA = ${JSON.stringify(mergedData, null, 2)};
`;

fs.writeFileSync(outputPath, fileContent);
console.log(`Generated data.js with ${mergedData.length} entries.`);
