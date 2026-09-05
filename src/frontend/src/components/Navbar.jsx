import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">
            🛍️ EcomPlace
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/" className="hover:text-blue-200">Dashboard</Link>
            <Link to="/products" className="hover:text-blue-200">Products</Link>
            <Link to="/alerts" className="hover:text-blue-200">Alerts</Link>

            <div className="relative group">
              <button className="hover:text-blue-200 flex items-center space-x-2">
                <span>👤 {user?.email}</span>
                <span>▼</span>
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
