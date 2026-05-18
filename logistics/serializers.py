from rest_framework import serializers
from .models import DeliveryRoute, RouteStop, PurchaseOrder, PurchaseOrderItem


class RouteStopSerializer(serializers.ModelSerializer):
    venta_id = serializers.ReadOnlyField(source='venta.id')
    branch_name = serializers.ReadOnlyField(source='venta.branch.name')
    client_name = serializers.SerializerMethodField()
    total_venta = serializers.ReadOnlyField(source='venta.total')
    estado_entrega_display = serializers.ReadOnlyField(source='get_estado_entrega_display')

    branch_lat = serializers.ReadOnlyField(source='venta.branch.latitud')
    branch_lng = serializers.ReadOnlyField(source='venta.branch.longitud')
    branch_address = serializers.ReadOnlyField(source='venta.branch.address')

    class Meta:
        model = RouteStop
        fields = [
            'id', 'ruta', 'venta', 'venta_id', 'branch_name',
            'branch_lat', 'branch_lng', 'branch_address',
            'client_name', 'total_venta', 'orden_entrega',
            'estado_entrega', 'estado_entrega_display', 'notas'
        ]

    def get_client_name(self, obj):
        if obj.venta.client:
            return obj.venta.client.name
        return 'Sin cliente registrado'


class DeliveryRouteSerializer(serializers.ModelSerializer):
    paradas = RouteStopSerializer(many=True, read_only=True)
    estado_display = serializers.ReadOnlyField(source='get_estado_display')
    tipo_display = serializers.ReadOnlyField(source='get_tipo_display')
    branch_name = serializers.ReadOnlyField(source='branch.name')
    branch_lat = serializers.ReadOnlyField(source='branch.latitud')
    branch_lng = serializers.ReadOnlyField(source='branch.longitud')
    branch_address = serializers.ReadOnlyField(source='branch.address')
    
    supplier_lat = serializers.SerializerMethodField()
    supplier_lng = serializers.SerializerMethodField()
    supplier_address = serializers.SerializerMethodField()

    total_paradas = serializers.SerializerMethodField()
    paradas_entregadas = serializers.SerializerMethodField()
    internal_order_id = serializers.ReadOnlyField(source='internal_order.id')

    class Meta:
        model = DeliveryRoute
        fields = [
            'id', 'company', 'branch', 'branch_name', 'branch_lat', 'branch_lng', 'branch_address',
            'purchase_order', 'internal_order', 'internal_order_id', 'tipo', 'tipo_display', 'origin_supplier',
            'supplier_lat', 'supplier_lng', 'supplier_address',
            'fecha', 'zona', 'transportador', 'estado', 'estado_display', 'notas',
            'paradas', 'total_paradas', 'paradas_entregadas',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('company', 'created_at', 'updated_at')

    def get_total_paradas(self, obj):
        return obj.paradas.count()

    def get_paradas_entregadas(self, obj):
        return obj.paradas.filter(estado_entrega='ENTREGADO').count()

    def get_supplier_lat(self, obj):
        if obj.purchase_order and obj.purchase_order.proveedor:
            return obj.purchase_order.proveedor.latitud
        if obj.tipo == 'INTERNO':
            from companies.models import Branch
            matrix = Branch.objects.filter(company=obj.company, name__icontains='Matriz').first()
            if matrix and matrix.latitud: return matrix.latitud
            return obj.company.latitud
        return None

    def get_supplier_lng(self, obj):
        if obj.purchase_order and obj.purchase_order.proveedor:
            return obj.purchase_order.proveedor.longitud
        if obj.tipo == 'INTERNO':
            from companies.models import Branch
            matrix = Branch.objects.filter(company=obj.company, name__icontains='Matriz').first()
            if matrix and matrix.longitud: return matrix.longitud
            return obj.company.longitud
        return None

    def get_supplier_address(self, obj):
        if obj.purchase_order and obj.purchase_order.proveedor:
            return obj.purchase_order.proveedor.address
        if obj.tipo == 'INTERNO':
            return "Sede Matriz / Almacén Central"
        return None


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    producto_name = serializers.SerializerMethodField()
    producto_sku  = serializers.ReadOnlyField(source='producto.sku')

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'orden', 'producto', 'producto_nombre_libre',
            'producto_name', 'producto_sku',
            'cantidad_solicitada', 'cantidad_recibida', 'precio_unitario'
        ]
        read_only_fields = ('orden',)
        extra_kwargs = {
            'producto': {'required': False, 'allow_null': True},
        }

    def get_producto_name(self, obj):
        return obj.display_name


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    proveedor_name = serializers.ReadOnlyField(source='proveedor.name')
    proveedor_contacto = serializers.ReadOnlyField(source='proveedor.contact')
    branch_name = serializers.ReadOnlyField(source='branch.name')
    generada_por_name = serializers.ReadOnlyField(source='generada_por.get_full_name')
    aprobada_por_name = serializers.ReadOnlyField(source='aprobada_por.get_full_name')
    estado_display = serializers.ReadOnlyField(source='get_estado_display')
    total_orden = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'company', 'proveedor', 'proveedor_name', 'proveedor_contacto',
            'branch', 'branch_name',
            'generada_por', 'generada_por_name', 'aprobada_por', 'aprobada_por_name',
            'fecha', 'estado', 'estado_display', 'notas', 'items', 'total_orden',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('company', 'generada_por', 'aprobada_por', 'fecha', 'created_at', 'updated_at')

    def get_total_orden(self, obj):
        total = sum(
            float(item.precio_unitario) * item.cantidad_solicitada
            for item in obj.items.all()
        )
        return round(total, 2)
