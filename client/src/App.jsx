import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { GuestRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import BrowseClasses from './pages/BrowseClasses.jsx';
import ClassDetails from './pages/ClassDetails.jsx';
import ClassForm from './pages/ClassForm.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<GuestRoute><Landing /></GuestRoute>} />
        <Route path="login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="register" element={<GuestRoute><Register /></GuestRoute>} />

        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="classes" element={<BrowseClasses />} />
          <Route path="classes/:id" element={<ClassDetails />} />
        </Route>
        <Route element={<ProtectedRoute role="teacher" />}>
          <Route path="classes/new" element={<ClassForm />} />
          <Route path="classes/:id/edit" element={<ClassForm />} />
        </Route>

        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
