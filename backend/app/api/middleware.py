from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timezone
import pytz

class ScheduledAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if 'available_after' in request.query_params:
            available_after = datetime.fromisoformat(request.query_params['available_after'])
            if datetime.now(pytz.UTC) < available_after:
                return Response(status_code=403, content="Access to this video is not allowed yet")

        response = await call_next(request)
        return response
