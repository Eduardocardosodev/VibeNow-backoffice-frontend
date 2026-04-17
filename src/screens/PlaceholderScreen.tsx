interface PlaceholderScreenProps {
  title: string
}

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <div className="portal-placeholder">
      <h1 className="portal-placeholder__title">{title}</h1>
      <p className="portal-placeholder__text">Esta área estará disponível em breve.</p>
    </div>
  )
}
