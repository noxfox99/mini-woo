"use client";
import { useState } from "react";
import StoreFront from "@/components/store-front";
import OrderOverview from "@/components/order-overview";
import ProductOverview from "@/components/product-overview";

export default function Home() {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    // Static payment methods
    const paymentMethods = [
        { id: "credit_card", title: "Кредитная карта", description: "Оплатить с помощью кредитной карты" },
        { id: "crypto", title: "Криптовалюта", description: "Оплатить с помощью криптовалюты" }
    ];

    // Function to render the payment methods as selectable options
    const renderPaymentMethods = () => (
        <div className="payment-methods">
            <h3>Выберите способ оплаты:</h3>
            {paymentMethods.map((method) => (
                <label key={method.id} className="payment-option">
                    <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                    />
                    {method.title} - {method.description}
                </label>
            ))}
        </div>
    );

    return (
        <main>
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
