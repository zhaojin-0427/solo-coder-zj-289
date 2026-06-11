import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import StickerLibrary from './pages/StickerLibrary';
import TagManager from './pages/TagManager';
import Calendar from './pages/Calendar';
import CollageBoard from './pages/CollageBoard';
import Archive from './pages/Archive';
import Statistics from './pages/Statistics';
import Procurement from './pages/Procurement';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/stickers" replace />} />
        <Route path="stickers" element={<StickerLibrary />} />
        <Route path="tags" element={<TagManager />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="collage" element={<CollageBoard />} />
        <Route path="collage/:id" element={<CollageBoard />} />
        <Route path="archive" element={<Archive />} />
        <Route path="procurement" element={<Procurement />} />
        <Route path="statistics" element={<Statistics />} />
      </Route>
    </Routes>
  );
}

export default App;
