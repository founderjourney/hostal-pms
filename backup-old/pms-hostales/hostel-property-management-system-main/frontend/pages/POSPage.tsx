import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingCart, Plus, Minus, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

interface CartItem {
  product: any;
  quantity: number;
}

export function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedFolioId, setSelectedFolioId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => backend.products.list(),
  });

  const sellProductMutation = useMutation({
    mutationFn: ({ productId, quantity, folioId }: { productId: string; quantity: number; folioId: string }) =>
      backend.products.sell({ productId, quantity, folioId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Sale completed",
        description: "Product has been added to the folio.",
      });
    },
    onError: (error: any) => {
      console.error('Sale error:', error);
      toast({
        variant: "destructive",
        title: "Sale failed",
        description: error.message || "Failed to process the sale.",
      });
    },
  });

  const products = productsData?.products || [];
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prevCart.filter(item => item.product.id !== productId);
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const processOrder = async () => {
    if (!selectedFolioId) {
      toast({
        variant: "destructive",
        title: "No folio selected",
        description: "Please select a folio to charge the items to.",
      });
      return;
    }

    try {
      for (const item of cart) {
        await sellProductMutation.mutateAsync({
          productId: item.product.id,
          quantity: item.quantity,
          folioId: selectedFolioId,
        });
      }
      clearCart();
      setSelectedFolioId('');
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const categoryColors: Record<string, string> = {
    food: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    beverage: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    merchandise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    service: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Point of Sale
            </CardTitle>
            <CardDescription>Select products to add to cart</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-sm">{product.name}</h3>
                        <Badge className={categoryColors[product.category] || 'bg-gray-100 text-gray-800'}>
                          {product.category}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          ${product.price}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Stock: {product.stockQuantity}
                        </span>
                      </div>

                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cart</span>
              <span className="text-sm font-normal">
                {cart.reduce((total, item) => total + item.quantity, 0)} items
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Cart is empty
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.product.price} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(item.product)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complete Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Folio ID</label>
                <Input
                  placeholder="Enter folio ID..."
                  value={selectedFolioId}
                  onChange={(e) => setSelectedFolioId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Items will be charged to this guest's folio
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={processOrder}
                  disabled={!selectedFolioId || sellProductMutation.isPending}
                  className="w-full"
                >
                  {sellProductMutation.isPending ? "Processing..." : "Complete Sale"}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="w-full"
                >
                  Clear Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
