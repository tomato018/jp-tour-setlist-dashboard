export type Database = {
  public: {
    Tables: {
      artists: {
        Row: { id: string; name: string; description: string | null; created_at: string }
        Insert: { id?: string; name: string; description?: string | null }
        Update: { name?: string; description?: string | null }
      }
      tours: {
        Row: { id: string; artist_id: string; name: string; year: number; location: string | null; created_at: string }
        Insert: { id?: string; artist_id: string; name: string; year: number; location?: string | null }
        Update: { name?: string; year?: number; location?: string | null }
      }
      songs: {
        Row: { id: string; artist_id: string; title: string; created_at: string }
        Insert: { id?: string; artist_id: string; title: string }
        Update: { title?: string }
      }
      tour_songs: {
        Row: { id: string; tour_id: string; song_id: string; order: number }
        Insert: { id?: string; tour_id: string; song_id: string; order: number }
        Update: { order?: number }
      }
      favorites: {
        Row: { id: string; user_id: string; song_id: string; created_at: string }
        Insert: { id?: string; user_id: string; song_id: string }
        Update: never
      }
    }
  }
}

// Convenience types
export type Artist = Database['public']['Tables']['artists']['Row']
export type Tour = Database['public']['Tables']['tours']['Row']
export type Song = Database['public']['Tables']['songs']['Row']
export type TourSong = Database['public']['Tables']['tour_songs']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
