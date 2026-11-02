import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router';
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
import GroupsScreen from './screens/GroupsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import JoinGroupScreen from './screens/JoinGroupScreen';
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

// An invitation link opened while signed out comes back to the invitation
// after logging in (or registering).
function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'signedIn') return <Outlet />;
  const from = location.pathname.startsWith('/unirse/') ? location.pathname : undefined;
  return <Navigate to="/login" replace state={from ? { from } : undefined} />;
}

function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return status === 'signedIn' ? <Navigate to={from ?? '/'} replace /> : <Outlet />;
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
          { path: '/grupos', element: <GroupsScreen /> },
          { path: '/grupos/:id', element: <GroupDetailScreen /> },
          { path: '/unirse/:token', element: <JoinGroupScreen /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
