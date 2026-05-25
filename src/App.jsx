import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ROUTES } from "./constants/routes";
import Home from "./pages/Home";
import Create from "./pages/Create";
import Join from "./pages/Join";
import Room from "./pages/Room";
import NotFound from "./pages/NotFound";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.CREATE} element={<Create />} />
        <Route path="/join/:id" element={<Join />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
