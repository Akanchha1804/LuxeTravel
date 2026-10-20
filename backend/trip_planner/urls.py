"""
URL configuration for trip_planner project.
"""

from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path, re_path
from django.views.decorators.cache import never_cache
from django.views.generic import TemplateView

from trips.views import health


@never_cache
def spa_index(request):
    """Serve the React single-page app from the production build."""
    index_file = settings.FRONTEND_BUILD_DIR / "index.html"
    if index_file.is_file():
        return TemplateView.as_view(template_name="index.html")(request)

    return HttpResponse(
        """<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>LuxeTravel API</title></head>
  <body style="font-family: system-ui; margin: 3rem; max-width: 720px;">
    <h1>LuxeTravel API is running</h1>
    <p>The React build was not found. For development, run <code>npm start</code>
    and open <a href="http://localhost:3000">http://localhost:3000</a>.</p>
    <p>For production, run <code>npm run build</code> in the project root, then
    reload this page.</p>
    <p><a href="/api/health/">API health check</a></p>
  </body>
</html>""",
        content_type="text/html",
        status=200,
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("trips.urls")),
    path("healthz", health, name="healthz"),
    re_path(r"^(?!api/|admin/|static/).*$", spa_index, name="spa"),
]
