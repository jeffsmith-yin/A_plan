import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button, DemoBadge } from "../components/Common";
import { getDemoProducts, addToCart, getCartCount, Product, ProductRegion, REGION_LABELS, markNDASigned, hasSignedNDA, searchProducts, getProductsSortedByPrice, getProductsSortedByPopularity } from "../data/store";

const MarketPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeRegion, setActiveRegion] = useState<ProductRegion>("demo");
  const [addedMsg, setAddedMsg] = useState<string | null>(null);
  const [showNDA, setShowNDA] = useState(false);
  const [ndaAgree, setNdaAgree] = useState(false);
  const [ndaName, setNdaName] = useState("");
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortMode, setSortMode] = useState<"default" | "price" | "popularity">("default");
  const allProducts = getDemoProducts();

  let regionProducts = allProducts.filter(p => p.region === activeRegion);
  // 搜索过滤
  if (searchKeyword) {
    regionProducts = searchProducts(searchKeyword).filter(p => p.region === activeRegion);
  }
  // 排序
  if (sortMode === "price") {
    regionProducts = [...regionProducts].sort((a, b) => a.salePrice - b.salePrice);
  } else if (sortMode === "popularity") {
    regionProducts = [...regionProducts].sort((a, b) => a.id.localeCompare(b.id));
  }
  const cartCount = getCartCount();

  const handleAddToCart = (product: Product) => {
    // DEMO区产品：先签NDA
    if (product.region === "demo" && !hasSignedNDA()) {
      setPendingProduct(product);
      setShowNDA(true);
      return;
    }
    addToCart(product);
    setAddedMsg(`"${product.name}" 已加入购物车`);
    setTimeout(() => setAddedMsg(null), 2000);
  };

  const handleSignNDA = () => {
    if (!ndaAgree || !ndaName.trim()) { alert("请勾选同意并输入姓名"); return; }
    markNDASigned();
    setShowNDA(false);
    if (pendingProduct) {
      addToCart(pendingProduct);
      setAddedMsg(`"${pendingProduct.name}" 已加入购物车（NDA已签署）`);
      setTimeout(() => setAddedMsg(null), 2000);
      setPendingProduct(null);
    }
    setNdaAgree(false);
    setNdaName("");
  };

  const REGION_TABS: Array<{ key: ProductRegion; label: string; icon: string; desc: string }> = [
    { key: "demo", label: "DEMO区", icon: "🧪", desc: "免费试用体验" },
    { key: "product", label: "产品区", icon: "📦", desc: "AI解决方案" },
    { key: "skill", label: "技能区", icon: "🔧", desc: "专家技能包" },
    { key: "course", label: "课件区", icon: "📚", desc: "培训课程" },
  ];

  return (
    <PageContainer title="产品市场">
      <div className="max-w-5xl mx-auto">
        {/* 购物车快捷入口 */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">选择您需要的产品和服务，加入购物车统一结算</p>
          <button onClick={() => navigate("/cart")}
            className="relative flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 transition-all text-sm font-medium">
            🛒 购物车
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* 搜索 + 排序 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input type="text" value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="🔍 搜索产品、标签..."
                className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none" />
              <span className="absolute left-3 top-2 text-gray-400">🔍</span>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
              <button onClick={() => setSortMode("default")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortMode === "default" ? "bg-white shadow text-primary-700" : "text-gray-500"
                }`}>默认</button>
              <button onClick={() => setSortMode("price")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortMode === "price" ? "bg-white shadow text-primary-700" : "text-gray-500"
                }`}>💰 价格</button>
              <button onClick={() => setSortMode("popularity")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortMode === "popularity" ? "bg-white shadow text-primary-700" : "text-gray-500"
                }`}>🔥 热度</button>
            </div>
          </div>
          {searchKeyword && (
            <p className="text-xs text-gray-400 mt-2">
              搜索「{searchKeyword}」：{regionProducts.length} 个结果
            </p>
          )}
        </div>

        {/* 区域Tab */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {REGION_TABS.map(tab => {
            const meta = REGION_LABELS[tab.key];
            const count = allProducts.filter(p => p.region === tab.key).length;
            return (
              <button key={tab.key} onClick={() => setActiveRegion(tab.key)}
                className={`rounded-2xl p-4 border transition-all text-left ${
                  activeRegion === tab.key
                    ? "bg-white border-primary-400 shadow-lg shadow-primary-100"
                    : "bg-white border-gray-200 hover:border-primary-300 hover:shadow-md"
                }`}>
                <div className="text-2xl mb-1">{tab.icon}</div>
                <div className={`font-bold text-sm ${activeRegion === tab.key ? "text-primary-700" : "text-gray-700"}`}>
                  {tab.label}
                </div>
                <div className="text-[10px] text-gray-400">{tab.desc}</div>
                <div className={`text-xs mt-1 ${activeRegion === tab.key ? "text-primary-500" : "text-gray-400"}`}>
                  {count}个产品
                </div>
              </button>
            );
          })}
        </div>

        {/* 添加成功提示 */}
        {addedMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-pulse text-center">
            ✅ {addedMsg}
          </div>
        )}

        {/* 产品列表 */}
        {regionProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400">该区域暂无产品</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {regionProducts.map(product => (
              <div key={product.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{product.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">{product.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-gray-400">提供者：{product.provider}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {product.tags.map(t => (
                      <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {product.price === 0 ? (
                        <span className="text-lg font-bold text-green-600">免费</span>
                      ) : (
                        <div>
                          <span className="text-lg font-bold text-primary-700">¥{product.salePrice.toLocaleString()}</span>
                          {product.salePrice < product.price && (
                            <span className="text-xs text-gray-400 line-through ml-2">¥{product.price.toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button onClick={() => handleAddToCart(product)} size="sm">
                      🛒 加入购物车
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <span>🛒</span> 购物流程说明
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="bg-white rounded-lg px-3 py-2 border">选择产品</span>
            <span>→</span>
            <span className="bg-white rounded-lg px-3 py-2 border">DEMO区先签NDA</span>
            <span>→</span>
            <span className="bg-white rounded-lg px-3 py-2 border">加入购物车</span>
            <span>→</span>
            <span className="bg-white rounded-lg px-3 py-2 border">确认订单</span>
            <span>→</span>
            <span className="bg-white rounded-lg px-3 py-2 border">完成支付</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">⚠️ DEMO环境，所有支付均为模拟，不会真实扣款。DEMO区产品需先签署保密协议。</p>
        </div>

        {/* NDA 签署弹窗 */}
        {showNDA && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold text-lg text-gray-800 mb-2">🔒 保密协议 (NDA)</h3>
              <p className="text-sm text-gray-500 mb-4">购买DEMO产品前，请先阅读并签署保密协议</p>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-xs text-gray-600 leading-relaxed space-y-2">
                <p className="font-bold text-gray-700">融智桥平台 DEMO 保密协议</p>
                <p><strong>第一条</strong> 本协议适用于平台所有DEMO产品的试用和使用。参与方包括平台方、行业专家、AI人才和企业客户代表。</p>
                <p><strong>第二条</strong> 各方在DEMO期间接触到的技术方案、商业数据、客户信息等均属保密范围，不得向第三方泄露。</p>
                <p><strong>第三条</strong> DEMO数据均为演示用模拟数据，不代表任何真实企业或个人数据。参与方不得将DEMO内容用于商业宣传或对外展示。</p>
                <p><strong>第四条</strong> 违反保密义务的参与方将被立即移出平台，平台方保留追究法律责任的权利。</p>
                <p><strong>第五条</strong> DEMO到期后，参与方需删除本地存储的DEMO相关数据。如需续期，由企业客户与平台方另行约定。</p>
              </div>

              <div className="mb-4">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={ndaAgree} onChange={e => setNdaAgree(e.target.checked)}
                    className="mt-0.5" />
                  <span className="text-sm text-gray-700">我已阅读并同意保密协议的全部条款</span>
                </label>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">签署人姓名</label>
                <input type="text" value={ndaName} onChange={e => setNdaName(e.target.value)}
                  placeholder="请输入您的姓名" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-200" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowNDA(false); setPendingProduct(null); }}
                  className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                  取消
                </button>
                <button onClick={handleSignNDA}
                  disabled={!ndaAgree || !ndaName.trim()}
                  className="flex-1 py-2.5 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium">
                  签署并继续
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default MarketPage;
