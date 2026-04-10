# Models/config.py

# Business thresholds for identifying inventory states

class InventoryThresholds:
    """Configurable thresholds for inventory classification models."""
    
    # Threshold for low stock warning (e.g., lower than 50% of typical demand)
    LOW_STOCK_THRESHOLD = 0.5 
    
    # Threshold for high rotation product (sold fast)
    HIGH_ROTATION_THRESHOLD = 0.8
    
    # Threshold for low rotation product (stagnant stock)
    LOW_ROTATION_THRESHOLD =  0.2

    # Stock to demand ratio where a product is considered overstocked
    OVERSTOCK_THRESHOLD = 3.0
    
    @classmethod
    def get_all(cls):
        return {
            "LOW_STOCK_THRESHOLD": cls.LOW_STOCK_THRESHOLD,
            "HIGH_ROTATION_THRESHOLD": cls.HIGH_ROTATION_THRESHOLD,
            "LOW_ROTATION_THRESHOLD": cls.LOW_ROTATION_THRESHOLD,
            "OVERSTOCK_THRESHOLD": cls.OVERSTOCK_THRESHOLD,
        }
