import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical Application Error:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; text-align: center; margin-top: 50px;">
      <h2 style="color: #ef4444;">Ocorreu um problema ao carregar o app.</h2>
      <p style="color: #666;">Por favor, recarregue a página.</p>
      <pre style="background: #f3f4f6; padding: 10px; border-radius: 8px; text-align: left; overflow: auto; margin-top: 20px; font-size: 12px;">
        ${error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  `;
}