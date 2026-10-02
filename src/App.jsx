import { BrowserRouter, Routes, Route } from "react-router-dom";
import FeedbackProvider from "./components/feedback/FeedbackProvider";
import ScrollToTop from "./components/ScrollToTop";
import { ROUTES } from "./constants/routes";
import Home from "./pages/Home";
import Create from "./pages/Create";
import Join from "./pages/Join";
import Room from "./pages/Room";
import RoomSettings from "./pages/RoomSettings";
import NextRound from "./pages/NextRound";
import NotFound from "./pages/NotFound";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <FeedbackProvider>
        <ScrollToTop />
        <Routes>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.CREATE} element={<Create />} />
          <Route path="/join/:id" element={<Join />} />
          <Route path="/room/:id" element={<Room />} />
          <Route path="/room/:id/settings" element={<RoomSettings />} />
          <Route path="/room/:id/next" element={<NextRound />} />
          <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </FeedbackProvider>
    </BrowserRouter>
  );
}

export default App;
