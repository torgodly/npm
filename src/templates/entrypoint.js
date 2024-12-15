export const generateEntrypoint = (migrationCommands) => `#!/bin/sh

# Wait for MySQL to be ready
while ! mysqladmin ping -h mysql -u root -p"$DB_PASSWORD" --silent; do
    echo "Waiting for database connection..."
    sleep 2
done

# Run migrations and seeds if specified
if [ -n "${migrationCommands}" ]; then
    ${migrationCommands}
fi

# Start PHP-FPM and Nginx
php-fpm -D && nginx -g 'daemon off;'
`; 