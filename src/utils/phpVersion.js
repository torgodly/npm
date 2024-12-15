import { readFileSync } from 'fs';
import ora from 'ora';
import { PHP_VERSIONS, MESSAGES } from '../config/constants.js';
import { LarashipError, ErrorCodes } from './errors.js';

export class PhpVersionDetector {
    constructor() {
        this.spinner = ora();
    }

    detect() {
        this.spinner.start('Detecting PHP version...');
        
        try {
            const version = this.parseComposerJson();
            this.spinner.succeed(`PHP version ${version} detected`);
            return version;
        } catch (error) {
            this.spinner.fail(error.message);
            throw error;
        }
    }

    parseComposerJson() {
        const composerJson = JSON.parse(readFileSync('composer.json', 'utf8'));
        const phpRequirement = composerJson.require?.php;

        if (!phpRequirement) {
            this.spinner.warn(`No PHP version specified, using default ${PHP_VERSIONS.DEFAULT}`);
            return PHP_VERSIONS.DEFAULT;
        }

        const version = this.extractVersion(phpRequirement);
        return this.validateVersion(version);
    }

    extractVersion(requirement) {
        if (requirement.includes('|')) {
            return requirement.split('|')[0].match(/\d+\.\d+/)[0];
        }
        const match = requirement.match(/(\d+\.\d+)/);
        return match ? match[1] : PHP_VERSIONS.DEFAULT;
    }

    validateVersion(version) {
        if (!PHP_VERSIONS.SUPPORTED.includes(version)) {
            const closest = this.findClosestVersion(version);
            this.spinner.warn(`PHP ${version} not supported. Using ${closest}`);
            return closest;
        }
        return version;
    }

    findClosestVersion(version) {
        const versionNum = parseFloat(version);
        return PHP_VERSIONS.SUPPORTED.reduce((prev, curr) => {
            return Math.abs(parseFloat(curr) - versionNum) < 
                   Math.abs(parseFloat(prev) - versionNum) ? curr : prev;
        });
    }
} 