/**
 * Real-time Progress Management System
 * Handles progress tracking for all voice processing operations
 */

export class ProgressManager {
  constructor() {
    this.activeOperations = new Map();
    this.subscribers = new Map();
  }

  /**
   * Start tracking a new operation
   * @param {string} operationId - Unique operation identifier
   * @param {string} type - Operation type (tts, clone, dubbing, etc.)
   * @param {object} metadata - Additional operation metadata
   */
  startOperation(operationId, type, metadata = {}) {
    const operation = {
      id: operationId,
      type,
      status: 'initializing',
      progress: 0,
      startTime: Date.now(),
      steps: this.getStepsForType(type),
      currentStep: 0,
      metadata,
      error: null
    };

    this.activeOperations.set(operationId, operation);
    this.notifySubscribers(operationId, operation);
    
    return operation;
  }

  /**
   * Update operation progress
   * @param {string} operationId - Operation identifier
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} status - Current status message
   * @param {object} data - Additional data
   */
  updateProgress(operationId, progress, status, data = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    operation.progress = Math.min(100, Math.max(0, progress));
    operation.status = status;
    operation.lastUpdate = Date.now();
    
    // Update current step based on progress
    const stepIndex = Math.floor((progress / 100) * operation.steps.length);
    operation.currentStep = Math.min(stepIndex, operation.steps.length - 1);
    
    Object.assign(operation.metadata, data);
    
    this.notifySubscribers(operationId, operation);
  }

  /**
   * Complete an operation
   * @param {string} operationId - Operation identifier
   * @param {object} result - Final result data
   */
  completeOperation(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    operation.progress = 100;
    operation.status = 'completed';
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.result = result;

    this.notifySubscribers(operationId, operation);
    
    // Clean up after 30 seconds
    setTimeout(() => {
      this.activeOperations.delete(operationId);
    }, 30000);
  }

  /**
   * Mark operation as failed
   * @param {string} operationId - Operation identifier
   * @param {string} error - Error message
   */
  failOperation(operationId, error) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    operation.status = 'failed';
    operation.error = error;
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;

    this.notifySubscribers(operationId, operation);
  }

  /**
   * Subscribe to operation updates
   * @param {string} operationId - Operation identifier
   * @param {function} callback - Callback function
   */
  subscribe(operationId, callback) {
    if (!this.subscribers.has(operationId)) {
      this.subscribers.set(operationId, new Set());
    }
    this.subscribers.get(operationId).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(operationId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(operationId);
        }
      }
    };
  }

  /**
   * Get operation status
   * @param {string} operationId - Operation identifier
   * @returns {object|null} Operation status
   */
  getOperation(operationId) {
    return this.activeOperations.get(operationId) || null;
  }

  /**
   * Get all active operations
   * @returns {Array} Array of active operations
   */
  getActiveOperations() {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Notify all subscribers of an operation update
   * @private
   */
  notifySubscribers(operationId, operation) {
    const subs = this.subscribers.get(operationId);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(operation);
        } catch (error) {
          console.error('Progress subscriber error:', error);
        }
      });
    }
  }

  /**
   * Get predefined steps for operation type
   * @private
   */
  getStepsForType(type) {
    const stepMap = {
      tts: [
        'Initializing TTS engine',
        'Processing text input',
        'Generating speech',
        'Optimizing audio quality',
        'Finalizing output'
      ],
      clone: [
        'Analyzing voice sample',
        'Processing text input',
        'Training voice model',
        'Generating cloned speech',
        'Enhancing audio quality',
        'Finalizing clone'
      ],
      dubbing: [
        'Processing video file',
        'Extracting audio track',
        'Transcribing speech',
        'Generating dubbed audio',
        'Syncing with video',
        'Rendering final output'
      ],
      privacy: [
        'Analyzing input audio',
        'Applying privacy filters',
        'Processing voice conversion',
        'Optimizing output quality',
        'Finalizing secure audio'
      ],
      voiceEffects: [
        'Loading audio file',
        'Analyzing audio properties',
        'Applying voice effects',
        'Processing enhancements',
        'Rendering final audio'
      ]
    };

    return stepMap[type] || ['Processing...', 'Finalizing...'];
  }

  /**
   * Create a simulated progress for demo purposes
   * @param {string} operationId - Operation identifier
   * @param {string} type - Operation type
   * @param {number} duration - Total duration in milliseconds
   */
  simulateProgress(operationId, type, duration = 5000) {
    const operation = this.startOperation(operationId, type);
    const steps = operation.steps;
    const stepDuration = duration / steps.length;

    steps.forEach((step, index) => {
      setTimeout(() => {
        const progress = ((index + 1) / steps.length) * 100;
        this.updateProgress(operationId, progress, step);
        
        if (index === steps.length - 1) {
          setTimeout(() => {
            this.completeOperation(operationId, {
              success: true,
              message: 'Operation completed successfully'
            });
          }, stepDuration * 0.2);
        }
      }, stepDuration * index);
    });

    return operation;
  }
}

// Create singleton instance
export const progressManager = new ProgressManager();

// React hook for using progress manager
export function useProgress(operationId) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!operationId) return;

    const unsubscribe = progressManager.subscribe(operationId, (operation) => {
      setProgress(operation);
    });

    // Get initial state
    const initialOperation = progressManager.getOperation(operationId);
    if (initialOperation) {
      setProgress(initialOperation);
    }

    return unsubscribe;
  }, [operationId]);

  return progress;
}
