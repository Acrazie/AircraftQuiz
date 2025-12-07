import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

const MainLayout = () => {
    return (
        <div className="flex flex-col h-screen overflow-hidden pt-8 px-8">
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
            <div className="flex-none">
                <Navbar />
            </div>
        </div>
    );
};

export default MainLayout;