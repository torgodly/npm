import inquirer from 'inquirer';
import chalk from 'chalk';

export async function promptForMigrations(isProduction) {
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

export async function promptForDatabase() {
    console.log('');
    
    const questions = [{
        type: 'list',
        name: 'databaseSetup',
        message: '🗄️  Database configuration:',
        choices: [
            { name: 'Use existing database server (from .env)', value: 'existing' },
            { name: 'Create new MySQL container', value: 'new' }
        ],
        default: 'new'
    },
    {
        type: 'input',
        name: 'dbName',
        message: 'Database name:',
        default: 'laravel',
        when: (answers) => answers.databaseSetup === 'new'
    },
    {
        type: 'input',
        name: 'dbUser',
        message: 'Database username:',
        default: 'laravel_user',
        when: (answers) => answers.databaseSetup === 'new'
    },
    {
        type: 'input',
        name: 'dbPassword',
        message: 'Set MySQL root password:',
        default: () => Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8),
        when: (answers) => answers.databaseSetup === 'new'
    }];

    return inquirer.prompt(questions);
} 