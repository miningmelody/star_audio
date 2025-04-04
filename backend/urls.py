from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from audio_manager.views import download_favorites, upload_file

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/download-favorites/', download_favorites, name='download_favorites'),
    path('api/upload-file/', upload_file, name='upload_file'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 