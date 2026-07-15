import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerBuiltins } from './plugins/builtins'
import { loadInstalledPlugins } from './plugins/loader'

registerBuiltins();
// Installed plugins register asynchronously; the palette updates live.
loadInstalledPlugins();

createRoot(document.getElementById("root")!).render(<App />);
