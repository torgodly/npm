export class LarashipError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'LarashipError';
        this.code = code;
    }
}

export const ErrorCodes = {
    VALIDATION: 'VALIDATION_ERROR',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION'
}; 