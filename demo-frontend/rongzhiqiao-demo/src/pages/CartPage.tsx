import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button } from "../components/Common";
import { getCart, removeFromCart, updateCartItemQuantity, clearCart, getCartTotal, CartItem } from "../data/store";

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(getCart());

  const refresh = () => setCart(getCart());

  const handleRemove = (id: string) => {
    removeFromCart(id);
    refresh();
  };

  const handleQtyChange = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (item) {
      updateCartItemQuantity(id, item.quantity + delta);
      refresh();
    }
  };

  const handleClear = () => {
    if (!window.confirm("确定清空购物车？")) return;
    clearCart();
    refresh();
  };

  const total = getCartTotal();

  return (
    <PageContainer title="购物车">
      <div className="max-w-3xl mx-auto">
        {cart.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-gray-500 mb-4">购物车是空的</p>
            <Button onClick={() => navigate("/market")} variant="outline">去逛逛产品市场</Button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">购物清单（{cart.length}项）</h3>
                <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-600">清空购物车</button>
              </div>
              <div className="divide-y divide-gray-50">
                {cart.map(item => (
                  <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">¥{item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleQtyChange(item.id, -1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 hover:border-primary-300 flex items-center justify-center text-gray-500 text-sm">
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => handleQtyChange(item.id, 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 hover:border-primary-300 flex items-center justify-center text-gray-500 text-sm">
                        +
                      </button>
                    </div>
                    <div className="text-right w-24">
                      <p className="font-bold text-primary-700 text-sm">¥{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleRemove(item.id)}
                      className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 合计 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
              <div className="flex items-center justify-between text-lg">
                <span className="font-bold text-gray-800">合计</span>
                <span className="font-bold text-primary-700 text-2xl">¥{total.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">价格不含税，正式版将自动计算税费</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate("/market")} variant="outline">← 继续选购</Button>
              <Button onClick={() => navigate("/checkout")} size="lg">💳 去结算</Button>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default CartPage;
