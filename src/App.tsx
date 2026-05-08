import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Wavelength from './pages/Wavelength'
import CarreraDeMente from './pages/CarreraDeMente'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wavelength" element={<Wavelength />} />
        <Route path="/carrera-de-mente" element={<CarreraDeMente />} />
      </Routes>
    </BrowserRouter>
  )
}
