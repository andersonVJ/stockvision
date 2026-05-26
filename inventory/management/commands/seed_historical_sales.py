from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from inventory.models import Sale, SaleItem, Product, Warehouse, Inventory
from companies.models import Branch, Client, Company
from users.models import User


class Command(BaseCommand):
    help = 'Genera datos históricos de ventas (6 a 12 meses) para alimentar los modelos predictivos de IA.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=180, help='Número de días hacia atrás para generar ventas (defecto 180)')
        parser.add_argument('--max_sales_per_day', type=int, default=5, help='Máximo de ventas por día por sede (defecto 5)')

    def handle(self, *args, **options):
        days = options['days']
        max_sales_per_day = options['max_sales_per_day']
        
        self.stdout.write(self.style.SUCCESS(f"Iniciando generación de datos históricos ({days} días)..."))
        
        companies = Company.objects.all()
        if not companies.exists():
            self.stdout.write(self.style.ERROR("No hay empresas registradas. Abortando."))
            return
            
        for company in companies:
            branches = Branch.objects.filter(company=company)
            users = User.objects.filter(company=company)
            products = Product.objects.filter(company=company, is_active=True)
            clients = Client.objects.filter(company=company)
            
            if not branches.exists() or not products.exists():
                self.stdout.write(self.style.WARNING(f"La empresa {company.name} no tiene sedes o productos activos. Omitiendo..."))
                continue
                
            # Si no hay cliente, creamos uno genérico
            if not clients.exists():
                Client.objects.create(
                    id_document="00000000",
                    name="Cliente Genérico Histórico",
                    company=company
                )
                clients = Client.objects.filter(company=company)
                
            # Si no hay usuarios en la empresa, usamos un admin genérico o creamos uno temporal
            if not users.exists():
                users = User.objects.filter(is_superuser=True)
                
            if not users.exists():
                self.stdout.write(self.style.ERROR(f"No hay usuarios para asignar las ventas. Abortando."))
                return

            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            total_sales_created = 0
            
            self.stdout.write(self.style.WARNING(f"Generando para empresa {company.name} con {branches.count()} sedes y {products.count()} productos..."))

            for branch in branches:
                for day_offset in range(days):
                    current_date = start_date + timedelta(days=day_offset)
                    
                    # Para dar realismo (estacionalidad), algunos días venden más, otros menos o nada
                    # Simulamos menos ventas los domingos (ej. weekday == 6)
                    is_sunday = current_date.weekday() == 6
                    max_sales = 1 if is_sunday else random.randint(1, max_sales_per_day)
                    
                    for _ in range(max_sales):
                        # 20% de probabilidad de no haber venta en esta iteración para más varianza
                        if random.random() < 0.2:
                            continue
                            
                        client = random.choice(clients)
                        user = random.choice(users)
                        
                        # Crear Venta
                        sale = Sale.objects.create(
                            branch=branch,
                            user=user,
                            client=client,
                            invoice_type=random.choice(['FISICA', 'ELECTRONICA']),
                            date=current_date, # Forzar fecha histórica
                            status='COMPLETED',
                            total=0
                        )
                        
                        # Actualizar fecha de la base de datos ya que auto_now_add puede sobrescribirla si no tenemos cuidado
                        Sale.objects.filter(id=sale.id).update(date=current_date)
                        
                        sale_total = 0
                        # Elegir entre 1 y 4 productos distintos para la venta
                        num_items = random.randint(1, min(4, products.count()))
                        selected_products = random.sample(list(products), num_items)
                        
                        for product in selected_products:
                            qty = random.randint(1, 10)
                            price = product.price
                            
                            SaleItem.objects.create(
                                sale=sale,
                                product=product,
                                quantity=qty,
                                price_at_sale=price
                            )
                            sale_total += (price * qty)
                            
                        # Actualizar el total
                        Sale.objects.filter(id=sale.id).update(total=sale_total)
                        total_sales_created += 1
                        
            self.stdout.write(self.style.SUCCESS(f"Empresa {company.name}: Creadas {total_sales_created} ventas históricas."))
            
        self.stdout.write(self.style.SUCCESS(f"¡Proceso completado con éxito! Ya puedes revisar el Dashboard predictivo."))
