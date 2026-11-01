// Somasu settings. This is the only file you edit to connect the family database.
//
// Leave both values empty and the app runs in TRY-OUT MODE: sample data, saved
// only on the device you're using, nothing shared.
//
// Fill them in (from Supabase > Project Settings > API) and the app switches to
// FAMILY MODE: sign-in by email code, everything shared and live across devices.
// The publishable (anon) key is designed to sit in a web page. It's safe here
// because the database security rules only let listed family members in.
window.SOMASU_CONFIG = {
  supabaseUrl: "https://asstnkepnzrqhkqfewjv.supabase.co",
  supabaseKey: "sb_publishable_SW98tuMywrLzz8axWeKonA_smu15cHn",
  // Public half of the notification keys (VAPID). The private half lives only in
  // Netlify's environment variables. Leave empty until notifications are set up.
  vapidPublicKey: "BP07wohObKj0hIgNOZeKOX3jTMrM-ZoYzF4mPTGh0AvmL99ja5DgvA-Bet-qPXkNzm3_c-0izqPKxWvEgNsMtaA"
};
