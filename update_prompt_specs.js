const fs = require('fs');
const path = require('path');

const PROMPTS_FILE = path.join(__dirname, 'prompts_v2.json');

// Load Data
const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
const setup = data.photography_setup;

// Construct the new specs string
// "Shot against [background]. [framing]. [lighting]. [camera_specs]."
const newSpecs = `Shot against ${setup.background}. ${setup.framing}. ${setup.lighting}. ${setup.camera_specs}.`;

console.log("New Spec String:");
console.log(newSpecs);
console.log("-----------------------------------");

let updatedCount = 0;

data.prompts = data.prompts.map(p => {
    // Find the split point
    const splitIndex = p.prompt.indexOf("Shot against");

    if (splitIndex === -1) {
        console.warn(`Warning: Could not find "Shot against" in prompt for year ${p.year}. Skipping update for this item.`);
        return p;
    }

    // Extract the character description (everything before "Shot against")
    // usage: "The man ... doing X. Shot against ..."
    // We want "The man ... doing X."
    const charDescription = p.prompt.substring(0, splitIndex).trim();

    // Combine
    const updatedPrompt = `${charDescription} ${newSpecs}`;

    updatedCount++;
    return {
        ...p,
        prompt: updatedPrompt
    };
});

// Write back
fs.writeFileSync(PROMPTS_FILE, JSON.stringify(data, null, 2));

console.log(`Updated ${updatedCount} prompts.`);
