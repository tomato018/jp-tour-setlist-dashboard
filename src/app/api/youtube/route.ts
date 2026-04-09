import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ videoId: null }, { status: 400 })

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ videoId: null }, { status: 500 })

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=1&key=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1h
  const data = await res.json()
  const videoId = data.items?.[0]?.id?.videoId ?? null

  return NextResponse.json({ videoId })
}
