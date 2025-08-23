
export function createCheckoutFrame(apiBase: string, opts: { amount: number; currency: string }) {
  const iframe = document.createElement("iframe");
  iframe.src = `${apiBase}/checkout?amount=${opts.amount}&currency=${opts.currency}`;
  iframe.style.width = "100%";
  iframe.style.height = "600px";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  return iframe;
}


