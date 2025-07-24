import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import VariantsTable, { Variant } from './VariantsTable';
import SuppliersTable, { Supplier } from './SuppliersTable';

interface Product {
  id: number;
  name: string;
  description: string;
  base_sku: string;
  category_id: number;
  unit: string;
  package_size: number | null;
  iva: boolean;
  created_at: string;
  last_updated: string;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch variants for the product
        const variantsRes = await fetch(`/api/products/${productId}/variants`);
        if (!variantsRes.ok) throw new Error('Failed to fetch variants');
        const variantsData = await variantsRes.json();
        const mappedVariants: Variant[] = (variantsData.data || []).map((v: any) => ({
          id: v.id,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          is_active: v.is_active,
          suppliers: v.suppliers ? v.suppliers.map((s: any) => s.name) : [],
        }));
        setVariants(mappedVariants);

        // Fetch suppliers for the first variant (as an example)
        if (mappedVariants.length > 0) {
          const variantId = mappedVariants[0].id;
          const suppliersRes = await fetch(`/api/variants/${variantId}/suppliers`);
          if (!suppliersRes.ok) throw new Error('Failed to fetch suppliers');
          const suppliersData = await suppliersRes.json();
          const mappedSuppliers: Supplier[] = (suppliersData.data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            price: s.price || s.cost || 0,
            stock: s.stock,
            lead_time_days: s.lead_time_days,
            is_active: s.is_active,
          }));
          setSuppliers(mappedSuppliers);
        } else {
          setSuppliers([]);
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchData();
  }, [productId]);

  return (
    <div className="container mx-auto max-w-7xl xl:max-w-8xl 2xl:max-w-screen-2xl 3xl:max-w-9xl px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20 3xl:px-32">
      <h1 className="text-2xl font-bold mb-6">Product Detail</h1>
      <p className="mb-4">Product ID: {productId}</p>
      {loading ? (
        <div className="text-muted-foreground py-8">Loading...</div>
      ) : error ? (
        <div className="text-destructive py-8">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-7 gap-6">
          <div className="lg:col-span-2 xl:col-span-3 2xl:col-span-4 3xl:col-span-5">
            <VariantsTable variants={variants} />
          </div>
          <div className="lg:col-span-1 xl:col-span-1 2xl:col-span-1 3xl:col-span-2">
            <SuppliersTable suppliers={suppliers} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage; 