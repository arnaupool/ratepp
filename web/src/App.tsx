import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { useAuth } from './auth/AuthContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import OfflineScreen from './screens/OfflineScreen';
import DetailScreen from './screens/DetailScreen';
import CreateScreen from './screens/CreateScreen';
import LocationsMapScreen from './screens/LocationsMapScreen';
import ManageLabelsScreen from './screens/ManageLabelsScreen';
import { useKeyboardDismiss } from './hooks/useKeyboardDismiss';
import UpdateBanner from './components/UpdateBanner';
// Last, so its media queries win over each screen's own styles.
import './styles/desktop.css';

function Boot() {
  const { status } = useAuth();
  useKeyboardDismiss();
  if (status === 'checking') {
    return (
      <div className="center-fill">
        <span className="spinner" role="status" aria-label="Cargando" />
      </div>
    );
  }
  if (status === 'offline') return <OfflineScreen />;
  return (
    <>
      <Outlet />
      <ScrollRestoration />
      <UpdateBanner />
    </>
  );
}

function RequireAuth() {
  const { status } = useAuth();
  return status === 'signedIn' ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const { status } = useAuth();
  return status === 'signedIn' ? <Navigate to="/" replace /> : <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <Boot />,
    children: [
      { element: <GuestOnly />, children: [{ path: '/login', element: <LoginScreen /> }] },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <HomeScreen /> },
          { path: '/nueva', element: <CreateScreen /> },
          { path: '/p/:id', element: <DetailScreen /> },
          { path: '/mapa', element: <LocationsMapScreen /> },
          { path: '/etiquetas', element: <ManageLabelsScreen /> },
          { path: '/ajustes', element: <SettingsScreen /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
