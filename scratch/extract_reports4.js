const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/f7a63a41-e4cc-4afa-a473-80059ce7e91d/.system_generated/logs/transcript.jsonl', 'utf8');

const lines = transcript.split('\n');
for (const line of lines) {
    if (line.includes('getReports')) {
        try {
            const data = JSON.parse(line);
            if (data.tool_calls) {
                const call = data.tool_calls.find(c => c.name === 'write_to_file' || c.name === 'replace_file_content' || c.name === 'multi_replace_file_content');
                if (call && JSON.stringify(call).includes('getReports')) {
                    console.log(JSON.stringify(call, null, 2));
                }
            }
        } catch(e) {}
    }
}
