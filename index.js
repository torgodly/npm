#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { parse } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import { DockerfileGenerator } from './templates/dockerfile.js';

// Display welcome message with custom box
console.log(boxen(
    chalk.blue.bold('LaraShip 🚢 - Docker Generator'),
    {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
    }
));

function checkLaravelProject() {
    const spinner = ora('Validating project structure...').start();

    // Check for composer.json
    if (!existsSync('composer.json')) {
        spinner.fail('composer.json not found. Are you in a Laravel project directory?');
        console.error('Error: composer.json not found. Are you in a Laravel project directory?');
        process.exit(1);
    }

    // Check for .env file
    if (!existsSync('.env')) {
        spinner.fail('.env file not found');
        console.error('Error: .env file not found');
        process.exit(1);
    }

    spinner.succeed('Project structure validated');
}

function getPhpVersion() {
    const spinner = ora('Detecting PHP version...').start();
    const composerJson = JSON.parse(readFileSync('composer.json', 'utf8'));
    const phpRequirement = composerJson.require.php;
    
    // Handle different PHP version formats
    let version;
    
    if (!phpRequirement) {
        spinner.warn('No PHP version specified in composer.json, using default 8.3');
        return '8.3';
    }

    // Handle different version formats
    if (phpRequirement.includes('|')) {
        // Handle multiple versions like "^7.3|^8.0"
        const versions = phpRequirement.split('|');
        version = versions[0].match(/\d+\.\d+/)[0];
    } else {
        // Handle single version constraints
        const match = phpRequirement.match(/(\d+\.\d+)/);
        version = match ? match[1] : '8.3';
    }

    // Validate if serversideup/php supports this version
    const supportedVersions = ['7.3', '7.4', '8.0', '8.1', '8.2', '8.3'];
    if (!supportedVersions.includes(version)) {
        spinner.warn(`PHP ${version} detected but not supported. Using closest supported version.`);
        // Find closest supported version
        const versionNum = parseFloat(version);
        version = supportedVersions.reduce((prev, curr) => {
            return Math.abs(parseFloat(curr) - versionNum) < Math.abs(parseFloat(prev) - versionNum) ? curr : prev;
        });
    }

    spinner.succeed(`PHP version ${version} detected`);
    return version;
}

function getRequiredExtensions() {
    const spinner = ora('Scanning for required PHP extensions...').start();
    const composerJson = JSON.parse(readFileSync('composer.json', 'utf8'));
    const extensions = [];
    
    // Check common PHP extensions in require section
    const requirements = composerJson.require || {};
    for (const [pkg, version] of Object.entries(requirements)) {
        if (pkg.startsWith('ext-')) {
            extensions.push(pkg.replace('ext-', ''));
        }
    }
    
    if (extensions.length > 0) {
        spinner.succeed(`Found ${extensions.length} required PHP extensions`);
    } else {
        spinner.info('No additional PHP extensions required');
    }
    return extensions;
}

async function promptForMigrations(isProduction) {
    // Add a small spacing before prompts
    console.log('');

    const questions = [{
        type: 'confirm',
        name: 'runMigrations',
        message: '📦 Run database migrations after container build?',
        default: !isProduction,
    },
    {
        type: 'confirm',
        name: 'confirmMigrations',
        message: chalk.yellow('⚠️  WARNING: You are in production environment. Are you sure you want to run migrations?'),
        default: false,
        when: (answers) => isProduction && answers.runMigrations
    },
    {
        type: 'confirm',
        name: 'runSeeder',
        message: '🌱 Run database seeders after migrations?',
        default: !isProduction,
        when: () => true,
    },
    {
        type: 'confirm',
        name: 'confirmSeeders',
        message: chalk.yellow('⚠️  WARNING: You are in production environment. Are you sure you want to run seeders?'),
        default: false,
        when: (answers) => isProduction && answers.runSeeder,
    }];

    return inquirer.prompt(questions);
}

function generateDockerComposeCommands(migrationConfig, isProduction) {
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
    
    if (commands.length > 0) {
        return commands.join(' && ');
    }
    
    return null;
}

function generateDockerCompose(envContent, migrationCommands = null) {
    // Parse the raw env content while preserving empty lines and comments
    const lines = envContent.split('\n');
    
    // First, find APP_NAME for naming containers
    const appName = lines
        .find(line => line.startsWith('APP_NAME='))
        ?.split('=')[1]
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        || 'laravel';
    
    const environmentSection = lines
        .map(line => {
            // Skip comments
            if (line.startsWith('#')) return '';
            
            // Preserve empty lines
            if (line.trim() === '') return '';
            
            // Convert env var to docker-compose format
            const [key, ...valueParts] = line.split('=');
            if (!key || !valueParts.length) return '';
            
            const value = valueParts.join('='); // Rejoin in case value contains =
            return `            - ${key}=${value}`;
        })
        .filter(line => line !== null)
        .join('\n');

    return `version: '3.8'

services:
    app:
        build:
            context: .
            dockerfile: Dockerfile
        image: ${appName}
        container_name: ${appName}-container
        restart: unless-stopped
        working_dir: /var/www/html
        volumes:
            - .:/var/www/html
        environment:
${environmentSection}
        networks:
            - app-network
        ${migrationCommands ? `command: sh -c "${migrationCommands}"` : ''}

networks:
    app-network:
        driver: bridge
`;
}

async function main() {
    try {
        let spinner = ora();
        
        // Start spinner with initial text
        spinner = ora('Checking project structure').start();

        checkLaravelProject();
        
        spinner.succeed('Project structure validated');

        spinner.start('Reading environment configuration');
        const phpVersion = getPhpVersion();
        const extensions = getRequiredExtensions();
        
        const envContent = readFileSync('.env', 'utf8');
        spinner.succeed('Environment configuration loaded');

        // Parse env content to check for APP_ENV
        const envVars = parse(envContent);
        const isProduction = envVars.APP_ENV === 'production';
        
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

        // Prompt for migrations and seeding
        const migrationConfig = await promptForMigrations(isProduction);
        const migrationCommands = generateDockerComposeCommands(migrationConfig, isProduction);

        // Generate Dockerfile
        spinner.start('Generating Dockerfile');
        const dockerfileGenerator = new DockerfileGenerator();
        const dockerfileContent = dockerfileGenerator.generate(phpVersion, extensions);
        writeFileSync('Dockerfile', dockerfileContent);
        spinner.succeed();

        // Generate docker-compose.yml
        spinner.start('Generating docker-compose.yml');
        const dockerComposeContent = generateDockerCompose(envContent, migrationCommands);
        writeFileSync('docker-compose.yml', dockerComposeContent);
        spinner.succeed();

        console.log(boxen(
            chalk.green.bold('Success! 🎉\n\n') +
            chalk.white('Generated files:\n') +
            chalk.cyan('- Dockerfile\n') +
            chalk.cyan('- docker-compose.yml\n\n') +
            chalk.yellow.bold('Next steps:\n\n') +
            chalk.white('Review the generated files and customize them as needed.'),
            { 
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'green'
            }
        ));

    } catch (error) {
        if (spinner) spinner.fail(chalk.red('Error: ' + error.message));
        else console.error(chalk.red('\n❌ Error:'), error.message);
        process.exit(1);
    }
}

main().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
}); 