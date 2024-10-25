"use client"
import { useCallback, useEffect, useState } from "react";
import { useTelegram } from "@/providers/telegram-provider";
import { useAppContext } from "@/providers/context-provider";
import StoreFront from "@/components/store-front";
import OrderOverview from "@/components/order-overview";
import ProductOverview from "@/components/product-overview";

export default function Home() {
    const { webApp, user } = useTelegram();
    const { state, dispatch } = useAppContext();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    const handleCheckout = useCallback(async () => {
        console.log("checkout!");
        webApp?.MainButton.showProgress();
        const invoiceSupported = webApp?.isVersionAtLeast("6.1");
        const items = Array.from(state.cart.values()).map((item) => ({
            id: item.product.id,
            count: item.count,
        }));
        const body = JSON.stringify({
            userId: user?.id,
            chatId: webApp?.initDataUnsafe.chat?.id,
            invoiceSupported,
            comment: state.comment,
            shippingZone: state.shippingZone,
            items,
        });

        try {
            const res = await fetch("api/orders", { method: "POST", body });
            const result = await res.json();

            if (invoiceSupported) {
                webApp?.openInvoice(result.invoice_link, function (status) {
                    webApp?.MainButton.hideProgress();
                    if (status === "paid") {
                        console.log("[paid] InvoiceStatus " + result);
                        webApp?.close();
                    } else if (status === "failed") {
                        console.log("[failed] InvoiceStatus " + result);
                        webApp?.HapticFeedback.notificationOccurred("error");
                    } else {
                        console.log("[unknown] InvoiceStatus" + result);
                        webApp?.HapticFeedback.notificationOccurred("warning");
                    }
                });
            } else {
                webApp?.showAlert("Некоторые функции недоступны. Пожалуйста, обновите ваше приложение Telegram!");
            }
        } catch (_) {
            webApp?.showAlert("Произошла ошибка при обработке заказа!");
            webApp?.MainButton.hideProgress();
        }
    }, [webApp, state.cart, state.comment, state.shippingZone, user?.id]);

    useEffect(() => {
        const callback = state.mode === "order" ? handleCheckout : () => dispatch({ type: "order" });
        webApp?.MainButton.setParams({
            text_color: "#fff",
            color: "#31b545",
        }).onClick(callback);
        webApp?.BackButton.onClick(() => dispatch({ type: "storefront" }));
        return () => {
            webApp?.MainButton.offClick(callback);
        };
    }, [webApp, state.mode, handleCheckout]);

    useEffect(() => {
        if (state.mode === "storefront") webApp?.BackButton.hide();
        else webApp?.BackButton.show();

        if (state.mode === "order") webApp?.MainButton.setText("ОФОРМИТЬ ЗАКАЗ");
        else webApp?.MainButton.setText("ПРОСМОТР ЗАКАЗА");
    }, [state.mode]);

    useEffect(() => {
        if (state.cart.size !== 0) {
            webApp?.MainButton.show();
            webApp?.enableClosingConfirmation();
        } else {
            webApp?.MainButton.hide();
            webApp?.disableClosingConfirmation();
        }
    }, [state.cart.size]);

    // Render payment methods with Russian labels and descriptions
    const renderPaymentMethods = () => (
        <div className="payment-methods">
            <h3>Выберите способ оплаты:</h3>
            <label className="payment-option">
                <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                />
                Кредитная карта - Оплатить с помощью кредитной карты
            </label>
            <label className="payment-option">
                <input
                    type="radio"
                    name="paymentMethod"
                    value="crypto"
                />
                Криптовалюта - Оплатить с помощью криптовалюты
            </label>
        </div>
    );

    return (
        <main className={`${state.mode}-mode`}>
            <StoreFront />
            <ProductOverview />
            <OrderOverview />
            {renderPaymentMethods()}
            {showPaymentForm && selectedPaymentMethod === "credit_card" && (
                <div className="payment-form credit-card-form">
                    <h4>Введите данные кредитной карты</h4>
                    <input type="text" placeholder="Номер карты" required />
                    <input type="text" placeholder="Срок действия (MM/ГГ)" required />
                    <input type="text" placeholder="CVC" required />
                </div>
            )}
            {showPaymentForm && selectedPaymentMethod === "crypto" && (
                <div className="payment-form crypto-form">
                    <h4>Детали криптовалютного платежа</h4>
                    <p>Отправьте оплату на следующий адрес кошелька:</p>
                    <p><strong>Адрес кошелька:</strong> [Ваш крипто-адрес]</p>
                </div>
            )}
        </main>
    );
}
