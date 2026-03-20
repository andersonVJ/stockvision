from django.db import models

# Create your models here.

class Category(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    vida_util_meses = models.IntegerField(default=0, help_text="Vida útil estimada en meses")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='categories')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.company.name}"

class Provider(models.Model):
    name = models.CharField(max_length=200)
    contact = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='providers')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.company.name}"

class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='products')
    providers = models.ManyToManyField(Provider, related_name='products', blank=True)
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, help_text="Stock Keeping Unit")
    barcode = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    fecha_ingreso = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('sku', 'company')

    @property
    def fecha_estimada_fin_vida(self):
        if self.fecha_ingreso and self.category and self.category.vida_util_meses:
            from datetime import timedelta
            return self.fecha_ingreso + timedelta(days=self.category.vida_util_meses * 30)
        return None

    def __str__(self):
        return f"[{self.sku}] {self.name}"

class Inventory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventories')
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, related_name='inventories')
    quantity = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=5)
    max_stock = models.IntegerField(default=100)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'branch')

    def __str__(self):
        return f"Inventory for {self.product.name} at {self.branch.name}"

class StockMovement(models.Model):
    ENTRY = 'ENTRY'
    EXIT = 'EXIT'
    ADJUSTMENT = 'ADJUSTMENT'
    MOVEMENT_CHOICES = [
        (ENTRY, 'Entrada'),
        (EXIT, 'Salida'),
        (ADJUSTMENT, 'Ajuste')
    ]

    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=15, choices=MOVEMENT_CHOICES)
    quantity = models.IntegerField()
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE)
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, related_name='movements', null=True)
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    
    # We will import User dynamically to avoid circular imports if users app imports inventory
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.movement_type} of {self.quantity} for {self.inventory.product.name}"

class Order(models.Model):
    STATUS_CHOICES = (
        ('PENDING_APPROVAL', 'Pendiente de Aprobación'),
        ('APPROVED', 'Aprobado - En Preparación'),
        ('IN_TRANSIT', 'En Tránsito'),
        ('DELIVERED', 'Entregado (Bodega)'),
        ('REJECTED', 'Rechazado'),
    )
    
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='orders')
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='created_orders')
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_orders')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING_APPROVAL')
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.status} - {self.company.name}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    
    requested_quantity = models.PositiveIntegerField()
    received_quantity = models.PositiveIntegerField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.requested_quantity}x {self.product.name} (Order #{self.order.id})"

class Sale(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pendiente'),
        ('COMPLETED', 'Completada'),
        ('CANCELLED', 'Cancelada'),
    )
    INVOICE_CHOICES = (
        ('FISICA', 'Física'),
        ('ELECTRONICA', 'Electrónica'),
    )
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, related_name='sales')
    user = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='sales')
    client = models.ForeignKey('companies.Client', on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    invoice_type = models.CharField(max_length=20, choices=INVOICE_CHOICES, default='FISICA')
    date = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='COMPLETED')
    
    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Sale #{self.id} - {self.branch.name} - {self.status}"

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    price_at_sale = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.quantity}x {self.product.name} (Sale #{self.sale.id})"

class InventoryEntry(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='entries')
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True, related_name='entries')
    quantity = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE)
    branch = models.ForeignKey('companies.Branch', on_delete=models.CASCADE, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Entry of {self.quantity} for {self.product.name} on {self.date}"
