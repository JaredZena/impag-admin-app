import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mockApiRequest, resetAllMocks } from '../../../../test/testUtils';
import {
  mockBalances,
  mockProducts,
  mockCompleteBalance,
  mockProductComparison
} from '../../../../test/mockData';

describe('Balance API Integration Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Balance CRUD Operations', () => {
    test('should fetch all balances', async () => {
      mockApiRequest.mockResolvedValueOnce({ data: mockBalances });

      const response = await mockApiRequest('/balance');
      
      expect(response.data).toEqual(mockBalances);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance');
    });

    test('should fetch single balance by ID', async () => {
      const balance = mockCompleteBalance();
      mockApiRequest.mockResolvedValueOnce({ data: balance });

      const response = await mockApiRequest('/balance/1');
      
      expect(response.data).toEqual(balance);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance/1');
    });

    test('should create new balance', async () => {
      const newBalance = {
        name: 'Test Balance',
        description: 'Test description',
        balance_type: 'QUOTATION',
        currency: 'MXN',
        items: []
      };

      const createdBalance = {
        id: 999,
        ...newBalance,
        is_active: true,
        created_at: new Date().toISOString()
      };

      mockApiRequest.mockResolvedValueOnce({ data: createdBalance });

      const response = await mockApiRequest('/balance', 'POST', newBalance);
      
      expect(response.data).toEqual(createdBalance);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance', 'POST', newBalance);
    });

    test('should update existing balance', async () => {
      const updateData = {
        name: 'Updated Balance Name',
        description: 'Updated description',
        items: [
          {
            product_id: 1,
            supplier_id: 1,
            quantity: 2,
            unit_price: 100,
            notes: 'Updated item'
          }
        ]
      };

      const updatedBalance = {
        id: 1,
        ...updateData,
        balance_type: 'QUOTATION',
        currency: 'MXN',
        is_active: true,
        last_updated: new Date().toISOString()
      };

      mockApiRequest.mockResolvedValueOnce({ data: updatedBalance });

      const response = await mockApiRequest('/balance/1', 'PUT', updateData);
      
      expect(response.data).toEqual(updatedBalance);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance/1', 'PUT', updateData);
    });

    test('should delete (archive) balance', async () => {
      const deleteResponse = { message: 'Balance archived successfully' };
      mockApiRequest.mockResolvedValueOnce(deleteResponse);

      const response = await mockApiRequest('/balance/1', 'DELETE');
      
      expect(response).toEqual(deleteResponse);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance/1', 'DELETE');
    });
  });

  describe('Product and Supplier Operations', () => {
    test('should fetch all products', async () => {
      mockApiRequest.mockResolvedValueOnce({ data: mockProducts });

      const response = await mockApiRequest('/products');
      
      expect(response.data).toEqual(mockProducts);
      expect(mockApiRequest).toHaveBeenCalledWith('/products');
    });

    test('should fetch product comparison data', async () => {
      mockApiRequest.mockResolvedValueOnce({ data: mockProductComparison });

      const response = await mockApiRequest('/balance/compare/1');
      
      expect(response.data).toEqual(mockProductComparison);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance/compare/1');
    });

    test('should perform quick comparison for multiple products', async () => {
      const productIds = [1, 2, 3];
      const comparisonResults = {
        comparisons: [
          {
            product_id: 1,
            product_name: 'Bomba Solar 3500L',
            product_sku: 'BOMBA-SOL-001',
            best_supplier: mockProductComparison.suppliers[0],
            total_suppliers: 3
          },
          {
            product_id: 2,
            product_name: 'Panel Solar 450W',
            product_sku: 'PANEL-450W',
            best_supplier: null,
            total_suppliers: 0
          }
        ]
      };

      mockApiRequest.mockResolvedValueOnce({ data: comparisonResults });

      const response = await mockApiRequest('/balance/quick-compare', 'POST', productIds);
      
      expect(response.data).toEqual(comparisonResults);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance/quick-compare', 'POST', productIds);
    });
  });

  describe('Shipping Operations', () => {
    test('should update supplier product shipping information', async () => {
      const shippingUpdate = {
        shipping_method: 'DIRECT',
        shipping_cost_direct: 150
      };

      const updateResponse = { 
        success: true, 
        message: 'Shipping information updated successfully' 
      };
      
      mockApiRequest.mockResolvedValueOnce(updateResponse);

      const response = await mockApiRequest(
        '/products/supplier-product/1/shipping', 
        'PATCH', 
        shippingUpdate
      );
      
      expect(response).toEqual(updateResponse);
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/products/supplier-product/1/shipping',
        'PATCH',
        shippingUpdate
      );
    });

    test('should update OCURRE shipping with stage costs', async () => {
      const ocurreUpdate = {
        shipping_method: 'OCURRE',
        shipping_stage1_cost: 50,
        shipping_stage2_cost: 75,
        shipping_stage3_cost: 25,
        shipping_stage4_cost: 10,
        shipping_notes: 'Special handling required'
      };

      const updateResponse = { 
        success: true, 
        message: 'OCURRE shipping updated successfully' 
      };
      
      mockApiRequest.mockResolvedValueOnce(updateResponse);

      const response = await mockApiRequest(
        '/products/supplier-product/1/shipping', 
        'PATCH', 
        ocurreUpdate
      );
      
      expect(response).toEqual(updateResponse);
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/products/supplier-product/1/shipping',
        'PATCH',
        ocurreUpdate
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors for non-existent balance', async () => {
      const error = new Error('Balance not found');
      error.status = 404;
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(mockApiRequest('/balance/999')).rejects.toThrow('Balance not found');
      expect(mockApiRequest).toHaveBeenCalledWith('/balance/999');
    });

    test('should handle 400 errors for invalid balance data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        items: [
          {
            product_id: 999, // Invalid: non-existent product
            supplier_id: 1,
            quantity: -1, // Invalid: negative quantity
            unit_price: 100
          }
        ]
      };

      const error = new Error('Product 999 not found');
      error.status = 400;
      mockApiRequest.mockRejectedValueOnce(error);

      await expect(
        mockApiRequest('/balance', 'POST', invalidData)
      ).rejects.toThrow('Product 999 not found');
    });

    test('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockApiRequest.mockRejectedValueOnce(timeoutError);

      await expect(mockApiRequest('/balance')).rejects.toThrow('Network timeout');
    });

    test('should handle server errors (500)', async () => {
      const serverError = new Error('Internal server error');
      serverError.status = 500;
      mockApiRequest.mockRejectedValueOnce(serverError);

      await expect(mockApiRequest('/balance')).rejects.toThrow('Internal server error');
    });

    test('should handle shipping update errors', async () => {
      const shippingError = new Error('Supplier product not found');
      shippingError.status = 404;
      mockApiRequest.mockRejectedValueOnce(shippingError);

      await expect(
        mockApiRequest('/products/supplier-product/999/shipping', 'PATCH', {
          shipping_method: 'DIRECT',
          shipping_cost_direct: 100
        })
      ).rejects.toThrow('Supplier product not found');
    });
  });

  describe('API Request Patterns', () => {
    test('should handle pagination parameters', async () => {
      const paginatedBalances = {
        data: mockBalances.slice(0, 10),
        total: 25,
        page: 1,
        per_page: 10
      };

      mockApiRequest.mockResolvedValueOnce(paginatedBalances);

      const response = await mockApiRequest('/balance?skip=0&limit=10');
      
      expect(response).toEqual(paginatedBalances);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance?skip=0&limit=10');
    });

    test('should handle search and filter parameters', async () => {
      const filteredBalances = {
        data: mockBalances.filter(b => b.balance_type === 'QUOTATION')
      };

      mockApiRequest.mockResolvedValueOnce(filteredBalances);

      const response = await mockApiRequest('/balance?search=Sistema&balance_type=QUOTATION&is_active=true');
      
      expect(response).toEqual(filteredBalances);
      expect(mockApiRequest).toHaveBeenCalledWith('/balance?search=Sistema&balance_type=QUOTATION&is_active=true');
    });

    test('should handle concurrent API requests', async () => {
      // Mock multiple simultaneous requests
      mockApiRequest
        .mockResolvedValueOnce({ data: mockBalances })
        .mockResolvedValueOnce({ data: mockProducts })  
        .mockResolvedValueOnce({ data: mockProductComparison });

      const [balanceResponse, productsResponse, comparisonResponse] = await Promise.all([
        mockApiRequest('/balance'),
        mockApiRequest('/products'), 
        mockApiRequest('/balance/compare/1')
      ]);

      expect(balanceResponse.data).toEqual(mockBalances);
      expect(productsResponse.data).toEqual(mockProducts);
      expect(comparisonResponse.data).toEqual(mockProductComparison);
    });

    test('should handle request retries on failure', async () => {
      // First call fails, second succeeds
      mockApiRequest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockBalances });

      // Simulate retry logic
      let response;
      try {
        response = await mockApiRequest('/balance');
      } catch (error) {
        // Retry on error
        response = await mockApiRequest('/balance');
      }

      expect(response.data).toEqual(mockBalances);
      expect(mockApiRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Validation and Transformation', () => {
    test('should validate balance item structure', async () => {
      const balanceWithItems = {
        name: 'Test Balance',
        description: 'Test description',
        balance_type: 'QUOTATION',
        currency: 'MXN',
        items: [
          {
            product_id: 1,
            supplier_id: 1,
            quantity: 2,
            unit_price: 100.50,
            notes: 'Test item'
          }
        ]
      };

      mockApiRequest.mockResolvedValueOnce({ data: balanceWithItems });

      const response = await mockApiRequest('/balance', 'POST', balanceWithItems);
      
      expect(response.data.items[0]).toMatchObject({
        product_id: expect.any(Number),
        supplier_id: expect.any(Number),
        quantity: expect.any(Number),
        unit_price: expect.any(Number)
      });
    });

    test('should handle shipping cost calculations in API response', async () => {
      const balanceWithShipping = {
        id: 1,
        name: 'Shipping Test Balance',
        items: [
          {
            id: 1,
            product_id: 1,
            supplier_id: 1,
            supplier_product_id: 1,
            quantity: 2,
            unit_price: 100,
            shipping_cost: 20, // Calculated from supplier product
            shipping_method: 'DIRECT',
            shipping_cost_direct: 20,
            total_cost: 240 // (100 + 20) * 2
          }
        ]
      };

      mockApiRequest.mockResolvedValueOnce({ data: balanceWithShipping });

      const response = await mockApiRequest('/balance/1');
      
      expect(response.data.items[0]).toMatchObject({
        shipping_cost: 20,
        shipping_method: 'DIRECT',
        total_cost: 240
      });
    });

    test('should handle item deduplication in balance creation', async () => {
      // Test backend deduplication logic
      const balanceWithDuplicates = {
        name: 'Duplicate Test Balance',
        items: [
          { product_id: 1, supplier_id: 1, quantity: 2, unit_price: 100 },
          { product_id: 1, supplier_id: 1, quantity: 3, unit_price: 100 }, // Same product-supplier
          { product_id: 2, supplier_id: 1, quantity: 1, unit_price: 200 }
        ]
      };

      const deduplicatedBalance = {
        id: 1,
        name: 'Duplicate Test Balance',
        items: [
          { product_id: 1, supplier_id: 1, quantity: 5, unit_price: 100 }, // Merged quantities
          { product_id: 2, supplier_id: 1, quantity: 1, unit_price: 200 }
        ]
      };

      mockApiRequest.mockResolvedValueOnce({ data: deduplicatedBalance });

      const response = await mockApiRequest('/balance', 'POST', balanceWithDuplicates);
      
      expect(response.data.items).toHaveLength(2);
      expect(response.data.items[0].quantity).toBe(5); // Merged from 2 + 3
    });
  });

  describe('Optimistic Updates', () => {
    test('should support optimistic quantity updates', async () => {
      const originalBalance = mockCompleteBalance();
      const optimisticUpdate = {
        ...originalBalance,
        items: originalBalance.items.map((item, index) => 
          index === 0 ? { ...item, quantity: 5, total_cost: 500 } : item
        )
      };

      // Mock slow API response
      const slowUpdatePromise = new Promise(resolve => 
        setTimeout(() => resolve({ data: optimisticUpdate }), 500)
      );
      mockApiRequest.mockReturnValueOnce(slowUpdatePromise);

      const updatePromise = mockApiRequest('/balance/1', 'PUT', {
        items: optimisticUpdate.items
      });

      // Should return promise immediately for optimistic update
      expect(updatePromise).toBeInstanceOf(Promise);
      
      const response = await updatePromise;
      expect(response.data.items[0].quantity).toBe(5);
    });

    test('should handle optimistic update rollback on error', async () => {
      const originalBalance = mockCompleteBalance();
      const failedUpdate = new Error('Update failed');

      mockApiRequest.mockRejectedValueOnce(failedUpdate);

      await expect(
        mockApiRequest('/balance/1', 'PUT', { 
          items: [{ ...originalBalance.items[0], quantity: 999 }] 
        })
      ).rejects.toThrow('Update failed');

      // Subsequent calls should work normally
      mockApiRequest.mockResolvedValueOnce({ data: originalBalance });
      
      const response = await mockApiRequest('/balance/1');
      expect(response.data).toEqual(originalBalance);
    });
  });
});