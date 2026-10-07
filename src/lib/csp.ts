/** Public and checkout documents share provider permissions because navigation can be client-side. */
export function contentSecurityPolicy({nonce, storageOrigin = "", development = false}: {nonce?: string; storageOrigin?: string; development?: boolean}) {
  const scripts = nonce ? `'nonce-${nonce}'` : "'unsafe-inline'";
  const devScripts = development ? " 'unsafe-eval'" : "";
  const devConnections = development ? " ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*" : "";
  return `default-src 'self'; script-src 'self' ${scripts}${devScripts} https://checkout.razorpay.com https://api.razorpay.com https://cdn.razorpay.com; style-src 'self' 'unsafe-inline' https://checkout.razorpay.com; img-src 'self' data: ${storageOrigin} https://checkout.razorpay.com https://cdn.razorpay.com; font-src 'self' https://checkout.razorpay.com; connect-src 'self' ${storageOrigin} https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com${devConnections}; frame-src https://api.razorpay.com https://checkout.razorpay.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://api.razorpay.com`;
}
