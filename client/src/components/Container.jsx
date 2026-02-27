function Container({ children }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      {children}
    </div>
  )
}

export default Container
