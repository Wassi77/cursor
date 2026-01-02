/**
 * Request validation middleware using Zod
 * Validates incoming request data against schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '@movie-mimic/shared/constants';

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          'Validation failed',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          {
            errors: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          }
        );
      }
      throw error;
    }
  };
}

/**
 * Validate request query parameters against a Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          'Query validation failed',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          {
            errors: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          }
        );
      }
      throw error;
    }
  };
}

/**
 * Validate request parameters against a Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          'Parameter validation failed',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          {
            errors: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          }
        );
      }
      throw error;
    }
  };
}
