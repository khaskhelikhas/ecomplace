import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { apiUrl } from '../lib/api'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalProducts: 0,
    averageMargin: 0,
    topSeller: null,
    bestMargin: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(apiUrl('/api/products?limit=100'))
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        const products = data.data
        const totalMargin = products.reduce((sum, p) => sum + (p.margin_percentage || 0), 0)
        const bestProduct = products.reduce((best, p) =>
          (p.margin_percentage || 0) > (best.margin_percentage || 0) ? p : best
        )

        setStats({
          totalProducts: data.pagination.total,
          averageMargin: (totalMargin / products.length).toFixed(2),
          topSeller: products[0],
          bestMargin: bestProduct
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user?.fullName || user?.email}!</h1>
        <p className="text-gray-600 mt-2">Track deals and best-sellers in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Products</p>
          <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Average Margin</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.averageMargin}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Subscription</p>
          <p className="text-3xl font-bold capitalize mt-2">{user?.subscriptionPlan}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Last Updated</p>
          <p className="text-sm mt-2">20 minutes ago</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {stats.topSeller && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Top Best-Seller</h2>
            <div className="space-y-2">
              <p className="font-semibold truncate">{stats.topSeller.name}</p>
              <p className="text-sm text-gray-600">
                Source: <span className="font-medium capitalize">{stats.topSeller.source}</span>
              </p>
              <p className="text-sm text-gray-600">
                Price: <span className="font-medium">${stats.topSeller.current_price}</span>
              </p>
              <p className="text-sm text-gray-600">
                Rank: <span className="font-medium">#{stats.topSeller.best_sellers_rank}</span>
              </p>
            </div>
          </div>
        )}

        {stats.bestMargin && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Best Margin Opportunity</h2>
            <div className="space-y-2">
              <p className="font-semibold truncate">{stats.bestMargin.name}</p>
              <p className="text-sm text-gray-600">
                Source: <span className="font-medium capitalize">{stats.bestMargin.source}</span>
              </p>
              <p className="text-sm text-gray-600">
                Price: <span className="font-medium">${stats.bestMargin.current_price}</span>
              </p>
              <p className="text-sm text-green-600">
                Margin: <span className="font-bold text-lg">{stats.bestMargin.margin_percentage}%</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
