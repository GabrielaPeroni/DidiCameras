from django.urls import path
from . import views


urlpatterns = [
    path('', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('history/', views.history_view, name='history'),
    path('config/', views.config_view, name='config'),
    path('secure-stream/<str:cam_name>/<path:path>', views.proxy_hls, name='proxy_hls'),
    path('<str:camera_id>/<int:recording_id>/', views.recording_detail, name='recording_detail'),
]
