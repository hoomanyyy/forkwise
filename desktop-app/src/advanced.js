/* Forkwise Desktop Advanced Feature Extension & Enhancements Module */
const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

function registerAdvancedFeatures(win, store) {
  // Advanced AI workspace context integration
  ipcMain.handle('fw:advanced:getContext', async () => {
    return {
      version: '3.2.0-bomb',
      theme: store.get('theme') || 'dark',
      roots: store.get('roots') || [],
      features: ['cursor-ai-mode', 'claude-code-integration', 'advanced-diff', 'terminal-multiplexer', 'mcp-servers']
    };
  });

  // Advanced code intelligence & diff inspection
  ipcMain.handle('fw:advanced:inspectWorkspace', async (event, folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) return { ok: false, error: 'Path not found' };
      const stats = fs.statSync(folderPath);
      if (!stats.isDirectory()) return { ok: false, error: 'Not a directory' };
      
      const files = [];
      function walk(dir, rel = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (['node_modules', '.git', 'dist', 'build', '.cache'].includes(entry.name)) continue;
          const relPath = path.join(rel, entry.name);
          if (entry.isDirectory()) {
            walk(path.join(dir, entry.name), relPath);
          } else {
            files.push({ name: entry.name, path: relPath, size: fs.statSync(path.join(dir, entry.name)).size });
          }
        }
      }
      walk(folderPath);
      return { ok: true, filesCount: files.length, files: files.slice(0, 100) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Prompt enhancement / Claude/Cursor style quick actions
  ipcMain.handle('fw:advanced:enhancePrompt', async (event, { prompt, mode }) => {
    let enhanced = prompt;
    if (mode === 'code') {
      enhanced = `[Code Expert Mode]: Please write clean, production-ready, well-tested code with error handling for: ${prompt}`;
    } else if (mode === 'debug') {
      enhanced = `[Debug Mode]: Analyze the potential bugs, edge cases, and performance bottlenecks in: ${prompt}`;
    } else if (mode === 'architecture') {
      enhanced = `[Architecture Mode]: Provide a robust, scalable system design and step-by-step implementation plan for: ${prompt}`;
    }
    return { ok: true, enhanced };
  });

  console.log('Forkwise Advanced Desktop Features Registered Successfully.');
}

module.exports = { registerAdvancedFeatures };
