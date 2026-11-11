export type AppErrorCode =
  | 'validation'
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'unauthorized'
  | 'rate_limited'
  | 'storage'
  | 'unsupported';

/** An error whose message is safe and helpful to show to the person. */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/** Turns anything thrown into a message that can be shown on screen. */
export function messageFromError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return 'Something went wrong on our side. Please try again in a moment.';
}
