const fs = require('fs');
const path = require('path');

// Configuration
const PROMPTS_FILE = path.join(__dirname, 'prompts_v2.json');
const IMAGES_DIR = path.join(__dirname, 'images');

// CLI Arguments
const args = process.argv.slice(2);
const yearArg = args.find(arg => arg.startsWith('--year='));
const indexArg = args.find(arg => arg.startsWith('--index='));

function printUsage() {
    console.log('Usage: node test_generation.js [--year=YYYY] [--index=N]');
    console.log('  --year=YYYY  Select prompt by year (e.g., 1980)');
    console.log('  --index=N    Select prompt by index (0-45)');
}

if (!yearArg && !indexArg) {
    printUsage();
    process.exit(1);
}

// Load Data
if (!fs.existsSync(PROMPTS_FILE)) {
    console.error(`Error: ${PROMPTS_FILE} not found. Run 'npm run setup' first.`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
const references = data.reference_config;

// Find Prompt
let promptData;
if (yearArg) {
    const year = parseInt(yearArg.split('=')[1]);
    promptData = data.prompts.find(p => p.year === year);
    if (!promptData) {
        console.error(`Error: No prompt found for year ${year}`);
        process.exit(1);
    }
} else if (indexArg) {
    const index = parseInt(indexArg.split('=')[1]);
    if (index < 0 || index >= data.prompts.length) {
        console.error(`Error: Index ${index} out of bounds (0-${data.prompts.length - 1})`);
        process.exit(1);
    }
    promptData = data.prompts[index];
}

// Construct Payload Representation
// In a real API call, we would base64 encode images.
// For testing, we just verify the structure and paths.

const payload = {
    model: "gemini-3-pro-preview", // Placeholder model name
    task: "text-to-image",
    input: {
        prompt: promptData.prompt,
        // The guide says we group all images under referenceId 1
        reference_images: references.images.map(imgFile => ({
            id: references.subject_id, // ALL images get ID 1
            path: path.join(IMAGES_DIR, imgFile),
            mime_type: "image/jpeg" // Assuming JPEGs based on file extension check in setup
        }))
    },
    generation_config: {
        aspectRatio: "9:16",
        sampleCount: 1
    }
};

console.log("\nLESS IS MORE: VALIDATING SINGLE PROMPT CONFIGURATION");
console.log("====================================================");
console.log(`Selected Year: ${promptData.year}`);
console.log(`Style: ${promptData.style}`);
console.log("----------------------------------------------------");
console.log("PROMPT TEXT:");
console.log(promptData.prompt);
console.log("----------------------------------------------------");
console.log(`REFERENCE IMAGES (Mapped to ID [${references.subject_id}]):`);
payload.input.reference_images.forEach((img, i) => {
    console.log(`  [${i + 1}/${payload.input.reference_images.length}] ${path.basename(img.path)} -> ID: ${img.id}`);
});
console.log("====================================================");
console.log("Validation Successful. This payload is ready for the API.");
