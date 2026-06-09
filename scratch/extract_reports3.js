const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/f7a63a41-e4cc-4afa-a473-80059ce7e91d/.system_generated/logs/transcript.jsonl', 'utf8');

const lines = transcript.split('\n');
for (const line of lines) {
    if (line.includes('getReports') && line.includes('function')) {
        console.log("FOUND!");
    }
}
