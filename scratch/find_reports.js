const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/943e4c77-319a-40f0-a5f5-1d6e0fd33364/.system_generated/logs/transcript.jsonl', 'utf8');

const lines = transcript.split('\n');
for (const line of lines) {
    if (line.includes('exports.getReports = async')) {
        console.log("FOUND!");
        try {
            const data = JSON.parse(line);
            console.log(JSON.stringify(data.tool_calls, null, 2));
        } catch(e) {}
    }
}
