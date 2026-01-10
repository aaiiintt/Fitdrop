require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const PROMPTS_FILE = path.join(__dirname, '../data/prompts.json');
const SHOOT_CONFIG_FILE = path.join(__dirname, '../data/shoot_config.json');
const IMAGES_DIR = path.join(__dirname, '../data/reference_poses');
const OUTPUT_DIR = path.join(__dirname, '../generated/raw');
const MODEL_NAME = "gemini-3-pro-image-preview";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// CLI Arguments
const args = process.argv.slice(2);
const yearArg = args.find(arg => arg.startsWith('--year='));
const dryRun = args.includes('--dry-run');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// Load Data
if (!fs.existsSync(PROMPTS_FILE)) {
    console.error(`Error: ${PROMPTS_FILE} not found.`);
    process.exit(1);
}

const promptsData = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));

// Load Shoot Config
let shootConfig = {};
if (fs.existsSync(SHOOT_CONFIG_FILE)) {
    shootConfig = JSON.parse(fs.readFileSync(SHOOT_CONFIG_FILE, 'utf8'));
} else {
    console.warn("Warning: shoot_config.json not found. Using default/empty config.");
}

// Construct Shoot String
// Map new schema fields to a description string
const shootString = [
    shootConfig.background,
    shootConfig.lighting_setup, // Note: v2 uses lighting_setup not lighting
    shootConfig.framing,
    shootConfig.camera_position // Note: v2 uses camera_position not camera_specs
].filter(Boolean).join('. ') + '.';

const references = promptsData.reference_config;

// Filter Prompts (now "looks")
let promptsToProcess = promptsData.prompts; // Refactor script mapped looks -> prompts
if (yearArg) {
    const year = parseInt(yearArg.split('=')[1]);
    promptsToProcess = promptsToProcess.filter(p => p.year === year);
}

if (!API_KEY && !dryRun) {
    console.error("Error: GEMINI_API_KEY not found in .env file.");
    process.exit(1);
}

async function generateImage(lookData) {
    // Determine style name from label or tags if style field missing (v2 schema)
    const styleName = lookData.style || lookData.label || `style_${lookData.year}`;
    const outputFilename = `${lookData.year}_${styleName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    if (fs.existsSync(outputPath) && !yearArg) {
        console.log(`Skipping ${lookData.year}: Image already exists.`);
        return;
    }

    console.log(`Processing ${lookData.year}: ${styleName}...`);

    // Dynamic Prompt Construction from Structured Data
    // 1. Subject
    const subjectText = Array.isArray(lookData.Subject) ? lookData.Subject.join(", ") : lookData.Subject;

    // 2. MadeOutOf (The outfit)
    const outfitText = Array.isArray(lookData.MadeOutOf) ?
        `Wearing: ${lookData.MadeOutOf.join(", ")}` :
        `Wearing: ${lookData.MadeOutOf}`;

    // 3. Arrangement (Pose)
    const poseText = lookData.Arrangement;

    // 4. Accessories
    let accessoriesText = "";
    if (lookData.Accessories && lookData.Accessories.length > 0) {
        accessoriesText = `Accessories: ${lookData.Accessories.join(", ")}.`;
    }

    // Combine all parts
    const subjectPrompt = `${subjectText}. ${outfitText}. ${poseText}. ${accessoriesText}`;
    const fullPrompt = `${subjectPrompt} ${shootString}`;

    // Construct Payload
    const payload = {
        model: MODEL_NAME,
        contents: [{
            parts: [
                { text: fullPrompt + " (generate in 9:16 portrait aspect ratio)" },
                ...references.images.map(imgFile => {
                    const filePath = path.join(IMAGES_DIR, imgFile);
                    const fileData = fs.readFileSync(filePath).toString('base64');
                    return {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: fileData
                        }
                    };
                })
            ]
        }],
    };

    if (dryRun) {
        console.log(`[Dry Run] Would generate for ${lookData.year}`);
        console.log(`[Dry Run] Full Prompt: ${fullPrompt}`);
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        let imageBase64;

        if (result.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data) {
            imageBase64 = result.candidates[0].content.parts[0].inline_data.data;
        } else if (result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            imageBase64 = result.candidates[0].content.parts[0].inlineData.data;
        } else if (result.candidates && result.candidates[0].output) {
            imageBase64 = result.candidates[0].output;
        } else {
            console.error("Unexpected response structure:", JSON.stringify(result, null, 2));
            return;
        }

        fs.writeFileSync(outputPath, imageBase64, 'base64');
        console.log(`Saved to ${outputFilename}`);

    } catch (error) {
        console.error(`Failed to generate ${lookData.year}:`, error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
}

async function main() {
    console.log(`Starting generation for ${promptsToProcess.length} looks...`);
    for (const item of promptsToProcess) {
        await generateImage(item);
    }
    console.log("Done.");
}

main();
