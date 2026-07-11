import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, Button } from "../components/Common";
import { getCart, getCartTotal, createOrder, payOrder, PaymentMethod, PAYMENT_LABELS } from "../data/store";
import { useT } from "../i18n";

const CheckoutPage: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const cart = getCart();
  const total = getCartTotal();
  const [method, setMethod] = useState<PaymentMethod>("wechat");
  const [paid, setPaid] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // 银行卡表单
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const handlePay = () => {
    if (method === "bank" && (!cardNumber || !cardName || !cardCvv)) {
      alert(t("checkout.bankRequired", "请填写完整的银行卡信息"));
      return;
    }
    try {
      const order = createOrder(method);
      // DEMO: 模拟支付成功
      setTimeout(() => {
        payOrder(order.id);
        setOrderId(order.id);
        setPaid(true);
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (cart.length === 0 && !paid) {
    return (
      <PageContainer title={t("checkout.title", "结算")}>
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">{t("checkout.empty", "购物车为空，无法结算")}</p>
          <Button onClick={() => navigate("/market")}>{t("checkout.goShop", "去选购")}</Button>
        </div>
      </PageContainer>
    );
  }

  if (paid) {
    return (
      <PageContainer title={t("checkout.success", "支付成功")}>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t("checkout.successTitle", "支付成功！")}</h2>
          <p className="text-gray-500 mb-6">{t("checkout.orderNo", "订单号：{id}", { id: orderId })}</p>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-6">
            <p className="text-sm text-green-700">{t("checkout.paidAmount", "✅ 支付金额：")}<strong>¥{total.toLocaleString()}</strong></p>
            <p className="text-xs text-green-500 mt-1">{t("checkout.demoPaid", "⚠️ DEMO环境，未真实扣款")}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/market")} variant="outline">{t("checkout.continue", "继续选购")}</Button>
            <Button onClick={() => navigate("/hub")}>{t("checkout.backHome", "🏠 返回首页")}</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t("checkout.title", "结算")}>
      <div className="max-w-2xl mx-auto">
        {/* 订单摘要 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">{t("checkout.summary", "📋 订单摘要")}</h3>
          <div className="space-y-2 mb-4">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.icon} {item.name} × {item.quantity}</span>
                <span className="text-gray-800">¥{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="font-bold text-gray-800">{t("cart.total", "合计")}</span>
            <span className="font-bold text-primary-700 text-xl">¥{total.toLocaleString()}</span>
          </div>
        </div>

        {/* 支付方式 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">{t("checkout.payMethod", "💳 选择支付方式")}</h3>
          <div className="space-y-3">
            {(["wechat", "alipay", "bank"] as PaymentMethod[]).map(m => {
              const meta = PAYMENT_LABELS[m];
              return (
                <button key={m} onClick={() => setMethod(m)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    method === m ? "border-primary-400 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <span className="text-2xl">{meta.icon}</span>
                  <span className="font-medium text-gray-800">{meta.label}</span>
                  {method === m && <span className="ml-auto text-primary-600">✓</span>}
                </button>
              );
            })}
          </div>

          {/* 银行卡表单 */}
          {method === "bank" && (
            <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("checkout.cardNo", "卡号")}</label>
                <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                  placeholder={t("checkout.phCardNo", "请输入银行卡号")} maxLength={19}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("checkout.cardName", "持卡人姓名")}</label>
                <input type="text" value={cardName} onChange={e => setCardName(e.target.value)}
                  placeholder={t("checkout.phCardName", "请输入持卡人姓名")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("checkout.cvv", "CVV安全码")}</label>
                <input type="text" value={cardCvv} onChange={e => setCardCvv(e.target.value)}
                  placeholder={t("checkout.phCvv", "卡背面3位数字")} maxLength={4}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
            </div>
          )}
        </div>

        {/* 支付二维码（微信/支付宝） */}
        {method !== "bank" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6 text-center">
            <h3 className="font-bold text-gray-800 mb-4">
              {method === "wechat" ? t("checkout.wechatPay", "💚 微信扫码支付") : t("checkout.alipayPay", "💙 支付宝扫码支付")}
            </h3>
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-3 border-2 border-dashed border-gray-300">
              <div className="text-center">
                <span className="text-4xl">{method === "wechat" ? "💚" : "💙"}</span>
                <p className="text-xs text-gray-400 mt-2">{t("checkout.qrMock", "模拟二维码")}</p>
                <p className="text-[10px] text-gray-300">DEMO</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">{t("checkout.scanTip", "请使用{method}扫描二维码支付", { method: method === "wechat" ? t("checkout.wechat", "微信") : t("checkout.alipay", "支付宝") })}</p>
            <p className="text-[10px] text-amber-500 mt-1">{t("checkout.demoPayBtn", "⚠️ DEMO环境，点击下方按钮模拟支付成功")}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={() => navigate("/cart")} variant="outline">{t("checkout.backCart", "← 返回购物车")}</Button>
          <Button onClick={handlePay} size="lg">
            {method === "wechat" ? t("checkout.confirmWechat", "💚 确认微信支付") : method === "alipay" ? t("checkout.confirmAlipay", "💙 确认支付宝支付") : t("checkout.confirmBank", "🏦 确认银行卡支付")}
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          {t("checkout.demoNote", "⚠️ DEMO环境，所有支付均为模拟，不会真实扣款")}
        </p>
      </div>
    </PageContainer>
  );
};

export default CheckoutPage;
