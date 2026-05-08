import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Wavelength from './pages/Wavelength'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wavelength" element={<Wavelength />} />
      </Routes>
    </BrowserRouter>
  )
}
