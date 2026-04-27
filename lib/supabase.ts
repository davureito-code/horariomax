import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gqhbxekvzuzqykadnoem.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGJ4ZWt2enV6cXlrYWRub2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODA4MzEsImV4cCI6MjA5MTk1NjgzMX0.tS-pJLd9uXCUHTOWjCslqJcbOA7eTFXj-P7Puvs60gs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);