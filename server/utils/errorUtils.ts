import { Response } from 'express';

// Enhanced server-side error logging
export class ServerErrorLogger {
  private static instance: ServerErrorLogger;
  
  private constructor() {}
  
  static getInstance(): ServerErrorLogger {
    if (!ServerErrorLogger.instance) {
      ServerErrorLogger.instance = new ServerErrorLogger();
    }
    return ServerErrorLogger.instance;
  }

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
      nodeEnv: process.env.NODE_ENV
    };
    
    console.error(`[${context}] Server Error:`, errorInfo);
    
    // In production, send to error tracking service
    // Example: await sendToErrorService(errorInfo);
  }

  logApiError(error: unknown, endpoint: string, requestData?: any, userId?: string) {
    this.logError(error, `API_${endpoint}`, { requestData, userId });
  }
}

// Enhanced error response utility
export function sendErrorResponse(
  res: Response, 
  error: unknown, 
  context: string, 
  statusCode: number = 500,
  userMessage?: string,
  additionalData?: any
) {
  const logger = ServerErrorLogger.getInstance();
  logger.logError(error, context, additionalData);
  
  const message = userMessage || "An internal server error occurred";
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response: any = { error: message };
  
  if (isDevelopment && error instanceof Error) {
    response.details = {
      message: error.message,
      stack: error.stack
    };
  }
  
  res.status(statusCode).json(response);
}

// Wrapper for async route handlers
export function asyncHandler(
  handler: (req: any, res: Response, next?: any) => Promise<any>
) {
  return async (req: any, res: Response, next: any) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      sendErrorResponse(res, error, `AsyncHandler_${req.method}_${req.path}`);
    }
  };
}

// Enhanced validation error handling
export function handleValidationError(error: unknown, res: Response, context: string) {
  const logger = ServerErrorLogger.getInstance();
  
  // Check if it's a Zod validation error
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as any;
    const validationDetails = zodError.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    
    logger.logError(error, `${context}_VALIDATION`, { validationDetails });
    
    return res.status(400).json({
      error: "Validation failed",
      details: validationDetails
    });
  }
  
  // Handle other validation errors
  sendErrorResponse(res, error, context, 400, "Invalid data provided");
}

// Database error handling
export function handleDatabaseError(error: unknown, res: Response, context: string) {
  const logger = ServerErrorLogger.getInstance();
  logger.logError(error, `${context}_DATABASE`);
  
  // Check for common database errors
  if (error instanceof Error) {
    if (error.message.includes('unique constraint')) {
      return res.status(409).json({ error: "Resource already exists" });
    }
    
    if (error.message.includes('foreign key constraint')) {
      return res.status(400).json({ error: "Invalid reference to related resource" });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: "Resource not found" });
    }
  }
  
  sendErrorResponse(res, error, context, 500, "Database operation failed");
}

// Authentication error handling
export function handleAuthError(error: unknown, res: Response, context: string) {
  const logger = ServerErrorLogger.getInstance();
  logger.logError(error, `${context}_AUTH`);
  
  res.status(401).json({ error: "Authentication failed" });
}

// Stripe/Payment error handling
export function handlePaymentError(error: unknown, res: Response, context: string) {
  const logger = ServerErrorLogger.getInstance();
  logger.logError(error, `${context}_PAYMENT`);
  
  if (error && typeof error === 'object' && 'type' in error) {
    const stripeError = error as any;
    
    switch (stripeError.type) {
      case 'card_error':
        return res.status(400).json({ error: "Card was declined" });
      case 'invalid_request_error':
        return res.status(400).json({ error: "Invalid payment request" });
      default:
        break;
    }
  }
  
  sendErrorResponse(res, error, context, 500, "Payment processing failed");
}