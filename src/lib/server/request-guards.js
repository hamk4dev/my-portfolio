export function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function assertSameOriginRequest(req) {
  const originHeader = req.headers.get('origin');
  if (!originHeader) {
    return;
  }

  let requestOrigin;
  let declaredOrigin;

  try {
    requestOrigin = req.nextUrl?.origin || new URL(req.url).origin;
    declaredOrigin = new URL(originHeader).origin;
  } catch {
    throw createHttpError(403, 'Origin request tidak valid.');
  }

  if (declaredOrigin !== requestOrigin) {
    throw createHttpError(403, 'Origin request tidak diizinkan.');
  }
}

export function assertJsonRequest(req) {
  const contentType = req.headers.get('content-type') || '';
  if (!/application\/json/i.test(contentType)) {
    throw createHttpError(415, 'Content-Type harus application/json.');
  }
}
