import { createClient } from '@supabase/supabase-js'
import Dashboard from '@/components/Dashboard'

// Canonical tour order (matches screenshot order)
const TOUR_ORDER = [
  '20101128武道館', '2012 残響横浜体育館', '2013 人生X君', '2014 横浜',
  '2015 35XXXV', '2016 渚園', '2017 ambition', '2018 东蛋', '2018 管弦',
  '2019 暴風眼', '2020 奇迹之旅', '2021 Day to Night', '2023 Luxury Disease',
  '2024 味之素', '2025 Detox日巡',
]

type TourRow = {
  id: string
  name: string
  tour_songs: { order: number; songs: { title: string } | null }[]
}

async function getData(): Promise<{ concerts: string[]; setlists: Record<string, string[]> }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('name', 'ONE OK ROCK')
    .single()

  if (!artist) return { concerts: [], setlists: {} }

  const { data } = await supabase
    .from('tours')
    .select('id, name, tour_songs(order, songs(title))')
    .eq('artist_id', artist.id)

  if (!data) return { concerts: [], setlists: {} }

  const tours = data as unknown as TourRow[]

  // Sort by canonical order
  tours.sort((a, b) => TOUR_ORDER.indexOf(a.name) - TOUR_ORDER.indexOf(b.name))

  const concerts: string[] = []
  const setlists: Record<string, string[]> = {}

  tours.forEach(tour => {
    concerts.push(tour.name)
    const sorted = [...tour.tour_songs].sort((a, b) => a.order - b.order)
    setlists[tour.name] = sorted.map(ts => ts.songs?.title ?? '')
  })

  return { concerts, setlists }
}

export default async function Home() {
  const { concerts, setlists } = await getData()
  return <Dashboard concerts={concerts} setlists={setlists} />
}
