import { Outlet } from "react-router";
import Navbar from "./Navbar";

const Layout = () => {
    return (
        <div>
            <Navbar/>

            <main>
                <Outlet/>
            </main>

            
        </div>
    )
}