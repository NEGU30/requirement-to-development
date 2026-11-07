'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  schemaVersion: 1,
  paths: {
    workspace: '个人',
    team: 'team',
    artifacts: {
      analysis: 'RequirementAnalysis',
      design: 'DesignDecisions',
      visual: 'VisualMockups',
      prd: 'PRD',
      review: 'ReviewLogs',
      logs: 'RequirementLogs',
      retro: 'Retrospectives',
    },
  },
  stages: [
    { key: 'analysis', index: 0, label: '需求分析' },
    { key: 'brainstorming', index: 1, label: '需求推演' },
    { key: 'visual', index: 2, label: '需求可视化' },
    { key: 'prd', index: 3, label: 'PRD 生成' },
    { key: 'review', index: 4, label: '需求评审' },
    { key: 'retro', index: 5, label: '需求复盘' },
    { key: 'finalized', index: 6, label: '已定稿' },
  ],
  review: { fullReviewers: 5, incrementalReviewers: 5, lightReviewers: 3 },
  prd: { minChars: 1500, maxChars: 5000, requiredSections: [] },
};

function projectRoot(input) {
  return (
    process.env.CLAUDE_PROJECT_DIR ||
    (input && input.cwd) ||
    process.env.CLAUDE_PLUGIN_ROOT ||
    process.cwd()
  );
}

function normalizePath(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
}

function loadConfig(root) {
  const candidates = [
    path.join(root, '.claude', 'reqflow', 'config.json'),
    path.join(root, 'reqflow', 'config.json'),
  ];
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (pluginRoot) candidates.push(path.join(pluginRoot, 'reqflow', 'config.json'));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        paths: { ...DEFAULT_CONFIG.paths, ...(parsed.paths || {}) },
        review: { ...DEFAULT_CONFIG.review, ...(parsed.review || {}) },
        prd: { ...DEFAULT_CONFIG.prd, ...(parsed.prd || {}) },
      };
    } catch {
      // Try the next location.
    }
  }
  return DEFAULT_CONFIG;
}

function stageByKey(config, key) {
  return (config.stages || DEFAULT_CONFIG.stages).find((s) => s.key === key) || null;
}

function stageByIndex(config, index) {
  return (config.stages || DEFAULT_CONFIG.stages).find((s) => s.index === Number(index)) || null;
}

function parseArtifactPath(filePath, config, root) {
  const normalized = normalizePath(filePath);
  const workspace = config.paths.workspace;
  const marker = '/' + workspace + '/';
  let prefix = '';
  let rest;

  const markerIndex = normalized.indexOf(marker);
  if (markerIndex !== -1) {
    prefix = normalized.slice(0, markerIndex);
    rest = normalized.slice(markerIndex + marker.length).split('/').filter(Boolean);
  } else if (normalized.startsWith(workspace + '/')) {
    rest = normalized.slice(workspace.length + 1).split('/').filter(Boolean);
  } else {
    return null;
  }
  if (rest.length < 4) return null;

  const [author, module, feature, artifactDir] = rest;
  const artifact = Object.entries(config.paths.artifacts).find(
    ([, dir]) => dir === artifactDir
  )?.[0];
  if (!artifact) return null;

  const rootPath = `${workspace}/${[author, module, feature].join('/')}`;
  const featureRoot = prefix ? `${prefix.replace(/\/$/, '')}/${rootPath}` : rootPath;

  return {
    author,
    module,
    feature,
    artifact,
    artifactDir,
    featureRoot: featureRoot.replace(/\/$/, ''),
    normalized,
    absoluteFeatureRoot: path.resolve(root, featureRoot),
  };
}

function stateFile(featureRoot) {
  return path.join(featureRoot, 'RequirementLogs', 'state.json');
}

function legacyLogFile(featureRoot) {
  const dir = path.join(featureRoot, 'RequirementLogs');
  try {
    return (
      fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('_流程记录.md'))
        .sort()
        .pop() || null
    );
  } catch {
    return null;
  }
}

function readState(featureRoot) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(featureRoot), 'utf8'));
  } catch {
    return null;
  }
}

function writeState(featureRoot, state) {
  const file = stateFile(featureRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n', 'utf8');
  return file;
}

function findStateFiles(root, config) {
  const workspace = path.join(root, config.paths.workspace);
  const found = [];
  let authors = [];
  try {
    authors = fs.readdirSync(workspace, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return found;
  }

  for (const author of authors) {
    const authorDir = path.join(workspace, author.name);
    let modules = [];
    try {
      modules = fs.readdirSync(authorDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    } catch {
      continue;
    }
    for (const moduleDir of modules) {
      const modulePath = path.join(authorDir, moduleDir.name);
      let features = [];
      try {
        features = fs.readdirSync(modulePath, { withFileTypes: true }).filter((d) => d.isDirectory());
      } catch {
        continue;
      }
      for (const feature of features) {
        const featureRoot = path.join(modulePath, feature.name);
        const file = stateFile(featureRoot);
        try {
          const stat = fs.statSync(file);
          found.push({ featureRoot, file, mtimeMs: stat.mtimeMs });
        } catch {
          const legacy = legacyLogFile(featureRoot);
          if (legacy) {
            const legacyPath = path.join(featureRoot, 'RequirementLogs', legacy);
            try {
              found.push({
                featureRoot,
                file: legacyPath,
                mtimeMs: fs.statSync(legacyPath).mtimeMs,
                legacy: true,
              });
            } catch {
              // Ignore unreadable legacy logs.
            }
          }
        }
      }
    }
  }
  return found.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function isFinalized(featureRoot) {
  return fs.existsSync(path.join(featureRoot, 'RequirementLogs', '.finalized'));
}

function hasRealFiles(dir, options = {}) {
  const minBytes = options.minBytes ?? 30;
  const extensions = options.extensions || ['.md', '.html'];
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
      .some((entry) => {
        if (!extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) return false;
        try {
          return fs.statSync(path.join(dir, entry.name)).size >= minBytes;
        } catch {
          return false;
        }
      });
  } catch {
    return false;
  }
}

function artifactHasContent(featureRoot, artifactDir, options) {
  return hasRealFiles(path.join(featureRoot, artifactDir), options);
}

function statFingerprint(file) {
  try {
    const stat = fs.statSync(file);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return '';
  }
}

function stripFrontmatter(text) {
  return String(text || '').replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
}

function countChars(text) {
  return Array.from(String(text || '').replace(/\s/g, '')).length;
}

function parseLegacyStage(logFile, config) {
  let text = '';
  try {
    text = fs.readFileSync(logFile, 'utf8');
  } catch {
    return null;
  }

  // Prefer explicit stage lines such as "阶段 2 可视化 → ...".
  const stageLines = [...text.matchAll(/阶段\s*([0-6])\s*([^\n→]*)/g)];
  if (stageLines.length) {
    const last = stageLines[stageLines.length - 1];
    const stage = stageByIndex(config, Number(last[1]));
    if (stage) return { stage: stage.key, label: stage.label, round: null, legacy: true };
  }

  const current = text.match(/当前阶段\s*[:：]\s*([^\n]+)/g);
  if (current && current.length) {
    const raw = current[current.length - 1].replace(/^当前阶段\s*[:：]\s*/, '').trim();
    const matched = (config.stages || []).find((s) => raw.includes(s.label));
    if (matched) return { stage: matched.key, label: matched.label, round: null, legacy: true };
  }
  return null;
}

function readJsonInput(input) {
  try {
    return JSON.parse(input || '{}');
  } catch {
    return {};
  }
}

function print(message) {
  if (message) process.stdout.write(String(message).replace(/\s+$/, '') + '\n');
}

function warn(message) {
  if (message) process.stderr.write(String(message).replace(/\s+$/, '') + '\n');
}

module.exports = {
  DEFAULT_CONFIG,
  artifactHasContent,
  countChars,
  findStateFiles,
  hasRealFiles,
  isFinalized,
  legacyLogFile,
  loadConfig,
  normalizePath,
  parseArtifactPath,
  parseLegacyStage,
  print,
  projectRoot,
  readJsonInput,
  readState,
  stageByIndex,
  stageByKey,
  stateFile,
  statFingerprint,
  stripFrontmatter,
  warn,
  writeState,
};
