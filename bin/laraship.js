#!/usr/bin/env node

import { main } from '../src/index.js';
import chalk from 'chalk';

main().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
}); 