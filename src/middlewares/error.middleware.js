/**
 * Global Error Handling Middleware
 */

export function errorHandler(err, req, res, next) {
  const status = err.status === 413 ? 413 : err.status === 400 ? 400 : 500;
  res.status(status).json({
    error: err.status === 413 ? "حجم الطلب تجاوز الحد المسموح" : "طلب غير صالح أو خطأ في الخادم",
  });
}

