import os
import django
from django.urls import resolve

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

try:
    match = resolve('/api/analytics/export-data/')
    print(f"Match found: {match.view_name} -> {match.func}")
except Exception as e:
    print(f"Error resolving URL: {type(e)} - {e}")
