// Public browser configuration. Never put a service_role/secret key here.
const supabaseUrl = 'https://spbyvkpilrqybbdndwly.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYnl2a3BpbHJxeWJiZG5kd2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjM1MDUsImV4cCI6MjEwNzg5OTUwNX0.xrpO5oxFREOY0shzQNArmH7VvOq0o6VuOaDj-j9EIPM';
const _supabase = window.supabase?.createClient(supabaseUrl, supabaseKey);
