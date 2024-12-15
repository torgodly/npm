import { existsSync } from 'fs';
import ora from 'ora';
import { REQUIRED_FILES, MESSAGES } from '../config/constants.js';
import { LarashipError, ErrorCodes } from './errors.js';

export class ProjectValidator {
    constructor() {
        this.spinner = ora();
    }

    validate() {
        this.spinner.start('Validating project structure...');

        try {
            this.checkRequiredFiles();
            this.spinner.succeed(MESSAGES.SUCCESS.PROJECT_VALID);
        } catch (error) {
            this.spinner.fail(error.message);
            throw error;
        }
    }

    checkRequiredFiles() {
        if (!existsSync(REQUIRED_FILES.COMPOSER)) {
            throw new LarashipError(MESSAGES.ERRORS.NO_COMPOSER, ErrorCodes.FILE_NOT_FOUND);
        }

        if (!existsSync(REQUIRED_FILES.ENV)) {
            throw new LarashipError(MESSAGES.ERRORS.NO_ENV, ErrorCodes.FILE_NOT_FOUND);
        }
    }
} 