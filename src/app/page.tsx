"use client"
import {useCallback, useEffect, useState} from "react";
import {useTelegram} from "@/providers/telegram-provider";
import {useAppContext} from "@/providers/context-provider";
import StoreFront from "@/components/store-front";
import CheckoutOrder from "@/components/checkout-order";
import OrderOverview from "@/components/order-overview";
import ProductOverview from "@/components/product-overview";
import fetch from 'node-fetch';

export default function Home() {
    const {webApp, user} = useTelegram();
    const {state, dispatch} = useAppContext();
    const [paymentMethods, setPaymentMethods] = useState([]);

    // Fetch payment methodfrom WooCommerce
    const fetchPaymentMethods = useCallback(async () => {
        try {
            const res = await fetch("/wp-json/wc/v3/payment_gateways", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${btoa(process.env.WOOCOMMERCE_CONSUMER_KEY + ':' + process.env.WOOCOMMERCE_CONSUMER_SECRET)}`
                }
            });
            if (res.ok) {
                const methods = await res.json();
                setPaymentMethods(methods); // Save payment methods to state
                console.log("Fetched payment methods: ", methods);
            } else {
                console.error("Failed to fetch payment methods");
            }
        } catch (error) {
            console.error("Error fetching payment methods:", error);
        }
    }, []);

    // Handle checkout process
    const handleCheckout = useCallback(async () => {
        console.log("checkout!");
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
            paymentMethod: state.selectedPaymentMethod, // Assuming you store selected payment method in state
        });

        try {
            const res = await fetch("api/orders", { method: "POST", body });
            const result = await res.json();
            if (invoiceSupported) {
                webApp?.showAlert("Order placed successfully!");
            } else {
                webApp?.showAlert("Some features not available. Please update your telegram app!");
            }
        } catch (_) {
            webApp?.showAlert("Some error occurred while processing the order!");
            webApp?.MainButton.hideProgress();
        }
    }, [webApp, state.cart, state.comment, state.shippingZone, state.selectedPaymentMethod]);

    useEffect(() => {
        const callback = state.mode === "order" ? handleCheckout :
            () => dispatch({ type: "order" });
        webApp?.MainButton.setParams({
            text_color: '#fff',
            color: '#31b545'
        }).onClick(callback);
        webApp?.BackButton.onClick(() => dispatch({ type: "storefront" }));
        return () => {
            // Prevent multiple call
            webApp?.MainButton.offClick(callback);
        }
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

    // Fetch payment methods when component mounts
    useEffect(() => {
        fetchPaymentMethods();
    }, [fetchPaymentMethods]);

    return (
        <main className={`${state.mode}-mode`}>
            <StoreFront />
            <ProductOverview />
            <OrderOverview />
            <CheckoutOrder />
        </main>
    );
}
