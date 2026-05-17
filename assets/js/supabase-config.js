/**
 * Supabase Configuration
 * Centralized config for Performance Lab Web
 */

// TODO: Reemplaza con la URL de tu nuevo proyecto de Supabase
const SUPABASE_URL = 'https://szckmpiboisngkgeukga.supabase.co'; 

// Las llaves proporcionadas por el usuario
const SUPABASE_ANON_KEY = 'sb_publishable_lgiYJfsIQPseUmggHG7IeQ_8hyxXwMj';

// Inicialización global (para uso en scripts que no usan módulos)
if (typeof window !== 'undefined' && window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized with new project credentials.");
}
