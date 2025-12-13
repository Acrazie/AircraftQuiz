import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
// 1. Le composant "Model" (DOIT être à l'intérieur du Canvas)
const Model = () => {
    // Assure-toi que le fichier est bien dans /public/model_plane.glb
    const { scene } = useGLTF("/model_plane.glb");

    return (
        <primitive
            object={scene}
            scale={2} // Ajuste la taille si besoin
            position={[0, -1, 0]} // Centre le modèle
            rotation={[0, Math.PI / 4, 0]} // Une petite rotation sympa
        />
    );
};

// 2. Le composant Principal (Exporté)
const PlaneModel = ({ className }) => {
    return (
        // IMPORTANT : Il faut donner une hauteur (h-96) au conteneur, sinon le Canvas fait 0px
        <div className={`w-full h-full ${className}`}>
            <Canvas camera={{ position: [3,2,9], fov: 80 }}>
                {/* Lumières essentielles */}
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />

                {/* Environnement pour des reflets réalistes sur l'avion */}
                <Environment preset="city" />

                {/* Gestion du chargement asynchrone */}
                <Suspense fallback={null}>
                    <Model />
                </Suspense>

                {/* Contrôles pour tourner autour (Optionnel) */}
                <OrbitControls autoRotate enableZoom={false} />

                {/* Ombre au sol pour l'ancrage */}
                <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={10} blur={1.5} far={0.8} />
            </Canvas>
        </div>
    );
};

export default PlaneModel;
