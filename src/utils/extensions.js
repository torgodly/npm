import { readFileSync } from 'fs';
import ora from 'ora';

export function getRequiredExtensions() {
    const spinner = ora('Scanning for required PHP extensions...').start();
    const composerJson = JSON.parse(readFileSync('composer.json', 'utf8'));
    const extensions = [];
    
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