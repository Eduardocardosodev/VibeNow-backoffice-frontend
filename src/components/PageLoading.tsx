import '@/styles/pageLoading.css'

export function PageLoading() {
  return (
    <div className="page-loading" role="status" aria-label="A carregar">
      <div className="page-loading__spinner" />
    </div>
  )
}
