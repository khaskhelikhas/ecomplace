import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getProducts } from '../lib/data'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalProducts: 0,
    averageMargin: 0,
    topSeller: null,
    bestMargin: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const products = await getProducts()

      if (products.length > 0) {
        const totalMargin = products.reduce(
          (sum, p) => sum + (p.marginPercentage || 0),
          0
        )
        const bestProduct = products.reduce((best, p) =>
          (p.marginPercentage || 0) > (best.marginPercentage || 0) ? p : best
        )
        const topSeller = [...products].sort(
          (a, b) => (a.bestSellersRank || 9999) - (b.bestSellersRank || 9999)
        )[0]

        setStats({
          totalProducts: products.length,
          averageMargin: (totalMargin / products.length).toFixed(2),
          topSeller,
          bestMargin: bestProduct,
        })
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError('Could not load data. Has the product data been seeded?')
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome, {user?.fullName || user?.email}!
        </h1>
        <p className="text-gray-600 mt-2">Track deals and best-sellers in real-time</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

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
          <p className="text-gray-600 text-sm">Products Tracked</p>
          <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {stats.topSeller && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Top Best-Seller</h2>
            <div className="space-y-2">
              <p className="font-semibold truncate">{stats.topSeller.name}</p>
              <p className="text-sm text-gray-600">
                Source:{' '}
                <span className="font-medium capitalize">{stats.topSeller.source}</span>
              </p>
              <p className="text-sm text-gray-600">
                Price: <span className="font-medium">${stats.topSeller.currentPrice}</span>
              </p>
              <p className="text-sm text-gray-600">
                Rank: <span className="font-medium">#{stats.topSeller.bestSellersRank}</span>
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
                Source:{' '}
                <span className="font-medium capitalize">{stats.bestMargin.source}</span>
              </p>
              <p className="text-sm text-gray-600">
                Price: <span className="font-medium">${stats.bestMargin.currentPrice}</span>
              </p>
              <p className="text-sm text-green-600">
                Margin:{' '}
                <span className="font-bold text-lg">
                  {stats.bestMargin.marginPercentage}%
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
