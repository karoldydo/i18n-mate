#!/usr/bin/env node

import dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

// load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
dotenv.config({ path: join(projectRoot, '.env') });

// colors for terminal output
const colors = {
  blue: '\x1b[34m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
};

const log = {
  error: (msg) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.bright}${colors.blue}→${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

/**
 * Prompt user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} - User's response (true for yes, false for no)
 */
function askConfirmation(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
    });
  });
}

/**
 * Execute a command and return the output
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 * @returns {{ success: boolean; output: string; error?: string }}
 */
function executeCommand(command, options = {}) {
  const { cwd = projectRoot, silent = false } = options;

  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { output: output?.trim() || '', success: true };
  } catch (error) {
    const errorMessage = error.message || String(error);
    return { error: errorMessage, output: error.stdout?.toString() || '', success: false };
  }
}

/**
 * Main function
 */
async function main() {
  const projectRefs = process.env.SUPABASE_PROJECT_REFS;

  if (!projectRefs) {
    log.error('SUPABASE_PROJECT_REFS environment variable is not set');
    console.log('\nPlease add to your .env file:');
    console.log('SUPABASE_PROJECT_REFS=project_ref_1,project_ref_2');
    process.exit(1);
  }

  const refs = projectRefs
    .split(',')
    .map((ref) => ref.trim())
    .filter(Boolean);

  if (refs.length === 0) {
    log.error('No project references found in SUPABASE_PROJECT_REFS');
    process.exit(1);
  }

  log.info(`Found ${refs.length} project reference(s) to process`);

  const results = [];
  let processedCount = 0;

  // process projects sequentially, stopping on first error
  for (let i = 0; i < refs.length; i++) {
    const result = await processProject(refs[i], i, refs.length);
    results.push(result);
    processedCount++;

    // stop on first error (unless it was a user cancellation)
    if (!result.success) {
      const wasCancelled = result.steps.some((step) => step.name === 'confirmation' && step.error === 'User cancelled');

      if (!wasCancelled) {
        log.error(`Stopping due to error in project ${refs[i]}`);
        break;
      }
    }
  }

  printSummary(results, processedCount);

  // exit with error code if any project failed (excluding user cancellations)
  const hasFailures = results.some(
    (r) => !r.success && !r.steps.some((step) => step.name === 'confirmation' && step.error === 'User cancelled')
  );

  if (hasFailures) {
    process.exit(1);
  }
}

/**
 * Print summary of operations
 *
 * @param {Array} results - Array of project processing results
 * @param {number} processedCount - Number of projects processed
 */
function printSummary(results, processedCount) {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  results.forEach((result, index) => {
    const status = result.success ? colors.green : colors.red;
    const icon = result.success ? '✓' : '✗';
    console.log(`${status}${icon}${colors.reset} Project ${index + 1}: ${result.projectRef}`);

    if (!result.success) {
      result.steps.forEach((step) => {
        if (!step.success) {
          console.log(`  ${colors.red}  ✗${colors.reset} ${step.name}: ${step.error || 'Failed'}`);
        }
      });
    }
  });

  console.log(`\n${colors.bright}Processed:${colors.reset} ${processedCount} project(s)`);
  console.log(`${colors.green}Successful:${colors.reset} ${successful}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed:${colors.reset} ${failed}`);
  }
}

/**
 * Process a single Supabase project
 * @param {string} projectRef - Supabase project reference
 * @param {number} index - Project index (for display)
 * @param {number} total - Total number of projects
 * @returns {Promise<{ success: boolean; projectRef: string; steps: Array }>}
 */
async function processProject(projectRef, index, total) {
  const trimmedRef = projectRef.trim();
  const results = {
    projectRef: trimmedRef,
    steps: [],
    success: true,
  };

  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Project ${index + 1}/${total}: ${colors.cyan}${trimmedRef}${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  // ask for confirmation before processing
  const confirmed = await askConfirmation(
    `Do you want to reset the database for project "${trimmedRef}"? ${colors.red}WARNING: This will delete all data!${colors.reset}`
  );

  if (!confirmed) {
    log.warning(`Skipping project ${trimmedRef}`);
    results.success = false;
    results.steps.push({ error: 'User cancelled', name: 'confirmation', success: false });
    return results;
  }

  console.log(`\n${colors.bright}Processing project: ${colors.cyan}${trimmedRef}${colors.reset}\n`);

  // step 1: link project
  log.step(`Linking to project: ${trimmedRef}`);
  const linkResult = executeCommand(`npx supabase link --project-ref ${trimmedRef}`);
  if (!linkResult.success) {
    log.error(`Failed to link project: ${linkResult.error}`);
    results.success = false;
    results.steps.push({ error: linkResult.error, name: 'link', success: false });
    return results;
  }
  log.success('Project linked successfully');
  results.steps.push({ name: 'link', success: true });

  // step 2: reset database
  log.step('Resetting database');
  const resetResult = executeCommand('npx supabase db reset');
  if (!resetResult.success) {
    log.error(`Failed to reset database: ${resetResult.error}`);
    results.success = false;
    results.steps.push({ error: resetResult.error, name: 'reset', success: false });
    return results;
  }
  log.success('Database reset successfully');
  results.steps.push({ name: 'reset', success: true });

  return results;
}

// run main function
main().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
