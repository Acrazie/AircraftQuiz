import "./App.css";
import Navbar from "./components/Navbar";

function App() {
  return (
    <>
      <div className="flex flex-col h-screen">
        <div className="flex-8">{/* Main content*/}</div>
        <Navbar />
      </div>
    </>
  );
}

export default App;
