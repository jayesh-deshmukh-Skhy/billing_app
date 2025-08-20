import React, { useState, useEffect } from 'react';
import { ShoppingBag, Users, Package, CreditCard, Plus, Search, Filter, ShoppingCart, Trash2, Edit, Eye, QrCode, X } from 'lucide-react';
import ProductManagement from './components/ProductManagement';
import BillingSystem from './components/BillingSystem';
import OrderHistory from './components/OrderHistory';

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
  image_url?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const tabs = [
    { id: 'billing', label: 'POS Billing', icon: CreditCard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductManagement products={products} onProductsChange={fetchProducts} />;
      case 'orders':
        return <OrderHistory />;
      default:
        return <BillingSystem products={products} onProductsChange={fetchProducts} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ClothCraft</h1>
                <p className="text-sm text-gray-500">Professional Billing System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{products.length}</div>
                  <div className="text-xs text-gray-500">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">₹{products.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Inventory Value</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;