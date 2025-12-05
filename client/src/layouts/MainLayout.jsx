import { Outlet } from "react-router";
import Navbar from "@/components/Navbar";

const MainLayout = () => {
    return (
        <div className="flex flex-col h-screen overflow-hidden">
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