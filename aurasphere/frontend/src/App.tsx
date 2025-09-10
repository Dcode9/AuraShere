import Player from './components/Player'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-4">Aurasphere Player</h1>
        <Player />
      </div>
    </div>
  )
}

export default App
