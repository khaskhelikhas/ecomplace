import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getProduct, createAlert } from '../lib/data'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alertForm, setAlertForm] = useState({
    alertType: 'price',
    targetPrice: 0,
    targetMargin: 0,
  })

  useEffect(() => {
    fetchProductDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchProductDetail = async () => {
    try {
      const data = await getProduct(id)
      setProduct(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching product:', error)
      setLoading(false)
    }
  }

  const handleAlertSubmit = async (e) => {
    e.preventDefault()
    if (!user?.id) {
      alert('Please log in again to create alerts')
      return
    }
    try {
      await createAlert({
        userId: user.id,
        productId: id,
        alertType: alertForm.alertType,
        targetPrice:
          alertForm.alertType === 'price' ? Number(alertForm.targetPrice) : null,
        targetMargin:
          alertForm.alertType === 'margin' ? Number(alertForm.targetMargin) : null,
      })
      alert('Alert created successfully')
    } catch (error) {
      console.error('Error creating alert:', error)
      alert('Could not create alert')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!product) return <div className="p-8">Product not found</div>

  const fmtDate = (v) => {
    try {
      if (v?.toDate) return v.toDate().toLocaleDateString()
      return new Date(v).toLocaleDateString()
    } catch {
      return ''
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/products')}
        className="text-primary hover:underline mb-6"
      >
        ← Back to Products
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-64 object-cover rounded-md mb-6"
            />
          )}

          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-gray-600 text-sm">Current Price</p>
              <p className="text-2xl font-bold">${product.currentPrice}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Margin %</p>
              <p
                className={`text-2xl font-bold ${
                  product.marginPercentage > 20 ? 'text-green-600' : 'text-orange-600'
                }`}
              >
                {product.marginPercentage}%
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Source</p>
              <p className="text-lg font-medium capitalize">{product.source}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Rating</p>
              <p className="text-lg">⭐ {product.rating || 'N/A'}</p>
            </div>
          </div>

          {product.recommendation && (
            <div className="border-t pt-6 mb-2">
              <h2 className="text-xl font-bold mb-3">Deal Signals</h2>
              <div
                className={`inline-block px-3 py-1 rounded font-bold text-sm mb-3 ${
                  product.recommendation === 'BUY NOW'
                    ? 'bg-green-100 text-green-800'
                    : product.recommendation === 'WATCH'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {product.recommendation}
              </div>
              <p className="text-sm text-gray-700 mb-4">{product.reason}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Price trend</p>
                  <p className="font-semibold capitalize">
                    {product.trend}
                    {product.slopePct ? ` (${product.slopePct}%)` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">May drop further</p>
                  <p className="font-semibold">{product.dropChance}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Deal ends in</p>
                  <p className="font-semibold">
                    {product.expiresInHours != null
                      ? `${product.expiresInHours} h`
                      : 'no end date'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Est. flip margin</p>
                  <p className="font-semibold text-green-700">
                    {product.flipMargin
                      ? `~$${Math.round(product.flipMargin)} (${product.flipMarginPct}%)`
                      : '-'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Heuristic estimates from limited price data - a nudge, not
                financial advice or a guarantee.
              </p>
            </div>
          )}

          <div className="border-t pt-6">
            <h2 className="text-xl font-bold mb-4">Price History</h2>
            {product.priceHistory && product.priceHistory.length > 0 ? (
              <div className="space-y-2">
                {product.priceHistory.map((entry, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{fmtDate(entry.recordedAt)}</span>
                    <span className="font-medium">${entry.price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No price history available</p>
            )}
          </div>

          {product.sourceUrl && (
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 block bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 text-center"
            >
              View on {product.source}
            </a>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-bold mb-4">Create Alert</h2>

          <form onSubmit={handleAlertSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
              <select
                value={alertForm.alertType}
                onChange={(e) => setAlertForm({ ...alertForm, alertType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="price">Price Drop</option>
                <option value="margin">Margin Target</option>
              </select>
            </div>

            {alertForm.alertType === 'price' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={alertForm.targetPrice}
                  onChange={(e) => setAlertForm({ ...alertForm, targetPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="$0.00"
                />
              </div>
            )}

            {alertForm.alertType === 'margin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Margin %</label>
                <input
                  type="number"
                  step="0.1"
                  value={alertForm.targetMargin}
                  onChange={(e) => setAlertForm({ ...alertForm, targetMargin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0%"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-blue-600"
            >
              Create Alert
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
