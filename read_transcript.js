const fs = require('fs'); 
const lines = fs.readFileSync('C:/Users/tranc/.gemini/antigravity-ide/brain/8411712f-aec8-4c1b-bc87-626f0da11ed7/.system_generated/logs/transcript.jsonl', 'utf-8').split('\n'); 
let found = false; 
for (let i = 0; i < lines.length; i++) { 
  if (lines[i].includes('step_index":1902')) found = true; 
  if (found) { 
    console.log(lines[i]); 
    if (lines[i].includes('bảng này')) break; 
  } 
}
