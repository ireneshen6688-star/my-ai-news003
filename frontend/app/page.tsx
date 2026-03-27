export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-800">My AI News</div>
          <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600">
            Sign in
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Your Personal AI News Editor
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Get personalized news summaries delivered to your inbox
        </p>

        <button className="px-8 py-4 bg-primary text-white text-lg rounded-lg hover:bg-blue-600 shadow-lg">
          Sign in with Google
        </button>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="p-6">
            <div className="text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold mb-2">Custom Keywords</h3>
            <p className="text-gray-600">Subscribe to topics you care about</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Summaries</h3>
            <p className="text-gray-600">Get concise, intelligent summaries</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold mb-2">Scheduled Delivery</h3>
            <p className="text-gray-600">Receive news on your schedule</p>
          </div>
        </div>
      </main>
    </div>
  );
}
