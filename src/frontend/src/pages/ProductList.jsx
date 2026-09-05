import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, buildProductsCsv } from '../lib/data'

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    source: 'all',
    minMargin: 0,
    maxMargin: 100,
  })

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const rows = await getProducts({
        search: filters.search.trim() || undefined,
        source: filters.source,
        minMargin: Number(filters.minMargin) > 0 ? Number(filters.minMargin) : undefined,
        maxMargin: Number(filters.maxMargin) < 100 ? Number(filters.maxMargin) : undefined,
      })
      setProducts(rows)
      // Derive the source list from the data itself (only on the unfiltered set)
      if (filters.source === 'all' && !filters.search.trim()) {
        setSources([...new Set(rows.map((r) => r.source).filter(Boolean))].sort())
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setLoading(false)
    }
  }

  const prettySource = (s) =>
    s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters({ ...filters, [name]: value })
  }

  const handleExportCSV = async () => {
    try {
      const csv = await buildProductsCsv()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'products.csv'
      a.click()
      window.URL.revokeObjectURL(url)
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
              {sources.map((s) => (
                <option key={s} value={s}>
                  {prettySource(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Discount %</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount %</label>
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

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Source</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Discount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium capitalize">
                      {product.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">${product.currentPrice}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`font-medium ${
                        product.marginPercentage > 20 ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {product.marginPercentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {product.rating ? `⭐ ${product.rating}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link to={`/products/${product.id}`} className="text-primary hover:underline">
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
