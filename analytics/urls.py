from django.urls import path
from .views import (
    DashboardSummaryAPIView, 
    AlertsAPIView, 
    ChartDataAPIView, 
    SimulationAPIView,
    ExportAPIView
)

urlpatterns = [
    path('summary/', DashboardSummaryAPIView.as_view(), name='dashboard-summary'),
    path('alerts/', AlertsAPIView.as_view(), name='dashboard-alerts'),
    path('charts/', ChartDataAPIView.as_view(), name='dashboard-charts'),
    path('simulate/', SimulationAPIView.as_view(), name='dashboard-simulate'),
    path('export-data/', ExportAPIView.as_view(), name='dashboard-export'),
]
