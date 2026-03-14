import { lazy, Suspense } from "react";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import { usePageTitle } from "./hooks/usePageTitle";

const Home = lazy(() => import("@/pages/Home"));
const AirCraftQuiz = lazy(() => import("@/pages/AirCraftQuiz"));
const About = lazy(() => import("@/pages/About"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Quizzes = lazy(() => import("@/pages/Quizzes"));

const LoadingFallback = () => (
  <div className="h-screen flex items-center justify-center">
    <span className="loading loading-spinner loading-lg" />
  </div>
);

function App() {
  usePageTitle("Mayday ! 911 !", "AeroQuiz");
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Parent */}
        <Route element={<MainLayout />}>
          {/* Children */}
          <Route path="/" element={<Home />} />
          <Route path="/aircraft-quiz" element={<AirCraftQuiz />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/quizzes" element={<Quizzes />} />

          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
