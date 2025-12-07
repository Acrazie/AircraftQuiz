import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import AirCraftQuiz from "@/pages/AirCraftQuiz";
import MainLayout from "./layouts/MainLayout";
import { usePageTitle } from "./hooks/usePageTitle";

function App() {

    usePageTitle("Mayday ! 911 !", "AeroQuiz");
    return (
        <Routes>
            {/* Parent */}
            <Route element={<MainLayout />}>
                {/* Children */}
                <Route path="/" element={<Home />} />
                <Route path="/aircraft-quiz" element={<AirCraftQuiz />} />
            </Route>
        </Routes>
    );
}

export default App;
