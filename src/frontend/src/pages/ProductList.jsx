import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiUrl } from '../lib/api'

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    source: 'all',
    minMargin: 0,
    maxMargin: 100
  })

  useEffect(() => {
    fetchProducts()
  }, [filters])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })

      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.source !== 'all') params.set('source', filters.source)
      if (Number(filters.minMargin) > 0) params.set('minMargin', filters.minMargin)
      if (Number(filters.maxMargin) < 100) params.set('maxMargin', filters.maxMargin)

      const response = await fetch(apiUrl(`/api/products?${params.toString()}`))
      const data = await response.json()

      if (data.success) {
        setProducts(data.data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters({
      ...filters,
      [name]: value
    })
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch(apiUrl('/api/products/export/csv'))
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'products.csv'
      a.click()
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <button
          onClick={handleExportCSV}
          className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-orange-600"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search products..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              name="source"
              value={filters.source}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Sources</option>
              <option value="amazon-us">Amazon US</option>
              <option value="walmart-us">Walmart US</option>
              <option value="aliexpress">AliExpress</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Margin %</label>
            <input
              type="number"
              name="minMargin"
              value={filters.minMargin}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Margin %</label>
            <input
              type="number"
              name="maxMargin"
              value={filters.maxMargin}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Source</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Margin</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{product.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium capitalize">
                      {product.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">${product.current_price}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-medium ${product.margin_percentage > 20 ? 'text-green-600' : 'text-orange-600'}`}>
                      {product.margin_percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {product.rating ? `⭐ ${product.rating}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      to={`/products/${product.id}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No products found matching your filters
            </div>
          )}
        </div>
      )}
    </div>
  )
}
