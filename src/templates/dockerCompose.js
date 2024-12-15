export const generateDockerCompose = (envContent, dbConfig = null) => {
    const lines = envContent.split('\n');
    
    // Get APP_URL from env
    const appUrl = lines.find(line => line.startsWith('APP_URL='))?.split('=')[1] || 'http://localhost';

    // Preserve exact formatting from .env
    const environmentSection = lines
        .map(line => {
            // Skip empty lines and comments but preserve their position
            if (line.startsWith('#') || line.trim() === '') {
                return '            ';  // Preserve empty line with correct indentation
            }
            
            const [key, ...valueParts] = line.split('=');
            if (!key || !valueParts.length) return '            ';
            
            // Skip DB related vars as we'll add them later in the correct position
            if (line.startsWith('DB_')) return null;
            
            const value = valueParts.join('=');
            // If it's a URL-related var, we'll handle it separately
            if (key === 'APP_URL' || key === 'ASSET_URL' || key === 'VITE_APP_URL') {
                return null;
            }
            
            return `            - ${key}=${value}`;
        })
        .map(line => line === null ? null : line)  // Preserve nulls for filtering
        .join('\n');

    // Find the position of the first DB_ line to insert our DB config
    const dbLineIndex = lines.findIndex(line => line.startsWith('DB_'));
    const envLines = environmentSection.split('\n');
    
    // Insert DB config at the correct position
    const dbEnvConfig = dbConfig?.databaseSetup === 'new' ? `
            - DB_CONNECTION=mysql
            - DB_HOST=mysql
            - DB_PORT=3306
            - DB_DATABASE='${dbConfig.dbName}'
            - DB_USERNAME='${dbConfig.dbUser}'
            - DB_PASSWORD='${dbConfig.dbPassword}'` : `
            - DB_CONNECTION=sqlite`;

    // Insert URL configs at the APP_URL position
    const urlLineIndex = lines.findIndex(line => line.startsWith('APP_URL='));
    const urlConfig = `
            - APP_URL=${appUrl}
            - ASSET_URL=${appUrl}
            - VITE_APP_URL=${appUrl}`;

    // Combine all parts maintaining original order
    const finalEnvSection = [
        ...envLines.slice(0, urlLineIndex),
        urlConfig,
        ...envLines.slice(urlLineIndex + 1, dbLineIndex),
        dbEnvConfig,
        ...envLines.slice(dbLineIndex + 6)  // Skip original DB lines
    ].join('\n');

    // Generate a random port for MySQL between 3307 and 3399
    const mysqlPort = Math.floor(Math.random() * (3399 - 3307) + 3307);

    const dbService = dbConfig?.databaseSetup === 'new' ? `
    mysql:
        image: mysql:8.0
        container_name: laravel-mysql
        restart: unless-stopped
        environment:
            MYSQL_ROOT_PASSWORD: '${dbConfig.dbPassword}'
            MYSQL_DATABASE: '${dbConfig.dbName}'
            MYSQL_USER: '${dbConfig.dbUser}'
            MYSQL_PASSWORD: '${dbConfig.dbPassword}'
        volumes:
            - mysql-data:/var/lib/mysql
        networks:
            - sail
        ports:
            - "${mysqlPort}:3306"` : '';

    return {
        content: `version: '3.8'

services:
    app:
        build:
            context: .
            dockerfile: Dockerfile
        image: laravel-app
        container_name: laravel-app
        restart: unless-stopped
        working_dir: /var/www/html
        volumes:
            - .:/var/www/html
        networks:
            - sail
        environment:
${finalEnvSection}

${dbService}

networks:
    sail:
        driver: bridge${dbConfig?.databaseSetup === 'new' ? `

volumes:
    mysql-data:
        driver: local` : ''}`,
        ports: {
            app: 80,
            mysql: mysqlPort
        }
    };
}; 