import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ArchivesLayout from './archives/ArchivesLayout'
import ActesPage from './archives/pages/ActesPage'
import ActePage from './archives/pages/ActePage'
import RegistresPage from './archives/pages/RegistresPage'
import RegistrePage from './archives/pages/RegistrePage'
import HomePage from './pages/HomePage'
import ArchivesPage from './pages/ArchivesPage'
import BrowserPage from './pages/BrowserPage'
import FichesPage from './pages/FichesPage'
import FichePage from './pages/FichePage'
import DocumentPage from './pages/DocumentPage'
import AlbumsPage from './pages/AlbumsPage'
import PersonsPage from './pages/PersonsPage'
import PersonPage from './pages/PersonPage'
import SearchPage from './pages/SearchPage'
import AboutPage from './pages/AboutPage'
import TagsPage from './pages/TagsPage'
import TimelinePage from './pages/TimelinePage'
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="archives" element={<ArchivesPage />} />
          <Route path="archives/:archiveId/browser" element={<BrowserPage />} />
          <Route path="archives/:archiveId/fiches" element={<FichesPage />} />
          <Route path="archives/:archiveId/fiches/:ficheId" element={<FichePage />} />
          <Route path="archives/:archiveId/documents/:docId" element={<DocumentPage />} />
          <Route path="archives/:archiveId/albums" element={<AlbumsPage />} />
          <Route path="archives/:archiveId/timeline" element={<TimelinePage />} />
          <Route path="archives/:archiveId/persons" element={<PersonsPage />} />
          <Route path="archives/:archiveId/persons/:personId" element={<PersonPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/arch" element={<ArchivesLayout />}>
          <Route path=":archiveId/actes" element={<ActesPage />} />
          <Route path=":archiveId/actes/:acteId" element={<ActePage />} />
          <Route path=":archiveId/registres" element={<RegistresPage />} />
          <Route path=":archiveId/registres/:registreId" element={<RegistrePage />} />
          <Route index element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
