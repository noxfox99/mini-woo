'use client';

import {useCallback, useEffect, useState} from "react";
import {useTelegram} from "@/providers/telegram-provider";
import {useAppContext, fetchPaymentMethods} from "@/providers/context-provider"; // Import fetchPaymentMethods
import StoreFront from "@/components/store-front";
import OrderOverview from "@/components/order-overview";
import ProductOverview from "@/components/product-overview";

export default function Home() {
    const {webApp, user} = useTelegram();
    const {state, dispatch} = useAppContext();

    // State to manage payment methods and selected payment method
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Fetch and display payment methods during checkout
    const handleCheckout = useCallback(async () => {
        console.log("Fetching payment methods for checkout!");
        webApp?.MainButton.showProgress();

        // Fetch payment methods from WooCommerce
        try {
            fetchPaymentMethods(dispatch);
            const methods = state.paymentMethods;
            setPaymentMethods(methods); // Store payment methods in local state
            setShowPaymentModal(true); // Show the payment methods modal
            webApp?.MainButton.hideProgress();
        } catch (err) {
            console.error("Error fetching payment methods", err);
            webApp?.showAlert("Error fetching payment methods!");
            webApp?.MainButton.hideProgress();
        }
    }, [dispatch, state.paymentMethods, webApp]);

    // Process the order after payment method is selected
    const processOrder = useCallback(async () => {
        if (!selectedPaymentMethod) {
            webApp?.showAlert("Please select a payment method");
            return;
        }

        webApp?.MainButton.showProgress();
        const invoiceSupported = webApp?.isVersionAtLeast('6.1');
        const items = Array.from(state.cart.values()).map((item) => ({
            id: item.product.id,
            count: item.count
        }));
        const body = JSON.stringify({
            userId: user?.id,
            chatId: webApp?.initDataUnsafe.chat?.id,
            invoiceSupported,
            comment: state.comment,
            shippingZone: state.shippingZone,
            items,
            paymentMethod: selectedPaymentMethod.id // Send the selected payment method
        });

        try {
            const res = await fetch("api/orders", {method: "POST", body});
            const result = await res.json();

            if (invoiceSupported) {
                webApp?.openInvoice(result.invoice_link, function (status) {
                    webApp?.MainButton.hideProgress();
                    if (status === 'paid') {
                        webApp?.close();
                    } else if (status === 'failed') {
                        webApp?.HapticFeedback.notificationOccurred('error');
                    } else {
                        webApp?.HapticFeedback.notificationOccurred('warning');
                    }
                });
            } else {
                webApp?.showAlert("Some features are not available. Please update your Telegram app!");
            }
        } catch (_) {
            webApp?.showAlert("An error occurred while processing the order!");
            webApp?.MainButton.hideProgress();
        }
    }, [selectedPaymentMethod, webApp, state.cart, state.comment, state.shippingZone, user]);

    useEffect(() => {
        const callback = state.mode === "order" ? handleCheckout : () => dispatch({type: "order"});
        webApp?.MainButton.setParams({
            text_color: '#fff',
            color: '#31b545'
        }).onClick(callback);
        webApp?.BackButton.onClick(() => dispatch({type: "storefront"}));
        return () => {
            webApp?.MainButton.offClick(callback);
        };
    }, [webApp, state.mode, handleCheckout]);

    useEffect(() => {
        if (state.mode === "storefront")
            webApp?.BackButton.hide();
        else
            webApp?.BackButton.show();

        if (state.mode === "order")
            webApp?.MainButton.setText("CHECKOUT");
        else
            webApp?.MainButton.setText("VIEW ORDER");
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

    // Payment method modal content
    const PaymentMethodsModal = () => (
        <div className="payment-modal">
            <h2>Select Payment Method</h2>
            <ul>
                {paymentMethods.map((method) => (
                    <li key={method.id}>
                        <input
                            type="radio"
                            id={method.id}
                            name="paymentMethod"
                            value={method.id}
                            onChange={() => setSelectedPaymentMethod(method)}
                        />
                        <label htmlFor={method.id}>
                            {method.title} - {method.description}
                        </label>
                    </li>
                ))}
            </ul>
            <button onClick={processOrder}>Proceed with {selectedPaymentMethod?.title}</button>
        </div>
    );

    return (
        <main className={`${state.mode}-mode`}>
            <StoreFront/>
            <ProductOverview/>
            <OrderOverview/>
            {showPaymentModal && <PaymentMethodsModal />} {/* Show modal when payment methods are available */}
        </main>
    );
}
