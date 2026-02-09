import { useToast } from "@/hooks/use-toast";

// Enhanced error logging utility
export class ErrorLogger {
  private static instance: ErrorLogger;
  
  private constructor() {}
  
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  // Log error with context
  logError(error: unknown, context: string, additionalData?: any) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      additionalData,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' && window.location ? window.location.href : 'unknown'
    };
    
    console.error(`[${context}] Error:`, errorInfo);
    
    // In production, you could send this to an error tracking service
    // Example: sendToErrorService(errorInfo);
  }

  // Log API errors with response details
  logApiError(error: unknown, endpoint: string, requestData?: any) {
    this.logError(error, `API_${endpoint}`, { requestData });
  }
}

// Hook for handling errors with consistent UI feedback
export function useErrorHandler() {
  const { toast } = useToast();
  const logger = ErrorLogger.getInstance();

  const handleError = (
    error: unknown, 
    context: string, 
    userMessage?: string,
    additionalData?: any
  ) => {
    logger.logError(error, context, additionalData);
    
    const displayMessage = userMessage || "An unexpected error occurred. Please try again.";
    
    toast({
      title: "Error",
      description: displayMessage,
      variant: "destructive",
    });
  };

  const handleApiError = (
    error: unknown, 
    endpoint: string, 
    userMessage?: string,
    requestData?: any
  ) => {
    logger.logApiError(error, endpoint, requestData);
    
    const displayMessage = userMessage || "Something went wrong. Please try again.";
    
    toast({
      title: "Request Failed",
      description: displayMessage,
      variant: "destructive",
    });
  };

  return { handleError, handleApiError };
}

// Utility for extracting meaningful error messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unknown error occurred';
}

// Enhanced async operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  onError?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    ErrorLogger.getInstance().logError(error, context);
    
    if (onError) {
      onError(error);
    }
    
    return null;
  }
}