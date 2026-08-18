// Supabase Configuration (used for FREE cloud PDF uploads)
// Copy this file to supabase-config.js and fill in the values below.
//
// How to get these values (free, no credit card needed):
//   1. Create a free Supabase project at https://supabase.com
//   2. Left menu: Project Settings > API
//   3. Copy the "Project URL" into the `url` field.
//   4. Copy the "anon" / "public" key into the `anonKey` field.
//   5. Set up the storage bucket + policies (see setup instructions).
const supabaseConfig = {
  url: "https://aaqicrmgkvfsjoacleed.supabase.co",
  anonKey: "sb_publishable_htCSYw236r3qe5HSD820Og_VshrW467"
};

// Export the config
window.supabaseConfig = supabaseConfig;