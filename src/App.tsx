import { Routes, Route, Navigate } from "react-router-dom";
import MapPage from "./pages/MapPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/map/100000" replace />} />
      <Route path="/map/:adcode" element={<MapPage />} />
    </Routes>
  );
}

export default App;
