import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

Deno.serve(async (request: Request) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')
  const origin = request.headers.get('origin')
  const cors = { 'Access-Control-Allow-Origin': allowedOrigin || '', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
  const response = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (!allowedOrigin || origin !== allowedOrigin) return response(403, 'Origin not allowed')
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return response(405, 'Method not allowed')
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return response(401, 'Authentication required')
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return response(503, 'Service unavailable')
  try {
    const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    // Verify the token with Auth, never trust decoded claims or a body user_id.
    const { data: { user }, error } = await server.auth.getUser(authorization.slice(7))
    if (error || !user) return response(401, 'Authentication required')
    const body = await request.json()
    if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length) return response(400, 'No arguments accepted')
    const { error: ownershipError } = await server.rpc('release_account_image_ownership', { target_user: user.id })
    if (ownershipError) return response(500, 'Account deletion preparation failed')
    const { error: deletionError } = await server.auth.admin.deleteUser(user.id)
    if (deletionError) return response(500, 'Account deletion failed')
    return response(200, 'Account deleted')
  } catch { return response(400, 'Invalid request') }
})
