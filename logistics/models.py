from django.db import models


class DeliveryRoute(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_CURSO', 'En Curso'),
        ('FINALIZADA', 'Finalizada'),
    ]
    TIPO_CHOICES = [
        ('SALIDA', 'Salida — Entrega a cliente'),
        ('ENTRADA', 'Entrada — Recepción de proveedor'),
        ('INTERNO', 'Traslado — Pedido Interno'),
    ]

    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='delivery_routes'
    )
    branch = models.ForeignKey(
        'companies.Branch', on_delete=models.CASCADE, related_name='delivery_routes',
        null=True, blank=True
    )
    purchase_order = models.ForeignKey(
        'logistics.PurchaseOrder', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='delivery_routes',
        help_text='OC asociada (solo para rutas tipo ENTRADA)'
    )
    internal_order = models.ForeignKey(
        'inventory.Order', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='internal_routes',
        help_text='Pedido Interno asociado (solo para rutas tipo INTERNO)'
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='SALIDA')
    origin_supplier = models.CharField(max_length=200, blank=True, null=True,
        help_text='Nombre del proveedor/marca de origen (para rutas ENTRADA)')
    fecha = models.DateField()
    zona = models.CharField(max_length=200, blank=True, null=True)
    transportador = models.CharField(max_length=200, blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha', '-created_at']

    def __str__(self):
        return f"Ruta #{self.id} [{self.get_tipo_display()}] — {self.fecha} — {self.get_estado_display()}"


class RouteStop(models.Model):
    ESTADO_ENTREGA_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('ENTREGADO', 'Entregado'),
        ('FALLIDO', 'Fallido'),
    ]

    ruta = models.ForeignKey(
        DeliveryRoute, on_delete=models.CASCADE, related_name='paradas'
    )
    venta = models.ForeignKey(
        'inventory.Sale', on_delete=models.PROTECT, related_name='route_stops'
    )
    orden_entrega = models.PositiveIntegerField(default=1)
    estado_entrega = models.CharField(
        max_length=20, choices=ESTADO_ENTREGA_CHOICES, default='PENDIENTE'
    )
    notas = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['orden_entrega']
        unique_together = ('ruta', 'venta')

    def __str__(self):
        return f"Parada #{self.orden_entrega} de Ruta #{self.ruta.id} — Venta #{self.venta.id}"


class PurchaseOrder(models.Model):
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('PENDIENTE', 'Pendiente de Aprobación'),
        ('APROBADA', 'Aprobada'),
        ('EN_TRANSITO', 'En Tránsito'),
        ('RECIBIDA', 'Recibida'),
        ('CANCELADA', 'Cancelada'),
    ]

    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='purchase_orders'
    )
    proveedor = models.ForeignKey(
        'inventory.Provider', on_delete=models.PROTECT, related_name='purchase_orders'
    )
    branch = models.ForeignKey(
        'companies.Branch', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_orders',
        help_text="Sede donde se recibió o recibirá la mercancía"
    )
    generada_por = models.ForeignKey(
        'users.User', on_delete=models.PROTECT, related_name='generated_purchase_orders'
    )
    aprobada_por = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_purchase_orders'
    )
    fecha = models.DateField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='BORRADOR')
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OC #{self.id} — {self.proveedor.name} — {self.get_estado_display()}"


class PurchaseOrderItem(models.Model):
    orden = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name='items'
    )
    producto = models.ForeignKey(
        'inventory.Product', on_delete=models.PROTECT, related_name='purchase_order_items',
        null=True, blank=True
    )
    producto_nombre_libre = models.CharField(
        max_length=300, blank=True, null=True,
        help_text="Nombre del producto si no está en el catálogo (pedidos a tiendas de marca)"
    )
    cantidad_solicitada = models.PositiveIntegerField()
    cantidad_recibida = models.PositiveIntegerField(null=True, blank=True)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    @property
    def display_name(self):
        if self.producto:
            return self.producto.name
        return self.producto_nombre_libre or "Producto sin nombre"

    def __str__(self):
        return f"{self.cantidad_solicitada}x {self.display_name} (OC #{self.orden.id})"
