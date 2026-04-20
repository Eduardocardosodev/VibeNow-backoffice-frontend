import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/PublicOnlyRoute'
import { OverviewDashboard } from '@/screens/OverviewDashboard'
import { EventsScreen } from '@/screens/EventsScreen'
import { FeedbacksScreen } from '@/screens/FeedbacksScreen'
import { MenuScreen } from '@/screens/MenuScreen'
import { OrdersScreen } from '@/screens/OrdersScreen'
import { QuotesScreen } from '@/screens/QuotesScreen'
import { LoginScreen } from '@/screens/LoginScreen'
import { RegisterScreen } from '@/screens/RegisterScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { EstablishmentScreen } from '@/screens/EstablishmentScreen'
import { EquipaScreen } from '@/screens/EquipaScreen'
import { ScorePeriodsScreen } from '@/screens/ScorePeriodsScreen'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/cadastro" element={<RegisterScreen />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewDashboard />} />
          <Route path="feedbacks" element={<FeedbacksScreen />} />
          <Route path="historico-pontuacao" element={<ScorePeriodsScreen />} />
          <Route path="citacoes" element={<QuotesScreen />} />
          <Route path="pedidos" element={<OrdersScreen />} />
          <Route path="cardapio" element={<MenuScreen />} />
          <Route path="eventos" element={<EventsScreen />} />
          <Route path="estabelecimento" element={<EstablishmentScreen />} />
          <Route path="equipa" element={<EquipaScreen />} />
          <Route path="definicoes" element={<SettingsScreen />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
