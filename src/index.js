#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { parse } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import { generateDockerfile } from './templates/dockerfile.js';
import { generateDockerCompose } from './templates/dockerCompose.js';
import { promptForMigrations, promptForDatabase } from './utils/prompts.js';
import { updateEnvFile } from './utils/envUpdater.js';
import { generateEntrypoint } from './templates/entrypoint.js';

// Display welcome message
console.log(boxen(
    chalk.blue.bold('LaraShip 🚢 - Docker Generator'),
    {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
    }
));

function generateMigrationCommands(migrationConfig, isProduction) {
    let commands = [];
    
    if (migrationConfig.runMigrations) {
        if (!isProduction || migrationConfig.confirmMigrations) {
            commands.push('php artisan migrate --force');
        }
    }
    
    if (migrationConfig.runSeeder) {
        if (!isProduction || migrationConfig.confirmSeeders) {
            commands.push('php artisan db:seed --force');
        }
    }
    
    return commands.length > 0 ? commands.join(' && ') : null;
}

export async function main() {
    let spinner = ora();
    
    try {
        // Check for Laravel project
        spinner.start('Checking project structure');
        if (!existsSync('composer.json') || !existsSync('.env')) {
            throw new Error('Not a Laravel project or missing .env file');
        }
        spinner.succeed('Project structure validated');

        // Read environment
        spinner.start('Reading environment configuration');
        const envContent = readFileSync('.env', 'utf8');
        const envVars = parse(envContent);
        const isProduction = envVars.APP_ENV === 'production';
        spinner.succeed('Environment configuration loaded');
        
        if (isProduction) {
            console.log(boxen(
                chalk.yellow.bold('⚠️  Production Environment Detected\n\n') +
                chalk.white('You are running in a production environment.\n') +
                chalk.white('Additional confirmation will be required for:\n\n'),
                { 
                    padding: 1,
                    margin: { top: 1, bottom: 1 },
                    borderStyle: 'round',
                    borderColor: 'yellow',
                    width: 60,
                    textAlignment: 'center'
                }
            ));
        }

        // Get migration preferences and database configuration
        const migrationConfig = await promptForMigrations(isProduction);
        const dbConfig = await promptForDatabase();
        const config = { ...migrationConfig, ...dbConfig };

        // Update .env file if using new database
        if (dbConfig.databaseSetup === 'new') {
            spinner.start('Updating environment configuration');
            updateEnvFile(dbConfig);
            spinner.succeed('Environment configuration updated');
        }

        const migrationCommands = generateMigrationCommands(migrationConfig, isProduction);

        // Generate files
        spinner.start('Generating Dockerfile');
        writeFileSync('Dockerfile', generateDockerfile(migrationCommands));
        spinner.succeed();

        spinner.start('Generating docker-compose.yml');
        const { content, ports } = generateDockerCompose(envContent, config);
        writeFileSync('docker-compose.yml', content);
        spinner.succeed();

        console.log(boxen(
            chalk.green.bold('Success! 🎉\n\n') +
            chalk.white('Generated files:\n') +
            chalk.cyan('- Dockerfile\n') +
            chalk.cyan('- docker-compose.yml') +
            (dbConfig?.databaseSetup === 'new' ? chalk.white(`\n\nMySQL will be available on port ${ports.mysql}`) : ''),
            chalk.cyan('- Updated .env'),
            { 
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'green'
            }
        ));

    } catch (error) {
        spinner.fail(chalk.red('Error: ' + error.message));
        process.exit(1);
    }
} 