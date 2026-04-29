import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testClaim() {
  console.log("Testing claim_post_read RPC...");
  
  // First, find a valid post ID
  const { data: posts, error: postErr } = await supabase.from('posts').select('id').limit(1);
  if (postErr || !posts || posts.length === 0) {
    console.error("No posts found or error:", postErr);
    return;
  }
  const postId = posts[0].id;
  
  // Call the RPC
  const { data, error } = await supabase.rpc('claim_post_read', { _post_id: postId });
  console.log("Result:", data);
  if (error) {
    console.error("Error from RPC:", error);
  }
}

testClaim();
