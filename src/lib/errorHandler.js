/**
 * Centralized Error Handling System
 */

export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.subscribers = new Set();
  }

  /**
   * Handle and log errors
   */
  handleError(error, context = {}) {
    const errorEntry = {
      id: Date.now().toString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      type: this.getErrorType(error)
    };

    this.errorLog.push(errorEntry);
    this.notifySubscribers(errorEntry);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', errorEntry);
    }

    return errorEntry;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error) {
    const errorMap = {
      'NetworkError': 'Connection failed. Please check your internet connection.',
      'ValidationError': 'Invalid input provided. Please check your data.',
      'AuthError': 'Authentication failed. Please log in again.',
      'ServerError': 'Server error occurred. Please try again later.',
      'FileError': 'File processing failed. Please check the file format.',
      'default': 'An unexpected error occurred. Please try again.'
    };

    const errorType = this.getErrorType(error);
    return errorMap[errorType] || errorMap.default;
  }

  /**
   * Determine error type
   */
  getErrorType(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'NetworkError';
    }
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'ValidationError';
    }
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return 'AuthError';
    }
    if (error.message.includes('server') || error.status >= 500) {
      return 'ServerError';
    }
    if (error.message.includes('file') || error.message.includes('format')) {
      return 'FileError';
    }
    return 'UnknownError';
  }

  /**
   * Subscribe to error notifications
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify subscribers
   */
  notifySubscribers(errorEntry) {
    this.subscribers.forEach(callback => {
      try {
        callback(errorEntry);
      } catch (err) {
        console.error('Error in subscriber:', err);
      }
    });
  }

  /**
   * Clear error log
   */
  clearErrors() {
    this.errorLog = [];
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(-limit);
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Utility functions
export const handleApiError = (error, context) => {
  return errorHandler.handleError(error, { ...context, source: 'api' });
};

export const handleFileError = (error, context) => {
  return errorHandler.handleError(error, { ...context, source: 'file' });
};

export const handleValidationError = (error, context) => {
  return errorHandler.handleError(error, { ...context, source: 'validation' });
};
