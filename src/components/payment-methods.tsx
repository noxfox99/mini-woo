"use client";
import { useEffect } from "react";
import { fetchPaymentMethods, useAppContext } from "@/providers/context-provider"; // Import the function to fetch payment methods

export default function PaymentMethods() {
    const { state, dispatch } = useAppContext();

    // Fetch payment methods when the component loads
    useEffect(() => {
        fetchPaymentMethods(dispatch);
    }, []); // Empty dependency array to run only once when component mounts

    // Map over the payment methods to create UI elements for each method
    const items = state.paymentMethods.map((method) => (
        <div
            style={
                state.selectedPaymentMethod?.id === method.id
                    ? { backgroundColor: "var(--accent-color)" }
                    : {}
            }
            key={method.id}
            onClick={() => dispatch({ type: "select-payment-method", paymentMethod: method })}
        >
            <h3>{method.title}</h3>
            <p>{method.description}</p>
        </div>
    ));

    return <div className="payment-methods">{items}</div>;
}
