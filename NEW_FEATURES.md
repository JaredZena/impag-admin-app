# New Features: Kit Management and Product Balance

## Overview

Two new powerful features have been added to the IMPAG Admin application:

1. **Kit Management** - Create and manage product kits/bundles
2. **Product Balance** - Compare suppliers and analyze costs for quotations

## 1. Kit Management (`/kits`)

### Features
- Create product kits by combining multiple existing products
- Set custom kit names, SKUs, and descriptions
- Automatic price calculation based on component products
- Override automatic pricing with custom prices
- Search and filter existing kits
- Manage kit status (active/inactive)

### Use Case
Perfect for creating bundles like "Kit de Bombeo Solar" that includes:
- Solar panels
- Water pump
- Controllers
- Cables and accessories

### Key Components
- **KitManagementPage.tsx** - Main interface for kit management
- Interactive product selection with real-time pricing
- Quantity management for each component
- Total price calculation

## 2. Product Balance (`/balance`)

### Features
- Add products to a quote analysis
- Compare multiple suppliers for each product
- Calculate real costs including shipping
- Apply margin percentages for selling prices
- Calculate profit margins
- Export analysis to CSV
- Select best suppliers for each product

### Use Case
When creating a quote for a customer, you can:
- Add all required products with quantities
- Compare all available suppliers
- See real costs including shipping
- Calculate selling prices with your desired margin
- Generate a comprehensive comparison report

### Key Calculations
- **Unit Price** - Base supplier price
- **Shipping Costs** - Per unit or flat rate shipping
- **Real Cost** - Unit price + shipping per unit
- **Selling Price** - Real cost + margin percentage
- **Profit** - Selling price - real cost

### Comparison Table
The balance page shows a detailed table similar to your example:
```
Proveedor | Descripción | Cantidad | Unidad | Precio Unitario | Importe Total | Envío U | Envío Total | Costo Real U | Costo Total | % | P. Venta U | P. Venta T | Ganancia U | Ganancia T
```

## Navigation

Both features are accessible through the main navigation:
- **Kits** - Kit management and creation
- **Balance** - Product comparison and quote analysis

## API Requirements

The following API endpoints need to be implemented in the backend:

### Kit Endpoints
- `GET /kits` - List all kits
- `POST /kits` - Create new kit
- `GET /kits/{id}` - Get kit details
- `PUT /kits/{id}` - Update kit
- `DELETE /kits/{id}` - Delete kit

### Balance/Comparison Endpoints
- `GET /products/comparison` - Get supplier comparisons for a product
- `POST /products/bulk-comparison` - Get comparisons for multiple products

## Database Schema Additions

### Kits Table
```sql
CREATE TABLE kits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Kit Products Table
```sql
CREATE TABLE kit_products (
    id SERIAL PRIMARY KEY,
    kit_id INTEGER REFERENCES kits(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Status

✅ Frontend components created
✅ Navigation updated
✅ Routes configured
✅ TypeScript types defined
⏳ Backend API endpoints (to be implemented)
⏳ Database schema updates (to be implemented)

## Next Steps

1. Implement backend API endpoints
2. Update database schema
3. Test integration
4. Add edit/delete functionality for kits
5. Add save/load functionality for balance analyses
