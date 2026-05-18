from inventory.models import Sale
from django.db.models import Count, Q
import os

sales_summary = Sale.objects.values('user__username').annotate(
    count=Count('id'), 
    zero_total_count=Count('id', filter=Q(total=0))
)

with open('scratch/sales_report.txt', 'w') as f:
    for s in sales_summary:
        f.write(f"User: {s['user__username']}, Total Sales: {s['count']}, Zero Total: {s['zero_total_count']}\n")

    admin_sales = Sale.objects.filter(user__username='adminAdmin')
    f.write(f"\nAdminAdmin Sales IDs: {[s.id for s in admin_sales]}\n")
