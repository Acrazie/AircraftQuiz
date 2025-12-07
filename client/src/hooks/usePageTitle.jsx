import { useEffect } from "react";

export const usePageTitle = (awayMessage = "✈️ Reviens pilote !", defaultTitle = "Aircraft Quiz") => {
    useEffect(() => {
        const handleVisibilityChange = () => {
            // Si l'utilisateur quitte l'onglet (l'onglet est caché)
            if (document.hidden) {
                document.title = awayMessage;
            } else {
                // Si l'utilisateur revient
                document.title = defaultTitle;
            }
        };

        // On écoute l'événement du navigateur
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Nettoyage quand le composant est détruit
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.title = defaultTitle;
        };
    }, [awayMessage, defaultTitle]);
};
