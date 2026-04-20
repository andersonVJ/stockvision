from rest_framework import serializers

class KPISummarySerializer(serializers.Serializer):
    total_sales = serializers.FloatField()
    total_stock = serializers.IntegerField()
    products_at_risk = serializers.IntegerField()
    inventory_turnover = serializers.FloatField()
    days_coverage = serializers.FloatField()

class PredictionItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    category = serializers.CharField()
    current_stock = serializers.FloatField()
    prophet_forecast = serializers.DictField()
    xgboost_classification = serializers.DictField()

class SimulationSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    stock_delta = serializers.IntegerField()

class ChartDataSerializer(serializers.Serializer):
    labels = serializers.ListField(child=serializers.CharField())
    values = serializers.ListField(child=serializers.FloatField())
    secondary_values = serializers.ListField(child=serializers.FloatField(), required=False)
