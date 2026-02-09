import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Cloudinary Cloud Name:", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

// Global error handlers for visibility
window.addEventListener('error', e => {
  console.error('GLOBAL ERROR:', e.error || e.message || e);
  console.error('Error details:', { filename: e.filename, lineno: e.lineno, colno: e.colno });
});

window.addEventListener('unhandledrejection', e => {
  console.error('UNHANDLED REJECTION:', e.reason || e);
  if (e.reason?.stack) console.error('Stack:', e.reason.stack);
});

// Kill rogue service workers (stale JS = blank routes)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    if (regs.length > 0) {
      console.log('Unregistering', regs.length, 'service worker(s)');
      regs.forEach(r => r.unregister());
    }
  });
}

document.documentElement.setAttribute('data-premium', 'true');

createRoot(document.getElementById("root")!).render(<App />);
