from django.db import models
from django.conf import settings

class AnalyticsCache(models.Model):
    """
    Stores pre-computed AI predictions and KPI snapshots to avoid heavy calculations 
    during real-time dashboard browsing.
    """
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='analytics_cache')
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, null=True, blank=True)
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, null=True, blank=True)
    
    # Type of cache: 'SUMMARY', 'CHARTS', 'PREDICTIONS'
    cache_type = models.CharField(max_length=50)
    
    # The actual JSON payload
    data = models.JSONField()
    
    calculated_at = models.DateTimeField(auto_now_add=True)
    expire_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=['company', 'cache_type']),
            models.Index(fields=['expire_at']),
        ]

    def __str__(self):
        return f"Cache {self.cache_type} - {self.company.name} ({self.calculated_at})"

class DashboardPreference(models.Model):
    """
    User-specific preferences for the dashboard layout and default filters.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dashboard_prefs')
    default_branch = models.ForeignKey('companies.Branch', on_delete=models.SET_NULL, null=True, blank=True)
    refresh_interval_minutes = models.IntegerField(default=5)
    config_json = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Prefs for {self.user.email}"
