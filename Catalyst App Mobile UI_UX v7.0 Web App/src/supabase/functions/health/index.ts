// Simple health check function
Deno.serve(() => {
  return new Response(
    JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  )
})