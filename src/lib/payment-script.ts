let loading: Promise<void> | null = null;

export function loadPaymentScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    let settled = false;
    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (error) { script.remove(); reject(new Error(error)); }
      else resolve();
    };
    const timer = window.setTimeout(() => finish("script_timeout"), 10000);
    script.onload = () => finish(window.Razorpay ? undefined : "script_missing");
    script.onerror = () => finish("script_blocked");
    document.head.appendChild(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
