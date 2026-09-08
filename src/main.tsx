import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import "./index.css"
import { Shell } from "@/components/shell"
import { DashboardPage } from "@/pages/dashboard"
import { OnboardPage } from "@/pages/onboard"
import { ConnectPage } from "@/pages/connect"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="onboard" element={<OnboardPage />} />
          <Route path="connect" element={<ConnectPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
