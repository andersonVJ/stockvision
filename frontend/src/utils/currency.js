/**
 * Formatea un número como moneda colombiana (COP)
 * Ejemplo: 5000000 -> $5,000,000
 */
export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "$0";
    
    // Convertimos a número en caso de que venga como string
    const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount)) return "$0";

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numericAmount).replace("USD", "").trim();
};
