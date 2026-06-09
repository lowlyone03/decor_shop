const fs = require('fs');
const transcript = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/f7a63a41-e4cc-4afa-a473-80059ce7e91d/.system_generated/logs/transcript.jsonl', 'utf8');

const lines = transcript.split('\n');
for (const line of lines) {
    try {
        const data = JSON.parse(line);
        if (data.tool_calls) {
            for (const call of data.tool_calls) {
                if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content' || call.name === 'write_to_file') {
                    const args = call.args || {};
                    const file = args.TargetFile || args.AbsolutePath || '';
                    if (file.includes('adminController.js') && JSON.stringify(args).includes('getReports')) {
                        console.log(JSON.stringify(call, null, 2));
                    }
                }
            }
        }
    } catch(e) {}
}
