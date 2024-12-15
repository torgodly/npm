export const PHP_VERSIONS = {
    SUPPORTED: ['7.3', '7.4', '8.0', '8.1', '8.2', '8.3'],
    DEFAULT: '8.3'
};

export const REQUIRED_FILES = {
    COMPOSER: 'composer.json',
    ENV: '.env'
};

export const DOCKER = {
    BASE_IMAGE: 'serversideup/php',
    DEFAULT_APP_NAME: 'laravel',
    NETWORK_DRIVER: 'bridge'
};

export const MESSAGES = {
    ERRORS: {
        NO_COMPOSER: 'composer.json not found. Are you in a Laravel project directory?',
        NO_ENV: '.env file not found',
        INVALID_PHP: 'PHP version not supported'
    },
    SUCCESS: {
        PROJECT_VALID: 'Project structure validated',
        FILES_GENERATED: 'Docker files generated successfully'
    }
}; 