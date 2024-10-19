"use client";
import { useCallback, useEffect, useState } from "react";
import { useTelegram } from "@/providers/telegram-provider";
import { useAppContext } from "@/providers/context-provider";
import StoreFront from "@/components/store-front";
import OrderOverview from "@/components/order-overview";
import ProductOverview from "@/components/product-overview";
import PaymentMethods from "@/components/payment-methods"; // Import your PaymentMethods component
import { fetchPaymentMethods } from "@/lib/woo";

type PaymentMethod = {
    id: string;
    title: string;
    description: string;
};

export default function Home() {
    const { webApp, user } = useTelegram();
    const { state, dispatch } = useAppContext();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null); // Track the selected payment method
    const [showPaymentModal, setShowPaymentModal] = useState(false);

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
            paymentMethod: selectedPaymentMethod?.id ?? "default_payment_method", // Send selected payment method or a default
        });

        try {
            const res = await fetch("/api/orders", { method: "POST", body });
            const result = await res.json();

            if (invoiceSupported) {
                webApp?.openInvoice(result.invoice_link, function (status) {
                    webApp?.MainButton.hideProgress();
                    if (status === "paid") {
                        console.log("[paid] InvoiceStatus", result);
                        webApp?.close();
                    } else if (status === "failed") {
                        console.log("[failed] InvoiceStatus", result);
                        webApp?.HapticFeedback.notificationOccurred("error");
                    } else {
                        console.log("[unknown] InvoiceStatus", result);
                        webApp?.HapticFeedback.notificationOccurred("warning");
                    }
                });
            } else {
                webApp?.showAlert("Some features not available. Please update your Telegram app!");
            }
        } catch (error) {
            console.error("Error during checkout", error);
            webApp?.showAlert("An error occurred while processing the order!");
            webApp?.MainButton.hideProgress();
        }
    }, [webApp, state.cart, state.comment, state.shippingZone, selectedPaymentMethod]);

    // Fetch and display available payment methods
    const fetchAndShowPaymentMethods = useCallback(async () => {
        try {
            const methods = await fetchPaymentMethods(); // Fetch payment methods
            setPaymentMethods(methods); // Store payment methods in local state
            setShowPaymentModal(true); // Show the payment methods modal
            webApp?.MainButton.hideProgress();
        } catch (error) {
            console.error("Error fetching payment methods", error);
            webApp?.showAlert("Error fetching payment methods");
            webApp?.MainButton.hideProgress();
        }
    }, [dispatch, webApp]);

    const handlePaymentSelection = useCallback((method: PaymentMethod) => {
        setSelectedPaymentMethod(method); // Set the selected payment method
        setShowPaymentModal(false); // Hide the payment modal once selected
        handleCheckout(); // Proceed to the checkout process
    }, [handleCheckout]);

    useEffect(() => {
        const callback = state.mode === "order" ? fetchAndShowPaymentMethods : () => dispatch({ type: "order" });
        webApp?.MainButton.setParams({
            text_color: "#fff",
            color: "#31b545",
        }).onClick(callback);
        webApp?.BackButton.onClick(() => dispatch({ type: "storefront" }));
        return () => {
            webApp?.MainButton.offClick(callback); // Prevent multiple calls
        };
    }, [webApp, state.mode, fetchAndShowPaymentMethods]);

    useEffect(() => {
        if (state.mode === "storefront") {
            webApp?.BackButton.hide();
        } else {
            webApp?.BackButton.show();
        }

        if (state.mode === "order") {
            webApp?.MainButton.setText("CHECKOUT");
        } else {
            webApp?.MainButton.setText("VIEW ORDER");
        }
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

    return (
        <main className={`${state.mode}-mode`}>
            <StoreFront />
            <ProductOverview />
            <OrderOverview />
            
            {/* Show payment methods if modal is open */}
            {showPaymentModal && (
                <PaymentMethods 
                    methods={paymentMethods} 
                    onSelectMethod={handlePaymentSelection} 
                />
            )}
        </main>
    );
}
