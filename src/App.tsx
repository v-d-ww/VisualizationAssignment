import { Routes, Route } from "react-router-dom";
import MapPage from "./pages/MapPage";
import MainPage from "./pages/MainPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/map/:adcode" element={<MapPage />} />
    </Routes>
  );
}

export default App;
