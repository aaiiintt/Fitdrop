const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'prompts_v3.json');
const SHOOT_CONFIG_FILE = path.join(__dirname, 'shoot_config.json');
const PROMPTS_CLEAN_FILE = path.join(__dirname, 'prompts_clean.json');

const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// 1. Extract Shoot Config from global_settings
const shootConfig = data.global_settings.photography_setup;

// Also extract reference config as it is global now
const referenceConfig = data.global_settings.reference_config;

fs.writeFileSync(SHOOT_CONFIG_FILE, JSON.stringify(shootConfig, null, 2));
console.log(`Created ${SHOOT_CONFIG_FILE}`);

// 2. Clean Prompts
// The new schema has "looks" instead of "prompts"
const cleanData = {
    project: data.project,
    version: data.version,
    methodology: data.methodology,
    reference_config: referenceConfig, // Ensure this is preserved for generator
    prompts: data.looks.map(look => {
        // Create a copy of the look object
        const cleanLook = { ...look };

        // Remove fields that are overridden by global shoot config
        delete cleanLook.Background;
        delete cleanLook.Lighting;
        delete cleanLook.Camera;
        delete cleanLook.OutputStyle;

        return cleanLook;
    })
};

fs.writeFileSync(PROMPTS_CLEAN_FILE, JSON.stringify(cleanData, null, 2));
console.log(`Created ${PROMPTS_CLEAN_FILE} with ${cleanData.prompts.length} structured looks.`);
