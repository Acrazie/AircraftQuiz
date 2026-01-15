import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import AirCraftQuiz from "@/pages/AirCraftQuiz";
import About from "@/pages/About";
import Profile from "./pages/Profile";
import MainLayout from "./layouts/MainLayout";
import { usePageTitle } from "./hooks/usePageTitle";
import Login from "./pages/Login";
import Register from "./pages/Register";
function App() {
  usePageTitle("Mayday ! 911 !", "AeroQuiz");
  return (
    <Routes>
      {/* Parent */}
      <Route element={<MainLayout />}>
        {/* Children */}
        <Route path="/" element={<Home />} />
        <Route path="/aircraft-quiz" element={<AirCraftQuiz />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;
