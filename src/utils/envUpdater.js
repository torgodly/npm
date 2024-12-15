import { readFileSync, writeFileSync } from 'fs';

export function updateEnvFile(dbConfig) {
    if (dbConfig.databaseSetup !== 'new') return;

    const envContent = readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    
    const updatedLines = lines.map(line => {
        if (line.startsWith('DB_HOST=')) return 'DB_HOST=db';
        if (line.startsWith('DB_DATABASE=')) return `DB_DATABASE=${dbConfig.dbName}`;
        if (line.startsWith('DB_USERNAME=')) return `DB_USERNAME=${dbConfig.dbUser}`;
        if (line.startsWith('DB_PASSWORD=')) return `DB_PASSWORD=${dbConfig.dbPassword}`;
        return line;
    });

    writeFileSync('.env', updatedLines.join('\n'));
} 