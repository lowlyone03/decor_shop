const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/f7a63a41-e4cc-4afa-a473-80059ce7e91d/.system_generated/logs/transcript.jsonl', 'utf8');

const lines = transcript.split('\n');
for (const line of lines) {
    if (line.includes('exports.getReports = async') && line.includes('replace_file_content')) {
        console.log("FOUND getReports code!");
        try {
            const data = JSON.parse(line);
            console.log(JSON.stringify(data.tool_calls, null, 2));
        } catch(e) {}
    }
}
