import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, QrCode, User, Phone, CreditCard, Receipt, X } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discount: number;
  category: string;
  size: string;
  color: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface BillingSystemProps {
  products: Product[];
  onProductsChange: () => void;
}

const BillingSystem: React.FC<BillingSystemProps> = ({ products }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity === 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount / 100);
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      const discountedPrice = getDiscountedPrice(item.price, item.discount);
      return sum + (discountedPrice * item.quantity);
    }, 0);
    
    const totalDiscount = cart.reduce((sum, item) => {
      const discount = (item.price * item.discount / 100) * item.quantity;
      return sum + discount;
    }, 0);

    return {
      subtotal,
      totalDiscount,
      total: subtotal
    };
  };

  const generatePayment = async () => {
    if (cart.length === 0 || !customerName) return;

    const { total } = calculateTotals();
    
    try {
      // Create order first
      const orderResponse = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          items: cart,
          total_amount: total,
          discount_amount: calculateTotals().totalDiscount
        }),
      });

      const orderData = await orderResponse.json();
      
      // Generate QR code for payment
      const qrResponse = await fetch('http://localhost:3001/api/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          orderId: orderData.id
        }),
      });

      const qrData = await qrResponse.json();
      setQrCode(qrData.qrCode);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error generating payment:', error);
    }
  };

  const simulatePaymentSuccess = () => {
    setPaymentStatus('success');
    setTimeout(() => {
      setShowPaymentModal(false);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setQrCode('');
      setPaymentStatus('pending');
    }, 2000);
  };

  const { subtotal, totalDiscount, total } = calculateTotals();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Products</h2>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => {
              const discountedPrice = getDiscountedPrice(product.price, product.discount);
              const inCart = cart.find(item => item.id === product.id);
              const isOutOfStock = product.stock === 0;
              const canAddMore = !inCart || inCart.quantity < product.stock;

              return (
                <div
                  key={product.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isOutOfStock 
                      ? 'bg-gray-50 border-gray-200 opacity-60' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                  }`}
                  onClick={() => !isOutOfStock && canAddMore && addToCart(product)}
                >
                  <div className="mb-3">
                    <h3 className="font-medium text-gray-900 text-sm mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{product.category}</span>
                      <span>{product.size} • {product.color}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-emerald-600">₹{discountedPrice.toLocaleString()}</span>
                        {product.discount > 0 && (
                          <span className="text-xs text-gray-500 line-through ml-1">
                            ₹{product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs ${product.stock > 5 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {isOutOfStock ? 'Out of Stock' : `${product.stock} left`}
                      </span>
                    </div>
                  </div>
                  
                  {inCart && (
                    <div className="flex items-center justify-between bg-blue-50 -m-4 mt-2 p-2 rounded-b-lg">
                      <span className="text-sm text-blue-700">In cart: {inCart.quantity}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        disabled={!canAddMore}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart & Billing */}
      <div className="space-y-6">
        {/* Customer Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Customer Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart ({cart.length} items)
            </span>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
          </h3>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items in cart</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item) => {
                const discountedPrice = getDiscountedPrice(item.price, item.discount);
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span>{item.size} • {item.color}</span>
                        <span>₹{discountedPrice.toLocaleString()} each</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 py-1 text-sm font-medium min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="p-1 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bill Summary */}
        {cart.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Summary</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>₹{(subtotal + totalDiscount).toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{totalDiscount.toLocaleString()}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={generatePayment}
              disabled={!customerName || cart.length === 0}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Generate Payment QR</span>
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentStatus === 'pending' && (
              <div className="text-center">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900 mb-2">₹{total.toLocaleString()}</div>
                  <p className="text-gray-600">Scan QR code to pay</p>
                </div>
                
                {qrCode && (
                  <div className="mb-6">
                    <img src={qrCode} alt="Payment QR Code" className="mx-auto w-48 h-48" />
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={simulatePaymentSuccess}
                    className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Simulate Payment Success
                  </button>
                  
                  <p className="text-xs text-gray-500">
                    In production, payment status will be updated automatically
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-xl font-bold text-emerald-600 mb-2">Payment Successful!</h4>
                <p className="text-gray-600">Transaction completed successfully</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSystem;