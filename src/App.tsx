import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Wavelength from './pages/Wavelength'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wavelength" element={<Wavelength />} />
      </Routes>
    </HashRouter>
  )
}
