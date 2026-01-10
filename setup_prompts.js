const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'prompts.json');
const OUTPUT_FILE = path.join(__dirname, 'prompts_v2.json');
const IMAGES_DIR = path.join(__dirname, 'images');

// Read the original prompts
const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
const data = JSON.parse(rawData);

// Get list of image files for the config
const imageFiles = fs.readdirSync(IMAGES_DIR)
    .filter(file => file !== '.DS_Store' && /\.(jpg|jpeg|png)$/i.test(file))
    .sort();

// Create the new structure
const newData = {
    project: data.project,
    photography_setup: data.photography_setup,
    reference_config: {
        note: "All images constrained to referenceId 1 for identity clustering",
        subject_id: 1,
        images: imageFiles
    },
    // Keep original subject reference for meta-context, but update it to mention the ID binding
    subject_reference: "The man from reference [$1] (originally: Man with black-framed glasses)",
    prompts: data.prompts.map(p => {
        // The core transformation
        let newPrompt = p.prompt.replace("A man with black-framed glasses", "The man from reference [$1]");
        
        // Safety check: ensure the replacement actually happened. 
        // If the phrase is slightly different (e.g. case), we might miss it.
        // We'll try a more robust regex if the string check fails, but the file looked consistent.
        if (newPrompt === p.prompt) {
             console.warn(`Warning: prompt for year ${p.year} was not updated. Checking for variations...`);
             // Fallback for case-insensitivity or slight variations if needed
             newPrompt = p.prompt.replace(/A man with black-framed glasses/i, "The man from reference [$1]");
        }

        return {
            year: p.year,
            style: p.style,
            pose: p.pose,
            prompt: newPrompt
        };
    })
};

// Write the new file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(newData, null, 2));

console.log(`Successfully created ${OUTPUT_FILE}`);
console.log(`Processed ${newData.prompts.length} prompts.`);
console.log(`Mapped ${imageFiles.length} images to referenceId 1.`);
