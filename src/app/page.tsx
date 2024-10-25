"use client";
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

    // Static payment methods
    const paymentMethods = [
        { id: "credit_card", title: "Кредитная карта", description: "Оплатить с помощью кредитной карты" },
        { id: "crypto", title: "Криптовалюта", description: "Оплатить с помощью криптовалюты" }
    ];

    // Handle checkout process based on selected payment method
    const handleCheckout = useCallback(async () => {
        if (!selectedPaymentMethod) {
            webApp?.showAlert("Пожалуйста, выберите способ оплаты.");
            return;
        }

        const items = Array.from(state.cart.values()).map((item) => ({
            id: item.product.id,
            count: item.count
        }));
        const body = JSON.stringify({
            userId: user?.id,
            chatId: webApp?.initDataUnsafe.chat?.id,
            paymentMethod: selectedPaymentMethod,
            comment: state.comment,
            shippingZone: state.shippingZone,
            items
        });

        try {
            const res = await fetch("api/orders", { method: "POST", body });
            const result = await res.json();

            if (selectedPaymentMethod === "credit_card") {
                webApp?.showAlert("Пожалуйста, введите данные вашей кредитной карты.");
            } else if (selectedPaymentMethod === "crypto") {
                webApp?.showAlert("Пожалуйста, завершите оплату криптовалютой.");
            }
        } catch (_) {
            webApp?.showAlert("Произошла ошибка при обработке заказа!");
        }
    }, [webApp, state.cart, state.comment, state.shippingZone, selectedPaymentMethod]);


    // Render the payment methods as static selectable options
const renderPaymentMethods = () => (
    <div className="payment-methods">
        <h3>Выберите способ оплаты:</h3>
            {paymentMethods.map((method) => (
                <label key={method.id} className="payment-option">
                    <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        onChange={() => {
                            setSelectedPaymentMethod(method.id);
                            setShowPaymentForm(true);
                        }}
                    />
                    {method.title} - {method.description}
                </label>
            ))}
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
