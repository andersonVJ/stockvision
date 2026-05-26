from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Inventory, StockMovement, InternalTransfer, Warehouse, Order

class InventoryService:
    @staticmethod
    def process_sale(sale, items_data, user, branch):
        """Procesa una venta con transacciones atómicas y control de concurrencia."""
        with transaction.atomic():
            # Intentar usar el almacén de ventas, o el primero disponible
            warehouse = Warehouse.objects.filter(branch=branch, type='SALES').first()
            if not warehouse:
                warehouse = Warehouse.objects.filter(branch=branch).first()
            
            # Si aún no existe ningún almacén, crear uno por defecto automáticamente
            if not warehouse:
                warehouse = Warehouse.objects.create(
                    branch=branch,
                    name=f"Almacén Principal - {branch.name}",
                    type='STORAGE',
                    is_active=True
                )
            
            total = 0

            from .models import Product, SaleItem
            
            for item in items_data:
                product_id = item.get('product')
                quantity = int(item.get('quantity', 0))
                if product_id and quantity > 0:
                    product = Product.objects.get(id=product_id)
                    price = product.price
                    SaleItem.objects.create(sale=sale, product=product, quantity=quantity, price_at_sale=price)
                    total += float(price) * quantity
                    
                    # Buscar inventario: primero en el warehouse principal de la sede,
                    # luego en cualquier otro warehouse de la misma sede con stock disponible
                    inventory = Inventory.objects.select_for_update().filter(
                        product=product, warehouse=warehouse
                    ).first()
                    
                    if not inventory:
                        # Buscar en cualquier almacén de la sede con stock
                        branch_warehouses = Warehouse.objects.filter(branch=branch)
                        inventory = Inventory.objects.select_for_update().filter(
                            product=product,
                            warehouse__in=branch_warehouses,
                            quantity__gte=quantity
                        ).first()
                    
                    if not inventory:
                        # Auto-crear inventario con stock 0 si no existe (sedes nuevas o migradas)
                        inventory, _ = Inventory.objects.get_or_create(
                            product=product,
                            warehouse=warehouse,
                            defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
                        )
                    
                    if inventory.quantity < quantity:
                        raise ValidationError(f"Inventario insuficiente para {product.name}. Disponibles: {inventory.quantity}")
                        
                    inventory.quantity -= quantity
                    inventory.save()
                    
                    # Auditoría de movimiento
                    StockMovement.objects.create(
                        inventory=inventory,
                        movement_type='EXIT',
                        quantity=quantity,
                        company=branch.company,
                        warehouse=inventory.warehouse,
                        user=user,
                        notes=f"Salida por Venta #{sale.id}"
                    )
            
            sale.total = total
            sale.save()
            return sale

    @staticmethod
    def process_entry(entry, user, branch, company):
        """Procesa una entrada directa de stock."""
        with transaction.atomic():
            warehouse = Warehouse.objects.filter(branch=branch, type__in=['STORAGE', 'QUARANTINE']).first()
            if not warehouse:
                warehouse = Warehouse.objects.filter(branch=branch).first()

            if not warehouse:
                raise ValidationError("No existe almacén para recepción en esta sede.")

            # Bloqueo concurrente
            inventory, created = Inventory.objects.select_for_update().get_or_create(
                product=entry.product, 
                warehouse=warehouse,
                defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
            )
            
            from django.utils import timezone
            entry.product.fecha_ingreso = timezone.now()
            entry.product.save(update_fields=['fecha_ingreso'])
            
            inventory.quantity += entry.quantity
            inventory.save()
            
            StockMovement.objects.create(
                inventory=inventory,
                company=company,
                warehouse=warehouse,
                user=user,
                movement_type='ENTRY',
                quantity=entry.quantity,
                notes=entry.notes or f"Entrada vinculada al proveedor {entry.provider.name if getattr(entry, 'provider', None) else 'N/A'}"
            )
            return entry

    @staticmethod
    def transfer_stock(transfer_id, user):
        """Transfiere stock atómicamente asegurando que el origen no quede en negativo."""
        with transaction.atomic():
            transfer = InternalTransfer.objects.select_for_update().get(id=transfer_id)
            if transfer.status != InternalTransfer.DRAFT:
                raise ValidationError("Solo se puede transferir un borrador de transferencia.")
            
            for item in transfer.items.all():
                try:
                    origin_inv = Inventory.objects.select_for_update().get(product=item.product, warehouse=transfer.source_warehouse)
                except Inventory.DoesNotExist:
                    raise ValidationError(f"Producto {item.product.name} no existe en el almacén de origen.")
                
                if origin_inv.quantity < item.requested_quantity:
                    raise ValidationError(f"Stock insuficiente para {item.product.name} en el almacén de origen.")
                
                # Descuento
                origin_inv.quantity -= item.requested_quantity
                origin_inv.save()
                
                # Incremento o Creación en Destino
                dest_inv, created = Inventory.objects.select_for_update().get_or_create(
                    product=item.product, warehouse=transfer.dest_warehouse,
                    defaults={'quantity': 0}
                )
                dest_inv.quantity += item.requested_quantity
                dest_inv.save()
                
                # Auditoría Incorruptible
                StockMovement.objects.create(
                    inventory=origin_inv, movement_type='EXIT', quantity=item.requested_quantity,
                    company=transfer.company, warehouse=transfer.source_warehouse, user=user, notes=f"Traspaso Interno (Salida) #{transfer.id}"
                )
                StockMovement.objects.create(
                    inventory=dest_inv, movement_type='ENTRY', quantity=item.requested_quantity,
                    company=transfer.company, warehouse=transfer.dest_warehouse, user=user, notes=f"Traspaso Interno (Entrada) #{transfer.id}"
                )
            
            transfer.status = InternalTransfer.COMPLETED
            transfer.approved_by = user
            transfer.save()
            return transfer

    @staticmethod
    def process_reception(order_obj, received_items_map, user, target_branch):
        """
        Procesa de forma unificada la recepción de stock para Pedidos Internos u Órdenes de Compra.
        order_obj: Instancia de Order (interno) o PurchaseOrder (externo).
        received_items_map: Diccionario { item_id: cantidad_recibida }.
        """
        from .models import Inventory, StockMovement, Warehouse, Order
        from django.utils import timezone
        
        with transaction.atomic():
            # Determinar tipo de orden y bloquear registro
            is_internal = isinstance(order_obj, Order)
            
            # Buscar el almacén de destino adecuado (priorizar STORAGE/QUARANTINE)
            warehouse = Warehouse.objects.filter(branch=target_branch, type__in=['STORAGE', 'QUARANTINE']).first()
            if not warehouse:
                warehouse = Warehouse.objects.filter(branch=target_branch).first()
            if not warehouse:
                # Crear almacén si no existe
                warehouse = Warehouse.objects.create(
                    branch=target_branch, 
                    name=f"Bodega Principal {target_branch.name}", 
                    type='STORAGE'
                )

            for item in order_obj.items.all():
                # Obtener cantidad recibida (fallback a solicitada)
                item_id_key = item.id
                # El mapa puede tener llaves como strings por el JSON
                rec_qty = received_items_map.get(item_id_key) or received_items_map.get(str(item_id_key))
                
                if rec_qty is None:
                    rec_qty = getattr(item, 'requested_quantity', getattr(item, 'cantidad_solicitada', 0))
                
                try:
                    rec_qty = int(rec_qty)
                except (ValueError, TypeError):
                    rec_qty = 0

                item.cantidad_recibida = rec_qty # PurchaseOrderItem
                if hasattr(item, 'received_quantity'):
                    item.received_quantity = rec_qty # OrderItem
                item.save()
                
                product = getattr(item, 'product', getattr(item, 'producto', None))
                
                if rec_qty > 0 and product:
                    product.fecha_ingreso = timezone.now()
                    product.save(update_fields=['fecha_ingreso'])
                    
                    inventory, _ = Inventory.objects.select_for_update().get_or_create(
                        product=product,
                        warehouse=warehouse,
                        defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
                    )
                    
                    inventory.quantity += rec_qty
                    inventory.save()
                    
                    StockMovement.objects.create(
                        inventory=inventory,
                        company=order_obj.company,
                        warehouse=warehouse,
                        branch=target_branch,
                        user=user,
                        movement_type='ENTRY',
                        quantity=rec_qty,
                        notes=f"Recepción de {'Pedido' if is_internal else 'OC'} #{order_obj.id}"
                    )

            if is_internal:
                order_obj.status = 'DELIVERED'
            else:
                order_obj.estado = 'RECIBIDA'
                order_obj.branch = target_branch
            
            order_obj.save()
            return order_obj
