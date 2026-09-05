import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { apiUrl } from '../lib/api'

export default function Alerts() {
  const { user } = useAuthStore()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const userId = user?.id

  useEffect(() => {
    if (userId) fetchAlerts()
    else setLoading(false)
  }, [userId])

  const fetchAlerts = async () => {
    try {
      const response = await fetch(apiUrl(`/api/alerts?userId=${userId}`))
      const data = await response.json()
      if (data.success) {
        setAlerts(data.data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching alerts:', error)
      setLoading(false)
    }
  }

  const handleDeleteAlert = async (alertId) => {
    try {
      await fetch(apiUrl(`/api/alerts/${alertId}`), { method: 'DELETE' })
      setAlerts(alerts.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Error deleting alert:', error)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Price Alerts</h1>

      {alerts.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          <p>No alerts created yet</p>
          <p className="text-sm mt-2">Create alerts from product pages to track price changes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{alert.name}</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Type: <span className="font-medium capitalize">{alert.alert_type}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-600">Current Price</p>
                      <p className="font-bold">${alert.current_price}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Target</p>
                      <p className="font-bold">
                        {alert.target_price ? `$${alert.target_price}` : `${alert.target_margin}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className={`font-bold ${alert.is_triggered ? 'text-green-600' : 'text-blue-600'}`}>
                        {alert.is_triggered ? '✓ Triggered' : 'Monitoring'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
