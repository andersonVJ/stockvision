from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Inventory, StockMovement, InternalTransfer, Warehouse

class InventoryService:
    @staticmethod
    def process_sale(sale, items_data, user, branch):
        """Procesa una venta con transacciones atómicas y control de concurrencia."""
        with transaction.atomic():
            total = 0
            # Intentar usar el almacén de ventas, o el primero disponible
            warehouse = Warehouse.objects.filter(branch=branch, type='SALES').first()
            if not warehouse:
                warehouse = Warehouse.objects.filter(branch=branch).first()
            
            if not warehouse:
                raise ValidationError("No existe almacén configurado en esta sede para descontar stock.")

            from .models import Product, SaleItem
            
            for item in items_data:
                product_id = item.get('product')
                quantity = int(item.get('quantity', 0))
                if product_id and quantity > 0:
                    product = Product.objects.get(id=product_id)
                    price = product.price
                    SaleItem.objects.create(sale=sale, product=product, quantity=quantity, price_at_sale=price)
                    total += float(price) * quantity
                    
                    # Bloqueo concurrente de la fila de inventario
                    try:
                        inventory = Inventory.objects.select_for_update().get(product=product, warehouse=warehouse)
                    except Inventory.DoesNotExist:
                        raise ValidationError(f"Inventario para {product.name} no encontrado en el almacén de la sede.")
                    
                    if inventory.quantity < quantity:
                        raise ValidationError(f"Inventario insuficiente para {product.name}. Disponibles: {inventory.quantity}")
                        
                    inventory.quantity -= quantity
                    inventory.save()
                    
                    # Centralizar la auditoría de movimiento
                    StockMovement.objects.create(
                        inventory=inventory,
                        movement_type='EXIT',
                        quantity=quantity,
                        company=branch.company,
                        warehouse=warehouse,
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
    def process_order_delivery(order, received_items_map, user, target_branch):
        """Procesa atómicamente la recepción de una orden (compra/pedido) para incrementar el stock."""
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order.id)
            if order.status not in ['APPROVED', 'IN_TRANSIT']:
                raise ValidationError('Este pedido no puede ser recibido en su estado actual.')

            warehouse = Warehouse.objects.filter(branch=target_branch, type__in=['STORAGE', 'QUARANTINE']).first()
            if not warehouse:
                warehouse = Warehouse.objects.filter(branch=target_branch).first()
            if not warehouse:
                raise ValidationError("La sede destino no tiene almacenes válidos.")

            for item in order.items.all():
                rec_qty = received_items_map.get(item.id)
                if rec_qty is None:
                    rec_qty = item.requested_quantity
                
                item.received_quantity = rec_qty
                item.save()
                
                if rec_qty > 0:
                    inventory, created = Inventory.objects.select_for_update().get_or_create(
                        product=item.product,
                        warehouse=warehouse,
                        defaults={'quantity': 0, 'min_stock': 5, 'max_stock': 100}
                    )
                    
                    inventory.quantity += rec_qty
                    inventory.save()
                    
                    StockMovement.objects.create(
                        inventory=inventory,
                        company=order.company,
                        warehouse=warehouse,
                        user=user,
                        movement_type='ENTRY',
                        quantity=rec_qty,
                        notes=f"Recepción de Pedido #{order.id}"
                    )

            order.status = 'DELIVERED'
            order.save()
            return order
