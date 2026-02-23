import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/** 200 OK */
export function ok<T>(message: string, data?: T, statusCode = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, message, ...(data !== undefined ? { data } : {}) },
    { status: statusCode }
  );
}

/** 201 Created */
export function created<T>(message: string, data?: T) {
  return ok(message, data, 201);
}

/** 400 Bad Request */
export function badRequest(message: string, errors?: Record<string, string[]>) {
  return NextResponse.json<ApiResponse>(
    { success: false, message, ...(errors ? { errors } : {}) },
    { status: 400 }
  );
}

/** 401 Unauthorized */
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json<ApiResponse>({ success: false, message }, { status: 401 });
}

/** 403 Forbidden */
export function forbidden(message = 'Forbidden') {
  return NextResponse.json<ApiResponse>({ success: false, message }, { status: 403 });
}

/** 404 Not Found */
export function notFound(message = 'Not found') {
  return NextResponse.json<ApiResponse>({ success: false, message }, { status: 404 });
}

/** 409 Conflict */
export function conflict(message: string) {
  return NextResponse.json<ApiResponse>({ success: false, message }, { status: 409 });
}

/** 422 Unprocessable Entity (validation) */
export function validationError(errors: Record<string, string[]>) {
  return NextResponse.json<ApiResponse>(
    { success: false, message: 'Validation failed', errors },
    { status: 422 }
  );
}

/** 500 Internal Server Error */
export function serverError(err?: unknown) {
  const message =
    process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'Internal server error';
  return NextResponse.json<ApiResponse>({ success: false, message }, { status: 500 });
}
