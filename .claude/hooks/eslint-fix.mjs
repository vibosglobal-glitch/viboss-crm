import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { resolve } from 'path';

let input = '';
const rl = createInterface({ input: process.stdin });
rl.on('line', line => (input += line));
rl.on('close', () => {
  try {
    const j = JSON.parse(input);
    const f = j?.tool_input?.file_path || j?.tool_response?.filePath || '';
    if (!f || !/\.(ts|tsx|js|jsx)$/.test(f)) process.exit(0);

    const abs = resolve(f);
    try {
      const out = execSync(`npx eslint ${JSON.stringify(abs)} --fix 2>&1`, {
        encoding: 'utf8',
        cwd: process.env.PWD || process.cwd(),
      });
      if (out.trim()) {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `ESLint (auto-fixed what it could):\n${out.trim()}`,
          },
        }));
      }
    } catch (e) {
      const out = (e.stdout || '') + (e.stderr || '');
      if (out.trim()) {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `ESLint issues remain in ${f}:\n${out.trim()}`,
          },
        }));
      }
    }
  } catch { /* ignore parse errors */ }
  process.exit(0);
});
