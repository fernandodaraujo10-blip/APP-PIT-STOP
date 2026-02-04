
import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if app is already installed/standalone
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallBtn(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstallBtn(false);
    };

    if (!showInstallBtn) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
            <button
                onClick={handleInstallClick}
                className="bg-golden text-navy px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 border-2 border-white/50 backdrop-blur-md"
            >
                <Download size={14} className="animate-pulse" />
                Instalar App
            </button>
        </div>
    );
};
