export function successResponse(res, data, status = 200) {
  const response = {
    success: true,
    data,
  };

  return res.status(status).json(response);
}

export function errorResponse(
  res,
  message,
  status = 500
) {
  const response = {
    success: false,
    error: message,
  };

  return res.status(status).json(response);
}
